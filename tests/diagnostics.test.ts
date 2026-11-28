import { exitReasonLabel, formatReport, hasCrash, isAbnormalExit, parseDiagnostics } from '@/lib/diagnostics';
import { check, done } from './helpers';

check(exitReasonLabel(3).includes('memoria'), 'motivo 3 = falta de memoria');
check(exitReasonLabel(5).includes('llama.cpp'), 'motivo 5 = fallo nativo');
check(exitReasonLabel(99) === 'Motivo 99', 'motivo desconocido');
check(isAbnormalExit(5) && isAbnormalExit(3) && !isAbnormalExit(1) && !isAbnormalExit(10), 'cierres anormales frente a normales');

check(parseDiagnostics(null) === null && parseDiagnostics('no es json') === null, 'parseDiagnostics: entradas inválidas');

const base = { crashLog: '', sessionLog: '12ms start\n30ms backend ok\n', exits: [], sdk: 35, device: 'Marca Modelo' };
const clean = parseDiagnostics(JSON.stringify(base))!;
check(clean.exits.length === 0 && clean.sdk === 35, 'parseDiagnostics: informe válido');
check(!hasCrash(clean), 'sin cierres: no hay aviso');

const crashed = parseDiagnostics(
  JSON.stringify({
    ...base,
    crashLog: '100ms gen: evaluando el prompt\nSIGNAL 11 addr=0x0\n',
    exits: [{ reason: 5, description: 'crash', status: 0, timestamp: 1763900000000, rssKb: 2048000, trace: 'libpyrohorns_llama.so\nllama_process' }],
  }),
)!;
check(hasCrash(crashed), 'rastro de cierre: hay aviso');
check(hasCrash(parseDiagnostics(JSON.stringify({ ...base, exits: [{ reason: 3, description: '', status: 0, timestamp: 1, rssKb: 1 }] }))), 'solo motivo del sistema: hay aviso');
check(!hasCrash(parseDiagnostics(JSON.stringify({ ...base, exits: [{ reason: 10, description: '', status: 0, timestamp: 1, rssKb: 1 }] }))), 'cierre pedido por el usuario: sin aviso');

const text = formatReport(crashed);
check(text.includes('SIGNAL 11') && text.includes('Marca Modelo'), 'informe: rastro y dispositivo');
check(text.includes('Fallo nativo') && text.includes('2000 MB') && text.includes('libpyrohorns_llama.so'), 'informe: motivo, RAM y traza nativa');
check(formatReport(clean).includes('(ninguno)'), 'informe sin cierres');
const byUser = parseDiagnostics(JSON.stringify({ ...base, crashLog: '200ms gen: 128 tokens\n\n# motivo-android=10\n' }))!;
check(!hasCrash(byUser), 'cierre del usuario a mitad de respuesta: sin aviso de fallo');
const userText = formatReport(byUser);
check(userText.includes('al cerrar tú la app') && userText.includes('128 tokens') && !userText.includes('motivo-android'), 'informe: lo titula como cierre del usuario');
check(hasCrash(parseDiagnostics(JSON.stringify({ ...base, crashLog: 'SIGNAL 6\n# motivo-android=5\n' }))), 'fallo nativo con motivo: sí avisa');
const local = new Date(2026, 10, 28, 11, 54, 35);
const stamped = formatReport({ ...clean, exits: [{ reason: 10, description: '', status: 0, timestamp: local.getTime(), rssKb: 1024 }] });
check(stamped.includes('2026-11-28 11:54:35'), 'las horas son las del teléfono');

check(formatReport(clean, 'PyroHorns 0.1.0 (abc)').startsWith('PyroHorns 0.1.0 (abc)\n'), 'informe con la versión instalada');

done();
