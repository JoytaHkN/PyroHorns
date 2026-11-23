import { NativeModule, requireNativeModule } from 'expo';

export type LlamaEventType = 'token' | 'usage' | 'error' | 'done';

export interface LlamaNativeEvent {
  handle: number;
  type: LlamaEventType;
  text: string;
  usage: string;
}

declare class PyroHornsLlamaModule extends NativeModule<{ onEvent: (event: LlamaNativeEvent) => void }> {
  isAvailable(): Promise<boolean>;
  hasAllFilesAccess(): boolean;
  requestAllFilesAccess(): void;
  fileSize(path: string): number;
  loadModel(path: string, contextTokens: number, threads: number): Promise<number>;
  generate(handle: number, prompt: string, threads: number): Promise<void>;
  cancel(handle: number): Promise<void>;
  unloadModel(handle: number): Promise<void>;
}

export default requireNativeModule<PyroHornsLlamaModule>('PyroHornsLlama');
