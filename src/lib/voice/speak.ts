/** Voz de salida con la voz del sistema (expo-speech). No descarga nada y no necesita conexión. */
import * as Speech from 'expo-speech';
import { toSpeech } from './text';

export function speakText(text: string): void {
  const clean = toSpeech(text);
  if (!clean) return;
  Speech.stop();
  Speech.speak(clean, { language: 'es', rate: 1 });
}

/** ¿Hay una voz en español instalada en el teléfono? */
export async function spanishVoiceAvailable(): Promise<boolean> {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    return voices.some((v) => (v.language ?? '').toLowerCase().startsWith('es'));
  } catch {
    return false;
  }
}
