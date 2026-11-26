import { CATALOG } from '@/lib/assistant/catalog';
import { intentCount, parseRoute } from '@/lib/assistant/intents';
import { check, done } from './helpers';

const now = new Date(2026, 10, 25, 9, 5); // miércoles 25 de noviembre de 2026, 09:05
const r = (s: string) => parseRoute(s, now);

// Intenciones de Home Assistant (nombres y frases adaptadas, CC-BY-4.0).
check(r('qué hora es')?.kind === 'answer' && r('qué hora es')!.kind === 'answer' && (r('qué hora es') as { text: string }).text === 'Son las 09:05.', 'hora: responde sin acción');
check(r('dime la hora actual') !== null && r('hora actual') !== null, 'hora: variantes de Home Assistant');
check((r('dime la fecha de hoy') as { text?: string })?.text === 'Hoy es miércoles 2026-11-25.', 'fecha de hoy: dime la fecha');
check((r('estado de temporizadores') as { kind?: string })?.kind === 'answer', 'estado de temporizadores: responde sin inventar');
check((r('cancela el temporizador') as { kind?: string })?.kind === 'answer', 'cancelar temporizador: explica dónde se cancela');
check(r('avísame en 10 minutos')?.kind === 'action', 'avisame en N minutos es un temporizador');
check((r('pon un temporizador de media hora que se llame pasta') as { action?: { seconds: number } })?.action?.seconds === 1800, 'media hora');

// Listas (Home Assistant: añadir y completar elementos)
check((r('añade leche y pan a mi lista de Mercadona') as { action?: { text: string } })?.action?.text === 'leche y pan (lista Mercadona)', 'añadir a una lista con nombre');
check((r('pon pan en la lista') as { action?: { text: string } })?.action?.text === 'pan', 'añadir a la lista sin nombre');
check((r('marca leche en mi lista') as { action?: { type: string } })?.action?.type === 'complete', 'completar un elemento');

// Contactos, llamadas, correo
check((r('llama a Pedro') as { action?: { channel: string } })?.action?.channel === 'phone', 'llamar: teléfono por defecto');
check((r('marca a mi mamá por WhatsApp') as { action?: { channel: string; name: string } })?.action?.channel === 'whatsapp', 'llamar por WhatsApp');
check((r('llama') as { kind?: string })?.kind === 'question', 'llamar sin nombre pregunta');
check((r('llama por whatsapp') as { kind?: string })?.kind === 'question', 'WhatsApp sin nombre pregunta');
check((r('correo de Ana') as { action?: { type: string } })?.action?.type === 'email', 'correo de alguien');
check((r('llama a la mamá') as { action?: { name: string } })?.action?.name === 'mamá', 'quita el artículo de la mamá');

// Calendario y alarmas
check((r('agenda cita con Luis mañana a las 9') as { action?: { guest?: string } })?.action?.guest === 'Luis', 'agenda con invitado');
check((r('agenda dentista') as { kind?: string })?.kind === 'question', 'agenda sin hora pregunta');
check((r('pon una alarma para las 7') as { action?: { hour: number; label: string } })?.action?.label === '', 'alarma: «para las 7» no es etiqueta');
check((r('pon una alarma a las 7 para despertar') as { action?: { label: string } })?.action?.label === 'despertar', 'alarma: «para despertar» sí es etiqueta');
check((r('despiértame a las 6:30') as { action?: { minute: number } })?.action?.minute === 30, 'despiértame');

// Lo que no es del teléfono sigue al modelo.
check(r('explícame la fotosíntesis') === null, 'lo general va al modelo');
check(r('cuéntame un chiste') === null, 'un chiste va al modelo');

check(intentCount() === CATALOG.length && CATALOG.length >= 15, 'hay al menos 15 intenciones en la planilla');
check(CATALOG.every((i) => i.templates.length > 0 && i.name.length > 0), 'cada intención tiene plantillas y nombre');
check(CATALOG.filter((i) => i.source === 'home-assistant').length >= 7, 'hay al menos siete intenciones de Home Assistant');

// Calendario: abrir un día (solo lectura; no crea nada) (P26-D).
type Opened = { kind?: string; action?: { type: string; start: number } };
const open = (s: string) => r(s) as Opened;
check(open('abre el calendario del 17 de septiembre').action?.type === 'openCalendar', 'abre el calendario: intención propia');
check(open('abre el calendario del 17 de septiembre').action?.start === new Date(2026, 8, 17).getTime(), 'del 17 de septiembre: ese día a medianoche');
check(open('ahora el calendario en la fecha del 17 de septiembre').action?.start === new Date(2026, 8, 17).getTime(), 'con «ahora» y «en la fecha»');
check(open('abre el calendario').action?.start === new Date(2026, 10, 25).getTime(), 'abre el calendario sin fecha: hoy');
check(open('abre el calendario del 17/09/2027').action?.start === new Date(2027, 8, 17).getTime(), 'fecha con barras y año');
check(open('abre el calendario del 2027-03-05').action?.start === new Date(2027, 2, 5).getTime(), 'fecha ISO');
check(open('abre el calendario del viernes').action?.start === new Date(2026, 10, 27).getTime(), 'el próximo viernes');
check(open('abre el calendario del 31 de febrero').kind === 'question', 'una fecha que no existe pregunta');
check((r('agenda reunión el viernes a las 10') as { action?: { type: string } })?.action?.type === 'event', 'agendar sigue siendo un evento');
done();
