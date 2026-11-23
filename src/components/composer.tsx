import { useToast } from 'heroui-native';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { modeById } from '@/data/agents';
import { modelById } from '@/data/models';
import { activeModelId, useSettings } from '@/store/settings';
import { fonts } from '@/theme/tokens';
import { usePalette } from '@/theme/use-palette';
import { Icon } from './icons';
import { PlasmaGradient } from './plasma';
import { T } from './text';

interface Props {
  busy: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  onOpenAgent: () => void;
}

export function Composer({ busy, onSend, onStop, onOpenAgent }: Props) {
  const pal = usePalette();
  const { toast } = useToast();
  const [text, setText] = useState('');
  const settings = useSettings();
  const model = modelById(activeModelId(settings));
  const mode = modeById(settings.mode);
  const deep = settings.deep;
  const canSend = text.trim().length > 0 && !busy;

  const submit = () => {
    if (!canSend) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <View
      style={{
        margin: 12,
        marginTop: 4,
        backgroundColor: pal.surface,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: pal.line,
        padding: 12,
        gap: 10,
      }}
    >
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Pregunta lo que quieras…"
        placeholderTextColor={pal.muted}
        multiline
        onSubmitEditing={submit}
        submitBehavior="blurAndSubmit"
        onKeyPress={(e) => {
          // Web: Enter envía, Shift+Enter salta de línea.
          const ne = e.nativeEvent as unknown as { key: string; shiftKey?: boolean };
          if (ne.key === 'Enter' && !ne.shiftKey) {
            (e as unknown as { preventDefault?: () => void }).preventDefault?.();
            submit();
          }
        }}
        style={{
          color: pal.text,
          fontFamily: fonts.ui,
          fontSize: 16,
          maxHeight: 140,
          minHeight: 24,
          padding: 0,
          outlineStyle: 'none',
        } as object}
        accessibilityLabel="Mensaje"
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable
          onPress={onOpenAgent}
          accessibilityRole="button"
          accessibilityLabel="Elegir modo y modelo"
          style={({ pressed }) => ({
            flexShrink: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: pal.surface2,
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 7,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Icon name={mode.icon} size={16} plasma />
          <T size={13} weight="medium" numberOfLines={1} style={{ flexShrink: 1 }}>
            {mode.label} · {model.name}
          </T>
        </Pressable>
        <Pressable
          onPress={settings.toggleDeep}
          accessibilityRole="switch"
          accessibilityState={{ checked: deep }}
          accessibilityLabel="Profundo: razonamiento y más contexto"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          {deep ? (
            <PlasmaGradient style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 }}>
              <Icon name="spark" size={14} color="#1A0B05" />
              <T size={13} weight="semibold" tone="onPlasma">
                Profundo
              </T>
            </PlasmaGradient>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: pal.surface2 }}>
              <Icon name="spark" size={14} color={pal.muted} />
              <T size={13} weight="medium" tone="muted">
                Profundo
              </T>
            </View>
          )}
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dictar por voz"
          onPress={() => toast.show({ label: 'Voz sin conexión', description: 'Llega en la fase F4 (whisper.cpp).' })}
          style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="mic" size={20} color={pal.muted} />
        </Pressable>
        <Pressable
          onPress={busy ? onStop : submit}
          disabled={!busy && !canSend}
          accessibilityRole="button"
          accessibilityLabel={busy ? 'Detener' : 'Enviar'}
          style={({ pressed }) => ({ opacity: !busy && !canSend ? 0.4 : pressed ? 0.8 : 1 })}
        >
          <PlasmaGradient
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 18px ${pal.glow}`,
            }}
          >
            <Icon name={busy ? 'stop' : 'up'} size={20} color="#1A0B05" strokeWidth={2.4} />
          </PlasmaGradient>
        </Pressable>
      </View>
    </View>
  );
}
