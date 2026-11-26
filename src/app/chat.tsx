import { Button, Dialog, useToast } from 'heroui-native';
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
import { cloudAvailable } from '@/lib/cloud';
import { errorSummary } from '@/lib/log';
import { completeLocal, send, stop } from '@/lib/engine';
import { systemPrompt } from '@/lib/system-prompt';
import { listen, stopMic } from '@/lib/voice/listen';
import { voiceModelInstalled } from '@/lib/voice/model';
import { refineTranscript } from '@/lib/voice/refine';
import { cleanTranscript } from '@/lib/voice/text';
import { voiceVocabulary } from '@/lib/voice/vocabulary';
import { preloadLlamaModel } from '@/providers/llama';
import { useActiveConversation, useChat } from '@/store/chat';
import { useEngine } from '@/store/engine';
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
  const native = useEngine((s) => s.native);
  const loading = useEngine((s) => s.loading);
  const searching = useEngine((s) => s.searching);
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

  // Carga anticipada: al abrir el chat y al cambiar de modelo o de contexto.
  useEffect(() => {
    if (native && !model.cloud) void preloadLlamaModel({ modelId: model.id, contextTokens: ctx, system: systemPrompt(model.id) });
  }, [native, model.id, ctx]);

  useEffect(() => {
    if (messages.length) requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, [messages.length, last?.content.length]);

  // Voz (P25): doble toque en el chat para hablar; otro doble toque para terminar (lo dicho se transcribe y se envía).
  const { toast } = useToast();
  const listening = useEngine((s) => s.listening);
  const lastTouch = useRef(0);
  const listenStart = useRef(0);
  const onDoubleTap = () => {
    if (useEngine.getState().listening) {
      // El doble toque que acaba de abrir la escucha no la cierra: pasado un instante, sí (P26-B).
      if (Date.now() - listenStart.current < 1500) return;
      void stopMic();
      return;
    }
    if (!voiceModelInstalled()) {
      toast.show({ label: 'Voz sin instalar', description: 'Instálala en Ajustes → Voz (una vez, 60 MB).' });
      return;
    }
    listenStart.current = Date.now();
    useEngine.getState().setListening(true);
    listen()
      .then(async ({ raw, names }) => {
        useEngine.getState().setListening(false);
        // Sin música, etiquetas ni frases de silencio: si no queda nada, no se crea mensaje (P26-A2).
        const heard = cleanTranscript(raw);
        if (!heard) {
          toast.show({ label: 'No te escuché', description: 'Prueba otra vez, más cerca del micrófono.' });
          return;
        }
        // Corrección con el vocabulario y, si hay un modelo del teléfono cargado, con él (P26-A3). Nunca en la nube.
        const refined = await refineTranscript(heard, { vocabulary: voiceVocabulary(names), names, complete: completeLocal });
        void send(refined.text, conv?.id ?? null, { voice: true, ...(refined.changed ? { heard } : {}) });
      })
      .catch((e: unknown) => {
        useEngine.getState().setListening(false);
        toast.show({ variant: 'danger', label: 'No se pudo escuchar', description: errorSummary(e) });
      });
  };
  const onTouchEnd = () => {
    const now = Date.now();
    if (now - lastTouch.current < 350) {
      lastTouch.current = 0;
      onDoubleTap();
    } else {
      lastTouch.current = now;
    }
  };

  const onSend = (text: string, web = false, cloud = false) => {
    if (cloud && !cloudAvailable) return;
    void send(text, conv?.id, { web, cloud });
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

        <View style={{ flex: 1 }} onTouchEnd={onTouchEnd}>
        {messages.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 }}>
            <Mascot size={88} />
            <T weight="bold" size={22}>
              ¿En qué trabajamos hoy?
            </T>
            {loading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Orb size={10} active />
                <T size={12} tone="muted">
                  Cargando {model.name}…
                </T>
              </View>
            ) : null}
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
            renderItem={({ item }) => <MessageBubble m={item} convId={conv!.id} isLast={item.id === last?.id} />}
            extraData={last?.id}
            contentContainerStyle={{ padding: 16, gap: 16 }}
            ListFooterComponent={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <Orb size={10} active={busy || loading} />
                <T size={12} tone="muted">
                  {searching
                    ? 'Buscando en internet…'
                    : model.cloud
                      ? `${model.name}${busy ? ' generando…' : ''} · en la nube: los mensajes salen del teléfono`
                      : loading
                        ? `Cargando ${model.name}…`
                        : busy
                          ? `${model.name} generando…`
                          : native
                            ? `${model.name} · en tu dispositivo`
                            : `${model.name} · respuestas simuladas`}
                </T>
              </View>
            }
          />
        )}

        </View>

        {listening ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 4 }}>
            <Orb size={10} active />
            <T size={12} tone="muted">
              Escuchando… toca dos veces para terminar.
            </T>
          </View>
        ) : null}

        <Composer busy={busy} onSend={(t, w, c) => onSend(t, w, c)} onStop={() => conv && stop(conv.id)} onOpenAgent={() => setPicker(true)} />
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
