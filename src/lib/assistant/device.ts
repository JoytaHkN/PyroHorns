/** Acceso real al calendario y al reloj de Android (módulo nativo). */
import { Platform } from 'react-native';
import {
  addEvent,
  deleteEvent,
  dialNumber,
  openWhatsApp,
  requestCalendarPermission,
  requestContactsPermission,
  searchContacts,
  setAlarm,
  setTimer,
} from '@pyrohorns/llama';
import { setDevice, type PhoneContact } from './run';

export function registerDevice() {
  if (Platform.OS !== 'android') return;
  setDevice({
    async addEvent(title, start, end) {
      if (!(await requestCalendarPermission())) throw new Error('Sin permiso de calendario no puedo crear el evento.');
      return addEvent(title, start, end);
    },
    async contact(name) {
      if (!(await requestContactsPermission())) throw new Error('Sin permiso de contactos no puedo buscar a esa persona.');
      const list = JSON.parse(await searchContacts(name)) as PhoneContact[];
      return list.find((c) => c.phones.length > 0) ?? list[0] ?? null;
    },
    dial: dialNumber,
    whatsapp: openWhatsApp,
    deleteEvent,
    setAlarm,
    setTimer,
  });
}
