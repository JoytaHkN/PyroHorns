import type { LlamaNativeEvent } from './PyroHornsLlama';

export async function isLlamaNativeAvailable(): Promise<boolean> {
  return false;
}

export async function loadModel(): Promise<number> {
  throw new Error('El motor nativo solo está disponible en Android');
}

export async function generate(
  _handle: number,
  _prompt: string,
  _threads: number,
  _onEvent: (event: LlamaNativeEvent) => void
): Promise<void> {
  throw new Error('El motor nativo solo está disponible en Android');
}

export async function cancel(): Promise<void> {}

export async function unloadModel(): Promise<void> {}
