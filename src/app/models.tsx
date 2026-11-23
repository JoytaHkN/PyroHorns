import { useToast } from 'heroui-native';
import { ScrollView } from 'react-native';
import { Icon } from '@/components/icons';
import { Card, Group, Item, PlasmaTag, ProgressBar, SectionLabel } from '@/components/list';
import { BackHeader, Screen } from '@/components/screen';
import { T } from '@/components/text';
import { MODES } from '@/data/agents';
import { LOCAL_MODELS, estimateRamGiB, sizeGB } from '@/data/models';
import { activeModelId, useSettings } from '@/store/settings';

export default function Models() {
  const { toast } = useToast();
  const settings = useSettings();
  const active = activeModelId(settings);
  const totalGB = LOCAL_MODELS.reduce((n, m) => n + sizeGB(m), 0);
  const modesOf = (id: string) => MODES.filter((m) => m.modelId === id).map((m) => m.label);

  return (
    <Screen>
      <BackHeader title="Modelos GGUF" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 40 }}>
        <SectionLabel>En este dispositivo</SectionLabel>
        <Group>
          {LOCAL_MODELS.map((m, i) => {
            const modes = modesOf(m.id);
            return (
              <Item
                key={m.id}
                first={i === 0}
                icon="chip"
                title={m.name}
                subtitle={[
                  `${m.quant} · ${sizeGB(m).toFixed(1)} GB · ≈ ${estimateRamGiB(m, m.defaultCtx).toFixed(1)} GB de RAM con ${m.defaultCtx / 1024}K`,
                  m.role,
                  modes.length ? `Modos: ${modes.join(', ')}` : 'Sin modo asignado · elígelo en Avanzado',
                ].join('\n')}
                onPress={() => settings.setModelOverride(m.id === active ? null : m.id)}
                end={
                  m.id === active ? (
                    <PlasmaTag>Activo</PlasmaTag>
                  ) : (
                    <T size={13} tone="muted">
                      {m.optional ? 'Opcional' : 'Listo'}
                    </T>
                  )
                }
              />
            );
          })}
        </Group>
        <T size={12} tone="muted">
          Tocar un modelo lo fija a mano (Avanzado); tocar el activo vuelve al modelo automático del modo.
        </T>
        <SectionLabel>Almacenamiento</SectionLabel>
        <Group>
          <Item icon="sliders" first title="Espacio en modelos" subtitle={`${totalGB.toFixed(1)} GB en ${LOCAL_MODELS.length} archivos`}>
            <ProgressBar value={totalGB / 16} />
          </Item>
        </Group>
        <T size={12} tone="muted">
          La carga real con llama.cpp, la RAM en uso y las descargas llegan en F1.5 y F2.
        </T>
        <Card center onPress={() => toast.show({ label: 'Importar .gguf', description: 'Disponible en F2 (selector de archivos del sistema).' })}>
          <Icon name="plus" plasma />
          <T weight="semibold" tone="ink">
            Importar archivo .gguf
          </T>
        </Card>
      </ScrollView>
    </Screen>
  );
}
