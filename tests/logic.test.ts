import { modelForMode } from '@/data/agents';
import { estimateRamGiB, fitsInMemory, modelById } from '@/data/models';
import { migrate } from '@/db/schema';
import { SqlChatRepo } from '@/db/sql-repo';
import { regenerate, send, setProvider, stop } from '@/lib/engine';
import { MockProvider } from '@/providers/mock';
import { usageLine } from '@/lib/stats';
import { attachRepo, flushWrites, searchConversations, useChat } from '@/store/chat';
import { activeModelId, useSettings } from '@/store/settings';
import { check, done, nodeDb } from './helpers';

const conv = (id: string) => useChat.getState().conversations.find((c) => c.id === id)!;

(async () => {
  // D1: el modo elige el modelo.
  check(
    modelForMode('general').id === 'lfm3-1.7b' &&
      modelForMode('plan').id === 'lfm3-1.7b' &&
      modelForMode('code').id === 'qwen3-1.7b' &&
      modelForMode('debug').id === 'qwen3-1.7b' &&
      modelForMode('red').id === 'cybersecqwen-4b' &&
      modelForMode('blue').id === 'cybersecqwen-4b',
    'el modo elige el modelo (D1)',
  );

  // Regla de memoria (PLAN, sección 3).
  const lfm = estimateRamGiB(modelById('lfm3-1.7b'), 8192);
  check(lfm > 1.4 && lfm < 1.6, `LFM3 con 8K ≈ 1,5 GiB (${lfm.toFixed(2)})`);
  check(!fitsInMemory(modelById('phi-3.5-mini'), 8192, 4), 'Phi-3.5 con 8K no cabe con 4 GiB libres');
  check(fitsInMemory(modelById('cybersecqwen-4b'), 4096, 4.2), 'CyberSecQwen con 4K cabe con 4,2 GiB libres');

  // Ajustes: modo, modelo manual (Avanzado) y Profundo.
  const s = useSettings.getState();
  s.setMode('code');
  check(activeModelId(useSettings.getState()) === 'qwen3-1.7b', 'Programación usa Qwen3');
  useSettings.getState().setModelOverride('lfm3-1.7b');
  check(activeModelId(useSettings.getState()) === 'lfm3-1.7b', 'modelo manual en Avanzado');
  useSettings.getState().setMode('red');
  check(
    useSettings.getState().modelOverride === null && activeModelId(useSettings.getState()) === 'cybersecqwen-4b',
    'cambiar de modo vuelve al modelo automático',
  );
  useSettings.getState().toggleDeep();
  check(useSettings.getState().deep, 'interruptor Profundo');

  // Persistencia real en SQLite (las mismas consultas que en Android).
  const db = nodeDb();
  const { fts } = await migrate(db);
  check(fts, 'FTS5 disponible');
  attachRepo(new SqlChatRepo(db, fts));

  useSettings.getState().setMode('code');
  useSettings.getState().setDeep(true);
  const id = await send('¿Cómo invierto una lista en Python?');
  await flushWrites();
  let c = conv(id);
  const ai = c.messages[1]!;
  check(c.messages.length === 2, 'mensaje del usuario + respuesta');
  check(ai.status === 'done' && ai.content.includes('Qwen3 1.7B'), 'streaming completo con el modelo del modo');
  check(!!ai.thinking && ai.thinking.length > 20, 'Profundo: razonamiento separado de la respuesta');
  check((ai.thinkMs ?? 0) > 0, 'Pensó N s: tiempo del razonamiento');
  check((ai.usage?.tokPerSec ?? 0) > 0 && (ai.usage?.completionTokens ?? 0) > 0, 'métricas de la respuesta');
  check(ai.modelId === 'qwen3-1.7b', 'modelo registrado en el mensaje');
  check(c.agent.mode === 'code' && c.agent.deep && c.agent.modelId === 'qwen3-1.7b', 'instantánea del agente');
  check(c.title.startsWith('¿Cómo invierto'), 'título automático');

  const reloaded = (await new SqlChatRepo(db, fts).loadAll()).conversations.find((x) => x.id === id)!;
  const rai = reloaded.messages[1]!;
  check(
    reloaded.messages.length === 2 &&
      rai.content === ai.content &&
      rai.thinking === ai.thinking &&
      rai.usage?.completionTokens === ai.usage?.completionTokens &&
      rai.status === 'done',
    'lo guardado en SQLite coincide con la memoria',
  );
  check(reloaded.agent.deep && reloaded.agent.modelId === 'qwen3-1.7b', 'instantánea del agente guardada');

  check((ai.usage?.totalMs ?? 0) > 0, 'tiempo total de la respuesta');
  check(
    usageLine({ promptTokens: 1, completionTokens: 149, ttftMs: 1, tokPerSec: 4.3, totalMs: 34100 }) ===
      '149 tokens · 34 s · 4,3 tok/s',
    'línea de métricas',
  );

  // Valoración y rama.
  useChat.getState().patchMessage(id, ai.id, { feedback: 'up' });
  const branched = useChat.getState().branch(id, ai.id)!;
  await flushWrites();
  check(
    conv(branched).messages.length === 2 && conv(branched).title.endsWith('(rama)') && conv(branched).messages[1]!.id !== ai.id,
    'ramificar copia la conversación hasta ese mensaje',
  );
  const saved = (await new SqlChatRepo(db, fts).loadAll()).conversations;
  check(saved.find((x) => x.id === id)!.messages[1]!.feedback === 'up', 'la valoración se guarda');
  check(saved.find((x) => x.id === branched)!.messages.length === 2, 'la rama se guarda');

  // Regenerar sustituye la última respuesta sin duplicar mensajes.
  await regenerate(branched);
  await flushWrites();
  check(
    conv(branched).messages.length === 2 && conv(branched).messages[1]!.status === 'done' && !conv(branched).messages[1]!.feedback,
    'regenerar sustituye la respuesta',
  );
  useChat.getState().select(id);

  // Detener a mitad.
  const p = send('segundo mensaje', id);
  setTimeout(() => stop(id), 700);
  await p;
  await flushWrites();
  c = conv(id);
  check(c.messages.length === 4 && c.messages[3]!.status === 'stopped', 'detener generación');
  const r2 = (await new SqlChatRepo(db, fts).loadAll()).conversations.find((x) => x.id === id)!;
  check(r2.messages[3]?.status === 'stopped', 'el estado detenido se guarda');

  // Búsqueda (FTS5, sin mayúsculas ni tildes).
  check((await searchConversations('python')).includes(id), 'búsqueda encuentra la conversación');
  check((await searchConversations('INVIÉRTO')).includes(id), 'búsqueda sin mayúsculas ni tildes');
  check((await searchConversations('zzzz')).length === 0, 'búsqueda sin resultados');

  // Borrar.
  useChat.getState().remove(branched);
  useChat.getState().select(id);
  useChat.getState().remove(id);
  await flushWrites();
  const after = await new SqlChatRepo(db, fts).loadAll();
  const left = await db.get<{ n: number }>('SELECT count(*) AS n FROM messages');
  check(after.conversations.length === 0 && left?.n === 0, 'borrar conversación (y sus mensajes en cascada)');
  check(useChat.getState().activeId === null, 'sin conversación activa tras borrar');

  // Internet: los resultados acompañan a la pregunta y las fuentes a la respuesta.
  const realFetch = globalThis.fetch;
  let searches = 0;
  globalThis.fetch = (async () => {
    searches++;
    return new Response(
      '<h2 class="result__title"><a href="https://fuente.example/a">Fuente</a></h2><a class="result__snippet">dato</a>',
      { status: 200 },
    );
  }) as typeof fetch;
  const wid = await send('¿Qué pasó hoy?', null, { web: true });
  await flushWrites();
  const found = (await new SqlChatRepo(db, fts).loadAll()).conversations.find((x) => x.id === wid)!;
  check(!!found.messages[0]!.web?.context?.includes('Fuente — dato'), 'los resultados se guardan con la pregunta');
  check(found.messages[1]!.web?.sources?.[0]?.url === 'https://fuente.example/a', 'las fuentes se guardan con la respuesta');
  await regenerate(wid);
  check(searches === 1 && conv(wid).messages[1]!.web?.sources?.length === 1, 'regenerar reutiliza la búsqueda');
  await send('sin internet', wid);
  check(searches === 1, 'sin el botón no se busca');

  // Bloqueo: se informa y no se responde como si hubiera buscado.
  globalThis.fetch = (async () => new Response('<div class="anomaly"></div>', { status: 202 })) as typeof fetch;
  const bid = await send('otra', null, { web: true });
  const failed = conv(bid).messages[1]!;
  check(failed.status === 'error' && failed.content.includes('bloqueó') && !failed.web, 'bloqueo de DuckDuckGo visible en el chat');
  // Un mensaje largo se convierte en una búsqueda corta antes de salir del teléfono.
  let sent = '';
  globalThis.fetch = (async (url: unknown) => {
    sent = String(url);
    return new Response('<h2 class="result__title"><a href="https://fuente.example/b">Otra</a></h2>', { status: 200 });
  }) as typeof fetch;
  setProvider({ ...MockProvider, complete: async () => 'Búsqueda: modelos para celular' });
  const qid = await send('me podrias buscar en internes si ahi algun modelo como tu para el celular', null, { web: true });
  check(conv(qid).messages[1]!.web?.query === 'modelos para celular', 'la consulta resumida se muestra con la respuesta');
  check(sent.endsWith('?q=modelos%20para%20celular'), 'al buscador sale la consulta resumida');
  setProvider(MockProvider);
  globalThis.fetch = realFetch;

  done();
})();
