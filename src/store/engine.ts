import { create } from 'zustand';

interface EngineState {
  /** true cuando llama.cpp nativo está activo (Android). */
  native: boolean;
  /** true mientras se abre un modelo. */
  loading: boolean;
  /** true mientras se busca en internet. */
  searching: boolean;
  setSearching: (v: boolean) => void;
  /** true mientras el micrófono escucha (doble toque en el chat). */
  listening: boolean;
  setListening: (v: boolean) => void;
  /** Ya se cortó la grabación y se está pasando a texto. */
  transcribing: boolean;
  setTranscribing: (v: boolean) => void;
  setNative: (v: boolean) => void;
  setLoading: (v: boolean) => void;
}

export const useEngine = create<EngineState>((set) => ({
  native: false,
  loading: false,
  searching: false,
  setSearching: (searching) => set({ searching }),
  listening: false,
  setListening: (listening) => set({ listening, transcribing: false }),
  transcribing: false,
  setTranscribing: (transcribing) => set({ transcribing }),
  setNative: (native) => set({ native }),
  setLoading: (loading) => set({ loading }),
}));
