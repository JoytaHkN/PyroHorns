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
  messages: { role: string; content: string }[],
  threads: number,
  noThink: boolean,
  onEvent: (event: LlamaNativeEvent) => void
): Promise<void> {
  ensureSubscription();
  listeners.add(onEvent);
  try {
    await Native.generate(
      handle,
      messages.map((m) => m.role),
      messages.map((m) => m.content),
      threads,
      noThink
    );
  } finally {
    listeners.delete(onEvent);
  }
}

/** Procesa la instrucción por adelantado, antes del primer mensaje. */
export async function warm(handle: number, messages: { role: string; content: string }[], threads: number): Promise<void> {
  await Native.warm(
    handle,
    messages.map((m) => m.role),
    messages.map((m) => m.content),
    threads
  );
}

/** Texto corto aparte de la conversación; no altera su memoria. */
export async function complete(
  handle: number,
  messages: { role: string; content: string }[],
  threads: number,
  noThink: boolean,
  maxTokens: number
): Promise<string> {
  return Native.complete(
    handle,
    messages.map((m) => m.role),
    messages.map((m) => m.content),
    threads,
    noThink,
    maxTokens
  );
}

/** Voz (P25): micrófono y dictado con whisper.cpp. */
export async function requestMicrophonePermission(): Promise<boolean> {
  return (await Native.requestMicrophonePermission()).granted;
}

/**
 * Escucha hasta el silencio, hasta que se pulse parar o hasta maxSeconds; devuelve lo dicho en español.
 * `prompt` es el vocabulario que se enseña a whisper (órdenes y contactos).
 */
export async function listenOnce(
  modelPath: string,
  threads: number,
  maxSeconds: number,
  silenceSeconds: number,
  prompt: string,
): Promise<string> {
  return Native.listenOnce(modelPath, threads, maxSeconds, silenceSeconds, prompt);
}

/** Nombres de los contactos más usados (vacío sin permiso de contactos). */
export async function contactNames(limit: number): Promise<string[]> {
  return Native.contactNames(limit);
}

/** Abre la app Calendario en el día indicado (solo lectura). */
export async function openCalendarAt(millis: number): Promise<void> {
  await Native.openCalendarAt(millis);
}

export async function stopListening(): Promise<void> {
  await Native.stopListening();
}

/** SHA-256 de un archivo en hexadecimal (para verificar la descarga del modelo). */
export async function fileSha256(path: string): Promise<string> {
  return Native.fileSha256(path);
}

/** Asistente: contactos, marcador y WhatsApp. */
export async function requestContactsPermission(): Promise<boolean> {
  return (await Native.requestContactsPermission()).granted;
}

/** Contactos (JSON): [{ name, phones, emails }]. */
export async function searchContacts(name: string): Promise<string> {
  return Native.searchContacts(name);
}

export async function dialNumber(number: string): Promise<void> {
  await Native.dialNumber(number);
}

export async function openWhatsApp(number: string): Promise<void> {
  await Native.openWhatsApp(number);
}

/** Asistente: calendario y reloj de Android. */
export async function requestCalendarPermission(): Promise<boolean> {
  return (await Native.requestCalendarPermission()).granted;
}

export async function addEvent(title: string, startMs: number, endMs: number): Promise<string> {
  return Native.addEvent(title, startMs, endMs);
}

export async function deleteEvent(id: string): Promise<void> {
  await Native.deleteEvent(id);
}

export async function setAlarm(hour: number, minute: number, label: string): Promise<void> {
  await Native.setAlarm(hour, minute, label);
}

export async function setTimer(seconds: number, label: string): Promise<void> {
  await Native.setTimer(seconds, label);
}

export async function cancel(handle: number): Promise<void> {
  await Native.cancel(handle);
}

export async function unloadModel(handle: number): Promise<void> {
  await Native.unloadModel(handle);
}
