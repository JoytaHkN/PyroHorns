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
  /** `chat` (por defecto), `vision` (ve imágenes con su complemento) o `aux` (no se usa solo). */
  kind?: 'chat' | 'vision' | 'aux';
  /** Complemento de visión (mmproj). La app aún no admite imágenes (F4). */
  mmproj?: { url: string; sizeMB: number; note: string };
  /** No se resume con él la búsqueda web (guardar su memoria no está comprobado). */
  noRewrite?: boolean;
  /** Modelo en la nube: se usa con la clave del usuario. */
  cloud?: { provider: CloudProviderId; apiModel: string };
}

export type CloudProviderId = 'nvidia' | 'openrouter';

/** Modelo que usa el botón «Nube» (NVIDIA; necesita la clave del usuario). */
export const CLOUD_DEFAULT_ID = 'cloud-nv-ultra';

/** Sirve para conversar (no es un borrador ni un adaptador). */
export const canChat = (m: LocalModel) => m.kind !== 'aux';

const QWEN_MMPROJ = {
  url: 'https://huggingface.co/Qwen/Qwen3-VL-4B-Instruct-GGUF/resolve/main/mmproj-Qwen3VL-4B-Instruct-Q8_0.gguf',
  sizeMB: 454,
  note: 'Es el oficial de Qwen3-VL 4B; con esta variante no está comprobado.',
};
const MINICPM_MMPROJ = {
  url: 'https://huggingface.co/openbmb/MiniCPM-V-4.7-1B-gguf/resolve/main/mmproj-model-f16.gguf',
  sizeMB: 1110,
  note: 'Publicado por OpenBMB para MiniCPM-V 4.7 1B; con esta variante no está comprobado.',
};
const GEMMA4_MMPROJ = {
  url: 'https://huggingface.co/ggml-org/gemma-4-E4B-it-GGUF/resolve/main/mmproj-gemma-4-E4B-it-Q8_0.gguf',
  sizeMB: 560,
  note: 'Es el de Gemma 4 E4B (la base); no está comprobado que sirva con este modelo.',
};

/** Valores comunes de los modelos añadidos el 2026-11-25: opcionales y sin medir. */
const extra = (m: Omit<LocalModel, 'optional' | 'tools' | 'thinking' | 'defaultCtx' | 'deepCtx'> & Partial<LocalModel>): LocalModel => ({
  optional: true,
  tools: false,
  thinking: false,
  defaultCtx: 4096,
  deepCtx: 8192,
  ...m,
});

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
  {
    // El GGUF declara arquitectura gemma4 (42 capas, ventana deslizante de 512, 2 cabezas KV). kvKBPerToken es una cota
    // superior (todas las capas globales): con la ventana deslizante el uso real es menor. Plantilla y razonamiento sin probar.
    id: 'nemotron-bolt-e4b',
    name: 'Nemotron 3.5 Bolt E4B',
    file: 'NVIDIA-Nemotron-3.5-Bolt-E4B-Q4_K_M.gguf',
    quant: 'Q4_K_M',
    bytes: 6180446208,
    role: 'Opcional · en prueba de rendimiento',
    thinking: false,
    tools: false,
    defaultCtx: 4096,
    deepCtx: 4096,
    kvKBPerToken: 172,
    optional: true,
    mmproj: GEMMA4_MMPROJ,
  },
  extra({
    id: 'nemotron-bolt-uncensored',
    name: 'Nemotron 3.5 Bolt sin restricciones',
    file: 'NVIDIA-Nemotron-3.5-Bolt-E4B-Uncensored-AD-Q4_K_M-00001-of-00001.gguf',
    quant: 'Q4_K_M',
    bytes: 5060482880,
    role: 'Opcional · variante sin filtros, sin probar',
    deepCtx: 4096,
    kvKBPerToken: 172,
    mmproj: GEMMA4_MMPROJ,
  }),
  extra({
    id: 'llama-nemotron-8b',
    name: 'Nemotron Nano 8B',
    file: 'Llama-3.1-Nemotron-Nano-8B-v1-Q4_K_M.gguf',
    quant: 'Q4_K_M',
    bytes: 4920737344,
    role: 'Solo declara inglés · puede no caber en memoria',
    deepCtx: 4096,
    kvKBPerToken: 128,
  }),
  extra({
    id: 'llama-nemotron-8b-nv',
    name: 'Nemotron Nano 8B (copia 2)',
    file: 'nvidia-llama-3_1-nemotron-nano-8b-v1-q4_k_m.gguf',
    quant: 'Q4_K_M',
    bytes: 4920736640,
    role: 'El mismo modelo que el anterior',
    deepCtx: 4096,
    kvKBPerToken: 128,
  }),
  extra({
    id: 'dory-4b',
    name: 'Dory 1.0 4B',
    file: 'Dory1.0-4B-Q4_K_M-noimat.gguf',
    quant: 'Q4_K_M',
    bytes: 2431669184,
    role: 'Experimental · motor con parche aún no aceptado oficialmente',
    thinking: true,
    defaultCtx: 2048,
    deepCtx: 4096,
    kvKBPerToken: 768,
    noRewrite: true,
  }),
  extra({
    id: 'qwen3-vl-4b-q4',
    name: 'Qwen3-VL 4B',
    file: 'Qwen3-VL-4B-Instruct-Uncensored-AD-Q4_K.gguf',
    quant: 'Q4_K',
    bytes: 2488824256,
    role: 'Visión · sin filtros · por ahora solo texto',
    kind: 'vision',
    kvKBPerToken: 144,
    mmproj: QWEN_MMPROJ,
  }),
  extra({
    id: 'qwen3-vl-4b-q6',
    name: 'Qwen3-VL 4B (Q6)',
    file: 'Qwen3-VL-4B-Instruct-Uncensored-AD-Q6_K.gguf',
    quant: 'Q6_K',
    bytes: 3677270976,
    role: 'Visión · más pesado y lento que el Q4 · por ahora solo texto',
    kind: 'vision',
    kvKBPerToken: 144,
    mmproj: QWEN_MMPROJ,
  }),
  extra({
    id: 'minicpm-v-1b',
    name: 'MiniCPM-V 1B',
    file: 'MiniCPM-V-4.7-1B-AD-Q4_K_M.gguf',
    quant: 'Q4_K_M',
    bytes: 666104928,
    role: 'Visión · el más ligero · por ahora solo texto',
    kind: 'vision',
    thinking: true,
    defaultCtx: 8192,
    kvKBPerToken: 48,
    mmproj: MINICPM_MMPROJ,
  }),
  extra({
    id: 'minicpm-v-1b-q5',
    name: 'MiniCPM-V 1B (Q5)',
    file: 'MiniCPM-V-4.7-1B-AD-Q5_K_M-Q4_K_M.gguf',
    quant: 'Q5_K_M',
    bytes: 692790368,
    role: 'Visión · algo más fino que el Q4 · por ahora solo texto',
    kind: 'vision',
    thinking: true,
    defaultCtx: 8192,
    kvKBPerToken: 48,
    mmproj: MINICPM_MMPROJ,
  }),
  extra({
    id: 'cosmos3-nano-vlm',
    name: 'Cosmos3 Nano VLM',
    file: 'Cosmos3-Nano-VLM.Q4_K_M.gguf',
    quant: 'Q4_K_M',
    bytes: 5027784832,
    role: 'Visión y robótica · no encontré su complemento',
    kind: 'vision',
    deepCtx: 4096,
    kvKBPerToken: 144,
  }),
  extra({
    id: 'draft-qwen35-4b',
    name: 'Borrador Qwen3.5 4B',
    file: 'Qwen3.5-4B-Qwen3.8-27B-Draft-Q4_K_M.gguf',
    quant: 'Q4_K_M',
    bytes: 2724766560,
    role: 'Ayudante de Qwen3.8 27B (que no está): no se usa solo',
    kind: 'aux',
    kvKBPerToken: 80,
  }),
  extra({
    id: 'draft-qwen35-08b',
    name: 'Borrador Qwen3.5 0.8B',
    file: 'Qwen3.5-0.8B-Qwen3.8-27B-Draft-Q4_K_M.gguf',
    quant: 'Q4_K_M',
    bytes: 503507584,
    role: 'Ayudante de Qwen3.8 27B (que no está): no se usa solo',
    kind: 'aux',
    kvKBPerToken: 48,
  }),
  extra({
    id: 'lora-bonsai-2b',
    name: 'Ternary-Bonsai LoRA',
    file: 'Ternary-Bonsai-2-2B-Uncensored-LoRA.gguf',
    quant: 'LoRA',
    bytes: 1187136,
    role: 'Adaptador sin su modelo base: no se usa solo',
    kind: 'aux',
    kvKBPerToken: 0,
  }),
];

const cloud = (id: string, name: string, provider: CloudProviderId, apiModel: string, role: string): LocalModel => ({
  id,
  name,
  file: '',
  quant: '',
  bytes: 0,
  role,
  thinking: true,
  tools: false,
  defaultCtx: 32768,
  deepCtx: 65536,
  kvKBPerToken: 0,
  cloud: { provider, apiModel },
});

/** Agentes en la nube (F6 adelantada a petición del usuario). Nombres comprobados en los catálogos el 2026-11-25. */
export const CLOUD_MODELS: LocalModel[] = [
  cloud('cloud-nv-ultra', 'Nemotron 3 Ultra', 'nvidia', 'nvidia/nemotron-3-ultra-550b-a55b', 'NVIDIA · programación y planificación'),
  cloud('cloud-nv-kimi', 'Kimi K3.1 Pro', 'nvidia', 'moonshotai/kimi-k3.1-pro', 'NVIDIA · programación'),
  cloud('cloud-nv-glm', 'GLM 5.3 Flash', 'nvidia', 'z-ai/glm-5.3-flash', 'NVIDIA · más rápido'),
  cloud('cloud-or-ultra', 'Nemotron 3 Ultra (OpenRouter)', 'openrouter', 'nvidia/nemotron-3-ultra-550b-a55b:free', 'OpenRouter · gratis, 50 al día'),
];

export const FALLBACK_MODEL_ID = 'lfm3-1.7b';

const GIB = 1024 ** 3;

export function modelById(id: string): LocalModel {
  return LOCAL_MODELS.find((m) => m.id === id) ?? CLOUD_MODELS.find((m) => m.id === id) ?? LOCAL_MODELS[0]!;
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
