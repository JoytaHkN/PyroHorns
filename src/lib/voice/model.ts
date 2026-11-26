/**
 * Modelo de voz (P25): whisper.cpp con el modelo multilingüe «base», cuantizado a 5 bits (MIT, OpenAI Whisper).
 * Es la única descarga de la voz: se hace una vez desde el repositorio oficial de ggml y se verifica por huella.
 * Después, el reconocimiento funciona sin conexión; el audio nunca sale del teléfono.
 */
import { Directory, File, Paths } from 'expo-file-system';
import { fileSha256 } from '@pyrohorns/llama';
import { plainPath } from '@/lib/model-files';

export const VOICE_MODEL = {
  file: 'ggml-base-q5_1.bin',
  url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q5_1.bin',
  bytes: 59707625,
  sha256: '422f1ae452ade6f30a004d7e5c6a43195e4433bc370bf23fac9cc591f01a8898',
  megabytes: 60,
} as const;

const voiceDir = () => new Directory(Paths.document, 'voice');
const modelFile = () => new File(voiceDir(), VOICE_MODEL.file);

/** Ruta del modelo para el motor nativo. */
export function voiceModelPath(): string {
  return decodeURI(plainPath(modelFile().uri));
}

/** Instalado solo si el tamaño coincide; la huella se comprueba al instalar. */
export function voiceModelInstalled(): boolean {
  const f = modelFile();
  return f.exists && f.size === VOICE_MODEL.bytes;
}

/** Descarga el modelo y comprueba tamaño y huella. Si no coincide, se borra y no se usa. */
export async function installVoiceModel(): Promise<void> {
  voiceDir().create({ idempotent: true, intermediates: true });
  const file = modelFile();
  if (file.exists) file.delete();
  await File.downloadFileAsync(VOICE_MODEL.url, file);
  const digest = await fileSha256(voiceModelPath());
  if (file.size !== VOICE_MODEL.bytes || digest !== VOICE_MODEL.sha256) {
    file.delete();
    throw new Error('La voz descargada no coincide con la huella esperada; se borró y no se usará.');
  }
}

export function removeVoiceModel(): void {
  const file = modelFile();
  if (file.exists) file.delete();
}
