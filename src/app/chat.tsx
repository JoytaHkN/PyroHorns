import { Button, Dialog } from 'heroui-native';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { AgentPicker } from '@/components/agent-picker';
import { Composer } from '@/components/composer';
import { Drawer } from '@/components/drawer';
import { Icon } from '@/components/icons';
import { Mascot } from '@/components/mascot';
import { MessageBubble } from '@/components/message';
import { Orb } from '@/components/orb';
import { RoundButton, Screen } from '@/components/screen';
import { T } from '@/components/text';
import { modeById } from '@/data/agents';
import { contextTokens, modelById } from '@/data/models';
import { conversationTokens, formatTokens } from '@/lib/context';
import { send, stop } from '@/lib/engine';
import { useActiveConversation, useChat } from '@/store/chat';
import { activeModelId, useSettings } from '@/store/settings';
import { usePalette } from '@/theme/use-palette';

const SUGGESTIONS = [
  '¿Qué ecuaciones describen un sistema de tres cuerpos?',
  'Escribe un script para ordenar fotos por fecha',
  'Planifica una app de recetas en 5 pasos',
];

export default function ChatScreen() {
  const pal = usePalette();
  const conv = useActiveConversation();
  const select = useChat((s) => s.select);
  const remove = useChat((s) => s.remove);
  const settings = useSettings();
  const model = modelById(activeModelId(settings));
  const [drawer, setDrawer] = useState(false);
  const [picker, setPicker] = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  const messages = conv?.messages ?? [];
  const last = messages[messages.length - 1];
  const busy = !!last && last.role === 'assistant' && (last.status === 'thinking' || last.status === 'streaming');
  const used = conversationTokens(messages);
  const ctx = contextTokens(model, settings.deep);

  useEffect(() => {
    if (messages.length) requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, [messages.length, last?.content.length]);

  const onSend = (text: string) => {
    void send(text, conv?.id);
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        {/* Barra superior: menú + título + tokens | nueva conversación */}
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 }}>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: pal.surface,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: pal.line,
              paddingRight: 14,
            }}
          >
            <Pressable onPress={() => setDrawer(true)} accessibilityLabel="Abrir menú" style={{ padding: 11 }}>
              <Icon name="menu" size={20} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <T weight="semibold" numberOfLines={1}>
                {conv?.title ?? 'PyroHorns'}
              </T>
              <T size={11} tone="muted" style={{ lineHeight: 14 }}>
                ~{formatTokens(used)} / {formatTokens(ctx)} tokens · {modeById(settings.mode).label}
                {settings.deep ? ' · Profundo' : ''}
              </T>
            </View>
          </View>
          <RoundButton icon="plus" label="Nueva conversación" plasma onPress={() => select(null)} />
        </View>

        {messages.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 }}>
            <Mascot size={88} />
            <T weight="bold" size={22}>
              ¿En qué trabajamos hoy?
            </T>
            <View style={{ gap: 8, alignSelf: 'stretch' }}>
              {SUGGESTIONS.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => onSend(s)}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? pal.surface2 : pal.surface,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: pal.line,
                    padding: 12,
                    flexDirection: 'row',
                    gap: 10,
                    alignItems: 'center',
                  })}
                >
                  <Icon name="spark" size={18} plasma />
                  <T size={14} style={{ flex: 1 }}>
                    {s}
                  </T>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => <MessageBubble m={item} />}
            contentContainerStyle={{ padding: 16, gap: 16 }}
            ListFooterComponent={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <Orb size={10} active={busy} />
                <T size={12} tone="muted">
                  {busy ? `${model.name} generando…` : `${model.name} · respuestas simuladas hasta F1.5`}
                </T>
              </View>
            }
          />
        )}

        <Composer busy={busy} onSend={onSend} onStop={() => conv && stop(conv.id)} onOpenAgent={() => setPicker(true)} />
      </KeyboardAvoidingView>

      <Drawer open={drawer} onClose={() => setDrawer(false)} onNew={() => select(null)} onAskDelete={setToDelete} />
      <AgentPicker open={picker} onOpenChange={setPicker} />

      <Dialog isOpen={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content>
            <Dialog.Title>Borrar conversación</Dialog.Title>
            <Dialog.Description>Se eliminará de este dispositivo. No se puede deshacer.</Dialog.Description>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <Button variant="ghost" onPress={() => setToDelete(null)}>
                <Button.Label>Cancelar</Button.Label>
              </Button>
              <Button
                variant="danger"
                onPress={() => {
                  if (toDelete) {
                    stop(toDelete);
                    remove(toDelete);
                  }
                  setToDelete(null);
                }}
              >
                <Button.Label>Borrar</Button.Label>
              </Button>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </Screen>
  );
}
