import { toSpeech } from '@/lib/voice/text';
import { decisionOf } from '@/lib/engine';
import { check, done } from './helpers';

check(toSpeech('Listo **encendí** la alarma [1].') === 'Listo encendí la alarma.', 'quita negritas y citas');
check(!toSpeech('Mira ```python\nprint(1)\n``` abajo').includes('print'), 'no lee bloques de código');
check(!toSpeech('Fuente https://example.com/x aquí').includes('http'), 'no lee enlaces');
check(toSpeech('a'.repeat(900)).length === 700, 'limita la longitud');
check(decisionOf('Sí, hazlo') === 'yes' && decisionOf('sí') === 'yes', 'sí confirma');
check(decisionOf('No, espera') === 'no' && decisionOf('cancela eso') === 'no', 'no descarta');
check(decisionOf('qué hora es') === null && decisionOf('nota que sí tengo hambre') === null, 'lo demás no es respuesta');
done();
