import { LOCAL_MODELS, type LocalModel } from '@/data/models';

/**
 * Cómo lee la app los GGUF (S3, P14-C):
 * - `app`: solo la carpeta de modelos de la app; se llena con el selector de archivos. No pide permisos (por defecto).
 * - `all`: además abre los GGUF directo desde la carpeta del proyecto en /sdcard. Pide «Acceso a todos los archivos».
 */
export type ModelAccess = 'app' | 'all';

export const DEFAULT_MODEL_ACCESS: ModelAccess = 'app';

/** Carpeta compartida con los GGUF cuando el acceso es «Todo el almacenamiento». */
export const SHARED_MODELS_DIR = '/sdcard/IA/Proyectos/APK IA';

/** Quita el esquema `file://` y la barra final: el motor nativo y `Paths.info` esperan rutas distintas. */
export function plainPath(uriOrPath: string): string {
  return uriOrPath.replace(/^file:\/\//, '').replace(/\/+$/, '');
}

/** Carpetas donde buscar un modelo, por orden. La de la app siempre cuenta (ahí caen las importaciones). */
export function modelSearchFolders(access: ModelAccess, appModelsDir: string): string[] {
  const own = plainPath(appModelsDir);
  return access === 'all' ? [SHARED_MODELS_DIR, own] : [own];
}

/** Primera carpeta que contiene el archivo, o null. `exists` es la comprobación real (inyectada para poder probarla). */
export function findModelPath(file: string, folders: string[], exists: (path: string) => boolean): string | null {
  for (const folder of folders) {
    const path = `${plainPath(folder)}/${file}`;
    let found = false;
    try {
      found = exists(path);
    } catch {
      found = false;
    }
    if (found) return path;
  }
  return null;
}

/** Modelo conocido cuyo archivo se llama así (sin distinguir mayúsculas), o undefined. */
export function knownModelForFile(name: string, models: LocalModel[] = LOCAL_MODELS): LocalModel | undefined {
  const wanted = name.trim().toLowerCase();
  return models.find((m) => m.file.toLowerCase() === wanted);
}

/** Modelo conocido con ese tamaño exacto en bytes (los 4 GGUF del plan tienen tamaños distintos). */
export function knownModelForSize(bytes: number, models: LocalModel[] = LOCAL_MODELS): LocalModel | undefined {
  return bytes > 0 ? models.find((m) => m.bytes === bytes) : undefined;
}

/**
 * Identifica el archivo que eligió el usuario: primero por nombre y, si el selector no da un nombre
 * reconocible (algunos proveedores devuelven un número), por tamaño exacto.
 */
export function matchPickedModel(name: string, bytes: number, models: LocalModel[] = LOCAL_MODELS): LocalModel | undefined {
  return knownModelForFile(name, models) ?? knownModelForSize(bytes, models);
}

/** Mensaje claro cuando no se encuentra un modelo, según la vía elegida y el permiso. */
export function missingModelMessage(file: string, access: ModelAccess, allFilesGranted: boolean): string {
  if (access === 'all' && !allFilesGranted) {
    return `No se puede leer ${file}: falta el permiso «Acceso a todos los archivos». Concédelo en Modelos → Acceso a los modelos.`;
  }
  if (access === 'all') {
    return `No se encontró ${file} en ${SHARED_MODELS_DIR} ni en la carpeta de modelos de la app. Impórtalo desde Modelos.`;
  }
  return `No se encontró ${file} en la carpeta de modelos de la app. Impórtalo desde Modelos → Importar archivo .gguf, o elige «Todo el almacenamiento».`;
}
