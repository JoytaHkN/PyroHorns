import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PRESETS, type BenchConfig, type BenchResult } from '@/lib/bench';
import { persistStorage } from './storage';

interface BenchState {
  config: BenchConfig;
  results: BenchResult[];
  /**
   * Descripción de la prueba que se estaba ejecutando. Se guarda antes de cada prueba y se borra al terminar:
   * si sigue ahí al abrir la pantalla sin una prueba en marcha, algo cerró la app (normalmente falta de memoria).
   */
  inProgress: string | null;
  running: boolean;
  progress: { done: number; total: number; current: string } | null;
  log: string[];
  setConfig: (c: BenchConfig) => void;
  addResult: (r: BenchResult) => void;
  clearResults: () => void;
  setInProgress: (d: string | null) => void;
  setRunning: (v: boolean) => void;
  setProgress: (p: BenchState['progress']) => void;
  pushLog: (line: string) => void;
  clearLog: () => void;
}

/** Sin conversaciones ni claves (S9): solo configuración y medidas. */
export const useBench = create<BenchState>()(
  persist(
    (set) => ({
      config: PRESETS.rapida,
      results: [],
      inProgress: null,
      running: false,
      progress: null,
      log: [],
      setConfig: (config) => set({ config }),
      addResult: (r) => set((s) => ({ results: [...s.results, r] })),
      clearResults: () => set({ results: [] }),
      setInProgress: (inProgress) => set({ inProgress }),
      setRunning: (running) => set({ running }),
      setProgress: (progress) => set({ progress }),
      pushLog: (line) => set((s) => ({ log: [...s.log, line].slice(-40) })),
      clearLog: () => set({ log: [] }),
    }),
    {
      name: 'pyrohorns-bench',
      storage: persistStorage,
      version: 1,
      partialize: (s) => ({ config: s.config, results: s.results, inProgress: s.inProgress }),
    },
  ),
);
