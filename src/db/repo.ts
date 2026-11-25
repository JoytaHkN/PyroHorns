import type { AgendaItem, ChatData, Conversation, Message, Project } from '@/types/chat';

export type ConversationMeta = Omit<Conversation, 'messages'>;

/** Persistencia de conversaciones. Android: SQLite cifrado (S7). Web (visor): navegador. */
export interface ChatRepo {
  loadAll(): Promise<ChatData>;
  saveConversation(meta: ConversationMeta): Promise<void>;
  deleteConversation(id: string): Promise<void>;
  /** Inserta el mensaje y actualiza `updated_at` de la conversación. */
  insertMessage(conversationId: string, m: Message): Promise<void>;
  updateMessage(m: Message): Promise<void>;
  saveProject(p: Project): Promise<void>;
  /** Borra el proyecto; sus conversaciones quedan sin proyecto. */
  deleteProject(id: string): Promise<void>;
  /** Borra las conversaciones (las notas y tareas se conservan). */
  deleteAll(): Promise<void>;
  saveItem(item: AgendaItem): Promise<void>;
  deleteItem(id: string): Promise<void>;
  /** Ids de conversaciones cuyo título o mensajes contienen el texto. */
  search(term: string): Promise<string[]>;
}

/** Un streaming interrumpido por cierre de la app no debe quedar "pensando" para siempre. */
export function settleStatus(m: Message): Message {
  return m.status === 'thinking' || m.status === 'streaming' ? { ...m, status: 'stopped' } : m;
}

/** Comparación sin mayúsculas ni tildes, para búsquedas en memoria. */
export const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
