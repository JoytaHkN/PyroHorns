/**
 * Agente en la nube compatible con la API de OpenAI (F6 adelantada a petición del usuario, 2026-11-25).
 * Usa la clave del propio usuario (S5-B). Los mensajes de la conversación salen del teléfono hacia el proveedor.
 * Ni la clave ni el contenido se escriben en registros ni en mensajes de error (S9).
 */
import { CLOUD_COMPANIES } from '@/data/cloud-catalog';
import { modelById, type CloudProviderId } from '@/data/models';
import { estimateTokens } from '@/lib/context';
import { ThinkSplitter } from '@/lib/think-parser';
import type { ChatProvider, ProviderMessage, StreamEvent, StreamOptions } from './types';

/** Ruta de chat, nombre y si necesita clave, por empresa. */
export const CLOUD_PROVIDERS: Record<string, { name: string; chatUrl: string; keyPage: string; keyless: boolean }> = Object.fromEntries(
  CLOUD_COMPANIES.map((c) => [c.id, { name: c.name, chatUrl: c.chatUrl, keyPage: c.keyPage, keyless: c.keyless }]),
);

export class CloudError extends Error {
  override name = 'CloudError';
}

export type CloudFetch = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; body: ReadableStream<Uint8Array> | null }>;

const MAX_ANSWER_TOKENS = 4096;

function statusMessage(status: number, provider: string): string {
  if (status === 401 || status === 403) return `La clave de ${provider} no es válida o no tiene acceso a este modelo.`;
  if (status === 402) return `${provider} indica que la cuenta no tiene saldo para este modelo.`;
  if (status === 404 || status === 410) return `${provider} ya no ofrece este modelo. Elige otro.`;
  if (status === 429) return `Alcanzaste el límite de uso de ${provider}. Prueba más tarde o con otro modelo.`;
  return `${provider} respondió con el error ${status}.`;
}

interface Chunk {
  choices?: { delta?: { content?: string | null; reasoning_content?: string | null; reasoning?: string | null } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number } | null;
  error?: unknown;
}

export function createCloudProvider(fetcher: CloudFetch, getKey: (p: CloudProviderId) => Promise<string | null>): ChatProvider {
  return {
    id: 'cloud',
    async *stream(messages: ProviderMessage[], opts: StreamOptions): AsyncIterable<StreamEvent> {
      const cloud = modelById(opts.modelId).cloud;
      if (!cloud) throw new CloudError('Este modelo no es de la nube.');
      const provider = CLOUD_PROVIDERS[cloud.provider];
      if (!provider) throw new CloudError('Esta empresa no está en el catálogo de la nube.');
      const key = provider.keyless ? null : await getKey(cloud.provider);
      if (!provider.keyless && !key) throw new CloudError(`Falta la clave de ${provider.name}. Añádela en Ajustes → Agente en la nube.`);

      const abortError = () => Object.assign(new Error('Aborted'), { name: 'AbortError' });
      const started = Date.now();
      let res;
      try {
        res = await fetcher(provider.chatUrl, {
          method: 'POST',
          headers: {
            ...(key ? { Authorization: `Bearer ${key}` } : {}),
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          body: JSON.stringify({
            model: cloud.apiModel,
            messages: messages.map(({ role, content }) => ({ role, content })),
            stream: true,
            max_tokens: MAX_ANSWER_TOKENS,
            temperature: 0.6,
          }),
          ...(opts.signal ? { signal: opts.signal } : {}),
        });
      } catch {
        if (opts.signal?.aborted) throw abortError();
        throw new CloudError(`No se pudo conectar con ${provider.name}. Revisa la conexión.`);
      }
      if (!res.ok) throw new CloudError(statusMessage(res.status, provider.name));
      if (!res.body) throw new CloudError(`${provider.name} no envió respuesta.`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const splitter = new ThinkSplitter();
      let pending = '';
      let first = 0;
      let answer = '';
      let usage: Chunk['usage'] = null;
      let finished = false;
      const parts = function* (text: string): Generator<StreamEvent> {
        for (const p of splitter.push(text)) {
          yield p.kind === 'thinking' ? { type: 'thinking_delta', text: p.text } : { type: 'token', text: p.text };
        }
      };
      try {
        while (!finished) {
          const { value, done } = await reader.read();
          if (opts.signal?.aborted) throw abortError();
          pending += done ? '\n' : decoder.decode(value, { stream: true });
          const lines = pending.split('\n');
          pending = lines.pop() ?? '';
          for (const line of lines) {
            const data = line.startsWith('data:') ? line.slice(5).trim() : '';
            if (!data) continue;
            if (data === '[DONE]') {
              finished = true;
              break;
            }
            let chunk: Chunk;
            try {
              chunk = JSON.parse(data) as Chunk;
            } catch {
              continue;
            }
            if (chunk.error) throw new CloudError(`${provider.name} cortó la respuesta con un error.`);
            if (chunk.usage) usage = chunk.usage;
            const delta = chunk.choices?.[0]?.delta;
            const reasoning = delta?.reasoning_content ?? delta?.reasoning;
            if (reasoning) {
              first ||= Date.now();
              yield { type: 'thinking_delta', text: reasoning };
            }
            if (delta?.content) {
              first ||= Date.now();
              answer += delta.content;
              yield* parts(delta.content);
            }
          }
          if (done) break;
        }
      } catch (e) {
        if (opts.signal?.aborted) throw abortError();
        if (e instanceof CloudError) throw e;
        throw new CloudError(`Se cortó la conexión con ${provider.name}.`);
      } finally {
        reader.cancel().catch(() => {});
      }
      for (const p of splitter.flush()) {
        yield p.kind === 'thinking' ? { type: 'thinking_delta', text: p.text } : { type: 'token', text: p.text };
      }
      if (!answer.trim()) throw new CloudError(`${provider.name} no devolvió texto.`);
      const completionTokens = usage?.completion_tokens ?? estimateTokens(answer);
      const seconds = Math.max(0.001, (Date.now() - (first || started)) / 1000);
      yield {
        type: 'usage',
        usage: {
          promptTokens: usage?.prompt_tokens ?? messages.reduce((n, m) => n + estimateTokens(m.content), 0),
          completionTokens,
          ttftMs: (first || Date.now()) - started,
          tokPerSec: completionTokens / seconds,
        },
      };
      yield { type: 'done' };
    },
  };
}
