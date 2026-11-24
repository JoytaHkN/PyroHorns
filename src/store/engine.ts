import { create } from 'zustand';

/** Estado del motor de inferencia: `native` es true cuando llama.cpp nativo está activo (Android). */
export const useEngine = create<{ native: boolean; setNative: (v: boolean) => void }>((set) => ({
  native: false,
  setNative: (native) => set({ native }),
}));
