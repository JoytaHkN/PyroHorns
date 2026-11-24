import { modelById } from '@/data/models';
import { unloadLlamaModel } from '@/providers/llama';
import { useBench } from '@/store/bench';
import {
  benchRun,
  cancel,
  keepScreenOn,
  loadModel,
  readMemoryInfo,
  resetPeakMemory,
  unloadModel,
} from '@pyrohorns/llama';
import {
  COOLDOWN_MS,
  GEN_TOKENS,
  countRuns,
  describeCase,
  parseBenchRaw,
  parseMemoryInfo,
  toResult,
  type BenchGroup,
  type BenchRaw,
} from './bench';
import { locateModel } from './native';

let stopRequested = false;
let currentHandle: number | null = null;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const store = () => useBench.getState();

/** Pide parar: cancela la prueba en curso y no empieza más. */
export function stopBench() {
  stopRequested = true;
  if (currentHandle !== null) void cancel(currentHandle).catch(() => {});
}

/**
 * Ejecuta la matriz de pruebas (P13). Carga cada modelo una vez por modo de mmap, mide y lo descarga.
 * Antes de cada carga y de cada prueba guarda un marcador: si Android cierra la app, se sabe cuál fue.
 */
export async function runBench(groups: BenchGroup[]): Promise<void> {
  if (store().running) return;
  stopRequested = false;
  const total = countRuns(groups);
  let done = 0;
  store().clearLog();
  store().setRunning(true);
  store().setProgress({ done, total, current: 'preparando' });
  try {
    await unloadLlamaModel(); // el chat puede tener un modelo cargado: solo uno a la vez en RAM
    keepScreenOn(true);

    for (const group of groups) {
      if (stopRequested) break;
      const model = modelById(group.modelId);
      const label = `${model.name} · ${group.mmap === 'mmap' ? 'mmap' : 'sin mmap'}`;
      const path = locateModel(model.file);
      if (!path) {
        store().pushLog(`${label}: falta ${model.file}, se omite`);
        done += group.cases.length;
        continue;
      }

      store().setInProgress(`cargar ${label} (contexto ${group.ctx})`);
      store().setProgress({ done, total, current: `cargando ${label}` });
      const loadStart = Date.now();
      let handle = 0;
      try {
        handle = await loadModel(path, group.ctx, group.cases[0]!.threads, group.mmap === 'mmap');
      } catch (e) {
        store().pushLog(`${label}: error al cargar: ${String(e)}`);
      }
      const loadMs = Date.now() - loadStart;
      if (handle === 0) {
        store().pushLog(`${label}: no se pudo cargar`);
        store().setInProgress(null);
        done += group.cases.length;
        continue;
      }
      store().setInProgress(null);
      store().pushLog(`${label}: cargado en ${(loadMs / 1000).toFixed(1)} s`);
      currentHandle = handle;

      try {
        for (const c of group.cases) {
          if (stopRequested) break;
          const what = describeCase(c);
          store().setInProgress(what);
          store().setProgress({ done, total, current: what });
          resetPeakMemory();

          let raw: BenchRaw;
          try {
            raw = parseBenchRaw(await benchRun(handle, c.promptTokens, GEN_TOKENS, c.threads)) ?? {
              promptTokens: 0, genTokens: 0, prefillMs: 0, genMs: 0, cancelled: false, error: 'respuesta ilegible del motor',
            };
          } catch (e) {
            raw = { promptTokens: 0, genTokens: 0, prefillMs: 0, genMs: 0, cancelled: false, error: String(e) };
          }
          const mem = parseMemoryInfo(readMemoryInfo());
          store().setInProgress(null);
          if (stopRequested && raw.cancelled) break; // la prueba cortada por el usuario no se registra

          const result = toResult(c, raw, { loadMs, mem });
          store().addResult(result);
          done++;
          store().pushLog(
            result.ok
              ? `${what}: TTFT ${Math.round(result.ttftMs)} ms · prefill ${result.prefillTokPerSec.toFixed(1)} · gen ${result.genTokPerSec.toFixed(1)} tok/s`
              : `${what}: falló (${result.error ?? 'sin datos'})`,
          );
          if (!stopRequested) await sleep(COOLDOWN_MS);
        }
      } finally {
        currentHandle = null;
        await unloadModel(handle).catch(() => {});
      }
    }
    store().pushLog(stopRequested ? 'Detenida por el usuario' : 'Terminada');
  } finally {
    keepScreenOn(false);
    store().setInProgress(null);
    store().setProgress(null);
    store().setRunning(false);
  }
}
