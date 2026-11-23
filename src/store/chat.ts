import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ModeId } from '@/data/agents';
import type { LevelId } from '@/data/models';
import { persistStorage } from './storage';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  /** Solo IA: milisegundos de "pensamiento" antes del primer token. */
  thinkMs?: number;
  status?: 'thinking' | 'streaming' | 'done' | 'stopped' | 'error';
}

/** Instantánea del agente con el que se creó/continuó la conversación (PLAN F3). */
export interface AgentSnapshot {
  mode: ModeId;
  level: LevelId;
  modelId: string;
}

export interface Conversation {
  id: string;
  title: string;
  projectId: string | null;
  createdAt: number;
  updatedAt: number;
  agent: AgentSnapshot;
  messages: Message[];
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
}

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

interface ChatState {
  conversations: Conversation[];
  projects: Project[];
  activeId: string | null;
  newConversation: (agent: AgentSnapshot, projectId?: string | null) => string;
  select: (id: string | null) => void;
  remove: (id: string) => void;
  rename: (id: string, title: string) => void;
  addMessage: (convId: string, msg: Message) => void;
  patchMessage: (convId: string, msgId: string, patch: Partial<Message> | ((m: Message) => Partial<Message>)) => void;
  setAgent: (convId: string, agent: AgentSnapshot) => void;
  addProject: (name: string) => string;
  removeProject: (id: string) => void;
}

const touch = (c: Conversation, patch: Partial<Conversation>): Conversation => ({
  ...c,
  ...patch,
  updatedAt: Date.now(),
});

export const useChat = create<ChatState>()(
  persist(
    (set) => ({
      conversations: [],
      projects: [],
      activeId: null,
      newConversation: (agent, projectId = null) => {
        const id = uid();
        const now = Date.now();
        set((s) => ({
          conversations: [
            { id, title: 'Nueva conversación', projectId, createdAt: now, updatedAt: now, agent, messages: [] },
            ...s.conversations,
          ],
          activeId: id,
        }));
        return id;
      },
      select: (activeId) => set({ activeId }),
      remove: (id) =>
        set((s) => ({
          conversations: s.conversations.filter((c) => c.id !== id),
          activeId: s.activeId === id ? null : s.activeId,
        })),
      rename: (id, title) =>
        set((s) => ({ conversations: s.conversations.map((c) => (c.id === id ? touch(c, { title }) : c)) })),
      addMessage: (convId, msg) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === convId ? touch(c, { messages: [...c.messages, msg] }) : c,
          ),
        })),
      patchMessage: (convId, msgId, patch) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id !== convId
              ? c
              : touch(c, {
                  messages: c.messages.map((m) =>
                    m.id === msgId ? { ...m, ...(typeof patch === 'function' ? patch(m) : patch) } : m,
                  ),
                }),
          ),
        })),
      setAgent: (convId, agent) =>
        set((s) => ({ conversations: s.conversations.map((c) => (c.id === convId ? { ...c, agent } : c)) })),
      addProject: (name) => {
        const id = uid();
        set((s) => ({ projects: [...s.projects, { id, name, createdAt: Date.now() }] }));
        return id;
      },
      removeProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          conversations: s.conversations.map((c) => (c.projectId === id ? { ...c, projectId: null } : c)),
        })),
    }),
    {
      name: 'af-chat',
      storage: persistStorage,
      version: 1,
      // Un streaming interrumpido por cierre de la app no debe quedar "pensando" para siempre.
      onRehydrateStorage: () => (state) => {
        state?.conversations.forEach((c) =>
          c.messages.forEach((m) => {
            if (m.status === 'thinking' || m.status === 'streaming') m.status = 'stopped';
          }),
        );
      },
    },
  ),
);

export const useActiveConversation = () =>
  useChat((s) => s.conversations.find((c) => c.id === s.activeId) ?? null);
