import { assistContext, describeAction, extractActions, problemOf, wantsAction } from '@/lib/assistant/actions';
import { setDevice } from '@/lib/assistant/run';
import { migrate } from '@/db/schema';
import { SqlChatRepo } from '@/db/sql-repo';
import { chooseContact, completeLocal, confirmAction, regenerate, revertAction, send, setProvider } from '@/lib/engine';
import { MockProvider } from '@/providers/mock';
import { attachRepo, flushWrites, useChat } from '@/store/chat';
import { useSettings } from '@/store/settings';
import { check, done, nodeDb } from './helpers';

const block = (body: string) => '```accion\n' + body + '\n```';

(async () => {
  check(wantsAction('Anota comprar pan') && wantsAction('recuérdame el dentista') && wantsAction('pon una alarma a las 7'), 'detecta peticiones');
  check(!wantsAction('¿Quién gobernó Chile en 1973?') && !wantsAction('escribe un poema'), 'el chat normal no lleva instrucciones');
  const ctx = assistContext(new Date(2026, 10, 25, 5, 30));
  check(ctx.includes('miércoles 2026-11-25') && ctx.includes('05:30') && ctx.includes('Mañana es jueves 2026-11-26'), 'fecha de hoy y de mañana');

  const parsed = extractActions(
    'Vale.\n' + block('tipo: evento\ntitulo: Dentista\ninicio: 2026-11-26 17:00') + '\n' + block('{"tipo":"alarma","hora":"7:05"}') + '\n' + block('tipo: temporizador\nminutos: 1,5'),
  );
  check(parsed.text === 'Vale.' && parsed.actions.length === 3, 'bloques en líneas o en JSON');
  const [ev, al, tm] = parsed.actions;
  check(ev?.type === 'event' && ev.start === new Date(2026, 10, 26, 17, 0).getTime() && ev.minutes === 60, 'evento con duración por defecto');
  check(al?.type === 'alarm' && al.hour === 7 && al.minute === 5 && tm?.type === 'timer' && tm.seconds === 90, 'alarma y temporizador');
  check(describeAction(ev!).includes('jueves 2026-11-26 17:00'), 'la fecha se muestra con el día');
  for (const bad of ['tipo: evento\ntitulo: X\ninicio: 2026-02-30 10:00', 'tipo: alarma\nhora: 27:00', 'tipo: evento\ntitulo: sin fecha', 'tipo: borrar_todo', 'tipo: nota']) {
    check(extractActions(block(bad)).actions.length === 0, `se ignora: ${bad.split('\n').join(' / ')}`);
  }
  check(extractActions('```accion\ntipo: nota\ntexto: a medias').actions.length === 0, 'bloque sin cerrar: no se ejecuta');
  const bare = extractActions(block('alarma\nhora: 20:00\netiqueta: Furo celular'));
  check(bare.actions[0]?.type === 'alarm' && bare.invalid === 0, 'tipo como primera línea, sin «tipo:»');
  check(extractActions(block('borrar\nfoo: 1')).invalid === 1, 'un bloque no entendido se cuenta para avisar');
  const nota = extractActions('Vale.\n```nota\ntexto: Llamar a Ramírez\nfecha: 2026-11-25 17:18\n```');
  check(nota.actions[0]?.type === 'note' && nota.text === 'Vale.', 'la etiqueta del bloque (nota) cuenta como tipo');
  const twice = extractActions('alarma\nhora: 18:00\netiqueta: despertar\n\nalarma\nhora: 18:00\netiqueta: despertar');
  check(twice.actions.length === 1 && twice.actions[0]?.type === 'alarm' && twice.text === '', 'sin ``` y repetida: una sola acción');
  check(extractActions('Nota: la reunión es el martes').actions.length === 0, 'una frase normal no se convierte en acción');
  check(extractActions('```python\nprint(1)\n```').text.includes('print(1)'), 'código normal no se toca');
  check(wantsAction('creame una larma') && wantsAction('pon una alarma'), 'typo «larma» también se reconoce');
  check(assistContext(new Date()).includes('no inventes'), 'el modelo no inventa lo que ya tiene el usuario');

  // Lo que no tiene sentido no se hace (P26-C1): texto vago, fecha pasada, medianoche sin hora.
  const now = new Date(2026, 10, 26, 10, 0); // jueves 26 de noviembre de 2026, 10:00
  const at = (y: number, m: number, d: number, h = 10) => new Date(y, m, d, h, 0).getTime();
  check(problemOf({ type: 'note', text: 'Calendario' }, now) === '¿Qué quieres anotar?', 'una nota con un texto vago pregunta');
  check(problemOf({ type: 'note', text: 'comprar pan' }, now) === null, 'una nota normal se hace');
  check(problemOf({ type: 'event', title: 'Dentista', start: at(2026, 8, 17), minutes: 60 }, now)?.includes('ya pasó') === true, 'un evento en una fecha pasada pregunta');
  check(problemOf({ type: 'event', title: 'Dentista', start: at(2026, 10, 27, 0), minutes: 60 }, now) === '¿A qué hora?', 'un evento a medianoche pregunta la hora');
  check(problemOf({ type: 'event', title: 'Calendario', start: at(2026, 10, 27), minutes: 60 }, now) === '¿Cómo se llama el evento?', 'un evento sin título pregunta');
  check(problemOf({ type: 'event', title: 'Dentista', start: at(2026, 10, 27), minutes: 60 }, now) === null, 'un evento futuro con hora se hace');
  check(problemOf({ type: 'openCalendar', start: at(2026, 8, 17, 0) }, now) === null, 'abrir el calendario de una fecha pasada no es un problema');

  const db = nodeDb();
  const { fts } = await migrate(db);
  attachRepo(new SqlChatRepo(db, fts));
  const events: string[] = [];
  const opened: number[] = [];
  const dialed: string[] = [];
  const book = [
    { name: 'Rosa Barrios', phones: ['111'], emails: [] },
    { name: 'Bar La Esquina', phones: ['222'], emails: [] },
    { name: 'Barbara', phones: ['333'], emails: [] },
  ];
  setDevice({
    contacts: async (name) => book.filter((c) => c.name.toLowerCase().includes(name.toLowerCase())),
    dial: async (number) => void dialed.push(number),
    whatsapp: async () => {},
    addEvent: async (title) => {
      events.push(title);
      return { id: `ev${events.length}`, calendar: 'Trabajo', visible: true };
    },
    deleteEvent: async () => void events.pop(),
    setAlarm: async () => {},
    setTimer: async () => {
      throw new Error('sin reloj');
    },
    openCalendar: async (start) => {
      opened.push(start);
    },
  });
  let answer = '';
  setProvider({
    id: 'fijo',
    async *stream() {
      yield { type: 'token' as const, text: answer };
      yield { type: 'done' as const };
    },
  });
  const calls = (id: string) => useChat.getState().conversations.find((c) => c.id === id)!.messages.at(-1)!.toolCalls ?? [];
  const msgId = (id: string) => useChat.getState().conversations.find((c) => c.id === id)!.messages.at(-1)!.id;
  const lastText = (id: string) => useChat.getState().conversations.find((c) => c.id === id)!.messages.at(-1)!.content;

  // Automático: la tarea se hace sola; el evento y el temporizador que propone el modelo esperan un toque (P26-C2).
  useSettings.getState().setAssistant('auto');
  // Fecha futura: la validación mira que no sea una fecha pasada.
  answer =
    'Hecho.\n' +
    block('tipo: tarea\ntexto: comprar pan') +
    '\n' +
    block('tipo: evento\ntitulo: Dentista\ninicio: 2031-11-26 17:00') +
    '\n' +
    block('tipo: temporizador\nminutos: 5');
  const a = await send('tengo que hacer tareas hoy: comprar pan y agendar el dentista');
  check(calls(a).map((c) => c.status).join() === 'done,pending,pending' && events.length === 0, 'automático: la tarea se hace; evento y temporizador del modelo esperan un toque');
  check(useChat.getState().items.some((i) => i.text === 'comprar pan'), 'la tarea queda guardada');
  await flushWrites();
  const stored = await new SqlChatRepo(db, fts).loadAll();
  check(stored.items?.length === 1 && stored.conversations[0]!.messages[0]!.assist !== undefined, 'tarea e instrucciones persisten');
  await confirmAction(a, msgId(a), calls(a)[1]!.id);
  check(events.join() === 'Dentista' && calls(a)[1]!.status === 'done', 'con un toque, el evento se guarda');
  check(calls(a)[1]!.result === 'Evento guardado en «Trabajo»', 'el evento dice en qué calendario quedó');
  await revertAction(a, msgId(a), calls(a)[1]!.id);
  check(events.length === 0 && calls(a)[1]!.status === 'undone', 'deshacer borra el evento');

  // Regenerar no repite acciones solo.
  await regenerate(a);
  check(calls(a).every((c) => c.status === 'pending') && useChat.getState().items.length === 1, 'al regenerar, las acciones esperan un toque');

  // Con un toque.
  useSettings.getState().setAssistant('tap');
  answer = block('tipo: completar\ntexto: PAN');
  const b = await send('tengo que hacer tareas: marca la del pan');
  check(calls(b)[0]!.status === 'pending' && !useChat.getState().items[0]!.done, 'espera el toque');
  await confirmAction(b, msgId(b), calls(b)[0]!.id);
  check(useChat.getState().items[0]!.done === true, 'al tocar se hace');

  // Planilla en Automático: lo válido se hace solo; lo vago se pregunta.
  useSettings.getState().setAssistant('auto');
  const p = await send('agenda el dentista mañana a las 10');
  check(calls(p)[0]?.status === 'done' && events.includes('dentista'), 'la planilla agenda sola cuando el evento es válido');
  const v = await send('anota algo');
  check(lastText(v) === '¿Qué quieres anotar?' && calls(v).length === 0, 'anota algo: pregunta qué anotar, no anota nada');
  answer = block('tipo: nota\ntexto: Calendario');
  const n = await send('tengo que hacer tareas: lo del calendario');
  check(calls(n)[0]?.status === 'error' && calls(n)[0]?.result === '¿Qué quieres anotar?', 'una nota inventada por el modelo queda como error con su motivo');
  answer = block('tipo: evento\ntitulo: Dentista\ninicio: 2020-09-17 10:00');
  const old = await send('tengo que hacer tareas: el dentista de septiembre');
  check(calls(old)[0]?.status === 'error' && calls(old)[0]?.result?.includes('ya pasó') === true, 'un evento del modelo en una fecha pasada no se crea');
  await send('abre el calendario del 17 de septiembre');
  check(opened.length === 1 && new Date(opened[0]!).getMonth() === 8 && new Date(opened[0]!).getDate() === 17, 'abre el calendario del 17 de septiembre: ese día, solo lectura');

  // Dictado: lo que oyó la voz queda bajo el mensaje, y se guarda.
  const h = await send('anota comprar leche', null, { heard: 'anota comprar lechhe' });
  await flushWrites();
  const reloaded = await new SqlChatRepo(db, fts).loadAll();
  check(reloaded.conversations.find((c) => c.id === h)?.messages[0]?.heard === 'anota comprar lechhe', 'el dictado «Oí» se guarda con el mensaje');

  // Lo que no se pidió no se ejecuta.
  const before = useChat.getState().items.length;
  useSettings.getState().setAssistant('auto');
  answer = block('tipo: nota\ntexto: colada desde una web');
  const c = await send('resume esta página');
  check(calls(c).length === 0 && useChat.getState().items.length === before, 'un bloque sin petición del usuario se ignora');

  // Si el modelo no escribe nada, se dice en vez de dejar una burbuja en blanco (P26-E).
  answer = '';
  const e = await send('cuéntame algo');
  check(lastText(e) === 'No obtuve respuesta. Prueba otra vez o dímelo de otra forma.', 'respuesta vacía: se dice');

  // La corrección del dictado nunca carga un modelo: sin uno listo, no hay corrección del modelo.
  check((await completeLocal([{ role: 'user', content: 'hola' }], 16)) === null, 'sin modelo cargado, la corrección no carga ninguno');

  useSettings.getState().setAssistant('off');
  const d = await send('anota algo');
  check(calls(d).length === 0, 'apagado: nada');

  setProvider(MockProvider);
  // Llamadas (P32-2): con duda no se marca; se ofrecen contactos para tocar. Con una sola letra se pregunta.
  useSettings.getState().setAssistant('auto');
  const one = await send('llama a A');
  check(lastText(one) === '¿A quién quieres llamar?' && calls(one).length === 0 && dialed.length === 0, 'una sola letra: pregunta a quién');
  const partial = await send('marca Barb');
  check(calls(partial)[0]?.status === 'choose' && calls(partial)[0]?.choices?.join() === 'Barbara' && dialed.length === 0, 'comienzo de palabra: pregunta antes de marcar');
  await chooseContact(partial, msgId(partial), calls(partial)[0]!.id, 'Barbara');
  check(calls(partial)[0]?.status === 'done' && dialed.join() === '333' && calls(partial)[0]?.choices === undefined, 'al tocar el contacto, abre el marcador con su número');
  const whole = await send('marca Bar');
  check(calls(whole)[0]?.status === 'done' && dialed.at(-1) === '222', 'un único contacto con la palabra completa: directo');

  done();
})();
