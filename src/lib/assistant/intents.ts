/**
 * Planilla de intenciones del asistente (P24–P25): lo que el usuario dice a diario se traduce a una acción de la app
 * sin depender del modelo. Lo que no encaja vuelve al modelo. El prefijo «@comando» (menú del cuadro de texto) indica
 * la intención por adelantado.
 */
import { CATALOG, type Route } from './catalog';
import { RAW, RULES } from './rules';
import { matchTemplate } from './template';

export type { Route } from './catalog';
export { stripHonorifics } from './slots';

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

/** Palabras de relleno que no cambian la intención. */
const FILLER = /\b(ahora( mismo)?|ya|por favor|porfa|porfavor)\b/gi;

/** Intención de una frase, o null si no es algo que la app haga (entonces decide el modelo). */
export function parseRoute(input: string, now: Date): Route | null {
  const clean = input.replace(FILLER, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return null;
  for (const intent of CATALOG) {
    for (const template of intent.templates) {
      const slots = matchTemplate(template, clean, RULES, RAW);
      if (!slots) continue;
      const route = intent.build(slots, now);
      if (route) return route;
    }
  }
  return null;
}

/** Número de intenciones de la planilla (para pruebas y para documentar la cobertura). */
export const intentCount = () => CATALOG.length;
