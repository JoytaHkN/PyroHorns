import { LlamaProvider, setNativeLlamaModule, type NativeLlamaModule } from '@/providers/llama';
import type { StreamEvent } from '@/providers/types';
import { check, done } from './helpers';

/** Motor nativo simulado: emite la salida en trozos que parten las etiquetas, como hace un modelo real. */
function fakeNative(chunks: string[], seen: { noThink?: boolean; loads: number; unloads: number }): NativeLlamaModule {
  return {
    isAvailable: async () => true,
    loadModel: async () => {
      seen.loads++;
      return 'm#1';
    },
    generate: async (_id, _prompt, options) => {
      seen.noThink = options.noThink;
      for (const c of chunks) options.onEvent({ type: 'token', text: c });
      options.onEvent({ type: 'usage', usage: { promptTokens: 5, completionTokens: 9, ttftMs: 100, tokPerSec: 12.34 } });
      options.onEvent({ type: 'done' });
    },
    cancel: async () => {},
    unloadModel: async () => {
      seen.unloads++;
    },
  };
}

async function collect(modelId: string, deep: boolean, chunks: string[]) {
  const seen = { loads: 0, unloads: 0 } as { noThink?: boolean; loads: number; unloads: number };
  setNativeLlamaModule(fakeNative(chunks, seen));
  const events: StreamEvent[] = [];
  for await (const ev of LlamaProvider.stream([{ role: 'user', content: 'hola' }], { modelId, mode: 'general', deep, contextTokens: 8192 })) {
    events.push(ev);
  }
  return { events, seen };
}

const think = (events: StreamEvent[]) => events.flatMap((e) => (e.type === 'thinking_delta' ? [e.text] : [])).join('');
const text = (events: StreamEvent[]) => events.flatMap((e) => (e.type === 'token' ? [e.text] : [])).join('');

(async () => {
  // Profundo activado: el razonamiento llega separado, aunque la etiqueta venga partida.
  const a = await collect('lfm3-1.7b', true, ['<thi', 'nk>Pienso', ' un rato</thi', 'nk>Soy ', 'LFM3.']);
  check(think(a.events) === 'Pienso un rato', 'Profundo: el razonamiento sale como thinking_delta');
  check(text(a.events) === 'Soy LFM3.', 'Profundo: la respuesta no contiene <think>');
  check(a.seen.noThink === false, 'Profundo: no se pide suprimir el razonamiento');
  check(a.events.some((e) => e.type === 'usage') && a.events[a.events.length - 1]?.type === 'done', 'usage y done se conservan, done al final');
  check(a.seen.loads === 1 && a.seen.unloads === 1, 'el modelo se carga y se descarga');

  // Profundo apagado en un modelo con razonamiento: se pide no razonar.
  const b = await collect('qwen3-1.7b', false, ['Hola', ' mundo']);
  check(b.seen.noThink === true, 'Profundo apagado + modelo con razonamiento: noThink');
  check(think(b.events) === '' && text(b.events) === 'Hola mundo', 'sin razonamiento: solo respuesta');

  // Aunque el modelo emita un bloque vacío, no aparece razonamiento.
  const c = await collect('lfm3-1.7b', false, ['<think>\n\n</think>\n\nHola']);
  check(think(c.events) === '' && text(c.events) === 'Hola', 'bloque <think> vacío: ni razonamiento ni saltos de línea sobrantes');

  // Un modelo sin razonamiento nunca recibe noThink.
  const d = await collect('phi-3.5-mini', false, ['Hola']);
  check(d.seen.noThink === false, 'modelo sin razonamiento: no se pide noThink');

  // Se corta a mitad de una etiqueta: lo retenido se entrega antes de done.
  const e = await collect('lfm3-1.7b', true, ['Texto <thi']);
  check(text(e.events) === 'Texto <thi', 'lo retenido se entrega al terminar');

  done();
})();
