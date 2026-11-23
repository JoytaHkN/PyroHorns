import { MockProvider } from './mock';
import type { ChatProvider, ProviderMessage, StreamEvent, StreamOptions } from './types';

/** Interfaz del módulo nativo (Expo Modules + JNI). Se inyecta en el paso 3. */
export interface NativeLlamaModule {
  /** Carga un GGUF y devuelve un id de modelo. */
  loadModel(modelId: string, contextTokens: number, threads: number): Promise<string>;
  /** Genera streaming de tokens. Los eventos llegan por `onEvent`. */
  generate(
    modelId: string,
    prompt: string,
    options: {
      threads?: number;
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

let nativeModule: NativeLlamaModule | null = null;

export function setNativeLlamaModule(mod: NativeLlamaModule) {
  nativeModule = mod;
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

    const last = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    const modelId = await nativeModule.loadModel(opts.modelId, opts.contextTokens, 4);

    try {
      yield* streamFromNative(nativeModule, modelId, last, opts);
    } finally {
      await nativeModule.unloadModel(modelId).catch(() => {});
    }
  },
};

async function* streamFromNative(
  native: NativeLlamaModule,
  modelId: string,
  prompt: string,
  opts: StreamOptions
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
    await native.generate(modelId, prompt, { threads: 4, onEvent: enqueue }, signal);
  } catch (e) {
    errored = e;
    done = true;
    enqueue({ type: 'error', message: String(e) });
  } finally {
    signal.removeEventListener('abort', abort);
  }

  while (queue.length > 0 || !done) {
    if (queue.length > 0) {
      yield queue.shift()!;
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
