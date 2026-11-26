/**
 * Reglas compartidas de la planilla de intenciones (sintaxis de template.ts). Los sinónimos siguen el criterio de
 * OHF-Voice/intents (Home Assistant) y se amplían con lo que se usa a diario en el teléfono.
 * Las reglas RAW son patrones fijos (números y unidades) y no admiten ranuras.
 */
import type { Raw, Rules } from './template';

export const RAW: Raw = {
  nb: '\\d+(?:[.,]\\d+)?|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|quince|veinte|treinta|cuarenta|cincuenta|sesenta|media|medio',
  unidad: 'segundos?|s|minutos?|mins?|min|m|horas?|h',
  canal: 'whats ?app|wasap|wa|celular|telefono|llamada',
};

export const RULES: Rules = {
  dime: ['dime', 'dame', 'digame', 'muestrame', 'cuentame'],
  cual_es: ['cual es', 'cual era', 'cuales son'],
  cuanto: ['cuanto', 'cuanta'],
  anadir: ['anade', 'anadir', 'agrega', 'agregar', 'pon', 'poner'],
  crear: ['crea', 'crear', 'nueva', 'nuevo', 'agrega', 'agregar', 'anade', 'anadir'],
  anotar: ['anota', 'anotar', 'apunta', 'apuntar', 'toma nota', 'tomar nota'],
  llamar: ['llama', 'llamar', 'llamame', 'llamale', 'llamalo', 'llamala', 'marca', 'marcar', 'marcale', 'telefonea', 'telefonear'],
  poner: ['pon', 'poner', 'pone', 'programa', 'programar', 'crea', 'crear'],
  marcar: ['marca', 'marcar', 'completa', 'completar', 'tacha', 'tachar'],
  hecho: ['hecho', 'hecha', 'completado', 'completada', 'terminado', 'terminada'],
  cancelar: ['cancela', 'cancelar', 'elimina', 'eliminar', 'quita', 'quitar', 'para', 'parar'],
  agendar: ['agenda', 'agendar', 'agendame', 'agendeme'],
};
