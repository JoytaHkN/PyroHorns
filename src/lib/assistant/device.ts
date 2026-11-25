/** Acceso real al calendario y al reloj de Android (módulo nativo). */
import { Platform } from 'react-native';
import { addEvent, deleteEvent, requestCalendarPermission, setAlarm, setTimer } from '@pyrohorns/llama';
import { setDevice } from './run';

export function registerDevice() {
  if (Platform.OS !== 'android') return;
  setDevice({
    async addEvent(title, start, end) {
      if (!(await requestCalendarPermission())) throw new Error('Sin permiso de calendario no puedo crear el evento.');
      return addEvent(title, start, end);
    },
    deleteEvent,
    setAlarm,
    setTimer,
  });
}
