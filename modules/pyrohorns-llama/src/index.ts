import type { EventSubscription } from 'expo-modules-core';
import Native from './PyroHornsLlama';
import type { LlamaNativeEvent } from './PyroHornsLlama';

const listeners = new Set<(event: LlamaNativeEvent) => void>();
let subscription: EventSubscription | null = null;

function ensureSubscription() {
  if (subscription === null) subscription = Native.addListener('onEvent', (event) => listeners.forEach((cb) => cb(event)));
}

export async function isLlamaNativeAvailable(): Promise<boolean> {
  try {
    return await Native.isAvailable();
  } catch {
    return false;
  }
}

/** ¿Tiene la app «Acceso a todos los archivos»? (Android 11+; antes siempre true). */
export function hasAllFilesAccess(): boolean {
  try {
    return Native.hasAllFilesAccess();
  } catch {
    return false;
  }
}

/** Tamaño en bytes de un archivo legible, o -1 si no existe o no se puede leer. */
export function fileSize(path: string): number {
  try {
    return Native.fileSize(path);
  } catch {
    return -1;
  }
}

/** Rastros del motor y motivos de cierre (JSON), o null si el módulo no está. */
export function readDiagnostics(): string | null {
  try {
    return Native.diagnostics();
  } catch {
    return null;
  }
}

export function clearDiagnostics(): void {
  try {
    Native.clearDiagnostics();
  } catch {}
}

/** Abre la pantalla del sistema donde se concede el acceso a todos los archivos. */
export function requestAllFilesAccess(): void {
  Native.requestAllFilesAccess();
}

export async function loadModel(path: string, contextTokens: number, threads: number, useMmap = true): Promise<number> {
  return Native.loadModel(path, contextTokens, threads, useMmap);
}

/** Prueba de rendimiento (P13): JSON con los tiempos de prefill y generación. */
export async function benchRun(handle: number, nPrompt: number, nGen: number, threads: number): Promise<string> {
  return Native.bench(handle, nPrompt, nGen, threads);
}

/** Memoria del proceso y del sistema (JSON), o null si no está disponible. */
export function readMemoryInfo(): string | null {
  try {
    return Native.memoryInfo();
  } catch {
    return null;
  }
}

/** Instrucciones y frecuencias de la CPU (JSON), o null si no está disponible. */
export function readCpuInfo(): string | null {
  try {
    return Native.cpuInfo();
  } catch {
    return null;
  }
}

/** Batería, temperatura, estado térmico y ahorro de energía (JSON), o null si no está disponible. */
export function readDeviceStatus(): string | null {
  try {
    return Native.deviceStatus();
  } catch {
    return null;
  }
}

/** Reinicia el pico de RAM del proceso; false si el sistema no lo permite. */
export function resetPeakMemory(): boolean {
  try {
    return Native.resetPeakMemory();
  } catch {
    return false;
  }
}

/** Mantiene la pantalla encendida mientras dura una prueba larga. */
export function keepScreenOn(on: boolean): void {
  try {
    Native.keepScreenOn(on);
  } catch {}
}

export async function generate(
  handle: number,
  prompt: string,
  threads: number,
  noThink: boolean,
  onEvent: (event: LlamaNativeEvent) => void
): Promise<void> {
  ensureSubscription();
  listeners.add(onEvent);
  try {
    await Native.generate(handle, prompt, threads, noThink);
  } finally {
    listeners.delete(onEvent);
  }
}

export async function cancel(handle: number): Promise<void> {
  await Native.cancel(handle);
}

export async function unloadModel(handle: number): Promise<void> {
  await Native.unloadModel(handle);
}
