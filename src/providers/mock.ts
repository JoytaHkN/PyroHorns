import { modeById } from '@/data/agents';
import { modelById } from '@/data/models';
import { estimateTokens } from '@/lib/context';
import type { ChatProvider, ProviderMessage, StreamEvent, StreamOptions } from './types';

/** Hermes no garantiza `DOMException`: se usa un Error normal con el nombre estándar. */
const abortError = () => Object.assign(new Error('Aborted'), { name: 'AbortError' });

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        reject(abortError());
      },
      { once: true },
    );
  });

const words = (text: string) => text.match(/\S+\s*|\s+/g) ?? [text];

function compose(last: string, opts: StreamOptions): string {
  const model = modelById(opts.modelId);
  const mode = modeById(opts.mode);
  const q = last.trim().replace(/\s+/g, ' ');
  const short = q.length > 80 ? `${q.slice(0, 77)}…` : q;
  return [
    `Respuesta simulada en modo **${mode.label}** con **${model.name}** (${model.quant}).`,
    '',
    `Recibí: "${short}".`,
    '',
    'En F1.5 este texto lo generará el modelo local mediante llama.cpp. ' +
      'La interfaz ya funciona igual: streaming, razonamiento plegable, métricas y cancelación.',
    '',
    '```ts\nconst reply = provider.stream(messages, { modelId, mode, deep, contextTokens });\n```',
  ].join('\n');
}

export const MockProvider: ChatProvider = {
  id: 'mock',
  async *stream(messages: ProviderMessage[], opts: StreamOptions): AsyncIterable<StreamEvent> {
    const started = Date.now();
    const last = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    const model = modelById(opts.modelId);
    if (opts.deep && model.thinking) {
      const reasoning =
        `El usuario pregunta: "${last.slice(0, 60)}". ` +
        'Separo la pregunta en partes, reviso qué datos necesito y preparo una respuesta breve.';
      for (const w of words(reasoning)) {
        await sleep(12 + Math.random() * 20, opts.signal);
        yield { type: 'thinking_delta', text: w };
      }
    } else {
      await sleep(500 + Math.min(1200, last.length * 10), opts.signal);
    }
    const ttftMs = Date.now() - started;
    const parts = words(compose(last, opts));
    const genStart = Date.now();
    for (const p of parts) {
      await sleep(18 + Math.random() * 30, opts.signal);
      yield { type: 'token', text: p };
    }
    const secs = Math.max(0.001, (Date.now() - genStart) / 1000);
    yield {
      type: 'usage',
      usage: {
        promptTokens: messages.reduce((n, m) => n + estimateTokens(m.content), 0),
        completionTokens: parts.length,
        ttftMs,
        tokPerSec: Math.round((parts.length / secs) * 10) / 10,
      },
    };
    yield { type: 'done' };
  },
};
