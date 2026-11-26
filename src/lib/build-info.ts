/** Qué compilación está instalada (P31-M4). Los datos los pone la CI en `app.config.js`. */
export interface BuildInfo {
  sha?: string;
  /** Número de commits del repo: es también el `versionCode` del APK. */
  number?: number;
  date?: string;
}

export function formatBuild(version: string | undefined, build: BuildInfo | undefined): string {
  const name = `PyroHorns ${version || '?'}`;
  if (!build?.sha) return `${name} (sin datos de compilación)`;
  const parts = [build.number ? `compilación ${build.number}` : '', build.sha.slice(0, 7), build.date ?? ''];
  return `${name} (${parts.filter(Boolean).join(' · ')})`;
}
