import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { modelForMode, type ModeId } from '@/data/agents';
import { DEFAULT_MODEL_ACCESS, type ModelAccess } from '@/lib/model-files';
import { persistStorage } from './storage';

export type SchemePref = 'dark' | 'light';

interface SettingsState {
  scheme: SchemePref;
  mode: ModeId;
  /** Interruptor Profundo: razonamiento (si el modelo lo admite) y más contexto. */
  deep: boolean;
  /** Modelo elegido a mano en "Avanzado"; null = el que corresponde al modo (D1). */
  modelOverride: string | null;
  /** Cómo lee la app los GGUF (S3): carpeta de la app (sin permisos) o todo el almacenamiento. */
  modelAccess: ModelAccess;
  /** Responder en voz alta cuando la pregunta llegó por voz. */
  voiceReply: boolean;
  setVoiceReply: (v: boolean) => void;
  /** Asistente: hace las acciones solo, espera un toque, o está apagado. */
  assistant: 'auto' | 'tap' | 'off';
  setAssistant: (a: 'auto' | 'tap' | 'off') => void;
  setScheme: (s: SchemePref) => void;
  toggleScheme: () => void;
  /** Cambiar de modo vuelve al modelo automático. */
  setMode: (m: ModeId) => void;
  setDeep: (v: boolean) => void;
  toggleDeep: () => void;
  setModelOverride: (id: string | null) => void;
  setModelAccess: (a: ModelAccess) => void;
}

/** Solo ajustes de interfaz (nada sensible): se guardan sin cifrar, también en el visor web. */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      scheme: 'dark',
      mode: 'general',
      deep: false,
      modelOverride: null,
      modelAccess: DEFAULT_MODEL_ACCESS,
      assistant: 'auto',
      voiceReply: true,
      setVoiceReply: (voiceReply) => set({ voiceReply }),
      setAssistant: (assistant) => set({ assistant }),
      setScheme: (scheme) => set({ scheme }),
      toggleScheme: () => set((s) => ({ scheme: s.scheme === 'dark' ? 'light' : 'dark' })),
      setMode: (mode) => set({ mode, modelOverride: null }),
      setDeep: (deep) => set({ deep }),
      toggleDeep: () => set((s) => ({ deep: !s.deep })),
      setModelOverride: (modelOverride) => set({ modelOverride }),
      setModelAccess: (modelAccess) => set({ modelAccess }),
    }),
    { name: 'pyrohorns-settings', storage: persistStorage, version: 1 },
  ),
);

export function activeModelId(s: Pick<SettingsState, 'mode' | 'modelOverride'>): string {
  return s.modelOverride ?? modelForMode(s.mode).id;
}
