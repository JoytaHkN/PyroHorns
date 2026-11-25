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

export function readCpuInfo(): string | null {
  return null;
}

export function readDeviceStatus(): string | null {
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
  _messages: { role: string; content: string }[],
  _threads: number,
  _noThink: boolean,
  _onEvent: (event: LlamaNativeEvent) => void
): Promise<void> {
  throw new Error('El motor nativo solo está disponible en Android');
}

export async function warm(): Promise<void> {}

export async function complete(): Promise<string> {
  return '';
}

const onlyAndroid = (): never => {
  throw new Error('Solo disponible en Android');
};

export async function requestCalendarPermission(): Promise<boolean> {
  return false;
}

export async function addEvent(_title: string, _startMs: number, _endMs: number): Promise<string> {
  return onlyAndroid();
}

export async function deleteEvent(_id: string): Promise<void> {}

export async function setAlarm(_hour: number, _minute: number, _label: string): Promise<void> {
  onlyAndroid();
}

export async function setTimer(_seconds: number, _label: string): Promise<void> {
  onlyAndroid();
}

export async function cancel(): Promise<void> {}

export async function unloadModel(): Promise<void> {}
