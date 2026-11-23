import { buildContext, estimateTokens, formatTokens } from '@/lib/context';
import type { Message } from '@/types/chat';
import { check, done } from './helpers';

const msg = (i: number, role: Message['role'], content: string, extra: Partial<Message> = {}): Message => ({
  id: `m${i}`,
  role,
  content,
  createdAt: i,
  ...extra,
});

const long = 'x'.repeat(400); // ≈ 104 tokens

const history: Message[] = Array.from({ length: 10 }, (_, i) => msg(i, i % 2 ? 'assistant' : 'user', `${i} ${long}`));
const ctx = buildContext(history, { contextTokens: 600, reserveTokens: 150 });
check(ctx.length === 4, `descarta los mensajes más antiguos cuando no caben (quedan ${ctx.length})`);
check(ctx[ctx.length - 1]!.content.startsWith('9 '), 'conserva los más recientes, en orden');

const withThinking = buildContext([msg(1, 'user', 'hola'), msg(2, 'assistant', 'respuesta', { thinking: 'razonamiento secreto' })], {
  contextTokens: 8192,
});
check(
  withThinking.length === 2 && !JSON.stringify(withThinking).includes('razonamiento secreto'),
  'nunca reenvía el razonamiento',
);

const filtered = buildContext(
  [msg(1, 'user', 'a'), msg(2, 'assistant', 'fallo', { status: 'error' }), msg(3, 'assistant', '   '), msg(4, 'user', 'b')],
  { contextTokens: 8192 },
);
check(filtered.map((m) => m.content).join(',') === 'a,b', 'omite errores y respuestas vacías');

const huge = buildContext([msg(1, 'user', 'antiguo'), msg(2, 'user', 'y'.repeat(10000))], { contextTokens: 1024 });
check(huge.length === 1 && huge[0]!.content.length === 10000, 'el último mensaje del usuario siempre entra');

check(estimateTokens('abcd') === 5, 'estimación de tokens');
check(formatTokens(950) === '950' && formatTokens(4300) === '4.3K' && formatTokens(8192) === '8K' && formatTokens(16384) === '16K', 'formato de tokens');

done();
