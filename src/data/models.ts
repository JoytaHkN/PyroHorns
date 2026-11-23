export type LevelId = 'lite' | 'pro' | 'max';

export interface LocalModel {
  id: string;
  name: string;
  file: string;
  quant: string;
  sizeGB: number;
  role: string;
  /** Nivel que atiende, o null si es el modelo base/respaldo. */
  level: LevelId | null;
}

/** Modelos GGUF de la carpeta del proyecto. Ver PLAN.md → "Rol de cada modelo". */
export const LOCAL_MODELS: LocalModel[] = [
  {
    id: 'lfm3-1.7b',
    name: 'LFM3 1.7B',
    file: 'LFM3-1.7B-Q4_K_M.gguf',
    quant: 'Q4_K_M',
    sizeGB: 1.1,
    role: 'Base y respaldo · router, títulos, resúmenes',
    level: null,
  },
  {
    id: 'phi-3.5-mini',
    name: 'Phi-3.5 mini',
    file: 'Phi-3.5-mini-instruct-Q4_K_M.gguf',
    quant: 'Q4_K_M',
    sizeGB: 2.4,
    role: 'Fire Lite · razonamiento general',
    level: 'lite',
  },
  {
    id: 'qwen3-1.7b',
    name: 'Qwen3 1.7B',
    file: 'Qwen3-1.7B-Q4_K_M.gguf',
    quant: 'Q4_K_M',
    sizeGB: 1.3,
    role: 'Fire Pro · código y herramientas',
    level: 'pro',
  },
  {
    id: 'cybersecqwen-4b',
    name: 'CyberSecQwen 4B',
    file: 'CyberSecQwen-4B.Q4_K_M.gguf',
    quant: 'Q4_K_M',
    sizeGB: 2.5,
    role: 'Fire Max · Red/Blue Cyber',
    level: 'max',
  },
];

export const FALLBACK_MODEL_ID = 'lfm3-1.7b';

export function modelById(id: string): LocalModel {
  return LOCAL_MODELS.find((m) => m.id === id) ?? LOCAL_MODELS[0]!;
}

export function modelForLevel(level: LevelId): LocalModel {
  return LOCAL_MODELS.find((m) => m.level === level) ?? modelById(FALLBACK_MODEL_ID);
}
