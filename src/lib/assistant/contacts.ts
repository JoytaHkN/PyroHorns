/** A qué contacto se refiere un nombre dicho o escrito (P32-2). */
import type { PhoneContact } from './run';

/** Candidatos que se ofrecen para tocar. */
const MAX_CHOICES = 5;

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
const words = (s: string) => fold(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

export type ContactPick = { contact: PhoneContact } | { candidates: PhoneContact[] } | null;

/**
 * Se elige solo si no hay duda: el nombre completo, o un único contacto con todas las palabras dichas enteras.
 * Un comienzo de palabra («Bar» en «Barra») no basta: se ofrecen los candidatos. Con `exact` (el usuario tocó uno),
 * vale únicamente el nombre completo.
 */
export function pickContact(name: string, list: PhoneContact[], exact = false): ContactPick {
  const same = list.filter((c) => fold(c.name) === fold(name));
  if (exact) return same[0] ? { contact: same[0] } : null;
  if (!list.length) return null;
  if (same.length === 1) return { contact: same[0]! };
  const wanted = words(name);
  const whole = list.filter((c) => {
    const own = words(c.name);
    return wanted.every((w) => own.includes(w));
  });
  if (whole.length === 1) return { contact: whole[0]! };
  return { candidates: (whole.length ? whole : list).slice(0, MAX_CHOICES) };
}
