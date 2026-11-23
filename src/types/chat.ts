import type { ModeId } from '@/data/agents';

export type MessageStatus = 'thinking' | 'streaming' | 'done' | 'stopped' | 'error';

/** Métricas de una respuesta (las rellena el motor; en F1.1 son simuladas). */
export interface Usage {
  promptTokens: number;
  completionTokens: number;
  /** Milisegundos hasta el primer token de respuesta. */
  ttftMs: number;
  tokPerSec: number;
}

/** Llamada a herramienta emitida por el modelo (el bucle de herramientas llega en F3). */
export interface ToolCall {
  id: string;
  name: string;
  /** Argumentos en JSON tal como los emitió el modelo. */
  args: string;
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
}
