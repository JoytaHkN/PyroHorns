import type { ModeId } from '@/data/agents';
import type { Usage } from '@/types/chat';

export type Role = 'system' | 'user' | 'assistant' | 'tool';

/** Adjunto (imágenes y documentos llegan en F4). */
export interface Attachment {
  kind: 'image' | 'document';
  uri: string;
  name: string;
  mime: string;
}

export interface ProviderMessage {
  role: Role;
  content: string;
  attachments?: Attachment[];
  /** Solo rol "tool": id de la llamada a la que responde. */
  toolCallId?: string;
}

export interface StreamOptions {
  modelId: string;
  mode: ModeId;
  /** Interruptor Profundo: activa el razonamiento si el modelo lo admite. */
  deep: boolean;
  /** Tamaño de contexto con el que se construyó el historial. */
  contextTokens: number;
  signal?: AbortSignal;
}

export type StreamEvent =
  | { type: 'thinking_delta'; text: string }
  | { type: 'token'; text: string }
  | { type: 'tool_call'; id: string; name: string; args: string }
  | { type: 'usage'; usage: Usage }
  | { type: 'error'; message: string }
  | { type: 'done' };

/**
 * Contrato entre la UI y cualquier motor de inferencia.
 * F1: MockProvider. F1.5/F2: LlamaProvider (llama.cpp nativo). F6: proveedores online.
 */
export interface ChatProvider {
  id: string;
  stream(messages: ProviderMessage[], opts: StreamOptions): AsyncIterable<StreamEvent>;
}
