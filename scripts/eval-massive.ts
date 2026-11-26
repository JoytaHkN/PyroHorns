/**
 * P27-F1: mide la planilla de intenciones con MASSIVE (es-ES). Función pura: recibe el JSONL como texto y devuelve
 * dos textos; la lectura y escritura de ficheros las hace `scripts/eval-massive.mjs`.
 * MASSIVE es de Amazon, con licencia CC BY 4.0: las frases solo van al informe externo (fuera del repo), y el
 * resumen (solo cifras) es lo que se anota en `docs/integraciones.md`.
 */
import { parseRoute, type Route } from '@/lib/assistant/intents';

/** Intenciones de MASSIVE que la app sabe hacer, y qué salidas de la planilla cuentan como acierto. */
export const SUPPORTED: Record<string, string[]> = {
  alarm_set: ['action:alarm', 'action:timer', 'question'],
  calendar_set: ['action:event', 'question'],
  datetime_query: ['answer'],
  lists_createoradd: ['action:task', 'action:note', 'question'],
  lists_query: ['action:list'],
  lists_remove: ['action:complete'],
  email_querycontact: ['action:email', 'question'],
};

/** Intenciones que la app no hace, pero en las que una salida concreta es útil y no cuenta como intercepción. */
export const TOLERATED: Record<string, string[]> = {
  calendar_query: ['action:openCalendar'],
};

interface Row {
  intent: string;
  n: number;
  supported: boolean;
  outcomes: Record<string, number>;
  /** Acierto (si la app la hace) o paso al modelo (si no la hace). */
  good: number;
}

/** Salida de la planilla en una etiqueta: `none`, `answer`, `question` o `action:<tipo>`. */
export function outcomeOf(route: Route | null): string {
  if (!route) return 'none';
  return route.kind === 'action' ? `action:${route.action.type}` : route.kind;
}

const pct = (a: number, b: number) => (b ? `${((100 * a) / b).toFixed(1).replace('.', ',')} %` : '—');
const top = (o: Record<string, number>) =>
  Object.entries(o)
    .sort((x, y) => y[1] - x[1])
    .map(([k, v]) => `${k} ${v}`)
    .join(' · ');

export function evaluateMassive(jsonl: string, partition: string, now: Date, maxExamples = 8): { summary: string; report: string } {
  const rows = new Map<string, Row>();
  const examples = new Map<string, string[]>();
  let total = 0;
  for (const line of jsonl.split('\n')) {
    if (!line.trim()) continue;
    const r = JSON.parse(line) as { partition: string; intent: string; utt: string };
    if (r.partition !== partition) continue;
    total++;
    const out = outcomeOf(parseRoute(r.utt, now));
    const accepted = SUPPORTED[r.intent];
    const ok = accepted ? accepted.includes(out) : out === 'none' || (TOLERATED[r.intent] ?? []).includes(out);
    const row = rows.get(r.intent) ?? { intent: r.intent, n: 0, supported: !!accepted, outcomes: {}, good: 0 };
    rows.set(r.intent, row);
    row.n++;
    row.outcomes[out] = (row.outcomes[out] ?? 0) + 1;
    if (ok) row.good++;
    else {
      const list = examples.get(r.intent) ?? [];
      if (list.length < maxExamples) list.push(`- «${r.utt}» → ${out}`);
      examples.set(r.intent, list);
    }
  }

  const all = [...rows.values()];
  const sup = all.filter((r) => r.supported).sort((a, b) => b.n - a.n);
  const uns = all.filter((r) => !r.supported);
  const supN = sup.reduce((s, r) => s + r.n, 0);
  const supGood = sup.reduce((s, r) => s + r.good, 0);
  const supNone = sup.reduce((s, r) => s + (r.outcomes.none ?? 0), 0);
  const unsN = uns.reduce((s, r) => s + r.n, 0);
  const unsBad = uns.reduce((s, r) => s + (r.n - r.good), 0);
  const intercepted = uns.filter((r) => r.n > r.good).sort((a, b) => b.n - b.good - (a.n - a.good));

  const lines = [
    `Frases (${partition}): ${total} · intenciones: ${all.length}`,
    '',
    `**La app las hace** (${sup.length} intenciones, ${supN} frases): acierta ${supGood} (${pct(supGood, supN)}); ` +
      `no las entiende y van al modelo ${supNone} (${pct(supNone, supN)}); acción equivocada ${supN - supGood - supNone} (${pct(supN - supGood - supNone, supN)}).`,
    '',
    `**La app no las hace** (${uns.length} intenciones, ${unsN} frases): pasan al modelo ${unsN - unsBad} (${pct(unsN - unsBad, unsN)}); ` +
      `la planilla las intercepta ${unsBad} (${pct(unsBad, unsN)}).`,
    '',
    '| Intención que la app hace | Frases | Acierto | Al modelo | Salidas |',
    '|---|---|---|---|---|',
    ...sup.map((r) => `| ${r.intent} | ${r.n} | ${pct(r.good, r.n)} | ${pct(r.outcomes.none ?? 0, r.n)} | ${top(r.outcomes)} |`),
    '',
    '| Intención que la app no hace (interceptadas) | Frases | Interceptadas | Salidas |',
    '|---|---|---|---|',
    ...intercepted.map((r) => `| ${r.intent} | ${r.n} | ${r.n - r.good} (${pct(r.n - r.good, r.n)}) | ${top(r.outcomes)} |`),
  ];
  const summary = lines.join('\n');

  const detail = [...examples.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([intent, list]) => `### ${intent}\n${list.join('\n')}`)
    .join('\n\n');
  const report = [
    '# Planilla de intenciones frente a MASSIVE es-ES',
    '',
    'Datos: MASSIVE 1.0 (Amazon, CC BY 4.0). Informe local: no se sube al repositorio.',
    '',
    summary,
    '',
    `## Ejemplos de fallos e intercepciones (hasta ${maxExamples} por intención)`,
    '',
    detail,
    '',
  ].join('\n');
  return { summary, report };
}
