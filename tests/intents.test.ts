import { parseRoute, rewriteCommand, stripHonorifics } from '@/lib/assistant/intents';
import { check, done } from './helpers';

const now = new Date(2026, 10, 25, 9, 0); // miércoles 25 de noviembre de 2026, 09:00
const act = (input: string) => {
  const r = parseRoute(input, now);
  return r?.kind === 'action' ? r.action : null;
};

check(rewriteCommand('@llamar Ana').text === 'llama a Ana', '@llamar se traduce a «llama a»');
check(rewriteCommand('@buscar la capital de Chile').web === true, '@buscar activa la búsqueda en internet');
check(rewriteCommand('hola').text === 'hola', 'sin comando el texto no cambia');

const call = act('Llamar ahora ya al sgto Ramírez Salinas por el celular');
check(call?.type === 'call' && call.name === 'Ramírez Salinas' && call.channel === 'phone', 'llamar: quita tratamiento, ahora y ya');
const wa = act('llama por whatsapp a mi mamá');
check(wa?.type === 'call' && wa.name === 'mamá' && wa.channel === 'whatsapp', 'WhatsApp: «mi» se quita y el canal se detecta');
check(act('marca a Pedro')?.type === 'call', '«marca a» es llamar');
check(parseRoute('llama', now)?.kind === 'question', 'llamar sin nombre pregunta a quién');

const mail = act('busca el correo de Ana López');
check(mail?.type === 'email' && mail.name === 'Ana López', 'correo de alguien');
check(act('dame el email de Pedro')?.type === 'email', 'email de alguien');

const ev = act('agenda dentista mañana a las 17:00');
check(ev?.type === 'event' && ev.title === 'dentista' && ev.start === new Date(2026, 10, 26, 17, 0).getTime(), 'agenda con día y hora');
const ev2 = act('agenda reunión con Ana el viernes a las 10');
check(ev2?.type === 'event' && ev2.guest === 'Ana' && ev2.start === new Date(2026, 10, 27, 10, 0).getTime(), 'agenda: próximo viernes y con quién');
const ev3 = act('agendar cita pasado mañana a las 9 de la noche');
check(ev3?.type === 'event' && ev3.start === new Date(2026, 10, 27, 21, 0).getTime(), 'pasado mañana y de la noche');
check(parseRoute('agenda dentista', now)?.kind === 'question', 'agenda sin hora pregunta la hora');

const al = act('pon una alarma a las 21:00 que se llame despertar');
check(al?.type === 'alarm' && al.hour === 21 && al.minute === 0 && al.label === 'despertar', 'alarma con hora y nombre');
check(act('pon una alarma a las 9 de la mañana')?.type === 'alarm', 'alarma de la mañana');
const tm = act('temporizador de 2 minutos');
check(tm?.type === 'timer' && tm.seconds === 120, 'temporizador en minutos');
check(act('temporizador de 30 segundos')?.type === 'timer', 'temporizador en segundos');

check(act('anota la tarea comprar pan')?.type === 'task', 'tarea');
check(act('anota que mañana hay lluvia')?.type === 'note', 'nota');
check(act('marca como hecha la tarea comprar pan')?.type === 'complete', 'completar tarea');
check(act('qué tareas tengo')?.type === 'list', 'listar tareas');

check(act('dame una receta de tortilla') === null, 'lo que no es del teléfono va al modelo');
check(act('buenas tardes') === null, 'saludo: va al modelo');

check(stripHonorifics('sargento Ramírez') === 'Ramírez' && stripHonorifics('la señora Ana') === 'Ana', 'quita tratamientos');
done();
