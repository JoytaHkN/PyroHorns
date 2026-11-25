/**
 * Planilla de intenciones del asistente (P24): lo que el usuario dice de todos los días, traducido a una acción de la app
 * sin depender del modelo. Frases como «llama», «agenda» o «correo de» tienen sinónimos y palabras de relleno.
 * Lo que no encaja vuelve al modelo. El prefijo «@comando» (menú del cuadro de texto) fuerza la intención.
 */
import type { Action } from './actions';

export type Route = { kind: 'action'; action: Action } | { kind: 'question'; text: string };

/** Comandos del menú «@» del cuadro de texto. */
export const COMMANDS: { id: string; hint: string }[] = [
  { id: 'llamar', hint: 'Llamar a un contacto (marcador)' },
  { id: 'whatsapp', hint: 'Abrir WhatsApp con un contacto' },
  { id: 'agendar', hint: 'Crear un evento en el calendario' },
  { id: 'correo', hint: 'Buscar el correo de un contacto' },
  { id: 'alarma', hint: 'Poner una alarma en el Reloj' },
  { id: 'temporizador', hint: 'Poner un temporizador' },
  { id: 'tarea', hint: 'Anotar una tarea' },
  { id: 'nota', hint: 'Tomar una nota' },
  { id: 'buscar', hint: 'Buscar en internet y responder' },
];

/** «@llamar Ana» → «llama a Ana». `web` indica que hay que buscar en internet. */
export function rewriteCommand(input: string): { text: string; web: boolean } {
  const m = input.trim().match(/^@(\w+)\s*([\s\S]*)$/);
  if (!m) return { text: input, web: false };
  const rest = m[2]!.trim();
  switch (m[1]!.toLowerCase()) {
    case 'llamar':
      return { text: `llama a ${rest}`, web: false };
    case 'whatsapp':
      return { text: `llama por whatsapp a ${rest}`, web: false };
    case 'agendar':
      return { text: `agenda ${rest}`, web: false };
    case 'correo':
      return { text: `correo de ${rest}`, web: false };
    case 'alarma':
      return { text: `pon una alarma ${rest}`, web: false };
    case 'temporizador':
      return { text: `temporizador de ${rest}`, web: false };
    case 'tarea':
      return { text: `anota la tarea ${rest}`, web: false };
    case 'nota':
      return { text: `anota ${rest}`, web: false };
    case 'buscar':
      return { text: rest, web: true };
    default:
      return { text: input, web: false };
  }
}

const act = (action: Action): Route => ({ kind: 'action', action });
const ask = (text: string): Route => ({ kind: 'question', text });

/** Palabras de relleno que no cambian la intención. */
const FILLER = /\b(ahora( mismo)?|ya|por favor|porfa|porfavor)\b/gi;

/** Tratamientos que no forman parte del nombre en la agenda de contactos. */
export function stripHonorifics(name: string): string {
  let out = name.trim();
  for (let i = 0; i < 4; i++) {
    const next = out
      .replace(/^(?:el|la|al|a la|a el)\s+/i, '')
      .replace(/^(?:sgto\.?|sargento|sr\.?|sra\.?|se[ñn]or|se[ñn]ora|don|do[ñn]a|dr\.?|dra\.?|ing\.?|cabo|tte\.?|teniente|capit[aá]n|mi)\s+/i, '');
    if (next === out) break;
    out = next;
  }
  return out.trim();
}

/** Hora «a las 17:00», «a las 9 de la noche», «18:30». Devuelve también el texto sin ella. */
function timeOf(s: string): { h: number; m: number; rest: string } | null {
  const a = s.match(/\b(?:a las|a la|las)\s+(\d{1,2})(?::(\d{2}))?\s*(?:h\b|hrs?\b|horas?\b)?(?:\s*de la\s+(ma[ñn]ana|tarde|noche))?/i);
  const b = a ?? s.match(/\b(\d{1,2}):(\d{2})(?:\s*(?:h|hrs)\b)?(?:\s*de la\s+(ma[ñn]ana|tarde|noche))?/i);
  if (!b) return null;
  let h = Number(b[1]);
  const m = Number(b[2] ?? 0);
  const period = (b[3] ?? '').toLowerCase().replace('ñ', 'n');
  if ((period === 'tarde' || period === 'noche') && h < 12) h += 12;
  if (h > 23 || m > 59) return null;
  return { h, m, rest: s.replace(b[0], ' ') };
}

const WEEK: [RegExp, number][] = [
  [/\bdomingo\b/i, 0],
  [/\blunes\b/i, 1],
  [/\bmartes\b/i, 2],
  [/\bmi[eé]rcoles\b/i, 3],
  [/\bjueves\b/i, 4],
  [/\bviernes\b/i, 5],
  [/\bs[aá]bado\b/i, 6],
];

/** «mañana», «pasado mañana», «hoy» o el próximo día de la semana. */
function dayOf(s: string, now: Date): { offset: number; rest: string } {
  const pick = (re: RegExp, offset: number) => {
    const m = s.match(re);
    return m ? { offset, rest: s.replace(m[0], ' ') } : null;
  };
  const weekday = WEEK.map(([re, day]) => {
    const m = s.match(re);
    return m ? { day, rest: s.replace(m[0], ' ') } : null;
  }).find(Boolean);
  if (weekday) {
    const offset = (weekday.day - now.getDay() + 7) % 7 || 7;
    return { offset, rest: weekday.rest };
  }
  return pick(/\bpasado\s+ma[ñn]ana\b/i, 2) ?? pick(/\bma[ñn]ana\b/i, 1) ?? pick(/\bhoy\b/i, 0) ?? { offset: 0, rest: s };
}

/** «con Ana», «que se llame X», «para X»: texto que da nombre o etiqueta. */
const labelOf = (s: string) => (s.match(/\bque se llame\s+(.+)$/i)?.[1] ?? s.match(/\b(?:para|etiqueta|llamad[ao])\s+(.+)$/i)?.[1] ?? '').trim();

/** Intención de una frase, o null si no es algo que la app haga (entonces decide el modelo). */
export function parseRoute(input: string, now: Date): Route | null {
  const clean = input.replace(FILLER, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return null;
  let m: RegExpMatchArray | null;

  if ((m = clean.match(/^(?:marca(?:r)?|completa(?:r)?)\s+(?:como\s+)?(?:hecha|hecho|completada|terminada)\s+(?:la\s+)?tarea\s+(?:de\s+)?(.+)$/i)))
    return act({ type: 'complete', text: m[1]!.trim() });
  if (/\b(qu[eé] tareas|mis tareas|tareas pendientes)\b/i.test(clean)) return act({ type: 'list', what: 'tasks' });
  if (/\b(mis notas|qu[eé] notas)\b/i.test(clean)) return act({ type: 'list', what: 'notes' });
  if ((m = clean.match(/^(?:anota|apunta|agrega|a[ñn]ade)\s+(?:la\s+|una\s+|un\s+)?tarea\s*:?\s*(?:de\s+)?(.+)$/i)))
    return act({ type: 'task', text: m[1]!.trim() });
  if ((m = clean.match(/^(?:anota|apunta|toma nota de|nota:?)\s+(.+)$/i))) return act({ type: 'note', text: m[1]!.trim() });

  if ((m = clean.match(/^(?:ll[aá]m(?:a|ar|e|ale|ales|ame)|marca(?:r)?|telefonea(?:r)?)\b\s*(.*)$/i))) {
    const whatsapp = /\b(whats\s?app|wasap|wa)\b/i.test(m[1]!);
    let rest = m[1]!
      .replace(/\bpor\s+(?:el\s+|mi\s+)?(?:celular|tel[eé]fono|llamada|whats\s?app|wasap|wa)\b/gi, ' ')
      .replace(/\b(whats\s?app|wasap)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^a\s+/i, '');
    const name = stripHonorifics(rest);
    if (!name) return ask(whatsapp ? '¿A quién quieres escribir por WhatsApp?' : '¿A quién quieres llamar?');
    return act({ type: 'call', name, channel: whatsapp ? 'whatsapp' : 'phone' });
  }

  if ((m = clean.match(/^(?:busca(?:r)?\s+|dame\s+|cu[aá]l es\s+|c[oó]mo es\s+)?(?:el\s+|mi\s+)?(?:correo|email|e-?mail|mail)(?:\s+electr[oó]nico)?\s+(?:de|del|a|para)\s+(.+)$/i)))
    return act({ type: 'email', name: stripHonorifics(m[1]!.trim()) });

  if ((m = clean.match(/^(?:agenda(?:r)?|ag[eé]ndame|pon(?:me)?\s+(?:en|una cita en)\s+(?:la\s+)?agenda)\s+(.+)$/i))) {
    const t = timeOf(m[1]!);
    if (!t) return ask('¿A qué hora?');
    const d = dayOf(t.rest, now);
    let rest = d.rest;
    let guest: string | undefined;
    const g = rest.match(/\bcon\s+(.+)$/i);
    if (g) {
      guest = stripHonorifics(g[1]!.trim().replace(/(\s+(el|la|al|a|de|del))+$/i, ''));
      rest = rest.slice(0, g.index).trim();
    }
    const title = rest.replace(/^(?:la|el|una|un|a)\s+/i, '').replace(/\s+/g, ' ').trim();
    if (!title) return ask('¿Qué quieres agendar?');
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d.offset, t.h, t.m).getTime();
    return act({ type: 'event', title, start, minutes: 60, ...(guest ? { guest } : {}) });
  }

  if (/\balarma\b/i.test(clean)) {
    const t = timeOf(clean);
    if (!t) return ask('¿A qué hora pongo la alarma?');
    return act({ type: 'alarm', hour: t.h, minute: t.m, label: labelOf(clean) });
  }

  if ((m = clean.match(/\btemporizador\b.*?(\d+(?:[.,]\d+)?)\s*(segundos?|s|minutos?|mins?|min|m)\b/i))) {
    const n = parseFloat(m[1]!.replace(',', '.'));
    const seconds = Math.round(n * (m[2]!.toLowerCase().startsWith('s') ? 1 : 60));
    if (seconds > 0 && seconds <= 86400) return act({ type: 'timer', seconds, label: labelOf(clean) });
  }
  return null;
}
