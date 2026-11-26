/** Ayudas para leer las ranuras: horas, fechas, duraciones, nombres y etiquetas. */
import { foldText } from './template';
import { RAW } from './rules';

const NUMBER_WORDS: Record<string, number> = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  once: 11, doce: 12, quince: 15, veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, media: 0.5, medio: 0.5,
};

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const WEEK: [RegExp, number][] = [
  [/\bdomingo\b/i, 0],
  [/\blunes\b/i, 1],
  [/\bmartes\b/i, 2],
  [/\bmi[eé]rcoles\b/i, 3],
  [/\bjueves\b/i, 4],
  [/\bviernes\b/i, 5],
  [/\bs[aá]bado\b/i, 6],
];

const pad = (n: number) => String(n).padStart(2, '0');

export const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const dayLabel = (d: Date) =>
  `${DAYS[d.getDay()]} ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** «3», «tres», «media» → número. */
export function numberOf(word: string): number | null {
  const f = foldText(word).trim();
  if (/^\d+(?:[.,]\d+)?$/.test(f)) return parseFloat(f.replace(',', '.'));
  return NUMBER_WORDS[f] ?? null;
}

/** «2 minutos», «media hora», «30 segundos» → segundos (entre 1 s y 24 h). */
export function durationSeconds(text: string): number | null {
  const m = foldText(text).match(new RegExp(`(${RAW.nb})\\s*(${RAW.unidad})\\b`));
  if (!m) return null;
  const n = numberOf(m[1]!);
  if (n === null) return null;
  const unit = m[2]!;
  const factor = unit.startsWith('s') ? 1 : unit.startsWith('h') ? 3600 : 60;
  const seconds = Math.round(n * factor);
  return seconds > 0 && seconds <= 86400 ? seconds : null;
}

/** «a las 17:00», «a las 9 de la noche», «18:30» → hora y minuto; `rest` es el texto sin la hora. */
export function timeOf(s: string): { h: number; m: number; rest: string } | null {
  const a = s.match(/\b(?:a las|a la|las)\s+(\d{1,2})(?::(\d{2}))?\s*(?:h\b|hrs?\b|horas?\b)?(?:\s*de la\s+(ma[ñn]ana|tarde|noche))?/i);
  const b = a ?? s.match(/\b(\d{1,2}):(\d{2})(?:\s*(?:h|hrs)\b)?(?:\s*de la\s+(ma[ñn]ana|tarde|noche))?/i);
  if (!b) return null;
  let h = Number(b[1]);
  const m = Number(b[2] ?? 0);
  const period = foldText(b[3] ?? '');
  if ((period === 'tarde' || period === 'noche') && h < 12) h += 12;
  if (h > 23 || m > 59) return null;
  return { h, m, rest: s.replace(b[0], ' ') };
}

/** «mañana», «pasado mañana», «hoy» o el próximo día de la semana (desplazamiento en días). */
export function dayOf(s: string, now: Date): { offset: number; rest: string } {
  for (const [re, day] of WEEK) {
    const m = s.match(re);
    if (m) return { offset: (day - now.getDay() + 7) % 7 || 7, rest: s.replace(m[0], ' ') };
  }
  const pick = (re: RegExp, offset: number) => {
    const m = s.match(re);
    return m ? { offset, rest: s.replace(m[0], ' ') } : null;
  };
  return pick(/\bpasado\s+ma[ñn]ana\b/i, 2) ?? pick(/\bma[ñn]ana\b/i, 1) ?? pick(/\bhoy\b/i, 0) ?? { offset: 0, rest: s };
}

/** «que se llame X» o «para X» (si lo que sigue no es una hora). */
export function labelOf(s: string): string {
  const named = s.match(/\bque se llame\s+(.+)$/i)?.[1];
  if (named) return named.trim();
  const para = s.match(/\b(?:para|etiqueta|llamad[ao])\s+(.+)$/i)?.[1]?.trim() ?? '';
  return /^(las?|el)\s*\d/i.test(para) ? '' : para;
}

const TITLES = /^(?:(?:el|la|al|a la|a el)\s+)?(?:sgto\.?|sargento|sr\.?|sra\.?|se[ñn]or|se[ñn]ora|don|do[ñn]a|dr\.?|dra\.?|ing\.?|cabo|tte\.?|teniente|capit[aá]n|mi)\s+/i;

/** Quita tratamientos y artículos del nombre para buscarlo en los contactos. */
export function stripHonorifics(name: string): string {
  let out = name.trim();
  for (let i = 0; i < 4; i++) {
    const next = out.replace(/^(?:el|la|al|a la|a el)\s+/i, '').replace(TITLES, '');
    if (next === out) break;
    out = next;
  }
  return out.trim();
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const plainText = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/**
 * Una fecha dicha o escrita («17 de septiembre», «17 de septiembre de 2027», «17/09», «2027-09-17», «mañana», «el viernes»):
 * medianoche de ese día, o null si no hay fecha o no existe. Sin año, es el de este año.
 */
export function dateFromText(text: string, now: Date): Date | null {
  const f = plainText(text);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const exact = (y: number, m: number, d: number) => {
    const date = new Date(y, m, d);
    return date.getMonth() === m && date.getDate() === d ? date : null;
  };
  const iso = f.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) return exact(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const named = f.match(/\b(\d{1,2})\s+(?:de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+(?:de\s+)?(\d{4}))?\b/);
  if (named) {
    const month = MONTHS.indexOf(named[2] === 'setiembre' ? 'septiembre' : (named[2] ?? ''));
    return exact(named[3] ? Number(named[3]) : now.getFullYear(), month, Number(named[1]));
  }
  const numeric = f.match(/\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{4}|\d{2}))?\b/);
  if (numeric) {
    const y = numeric[3];
    const year = y ? (y.length === 2 ? 2000 + Number(y) : Number(y)) : now.getFullYear();
    return exact(year, Number(numeric[2]) - 1, Number(numeric[1]));
  }
  if (/\bpasado manana\b/.test(f)) return addDays(today, 2);
  if (/\bmanana\b/.test(f)) return addDays(today, 1);
  if (/\bhoy\b/.test(f)) return today;
  const week = WEEK.find(([re]) => re.test(f));
  return week ? addDays(today, (week[1] - now.getDay() + 7) % 7 || 7) : null;
}
