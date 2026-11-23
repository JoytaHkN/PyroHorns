import { Switch, useToast } from 'heroui-native';
import { Pressable, ScrollView, View } from 'react-native';
import { Group, Item, PlasmaTag, SectionLabel } from '@/components/list';
import { PlasmaGradient } from '@/components/plasma';
import { BackHeader, Screen } from '@/components/screen';
import { T } from '@/components/text';
import { router } from 'expo-router';
import { useChat } from '@/store/chat';
import { useSettings } from '@/store/settings';
import { themePresets } from '@/theme/tokens';
import { usePalette } from '@/theme/use-palette';

export default function Settings() {
  const pal = usePalette();
  const { toast } = useToast();
  const scheme = useSettings((s) => s.scheme);
  const toggleScheme = useSettings((s) => s.toggleScheme);
  const soon = (what: string, phase: string) => () =>
    toast.show({ label: what, description: `Llega en ${phase}.` });

  return (
    <Screen>
      <BackHeader title="Ajustes" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 40 }}>
        <SectionLabel>Apariencia</SectionLabel>
        <Group>
          <Item
            first
            icon={scheme === 'dark' ? 'moon' : 'sun'}
            title="Tema oscuro"
            subtitle="Grafito con acentos Plasma"
            onPress={toggleScheme}
            end={<Switch isSelected={scheme === 'dark'} onSelectedChange={toggleScheme} />}
          />
          <Item icon="palette" title="Color del tema" subtitle="Plasma, vista previa en vivo" end={<PlasmaTag>Nuevo</PlasmaTag>}>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              {themePresets.map((p, i) => (
                <Pressable
                  key={p.id}
                  accessibilityLabel={p.label}
                  onPress={i === 0 ? undefined : soon(`Tema ${p.label}`, 'una próxima versión')}
                  style={{
                    padding: 2,
                    borderRadius: 999,
                    borderWidth: 2,
                    borderColor: i === 0 ? pal.ink : 'transparent',
                  }}
                >
                  {i === 0 ? (
                    <PlasmaGradient style={{ width: 28, height: 28, borderRadius: 14 }} />
                  ) : (
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: p.colors[0] }} />
                  )}
                </Pressable>
              ))}
            </View>
          </Item>
        </Group>

        <SectionLabel>Servicios</SectionLabel>
        <Group>
          <Item first icon="cloud" title="Proveedores" subtitle="Claves API, URL base y selección" onPress={soon('Proveedores online', 'F6')} />
          <Item icon="chip" title="Modelos" subtitle="Activar, desactivar y configurar" onPress={() => router.push('/models')} />
        </Group>

        <SectionLabel>Respuestas</SectionLabel>
        <Group>
          <Item first icon="spark" title="Prompts de sistema" subtitle="Crear y gestionar instrucciones" onPress={soon('Prompts de sistema', 'F3')} />
          <Item icon="sliders" title="Generación" subtitle="Parámetros del modelo" onPress={soon('Parámetros de generación', 'F2')} />
          <Item icon="chip" title="Contexto" subtitle="Gestión de contexto" onPress={soon('Gestión de contexto', 'F2')} />
        </Group>

        <SectionLabel>Datos</SectionLabel>
        <Group>
          <Item
            first
            icon="trash"
            title="Borrar todas las conversaciones"
            subtitle="Solo en este dispositivo"
            onLongPress={() => {
              useChat.setState({ conversations: [], activeId: null });
              toast.show({ variant: 'success', label: 'Conversaciones borradas' });
            }}
            onPress={() => toast.show({ label: 'Mantén pulsado para confirmar' })}
          />
        </Group>
        <T size={12} tone="muted" style={{ textAlign: 'center', marginTop: 12 }}>
          Agora Fire 0.1.0 · F1
        </T>
      </ScrollView>
    </Screen>
  );
}
