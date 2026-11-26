import type { SqlDb } from './sql';

/**
 * Esquema de la base de conversaciones. Se versiona con `PRAGMA user_version`.
 * `messages.rid` es INTEGER PRIMARY KEY para que el índice FTS5 (contenido externo) no se
 * desincronice tras un VACUUM.
 */
const MIGRATIONS: string[] = [
  // v1
  `
  CREATE TABLE conversations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    project_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    mode TEXT NOT NULL,
    deep INTEGER NOT NULL DEFAULT 0,
    model_id TEXT NOT NULL
  );
  CREATE TABLE messages (
    rid INTEGER PRIMARY KEY,
    id TEXT NOT NULL UNIQUE,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    thinking TEXT,
    status TEXT,
    think_ms INTEGER,
    model_id TEXT,
    usage TEXT,
    tool_calls TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX messages_by_conversation ON messages(conversation_id, rid);
  CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  `,
  // v2: valoración de las respuestas (👍/👎)
  `
  ALTER TABLE messages ADD COLUMN feedback TEXT;
  `,
  // v3: búsqueda en internet (resultados y fuentes)
  `
  ALTER TABLE messages ADD COLUMN web TEXT;
  `,
  // v4: asistente (notas y tareas)
  `
  ALTER TABLE messages ADD COLUMN assist TEXT;
  CREATE TABLE items (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    text TEXT NOT NULL,
    due INTEGER,
    done INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  `,
  // v5: dictado («Oí: …» cuando la corrección cambió la frase)
  `
  ALTER TABLE messages ADD COLUMN heard TEXT;
  `,
];

/** Búsqueda de texto completo. Se crea aparte para poder seguir sin ella si el motor no trae FTS5. */
const FTS = `
  CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
    content, content='messages', content_rowid='rid', tokenize='unicode61 remove_diacritics 2'
  );
  CREATE TRIGGER IF NOT EXISTS messages_fts_ai AFTER INSERT ON messages BEGIN
    INSERT INTO messages_fts(rowid, content) VALUES (new.rid, new.content);
  END;
  CREATE TRIGGER IF NOT EXISTS messages_fts_ad AFTER DELETE ON messages BEGIN
    INSERT INTO messages_fts(messages_fts, rowid, content) VALUES ('delete', old.rid, old.content);
  END;
  CREATE TRIGGER IF NOT EXISTS messages_fts_au AFTER UPDATE OF content ON messages BEGIN
    INSERT INTO messages_fts(messages_fts, rowid, content) VALUES ('delete', old.rid, old.content);
    INSERT INTO messages_fts(rowid, content) VALUES (new.rid, new.content);
  END;
`;

export const SCHEMA_VERSION = MIGRATIONS.length;

/** Aplica las migraciones pendientes. Devuelve si la búsqueda FTS5 está disponible. */
export async function migrate(db: SqlDb): Promise<{ fts: boolean }> {
  await db.exec('PRAGMA foreign_keys = ON;');
  const row = await db.get<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let v = current; v < MIGRATIONS.length; v++) {
    await db.transaction(async () => {
      await db.exec(MIGRATIONS[v]!);
      await db.exec(`PRAGMA user_version = ${v + 1};`);
    });
  }
  try {
    await db.exec(FTS);
    return { fts: true };
  } catch {
    return { fts: false };
  }
}
