import { useToast } from 'heroui-native';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Pressable, ScrollView, View } from 'react-native';
import { Icon } from '@/components/icons';
import { Card, Group, Item, PlasmaTag, ProgressBar, SectionLabel } from '@/components/list';
import { BackHeader, Screen } from '@/components/screen';
import { T } from '@/components/text';
import { MODES } from '@/data/agents';
import { LOCAL_MODELS, canChat, estimateRamGiB, sizeGB, type LocalModel } from '@/data/models';
import { errorSummary } from '@/lib/log';
import { SHARED_MODELS_DIR } from '@/lib/model-files';
import { importGguf } from '@/lib/model-import';
import { locateModel } from '@/lib/native';
import { activeModelId, useSettings } from '@/store/settings';
import { hasAllFilesAccess, requestAllFilesAccess } from '@pyrohorns/llama';

export default function Models() {
  const { toast } = useToast();
  const settings = useSettings();
  const active = activeModelId(settings);
  const totalGB = LOCAL_MODELS.reduce((n, m) => n + sizeGB(m), 0);
  const [version, setVersion] = useState(0);
  const [importing, setImporting] = useState(false);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const granted = hasAllFilesAccess();
  const available = (file: string) => locateModel(file) !== null;
  void version; // fuerza a releer disponibilidad y permiso tras importar o volver de Ajustes del sistema

  // Al volver de la pantalla del sistema donde se concede el permiso, se vuelve a comprobar.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const runImport = async () => {
    if (importing) return;
    setImporting(true);
    try {
      const r = await importGguf();
      if (r.status === 'done') {
        toast.show({ variant: 'success', label: 'Modelo importado', description: `${r.name} · ${(r.bytes / 1e9).toFixed(2)} GB` });
      } else if (r.status === 'unknown') {
        toast.show({
          variant: 'danger',
          label: 'No es un modelo conocido',
          description: `«${r.name}» no coincide con ningún GGUF de la lista (ni por nombre ni por tamaño).`,
        });
      }
    } catch (e) {
      toast.show({ variant: 'danger', label: 'No se pudo importar', description: errorSummary(e) });
    } finally {
      setImporting(false);
      refresh();
    }
  };

  const modesOf = (id: string) => MODES.filter((m) => m.modelId === id).map((m) => m.label);

  const SECTIONS: { title: string; note?: string; models: LocalModel[] }[] = [
    { title: 'Chat (texto)', models: LOCAL_MODELS.filter((m) => (m.kind ?? 'chat') === 'chat') },
    {
      title: 'Visión',
      note: 'Pueden ver imágenes con su complemento (mmproj), pero la app aún no admite imágenes: por ahora conversan solo con texto.',
      models: LOCAL_MODELS.filter((m) => m.kind === 'vision'),
    },
    {
      title: 'Complementos (no se usan solos)',
      note: 'Ninguno de tus archivos genera imágenes ni video.',
      models: LOCAL_MODELS.filter((m) => m.kind === 'aux'),
    },
  ];

  const row = (m: LocalModel, i: number) => {
    const modes = modesOf(m.id);
    const usable = canChat(m);
    return (
      <Item
        key={m.id}
        first={i === 0}
        icon="chip"
        title={m.name}
        subtitle={[
          usable
            ? `${m.quant} · ${sizeGB(m).toFixed(1)} GB · ≈ ${estimateRamGiB(m, m.defaultCtx).toFixed(1)} GB de RAM con ${m.defaultCtx / 1024}K`
            : `${m.quant} · ${sizeGB(m).toFixed(1)} GB`,
          m.role,
          ...(modes.length ? [`Modos: ${modes.join(', ')}`] : []),
        ].join('\n')}
        {...(usable ? { onPress: () => settings.setModelOverride(m.id === active ? null : m.id) } : {})}
        end={
          m.id === active ? (
            <PlasmaTag>Activo</PlasmaTag>
          ) : (
            <T size={13} tone="muted">
              {available(m.file) ? 'Disponible' : m.optional ? 'Opcional · falta' : 'Falta'}
            </T>
          )
        }
      >
        {m.mmproj ? (
          <Pressable
            onPress={() => void Linking.openURL(m.mmproj!.url).catch(() => toast.show('No se pudo abrir el enlace'))}
            accessibilityRole="link"
            style={{ paddingTop: 8 }}
          >
            <T size={12} tone="ink" weight="semibold">
              Descargar complemento de visión ({m.mmproj.sizeMB} MB)
            </T>
            <T size={11} tone="muted">
              {m.mmproj.note}
            </T>
          </Pressable>
        ) : null}
      </Item>
    );
  };

  return (
    <Screen>
      <BackHeader title="Modelos GGUF" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 40 }}>
        {SECTIONS.map((section) => (
          <View key={section.title} style={{ gap: 8 }}>
            <SectionLabel>{section.title}</SectionLabel>
            {section.note ? (
              <T size={12} tone="muted">
                {section.note}
              </T>
            ) : null}
            <Group>{section.models.map(row)}</Group>
          </View>
        ))}
        <T size={12} tone="muted">
          Tocar un modelo lo fija a mano (Avanzado); tocar el activo vuelve al modelo automático del modo.
        </T>
        <SectionLabel>Acceso a los modelos</SectionLabel>
        <Group>
          <Item
            first
            icon="lock"
            title="Carpeta de la app"
            subtitle="Sin permisos. Importas cada .gguf con el selector y se copia a la app (ocupa ese espacio otra vez)."
            onPress={() => settings.setModelAccess('app')}
            end={settings.modelAccess === 'app' ? <PlasmaTag>Elegido</PlasmaTag> : undefined}
          />
          <Item
            icon="folder"
            title="Todo el almacenamiento"
            subtitle={`Abre los .gguf directo desde ${SHARED_MODELS_DIR}, sin copiarlos. Pide el permiso «Acceso a todos los archivos».`}
            onPress={() => settings.setModelAccess('all')}
            end={settings.modelAccess === 'all' ? <PlasmaTag>Elegido</PlasmaTag> : undefined}
          />
          {settings.modelAccess === 'all' ? (
            <Item
              icon="check"
              title={granted ? 'Permiso concedido' : 'Conceder acceso a todos los archivos'}
              subtitle={granted ? 'La app puede leer la carpeta del proyecto.' : 'Se abre la pantalla de Android: activa «Permitir acceso para administrar todos los archivos».'}
              onPress={granted ? undefined : () => requestAllFilesAccess()}
            />
          ) : null}
        </Group>
        <T size={12} tone="muted">
          Por defecto, la carpeta de la app (sin permisos). Con «Todo el almacenamiento» también se leen los modelos importados.
        </T>
        <SectionLabel>Almacenamiento</SectionLabel>
        <Group>
          <Item icon="sliders" first title="Espacio en modelos" subtitle={`${totalGB.toFixed(1)} GB en ${LOCAL_MODELS.length} archivos`}>
            <ProgressBar value={totalGB / 60} />
          </Item>
        </Group>
        <T size={12} tone="muted">
          La RAM en uso y las descargas llegan en F1.5 (medidas) y F2.
        </T>
        <Card center onPress={() => void runImport()}>
          <Icon name="plus" plasma />
          <T weight="semibold" tone="ink">
            {importing ? 'Copiando… no cierres la app' : 'Importar archivo .gguf'}
          </T>
        </Card>
      </ScrollView>
    </Screen>
  );
}
