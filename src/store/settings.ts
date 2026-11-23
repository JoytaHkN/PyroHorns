import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ModeId } from '@/data/agents';
import { modelForLevel, type LevelId } from '@/data/models';
import { persistStorage } from './storage';

export type SchemePref = 'dark' | 'light';

interface SettingsState {
  scheme: SchemePref;
  mode: ModeId;
  level: LevelId;
  /** Modelo elegido a mano; null = el que corresponde al nivel. */
  modelOverride: string | null;
  setScheme: (s: SchemePref) => void;
  toggleScheme: () => void;
  setMode: (m: ModeId) => void;
  setLevel: (l: LevelId) => void;
  setModelOverride: (id: string | null) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      scheme: 'dark',
      mode: 'general',
      level: 'pro',
      modelOverride: null,
      setScheme: (scheme) => set({ scheme }),
      toggleScheme: () => set((s) => ({ scheme: s.scheme === 'dark' ? 'light' : 'dark' })),
      setMode: (mode) => set({ mode }),
      setLevel: (level) => set({ level, modelOverride: null }),
      setModelOverride: (modelOverride) => set({ modelOverride }),
    }),
    { name: 'af-settings', storage: persistStorage, version: 1 },
  ),
);

export function activeModelId(s: Pick<SettingsState, 'level' | 'modelOverride'>): string {
  return s.modelOverride ?? modelForLevel(s.level).id;
}
