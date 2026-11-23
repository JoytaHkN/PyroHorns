/**
 * Interfaz mínima de base de datos. En Android la implementa expo-sqlite (SQLCipher) y en las
 * pruebas `node:sqlite`, así las mismas consultas se prueban sin el móvil.
 */
export type SqlValue = string | number | null;

export interface SqlDb {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlValue[]): Promise<{ changes: number }>;
  all<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  get<T>(sql: string, params?: SqlValue[]): Promise<T | null>;
  transaction(fn: () => Promise<void>): Promise<void>;
  close(): Promise<void>;
}
