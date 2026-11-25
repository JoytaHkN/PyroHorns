import {
  LlamaProvider,
  preloadLlamaModel,
  setNativeLlamaModule,
  unloadLlamaModel,
  type NativeLlamaModule,
} from '@/providers/llama';
import type { StreamEvent } from '@/providers/types';
import { check, done } from './helpers';

interface Seen {
  noThink?: boolean;
  roles?: string;
  warms?: string[];
  loads: string[];
  unloads: number;
  generates: number;
  /** Generaciones simultáneas (debe ser 1 como máximo). */
  maxConcurrent: number;
}

/** Motor nativo simulado: emite la salida en trozos que parten las etiquetas, como hace un modelo real. */
function fakeNative(script: () => StreamEvent[] | string[], seen: Seen, delayMs = 0): NativeLlamaModule {
  let running = 0;
  return {
    isAvailable: async () => true,
    loadModel: async (modelId) => {
      seen.loads.push(modelId);
      return `${modelId}#${seen.loads.length}`;
    },
    generate: async (_id, messages, options) => {
      seen.roles = messages.map((m) => m.role).join(',');
      running++;
      seen.maxConcurrent = Math.max(seen.maxConcurrent, running);
      seen.generates++;
      seen.noThink = options.noThink;
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
      for (const item of script()) options.onEvent(typeof item === 'string' ? { type: 'token', text: item } : item);
      options.onEvent({ type: 'usage', usage: { promptTokens: 5, completionTokens: 9, ttftMs: 100, tokPerSec: 12.34 } });
      options.onEvent({ type: 'done' });
      running--;
    },
    warm: async (_id, messages) => {
      (seen.warms ??= []).push(messages.map((m) => `${m.role}:${m.content}`).join(','));
    },
    cancel: async () => {},
    unloadModel: async () => {
      seen.unloads++;
    },
  };
}

const newSeen = (): Seen => ({ loads: [], unloads: 0, generates: 0, maxConcurrent: 0 });

async function run(modelId: string, deep: boolean, contextTokens = 8192) {
  const events: StreamEvent[] = [];
  for await (const ev of LlamaProvider.stream([{ role: 'user', content: 'hola' }], { modelId, mode: 'general', deep, contextTokens })) {
    events.push(ev);
  }
  return events;
}

const think = (events: StreamEvent[]) => events.flatMap((e) => (e.type === 'thinking_delta' ? [e.text] : [])).join('');
const text = (events: StreamEvent[]) => events.flatMap((e) => (e.type === 'token' ? [e.text] : [])).join('');

/** Módulo nuevo con una sola salida fija (esto también reinicia el modelo cargado). */
async function withModule(chunks: string[], delayMs = 0) {
  const seen = newSeen();
  setNativeLlamaModule(fakeNative(() => chunks, seen, delayMs));
  return seen;
}

(async () => {
  // Profundo activado: el razonamiento llega separado, aunque la etiqueta venga partida.
  let seen = await withModule(['<thi', 'nk>Pienso', ' un rato</thi', 'nk>Soy ', 'LFM3.']);
  const a = await run('lfm3-1.7b', true);
  check(think(a) === 'Pienso un rato', 'Profundo: el razonamiento sale como thinking_delta');
  check(text(a) === 'Soy LFM3.', 'Profundo: la respuesta no contiene <think>');
  check(seen.noThink === false, 'Profundo: no se pide suprimir el razonamiento');
  check(a.some((e) => e.type === 'usage') && a[a.length - 1]?.type === 'done', 'usage y done se conservan, done al final');

  // P15-3: el modelo se queda cargado entre mensajes.
  check(seen.loads.length === 1 && seen.unloads === 0, 'tras el mensaje el modelo sigue cargado (no se descarga)');
  await run('lfm3-1.7b', true);
  await run('lfm3-1.7b', true);
  check(seen.loads.length === 1 && seen.generates === 3, 'tres mensajes con el mismo modelo y contexto: una sola carga');

  // Cambiar el contexto (Profundo amplía el contexto) o el modelo recarga y descarga el anterior.
  await run('lfm3-1.7b', true, 16384);
  check(seen.loads.length === 2 && seen.unloads === 1, 'otro contexto: se descarga el anterior y se carga de nuevo');
  await run('qwen3-1.7b', false, 16384);
  check(seen.loads.length === 3 && seen.unloads === 2, 'otro modelo: se descarga el anterior y se carga el nuevo');
  check(seen.loads[2] === 'qwen3-1.7b', 'se carga el modelo pedido');

  // Descarga explícita.
  await unloadLlamaModel();
  check(seen.unloads === 3, 'unloadLlamaModel libera el modelo cargado');
  await run('qwen3-1.7b', false, 16384);
  check(seen.loads.length === 4, 'tras liberarlo, el siguiente mensaje lo vuelve a cargar');
  await unloadLlamaModel();
  await unloadLlamaModel();
  check(seen.unloads === 4, 'liberar sin modelo cargado no hace nada');

  // Profundo apagado en un modelo con razonamiento: se pide no razonar.
  seen = await withModule(['Hola', ' mundo']);
  const b = await run('qwen3-1.7b', false);
  check(seen.noThink === true, 'Profundo apagado + modelo con razonamiento: noThink');
  check(think(b) === '' && text(b) === 'Hola mundo', 'sin razonamiento: solo respuesta');

  // Aunque el modelo emita un bloque vacío, no aparece razonamiento.
  await withModule(['<think>\n\n</think>\n\nHola']);
  const c = await run('lfm3-1.7b', false);
  check(think(c) === '' && text(c) === 'Hola', 'bloque <think> vacío: ni razonamiento ni saltos de línea sobrantes');

  // Un modelo sin razonamiento nunca recibe noThink.
  seen = await withModule(['Hola']);
  await run('phi-3.5-mini', false);
  check(seen.noThink === false, 'modelo sin razonamiento: no se pide noThink');

  // Se corta a mitad de una etiqueta: lo retenido se entrega antes de done.
  await withModule(['Texto <thi']);
  const e = await run('lfm3-1.7b', true);
  check(text(e) === 'Texto <thi', 'lo retenido se entrega al terminar');

  // Un error del motor: el modelo se descarga y el siguiente mensaje lo carga de nuevo.
  seen = newSeen();
  let call = 0;
  setNativeLlamaModule(
    fakeNative(() => (++call === 1 ? [{ type: 'error', message: 'Falló la generación' }] : ['Bien']), seen),
  );
  const f1 = await run('lfm3-1.7b', true);
  check(f1.some((x) => x.type === 'error'), 'el error del motor llega a la interfaz');
  check(seen.unloads === 1, 'tras un error el modelo se descarga (el contexto pudo quedar mal)');
  const f2 = await run('lfm3-1.7b', true);
  check(text(f2) === 'Bien' && seen.loads.length === 2, 'el mensaje siguiente carga de nuevo y funciona');

  // Dos conversaciones a la vez: las generaciones se encolan, nunca se solapan en el mismo contexto.
  seen = await withModule(['Hola'], 20);
  await Promise.all([run('lfm3-1.7b', true), run('lfm3-1.7b', true), run('lfm3-1.7b', true)]);
  check(seen.generates === 3 && seen.maxConcurrent === 1, 'generaciones simultáneas: se encolan (máximo 1 a la vez)');
  check(seen.loads.length === 1, 'las generaciones encoladas comparten el modelo cargado');

  // Memoria: al motor le llega la conversación completa, no solo el último mensaje.
  seen = await withModule(['Vale']);
  for await (const _ of LlamaProvider.stream(
    [
      { role: 'system', content: 'instrucción' },
      { role: 'user', content: 'uno' },
      { role: 'assistant', content: 'dos' },
      { role: 'user', content: 'tres' },
    ],
    { modelId: 'lfm3-1.7b', mode: 'general', deep: true, contextTokens: 8192 },
  )) {
    // se consume el stream
  }
  check(seen.roles === 'system,user,assistant,user', 'el motor recibe instrucción e historial');

  // Carga anticipada: el mensaje reutiliza el modelo ya cargado, y de varios cambios seguidos solo vale el último.
  seen = await withModule(['Hola']);
  await preloadLlamaModel({ modelId: 'lfm3-1.7b', contextTokens: 8192 });
  await run('lfm3-1.7b', true);
  check(seen.loads.length === 1 && seen.generates === 1, 'carga anticipada: al enviar no se vuelve a cargar');
  seen = await withModule(['Hola']);
  await Promise.all(
    ['lfm3-1.7b', 'phi-3.5-mini', 'qwen3-1.7b'].map((modelId) => preloadLlamaModel({ modelId, contextTokens: 8192 })),
  );
  check(seen.loads.join(',') === 'qwen3-1.7b', 'cambios seguidos de modelo: solo se carga el último');

  // P17-2: la instrucción se adelanta justo después de cargar, y solo entonces.
  seen = await withModule(['Hola']);
  await preloadLlamaModel({ modelId: 'lfm3-1.7b', contextTokens: 8192, system: 'instrucción' });
  check(seen.warms?.join() === 'system:instrucción', 'carga anticipada: procesa la instrucción');
  await preloadLlamaModel({ modelId: 'lfm3-1.7b', contextTokens: 8192, system: 'instrucción' });
  check(seen.warms?.length === 1, 'con el modelo ya cargado no se repite');
  seen = await withModule(['Hola']);
  await run('lfm3-1.7b', true);
  check(seen.warms === undefined, 'al enviar un mensaje no hay paso previo aparte');

  // P18: texto aparte sin razonamiento, reutilizando el modelo cargado.
  seen = newSeen();
  const base = fakeNative(() => ['x'], seen);
  let asked: { noThink: boolean; maxTokens: number } | undefined;
  setNativeLlamaModule({
    ...base,
    complete: async (_id, _messages, o) => {
      asked = o;
      return 'consulta';
    },
  });
  const out = await LlamaProvider.complete!([{ role: 'user', content: 'x' }], { modelId: 'lfm3-1.7b', mode: 'general', deep: true, contextTokens: 8192 });
  await run('lfm3-1.7b', true);
  check(out === 'consulta' && asked?.noThink === true && asked.maxTokens === 32, 'complete: corto y sin razonar');
  check(seen.loads.length === 1, 'complete y el mensaje comparten el modelo cargado');

  done();
})();
