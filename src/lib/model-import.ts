import { Directory, File, Paths } from 'expo-file-system';
import { matchPickedModel, plainPath } from './model-files';

/** Carpeta de modelos dentro del almacenamiento privado de la app (no necesita permisos). */
export function appModelsPath(): string {
  return decodeURI(plainPath(new Directory(Paths.document, 'models').uri));
}

export type ImportResult =
  | { status: 'canceled' }
  | { status: 'unknown'; name: string }
  | { status: 'done'; name: string; bytes: number };

/**
 * Abre el selector del sistema y copia el GGUF a la carpeta de modelos de la app (S3-B).
 * Se copia a «.part» y se renombra al final: un corte a mitad no deja un modelo corrupto que parezca válido.
 */
export async function importGguf(): Promise<ImportResult> {
  const picked = await File.pickFileAsync({ mimeTypes: ['*/*'] });
  if (picked.canceled || !picked.result) return { status: 'canceled' };
  const source = picked.result;
  const name = source.name;
  const model = matchPickedModel(name, source.size ?? 0);
  if (!model) return { status: 'unknown', name };

  const dir = new Directory(Paths.document, 'models');
  dir.create({ idempotent: true, intermediates: true });
  const part = new File(dir, `${model.file}.part`);
  const target = new File(dir, model.file);
  if (part.exists) part.delete();
  await source.copy(part);
  if (target.exists) target.delete();
  part.move(target);
  return { status: 'done', name: model.file, bytes: target.size };
}
