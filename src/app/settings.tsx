import { router } from 'expo-router';
import { Button, Dialog, Input, Switch, useToast } from 'heroui-native';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Group, Item, PlasmaTag, SectionLabel } from '@/components/list';
import { PlasmaGradient } from '@/components/plasma';
import { BackHeader, Screen } from '@/components/screen';
import { T } from '@/components/text';
import { errorSummary } from '@/lib/log';
import { useBoot } from '@/store/boot';
import { useChat } from '@/store/chat';
import { useSettings } from '@/store/settings';
import { themePresets } from '@/theme/tokens';
import { usePalette } from '@/theme/use-palette';

/** Crear, cambiar o quitar la contraseña de copia (duda 1-b). Solo se pide al restaurar. */
function BackupPasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const { backupSet, setBackupPassword, clearBackupPassword } = useBoot();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const mismatch = pw2.length > 0 && pw !== pw2;
  const canSave = pw.length > 0 && pw === pw2 && !busy;

  const close = () => {
    setPw('');
    setPw2('');
    onOpenChange(false);
  };

  const run = async (op: () => Promise<void>, ok: string) => {
    setBusy(true);
    try {
      await op();
      toast.show({ variant: 'success', label: ok });
      close();
    } catch (e) {
      toast.show({ variant: 'danger', label: 'No se pudo guardar', description: errorSummary(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog isOpen={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content>
          <Dialog.Title>{backupSet ? 'Cambiar contraseña de copia' : 'Contraseña de copia'}</Dialog.Title>
          <Dialog.Description>
            Protege la clave de tus conversaciones dentro de la copia de seguridad de Android. Solo se pide al restaurar
            una copia en otro móvil o tras reinstalar.
          </Dialog.Description>
          <View style={{ gap: 10, marginTop: 12 }}>
            <Input
              placeholder="Contraseña de copia"
              value={pw}
              onChangeText={setPw}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Contraseña de copia"
            />
            <Input
              placeholder="Repite la contraseña"
              value={pw2}
              onChangeText={setPw2}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={() => canSave && void run(() => setBackupPassword(pw), 'Contraseña de copia guardada')}
              accessibilityLabel="Repite la contraseña de copia"
            />
            {mismatch && (
              <T size={13} style={{ color: '#E5484D' }}>
                Las contraseñas no coinciden.
              </T>
            )}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
            {backupSet && (
              <Button variant="ghost" isDisabled={busy} onPress={() => void run(clearBackupPassword, 'Contraseña de copia quitada')}>
                <Button.Label>Quitar</Button.Label>
              </Button>
            )}
            <Button variant="ghost" onPress={close}>
              <Button.Label>Cancelar</Button.Label>
            </Button>
            <Button isDisabled={!canSave} onPress={() => void run(() => setBackupPassword(pw), 'Contraseña de copia guardada')}>
              <Button.Label>Guardar</Button.Label>
            </Button>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}

export default function Settings() {
  const pal = usePalette();
  const { toast } = useToast();
  const scheme = useSettings((s) => s.scheme);
  const toggleScheme = useSettings((s) => s.toggleScheme);
  const removeAll = useChat((s) => s.removeAll);
  const backupSupported = useBoot((s) => s.backupSupported);
  const backupSet = useBoot((s) => s.backupSet);
  const [backupOpen, setBackupOpen] = useState(false);
  const soon = (what: string, phase: string) => () => toast.show({ label: what, description: `Llega en ${phase}.` });

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
          <Item icon="sliders" title="Diagnóstico del motor" subtitle="Rastros y cierres inesperados (F1.5)" onPress={() => router.push('/diagnostico')} />
        </Group>

        <SectionLabel>Respuestas</SectionLabel>
        <Group>
          <Item first icon="spark" title="Prompts de sistema" subtitle="Crear y gestionar instrucciones" onPress={soon('Prompts de sistema', 'F3')} />
          <Item icon="sliders" title="Generación" subtitle="Parámetros del modelo" onPress={soon('Parámetros de generación', 'F2')} />
          <Item icon="chip" title="Contexto" subtitle="Gestión de contexto" onPress={soon('Gestión de contexto', 'F2')} />
        </Group>

        {backupSupported && (
          <>
            <SectionLabel>Copia de seguridad</SectionLabel>
            <Group>
              <Item
                first
                icon="lock"
                title="Contraseña de copia"
                subtitle={
                  backupSet
                    ? 'Activada · se pide solo al restaurar una copia'
                    : 'Sin contraseña · la copia de Android no podrá leer tus conversaciones al restaurarla'
                }
                onPress={() => setBackupOpen(true)}
                end={backupSet ? <PlasmaTag>Activa</PlasmaTag> : undefined}
              />
            </Group>
          </>
        )}

        <SectionLabel>Datos</SectionLabel>
        <Group>
          <Item
            first
            icon="trash"
            title="Borrar todas las conversaciones"
            subtitle="Solo en este dispositivo"
            onLongPress={() => {
              removeAll();
              toast.show({ variant: 'success', label: 'Conversaciones borradas' });
            }}
            onPress={() => toast.show({ label: 'Mantén pulsado para confirmar' })}
          />
        </Group>
        <T size={12} tone="muted" style={{ textAlign: 'center', marginTop: 12 }}>
          PyroHorns 0.1.0 · F1.1 · GPL-3.0
        </T>
      </ScrollView>

      <BackupPasswordDialog open={backupOpen} onOpenChange={setBackupOpen} />
    </Screen>
  );
}
