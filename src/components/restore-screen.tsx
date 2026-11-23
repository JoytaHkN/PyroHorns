import { Button, Dialog, Input } from 'heroui-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useBoot } from '@/store/boot';
import { Icon } from './icons';
import { Mascot } from './mascot';
import { Screen } from './screen';
import { T } from './text';

/**
 * Pantalla previa a la app cuando la base no se puede abrir:
 * - locked: copia restaurada con sobre → pedir la contraseña de copia (duda 1-b).
 * - unreadable: copia restaurada sin sobre → solo se puede empezar de cero.
 * - error: fallo al abrir la base → reintentar.
 * "Empezar de cero" aparta los archivos antiguos sin borrarlos.
 */
export function RestoreScreen() {
  const { state, error, unlock, startFresh, start } = useBoot();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [confirmFresh, setConfirmFresh] = useState(false);

  const submit = async () => {
    if (!password || busy) return;
    setBusy(true);
    setWrong(false);
    const ok = await unlock(password);
    setBusy(false);
    if (!ok) setWrong(true);
  };

  const title =
    state === 'locked' ? 'Restaurar copia de seguridad' : state === 'unreadable' ? 'Copia sin contraseña' : 'No se pudo abrir la base';
  const body =
    state === 'locked'
      ? 'Escribe tu contraseña de copia para leer las conversaciones de esta copia.'
      : state === 'unreadable'
        ? 'Esta copia se hizo sin contraseña de copia, así que sus conversaciones no se pueden leer en este móvil.'
        : `Error al abrir las conversaciones${error ? `: ${error}` : ''}.`;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 }}>
        <View style={{ alignItems: 'center', gap: 12 }}>
          <Mascot size={96} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="lock" size={20} plasma />
            <T weight="bold" size={22}>
              {title}
            </T>
          </View>
          <T tone="muted" style={{ textAlign: 'center' }}>
            {body}
          </T>
        </View>

        {state === 'locked' && (
          <View style={{ gap: 10 }}>
            <Input
              placeholder="Contraseña de copia"
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                setWrong(false);
              }}
              secureTextEntry
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={submit}
              accessibilityLabel="Contraseña de copia"
            />
            {wrong && (
              <T size={13} style={{ color: '#E5484D' }}>
                Contraseña incorrecta.
              </T>
            )}
            <Button onPress={submit} isDisabled={!password || busy}>
              <Button.Label>{busy ? 'Abriendo…' : 'Desbloquear'}</Button.Label>
            </Button>
          </View>
        )}

        {state === 'error' ? (
          <Button onPress={() => void start()}>
            <Button.Label>Reintentar</Button.Label>
          </Button>
        ) : (
          <Button variant="ghost" onPress={() => setConfirmFresh(true)}>
            <Button.Label>Empezar de cero</Button.Label>
          </Button>
        )}
      </ScrollView>

      <Dialog isOpen={confirmFresh} onOpenChange={setConfirmFresh}>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content>
            <Dialog.Title>Empezar de cero</Dialog.Title>
            <Dialog.Description>
              Se crea una base nueva y vacía. Los archivos de la copia se conservan aparte, sin borrarlos.
            </Dialog.Description>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <Button variant="ghost" onPress={() => setConfirmFresh(false)}>
                <Button.Label>Cancelar</Button.Label>
              </Button>
              <Button
                onPress={() => {
                  setConfirmFresh(false);
                  void startFresh();
                }}
              >
                <Button.Label>Empezar de cero</Button.Label>
              </Button>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </Screen>
  );
}
