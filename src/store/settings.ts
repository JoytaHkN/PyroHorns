import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { modelForMode, type ModeId } from '@/data/agents';
import { persistStorage } from './storage';

export type SchemePref = 'dark' | 'light';

interface SettingsState {
  scheme: SchemePref;
  mode: ModeId;
  /** Interruptor Profundo: razonamiento (si el modelo lo admite) y más contexto. */
  deep: boolean;
  /** Modelo elegido a mano en "Avanzado"; null = el que corresponde al modo (D1). */
  modelOverride: string | null;
  setScheme: (s: SchemePref) => void;
  toggleScheme: () => void;
  /** Cambiar de modo vuelve al modelo automático. */
  setMode: (m: ModeId) => void;
  setDeep: (v: boolean) => void;
  toggleDeep: () => void;
  setModelOverride: (id: string | null) => void;
}

/** Solo ajustes de interfaz (nada sensible): se guardan sin cifrar, también en el visor web. */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      scheme: 'dark',
      mode: 'general',
      deep: false,
      modelOverride: null,
      setScheme: (scheme) => set({ scheme }),
      toggleScheme: () => set((s) => ({ scheme: s.scheme === 'dark' ? 'light' : 'dark' })),
      setMode: (mode) => set({ mode, modelOverride: null }),
      setDeep: (deep) => set({ deep }),
      toggleDeep: () => set((s) => ({ deep: !s.deep })),
      setModelOverride: (modelOverride) => set({ modelOverride }),
    }),
    { name: 'pyrohorns-settings', storage: persistStorage, version: 1 },
  ),
);

export function activeModelId(s: Pick<SettingsState, 'mode' | 'modelOverride'>): string {
  return s.modelOverride ?? modelForMode(s.mode).id;
}
