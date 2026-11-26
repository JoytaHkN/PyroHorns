import { cleanTranscript } from '@/lib/voice/text';
import { acceptRefinement, correctWords, editDistance, refineTranscript } from '@/lib/voice/refine';
import { COMMAND_WORDS, voiceVocabulary, whisperPrompt } from '@/lib/voice/vocabulary';
import { check, done } from './helpers';

// Ruido y silencio (P26-A2): lo que no es habla no se envía.
check(cleanTranscript('[Música]') === '', 'música entre corchetes: nada que enviar');
check(cleanTranscript('Llama a Ana [música]') === 'Llama a Ana', 'se quita la etiqueta y queda lo dicho');
check(cleanTranscript('♪ ♪ (risas) *suspiro*') === '', 'notas, risas y suspiros: nada');
check(cleanTranscript('Gracias por ver') === '', 'frase de relleno de whisper');
check(cleanTranscript('Contactos: Ana, Pedro.') === '', 'eco del vocabulario: se descarta');
check(cleanTranscript('¿Qué hora es?') === '¿Qué hora es?', 'una pregunta normal no se toca');
check(cleanTranscript('  sí,   hazlo  ') === 'sí, hazlo', 'espacios sobrantes');
check(cleanTranscript('...') === '', 'solo signos: nada');

// Vocabulario (P26-A1): órdenes y contactos para whisper y para la corrección.
check(whisperPrompt(['Ana', 'Pedro']).includes('Contactos: Ana, Pedro.'), 'el prompt lleva los contactos');
check(!whisperPrompt([]).includes('Contactos'), 'sin contactos no hay lista');
check(whisperPrompt(Array.from({ length: 40 }, (_, i) => `Q${i}`)).split('Q').length - 1 === 25, 'como mucho 25 contactos en el prompt');
check(voiceVocabulary(['Ana', 'llama']).filter((w) => w === 'llama').length === 1, 'el vocabulario no repite palabras');
check(voiceVocabulary(['  Ana  ', '']).includes('Ana') && COMMAND_WORDS.every((w) => voiceVocabulary([]).includes(w)), 'nombres limpios y órdenes incluidas');

// Corrección por palabras (P26-A3).
check(editDistance('kitten', 'sitting') === 3 && editDistance('', 'ab') === 2, 'distancia de edición');
check(correctWords('llama a Anna', ['Ana', 'Pedro']) === 'llama a Ana', 'Anna → Ana (un contacto casi igual)');
check(correctWords('mandame un mensaje a Pedrro', ['Pedro']) === 'mandame un mensaje a Pedro', 'palabras largas admiten dos letras de diferencia');
check(correctWords('agenda la reunion mañana', voiceVocabulary([])) === 'agenda la reunion mañana', 'una palabra ya conocida no se toca');
check(correctWords('Marxo', ['Mario', 'Marco']) === 'Marxo', 'si dos términos quedan igual de cerca, no adivina');
check(correctWords('a Ana le digo', ['Pedro']) === 'a Ana le digo', 'palabras cortas no se tocan');

// Guardas de la reescritura del modelo: solo palabras sueltas, sin números ni respuestas.
check(acceptRefinement('llama a Anna', 'llama a Ana') === 'llama a Ana', 'una corrección de una palabra se acepta');
check(acceptRefinement('llama a Ana', 'Llama a Ana, por favor, ahora mismo') === null, 'añadir palabras no se acepta');
check(acceptRefinement('pon alarma a las siete', 'pon alarma a las 7') === null, 'no se inventan cifras');
check(acceptRefinement('llama a Ana', 'Respuesta: llama a Ana') === null, 'no se acepta un prefijo de respuesta');
check(acceptRefinement('llama a Ana', '«llama a Ana»') === 'llama a Ana', 'las comillas se quitan');
check(acceptRefinement('anota comprar pan', 'Claro, anota comprar pan') === null, 'una frase de cortesía añadida no se acepta');

(async () => {
  // Con la planilla entendida no hace falta el modelo.
  let asked = 0;
  const r1 = await refineTranscript('llama a Anna', {
    vocabulary: voiceVocabulary(['Ana']),
    names: ['Ana'],
    complete: async () => {
      asked++;
      return 'llama a Ana';
    },
  });
  check(r1.text === 'llama a Ana' && r1.changed && asked === 0, 'la planilla entiende la frase: basta el vocabulario');

  // Una frase que la planilla no entiende la corrige el modelo, si lo hace bien.
  asked = 0;
  const frase = 'quiero que le digas a Anna que llegue tarde';
  const r2 = await refineTranscript(frase, {
    vocabulary: voiceVocabulary(['Ana']),
    names: ['Ana'],
    complete: async () => {
      asked++;
      return 'quiero que le digas a Ana que llegue tarde';
    },
  });
  check(r2.text === 'quiero que le digas a Ana que llegue tarde' && asked === 1 && r2.changed, 'el modelo corrige una frase que la planilla no entiende');

  // Si el modelo responde en vez de corregir, se descarta.
  const r3 = await refineTranscript(frase, {
    vocabulary: voiceVocabulary(['Ana']),
    names: [],
    complete: async () => 'Claro, se lo digo a Ana.',
  });
  check(r3.text === 'quiero que le digas a Ana que llegue tarde', 'una respuesta del modelo que no es una corrección se descarta');

  // Sin modelo cargado, o si falla, queda lo corregido por el vocabulario.
  const r4 = await refineTranscript(frase, { vocabulary: voiceVocabulary(['Ana']), names: [], complete: null });
  check(r4.text === 'quiero que le digas a Ana que llegue tarde', 'sin modelo: solo el vocabulario');
  const r5 = await refineTranscript(frase, {
    vocabulary: voiceVocabulary(['Ana']),
    names: [],
    complete: async () => {
      throw new Error('fallo del modelo');
    },
  });
  check(r5.text === 'quiero que le digas a Ana que llegue tarde', 'si el modelo falla, no se rompe el dictado');

  // Si nada cambió, no se enseña «Oí».
  const r6 = await refineTranscript('quiero que le digas a Ana que llegue tarde', { vocabulary: voiceVocabulary(['Ana']), names: [], complete: null });
  check(r6.changed === false, 'si nada cambió, no se muestra lo que se oyó');
  done();
})();
