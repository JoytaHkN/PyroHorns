import { create } from 'zustand';
import type { ChatRepo } from '@/db/repo';
import {
  backupSupported,
  bootStorage,
  clearBackupPassword,
  hasBackupPassword,
  setBackupPassword,
  startFresh,
  unlockWithBackupPassword,
} from '@/db/vault';
import type { BootResult } from '@/db/vault-types';
import { errorSummary, log } from '@/lib/log';
import { attachRepo, flushWrites, useChat } from './chat';

type State = 'loading' | 'ready' | 'locked' | 'unreadable' | 'error';

interface BootState {
  state: State;
  error: string | null;
  /** Hay contraseña de copia (el sobre existe). */
  backupSet: boolean;
  backupSupported: boolean;
  start: () => Promise<void>;
  /** Devuelve false si la contraseña es incorrecta. */
  unlock: (password: string) => Promise<boolean>;
  startFresh: () => Promise<void>;
  setBackupPassword: (password: string) => Promise<void>;
  clearBackupPassword: () => Promise<void>;
}

async function attach(repo: ChatRepo) {
  attachRepo(repo);
  useChat.getState().hydrate(await repo.loadAll());
}

export const useBoot = create<BootState>()((set, get) => {
  const apply = async (r: BootResult) => {
    if (r.state === 'ready') {
      await attach(r.repo);
      set({ state: 'ready', error: null, backupSet: backupSupported ? await hasBackupPassword() : false });
    } else set({ state: r.state, error: r.state === 'error' ? r.message : null });
  };

  return {
    state: 'loading',
    error: null,
    backupSet: false,
    backupSupported,

    start: async () => {
      if (get().state === 'ready') return;
      set({ state: 'loading' });
      await apply(await bootStorage());
    },

    unlock: async (password) => {
      try {
        await attach(await unlockWithBackupPassword(password));
        set({ state: 'ready', error: null, backupSet: true });
        return true;
      } catch (e) {
        if (e instanceof Error && e.name === 'WrongPasswordError') return false;
        log.error('db.unlock', e);
        set({ error: errorSummary(e) });
        return false;
      }
    },

    startFresh: async () => {
      set({ state: 'loading' });
      await apply(await startFresh());
    },

    setBackupPassword: async (password) => {
      await flushWrites();
      await setBackupPassword(password);
      set({ backupSet: true });
    },

    clearBackupPassword: async () => {
      await clearBackupPassword();
      set({ backupSet: false });
    },
  };
});
