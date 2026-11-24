import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Mascot } from '@/components/mascot';
import { Orb } from '@/components/orb';
import { PlasmaGradient } from '@/components/plasma';
import { Screen } from '@/components/screen';
import { T } from '@/components/text';
import { useChat } from '@/store/chat';
import { useEngine } from '@/store/engine';

/** Pantalla hero: Ibex, nombre y entrada al chat. */
export default function Hero() {
  const native = useEngine((s) => s.native);
  const count = useChat((s) => s.conversations.length);
  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 18 }}>
        <Mascot size={220} style={{ borderRadius: 52 }} />
        <T weight="bold" size={40} style={{ lineHeight: 48 }}>
          PyroHorns
        </T>
        <T size={17} tone="muted" style={{ textAlign: 'center' }}>
          Inteligente. Viva. Tuya.{'\n'}IA local en tu dispositivo.
        </T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Orb size={10} active />
          <T size={13} tone="muted">
            {native ? 'Motor local activo · IA en tu dispositivo' : 'Modo demostración · respuestas simuladas'}
          </T>
        </View>
        <Pressable
          onPress={() => router.replace('/chat')}
          accessibilityRole="button"
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, marginTop: 8 })}
        >
          <PlasmaGradient
            style={{ borderRadius: 999, paddingHorizontal: 36, paddingVertical: 14, boxShadow: '0 0 22px rgba(255,90,60,0.38)' }}
          >
            <T weight="bold" size={17} tone="onPlasma">
              {count > 0 ? 'Continuar' : 'Empezar'}
            </T>
          </PlasmaGradient>
        </Pressable>
      </View>
    </Screen>
  );
}
