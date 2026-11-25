import { Button, Input, useToast } from 'heroui-native';
import { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { Group, Item, PlasmaTag, SectionLabel } from '@/components/list';
import { BackHeader, Screen } from '@/components/screen';
import { T } from '@/components/text';
import { CLOUD_MODELS, type CloudProviderId } from '@/data/models';
import { cloudAvailable, deleteCloudKey, getCloudKey, saveCloudKey } from '@/lib/cloud';
import { errorSummary } from '@/lib/log';
import { CLOUD_PROVIDERS } from '@/providers/cloud';
import { activeModelId, useSettings } from '@/store/settings';

/** Clave de un proveedor: se guarda en el almacén seguro (S5-B) y nunca se vuelve a mostrar. */
function ProviderKey({ id }: { id: CloudProviderId }) {
  const provider = CLOUD_PROVIDERS[id];
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);
  const [key, setKey] = useState('');
  const refresh = useCallback(() => {
    if (cloudAvailable) void getCloudKey(id).then((k) => setSaved(!!k));
  }, [id]);
  useEffect(refresh, [refresh]);

  const run = async (op: () => Promise<void>, ok: string) => {
    try {
      await op();
      setKey('');
      toast.show({ variant: 'success', label: ok });
    } catch (e) {
      toast.show({ variant: 'danger', label: 'No se pudo guardar', description: errorSummary(e) });
    }
    refresh();
  };

  return (
    <View style={{ gap: 8 }}>
      <SectionLabel>{provider.name}</SectionLabel>
      <T size={12} tone="muted">
        {saved ? 'Clave guardada en este teléfono.' : 'Sin clave.'}
      </T>
      <Input
        placeholder={saved ? 'Pega otra clave para cambiarla' : 'Pega aquí tu clave'}
        value={key}
        onChangeText={setKey}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={`Clave de ${provider.name}`}
      />
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Button isDisabled={!key.trim()} onPress={() => void run(() => saveCloudKey(id, key), 'Clave guardada')}>
          <Button.Label>Guardar</Button.Label>
        </Button>
        <Button variant="ghost" onPress={() => void Linking.openURL(provider.keyPage).catch(() => {})}>
          <Button.Label>Conseguir clave</Button.Label>
        </Button>
        {saved ? (
          <Button variant="ghost" onPress={() => void run(() => deleteCloudKey(id), 'Clave borrada')}>
            <Button.Label>Quitar</Button.Label>
          </Button>
        ) : null}
      </View>
    </View>
  );
}

export default function Cloud() {
  const settings = useSettings();
  const active = activeModelId(settings);
  return (
    <Screen>
      <BackHeader title="Agente en la nube" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <T size={13} tone="muted">
          Con un modelo en la nube, tus mensajes y el historial de esa conversación salen del teléfono hacia el proveedor.
          Lee sus condiciones: algunos servicios gratuitos pueden guardar o usar lo que envías.
        </T>
        {cloudAvailable ? null : <T size={13}>Disponible solo en la app de Android.</T>}
        <ProviderKey id="nvidia" />
        <ProviderKey id="openrouter" />
        <SectionLabel>Modelo</SectionLabel>
        <Group>
          {CLOUD_MODELS.map((m, i) => (
            <Item
              key={m.id}
              first={i === 0}
              icon="cloud"
              title={m.name}
              subtitle={m.role}
              onPress={() => settings.setModelOverride(m.id === active ? null : m.id)}
              end={m.id === active ? <PlasmaTag>Activo</PlasmaTag> : undefined}
            />
          ))}
        </Group>
        <T size={12} tone="muted">
          Tocar un modelo lo usa en el chat; tocarlo otra vez vuelve al modelo del teléfono.
        </T>
      </ScrollView>
    </Screen>
  );
}
