import type { Usage } from '@/types/chat';

/** «149 tokens · 34 s · 6,3 tok/s». El tiempo es el total desde que se envió; la velocidad, solo la de generación. */
export function usageLine(u: Usage): string {
  return [
    `${u.completionTokens} tokens`,
    u.totalMs != null ? `${Math.max(1, Math.round(u.totalMs / 1000))} s` : null,
    `${u.tokPerSec.toFixed(1).replace('.', ',')} tok/s`,
  ]
    .filter(Boolean)
    .join(' · ');
}
