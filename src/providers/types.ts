import type { ModeId } from '@/data/agents';
import type { LevelId } from '@/data/models';

export type Role = 'user' | 'assistant' | 'system';

export interface ProviderMessage {
  role: Role;
  content: string;
}

export interface StreamOptions {
  modelId: string;
  mode: ModeId;
  level: LevelId;
  signal?: AbortSignal;
}

export type StreamEvent =
  | { type: 'thinking'; ms: number }
  | { type: 'token'; text: string }
  | { type: 'done' };

/**
 * Contrato entre la UI y cualquier motor de inferencia.
 * F1: MockProvider. F2: LlamaProvider (llama.cpp nativo). F6: proveedores online.
 */
export interface ChatProvider {
  id: string;
  stream(messages: ProviderMessage[], opts: StreamOptions): AsyncIterable<StreamEvent>;
}
