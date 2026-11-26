/**
 * Vocabulario del dictado (P26-A1): las palabras con las que se dan las órdenes y los nombres de los contactos.
 * Lo usan whisper (como frase inicial), la corrección por palabras y el modelo.
 */

/** Palabras de las órdenes: un dictado que casi coincida con alguna se corrige hacia ella. */
export const COMMAND_WORDS = [
  'llama', 'llamar', 'marca', 'whatsapp', 'correo', 'anota', 'anotar', 'nota', 'tarea', 'tareas', 'pendientes',
  'agenda', 'agendar', 'evento', 'reunión', 'cita', 'calendario', 'recordatorio', 'alarma', 'despiértame',
  'temporizador', 'abre', 'muéstrame', 'hecha', 'mañana', 'pasado', 'lunes', 'martes', 'miércoles', 'jueves',
  'viernes', 'sábado', 'domingo',
];

/** Órdenes y nombres, sin repetidos. */
export function voiceVocabulary(names: string[]): string[] {
  return [...new Set([...COMMAND_WORDS, ...names.map((n) => n.trim()).filter(Boolean)])];
}

/** Frase inicial para whisper: enseña cómo se dan las órdenes y cómo se llaman los contactos (hasta 25). */
export function whisperPrompt(names: string[]): string {
  const people = names.map((n) => n.trim()).filter(Boolean).slice(0, 25);
  const lead =
    'Dictado en español para un asistente de voz. Órdenes: «llama a Ana», «anota comprar pan», ' +
    '«agenda la reunión el viernes a las 10», «pon una alarma a las 7».';
  return people.length ? `${lead} Contactos: ${people.join(', ')}.` : lead;
}
