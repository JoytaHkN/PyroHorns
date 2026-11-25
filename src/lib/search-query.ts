import type { ProviderMessage } from '@/providers/types';

/** Mensajes cortos y que se entienden solos van tal cual al buscador; los largos o que remiten a lo anterior se resumen. */
export function needsRewrite(text: string, previous?: string): boolean {
  const t = text.trim();
  if (t.split(/\s+/).length > 8) return true;
  return !!previous && /^¿?\s*y\s|(^|\s)(es[eao]s?|est[eao]s?|ell[oa]s?)(?=$|[\s?!.,])/i.test(t);
}

export function queryMessages(question: string, previous?: string): ProviderMessage[] {
  return [
    {
      role: 'system',
      content:
        'Conviertes mensajes en búsquedas para un buscador web. Responde solo con la búsqueda, de 3 a 10 palabras, ' +
        'en el idioma del mensaje, corrigiendo las erratas. Sin comillas ni explicaciones.',
    },
    {
      role: 'user',
      content: `${previous ? `Antes preguntó: ${previous.slice(0, 200)}\n` : ''}Mensaje: ${question.slice(0, 600)}\nBúsqueda:`,
    },
  ];
}

/** La respuesta del modelo convertida en consulta, o null si no sirve (entonces se busca el mensaje original). */
export function cleanQuery(raw: string): string | null {
  const line =
    raw
      .replace(/<think>[\s\S]*?(<\/think>|$)/g, '')
      .split('\n')
      .map((l) => l.trim())
      .find(Boolean) ?? '';
  const q = line
    .replace(/^(\*\*)?(búsqueda|busqueda|consulta|query)(\*\*)?\s*:\s*/i, '')
    .replace(/[*`"“”«»]/g, '')
    .replace(/[.\s]+$/, '')
    .trim();
  if (!q || q.length > 120 || q.split(/\s+/).length > 16 || q.includes('<|')) return null;
  return q;
}
