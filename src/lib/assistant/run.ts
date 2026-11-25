/** Ejecuta las acciones del asistente. El acceso al teléfono se inyecta para poder probarlo. */
import { uid, useChat } from '@/store/chat';
import type { AgendaItem } from '@/types/chat';
import { when, type Action } from './actions';

export interface PhoneContact {
  name: string;
  phones: string[];
  emails: string[];
}

export interface Device {
  /** Busca un contacto por nombre (pide el permiso si falta). */
  contact(name: string): Promise<PhoneContact | null>;
  /** Abre el marcador con el número; el usuario pulsa llamar. */
  dial(number: string): Promise<void>;
  /** Abre el chat de WhatsApp con el número; el usuario envía. */
  whatsapp(number: string): Promise<void>;
  /** Pide el permiso de calendario si falta y crea el evento; devuelve su id. */
  addEvent(title: string, start: number, end: number): Promise<string>;
  deleteEvent(id: string): Promise<void>;
  setAlarm(hour: number, minute: number, label: string): Promise<void>;
  setTimer(seconds: number, label: string): Promise<void>;
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

/** `ref` identifica lo creado para poder deshacerlo. */
export async function runAction(a: Action): Promise<{ result: string; ref?: string }> {
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
        const c = await phone().contact(a.guest);
        if (c?.emails[0]) title = `${a.title} (${c.name}: ${c.emails[0]})`;
      }
      return { result: 'Evento creado en tu calendario', ref: await phone().addEvent(title, a.start, a.start + a.minutes * 60_000) };
    }
    case 'call': {
      const c = await phone().contact(a.name);
      const number = c?.phones[0];
      if (!c || !number) throw new Error(`No encontré a ${a.name} con número en tus contactos.`);
      if (a.channel === 'whatsapp') {
        await phone().whatsapp(number);
        return { result: `WhatsApp abierto con ${c.name}: envía tú el mensaje.` };
      }
      await phone().dial(number);
      return { result: `Marcador abierto con ${c.name} (${number}): pulsa llamar.` };
    }
    case 'email': {
      const c = await phone().contact(a.name);
      if (!c) throw new Error(`No encontré a ${a.name} en tus contactos.`);
      if (!c.emails.length) return { result: `${c.name} no tiene correo guardado.` };
      return { result: `${c.name}: ${c.emails.join(', ')}` };
    }
    case 'alarm':
      await phone().setAlarm(a.hour, a.minute, a.label);
      return { result: 'Alarma puesta en la app Reloj' };
    case 'timer':
      await phone().setTimer(a.seconds, a.label);
      return { result: 'Temporizador iniciado en la app Reloj' };
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
