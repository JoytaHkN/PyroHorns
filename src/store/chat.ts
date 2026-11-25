import { create } from 'zustand';
import type { ChatRepo, ConversationMeta } from '@/db/repo';
import { fold } from '@/db/repo';
import { log } from '@/lib/log';
import type { AgendaItem, AgentSnapshot, ChatData, Conversation, Message, Project } from '@/types/chat';

export type { AgentSnapshot, Conversation, Message, Project } from '@/types/chat';

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/* ---------- Persistencia: cola en orden + escritura agrupada durante el streaming ---------- */

let repo: ChatRepo | null = null;
let queue: Promise<void> = Promise.resolve();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
/** Durante el streaming, como mucho una escritura por mensaje cada este intervalo. */
export const STREAM_WRITE_MS = 400;

export function attachRepo(r: ChatRepo | null) {
  repo = r;
}

function enqueue(op: (r: ChatRepo) => Promise<unknown>) {
  const r = repo;
  if (!r) return;
  queue = queue.then(() => op(r)).then(
    () => undefined,
    (e: unknown) => log.error('db.write', e),
  );
}

/** Escribe ya todo lo pendiente (al pasar a segundo plano y en las pruebas). */
export async function flushWrites(): Promise<void> {
  for (const [id, t] of timers) {
    clearTimeout(t);
    timers.delete(id);
    writeMessageNow(id);
  }
  await queue;
}

const metaOf = ({ messages: _m, ...meta }: Conversation): ConversationMeta => meta;

function findMessage(msgId: string): Message | undefined {
  for (const c of useChat.getState().conversations) {
    const m = c.messages.find((x) => x.id === msgId);
    if (m) return m;
  }
  return undefined;
}

function writeMessageNow(msgId: string) {
  const m = findMessage(msgId);
  if (m) enqueue((r) => r.updateMessage(m));
}

function scheduleMessageWrite(msgId: string, immediate: boolean) {
  const t = timers.get(msgId);
  if (t) clearTimeout(t);
  timers.delete(msgId);
  if (immediate) writeMessageNow(msgId);
  else
    timers.set(
      msgId,
      setTimeout(() => {
        timers.delete(msgId);
        writeMessageNow(msgId);
      }, STREAM_WRITE_MS),
    );
}

const isFinal = (m: Message) => m.status === undefined || m.status === 'done' || m.status === 'stopped' || m.status === 'error';

/* ---------- Store ---------- */

interface ChatState {
  conversations: Conversation[];
  projects: Project[];
  activeId: string | null;
  /** Notas y tareas del asistente. */
  items: AgendaItem[];
  saveItem: (item: AgendaItem) => void;
  removeItem: (id: string) => void;
  hydrate: (data: ChatData) => void;
  newConversation: (agent: AgentSnapshot, projectId?: string | null) => string;
  select: (id: string | null) => void;
  remove: (id: string) => void;
  removeAll: () => void;
  rename: (id: string, title: string) => void;
  addMessage: (convId: string, msg: Message) => void;
  /** Conversación nueva con los mensajes hasta `msgId` (incluido). Devuelve su id, o null si no existe. */
  branch: (convId: string, msgId: string) => string | null;
  patchMessage: (convId: string, msgId: string, patch: Partial<Message> | ((m: Message) => Partial<Message>)) => void;
  setAgent: (convId: string, agent: AgentSnapshot) => void;
  addProject: (name: string) => string;
  removeProject: (id: string) => void;
}

const touch = (c: Conversation, patch: Partial<Conversation>): Conversation => ({ ...c, ...patch, updatedAt: Date.now() });

export const useChat = create<ChatState>()((set, get) => ({
  conversations: [],
  projects: [],
  activeId: null,
  items: [],

  saveItem: (item) => {
    set((s) => ({
      items: s.items.some((i) => i.id === item.id) ? s.items.map((i) => (i.id === item.id ? item : i)) : [...s.items, item],
    }));
    enqueue((r) => r.saveItem(item));
  },

  removeItem: (id) => {
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
    enqueue((r) => r.deleteItem(id));
  },

  hydrate: (data) =>
    set({
      items: data.items ?? [],
      conversations: [...data.conversations].sort((a, b) => b.updatedAt - a.updatedAt),
      projects: data.projects,
      activeId: null,
    }),

  newConversation: (agent, projectId = null) => {
    const id = uid();
    const now = Date.now();
    const conv: Conversation = { id, title: 'Nueva conversación', projectId, createdAt: now, updatedAt: now, agent, messages: [] };
    set((s) => ({ conversations: [conv, ...s.conversations], activeId: id }));
    enqueue((r) => r.saveConversation(metaOf(conv)));
    return id;
  },

  select: (activeId) => set({ activeId }),

  remove: (id) => {
    set((s) => ({
      conversations: s.conversations.filter((c) => c.id !== id),
      activeId: s.activeId === id ? null : s.activeId,
    }));
    enqueue((r) => r.deleteConversation(id));
  },

  removeAll: () => {
    set({ conversations: [], activeId: null });
    enqueue((r) => r.deleteAll());
  },

  rename: (id, title) => {
    set((s) => ({ conversations: s.conversations.map((c) => (c.id === id ? touch(c, { title }) : c)) }));
    const c = get().conversations.find((x) => x.id === id);
    if (c) enqueue((r) => r.saveConversation(metaOf(c)));
  },

  branch: (convId, msgId) => {
    const source = get().conversations.find((c) => c.id === convId);
    const end = source ? source.messages.findIndex((m) => m.id === msgId) : -1;
    if (!source || end < 0) return null;
    const copies = source.messages.slice(0, end + 1).map((m) => ({ ...m, id: uid() }));
    const id = get().newConversation(source.agent, source.projectId);
    get().rename(id, `${source.title} (rama)`);
    for (const m of copies) get().addMessage(id, m);
    return id;
  },

  addMessage: (convId, msg) => {
    set((s) => ({
      conversations: s.conversations.map((c) => (c.id === convId ? touch(c, { messages: [...c.messages, msg] }) : c)),
    }));
    enqueue((r) => r.insertMessage(convId, msg));
  },

  patchMessage: (convId, msgId, patch) => {
    let updated: Message | undefined;
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id !== convId
          ? c
          : {
              ...c,
              messages: c.messages.map((m) => {
                if (m.id !== msgId) return m;
                updated = { ...m, ...(typeof patch === 'function' ? patch(m) : patch) };
                return updated;
              }),
            },
      ),
    }));
    if (updated) scheduleMessageWrite(msgId, isFinal(updated));
  },

  setAgent: (convId, agent) => {
    set((s) => ({ conversations: s.conversations.map((c) => (c.id === convId ? { ...c, agent } : c)) }));
    const c = get().conversations.find((x) => x.id === convId);
    if (c) enqueue((r) => r.saveConversation(metaOf(c)));
  },

  addProject: (name) => {
    const p: Project = { id: uid(), name, createdAt: Date.now() };
    set((s) => ({ projects: [...s.projects, p] }));
    enqueue((r) => r.saveProject(p));
    return p.id;
  },

  removeProject: (id) => {
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      conversations: s.conversations.map((c) => (c.projectId === id ? { ...c, projectId: null } : c)),
    }));
    enqueue((r) => r.deleteProject(id));
  },
}));

export const useActiveConversation = () => useChat((s) => s.conversations.find((c) => c.id === s.activeId) ?? null);

/** Busca en títulos y mensajes (FTS5 en Android). Sin base adjunta, busca en memoria. */
export async function searchConversations(term: string): Promise<string[]> {
  if (!term.trim()) return [];
  if (repo) {
    await flushWrites();
    return repo.search(term);
  }
  const t = fold(term.trim());
  return useChat
    .getState()
    .conversations.filter((c) => fold(c.title).includes(t) || c.messages.some((m) => fold(m.content).includes(t)))
    .map((c) => c.id);
}
