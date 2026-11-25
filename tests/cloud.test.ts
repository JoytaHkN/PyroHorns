import { modelById } from '@/data/models';
import { extractOptions } from '@/lib/options';
import { CloudError, createCloudProvider, type CloudFetch } from '@/providers/cloud';
import type { StreamEvent } from '@/providers/types';
import { check, done } from './helpers';

const sse = (chunks: string[]) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      for (const x of chunks) c.enqueue(new TextEncoder().encode(x));
      c.close();
    },
  });
const delta = (d: object) => `data: ${JSON.stringify({ choices: [{ delta: d }] })}\n\n`;
const opts = { modelId: 'nvidia:nvidia/nemotron-3-ultra-550b-a55b', mode: 'general' as const, deep: false, contextTokens: 32768 };

async function run(fetcher: CloudFetch, key: string | null = 'clave-secreta', modelId = opts.modelId) {
  const events: StreamEvent[] = [];
  const provider = createCloudProvider(fetcher, async () => key);
  try {
    for await (const ev of provider.stream([{ role: 'user', content: 'hola' }], { ...opts, modelId })) events.push(ev);
    return { events, error: null };
  } catch (e) {
    return { events, error: e as Error };
  }
}

(async () => {
  let seen: { url: string; auth: string | undefined; body: { model: string; stream: boolean } } | undefined;
  const line = delta({ content: 'Hola ' });
  const ok = await run(async (url, init) => {
    seen = { url, auth: init.headers.Authorization, body: JSON.parse(init.body) };
    // La primera línea llega partida en dos trozos.
    return { ok: true, status: 200, body: sse([delta({ reasoning_content: 'pienso' }), line.slice(0, 15), line.slice(15), delta({ content: 'mundo' }), 'data: [DONE]\n\n']) };
  });
  const text = ok.events.flatMap((e) => (e.type === 'token' ? [e.text] : [])).join('');
  check(text === 'Hola mundo' && ok.events.some((e) => e.type === 'thinking_delta'), 'respuesta en streaming y razonamiento aparte');
  check(ok.events.at(-1)?.type === 'done' && ok.events.some((e) => e.type === 'usage'), 'métricas y fin');
  check(
    seen!.url === 'https://integrate.api.nvidia.com/v1/chat/completions' && seen!.auth === 'Bearer clave-secreta' && seen!.body.model === modelById('nvidia:nvidia/nemotron-3-ultra-550b-a55b').cloud!.apiModel,
    'dirección, clave y modelo',
  );
  const noKey = await run(async () => {
    throw new Error('no debe llamarse');
  }, null);
  check(noKey.error instanceof CloudError && noKey.error.message.includes('Falta la clave'), 'sin clave no sale nada');
  for (const [status, word] of [[401, 'no es válida'], [429, 'límite'], [404, 'ya no ofrece'], [500, '500']] as const) {
    const r = await run(async () => ({ ok: false, status, body: null }));
    check(r.error instanceof CloudError && r.error.message.includes(word) && !r.error.message.includes('clave-secreta'), `error ${status}`);
  }
  const offline = await run(async () => {
    throw new Error('Bearer clave-secreta');
  });
  check(offline.error instanceof CloudError && !offline.error.message.includes('clave-secreta'), 'S9: el error no lleva la clave');

  // Pollinations no pide clave: sin cabecera de autorización y con su ruta propia.
  let keyless: { url: string; auth: string | undefined } | undefined;
  const free = await run(
    async (url, init) => {
      keyless = { url, auth: init.headers.Authorization };
      return { ok: true, status: 200, body: sse([delta({ content: 'hola' }), 'data: [DONE]\n\n']) };
    },
    null,
    'pollinations:openai',
  );
  check(free.error === null && keyless?.url === 'https://text.pollinations.ai/openai/chat/completions' && keyless?.auth === undefined, 'sin clave: Pollinations responde sin cabecera de autorización');
  check(modelById('nvidia:nvidia/nemotron-3-ultra-550b-a55b').cloud?.provider === 'nvidia', 'el catálogo asigna cada modelo a su empresa');

  const block = extractOptions('¿Qué prefieres?\n```opciones\nUna web\n- Una app\n```');
  check(block.text === '¿Qué prefieres?' && block.options.join('|') === 'Una web|Una app', 'bloque de opciones');
  check(extractOptions('Elige:\n```opciones\nA').options.length === 1, 'bloque aún sin cerrar (streaming)');
  check(extractOptions('¿Con cuál sigo?\n\n1. **HTML**\n2. Python').options.join('|') === 'HTML|Python', 'pregunta y lista');
  check(extractOptions('Opciones:\n- Sí\n- No\n\n¿Te sirve alguna?').options.length === 2, 'lista y pregunta');
  check(extractOptions('Los pasos son:\n1. Instalar\n2. Abrir').options.length === 0, 'una lista sin pregunta no se convierte');
  check(extractOptions('¿Ejemplo?\n- ' + 'x'.repeat(200) + '\n- b').options.length === 0, 'opciones demasiado largas: no');
  done();
})();
