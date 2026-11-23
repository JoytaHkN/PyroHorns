/**
 * Registros técnicos (S9-B): solo eventos y datos técnicos, nunca contenido de conversaciones
 * ni claves. Sin telemetría: nada sale del dispositivo.
 */
type Meta = Record<string, string | number | boolean | null | undefined>;

/** Nombre y mensaje del error, recortados. No incluye pilas ni parámetros de consultas. */
export function errorSummary(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`.slice(0, 200);
  return String(err).slice(0, 200);
}

export const log = {
  info(event: string, meta?: Meta) {
    if (__DEV__) console.log(`[pyrohorns] ${event}`, meta ?? '');
  },
  warn(event: string, meta?: Meta) {
    console.warn(`[pyrohorns] ${event}`, meta ?? '');
  },
  error(event: string, err?: unknown, meta?: Meta) {
    console.error(`[pyrohorns] ${event}`, err === undefined ? '' : errorSummary(err), meta ?? '');
  },
};
