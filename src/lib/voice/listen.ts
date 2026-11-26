/** Escucha con el micrófono y devuelve lo dicho en español (whisper.cpp, sin conexión). */
import { listenOnce, requestMicrophonePermission, stopListening } from '@pyrohorns/llama';
import { voiceModelPath } from './model';

/** Tiempo máximo de una frase, y silencio que la cierra. */
const MAX_SECONDS = 20;
const SILENCE_SECONDS = 1.2;
const THREADS = 4;

export async function listen(): Promise<string> {
  if (!(await requestMicrophonePermission())) {
    throw new Error('Sin permiso de micrófono: concédelo en Ajustes del teléfono.');
  }
  return listenOnce(voiceModelPath(), THREADS, MAX_SECONDS, SILENCE_SECONDS);
}

/** Termina la escucha actual: lo dicho hasta ahora se transcribe. */
export const stopMic = () => stopListening();
