import { LOCAL_MODELS, type LocalModel } from '@/data/models';

/** Lógica pura de la prueba de rendimiento (P13): matriz de pruebas, medianas, veredicto e informe. */

export type MmapMode = 'mmap' | 'nommap';

export interface BenchConfig {
  /** Ids de modelo (LOCAL_MODELS). */
  models: string[];
  mmap: MmapMode[];
  threads: number[];
}

export const THREAD_OPTIONS = [4, 6, 8] as const;
/** Tokens generados por prueba y repeticiones (decididos con el usuario, P13). */
export const GEN_TOKENS = 128;
export const REPS = 3;
/** Prompt corto de referencia para el objetivo de TTFT de F1.5. */
export const SHORT_PROMPT = 1024;
/** Pausa entre pruebas para que la temperatura del móvil no falsee las siguientes. */
export const COOLDOWN_MS = 3000;
/** Objetivos de F1.5 (`PLAN.md` §5). */
export const TARGETS = { ttftMs: 1500, genTokPerSec: 10 } as const;

/** Preajustes: la prueba completa son más de 140 ejecuciones. */
export const PRESETS: Record<'rapida' | 'completa', BenchConfig> = {
  rapida: { models: ['lfm3-1.7b'], mmap: ['mmap', 'nommap'], threads: [4] },
  completa: {
    models: ['lfm3-1.7b', 'qwen3-1.7b', 'cybersecqwen-4b', 'phi-3.5-mini'],
    mmap: ['mmap', 'nommap'],
    threads: [4, 6, 8],
  },
};

export interface BenchCase {
  id: string;
  modelId: string;
  mmap: MmapMode;
  threads: number;
  /** Contexto con el que se carga el modelo (el de por defecto de cada uno, PLAN §3). */
  ctx: number;
  promptTokens: number;
  promptLabel: 'corto' | 'largo';
  rep: number;
}

/** Casos que comparten una misma carga del modelo (mismo modelo y mismo modo de mmap). */
export interface BenchGroup {
  modelId: string;
  mmap: MmapMode;
  ctx: number;
  cases: BenchCase[];
}

/** Prompt largo: ≈ 95 % del contexto libre, redondeado a múltiplos de 64 (7616 con 8K, 3712 con 4K). */
export function longPromptTokens(ctx: number, gen: number = GEN_TOKENS): number {
  return Math.floor(((ctx - gen) * 0.95) / 64) * 64;
}

/** Agrupa por (modelo, mmap) para cargar cada vez una sola vez; dentro, varía hilos, tamaño de prompt y repeticiones. */
export function buildGroups(config: BenchConfig, models: LocalModel[] = LOCAL_MODELS): BenchGroup[] {
  const groups: BenchGroup[] = [];
  for (const model of models) {
    if (!config.models.includes(model.id)) continue;
    for (const mmap of config.mmap) {
      const ctx = model.defaultCtx;
      const prompts: [BenchCase['promptLabel'], number][] = [
        ['corto', SHORT_PROMPT],
        ['largo', longPromptTokens(ctx)],
      ];
      const cases: BenchCase[] = [];
      for (const threads of config.threads) {
        for (const [promptLabel, promptTokens] of prompts) {
          for (let rep = 1; rep <= REPS; rep++) {
            cases.push({
              id: `${model.id}|${mmap}|${threads}|${promptTokens}|${rep}`,
              modelId: model.id,
              mmap,
              threads,
              ctx,
              promptTokens,
              promptLabel,
              rep,
            });
          }
        }
      }
      groups.push({ modelId: model.id, mmap, ctx, cases });
    }
  }
  return groups;
}

export const countRuns = (groups: BenchGroup[]) => groups.reduce((n, g) => n + g.cases.length, 0);

export function describeCase(c: BenchCase, models: LocalModel[] = LOCAL_MODELS): string {
  const name = models.find((m) => m.id === c.modelId)?.name ?? c.modelId;
  return `${name} · ${c.mmap === 'mmap' ? 'mmap' : 'sin mmap'} · ${c.threads} hilos · prompt ${c.promptTokens} · ${c.rep}/${REPS}`;
}

// --- Medidas ------------------------------------------------------------------------------------

/** Lo que devuelve el motor nativo en cada prueba. */
export interface BenchRaw {
  promptTokens: number;
  genTokens: number;
  prefillMs: number;
  genMs: number;
  cancelled: boolean;
  error?: string;
}

export interface MemoryInfo {
  rssKb: number;
  hwmKb: number;
  availKb: number;
  totalKb: number;
}

export function parseBenchRaw(json: string): BenchRaw | null {
  try {
    const d = JSON.parse(json) as Partial<BenchRaw>;
    if (typeof d.error === 'string') return { promptTokens: 0, genTokens: 0, prefillMs: 0, genMs: 0, cancelled: false, error: d.error };
    return {
      promptTokens: Number(d.promptTokens ?? 0),
      genTokens: Number(d.genTokens ?? 0),
      prefillMs: Number(d.prefillMs ?? 0),
      genMs: Number(d.genMs ?? 0),
      cancelled: d.cancelled === true,
    };
  } catch {
    return null;
  }
}

export function parseMemoryInfo(json: string | null): MemoryInfo | null {
  if (!json) return null;
  try {
    const d = JSON.parse(json) as Partial<MemoryInfo>;
    return { rssKb: Number(d.rssKb ?? -1), hwmKb: Number(d.hwmKb ?? -1), availKb: Number(d.availKb ?? -1), totalKb: Number(d.totalKb ?? -1) };
  } catch {
    return null;
  }
}

export interface BenchResult {
  caseId: string;
  modelId: string;
  mmap: MmapMode;
  threads: number;
  promptTokens: number;
  promptLabel: BenchCase['promptLabel'];
  rep: number;
  ctx: number;
  ok: boolean;
  error?: string;
  loadMs: number;
  prefillMs: number;
  genMs: number;
  genTokens: number;
  prefillTokPerSec: number;
  genTokPerSec: number;
  /** Tiempo hasta el primer token: prefill + un token. */
  ttftMs: number;
  /** Pico de RAM del proceso durante la prueba (MB); -1 si no se pudo leer. */
  peakRssMb: number;
  at: number;
}

const perSec = (tokens: number, ms: number) => (ms > 0 ? (tokens / ms) * 1000 : 0);

export function toResult(c: BenchCase, raw: BenchRaw, extra: { loadMs: number; mem: MemoryInfo | null; at?: number }): BenchResult {
  const ok = !raw.error && !raw.cancelled && raw.genTokens > 0 && raw.prefillMs > 0;
  return {
    caseId: c.id,
    modelId: c.modelId,
    mmap: c.mmap,
    threads: c.threads,
    promptTokens: c.promptTokens,
    promptLabel: c.promptLabel,
    rep: c.rep,
    ctx: c.ctx,
    ok,
    error: raw.error ?? (raw.cancelled ? 'cancelada' : undefined),
    loadMs: extra.loadMs,
    prefillMs: raw.prefillMs,
    genMs: raw.genMs,
    genTokens: raw.genTokens,
    prefillTokPerSec: perSec(raw.promptTokens, raw.prefillMs),
    genTokPerSec: perSec(raw.genTokens, raw.genMs),
    ttftMs: raw.prefillMs + (raw.genTokens > 0 ? raw.genMs / raw.genTokens : 0),
    peakRssMb: extra.mem && extra.mem.hwmKb > 0 ? Math.round(extra.mem.hwmKb / 1024) : -1,
    at: extra.at ?? Date.now(),
  };
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export interface BenchSummary {
  key: string;
  modelId: string;
  mmap: MmapMode;
  threads: number;
  promptTokens: number;
  /** Repeticiones válidas / pedidas. */
  runs: number;
  failed: number;
  loadMs: number;
  ttftMs: number;
  prefillTokPerSec: number;
  genTokPerSec: number;
  peakRssMb: number;
}

/** Medianas por combinación (modelo, mmap, hilos, prompt); las pruebas fallidas se cuentan aparte. */
export function summarize(results: BenchResult[], models: LocalModel[] = LOCAL_MODELS): BenchSummary[] {
  const byKey = new Map<string, BenchResult[]>();
  for (const r of results) {
    const key = `${r.modelId}|${r.mmap}|${r.threads}|${r.promptTokens}`;
    byKey.set(key, [...(byKey.get(key) ?? []), r]);
  }
  const order = (id: string) => {
    const i = models.findIndex((m) => m.id === id);
    return i < 0 ? 99 : i;
  };
  return [...byKey.entries()]
    .map(([key, rs]): BenchSummary => {
      const good = rs.filter((r) => r.ok);
      const first = rs[0]!;
      return {
        key,
        modelId: first.modelId,
        mmap: first.mmap,
        threads: first.threads,
        promptTokens: first.promptTokens,
        runs: good.length,
        failed: rs.length - good.length,
        loadMs: median(rs.map((r) => r.loadMs)),
        ttftMs: median(good.map((r) => r.ttftMs)),
        prefillTokPerSec: median(good.map((r) => r.prefillTokPerSec)),
        genTokPerSec: median(good.map((r) => r.genTokPerSec)),
        peakRssMb: Math.max(-1, ...good.map((r) => r.peakRssMb)),
      };
    })
    .sort(
      (a, b) =>
        order(a.modelId) - order(b.modelId) ||
        a.mmap.localeCompare(b.mmap) ||
        a.threads - b.threads ||
        a.promptTokens - b.promptTokens,
    );
}

/** Veredicto frente a los objetivos de F1.5. El TTFT solo se juzga con el prompt corto (1K). */
export function verdict(s: BenchSummary): { ttft: boolean | null; gen: boolean } {
  return {
    ttft: s.promptTokens === SHORT_PROMPT && s.runs > 0 ? s.ttftMs < TARGETS.ttftMs : null,
    gen: s.runs > 0 && s.genTokPerSec >= TARGETS.genTokPerSec,
  };
}

const f1 = (n: number) => (Number.isFinite(n) ? n.toFixed(1) : '-');

/** Informe en Markdown para leer en pantalla o pegar en un chat. Sin conversaciones ni claves (S9). */
export function formatResults(results: BenchResult[], meta: { device: string; at: number }, models: LocalModel[] = LOCAL_MODELS): string {
  const name = (id: string) => models.find((m) => m.id === id)?.name ?? id;
  const lines: string[] = [
    `# Prueba de rendimiento PyroHorns · ${new Date(meta.at).toISOString().slice(0, 16).replace('T', ' ')}`,
    `Dispositivo: ${meta.device || 'desconocido'}`,
    `Objetivos F1.5: TTFT < ${TARGETS.ttftMs} ms con prompt de 1K · ≥ ${TARGETS.genTokPerSec} tok/s generando`,
    `Cada fila es la mediana de hasta ${REPS} repeticiones de ${GEN_TOKENS} tokens generados.`,
    '',
  ];
  const sums = summarize(results, models);
  if (sums.length === 0) return [...lines, '(sin resultados)'].join('\n');
  lines.push(
    '| Modelo | mmap | Hilos | Prompt | Carga s | TTFT ms | Prefill tok/s | Gen tok/s | RAM pico MB | Objetivo |',
    '|---|---|---|---|---|---|---|---|---|---|',
  );
  for (const s of sums) {
    const v = verdict(s);
    const goal = s.runs === 0 ? 'FALLÓ' : [v.ttft === null ? null : `TTFT ${v.ttft ? '✓' : '✗'}`, `gen ${v.gen ? '✓' : '✗'}`].filter(Boolean).join(' ');
    lines.push(
      `| ${name(s.modelId)} | ${s.mmap === 'mmap' ? 'sí' : 'no'} | ${s.threads} | ${s.promptTokens} | ${f1(s.loadMs / 1000)} | ${s.runs ? Math.round(s.ttftMs) : '-'} | ${s.runs ? f1(s.prefillTokPerSec) : '-'} | ${s.runs ? f1(s.genTokPerSec) : '-'} | ${s.peakRssMb > 0 ? s.peakRssMb : '-'} | ${goal}${s.failed && s.runs ? ` (${s.failed} fallidas)` : ''} |`,
    );
  }
  const errors = [...new Set(results.filter((r) => !r.ok && r.error).map((r) => r.error!))];
  if (errors.length) lines.push('', `Errores: ${errors.join('; ')}`);
  return lines.join('\n');
}
