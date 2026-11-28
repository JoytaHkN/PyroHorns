import { modelById } from '@/data/models';

/**
 * Para que las preguntas del modelo se puedan responder tocando (pedido por el usuario el 2026-11-25). Solo en la nube:
 * un modelo pequeño del teléfono respondió copiando el ejemplo (P32-1); en esos basta «pregunta + lista» (options.ts).
 */
const OPTIONS =
  ' Solo cuando necesites que el usuario decida algo, haz la pregunta y pon al final las respuestas posibles así:\n' +
  '```opciones\nPrimera respuesta\nSegunda respuesta\n```';

/** Instrucción que recibe el modelo antes de la conversación. */
export function systemPrompt(modelId: string): string {
  const model = modelById(modelId);
  const where = model.cloud
    ? 'Funcionas en un servicio en la nube. '
    : 'Funcionas en el teléfono del usuario, sin nube. La app puede buscar en internet cuando el usuario activa el botón del globo. ';
  const length = model.cloud
    ? 'Responde en el idioma del usuario. En programación y planificación sé completo y concreto; en lo demás, breve.'
    : 'Responde en su idioma, de forma breve y directa; extiéndete solo si lo pide o la tarea lo requiere.';
  return `Eres PyroHorns y usas el modelo ${model.name}. ${where}${length}${model.cloud ? OPTIONS : ''}`;
}
