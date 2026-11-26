/** Texto listo para leer en voz alta: sin bloques de código, marcas de formato, citas ni enlaces. */
export function toSpeech(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`/g, '')
    .replace(/\*\*|__|[*_#>]/g, '')
    .replace(/\[(\d+)\]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 700);
}

/** Frases que whisper escribe cuando no hay voz (sobre todo al terminar de una música o un ruido). */
const SILENCE_PHRASES = [/^gracias por (ver|escuchar)\b/i, /^subt[ií]tulos?\b/i, /^suscr[ií]bete\b/i, /^thanks for watching\b/i];
/** Eco del vocabulario que se le pasa a whisper: a veces lo repite cuando no hay nada que oír. */
const PROMPT_ECHO = /^(dictado en espa[ñn]ol|[oó]rdenes:|contactos:)/i;

/**
 * Quita lo que no es habla (P26-A2): etiquetas («[Música]», «(risas)», «*suspiro*»), notas musicales y frases de silencio.
 * Devuelve '' si no queda nada que enviar; entonces el dictado no crea mensaje.
 */
export function cleanTranscript(raw: string): string {
  const text = raw
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\*[^*]*\*/g, ' ')
    .replace(/[♪♫♬♩]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!/\p{L}/u.test(text)) return '';
  if (PROMPT_ECHO.test(text) || SILENCE_PHRASES.some((re) => re.test(text))) return '';
  return text;
}
