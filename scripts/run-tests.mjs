// Pruebas de lógica sin el móvil: esbuild empaqueta cada tests/*.test.ts y node lo ejecuta.
// Las consultas SQL se prueban de verdad con node:sqlite (Node 22.13+).
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { build } from 'esbuild';

const root = resolve(import.meta.dirname, '..');
const out = mkdtempSync(join(tmpdir(), 'pyrohorns-tests-'));
const only = process.argv[2];
const files = readdirSync(join(root, 'tests'))
  .filter((f) => f.endsWith('.test.ts') && (!only || f.includes(only)))
  .sort();

let failed = 0;
try {
  for (const f of files) {
    const outfile = join(out, f.replace(/\.ts$/, '.mjs'));
    await build({
      entryPoints: [join(root, 'tests', f)],
      outfile,
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: 'node22',
      tsconfig: join(root, 'tsconfig.json'),
      alias: {
        // Los ajustes usan AsyncStorage; en node se sustituye por un almacén en memoria.
        '@react-native-async-storage/async-storage': join(root, 'tests/shims/async-storage.ts'),
      },
      define: { __DEV__: 'false' },
      banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
      logLevel: 'error',
    });
    console.log(`\n▶ ${f}`);
    const r = spawnSync(process.execPath, ['--no-warnings', outfile], { stdio: 'inherit' });
    if (r.status !== 0) failed++;
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}

console.log(failed ? `\n✗ ${failed} de ${files.length} archivos con fallos` : `\n✓ ${files.length} archivos de pruebas OK`);
process.exit(failed ? 1 : 0);
