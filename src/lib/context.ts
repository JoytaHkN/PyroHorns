import type { ProviderMessage } from '@/providers/types';
import type { Message } from '@/types/chat';

/** ~4 caracteres por token + 4 de formato por mensaje. Aproximación hasta tener el tokenizer real (F1.5). */
export const estimateTokens = (text: string) => Math.ceil(text.length / 4) + 4;

/** Lo que el modelo recibe de un mensaje: la pregunta, precedida de lo que la acompaña (internet, asistente). */
export const modelText = (m: Message) => {
  const extra = m.role === 'user' ? [m.web?.context, m.assist].filter(Boolean) : [];
  return extra.length ? `${extra.join('\n\n')}\n\nPregunta: ${m.content}` : m.content;
};

export interface ContextOptions {
  /** Tamaño total del contexto del modelo, en tokens. */
  contextTokens: number;
  /** Tokens reservados para la respuesta. Por defecto, una cuarta parte del contexto (máx. 2048). */
  reserveTokens?: number;
}

/**
 * Política de contexto (PLAN, sección 3):
 * - nunca se reenvía el razonamiento (`thinking`);
 * - se omiten los mensajes con error y las respuestas vacías;
 * - si no cabe todo, se descartan los mensajes más antiguos;
 * - el último mensaje del usuario siempre se incluye.
 * El compactado con LFM3 (resumir en vez de descartar) llega con el motor real.
 */
export function buildContext(messages: Message[], opts: ContextOptions): ProviderMessage[] {
  const reserve = opts.reserveTokens ?? Math.min(2048, Math.floor(opts.contextTokens / 4));
  const budget = Math.max(0, opts.contextTokens - reserve);
  const usable = messages.filter((m) => m.status !== 'error' && !(m.role === 'assistant' && !m.content.trim()));
  const out: ProviderMessage[] = [];
  let used = 0;
  for (let i = usable.length - 1; i >= 0; i--) {
    const m = usable[i]!;
    const content = modelText(m);
    const cost = estimateTokens(content);
    const isLast = out.length === 0;
    if (!isLast && used + cost > budget) break;
    out.push({ role: m.role, content });
    used += cost;
  }
  return out.reverse();
}

/** Tokens estimados de una conversación (para el contador de la barra superior). */
export const conversationTokens = (messages: Message[]) =>
  messages.reduce((n, m) => n + (m.content ? estimateTokens(modelText(m)) : 0), 0);

/** 950 → "950", 4300 → "4.3K"; los contextos (múltiplos de 1024) salen exactos: 8192 → "8K". */
export const formatTokens = (n: number) => {
  if (n < 1000) return `${n}`;
  if (n % 1024 === 0) return `${n / 1024}K`;
  return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
};
