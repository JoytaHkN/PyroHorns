import { Paths } from 'expo-file-system';
import { modelById } from '@/data/models';
import { activateNativeLlama, setNativeLlamaModule } from '@/lib/engine';
import type { NativeLlamaModule } from '@/providers/llama';
import type { Usage } from '@/types/chat';
import {
  cancel as nativeCancel,
  generate as nativeGenerate,
  isLlamaNativeAvailable,
  loadModel as nativeLoadModel,
  unloadModel as nativeUnloadModel,
} from '@pyrohorns/llama';

const handles = new Map<string, number>();
const folders = ['/sdcard/IA/Proyectos/APK IA/', Paths.document.uri.replace(/\/$/, '')];

async function resolveModelPath(modelId: string): Promise<string> {
  if (modelId.startsWith('/')) return modelId;
  const file = modelById(modelId).file;
  for (const folder of folders) {
    if (!folder) continue;
    const path = `${folder.replace(/\/$/, '')}/${file}`;
    try {
      if (Paths.info(`file://${path}`).exists) return path;
    } catch {}
  }
  throw new Error(`No se encontró ${file} en /sdcard ni en el almacenamiento de la app`);
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

  async generate(modelId, prompt, options, _signal) {
    const handle = handles.get(modelId);
    if (handle === undefined) throw new Error('Modelo no cargado');
    await nativeGenerate(handle, prompt, options.threads ?? 4, (ev) => {
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
  return true;
}
