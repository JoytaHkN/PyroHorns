/**
 * Almacenamiento del visor web (D4). Sin cifrado ni copias: eso aplica a Android (vault.native.ts).
 * Metro elige vault.native.ts en Android y este archivo en la web.
 */
import { LocalChatRepo, memoryStore, type KeyValueStore } from './local-repo';
import type { ChatRepo } from './repo';
import type { BootResult } from './vault-types';

export const backupSupported = false;

function browserStore(): KeyValueStore {
  try {
    const ls = (globalThis as { localStorage?: KeyValueStore }).localStorage;
    if (ls) return ls;
  } catch {
    // Acceso bloqueado (modo privado estricto).
  }
  return memoryStore();
}

export async function bootStorage(): Promise<BootResult> {
  return { state: 'ready', repo: new LocalChatRepo(browserStore()) };
}

export async function unlockWithBackupPassword(_password: string): Promise<ChatRepo> {
  throw new Error('Las copias de seguridad solo existen en Android');
}

export async function startFresh(): Promise<BootResult> {
  return bootStorage();
}

export async function hasBackupPassword(): Promise<boolean> {
  return false;
}

export async function setBackupPassword(_password: string): Promise<void> {
  throw new Error('Las copias de seguridad solo existen en Android');
}

export async function clearBackupPassword(): Promise<void> {}
