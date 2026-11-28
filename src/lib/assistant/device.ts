/** Acceso real al calendario y al reloj de Android (módulo nativo). */
import { Platform } from 'react-native';
import {
  addEvent,
  deleteEvent,
  dialNumber,
  openCalendarAt,
  openWhatsApp,
  requestCalendarPermission,
  requestContactsPermission,
  searchContacts,
  setAlarm,
  setTimer,
} from '@pyrohorns/llama';
import { setDevice, type PhoneContact, type SavedEvent } from './run';

export function registerDevice() {
  if (Platform.OS !== 'android') return;
  setDevice({
    async addEvent(title, start, end) {
      if (!(await requestCalendarPermission())) throw new Error('Sin permiso de calendario no puedo crear el evento.');
      // El módulo devuelve JSON: el id, el calendario y si está visible (P26-C3).
      return JSON.parse(await addEvent(title, start, end)) as SavedEvent;
    },
    async contacts(name) {
      if (!(await requestContactsPermission())) throw new Error('Sin permiso de contactos no puedo buscar a esa persona.');
      return JSON.parse(await searchContacts(name)) as PhoneContact[];
    },
    dial: dialNumber,
    whatsapp: openWhatsApp,
    deleteEvent,
    setAlarm,
    setTimer,
    openCalendar: openCalendarAt,
  });
}
