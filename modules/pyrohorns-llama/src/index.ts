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
