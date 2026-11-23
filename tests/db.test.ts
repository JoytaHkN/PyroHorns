import { LocalChatRepo, memoryStore } from '@/db/local-repo';
import type { ChatRepo, ConversationMeta } from '@/db/repo';
import { SCHEMA_VERSION, migrate } from '@/db/schema';
import type { SqlDb } from '@/db/sql';
import { SqlChatRepo, ftsQuery } from '@/db/sql-repo';
import { check, done, nodeDb } from './helpers';

const meta = (id: string, over: Partial<ConversationMeta> = {}): ConversationMeta => ({
  id,
  title: 'Receta de pan',
  projectId: null,
  createdAt: 1,
  updatedAt: 1,
  agent: { mode: 'general', deep: false, modelId: 'lfm3-1.7b' },
  ...over,
});

/** Mismo contrato para el repositorio de Android (SQLite) y el del visor web. */
async function contract(name: string, r: ChatRepo) {
  await r.saveConversation(meta('c1'));
  await r.insertMessage('c1', { id: 'm1', role: 'user', content: '¿Cómo compongo una canción?', createdAt: 2 });
  await r.insertMessage('c1', { id: 'm2', role: 'assistant', content: '', createdAt: 3, status: 'streaming', modelId: 'lfm3-1.7b' });
  await r.updateMessage({
    id: 'm2',
    role: 'assistant',
    content: 'Empieza por la melodía.',
    createdAt: 3,
    status: 'streaming',
    thinking: 'pienso',
    modelId: 'lfm3-1.7b',
    usage: { promptTokens: 5, completionTokens: 4, ttftMs: 100, tokPerSec: 12.5 },
    toolCalls: [{ id: 't1', name: 'leer', args: '{"ruta":"a.txt"}' }],
  });

  let d = await r.loadAll();
  const c = d.conversations[0]!;
  check(d.conversations.length === 1 && c.messages.length === 2, `${name}: guarda conversación y mensajes`);
  check(c.updatedAt === 3, `${name}: insertar un mensaje actualiza la fecha de la conversación`);
  check(c.messages[0]!.content.startsWith('¿Cómo') && c.messages[1]!.id === 'm2', `${name}: orden de los mensajes`);
  const m2 = c.messages[1]!;
  check(m2.status === 'stopped', `${name}: un streaming interrumpido se carga como detenido`);
  check(
    m2.thinking === 'pienso' && m2.usage?.tokPerSec === 12.5 && m2.modelId === 'lfm3-1.7b' && m2.toolCalls?.[0]?.name === 'leer',
    `${name}: razonamiento, métricas, modelo y herramientas`,
  );

  check((await r.search('cancion')).includes('c1'), `${name}: búsqueda sin tildes`);
  check((await r.search('MELODÍA')).includes('c1'), `${name}: búsqueda sin mayúsculas ni tildes`);
  check((await r.search('receta')).includes('c1'), `${name}: búsqueda en el título`);
  check((await r.search('xyz')).length === 0, `${name}: búsqueda sin resultados`);
  check((await r.search('"; DROP TABLE messages; --')).length === 0, `${name}: comillas y símbolos no rompen la búsqueda`);

  await r.saveProject({ id: 'p1', name: 'Cocina', createdAt: 5 });
  await r.saveConversation(meta('c1', { projectId: 'p1', updatedAt: 6 }));
  d = await r.loadAll();
  check(d.projects.length === 1 && d.conversations[0]!.projectId === 'p1', `${name}: proyectos`);
  await r.deleteProject('p1');
  d = await r.loadAll();
  check(d.projects.length === 0 && d.conversations[0]!.projectId === null, `${name}: borrar un proyecto libera sus conversaciones`);

  await r.deleteConversation('c1');
  check((await r.loadAll()).conversations.length === 0, `${name}: borrar conversación`);
  check((await r.search('melodia')).length === 0, `${name}: lo borrado deja de aparecer en la búsqueda`);

  await r.saveConversation(meta('c2'));
  await r.insertMessage('c2', { id: 'm3', role: 'user', content: 'hola', createdAt: 7 });
  await r.deleteAll();
  check((await r.loadAll()).conversations.length === 0, `${name}: borrar todo`);
}

async function sqlRepo(): Promise<{ db: SqlDb; repo: SqlChatRepo }> {
  const db = nodeDb();
  const { fts } = await migrate(db);
  return { db, repo: new SqlChatRepo(db, fts) };
}

(async () => {
  // Esquema y migraciones.
  const { db, repo } = await sqlRepo();
  const v = await db.get<{ user_version: number }>('PRAGMA user_version');
  check(v?.user_version === SCHEMA_VERSION, `esquema en la versión ${SCHEMA_VERSION}`);
  const again = await migrate(db);
  check(again.fts, 'migrar dos veces no falla');
  const fk = await db.get<{ foreign_keys: number }>('PRAGMA foreign_keys');
  check(fk?.foreign_keys === 1, 'claves foráneas activas (borrado en cascada)');

  await contract('SQLite', repo);
  const orphan = await db.get<{ n: number }>('SELECT count(*) AS n FROM messages');
  check(orphan?.n === 0, 'SQLite: no quedan mensajes huérfanos');

  // Búsqueda sin FTS5 (respaldo con LIKE).
  const { repo: likeRepo } = await sqlRepo();
  const noFts = new SqlChatRepo((likeRepo as unknown as { db: SqlDb }).db, false);
  await noFts.saveConversation(meta('x'));
  await noFts.insertMessage('x', { id: 'y', role: 'user', content: 'texto con 100% de _guiones_', createdAt: 2 });
  check((await noFts.search('100%')).includes('x'), 'sin FTS5: LIKE con % escapado');
  check((await noFts.search('_guiones_')).includes('x') && (await noFts.search('a_b')).length === 0, 'sin FTS5: _ escapado');

  check(ftsQuery('hola "mundo"') === '"hola"* """mundo"""*', 'consulta FTS5 con comillas escapadas');
  check(ftsQuery('  ;; -- ') === '', 'consulta FTS5 sin palabras queda vacía');

  // Visor web: mismo contrato y persistencia en el almacén del navegador.
  const store = memoryStore();
  const local = new LocalChatRepo(store, 0);
  await contract('Web', local);
  await local.saveConversation(meta('w1', { title: 'Persistente' }));
  local.flush();
  const reopened = await new LocalChatRepo(store).loadAll();
  check(reopened.conversations[0]?.title === 'Persistente', 'Web: los datos sobreviven a recargar');

  done();
})();
