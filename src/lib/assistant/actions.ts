/**
 * Asistente (P20, punto 1; aprobado por el usuario el 2026-11-25): notas, tareas, eventos, alarmas y temporizadores.
 * El modelo solo recibe las instrucciones cuando el mensaje pide algo de esto, y solo entonces se ejecutan sus bloques.
 */

export type Action =
  | { type: 'note'; text: string }
  | { type: 'task'; text: string; due?: number }
  | { type: 'complete'; text: string }
  | { type: 'list'; what: 'tasks' | 'notes' }
  | { type: 'event'; title: string; start: number; minutes: number; guest?: string }
  | { type: 'call'; name: string; channel: 'phone' | 'whatsapp' }
  | { type: 'email'; name: string }
  | { type: 'alarm'; hour: number; minute: number; label: string }
  | { type: 'timer'; seconds: number; label: string };

const INTENT =
  /(an[oó]ta|ap[uú]nta|recu[eé]rda|recordatorio|ag[eé]nda|calendario|\bevento\b|reuni[oó]n|\bcita\b|\b\w?larma|despi[eé]rta|temporizador|av[ií]same|\btareas?\b|\bpendientes?\b|\bnotas?\b)/i;

export const wantsAction = (text: string) => INTENT.test(text);

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const pad = (n: number) => String(n).padStart(2, '0');
const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayLabel = (d: Date) => `${DAYS[d.getDay()]} ${isoDay(d)}`;

/** Instrucciones que acompañan al mensaje. Llevan la fecha para que «mañana» o «el viernes» tengan sentido. */
export function assistContext(now: Date): string {
  const day = (n: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + n);
  return [
    `[Asistente] Hoy es ${dayLabel(now)} y son las ${pad(now.getHours())}:${pad(now.getMinutes())}. Mañana es ${dayLabel(day(1))}. ` +
      `Después: ${[2, 3, 4, 5, 6, 7].map((n) => dayLabel(day(n))).join(', ')}.`,
    'Si el mensaje pide hacer algo, contesta con una frase corta y un bloque por cada acción, así:',
    '```accion\ntipo: evento\ntitulo: Dentista\ninicio: AAAA-MM-DD HH:MM\nduracion: 60\n```',
    'Tipos: nota (texto) · tarea (texto; fecha opcional AAAA-MM-DD HH:MM) · completar (texto de la tarea) · listar (que: tareas o notas) · ' +
      'evento (titulo, inicio, duracion en minutos) · alarma (hora: HH:MM, etiqueta) · temporizador (minutos, etiqueta).',
    'Si falta un dato necesario, pregúntalo y no pongas bloque.',
    'No sabes qué tareas, notas, eventos ni alarmas ya tiene el usuario: si pregunta por ellos, dile que todavía no puedes consultarlos y no inventes.',
    'Nunca digas que llamaste, buscaste, agendaste o pusiste algo si no escribiste el bloque de acción: sin bloque, la app no hizo nada.',
  ].join('\n');
}

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/** «AAAA-MM-DD HH:MM» en hora local; null si la fecha no existe. */
function parseDate(value: string | undefined, defaultHour = 9): number | null {
  const m = value?.match(/(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T]+(\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  const [y, mo, d, h, mi] = [m[1], m[2], m[3], m[4] ?? String(defaultHour), m[5] ?? '0'].map(Number) as [number, number, number, number, number];
  const date = new Date(y, mo - 1, d, h, mi);
  return date.getMonth() === mo - 1 && date.getDate() === d && h < 24 && mi < 60 ? date.getTime() : null;
}

function fields(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  const trimmed = body.trim();
  if (trimmed.startsWith('{')) {
    try {
      for (const [k, v] of Object.entries(JSON.parse(trimmed) as Record<string, unknown>)) out[fold(k)] = String(v);
      return out;
    } catch {
      return {};
    }
  }
  for (const line of trimmed.split('\n')) {
    const m = line.match(/^\s*[-*]?\s*([\p{L}_]+)\s*:\s*(.*?)\s*$/u);
    if (m) out[fold(m[1]!)] = m[2]!.replace(/^["']|["',]+$/g, '');
    // Un modelo pequeño pone el tipo como primera línea sin «tipo:» (p. ej. «alarma»).
    else if (!Object.keys(out).length && line.trim()) out.tipo = fold(line.replace(/[*`]/g, '').trim());
  }
  return out;
}

function toAction(f: Record<string, string>): Action | null {
  const type = fold(f.tipo ?? f.type ?? '');
  const text = (f.texto ?? f.titulo ?? f.title ?? f.text ?? '').slice(0, 500).trim();
  const label = (f.etiqueta ?? f.texto ?? f.titulo ?? '').slice(0, 80).trim();
  switch (type) {
    case 'nota':
      return text ? { type: 'note', text } : null;
    case 'tarea': {
      const due = parseDate(f.fecha ?? f.inicio);
      return text ? { type: 'task', text, ...(due ? { due } : {}) } : null;
    }
    case 'completar':
      return text ? { type: 'complete', text } : null;
    case 'listar':
      return { type: 'list', what: fold(f.que ?? '').startsWith('nota') ? 'notes' : 'tasks' };
    case 'evento': {
      const start = parseDate(f.inicio ?? f.fecha);
      const minutes = parseInt(f.duracion ?? '60', 10);
      return text && start ? { type: 'event', title: text, start, minutes: minutes > 0 && minutes <= 1440 ? minutes : 60 } : null;
    }
    case 'alarma': {
      const m = (f.hora ?? '').match(/^(\d{1,2})[:.h](\d{2})/);
      const hour = Number(m?.[1]);
      const minute = Number(m?.[2]);
      return m && hour < 24 && minute < 60 ? { type: 'alarm', hour, minute, label } : null;
    }
    case 'temporizador': {
      const seconds = Math.round(parseFloat((f.minutos ?? '').replace(',', '.')) * 60);
      return seconds > 0 && seconds <= 86400 ? { type: 'timer', seconds, label } : null;
    }
    default:
      return null;
  }
}

const TYPE_WORDS = ['nota', 'tarea', 'completar', 'listar', 'evento', 'alarma', 'temporizador'];
/** Bloque con cualquier etiqueta: ```accion, ```nota… (los modelos pequeños no siempre usan «accion»). */
const FENCE = /```([\w-]*)[ \t]*\n([\s\S]*?)(```|$)/g;
/** Acción sin ``` : una palabra de tipo en su línea seguida de líneas «clave: valor» (Nemotron Nano lo hace así). */
const BARE = /(^|\n)[ \t]*(nota|tarea|completar|listar|evento|alarma|temporizador)[ \t]*\n((?:[ \t]*[-*]?[ \t]*[\p{L}_]+[ \t]*:[^\n]*(?:\n|$))+)/giu;
const MAX_ACTIONS = 5;

/**
 * Separa las acciones del texto. Un bloque sin cerrar (aún llegando) se oculta y no se ejecuta.
 * Repetidas idénticas cuentan una vez. `invalid` cuenta bloques de acción que no se entendieron.
 */
export function extractActions(content: string): { text: string; actions: Action[]; invalid: number } {
  const actions: Action[] = [];
  let invalid = 0;
  const push = (action: Action) => {
    const key = JSON.stringify(action);
    if (actions.length < MAX_ACTIONS && !actions.some((a) => JSON.stringify(a) === key)) actions.push(action);
  };
  let text = content.replace(FENCE, (all, lang: string, body: string, closed: string) => {
    const l = fold(lang);
    const isAction = l === 'accion' || l === 'action' || TYPE_WORDS.includes(l) || /^\s*tipo\s*:/im.test(body);
    if (!isAction) return all; // código normal: se queda como está
    if (!closed) return ''; // aún llegando
    const f = fields(body);
    if (TYPE_WORDS.includes(l) && !f.tipo) f.tipo = l;
    const action = toAction(f);
    if (action) push(action);
    else invalid++;
    return '';
  });
  text = text.replace(BARE, (all, lead: string, type: string, body: string) => {
    const f = fields(`tipo: ${type}\n${body}`);
    const action = toAction(f);
    if (!action) return all; // no es una acción: texto normal
    push(action);
    return lead;
  });
  return { text: text.trim(), actions, invalid };
}

export function when(ms: number): string {
  const d = new Date(ms);
  return `${dayLabel(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function describeAction(a: Action): string {
  switch (a.type) {
    case 'note':
      return `Nota: ${a.text}`;
    case 'call':
      return `Llamar a ${a.name}${a.channel === 'whatsapp' ? ' por WhatsApp' : ''}`;
    case 'email':
      return `Correo de ${a.name}`;
    case 'task':
      return `Tarea: ${a.text}${a.due ? ` · ${when(a.due)}` : ''}`;
    case 'complete':
      return `Marcar como hecha: ${a.text}`;
    case 'list':
      return a.what === 'notes' ? 'Ver notas' : 'Ver tareas pendientes';
    case 'event':
      return `Evento: ${a.title} · ${when(a.start)} (${a.minutes} min)${a.guest ? ` · con ${a.guest}` : ''}`;
    case 'alarm':
      return `Alarma ${pad(a.hour)}:${pad(a.minute)}${a.label ? ` · ${a.label}` : ''}`;
    case 'timer':
      return `Temporizador de ${a.seconds >= 60 ? `${Math.round(a.seconds / 60)} min` : `${a.seconds} s`}${a.label ? ` · ${a.label}` : ''}`;
  }
}
