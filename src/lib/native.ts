import { modelById } from '@/data/models';
import { activateNativeLlama, setNativeLlamaModule } from '@/lib/engine';
import { findModelPath, missingModelMessage, modelSearchFolders } from '@/lib/model-files';
import { appModelsPath } from '@/lib/model-import';
import type { NativeLlamaModule } from '@/providers/llama';
import { useEngine } from '@/store/engine';
import { useSettings } from '@/store/settings';
import type { Usage } from '@/types/chat';
import {
  cancel as nativeCancel,
  fileSize,
  generate as nativeGenerate,
  hasAllFilesAccess,
  isLlamaNativeAvailable,
  loadModel as nativeLoadModel,
  unloadModel as nativeUnloadModel,
} from '@pyrohorns/llama';

const handles = new Map<string, number>();

/** Ruta real del GGUF según la vía elegida en Modelos (S3), o null si no está. */
export function locateModel(file: string): string | null {
  const folders = modelSearchFolders(useSettings.getState().modelAccess, appModelsPath());
  return findModelPath(file, folders, (path) => fileSize(path) > 0);
}

async function resolveModelPath(modelId: string): Promise<string> {
  if (modelId.startsWith('/')) return modelId;
  const file = modelById(modelId).file;
  const found = locateModel(file);
  if (found) return found;
  throw new Error(missingModelMessage(file, useSettings.getState().modelAccess, hasAllFilesAccess()));
}

export const nativeLlamaModule: NativeLlamaModule = {
  async isAvailable() {
    return isLlamaNativeAvailable();
  },

  async loadModel(modelId, contextTokens, threads) {
    const path = await resolveModelPath(modelId);
    const handle = await nativeLoadModel(path, contextTokens, threads);
    if (handle === 0) throw new Error(`No se pudo cargar ${path}`);
    const id = `${modelId}#${handle}`;
    handles.set(id, handle);
    return id;
  },

  async generate(modelId, messages, options, _signal) {
    const handle = handles.get(modelId);
    if (handle === undefined) throw new Error('Modelo no cargado');
    await nativeGenerate(handle, messages, options.threads ?? 4, options.noThink ?? false, (ev) => {
      switch (ev.type) {
        case 'token':
          options.onEvent({ type: 'token', text: ev.text });
          break;
        case 'usage':
          options.onEvent({ type: 'usage', usage: JSON.parse(ev.usage) as Usage });
          break;
        case 'error':
          options.onEvent({ type: 'error', message: ev.text });
          break;
        case 'done':
          options.onEvent({ type: 'done' });
          break;
      }
    });
  },

  async cancel(modelId) {
    const handle = handles.get(modelId);
    if (handle !== undefined) await nativeCancel(handle);
  },

  async unloadModel(modelId) {
    const handle = handles.get(modelId);
    if (handle !== undefined) await nativeUnloadModel(handle);
    handles.delete(modelId);
  },
};

export async function registerNativeLlama(): Promise<boolean> {
  if (!(await nativeLlamaModule.isAvailable())) return false;
  setNativeLlamaModule(nativeLlamaModule);
  activateNativeLlama();
  useEngine.getState().setNative(true);
  return true;
}
