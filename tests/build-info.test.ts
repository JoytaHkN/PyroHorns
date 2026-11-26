import { formatBuild } from '@/lib/build-info';
import { check, done } from './helpers';

check(formatBuild('0.1.0', undefined) === 'PyroHorns 0.1.0 (sin datos de compilación)', 'sin datos');
check(
  formatBuild('0.1.0', { sha: '908ba60abcdef', number: 64, date: '2026-11-26' }) === 'PyroHorns 0.1.0 (compilación 64 · 908ba60 · 2026-11-26)',
  'con commit, número y fecha',
);
check(formatBuild(undefined, { sha: 'abc' }) === 'PyroHorns ? (abc)', 'datos incompletos');
done();
