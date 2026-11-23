import { useToast } from 'heroui-native';
import { View } from 'react-native';
import { Icon } from '@/components/icons';
import { Card, Group, Item, PlasmaTag, ProgressBar, SectionLabel } from '@/components/list';
import { BackHeader, Screen } from '@/components/screen';
import { T } from '@/components/text';
import { LOCAL_MODELS } from '@/data/models';
import { activeModelId, useSettings } from '@/store/settings';

export default function Models() {
  const { toast } = useToast();
  const settings = useSettings();
  const active = activeModelId(settings);
  const totalGB = LOCAL_MODELS.reduce((n, m) => n + m.sizeGB, 0);

  return (
    <Screen>
      <BackHeader title="Modelos GGUF" />
      <View style={{ padding: 16, gap: 8 }}>
        <SectionLabel>En este dispositivo</SectionLabel>
        <Group>
          {LOCAL_MODELS.map((m, i) => (
            <Item
              key={m.id}
              first={i === 0}
              icon="chip"
              title={m.name}
              subtitle={`${m.quant} · ${m.sizeGB.toFixed(1)} GB · ${m.role}`}
              onPress={() => settings.setModelOverride(m.id)}
              end={
                m.id === active ? (
                  <PlasmaTag>Activo</PlasmaTag>
                ) : (
                  <T size={13} tone="muted">
                    Listo
                  </T>
                )
              }
            />
          ))}
        </Group>
        <SectionLabel>Almacenamiento</SectionLabel>
        <Group>
          <Item icon="sliders" first title="Espacio en modelos" subtitle={`${totalGB.toFixed(1)} GB en 4 archivos`}>
            <ProgressBar value={totalGB / 16} />
          </Item>
        </Group>
        <T size={12} tone="muted">
          F1 muestra el catálogo; la carga real con llama.cpp, la RAM en uso y las descargas llegan en F2.
        </T>
        <Card
          center
          onPress={() => toast.show({ label: 'Importar .gguf', description: 'Disponible en F2 (selector de archivos del sistema).' })}
        >
          <Icon name="plus" plasma />
          <T weight="semibold" tone="ink">
            Importar archivo .gguf
          </T>
        </Card>
      </View>
    </Screen>
  );
}
