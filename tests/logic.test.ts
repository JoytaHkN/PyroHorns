import { modelForMode } from '@/data/agents';
import { estimateRamGiB, fitsInMemory, modelById } from '@/data/models';
import { migrate } from '@/db/schema';
import { SqlChatRepo } from '@/db/sql-repo';
import { send, stop } from '@/lib/engine';
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
  check((ai.thinkMs ?? 0) > 0, 'tiempo hasta el primer token');
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
  useChat.getState().remove(id);
  await flushWrites();
  const after = await new SqlChatRepo(db, fts).loadAll();
  const left = await db.get<{ n: number }>('SELECT count(*) AS n FROM messages');
  check(after.conversations.length === 0 && left?.n === 0, 'borrar conversación (y sus mensajes en cascada)');
  check(useChat.getState().activeId === null, 'sin conversación activa tras borrar');

  done();
})();
