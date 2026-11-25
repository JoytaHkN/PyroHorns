/**
 * Respuestas que se pueden tocar. El modelo debe poner un bloque ```opciones; como los modelos pequeños no siempre lo
 * hacen, también se reconoce una pregunta acompañada de una lista corta al final.
 */
export interface Options {
  /** El texto sin el bloque de opciones. */
  text: string;
  options: string[];
}

const MAX_OPTIONS = 6;
const MAX_LENGTH = 90;
const BULLET = /^\s*(?:[-*•]|\d{1,2}[.)]|[a-f]\))\s+/i;

const clean = (line: string) =>
  line
    .replace(BULLET, '')
    .replace(/\*\*|`/g, '')
    .trim();

export function extractOptions(content: string): Options {
  const block = content.match(/```(?:opciones|options)[ \t]*\n([\s\S]*?)(?:```|$)/i);
  if (block) {
    const options = block[1]!.split('\n').map(clean).filter(Boolean).slice(0, MAX_OPTIONS);
    return { text: content.replace(block[0], '').trim(), options };
  }
  // Lista final: «¿pregunta? + lista» o «lista + ¿pregunta?».
  const lines = content.trimEnd().split('\n');
  let end = lines.length;
  const closing = end > 0 && !BULLET.test(lines[end - 1]!) && lines[end - 1]!.includes('?');
  if (closing) end--;
  while (end > 0 && !lines[end - 1]!.trim()) end--;
  let start = end;
  while (start > 0 && BULLET.test(lines[start - 1]!)) start--;
  const options = lines.slice(start, end).map(clean);
  const before = lines.slice(0, start).filter((l) => l.trim());
  const asked = closing || /[?]\s*:?\s*\**\s*$|\b(elige|cuál prefieres|qué prefieres)\b/i.test(before[before.length - 1] ?? '');
  if (!asked || options.length < 2 || options.length > MAX_OPTIONS || options.some((o) => !o || o.length > MAX_LENGTH)) {
    return { text: content, options: [] };
  }
  return { text: content, options };
}
