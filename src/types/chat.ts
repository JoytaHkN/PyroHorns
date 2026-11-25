import type { ModeId } from '@/data/agents';

export type MessageStatus = 'thinking' | 'streaming' | 'done' | 'stopped' | 'error';

/** Métricas de una respuesta (las rellena el motor; en F1.1 son simuladas). */
export interface Usage {
  promptTokens: number;
  completionTokens: number;
  /** Milisegundos hasta el primer token de respuesta. */
  ttftMs: number;
  tokPerSec: number;
  /** Milisegundos desde que se envió hasta que terminó (incluye la carga del modelo si la hubo). */
  totalMs?: number;
}

/** Llamada a herramienta emitida por el modelo (el bucle de herramientas llega en F3). */
export interface ToolCall {
  id: string;
  name: string;
  /** Argumentos en JSON tal como los emitió el modelo. */
  args: string;
  /** Asistente: estado de la acción. */
  status?: 'pending' | 'done' | 'error' | 'undone' | 'dismissed';
  /** Asistente: qué pasó, para mostrarlo. */
  result?: string;
  /** Asistente: id de lo creado, para poder deshacerlo. */
  ref?: string;
}

/** Nota o tarea del asistente; se guarda en la base cifrada. */
export interface AgendaItem {
  id: string;
  kind: 'note' | 'task';
  text: string;
  due?: number;
  done?: boolean;
  createdAt: number;
}

/** Página que se usó en una búsqueda. */
export interface WebSource {
  title: string;
  url: string;
}

/** Internet en un mensaje: en el del usuario, lo que se encontró para el modelo; en la respuesta, las fuentes. */
export interface WebInfo {
  /** Solo usuario: resultados que se anteponen a la pregunta. Ausente si la búsqueda aún no se hizo o falló. */
  context?: string;
  /** Solo IA: lo que se envió al buscador. */
  query?: string;
  /** Solo IA: páginas consultadas. */
  sources?: WebSource[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  status?: MessageStatus;
  /** Solo IA: milisegundos hasta el primer token de respuesta ("Pensó N s"). */
  thinkMs?: number;
  /** Solo IA: razonamiento del modelo. Se muestra plegado y nunca se reenvía en el historial. */
  thinking?: string;
  /** Solo IA: modelo que generó este mensaje. */
  modelId?: string;
  usage?: Usage;
  toolCalls?: ToolCall[];
  /** Solo IA: valoración del usuario. Se guarda solo en el dispositivo. */
  feedback?: 'up' | 'down' | null;
  /** Presente en el mensaje del usuario si pidió buscar en internet, y en la respuesta que usó la búsqueda. */
  web?: WebInfo;
  /** Solo usuario: instrucciones del asistente que acompañan a este mensaje (si pide anotar, agendar, etc.). */
  assist?: string;
}

/** Agente con el que se creó o continuó la conversación. */
export interface AgentSnapshot {
  mode: ModeId;
  /** Interruptor "Profundo": razonamiento y más contexto. */
  deep: boolean;
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

export interface ChatData {
  conversations: Conversation[];
  projects: Project[];
  items?: AgendaItem[];
}
