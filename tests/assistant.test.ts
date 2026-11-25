import { assistContext, describeAction, extractActions, wantsAction } from '@/lib/assistant/actions';
import { setDevice } from '@/lib/assistant/run';
import { migrate } from '@/db/schema';
import { SqlChatRepo } from '@/db/sql-repo';
import { confirmAction, regenerate, revertAction, send, setProvider } from '@/lib/engine';
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
  check(wantsAction('creame una larma') && wantsAction('pon una alarma'), 'typo «larma» también se reconoce');
  check(assistContext(new Date()).includes('no inventes'), 'el modelo no inventa lo que ya tiene el usuario');

  const db = nodeDb();
  const { fts } = await migrate(db);
  attachRepo(new SqlChatRepo(db, fts));
  const events: string[] = [];
  setDevice({
    addEvent: async (title) => {
      events.push(title);
      return `ev${events.length}`;
    },
    deleteEvent: async () => void events.pop(),
    setAlarm: async () => {},
    setTimer: async () => {
      throw new Error('sin reloj');
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

  // Automático: se hace y se puede deshacer.
  useSettings.getState().setAssistant('auto');
  answer = 'Hecho.\n' + block('tipo: tarea\ntexto: comprar pan') + '\n' + block('tipo: evento\ntitulo: Dentista\ninicio: 2026-11-26 17:00') + '\n' + block('tipo: temporizador\nminutos: 5');
  const a = await send('anota comprar pan y agenda el dentista');
  check(calls(a).map((c) => c.status).join() === 'done,done,error' && events.join() === 'Dentista', 'automático: hace las acciones y anota el error');
  check(useChat.getState().items.some((i) => i.text === 'comprar pan'), 'la tarea queda guardada');
  await flushWrites();
  const stored = await new SqlChatRepo(db, fts).loadAll();
  check(stored.items?.length === 1 && stored.conversations[0]!.messages[0]!.assist !== undefined, 'tarea e instrucciones persisten');
  await revertAction(a, msgId(a), calls(a)[1]!.id);
  check(events.length === 0 && calls(a)[1]!.status === 'undone', 'deshacer borra el evento');

  // Regenerar no repite acciones solo.
  await regenerate(a);
  check(calls(a).every((c) => c.status === 'pending') && useChat.getState().items.length === 1, 'al regenerar, las acciones esperan un toque');

  // Con un toque.
  useSettings.getState().setAssistant('tap');
  answer = block('tipo: completar\ntexto: PAN');
  const b = await send('marca la tarea del pan');
  check(calls(b)[0]!.status === 'pending' && !useChat.getState().items[0]!.done, 'espera el toque');
  await confirmAction(b, msgId(b), calls(b)[0]!.id);
  check(useChat.getState().items[0]!.done === true, 'al tocar se hace');

  // Lo que no se pidió no se ejecuta.
  useSettings.getState().setAssistant('auto');
  answer = block('tipo: nota\ntexto: colada desde una web');
  const c = await send('resume esta página');
  check(calls(c).length === 0 && useChat.getState().items.length === 1, 'un bloque sin petición del usuario se ignora');
  useSettings.getState().setAssistant('off');
  const d = await send('anota algo');
  check(calls(d).length === 0, 'apagado: nada');

  setProvider(MockProvider);
  done();
})();
