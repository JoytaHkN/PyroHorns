import type { ChatData, Conversation, Message, Project } from '@/types/chat';
import { fold, settleStatus, type ChatRepo, type ConversationMeta } from './repo';

/** Almacén clave-valor síncrono (localStorage en el navegador; un mapa en memoria en las pruebas). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const memoryStore = (): KeyValueStore => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};

const KEY = 'pyrohorns-chat-v1';

/**
 * Repositorio del visor web (D4): guarda en el navegador. El cifrado de S7 aplica a Android;
 * en la web no hay almacén seguro.
 */
export class LocalChatRepo implements ChatRepo {
  private data: ChatData;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly store: KeyValueStore,
    private readonly saveDelayMs = 300,
  ) {
    let parsed: ChatData = { conversations: [], projects: [] };
    try {
      const raw = store.getItem(KEY);
      if (raw) parsed = JSON.parse(raw) as ChatData;
    } catch {
      // Datos dañados: se empieza vacío.
    }
    this.data = parsed;
  }

  private save() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), this.saveDelayMs);
  }

  /** Escribe ya los cambios pendientes. */
  flush() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    try {
      this.store.setItem(KEY, JSON.stringify(this.data));
    } catch {
      // Navegador sin espacio o en modo privado: se sigue en memoria.
    }
  }

  private conv(id: string): Conversation | undefined {
    return this.data.conversations.find((c) => c.id === id);
  }

  async loadAll(): Promise<ChatData> {
    return {
      conversations: [...this.data.conversations]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map((c) => ({ ...c, messages: c.messages.map(settleStatus) })),
      projects: [...this.data.projects],
    };
  }

  async saveConversation(meta: ConversationMeta): Promise<void> {
    const c = this.conv(meta.id);
    if (c) Object.assign(c, meta);
    else this.data.conversations.push({ ...meta, messages: [] });
    this.save();
  }

  async deleteConversation(id: string): Promise<void> {
    this.data.conversations = this.data.conversations.filter((c) => c.id !== id);
    this.save();
  }

  async insertMessage(conversationId: string, m: Message): Promise<void> {
    const c = this.conv(conversationId);
    if (!c) return;
    c.messages.push({ ...m });
    c.updatedAt = Math.max(c.updatedAt, m.createdAt);
    this.save();
  }

  async updateMessage(m: Message): Promise<void> {
    for (const c of this.data.conversations) {
      const i = c.messages.findIndex((x) => x.id === m.id);
      if (i >= 0) {
        c.messages[i] = { ...m };
        this.save();
        return;
      }
    }
  }

  async saveProject(p: Project): Promise<void> {
    const i = this.data.projects.findIndex((x) => x.id === p.id);
    if (i >= 0) this.data.projects[i] = { ...p };
    else this.data.projects.push({ ...p });
    this.save();
  }

  async deleteProject(id: string): Promise<void> {
    this.data.projects = this.data.projects.filter((p) => p.id !== id);
    for (const c of this.data.conversations) if (c.projectId === id) c.projectId = null;
    this.save();
  }

  async deleteAll(): Promise<void> {
    this.data.conversations = [];
    this.save();
  }

  async search(term: string): Promise<string[]> {
    const t = fold(term.trim());
    if (!t) return [];
    return this.data.conversations
      .filter((c) => fold(c.title).includes(t) || c.messages.some((m) => fold(m.content).includes(t)))
      .map((c) => c.id);
  }
}
