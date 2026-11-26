// P27-F1: mide la planilla de intenciones con MASSIVE (es-ES). Se ejecuta en la caché de compilación:
//   sh scripts/sync-build.sh node scripts/eval-massive.mjs "<APK IA>/datasets/massive-1.0/1.0/data/es-ES.jsonl" "<informe.md>" [test|dev|train]
// Los datos y el informe con frases de ejemplo viven fuera del repo (APK IA/datasets/); por la consola solo salen cifras.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const [input, output, partition = 'test'] = process.argv.slice(2);
if (!input || !output) {
  console.error('Uso: node scripts/eval-massive.mjs <es-ES.jsonl> <informe.md> [test|dev|train]');
  process.exit(2);
}

const root = resolve(import.meta.dirname, '..');
const dir = mkdtempSync(join(tmpdir(), 'pyrohorns-massive-'));
try {
  const outfile = join(dir, 'eval.mjs');
  await build({
    entryPoints: [join(root, 'scripts/eval-massive.ts')],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    tsconfig: join(root, 'tsconfig.json'),
    logLevel: 'error',
  });
  const { evaluateMassive } = await import(pathToFileURL(outfile).href);
  // Fecha fija: las fechas relativas («mañana», «el viernes») dan siempre el mismo resultado.
  const now = new Date(2026, 10, 26, 10, 0);
  const { summary, report } = evaluateMassive(readFileSync(input, 'utf8'), partition, now);
  writeFileSync(output, report);
  console.log(summary);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
