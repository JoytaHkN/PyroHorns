/**
 * Plantillas de frases con la sintaxis de Home Assistant (Hassil; ver OHF-Voice/intents, CC-BY-4.0):
 *   [texto]      parte opcional
 *   (a|b)        una de las alternativas
 *   {nombre}     lo que diga el usuario en ese hueco (una ranura)
 *   <regla>      una regla con nombre (ver rules.ts) o un patrón fijo
 *   palabra[s]   letra opcional (igual que [s])
 * Las frases se comparan sin tildes ni mayúsculas, y la puntuación cuenta como separación.
 * Se evita el signo «?» como cuantificador: para opcional, usar [ ].
 */

export type Rules = Record<string, string[]>;
export type Raw = Record<string, string>;

const HAS_INDICES = (() => {
  try {
    return new RegExp('a', 'd').hasIndices === true;
  } catch {
    return false;
  }
})();

const PUNCT = /[¿?¡!.,;:]/;

/** Un carácter sin tildes ni mayúsculas. La puntuación pasa a espacio. Siempre devuelve un solo carácter:
 *  así las posiciones del texto normalizado coinciden con las del original. */
function foldChar(c: string): string {
  if (PUNCT.test(c)) return ' ';
  const base = c.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  if (base.length === 1) return base;
  const lower = c.toLowerCase();
  return lower.length === 1 ? lower : c;
}

export const foldText = (s: string): string => s.split('').map(foldChar).join('');

type Node =
  | { t: 'lit'; c: string }
  | { t: 'space' }
  | { t: 'opt'; seq: Node[] }
  | { t: 'alt'; alts: Node[][] }
  | { t: 'slot'; name: string }
  | { t: 'rule'; name: string };

function parseTemplate(src: string): Node[] {
  let i = 0;
  const seq = (closer: ']' | ')' | null): Node[] => {
    const out: Node[] = [];
    while (i < src.length) {
      const c = src[i]!;
      if (closer !== null && c === closer) break;
      if (closer === ')' && c === '|') break;
      if (c === '[') {
        i++;
        const inner = seq(']');
        i++; // «]»
        out.push({ t: 'opt', seq: inner });
        continue;
      }
      if (c === '(') {
        i++;
        const alts: Node[][] = [];
        for (;;) {
          alts.push(seq(')'));
          if (src[i] === '|') {
            i++;
            continue;
          }
          break;
        }
        i++; // «)»
        out.push({ t: 'alt', alts });
        continue;
      }
      if (c === '{') {
        const end = src.indexOf('}', i);
        if (end < 0) throw new Error('Plantilla sin cerrar «}»');
        out.push({ t: 'slot', name: src.slice(i + 1, end).split(':').pop()!.trim() });
        i = end + 1;
        continue;
      }
      if (c === '<') {
        const end = src.indexOf('>', i);
        if (end < 0) throw new Error('Plantilla sin cerrar «>»');
        out.push({ t: 'rule', name: src.slice(i + 1, end).trim() });
        i = end + 1;
        continue;
      }
      if (/\s/.test(c)) {
        i++;
        if (out.length === 0 || out[out.length - 1]!.t !== 'space') out.push({ t: 'space' });
        continue;
      }
      out.push({ t: 'lit', c });
      i++;
    }
    return out;
  };
  const nodes = seq(null);
  if (i < src.length) throw new Error('Plantilla mal formada');
  return nodes;
}

const escapeRe = (c: string) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface Ctx {
  rules: Rules;
  raw: Raw;
  slots: string[];
}

function emit(nodes: Node[], ctx: Ctx): string {
  let out = '';
  for (const n of nodes) {
    switch (n.t) {
      case 'lit':
        out += escapeRe(n.c);
        break;
      case 'space':
        out += '\\s+';
        break;
      case 'opt':
        out += `(?:${emit(n.seq, ctx)})?`;
        break;
      case 'alt':
        out += `(?:${n.alts.map((a) => emit(a, ctx)).join('|')})`;
        break;
      case 'slot':
        ctx.slots.push(n.name);
        out += '(.+?)';
        break;
      case 'rule': {
        const raw = ctx.raw[n.name];
        if (raw !== undefined) {
          out += `(?:${raw})`;
          break;
        }
        const alts = ctx.rules[n.name];
        if (!alts) throw new Error(`Regla desconocida: <${n.name}>`);
        out += `(?:${alts.map((a) => emit(parseTemplate(foldText(a)), ctx)).join('|')})`;
        break;
      }
    }
  }
  return out;
}

const compiled = new Map<string, { re: RegExp; slots: string[] }>();

/** Compila una plantilla una sola vez (las reglas y los patrones fijos son constantes del módulo). */
export function compileTemplate(template: string, rules: Rules, raw: Raw): { re: RegExp; slots: string[] } {
  const hit = compiled.get(template);
  if (hit) return hit;
  const ctx: Ctx = { rules, raw, slots: [] };
  const body = emit(parseTemplate(foldText(template)), ctx);
  const entry = { re: new RegExp(`^\\s*${body}\\s*$`, HAS_INDICES ? 'd' : ''), slots: ctx.slots };
  compiled.set(template, entry);
  return entry;
}

/** Ranuras de la frase (texto original, con tildes), o null si la frase no encaja con la plantilla. */
export function matchTemplate(template: string, input: string, rules: Rules, raw: Raw): Record<string, string> | null {
  const { re, slots } = compileTemplate(template, rules, raw);
  const norm = foldText(input);
  const m = re.exec(norm);
  if (!m) return null;
  const indices = (m as unknown as { indices?: [number, number][] }).indices;
  const out: Record<string, string> = {};
  let cursor = 0;
  slots.forEach((name, k) => {
    const value = m[k + 1];
    if (value === undefined) return;
    const start = indices && indices[k + 1] ? indices[k + 1]![0] : norm.indexOf(value, cursor);
    const end = start + value.length;
    cursor = end;
    if (out[name] === undefined) out[name] = input.slice(start, end).replace(/\s+/g, ' ').trim();
  });
  return out;
}
