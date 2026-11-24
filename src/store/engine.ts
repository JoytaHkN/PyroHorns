import { create } from 'zustand';

interface EngineState {
  /** true cuando llama.cpp nativo está activo (Android). */
  native: boolean;
  /** true mientras se abre un modelo. */
  loading: boolean;
  setNative: (v: boolean) => void;
  setLoading: (v: boolean) => void;
}

export const useEngine = create<EngineState>((set) => ({
  native: false,
  loading: false,
  setNative: (native) => set({ native }),
  setLoading: (loading) => set({ loading }),
}));
