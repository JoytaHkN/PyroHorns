import '../../global.css';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  useFonts,
} from '@expo-google-fonts/outfit';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { HeroUINativeProvider } from 'heroui-native';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { Uniwind } from 'uniwind';
import { RestoreScreen } from '@/components/restore-screen';
import { useBoot } from '@/store/boot';
import { registerNativeLlama } from '@/lib/native';
import { flushWrites } from '@/store/chat';
import { useSettings } from '@/store/settings';
import { palette } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    JetBrainsMono_400Regular,
  });
  const scheme = useSettings((s) => s.scheme);
  const boot = useBoot((s) => s.state);

  useEffect(() => {
    Uniwind.setTheme(scheme);
  }, [scheme]);

  // Abre la base (cifrada en Android) y carga las conversaciones.
  useEffect(() => {
    void useBoot.getState().start();
  }, []);

  // Registra el motor nativo (F1.5); si no está, el chat sigue con MockProvider.
  useEffect(() => {
    void registerNativeLlama();
  }, []);

  // Al pasar a segundo plano se escribe lo pendiente del streaming.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') void flushWrites();
    });
    return () => sub.remove();
  }, []);

  const ready = fontsLoaded && boot !== 'loading';
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette[scheme].page }}>
      <KeyboardProvider>
      <HeroUINativeProvider config={{ devInfo: { stylingPrinciples: false } }}>
        {boot === 'ready' ? (
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              contentStyle: { backgroundColor: palette[scheme].bg },
            }}
          />
        ) : (
          <RestoreScreen />
        )}
      </HeroUINativeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
