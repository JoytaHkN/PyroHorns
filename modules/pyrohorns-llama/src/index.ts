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

/** Abre la pantalla del sistema donde se concede el acceso a todos los archivos. */
export function requestAllFilesAccess(): void {
  Native.requestAllFilesAccess();
}

export async function loadModel(path: string, contextTokens: number, threads: number): Promise<number> {
  return Native.loadModel(path, contextTokens, threads);
}

export async function generate(
  handle: number,
  prompt: string,
  threads: number,
  onEvent: (event: LlamaNativeEvent) => void
): Promise<void> {
  ensureSubscription();
  listeners.add(onEvent);
  try {
    await Native.generate(handle, prompt, threads);
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
