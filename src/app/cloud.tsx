import { Button, Input, useToast } from 'heroui-native';
import { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { Collapsible } from '@/components/list';
import { BackHeader, Screen } from '@/components/screen';
import { T } from '@/components/text';
import { CLOUD_COMPANIES } from '@/data/cloud-catalog';
import type { CloudProviderId } from '@/data/models';
import { cloudAvailable, deleteCloudKey, getCloudKey, saveCloudKey } from '@/lib/cloud';
import { errorSummary } from '@/lib/log';
import { CLOUD_PROVIDERS } from '@/providers/cloud';

/** Clave de un proveedor, plegada hasta que se toca (P33): se guarda en el almacén seguro (S5-B) y nunca se vuelve a mostrar. */
function ProviderKey({ id, note }: { id: CloudProviderId; note: string }) {
  const [open, setOpen] = useState(false);
  const provider = CLOUD_PROVIDERS[id]!;
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
    <Collapsible title={provider.name} detail={saved ? 'Clave guardada en este teléfono' : 'Sin clave'} open={open} onToggle={() => setOpen((v) => !v)}>
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
      <T size={12} tone="muted">
        {note}
      </T>
    </Collapsible>
  );
}

export default function Cloud() {
  return (
    <Screen>
      <BackHeader title="Agente en la nube" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <T size={13} tone="muted">
          Con un modelo en la nube, tus mensajes y el historial de esa conversación salen del teléfono hacia el proveedor.
          Lee sus condiciones: algunos servicios gratuitos pueden guardar o usar lo que envías.
        </T>
        {cloudAvailable ? null : <T size={13}>Disponible solo en la app de Android.</T>}
        {CLOUD_COMPANIES.filter((c) => !c.keyless).map((c) => (
          <ProviderKey key={c.id} id={c.id} note={c.free} />
        ))}
        <T size={12} tone="muted">
          Los modelos se eligen en Agente, en el selector del cuadro de texto. Pollinations no necesita clave.
        </T>
      </ScrollView>
    </Screen>
  );
}
