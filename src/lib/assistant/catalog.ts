/**
 * Catálogo de intenciones (P24–P25). Criterio unificado:
 *  - Si existe una intención equivalente en OHF-Voice/intents (Home Assistant), usa su nombre (HassStartTimer…) y
 *    sus frases. Esas plantillas se adaptaron al español y tienen licencia CC-BY-4.0 (ver THIRD_PARTY_NOTICES).
 *  - Si no existe, el nombre empieza por «Pyro» (PyroCall, PyroEmail…) y las frases siguen la misma sintaxis.
 * Cada plantilla devuelve sus ranuras; el constructor decide la acción, o pide un dato que falta.
 */
import type { Action } from './actions';
import { foldText } from './template';
import { dayLabel, durationSeconds, dayOf, hhmm, labelOf, stripHonorifics, timeOf } from './slots';

export type Route =
  | { kind: 'action'; action: Action }
  | { kind: 'question'; text: string }
  | { kind: 'answer'; text: string };

type Slots = Record<string, string>;

export interface Intent {
  name: string;
  source: 'home-assistant' | 'pyrohorns';
  templates: string[];
  build: (s: Slots, now: Date) => Route | null;
}

const act = (action: Action): Route => ({ kind: 'action', action });
const ask = (text: string): Route => ({ kind: 'question', text });
const answer = (text: string): Route => ({ kind: 'answer', text });
const NO_TIMERS = 'No llevo el control de los temporizadores. Míralos o cancélalos en la app Reloj.';

/** Calendario: «reunión con Ana el viernes a las 10» → evento con invitado. */
function calendarRoute(resto: string, now: Date): Route {
  const t = timeOf(resto);
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

/** Llamada: el nombre sin tratamientos y el canal (teléfono o WhatsApp). */
function callRoute(s: Slots): Route {
  const name = stripHonorifics(s.nombre ?? '');
  if (!name || /^por\b/i.test(name)) return ask('¿A quién quieres llamar?');
  const canal = foldText(s.canal ?? '');
  return act({ type: 'call', name, channel: /whats|wasap|^wa$/.test(canal) ? 'whatsapp' : 'phone' });
}

export const CATALOG: Intent[] = [
  // Temporizadores (Home Assistant: HassCancelTimer, HassTimerStatus)
  {
    name: 'HassCancelTimer',
    source: 'home-assistant',
    templates: ['<cancelar> [(el|un|mi|mis|los|todos los) ]temporizador[es]', '<cancelar> todos los temporizadores'],
    build: () => answer(NO_TIMERS),
  },
  {
    name: 'HassTimerStatus',
    source: 'home-assistant',
    templates: ['estado[s] [(de|del) ][(mis|mi|el) ]temporizador[es]', '(cuanto|cuanta) [tiempo ](queda|falta) [(en|para|del) ][(mi|el) ]temporizador'],
    build: () => answer(NO_TIMERS),
  },
  // Hora y fecha (Home Assistant: HassGetCurrentTime, HassGetCurrentDate)
  {
    name: 'HassGetCurrentTime',
    source: 'home-assistant',
    templates: ['[<dime> ][que ]hora es[ ahora]', '[<dime> ]la hora[ actual]', 'hora actual'],
    build: (_s, now) => answer(`Son las ${hhmm(now)}.`),
  },
  {
    name: 'HassGetCurrentDate',
    source: 'home-assistant',
    templates: ['[<dime> ][que ]dia es[ hoy]', '[<dime> ][que ]fecha es[ hoy]', '[<dime> ]la fecha[ de hoy]', 'fecha de hoy'],
    build: (_s, now) => answer(`Hoy es ${dayLabel(now)}.`),
  },
  // Listas y tareas (Home Assistant: HassListAddItem, HassListCompleteItem)
  {
    name: 'HassListCompleteItem',
    source: 'home-assistant',
    templates: ['<marcar> {item} (en|de) [(mi|la|el) ]lista[ de {name}]'],
    build: (s) => {
      const item = (s.item ?? '').trim();
      return item ? act({ type: 'complete', text: item }) : null;
    },
  },
  {
    name: 'PyroCompleteTask',
    source: 'pyrohorns',
    templates: ['<marcar> [(como) ]<hecho> [(la|el) ]tarea [(de|del) ]{texto}', '<marcar> [(la|el) ]tarea [(de|del) ]{texto} [(como) ]<hecho>'],
    build: (s) => {
      const text = (s.texto ?? '').trim();
      return text ? act({ type: 'complete', text }) : null;
    },
  },
  {
    name: 'PyroListTasks',
    source: 'pyrohorns',
    templates: ['[(<dime>|que) ][(mis|las) ]tareas[ (pendientes|tengo|hay|me quedan)]', '[(<dime>|que) ][(mis|las) ]pendientes[ (tengo|hay)]'],
    build: () => act({ type: 'list', what: 'tasks' }),
  },
  {
    name: 'PyroListNotes',
    source: 'pyrohorns',
    templates: ['[(<dime>|que) ][(mis|las) ]notas[ (tengo|hay)]'],
    build: () => act({ type: 'list', what: 'notes' }),
  },
  {
    name: 'HassListAddItem',
    source: 'home-assistant',
    templates: ['<anadir> {item} (a|en) [(mi|el|la) ]lista[ (de|del) {name}]', '<anadir> {item} (a|en) [(mi|el|la) ]lista'],
    build: (s) => {
      const item = (s.item ?? '').trim();
      if (!item) return null;
      const list = (s.name ?? '').trim();
      return act({ type: 'task', text: list ? `${item} (lista ${list})` : item });
    },
  },
  {
    name: 'PyroTask',
    source: 'pyrohorns',
    templates: ['<anotar> [(la|una|un) ]tarea [(de|para) ]{texto}', '<crear> [(una|un) ]tarea [(de|para) ]{texto}'],
    build: (s) => {
      const text = (s.texto ?? '').trim();
      return text ? act({ type: 'task', text }) : null;
    },
  },
  {
    name: 'PyroNote',
    source: 'pyrohorns',
    templates: ['<anotar> [(que|de|sobre) ]{texto}', 'nota [(que|de|sobre) ]{texto}'],
    build: (s) => {
      const text = (s.texto ?? '').trim();
      return text ? act({ type: 'note', text }) : null;
    },
  },
  // Contactos, llamadas y correo (sin equivalente en Home Assistant)
  {
    name: 'PyroCall',
    source: 'pyrohorns',
    templates: [
      '<llamar> {nombre} por [(el|mi) ]{canal}',
      '<llamar> [por [(el|mi) ]{canal} ][(a|al|a la|a los|a las) ]{nombre}',
      '<llamar>',
    ],
    build: (s) => callRoute(s),
  },
  {
    name: 'PyroEmail',
    source: 'pyrohorns',
    templates: ['[(busca|buscar|dame|dime|cual es|como es) ][(el|mi|la) ](correo|email|mail|e-mail)[ electronico] [(de|del|para) ]{nombre}'],
    build: (s) => {
      const name = stripHonorifics(s.nombre ?? '');
      return name ? act({ type: 'email', name }) : ask('¿De quién quieres el correo?');
    },
  },
  // Calendario y alarmas
  {
    name: 'PyroCalendar',
    source: 'pyrohorns',
    templates: ['<agendar> {resto}', '<poner> en [la ]agenda {resto}'],
    build: (s, now) => calendarRoute(s.resto ?? '', now),
  },
  {
    name: 'PyroAlarm',
    source: 'pyrohorns',
    templates: ['<poner> [(una|la|me) ]alarma {resto}', '(despiertame|despierta) {resto}'],
    build: (s) => {
      const resto = s.resto ?? '';
      const t = timeOf(resto);
      if (!t) return ask('¿A qué hora pongo la alarma?');
      return act({ type: 'alarm', hour: t.h, minute: t.m, label: labelOf(resto) });
    },
  },
  // Temporizadores (Home Assistant: HassStartTimer)
  {
    name: 'HassStartTimer',
    source: 'home-assistant',
    templates: ['<poner> [(un|el) ]temporizador {resto}', 'temporizador [(de|por|durante) ]{resto}', 'avisame en {resto}'],
    build: (s) => {
      const resto = s.resto ?? '';
      const seconds = durationSeconds(resto);
      if (seconds === null) return ask('¿De cuánto tiempo?');
      return act({ type: 'timer', seconds, label: labelOf(resto) });
    },
  },
];
