import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChat } from '@/store/chat';
import { fonts } from '@/theme/tokens';
import { usePalette } from '@/theme/use-palette';
import { Icon, type IconName } from './icons';
import { Mascot } from './mascot';
import { PlasmaGradient } from './plasma';
import { T } from './text';

function NavRow({ icon, label, on, onPress, onLongPress, plasma = true }: {
  icon: IconName; label: string; on?: boolean; onPress: () => void; onLongPress?: () => void; plasma?: boolean;
}) {
  const pal = usePalette();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 12,
        paddingVertical: 11,
        borderRadius: 14,
        backgroundColor: on || pressed ? pal.surface2 : 'transparent',
      })}
    >
      <Icon name={icon} size={20} plasma={plasma} color={pal.muted} />
      <T weight={on ? 'semibold' : 'regular'} numberOfLines={1} style={{ flex: 1 }}>
        {label}
      </T>
      {on ? <PlasmaGradient style={{ width: 4, height: 18, borderRadius: 2 }} /> : null}
    </Pressable>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  onNew: () => void;
  onAskDelete: (id: string) => void;
}

export function Drawer({ open, onClose, onNew, onAskDelete }: Props) {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const w = Math.min(320, width * 0.84);
  const x = useSharedValue(-w);
  const [mounted, setMounted] = useState(open);
  const [q, setQ] = useState('');
  const conversations = useChat((s) => s.conversations);
  const activeId = useChat((s) => s.activeId);
  const select = useChat((s) => s.select);

  useEffect(() => {
    if (open) setMounted(true);
    x.value = withTiming(open ? 0 : -w, { duration: 220 });
    if (!open) {
      const t = setTimeout(() => setMounted(false), 230);
      return () => clearTimeout(t);
    }
  }, [open, w, x]);

  const panel = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const scrim = useAnimatedStyle(() => ({ opacity: 1 + x.value / w }));

  const recent = useMemo(() => {
    const term = q.trim().toLowerCase();
    return [...conversations]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .filter((c) => !term || c.title.toLowerCase().includes(term) || c.messages.some((m) => m.content.toLowerCase().includes(term)));
  }, [conversations, q]);

  if (!mounted) return null;
  const go = (path: '/projects' | '/models' | '/settings' | '/terminal/alpine' | '/terminal/termux') => {
    onClose();
    router.push(path);
  };

  return (
    <View style={{ position: 'absolute', inset: 0, zIndex: 50 } as object}>
      <Animated.View style={[{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)' } as object, scrim]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Cerrar menú" />
      </Animated.View>
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: w,
            backgroundColor: pal.bg,
            borderTopRightRadius: 28,
            borderBottomRightRadius: 28,
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 8,
            boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
          },
          panel,
        ]}
      >
        <ScrollView contentContainerStyle={{ paddingHorizontal: 12, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8 }}>
            <Mascot size={36} />
            <T weight="bold" size={20}>
              Agora Fire
            </T>
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: pal.surface,
              borderRadius: 14,
              paddingHorizontal: 12,
              marginBottom: 6,
            }}
          >
            <Icon name="search" size={18} color={pal.muted} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Buscar conversaciones"
              placeholderTextColor={pal.muted}
              style={{ flex: 1, color: pal.text, fontFamily: fonts.ui, fontSize: 15, paddingVertical: 10, outlineStyle: 'none' } as object}
            />
          </View>
          <NavRow icon="plus" label="Nueva conversación" on={!activeId} onPress={() => { onNew(); onClose(); }} />
          <NavRow icon="folder" label="Proyectos" onPress={() => go('/projects')} />
          <NavRow icon="chip" label="Modelos GGUF" onPress={() => go('/models')} />
          <NavRow icon="term" label="Terminal Alpine" onPress={() => go('/terminal/alpine')} />
          <NavRow icon="box" label="Termux" onPress={() => go('/terminal/termux')} />
          <NavRow icon="gear" label="Ajustes" onPress={() => go('/settings')} />
          <T weight="semibold" size={12} tone="muted" style={{ textTransform: 'uppercase', letterSpacing: 1, marginTop: 14, marginBottom: 4, paddingHorizontal: 12 }}>
            Recientes
          </T>
          {recent.length === 0 ? (
            <T size={13} tone="muted" style={{ paddingHorizontal: 12 }}>
              {q ? 'Sin resultados' : 'Aún no hay conversaciones'}
            </T>
          ) : (
            recent.map((c) => (
              <NavRow
                key={c.id}
                icon="chat"
                plasma={false}
                label={c.title}
                on={c.id === activeId}
                onPress={() => { select(c.id); onClose(); router.navigate('/chat'); }}
                onLongPress={() => onAskDelete(c.id)}
              />
            ))
          )}
          {recent.length > 0 && (
            <T size={11} tone="muted" style={{ paddingHorizontal: 12, marginTop: 6 }}>
              Mantén pulsado para borrar
            </T>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}
