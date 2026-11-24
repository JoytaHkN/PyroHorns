import type { LlamaNativeEvent } from './PyroHornsLlama';

export async function isLlamaNativeAvailable(): Promise<boolean> {
  return false;
}

export function hasAllFilesAccess(): boolean {
  return false;
}

export function fileSize(_path: string): number {
  return -1;
}

export function readDiagnostics(): string | null {
  return null;
}

export function clearDiagnostics(): void {}

export function requestAllFilesAccess(): void {}

export async function benchRun(): Promise<string> {
  throw new Error('El motor nativo solo está disponible en Android');
}

export function readMemoryInfo(): string | null {
  return null;
}

export function resetPeakMemory(): boolean {
  return false;
}

export function keepScreenOn(_on: boolean): void {}

export async function loadModel(): Promise<number> {
  throw new Error('El motor nativo solo está disponible en Android');
}

export async function generate(
  _handle: number,
  _prompt: string,
  _threads: number,
  _noThink: boolean,
  _onEvent: (event: LlamaNativeEvent) => void
): Promise<void> {
  throw new Error('El motor nativo solo está disponible en Android');
}

export async function cancel(): Promise<void> {}

export async function unloadModel(): Promise<void> {}
