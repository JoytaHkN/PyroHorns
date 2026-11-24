import { LOCAL_MODELS } from '@/data/models';
import { ThinkSplitter } from '@/lib/think-parser';
import { useEngine } from '@/store/engine';
import { MockProvider } from './mock';
import type { ChatProvider, ProviderMessage, StreamEvent, StreamOptions } from './types';

/** Interfaz del módulo nativo (Expo Modules + JNI). Se inyecta en el paso 3. */
export interface NativeLlamaModule {
  /** Carga un GGUF y devuelve un id de modelo. */
  loadModel(modelId: string, contextTokens: number, threads: number): Promise<string>;
  /** Genera streaming de tokens. Los eventos llegan por `onEvent`. */
  generate(
    modelId: string,
    /** Conversación completa: instrucción, mensajes anteriores y el nuevo. */
    messages: ProviderMessage[],
    options: {
      threads?: number;
      /** Pide al modelo que no razone (se añade un bloque `<think></think>` vacío tras la plantilla). */
      noThink?: boolean;
      onEvent: (ev: StreamEvent) => void;
    },
    signal: AbortSignal
  ): Promise<void>;
  /** Cancela la generación en curso. */
  cancel(modelId: string): Promise<void>;
  /** Descarga el modelo de la RAM. */
  unloadModel(modelId: string): Promise<void>;
  /** ¿Está disponible el módulo nativo? */
  isAvailable(): Promise<boolean>;
}

/** Hilos de generación: 6 de 8 núcleos, como LM Playground (n.º de núcleos − 2); en las medidas 8 daba más prefill y la generación no cambiaba. */
const DEFAULT_THREADS = 6;

let nativeModule: NativeLlamaModule | null = null;

type LoadTarget = Pick<StreamOptions, 'modelId' | 'contextTokens'>;

/** Última carga anticipada pedida: si se cambia varias veces de modelo, solo se carga el último. */
let wanted: LoadTarget | null = null;

/** Modelo que se queda cargado entre mensajes (P15-3). Solo hay uno a la vez (PLAN §3). */
let loaded: { key: string; id: string } | null = null;
/** Cola de generaciones: un contexto nativo no admite dos generaciones a la vez. */
let tail: Promise<unknown> = Promise.resolve();

export function setNativeLlamaModule(mod: NativeLlamaModule) {
  nativeModule = mod;
  loaded = null; // el modelo cargado pertenecía al módulo anterior
}

/** Espera su turno; devuelve la función que lo libera. */
function acquire(): Promise<() => void> {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const prev = tail;
  tail = prev.then(() => gate);
  return prev.then(() => release);
}

/** Carga el modelo si no está ya cargado con el mismo contexto; si cambia el modelo o el contexto, descarga el anterior. */
async function ensureLoaded(native: NativeLlamaModule, opts: LoadTarget): Promise<string> {
  const key = `${opts.modelId}@${opts.contextTokens}`;
  if (loaded && loaded.key === key) return loaded.id;
  await dropLoaded(native);
  useEngine.getState().setLoading(true);
  try {
    const id = await native.loadModel(opts.modelId, opts.contextTokens, DEFAULT_THREADS);
    loaded = { key, id };
    return id;
  } finally {
    useEngine.getState().setLoading(false);
  }
}

async function dropLoaded(native: NativeLlamaModule) {
  const current = loaded;
  loaded = null;
  if (current) await native.unloadModel(current.id).catch(() => {});
}

/**
 * Carga el modelo antes de que haga falta (al abrir el chat o cambiar de modelo). Los errores se callan aquí:
 * si falta el archivo o no se puede abrir, el mensaje lo dirá al enviar.
 */
export async function preloadLlamaModel(target: LoadTarget): Promise<void> {
  const native = nativeModule;
  if (!native) return;
  wanted = target;
  const release = await acquire();
  try {
    if (wanted === target) await ensureLoaded(native, target);
  } catch {
    // Se reintenta al enviar.
  } finally {
    release();
  }
}

/** Libera el modelo cargado (por ejemplo, para recuperar RAM). La siguiente generación lo vuelve a cargar. */
export async function unloadLlamaModel(): Promise<void> {
  const native = nativeModule;
  if (!native) return;
  wanted = null;
  const release = await acquire();
  try {
    await dropLoaded(native);
  } finally {
    release();
  }
}

export function isNativeLlamaAvailable(): boolean {
  return nativeModule !== null;
}

/**
 * LlamaProvider: proveedor real basado en llama.cpp nativo.
 * Si el módulo nativo no está disponible (web, pruebas, Android sin native),
 * delega en MockProvider para que la UI siga funcionando igual.
 */
export const LlamaProvider: ChatProvider = {
  id: 'llama',
  async *stream(messages: ProviderMessage[], opts: StreamOptions): AsyncIterable<StreamEvent> {
    if (!nativeModule) {
      yield* MockProvider.stream(messages, opts);
      return;
    }

    const native = nativeModule;

    // Profundo apagado: los modelos con razonamiento no deben razonar (PLAN §3).
    const noThink = !opts.deep && (LOCAL_MODELS.find((m) => m.id === opts.modelId)?.thinking ?? false);

    wanted = null; // el mensaje manda sobre una carga anticipada pendiente
    const release = await acquire();
    let failed = false;
    try {
      const modelId = await ensureLoaded(native, opts);
      // «Detener» pulsado mientras se cargaba: no se genera nada.
      if (opts.signal?.aborted) throw Object.assign(new Error('Aborted'), { name: 'AbortError' });
      for await (const ev of streamFromNative(native, modelId, messages, opts, noThink)) {
        if (ev.type === 'error') failed = true;
        yield ev;
      }
    } catch (e) {
      failed = !(e instanceof Error && e.name === 'AbortError');
      throw e;
    } finally {
      // Tras un error el contexto nativo puede quedar en mal estado: la próxima vez se carga de nuevo.
      if (failed) await dropLoaded(native);
      release();
    }
  },
};

async function* streamFromNative(
  native: NativeLlamaModule,
  modelId: string,
  messages: ProviderMessage[],
  opts: StreamOptions,
  noThink: boolean
): AsyncGenerator<StreamEvent> {
  const queue: StreamEvent[] = [];
  let resolveEvent: (() => void) | null = null;
  let done = false;
  let errored: unknown = null;

  const enqueue = (ev: StreamEvent) => {
    queue.push(ev);
    if (ev.type === 'done' || ev.type === 'error') done = true;
    const r = resolveEvent;
    if (r) {
      resolveEvent = null;
      r();
    }
  };

  const signal = opts.signal ?? new AbortController().signal;
  const abort = () => void native.cancel(modelId).catch(() => {});
  signal.addEventListener('abort', abort, { once: true });

  try {
    await native.generate(modelId, messages, { threads: DEFAULT_THREADS, noThink, onEvent: enqueue }, signal);
  } catch (e) {
    errored = e;
    done = true;
    enqueue({ type: 'error', message: String(e) });
  } finally {
    signal.removeEventListener('abort', abort);
  }

  // El motor entrega todo mezclado; aquí se separa el razonamiento `<think>` del texto de la respuesta.
  const splitter = new ThinkSplitter();
  const mapEvent = function* (ev: StreamEvent): Generator<StreamEvent> {
    if (ev.type === 'token') {
      for (const part of splitter.push(ev.text)) {
        yield part.kind === 'thinking' ? { type: 'thinking_delta', text: part.text } : { type: 'token', text: part.text };
      }
      return;
    }
    if (ev.type === 'usage' || ev.type === 'done' || ev.type === 'error') {
      for (const part of splitter.flush()) {
        yield part.kind === 'thinking' ? { type: 'thinking_delta', text: part.text } : { type: 'token', text: part.text };
      }
    }
    yield ev;
  };

  while (queue.length > 0 || !done) {
    if (queue.length > 0) {
      yield* mapEvent(queue.shift()!);
      continue;
    }
    await new Promise<void>((res) => {
      resolveEvent = res;
    });
    if (done && queue.length === 0 && errored) {
      yield { type: 'error', message: String(errored) };
      return;
    }
  }
}
