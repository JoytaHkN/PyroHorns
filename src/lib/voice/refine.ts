/**
 * Corrección del dictado (P26-A3, opción 1b): primero con el vocabulario (palabras casi iguales a un contacto o a una
 * orden) y, si el modelo del teléfono ya está cargado, con una reescritura cuidada. Nunca usa la nube.
 */
import { parseRoute } from '@/lib/assistant/intents';
import { log } from '@/lib/log';
import type { ProviderMessage } from '@/providers/types';

/** Completa con el modelo del teléfono; devuelve null si no hay un modelo listo. */
export type CompleteFn = (messages: ProviderMessage[], maxTokens: number) => Promise<string | null>;

export interface Refined {
  text: string;
  /** true si la corrección cambió algo: la app enseña entonces lo que se oyó («Oí: …»). */
  changed: boolean;
}

export interface RefineOptions {
  /** Órdenes y nombres para corregir palabra a palabra. */
  vocabulary: string[];
  /** Nombres de contactos que se le enseñan al modelo. */
  names: string[];
  /** El modelo del teléfono, si está cargado. */
  complete: CompleteFn | null;
}

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Distancia de Levenshtein (basta para palabras y frases cortas). */
export function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur: number[] = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
      cur[j] = Math.min((prev[j] ?? 0) + 1, (cur[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
    }
    prev = cur;
  }
  return prev[b.length] ?? 0;
}

/**
 * Cambia cada palabra que casi coincide con un término del vocabulario (una letra en palabras de 4 o 5, dos a partir de 6).
 * Si dos términos quedan igual de cerca, no cambia nada: no adivina.
 */
export function correctWords(text: string, vocabulary: string[]): string {
  const terms = new Map<string, string>(); // clave sin acentos → forma escrita
  for (const entry of vocabulary) {
    for (const word of entry.split(/\s+/)) if (fold(word).length >= 3) terms.set(fold(word), word);
  }
  return text.replace(/\p{L}+/gu, (word) => {
    const key = fold(word);
    if (key.length < 4 || terms.has(key)) return word;
    let best = '';
    let bestKey = '';
    let bestDist = Infinity;
    let tie = false;
    for (const [termKey, term] of terms) {
      const d = editDistance(key, termKey);
      if (d < bestDist) {
        bestDist = d;
        best = term;
        bestKey = termKey;
        tie = false;
      } else if (d === bestDist && termKey !== bestKey) {
        tie = true;
      }
    }
    const limit = key.length >= 6 ? 2 : 1;
    if (!best || bestDist > limit || tie) return word;
    const startsUpper = word.charAt(0) !== word.charAt(0).toLowerCase();
    return startsUpper ? best.charAt(0).toUpperCase() + best.slice(1) : best;
  });
}

/**
 * Acepta la reescritura del modelo solo si cambia palabras sueltas: mismas cifras, ni una palabra más ni menos que una,
 * y poca distancia con lo oído. Así no responde a la frase, no añade datos y no inventa números.
 */
export function acceptRefinement(original: string, candidate: string): string | null {
  const out = candidate.trim().replace(/^["'«“”]+|["'»“”]+$/g, '').trim();
  if (!out || /[\n`]/.test(out) || /^(texto|dictado|transcripci[oó]n|correcci[oó]n|salida|respuesta)\s*:/i.test(out)) return null;
  if (Math.abs(out.split(/\s+/).length - original.split(/\s+/).length) > 1) return null;
  if (out.replace(/\D/g, '') !== original.replace(/\D/g, '')) return null;
  const a = fold(original);
  const b = fold(out);
  return editDistance(a, b) <= Math.max(3, Math.round(a.length * 0.3)) ? out : null;
}

function refineMessages(text: string, names: string[]): ProviderMessage[] {
  const people = names.length ? `Contactos: ${names.join(', ')}.\n` : '';
  return [
    {
      role: 'system',
      content:
        'Corriges la transcripción de un reconocimiento de voz en español. Cambia solo las palabras que el sonido ha confundido, ' +
        'guiándote por el sentido de la frase y por los contactos. No añadas, quites ni cambies el orden de las palabras, ' +
        'no respondas a la frase y no añadas explicaciones. Devuelve solo la frase corregida; si ya está bien, devuélvela igual.',
    },
    { role: 'user', content: `${people}Transcripción: ${text}` },
  ];
}

/**
 * Corrige el dictado. Con tres palabras o más, si la planilla no lo entiende ya (entonces basta con el vocabulario)
 * y hay un modelo del teléfono cargado, lo reescribe el modelo. Si algo falla, queda lo corregido por el vocabulario.
 */
export async function refineTranscript(text: string, opts: RefineOptions): Promise<Refined> {
  const corrected = correctWords(text, opts.vocabulary);
  let out = corrected;
  const words = corrected.split(/\s+/).length;
  if (opts.complete && words >= 3 && !parseRoute(corrected, new Date())) {
    try {
      const reply = await opts.complete(refineMessages(corrected, opts.names), Math.min(96, Math.max(16, words * 4)));
      const accepted = reply === null ? null : acceptRefinement(corrected, reply);
      if (accepted) out = accepted;
    } catch {
      log.warn('voice.refine_failed'); // sin el texto del dictado en el registro (S9)
    }
  }
  return { text: out, changed: out !== text };
}
