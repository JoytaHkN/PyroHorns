/** Escucha con el micrófono y devuelve lo dicho en español (whisper.cpp, sin conexión). */
import { contactNames, listenOnce, requestMicrophonePermission, stopListening } from '@pyrohorns/llama';
import { voiceModelPath } from './model';
import { whisperPrompt } from './vocabulary';

/** Tiempo máximo de una frase (límite del búfer nativo) y silencio que la cierra (P26-B). */
const MAX_SECONDS = 30;
const SILENCE_SECONDS = 2.5;
const THREADS = 4;
/** Contactos que se enseñan a whisper y a la corrección. */
const CONTACTS = 25;

export interface Heard {
  /** Transcripción tal como la devolvió whisper. */
  raw: string;
  /** Nombres de contactos usados como vocabulario. */
  names: string[];
}

export async function listen(): Promise<Heard> {
  if (!(await requestMicrophonePermission())) {
    throw new Error('Sin permiso de micrófono: concédelo en Ajustes del teléfono.');
  }
  const names = await contactNames(CONTACTS).catch(() => [] as string[]);
  const raw = await listenOnce(voiceModelPath(), THREADS, MAX_SECONDS, SILENCE_SECONDS, whisperPrompt(names));
  return { raw, names };
}

/** Termina la escucha actual: lo dicho hasta ahora se transcribe. */
export const stopMic = () => stopListening();
