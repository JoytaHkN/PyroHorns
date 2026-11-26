import Constants from 'expo-constants';
import { formatBuild, type BuildInfo } from './build-info';

/** Versión y compilación de la app instalada. Aparte de `build-info` para que las pruebas no carguen Expo. */
export const APP_BUILD = formatBuild(Constants.expoConfig?.version, Constants.expoConfig?.extra?.build as BuildInfo | undefined);
