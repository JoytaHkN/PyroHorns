/** Informe de cierres inesperados del motor nativo (F1.5). Sin conversaciones ni claves (S9). */

export interface ExitInfo {
  reason: number;
  description: string;
  status: number;
  timestamp: number;
  rssKb: number;
  trace?: string;
}

export interface Diagnostics {
  crashLog: string;
  sessionLog: string;
  exits: ExitInfo[];
  sdk: number;
  device: string;
}

/** Motivos de ApplicationExitInfo (Android 11+). */
const EXIT_REASONS: Record<number, string> = {
  0: 'Desconocido',
  1: 'La app se cerró a sí misma',
  2: 'Señal del sistema (proceso matado)',
  3: 'Android lo cerró por falta de memoria (LOW_MEMORY)',
  4: 'Fallo de Java o JavaScript (CRASH)',
  5: 'Fallo nativo: el motor llama.cpp se cayó (CRASH_NATIVE)',
  6: 'La app dejó de responder (ANR)',
  7: 'Fallo al iniciar',
  8: 'Cambio de permisos (Android reinicia la app al conceder o quitar uno)',
  9: 'Uso excesivo de recursos',
  10: 'Cerrada por el usuario',
  11: 'Detenida por el usuario',
  12: 'Murió una dependencia',
  13: 'Otro motivo',
  14: 'Congelada por el sistema',
  15: 'Cambio de estado del paquete',
  16: 'Paquete actualizado',
};

export function exitReasonLabel(code: number): string {
  return EXIT_REASONS[code] ?? `Motivo ${code}`;
}

/** Motivos que indican que algo fue mal (no un cierre normal ni pedido por el usuario). */
export function isAbnormalExit(code: number): boolean {
  return [2, 3, 4, 5, 6, 7, 9, 14].includes(code);
}

export function parseDiagnostics(json: string | null): Diagnostics | null {
  if (!json) return null;
  try {
    const d = JSON.parse(json) as Partial<Diagnostics>;
    return {
      crashLog: String(d.crashLog ?? ''),
      sessionLog: String(d.sessionLog ?? ''),
      exits: Array.isArray(d.exits) ? d.exits : [],
      sdk: Number(d.sdk ?? 0),
      device: String(d.device ?? ''),
    };
  } catch {
    return null;
  }
}

/** ¿Hay algo que mostrar como «cierre inesperado»? */
export function hasCrash(d: Diagnostics | null): boolean {
  return !!d && (d.crashLog.trim().length > 0 || d.exits.some((e) => isAbnormalExit(e.reason)));
}

function when(ts: number): string {
  return ts > 0 ? new Date(ts).toISOString().replace('T', ' ').slice(0, 19) : 'sin fecha';
}

/** Texto plano para leer en pantalla o pegar en un chat. */
export function formatReport(d: Diagnostics, app?: string): string {
  const lines: string[] = [...(app ? [app] : []), `Dispositivo: ${d.device || 'desconocido'} · Android SDK ${d.sdk}`, ''];
  lines.push('— Último rastro de un cierre del motor —');
  lines.push(d.crashLog.trim() || '(ninguno)', '');
  lines.push('— Rastro de esta sesión —');
  lines.push(d.sessionLog.trim() || '(vacío)', '');
  lines.push('— Cierres que registró Android —');
  if (d.exits.length === 0) lines.push('(ninguno o no disponible)');
  for (const e of d.exits) {
    lines.push(`${when(e.timestamp)} · ${exitReasonLabel(e.reason)}${e.description ? ` · «${e.description}»` : ''} · estado ${e.status} · RAM ${Math.round(e.rssKb / 1024)} MB`);
    if (e.trace?.trim()) lines.push('  traza nativa:', ...e.trace.trim().split('\n').slice(0, 40).map((l) => `    ${l}`));
  }
  return lines.join('\n');
}
