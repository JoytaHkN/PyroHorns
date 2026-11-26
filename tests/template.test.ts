import { matchTemplate, foldText } from '@/lib/assistant/template';
import { RAW, RULES } from '@/lib/assistant/rules';
import { check, done } from './helpers';

const m = (t: string, input: string) => matchTemplate(t, input, RULES, RAW);

check(foldText('Qué día, mañana!') === 'que dia  manana ', 'normaliza tildes y puntuación sin cambiar la longitud');
check(foldText('mañana').length === 'mañana'.length, 'mismo largo que el original (posiciones alineadas)');

const a = m('llama [a ]{nombre}', 'Llama a Ana López');
check(a?.nombre === 'Ana López', 'ranura con tildes y opcional');
check(m('[(el|mi) ]alarma', 'el alarma') !== null && m('(a|b) c', 'b c') !== null, 'alternativas');
check(m('pon [una ]alarma', 'pon alarma') !== null, 'opcional sin el artículo');
check(m('pon alarma', 'pon otra cosa') === null, 'lo que no encaja no coincide');
check(m('minuto[s]', 'minuto') !== null && m('minuto[s]', 'minutos') !== null, 'letra opcional');
check(m('<dime> hora', 'dime hora') !== null, 'regla con nombre');
check(m('{resto}', '  cualquier cosa   ')?.resto === 'cualquier cosa', 'recorta espacios de la ranura');
check(m('<llamar>', 'marca') !== null, 'sinónimo de la regla');

done();
