import { LOCAL_MODELS } from '@/data/models';
import {
  DEFAULT_MODEL_ACCESS,
  SHARED_MODELS_DIR,
  findModelPath,
  knownModelForFile,
  knownModelForSize,
  matchPickedModel,
  missingModelMessage,
  modelSearchFolders,
  plainPath,
} from '@/lib/model-files';
import { check, done } from './helpers';

check(DEFAULT_MODEL_ACCESS === 'app', 'por defecto se usa la carpeta de la app (S3-B, sin permisos)');

check(plainPath('file:///data/user/0/app/files/models/') === '/data/user/0/app/files/models', 'plainPath quita file:// y la barra final');
check(plainPath('/sdcard/IA/') === '/sdcard/IA', 'plainPath con ruta normal');

const app = 'file:///data/user/0/app/files/models/';
check(JSON.stringify(modelSearchFolders('app', app)) === JSON.stringify(['/data/user/0/app/files/models']), 'acceso «app»: solo la carpeta de la app');
check(
  JSON.stringify(modelSearchFolders('all', app)) === JSON.stringify([SHARED_MODELS_DIR, '/data/user/0/app/files/models']),
  'acceso «all»: /sdcard primero y luego la carpeta de la app',
);

const present = new Set(['/sdcard/IA/Proyectos/APK IA/a.gguf', '/data/x/models/b.gguf']);
const exists = (p: string) => present.has(p);
check(findModelPath('a.gguf', [SHARED_MODELS_DIR, '/data/x/models'], exists) === '/sdcard/IA/Proyectos/APK IA/a.gguf', 'findModelPath: ruta con espacios');
check(findModelPath('b.gguf', [SHARED_MODELS_DIR, '/data/x/models/'], exists) === '/data/x/models/b.gguf', 'findModelPath: cae a la carpeta de la app');
check(findModelPath('c.gguf', [SHARED_MODELS_DIR], exists) === null, 'findModelPath: null si no está');
check(
  findModelPath('a.gguf', [SHARED_MODELS_DIR, '/data/x/models'], () => {
    throw new Error('sin permiso');
  }) === null,
  'findModelPath: un error al comprobar cuenta como «no está»',
);

const lfm = LOCAL_MODELS[0]!;
check(knownModelForFile(lfm.file)?.id === lfm.id, 'knownModelForFile: nombre exacto');
check(knownModelForFile(lfm.file.toLowerCase())?.id === lfm.id, 'knownModelForFile: sin distinguir mayúsculas');
check(knownModelForFile('otro.gguf') === undefined, 'knownModelForFile: desconocido');
check(knownModelForSize(lfm.bytes)?.id === lfm.id, 'knownModelForSize: tamaño exacto');
check(knownModelForSize(0) === undefined && knownModelForSize(123) === undefined, 'knownModelForSize: 0 o tamaño ajeno');
check(new Set(LOCAL_MODELS.map((m) => m.bytes)).size === LOCAL_MODELS.length, 'los tamaños de los modelos son únicos (sirven para identificarlos)');
check(matchPickedModel('42', lfm.bytes)?.id === lfm.id, 'matchPickedModel: nombre numérico, se reconoce por tamaño');
check(matchPickedModel(lfm.file, 1)?.id === lfm.id, 'matchPickedModel: el nombre manda');
check(matchPickedModel('42', 7) === undefined, 'matchPickedModel: ni nombre ni tamaño');

check(missingModelMessage('m.gguf', 'all', false).includes('Acceso a todos los archivos'), 'mensaje: falta el permiso');
check(missingModelMessage('m.gguf', 'all', true).includes(SHARED_MODELS_DIR), 'mensaje: con permiso, indica la carpeta buscada');
check(missingModelMessage('m.gguf', 'app', false).includes('Importar'), 'mensaje: vía app, invita a importar');

done();
