import type { SqlDb, SqlValue } from '@/db/sql';

let passes = 0;
let fails = 0;

export function check(cond: unknown, msg: string) {
  if (cond) {
    passes++;
    console.log(`ok    - ${msg}`);
  } else {
    fails++;
    console.error(`FALLO - ${msg}`);
  }
}

export function done(): never {
  console.log(fails ? `${fails} FALLOS de ${passes + fails}` : `TODO OK (${passes})`);
  process.exit(fails ? 1 : 0);
}

/** Lo mínimo de node:sqlite que usamos (se carga en ejecución para no depender de @types/node). */
interface NodeStatement {
  run(...params: SqlValue[]): { changes: number | bigint };
  all(...params: SqlValue[]): unknown[];
  get(...params: SqlValue[]): unknown;
}
interface NodeDatabase {
  exec(sql: string): void;
  prepare(sql: string): NodeStatement;
  close(): void;
}

const builtin = (id: string) => (process as unknown as { getBuiltinModule(id: string): unknown }).getBuiltinModule(id);

/** Implementa SqlDb sobre node:sqlite: las mismas consultas que en Android, probadas sin el móvil. */
export function nodeDb(path = ':memory:'): SqlDb {
  const { DatabaseSync } = builtin('node:sqlite') as { DatabaseSync: new (p: string) => NodeDatabase };
  const db = new DatabaseSync(path);
  return {
    exec: async (sql) => {
      db.exec(sql);
    },
    run: async (sql, params = []) => ({ changes: Number(db.prepare(sql).run(...params).changes) }),
    all: async <T>(sql: string, params: SqlValue[] = []) => db.prepare(sql).all(...params) as T[],
    get: async <T>(sql: string, params: SqlValue[] = []) => (db.prepare(sql).get(...params) as T | undefined) ?? null,
    transaction: async (fn) => {
      db.exec('BEGIN');
      try {
        await fn();
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
    close: async () => db.close(),
  };
}
