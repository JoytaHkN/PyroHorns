import { modeById } from '@/data/agents';
import { modelById } from '@/data/models';
import type { ChatProvider, ProviderMessage, StreamEvent, StreamOptions } from './types';

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });

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
    'En F2 este texto lo generará el modelo local mediante llama.cpp. ' +
      'La interfaz ya funciona igual: streaming de tokens, indicador de pensamiento y cancelación.',
    '',
    '```ts\nconst reply = await provider.stream(messages, { modelId, mode, level });\n```',
  ].join('\n');
}

export const MockProvider: ChatProvider = {
  id: 'mock',
  async *stream(messages: ProviderMessage[], opts: StreamOptions): AsyncIterable<StreamEvent> {
    const last = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    const thinkMs = 600 + Math.min(1400, last.length * 12);
    await sleep(thinkMs, opts.signal);
    yield { type: 'thinking', ms: thinkMs };
    const text = compose(last, opts);
    const parts = text.match(/\S+\s*|\s+/g) ?? [text];
    for (const p of parts) {
      await sleep(18 + Math.random() * 30, opts.signal);
      yield { type: 'token', text: p };
    }
    yield { type: 'done' };
  },
};
