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
  diagnostics(): string;
  clearDiagnostics(): void;
  loadModel(path: string, contextTokens: number, threads: number, useMmap: boolean): Promise<number>;
  bench(handle: number, nPrompt: number, nGen: number, threads: number): Promise<string>;
  memoryInfo(): string;
  cpuInfo(): string;
  resetPeakMemory(): boolean;
  keepScreenOn(on: boolean): void;
  generate(handle: number, prompt: string, threads: number, noThink: boolean): Promise<void>;
  cancel(handle: number): Promise<void>;
  unloadModel(handle: number): Promise<void>;
}

export default requireNativeModule<PyroHornsLlamaModule>('PyroHornsLlama');
