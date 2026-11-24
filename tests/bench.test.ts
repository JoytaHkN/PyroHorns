import { LOCAL_MODELS } from '@/data/models';
import {
  GEN_TOKENS,
  PRESETS,
  REPS,
  SHORT_PROMPT,
  buildGroups,
  ENGINE_BUILD,
  countRuns,
  describeCase,
  describeCpu,
  formatResults,
  longPromptTokens,
  median,
  parseBenchRaw,
  parseMemoryInfo,
  summarize,
  toResult,
  verdict,
  type BenchCase,
  type BenchResult,
} from '@/lib/bench';
import { check, done } from './helpers';

// --- Matriz -----------------------------------------------------------------------------------
check(longPromptTokens(8192) === 7616, 'prompt largo con 8K = 7616');
check(longPromptTokens(4096) === 3712, 'prompt largo con 4K = 3712');
check(longPromptTokens(8192) + GEN_TOKENS < 8192 && longPromptTokens(4096) + GEN_TOKENS < 4096, 'el prompt largo siempre deja sitio a la generación');

const quick = buildGroups(PRESETS.rapida);
check(quick.length === 2 && quick.every((g) => g.modelId === 'lfm3-1.7b'), 'rápida: LFM3, una carga con mmap y otra sin');
check(countRuns(quick) === 2 * 1 * 2 * REPS, `rápida: ${countRuns(quick)} ejecuciones (2 modos × 1 hilo × 2 prompts × ${REPS})`);

const full = buildGroups(PRESETS.completa);
check(full.length === 8, 'completa: 4 modelos × 2 modos de mmap = 8 cargas');
check(countRuns(full) === 4 * 2 * 3 * 2 * REPS, 'completa: 144 ejecuciones');

const ctxOf = (id: string) => full.find((g) => g.modelId === id)!.ctx;
check(ctxOf('lfm3-1.7b') === 8192 && ctxOf('qwen3-1.7b') === 8192, 'LFM3 y Qwen3 con 8K');
check(ctxOf('cybersecqwen-4b') === 4096 && ctxOf('phi-3.5-mini') === 4096, 'Cyber y Phi con su contexto de 4K');
check(full.every((g) => g.cases.every((c) => c.promptTokens + GEN_TOKENS <= g.ctx)), 'ninguna prueba se pasa del contexto del modelo');
check(full.every((g) => g.cases.every((c) => c.threads >= 4 && c.threads <= 8)), 'hilos entre 4 y 8');

const ids = full.flatMap((g) => g.cases.map((c) => c.id));
check(new Set(ids).size === ids.length, 'los ids de las pruebas son únicos');

const g0 = quick[0]!;
check(g0.cases[0]!.promptTokens === SHORT_PROMPT && g0.cases[REPS]!.promptLabel === 'largo', 'dentro de un grupo: primero el prompt corto y luego el largo');
check(buildGroups({ models: [], mmap: ['mmap'], threads: [4] }).length === 0, 'sin modelos elegidos: nada que ejecutar');
check(buildGroups({ models: ['lfm3-1.7b'], mmap: [], threads: [4] }).length === 0, 'sin modos de mmap: nada que ejecutar');
check(describeCase(g0.cases[0]!).includes('LFM3 1.7B') && describeCase(g0.cases[0]!).includes('4 hilos'), 'descripción legible de la prueba');

// --- Medidas ----------------------------------------------------------------------------------
check(median([3, 1, 2]) === 2 && median([1, 2, 3, 4]) === 2.5 && median([]) === 0, 'mediana');

const raw = parseBenchRaw('{"promptTokens":1024,"genTokens":128,"prefillMs":1000,"genMs":10000,"cancelled":false}')!;
check(raw.promptTokens === 1024 && raw.genMs === 10000, 'parseBenchRaw');
check(parseBenchRaw('{"error":"Modelo no cargado"}')?.error === 'Modelo no cargado', 'parseBenchRaw: error del motor');
check(parseBenchRaw('no es json') === null, 'parseBenchRaw: entrada inválida');
const mem = parseMemoryInfo('{"rssKb":900000,"hwmKb":1536000,"availKb":3000000,"totalKb":11000000}')!;
check(mem.hwmKb === 1536000 && parseMemoryInfo(null) === null && parseMemoryInfo('x') === null, 'parseMemoryInfo');

const c1: BenchCase = { id: 'a', modelId: 'lfm3-1.7b', mmap: 'mmap', threads: 4, ctx: 8192, promptTokens: 1024, promptLabel: 'corto', rep: 1 };
const r1 = toResult(c1, raw, { loadMs: 5800, mem, at: 1 });
check(r1.ok && Math.round(r1.prefillTokPerSec) === 1024 && r1.genTokPerSec === 12.8, 'tok/s de prefill y generación');
check(Math.round(r1.ttftMs) === Math.round(1000 + 10000 / 128) && r1.peakRssMb === 1500, 'TTFT = prefill + 1 token; RAM pico en MB');
check(!toResult(c1, { ...raw, cancelled: true }, { loadMs: 0, mem: null }).ok, 'cancelada: no cuenta como válida');
check(!toResult(c1, { ...raw, error: 'x' }, { loadMs: 0, mem: null }).ok && toResult(c1, raw, { loadMs: 0, mem: null }).peakRssMb === -1, 'error / sin memoria');

// --- Resumen y veredicto ------------------------------------------------------------------------
const mk = (over: Partial<BenchResult>): BenchResult => ({ ...r1, ...over });
const results: BenchResult[] = [
  mk({ rep: 1, ttftMs: 1400, genTokPerSec: 11 }),
  mk({ rep: 2, ttftMs: 1000, genTokPerSec: 12 }),
  mk({ rep: 3, ttftMs: 5000, genTokPerSec: 3 }), // un valor atípico (caché fría): la mediana lo ignora
  mk({ mmap: 'nommap', rep: 1, ttftMs: 900, genTokPerSec: 13 }),
  mk({ promptTokens: 7616, promptLabel: 'largo', rep: 1, ttftMs: 30000, genTokPerSec: 6 }),
  mk({ modelId: 'qwen3-1.7b', rep: 1, ok: false, error: 'cancelada' }),
];
const sums = summarize(results);
const s = sums.find((x) => x.modelId === 'lfm3-1.7b' && x.mmap === 'mmap' && x.promptTokens === 1024)!;
check(s.runs === 3 && s.ttftMs === 1400 && s.genTokPerSec === 11, 'mediana ignora el valor atípico');
check(sums[0]!.modelId === 'lfm3-1.7b' && sums[sums.length - 1]!.modelId === 'qwen3-1.7b', 'ordenado por modelo');
const failed = sums.find((x) => x.modelId === 'qwen3-1.7b')!;
check(failed.runs === 0 && failed.failed === 1, 'las pruebas fallidas se cuentan aparte');

check(verdict(s).ttft === true && verdict(s).gen === true, 'cumple: TTFT < 1500 ms y ≥ 10 tok/s');
const long = sums.find((x) => x.promptTokens === 7616)!;
check(verdict(long).ttft === null && verdict(long).gen === false, 'prompt largo: no se juzga el TTFT; 6 tok/s no cumple');
check(verdict(failed).gen === false && verdict(failed).ttft === null, 'sin ejecuciones válidas: no cumple');

const text = formatResults(results, { device: 'HUAWEI Test', at: Date.UTC(2026, 10, 24, 12, 0) });
check(text.includes('HUAWEI Test') && text.includes('| LFM3 1.7B | sí | 4 | 1024 |') && text.includes('FALLÓ'), 'informe: dispositivo, fila y fallo');
check(text.includes('TTFT ✓') && text.includes('gen ✗') && text.includes('Errores: cancelada'), 'informe: veredicto y errores');
check(formatResults([], { device: '', at: 0 }).includes('(sin resultados)'), 'informe vacío');
// --- CPU y compilación ----------------------------------------------------------------------------
const cpu = describeCpu('{"features":"fp asimd aes asimdhp asimddp i8mm bf16 sve","maxKhz":[1600000,1600000,1600000,1600000,2151000,2151000,2151000,2151000]}');
check(cpu.includes('8 núcleos') && cpu.includes('4×1.6 GHz') && cpu.includes('4×2.2 GHz'), 'describeCpu: núcleos agrupados por frecuencia');
check(cpu.includes('dotprod ✓') && cpu.includes('fp16 ✓') && cpu.includes('i8mm ✓') && cpu.includes('sve ✓'), 'describeCpu: extensiones presentes');
const oldCpu = describeCpu('{"features":"fp asimd aes","maxKhz":[1800000,1800000]}');
check(oldCpu.includes('dotprod ✗') && oldCpu.includes('fp16 ✗') && oldCpu.includes('2 núcleos'), 'describeCpu: una CPU sin dotprod ni fp16 se ve claramente');
check(describeCpu(null) === 'CPU: desconocida' && describeCpu('x') === 'CPU: desconocida', 'describeCpu: entrada ausente o inválida');
const withMeta = formatResults(results, { device: 'D', cpu, at: 0 });
check(withMeta.includes(cpu) && withMeta.includes(`Compilación ggml-cpu: ${ENGINE_BUILD}`), 'el informe incluye CPU y compilación');
check(ENGINE_BUILD === 'armv8.2-a+dotprod+fp16', 'ENGINE_BUILD coincide con la bandera de build.gradle');
check(LOCAL_MODELS.length === 4, 'la matriz completa cubre los cuatro modelos');

done();
