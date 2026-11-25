import * as Clipboard from 'expo-clipboard';
import { useToast } from 'heroui-native';
import { memo, useState } from 'react';
import { Pressable, Share, View } from 'react-native';
import { modelById } from '@/data/models';
import { describeAction, extractActions, type Action as AssistantAction } from '@/lib/assistant/actions';
import { canUndo } from '@/lib/assistant/run';
import { confirmAction, dismissAction, regenerate, revertAction, send } from '@/lib/engine';
import { extractOptions } from '@/lib/options';
import { usageLine } from '@/lib/stats';
import { useChat, type Message } from '@/store/chat';
import { useEngine } from '@/store/engine';
import { usePalette } from '@/theme/use-palette';
import { Icon, type IconName } from './icons';
import { Markdown, openUrl } from './markdown';
import { isOpenableUrl } from './markdown-parse';
import { Orb } from './orb';
import { PlasmaGradient } from './plasma';
import { T } from './text';

/** Copia un texto al portapapeles y avisa. */
function useCopy() {
  const { toast } = useToast();
  return (text: string, done: string) =>
    void Clipboard.setStringAsync(text).then(
      () => toast.show(done),
      () => toast.show('No se pudo copiar'),
    );
}

function UserBubble({ m }: { m: Message }) {
  const pal = usePalette();
  const copy = useCopy();
  return (
    <View style={{ alignSelf: 'flex-end', alignItems: 'flex-end', maxWidth: '85%', gap: 2 }}>
      <View
        style={{
          backgroundColor: pal.surface2,
          borderRadius: 20,
          borderBottomRightRadius: 6,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        <T selectable style={{ lineHeight: 22 }}>
          {m.content}
        </T>
      </View>
      <Action icon="copy" label="Copiar mensaje" onPress={() => copy(m.content, 'Mensaje copiado')} />
    </View>
  );
}

/** Razonamiento plegado: "Pensando…" en vivo o "Pensó N s"; al tocar se despliega el texto. */
function Thinking({ m }: { m: Message }) {
  const pal = usePalette();
  const [open, setOpen] = useState(false);
  const live = m.status === 'thinking';
  const loading = useEngine((s) => s.loading) && live;
  const searching = useEngine((s) => s.searching) && live;
  const hasText = !!m.thinking?.trim();
  if (!live && !m.thinkMs && !hasText) return null;
  const label = searching ? 'Buscando en internet…' : loading ? 'Cargando modelo…' : live ? 'Pensando…' : `Pensó ${Math.max(1, Math.round((m.thinkMs ?? 0) / 1000))} s`;
  return (
    <View style={{ gap: 6 }}>
      <Pressable
        onPress={() => hasText && setOpen((v) => !v)}
        disabled={!hasText}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={hasText ? `${label}. Toca para ${open ? 'ocultar' : 'ver'} el razonamiento` : label}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}
      >
        {live ? <Orb size={12} active /> : <Icon name="spark" size={15} plasma />}
        <T size={13} tone="muted">
          {label}
          {hasText ? (open ? ' · ocultar' : ' · ver') : ''}
        </T>
      </Pressable>
      {hasText && open ? (
        <View style={{ borderLeftWidth: 2, borderLeftColor: pal.line, paddingLeft: 10 }}>
          <T size={13} tone="muted" selectable style={{ lineHeight: 19 }}>
            {m.thinking}
          </T>
        </View>
      ) : null}
    </View>
  );
}

function Action({ icon, label, on, onPress }: { icon: IconName; label: string; on?: boolean; onPress: () => void }) {
  const pal = usePalette();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!on }}
      hitSlop={4}
      style={({ pressed }) => ({ padding: 8, borderRadius: 999, backgroundColor: pressed || on ? pal.surface2 : 'transparent' })}
    >
      <Icon name={icon} size={18} {...(on ? { plasma: true } : { color: pal.muted })} />
    </Pressable>
  );
}

function MenuItem({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
      <Icon name={icon} size={18} />
      <T size={14}>{label}</T>
    </Pressable>
  );
}

/** Compartir, copiar, 👍, 👎 y ⋮ bajo cada respuesta terminada. */
function Actions({ m, convId, isLast }: { m: Message; convId: string; isLast: boolean }) {
  const pal = usePalette();
  const copy = useCopy();
  const [menu, setMenu] = useState(false);
  const rate = (value: 'up' | 'down') =>
    useChat.getState().patchMessage(convId, m.id, { feedback: m.feedback === value ? null : value });
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Action icon="share" label="Compartir respuesta" onPress={() => void Share.share({ message: m.content }).catch(() => {})} />
        <Action icon="copy" label="Copiar respuesta" onPress={() => copy(m.content, 'Respuesta copiada')} />
        <Action icon="thumbUp" label="Me gusta" on={m.feedback === 'up'} onPress={() => rate('up')} />
        <Action icon="thumbDown" label="No me gusta" on={m.feedback === 'down'} onPress={() => rate('down')} />
        <Action icon="more" label="Más opciones" on={menu} onPress={() => setMenu((v) => !v)} />
      </View>
      {menu ? (
        <View
          style={{
            alignSelf: 'flex-start',
            minWidth: 240,
            backgroundColor: pal.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: pal.line,
          }}
        >
          {/* Solo en la última: regenerar una anterior obligaría a borrar lo que vino después. */}
          {isLast ? (
            <MenuItem
              icon="refresh"
              label="Regenerar"
              onPress={() => {
                setMenu(false);
                void regenerate(convId);
              }}
            />
          ) : null}
          <MenuItem
            icon="branch"
            label="Ramificar en un chat nuevo"
            onPress={() => {
              setMenu(false);
              useChat.getState().branch(convId, m.id);
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

const hostOf = (url: string) => url.replace(/^https?:\/\/(www\.)?/i, '').split(/[/?#]/)[0];

/** Páginas que devolvió la búsqueda, en el mismo orden que las citas [n]. */
function Sources({ m }: { m: Message }) {
  const sources = m.web?.sources;
  if (!sources?.length) return null;
  return (
    <View style={{ gap: 2, marginLeft: 8 }}>
      <T size={11} tone="muted" weight="semibold" selectable>
        {m.web?.query ? `Se buscó en DuckDuckGo: «${m.web.query}»` : 'Fuentes (DuckDuckGo)'}
      </T>
      {sources.map((s, i) => (
        <T
          key={`${i}-${s.url}`}
          size={12}
          tone="muted"
          numberOfLines={1}
          accessibilityRole="link"
          onPress={() => isOpenableUrl(s.url) && openUrl(s.url)}
          style={{ textDecorationLine: 'underline', lineHeight: 20 }}
        >
          [{i + 1}] {hostOf(s.url)} · {s.title}
        </T>
      ))}
    </View>
  );
}

/** Respuestas posibles: al tocar una se envía como mensaje. */
function Choices({ options, convId }: { options: string[]; convId: string }) {
  const pal = usePalette();
  return (
    <View style={{ gap: 6 }}>
      {options.map((o, i) => (
        <Pressable
          key={`${i}-${o}`}
          onPress={() => void send(o, convId)}
          accessibilityRole="button"
          accessibilityLabel={`Responder: ${o}`}
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: pal.ink,
            backgroundColor: pressed ? pal.surface2 : pal.surface,
            paddingHorizontal: 14,
            paddingVertical: 9,
          })}
        >
          <T size={14} weight="medium">
            {o}
          </T>
        </Pressable>
      ))}
    </View>
  );
}

function CardButton({ label, onPress }: { label: string; onPress: () => void }) {
  const pal = usePalette();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 7,
        backgroundColor: pressed ? pal.line : pal.surface2,
      })}
    >
      <T size={13} weight="semibold">
        {label}
      </T>
    </Pressable>
  );
}

/** Acciones del asistente: qué se va a hacer o se hizo, con sus botones. */
function AssistantActions({ m, convId }: { m: Message; convId: string }) {
  const pal = usePalette();
  if (!m.toolCalls?.some((c) => c.status)) return null;
  return (
    <View style={{ gap: 6 }}>
      {m.toolCalls.map((c) => {
        if (!c.status) return null;
        const action = JSON.parse(c.args) as AssistantAction;
        return (
          <View key={c.id} style={{ gap: 6, borderRadius: 14, borderWidth: 1, borderColor: pal.line, backgroundColor: pal.surface, padding: 12 }}>
            <T size={14} weight="semibold">
              {describeAction(action)}
            </T>
            {c.result ? (
              <T size={13} tone="muted" selectable>
                {c.result}
              </T>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {c.status === 'pending' ? (
                <>
                  <CardButton label="Hacer" onPress={() => void confirmAction(convId, m.id, c.id)} />
                  <CardButton label="Descartar" onPress={() => dismissAction(convId, m.id, c.id)} />
                </>
              ) : null}
              {c.status === 'error' ? <CardButton label="Reintentar" onPress={() => void confirmAction(convId, m.id, c.id)} /> : null}
              {c.status === 'done' && c.ref && canUndo(action) ? (
                <CardButton label="Deshacer" onPress={() => void revertAction(convId, m.id, c.id)} />
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function AiBubble({ m, convId, isLast }: { m: Message; convId: string; isLast: boolean }) {
  const pal = usePalette();
  const live = m.status === 'thinking' || m.status === 'streaming';
  const showBody = m.status !== 'thinking' || !!m.content;
  // Los bloques de acción del asistente no se muestran como código: salen como tarjetas.
  const parsedActions = extractActions(m.content);
  const visible = parsedActions.text;
  const { text, options } = extractOptions(visible);
  // Solo la última respuesta se contesta tocando; en las anteriores las opciones quedan como lista.
  const tappable = isLast && m.status === 'done' && options.length > 0;
  const shown = !tappable && text !== visible ? `${text}\n\n${options.map((o) => `- ${o}`).join('\n')}` : text;
  const footer = [
    m.modelId ? modelById(m.modelId).name : null,
    m.status === 'done' && m.usage ? usageLine(m.usage) : null,
    m.status === 'stopped' ? 'Detenido' : null,
  ].filter(Boolean);
  return (
    <View style={{ gap: 8, alignSelf: 'stretch' }}>
      <Thinking m={m} />
      {showBody && (
        <PlasmaGradient style={{ borderRadius: 20, borderTopLeftRadius: 6, padding: 1.5 }}>
          <View
            style={{
              backgroundColor: pal.surface,
              borderRadius: 18.5,
              borderTopLeftRadius: 5,
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          >
            <Markdown text={shown + (live ? ' ▍' : '')} />
          </View>
        </PlasmaGradient>
      )}
      {showBody && <Sources m={m} />}
      {!live && parsedActions.invalid > 0 ? (
        <T size={12} tone="muted">
          No entendí una acción de la respuesta. Puedes pedirla otra vez, por ejemplo «anota la tarea…».
        </T>
      ) : null}
      <AssistantActions m={m} convId={convId} />
      {tappable ? <Choices options={options} convId={convId} /> : null}
      {!live && (
        <View style={{ gap: 2 }}>
          {m.content ? <Actions m={m} convId={convId} isLast={isLast} /> : null}
          {footer.length > 0 && (
            <T size={11} tone="muted" style={{ marginLeft: 8 }}>
              {footer.join(' · ')}
            </T>
          )}
        </View>
      )}
    </View>
  );
}

export const MessageBubble = memo(function MessageBubble({ m, convId, isLast }: { m: Message; convId: string; isLast: boolean }) {
  return m.role === 'user' ? <UserBubble m={m} /> : <AiBubble m={m} convId={convId} isLast={isLast} />;
});
