import * as Clipboard from 'expo-clipboard';
import { useToast } from 'heroui-native';
import { memo, useState } from 'react';
import { Pressable, Share, View } from 'react-native';
import { modelById } from '@/data/models';
import { regenerate } from '@/lib/engine';
import { usageLine } from '@/lib/stats';
import { useChat, type Message } from '@/store/chat';
import { useEngine } from '@/store/engine';
import { usePalette } from '@/theme/use-palette';
import { Icon, type IconName } from './icons';
import { Markdown } from './markdown';
import { Orb } from './orb';
import { PlasmaGradient } from './plasma';
import { T } from './text';

function UserBubble({ m }: { m: Message }) {
  const pal = usePalette();
  return (
    <View
      style={{
        alignSelf: 'flex-end',
        maxWidth: '85%',
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
  );
}

/** Razonamiento plegado: "Pensando…" en vivo o "Pensó N s"; al tocar se despliega el texto. */
function Thinking({ m }: { m: Message }) {
  const pal = usePalette();
  const [open, setOpen] = useState(false);
  const live = m.status === 'thinking';
  const loading = useEngine((s) => s.loading) && live;
  const hasText = !!m.thinking?.trim();
  if (!live && !m.thinkMs && !hasText) return null;
  const label = loading ? 'Cargando modelo…' : live ? 'Pensando…' : `Pensó ${Math.max(1, Math.round((m.thinkMs ?? 0) / 1000))} s`;
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
  const { toast } = useToast();
  const [menu, setMenu] = useState(false);
  const rate = (value: 'up' | 'down') =>
    useChat.getState().patchMessage(convId, m.id, { feedback: m.feedback === value ? null : value });
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Action icon="share" label="Compartir respuesta" onPress={() => void Share.share({ message: m.content }).catch(() => {})} />
        <Action
          icon="copy"
          label="Copiar respuesta"
          onPress={() =>
            void Clipboard.setStringAsync(m.content).then(
              () => toast.show('Respuesta copiada'),
              () => toast.show('No se pudo copiar'),
            )
          }
        />
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

function AiBubble({ m, convId, isLast }: { m: Message; convId: string; isLast: boolean }) {
  const pal = usePalette();
  const live = m.status === 'thinking' || m.status === 'streaming';
  const showBody = m.status !== 'thinking' || !!m.content;
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
            <Markdown text={m.content + (live ? ' ▍' : '')} />
          </View>
        </PlasmaGradient>
      )}
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
