import { ThinkSplitter, type ThinkPart } from '@/lib/think-parser';
import { check, done } from './helpers';

/** Une las partes consecutivas del mismo tipo para comparar sin depender de cómo se troceó la entrada. */
function run(chunks: string[]): ThinkPart[] {
  const s = new ThinkSplitter();
  const parts = [...chunks.flatMap((c) => s.push(c)), ...s.flush()];
  const merged: ThinkPart[] = [];
  for (const p of parts) {
    const last = merged[merged.length - 1];
    if (last && last.kind === p.kind) last.text += p.text;
    else merged.push({ ...p });
  }
  return merged;
}
const same = (a: ThinkPart[], b: ThinkPart[]) => JSON.stringify(a) === JSON.stringify(b);

check(same(run(['Hola mundo']), [{ kind: 'text', text: 'Hola mundo' }]), 'sin razonamiento: todo es texto');

const full = '<think>Pienso un rato</think>Respuesta final';
const expected: ThinkPart[] = [
  { kind: 'thinking', text: 'Pienso un rato' },
  { kind: 'text', text: 'Respuesta final' },
];
check(same(run([full]), expected), 'razonamiento y respuesta en un solo trozo');
check(same(run(full.split('')), expected), 'carácter a carácter: las etiquetas partidas se reconocen');
check(same(run(['<thi', 'nk>Pienso un ra', 'to</thi', 'nk>Respuesta final']), expected), 'etiquetas partidas entre trozos');

check(
  same(run(['<think>\nrazono\n</think>\n\nHola']), [
    { kind: 'thinking', text: 'razono\n' },
    { kind: 'text', text: 'Hola' },
  ]),
  'se quitan los saltos de línea que rodean a las etiquetas',
);

check(same(run(['<think>\n\n</think>\n\nHola']), [{ kind: 'text', text: 'Hola' }]), 'bloque vacío (Profundo apagado): no hay razonamiento');

check(
  same(run(['a < b y 3 <tr', 'es']), [{ kind: 'text', text: 'a < b y 3 <tres' }]),
  'un «<» que no abre etiqueta no se pierde',
);
check(same(run(['Texto <thi']), [{ kind: 'text', text: 'Texto <thi' }]), 'al terminar, un comienzo de etiqueta retenido se entrega como texto');
check(
  same(run(['<think>sin cerrar']), [{ kind: 'thinking', text: 'sin cerrar' }]),
  'razonamiento sin cerrar (se cortó la generación): se conserva como razonamiento',
);

done();
