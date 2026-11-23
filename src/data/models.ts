/** Modelos GGUF de la carpeta del proyecto. Ver PLAN.md → sección 3. */
export interface LocalModel {
  id: string;
  name: string;
  file: string;
  quant: string;
  /** Tamaño exacto del archivo. */
  bytes: number;
  role: string;
  /** Admite razonamiento (modo Profundo). */
  thinking: boolean;
  /** Su plantilla de chat admite herramientas. */
  tools: boolean;
  /** Contexto por defecto y con el interruptor Profundo (tokens). */
  defaultCtx: number;
  deepCtx: number;
  /** Memoria de la caché KV por token, en KB (f16). Medido desde el GGUF. */
  kvKBPerToken: number;
  /** No se incluye por defecto; solo por elección manual. */
  optional?: boolean;
}

export const LOCAL_MODELS: LocalModel[] = [
  {
    id: 'lfm3-1.7b',
    name: 'LFM3 1.7B',
    file: 'LFM3-1.7B-Q4_K_M.gguf',
    quant: 'Q4_K_M',
    bytes: 1115637312,
    role: 'Principal · general, agente, títulos y resúmenes',
    thinking: true,
    tools: true,
    defaultCtx: 8192,
    deepCtx: 16384,
    kvKBPerToken: 12,
  },
  {
    id: 'qwen3-1.7b',
    name: 'Qwen3 1.7B',
    file: 'Qwen3-1.7B-Q4_K_M.gguf',
    quant: 'Q4_K_M',
    bytes: 1282439328,
    role: 'Código · programación, construcción, depuración',
    thinking: true,
    tools: true,
    defaultCtx: 8192,
    deepCtx: 16384,
    kvKBPerToken: 112,
  },
  {
    id: 'cybersecqwen-4b',
    name: 'CyberSecQwen 4B',
    file: 'CyberSecQwen-4B.Q4_K_M.gguf',
    quant: 'Q4_K_M',
    bytes: 2497277536,
    role: 'Especialista · Red y Blue Cyber',
    thinking: false,
    tools: false,
    defaultCtx: 4096,
    deepCtx: 8192,
    kvKBPerToken: 144,
  },
  {
    id: 'phi-3.5-mini',
    name: 'Phi-3.5 mini',
    file: 'Phi-3.5-mini-instruct-Q4_K_M.gguf',
    quant: 'Q4_K_M',
    bytes: 2393232672,
    role: 'Opcional · solo por elección manual',
    thinking: false,
    tools: false,
    defaultCtx: 4096,
    deepCtx: 4096,
    kvKBPerToken: 384,
    optional: true,
  },
];

export const FALLBACK_MODEL_ID = 'lfm3-1.7b';

const GIB = 1024 ** 3;

export function modelById(id: string): LocalModel {
  return LOCAL_MODELS.find((m) => m.id === id) ?? LOCAL_MODELS[0]!;
}

/** Tamaño para mostrar, en GB decimales (como los muestra Android). */
export const sizeGB = (m: LocalModel) => m.bytes / 1e9;

export const contextTokens = (m: LocalModel, deep: boolean) => (deep ? m.deepCtx : m.defaultCtx);

/** RAM estimada en GiB: pesos + contexto × KB por token + 0,4 GiB de buffers (PLAN, sección 3). */
export function estimateRamGiB(m: LocalModel, ctx: number): number {
  return m.bytes / GIB + (ctx * m.kvKBPerToken) / (1024 * 1024) + 0.4;
}

/** Regla de memoria: cabe si la estimación no supera el 80 % de la RAM libre. */
export function fitsInMemory(m: LocalModel, ctx: number, freeGiB: number): boolean {
  return estimateRamGiB(m, ctx) <= freeGiB * 0.8;
}
