/**
 * Almacenamiento cifrado en Android (S7-B) y copia de seguridad con contraseña (S8-A + duda 1-b).
 *
 * - Base principal `pyrohorns.db`: SQLCipher con una clave aleatoria de 256 bits guardada en el
 *   almacén seguro de Android (expo-secure-store, respaldado por Keystore).
 * - Sobre `pyrohorns-copia.db`: otra base SQLCipher cifrada con la contraseña de copia, que guarda
 *   la misma clave. Entra en la copia de Android; las entradas del almacén seguro no (no sirven
 *   fuera del móvil).
 * - Al restaurar: si falta la clave, se pide la contraseña, se abre el sobre y la clave vuelve al
 *   almacén seguro del móvil nuevo.
 */
import { getRandomBytesAsync } from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { deleteDatabaseAsync, openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { errorSummary, log } from '@/lib/log';
import type { ChatRepo } from './repo';
import { migrate } from './schema';
import type { SqlDb, SqlValue } from './sql';
import { SqlChatRepo } from './sql-repo';
import { WrongPasswordError, type BootResult } from './vault-types';

export const backupSupported = true;

const MAIN_DB = 'pyrohorns.db';
const ENVELOPE_DB = 'pyrohorns-copia.db';
const KEY_NAME = 'pyrohorns_db_key_v1';

let mainDb: SQLiteDatabase | null = null;

function adapter(db: SQLiteDatabase): SqlDb {
  return {
    exec: (sql) => db.execAsync(sql),
    run: async (sql, params: SqlValue[] = []) => ({ changes: (await db.runAsync(sql, params)).changes }),
    all: (sql, params: SqlValue[] = []) => db.getAllAsync(sql, params),
    get: (sql, params: SqlValue[] = []) => db.getFirstAsync(sql, params),
    transaction: (fn) => db.withTransactionAsync(fn),
    close: () => db.closeAsync(),
  };
}

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
const isHexKey = (k: string) => /^[0-9a-f]{64}$/.test(k);
/** Clave en bruto (sin derivación): `PRAGMA key = "x'…'"`. */
const rawKeyPragma = (hex: string) => `PRAGMA key = "x'${hex}'";`;
/** Contraseña (SQLCipher deriva la clave con PBKDF2). Se escapan las comillas simples. */
const passphrasePragma = (pw: string) => `PRAGMA key = '${pw.replace(/'/g, "''")}';`;

async function newKey(): Promise<string> {
  return toHex(await getRandomBytesAsync(32));
}

/** Abre una base cifrada y comprueba que la clave es correcta (si no, la cierra y lanza). */
async function openKeyed(name: string, keyPragma: string): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync(name);
  try {
    await db.execAsync(keyPragma);
    await db.getFirstAsync('SELECT count(*) AS n FROM sqlite_master');
    return db;
  } catch (e) {
    await db.closeAsync().catch(() => {});
    throw e;
  }
}

/**
 * ¿La base existe y está cifrada, o es nueva? Abrir sin clave crea un archivo vacío si no existe:
 * SQLCipher cifra ese archivo vacío en cuanto se le pone clave, así que no molesta.
 */
async function probe(name: string): Promise<'new' | 'encrypted'> {
  let db: SQLiteDatabase | null = null;
  try {
    db = await openDatabaseAsync(name);
    const row = await db.getFirstAsync<{ n: number }>('SELECT count(*) AS n FROM sqlite_master');
    return (row?.n ?? 0) === 0 ? 'new' : 'encrypted';
  } catch {
    return 'encrypted';
  } finally {
    await db?.closeAsync().catch(() => {});
  }
}

async function openMain(hexKey: string): Promise<ChatRepo> {
  const db = await openKeyed(MAIN_DB, rawKeyPragma(hexKey));
  const sql = adapter(db);
  const { fts } = await migrate(sql);
  if (!fts) log.warn('db.fts_unavailable');
  mainDb = db;
  return new SqlChatRepo(sql, fts);
}

export async function bootStorage(): Promise<BootResult> {
  try {
    const stored = await SecureStore.getItemAsync(KEY_NAME);
    const key = stored && isHexKey(stored) ? stored : null;
    if ((await probe(MAIN_DB)) === 'new') {
      const k = key ?? (await newKey());
      if (!key) await SecureStore.setItemAsync(KEY_NAME, k);
      return { state: 'ready', repo: await openMain(k) };
    }
    if (key) {
      try {
        return { state: 'ready', repo: await openMain(key) };
      } catch (e) {
        log.warn('db.key_mismatch', { error: errorSummary(e) });
      }
    }
    return (await hasBackupPassword()) ? { state: 'locked' } : { state: 'unreadable' };
  } catch (e) {
    log.error('db.boot', e);
    return { state: 'error', message: errorSummary(e) };
  }
}

async function readEnvelope(password: string): Promise<string> {
  let db: SQLiteDatabase;
  try {
    db = await openKeyed(ENVELOPE_DB, passphrasePragma(password));
  } catch {
    throw new WrongPasswordError();
  }
  try {
    const row = await db.getFirstAsync<{ v: string }>('SELECT v FROM k LIMIT 1');
    if (!row || !isHexKey(row.v)) throw new WrongPasswordError();
    return row.v;
  } finally {
    await db.closeAsync().catch(() => {});
  }
}

/** Restauración: abre el sobre con la contraseña de copia y recupera la base. */
export async function unlockWithBackupPassword(password: string): Promise<ChatRepo> {
  const key = await readEnvelope(password);
  const repo = await openMain(key);
  await SecureStore.setItemAsync(KEY_NAME, key);
  return repo;
}

/** Aparta los archivos ilegibles (no los borra) y crea una base nueva. */
export async function startFresh(): Promise<BootResult> {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  for (const name of [MAIN_DB, ENVELOPE_DB]) {
    const f = new File(Paths.document, 'SQLite', name);
    if (f.exists) f.move(new File(Paths.document, 'SQLite', `${name}.ilegible-${stamp}`));
  }
  await SecureStore.deleteItemAsync(KEY_NAME);
  return bootStorage();
}

export async function hasBackupPassword(): Promise<boolean> {
  if ((await probe(ENVELOPE_DB)) === 'encrypted') return true;
  // probe() acaba de crear un archivo vacío: se elimina.
  await deleteDatabaseAsync(ENVELOPE_DB).catch(() => {});
  return false;
}

/** Crea o cambia la contraseña de copia: el sobre se rehace con la clave actual. */
export async function setBackupPassword(password: string): Promise<void> {
  const key = await SecureStore.getItemAsync(KEY_NAME);
  if (!key || !isHexKey(key)) throw new Error('La base no está abierta');
  await deleteDatabaseAsync(ENVELOPE_DB).catch(() => {});
  const db = await openDatabaseAsync(ENVELOPE_DB);
  try {
    await db.execAsync(passphrasePragma(password));
    await db.execAsync('CREATE TABLE k (v TEXT NOT NULL);');
    await db.runAsync('INSERT INTO k (v) VALUES (?)', [key]);
  } finally {
    await db.closeAsync();
  }
}

export async function clearBackupPassword(): Promise<void> {
  await deleteDatabaseAsync(ENVELOPE_DB).catch(() => {});
}

/** Solo para depuración: la base principal abierta. */
export const currentMainDb = () => mainDb;
