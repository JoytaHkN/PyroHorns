/** Ejecuta las acciones del asistente. El acceso al teléfono se inyecta para poder probarlo. */
import { uid, useChat } from '@/store/chat';
import type { AgendaItem } from '@/types/chat';
import { dayText, durationText, when, type Action } from './actions';
import { pickContact } from './contacts';

export interface PhoneContact {
  name: string;
  phones: string[];
  emails: string[];
}

/** Evento guardado: su id, el calendario donde quedó y si ese calendario está visible. */
export interface SavedEvent {
  id: string;
  calendar: string;
  visible: boolean;
}

export interface Device {
  /** Contactos que coinciden con el nombre (pide el permiso si falta). */
  contacts(name: string): Promise<PhoneContact[]>;
  /** Abre el marcador con el número; el usuario pulsa llamar. */
  dial(number: string): Promise<void>;
  /** Abre el chat de WhatsApp con el número; el usuario envía. */
  whatsapp(number: string): Promise<void>;
  /** Pide el permiso de calendario si falta, guarda el evento y lo vuelve a leer para confirmarlo. */
  addEvent(title: string, start: number, end: number): Promise<SavedEvent>;
  deleteEvent(id: string): Promise<void>;
  setAlarm(hour: number, minute: number, label: string): Promise<void>;
  setTimer(seconds: number, label: string): Promise<void>;
  /** Abre la app Calendario en ese día (solo lectura). */
  openCalendar(start: number): Promise<void>;
}

let device: Device | null = null;
export const setDevice = (d: Device | null) => {
  device = d;
};

const phone = (): Device => {
  if (!device) throw new Error('Esta acción solo funciona en la app de Android.');
  return device;
};

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

function addItem(item: Omit<AgendaItem, 'id' | 'createdAt'>): string {
  const id = uid();
  useChat.getState().saveItem({ id, createdAt: Date.now(), ...item });
  return id;
}

export interface Outcome {
  result: string;
  /** Identifica lo creado para poder deshacerlo. */
  ref?: string;
  /** Hay duda sobre el contacto: no se hizo nada y el usuario toca uno. */
  choices?: string[];
}

const choose = (name: string, candidates: PhoneContact[]): Outcome => ({
  result: `Elige a quién te refieres con «${name}».`,
  choices: [...new Set(candidates.map((c) => c.name))],
});

export async function runAction(a: Action): Promise<Outcome> {
  switch (a.type) {
    case 'note':
      return { result: 'Nota guardada', ref: addItem({ kind: 'note', text: a.text }) };
    case 'task':
      return { result: 'Tarea anotada', ref: addItem({ kind: 'task', text: a.text, ...(a.due ? { due: a.due } : {}) }) };
    case 'complete': {
      const t = fold(a.text);
      const found = useChat.getState().items.find((i) => i.kind === 'task' && !i.done && fold(i.text).includes(t));
      if (!found) throw new Error('No encontré una tarea pendiente con ese texto.');
      useChat.getState().saveItem({ ...found, done: true });
      return { result: `Hecha: ${found.text}`, ref: found.id };
    }
    case 'list': {
      const items = useChat.getState().items.filter((i) => (a.what === 'notes' ? i.kind === 'note' : i.kind === 'task' && !i.done));
      if (!items.length) return { result: a.what === 'notes' ? 'No tienes notas.' : 'No tienes tareas pendientes.' };
      return { result: items.map((i) => `• ${i.text}${i.due ? ` (${when(i.due)})` : ''}`).join('\n') };
    }
    case 'event': {
      let title = a.title;
      if (a.guest) {
        // El correo del invitado solo se añade si no hay duda de quién es.
        const pick = pickContact(a.guest, await phone().contacts(a.guest));
        const c = pick && 'contact' in pick ? pick.contact : null;
        if (c?.emails[0]) title = `${a.title} (${c.name}: ${c.emails[0]})`;
      }
      const saved = await phone().addEvent(title, a.start, a.start + a.minutes * 60_000);
      return {
        result: saved.visible
          ? `Evento guardado en «${saved.calendar}»`
          : `Evento guardado en «${saved.calendar}», pero ese calendario está oculto: muéstralo en la app Calendario.`,
        ref: saved.id,
      };
    }
    case 'call': {
      const withPhone = (await phone().contacts(a.name)).filter((c) => c.phones.length > 0);
      const pick = pickContact(a.name, withPhone, a.exact);
      if (!pick) throw new Error(`No encontré a ${a.name} con número en tus contactos.`);
      if ('candidates' in pick) return choose(a.name, pick.candidates);
      const c = pick.contact;
      const number = c.phones[0]!;
      if (a.channel === 'whatsapp') {
        await phone().whatsapp(number);
        return { result: `WhatsApp abierto con ${c.name}: envía tú el mensaje.` };
      }
      await phone().dial(number);
      return { result: `Marcador abierto con ${c.name} (${number}): pulsa llamar.` };
    }
    case 'email': {
      const found = await phone().contacts(a.name);
      const withMail = found.filter((c) => c.emails.length > 0);
      const pick = pickContact(a.name, withMail.length ? withMail : found, a.exact);
      if (!pick) throw new Error(`No encontré a ${a.name} en tus contactos.`);
      if ('candidates' in pick) return choose(a.name, pick.candidates);
      const c = pick.contact;
      if (!c.emails.length) return { result: `${c.name} no tiene correo guardado.` };
      return { result: `${c.name}: ${c.emails.join(', ')}` };
    }
    case 'alarm':
      await phone().setAlarm(a.hour, a.minute, a.label);
      return {
        result: `Abrí el Reloj con la alarma de las ${String(a.hour).padStart(2, '0')}:${String(a.minute).padStart(2, '0')}. Confirma que quedó guardada.`,
      };
    case 'timer':
      await phone().setTimer(a.seconds, a.label);
      return { result: `Abrí el Reloj con el temporizador de ${durationText(a.seconds)}. Confirma que quedó puesto.` };
    case 'openCalendar':
      await phone().openCalendar(a.start);
      return { result: `Calendario abierto en ${dayText(a.start)}.` };
  }
}

export async function undoAction(a: Action, ref: string): Promise<void> {
  const chat = useChat.getState();
  if (a.type === 'note' || a.type === 'task') chat.removeItem(ref);
  else if (a.type === 'complete') {
    const item = chat.items.find((i) => i.id === ref);
    if (item) chat.saveItem({ ...item, done: false });
  } else if (a.type === 'event') await phone().deleteEvent(ref);
}

/** Qué se puede deshacer desde la app (las alarmas y temporizadores se quitan en el Reloj). */
export const canUndo = (a: Action) => a.type === 'note' || a.type === 'task' || a.type === 'complete' || a.type === 'event';
