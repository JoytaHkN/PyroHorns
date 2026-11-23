import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePalette, useScheme } from '@/theme/use-palette';
import { Icon } from './icons';
import { T } from './text';

/** Contenedor de pantalla: fondo, safe area, barra de estado. */
export function Screen({ children, scroll = false }: { children: ReactNode; scroll?: boolean }) {
  const pal = usePalette();
  const scheme = useScheme();
  const insets = useSafeAreaInsets();
  const body = scroll ? (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}>
      {children}
    </ScrollView>
  ) : (
    children
  );
  return (
    <View style={{ flex: 1, backgroundColor: pal.page, alignItems: 'center' }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 720, backgroundColor: pal.bg, paddingTop: insets.top }}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        {body}
      </View>
    </View>
  );
}

/** Botón redondo con relieve (barra superior del mockup). */
export function RoundButton({
  icon,
  onPress,
  label,
  plasma,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  onPress?: () => void;
  label: string;
  plasma?: boolean;
}) {
  const pal = usePalette();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: pal.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: pal.line,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon name={icon} size={20} plasma={plasma} />
    </Pressable>
  );
}

/** Barra "volver" + título grande. */
export function BackHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <RoundButton
          icon="back"
          label="Volver"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/chat'))}
        />
        {right}
      </View>
      <T weight="bold" size={30} style={{ lineHeight: 38 }}>
        {title}
      </T>
    </View>
  );
}
