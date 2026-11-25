/** Conexión del agente en la nube con la app: streaming de Expo y claves en el almacén seguro de Android (S5-B). */
import { fetch as expoFetch } from 'expo/fetch';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { CloudProviderId } from '@/data/models';
import { createCloudProvider, type CloudFetch } from '@/providers/cloud';
import { setCloudProvider } from './engine';

const keyName = (p: CloudProviderId) => `pyrohorns-cloud-${p}`;

/** En el visor web no hay almacén seguro: la nube queda para la app de Android. */
export const cloudAvailable = Platform.OS !== 'web';

export const getCloudKey = (p: CloudProviderId) => SecureStore.getItemAsync(keyName(p));
export const saveCloudKey = (p: CloudProviderId, key: string) => SecureStore.setItemAsync(keyName(p), key.trim());
export const deleteCloudKey = (p: CloudProviderId) => SecureStore.deleteItemAsync(keyName(p));

export function registerCloud() {
  if (cloudAvailable) setCloudProvider(createCloudProvider(expoFetch as unknown as CloudFetch, getCloudKey));
}
