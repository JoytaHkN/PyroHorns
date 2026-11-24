import { memo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { modelById } from '@/data/models';
import type { Message } from '@/store/chat';
import { usePalette } from '@/theme/use-palette';
import { Icon } from './icons';
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
  const hasText = !!m.thinking?.trim();
  if (!live && !m.thinkMs && !hasText) return null;
  const label = live ? 'Pensando…' : `Pensó ${Math.max(1, Math.round((m.thinkMs ?? 0) / 1000))} s`;
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

function AiBubble({ m }: { m: Message }) {
  const pal = usePalette();
  const live = m.status === 'thinking' || m.status === 'streaming';
  const showBody = m.status !== 'thinking' || !!m.content;
  const footer = [
    m.modelId ? modelById(m.modelId).name : null,
    m.status === 'done' && m.usage ? `${m.usage.tokPerSec.toFixed(1)} tok/s` : null,
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
      {!live && footer.length > 0 && (
        <T size={11} tone="muted" style={{ marginLeft: 6 }}>
          {footer.join(' · ')}
        </T>
      )}
    </View>
  );
}

export const MessageBubble = memo(function MessageBubble({ m }: { m: Message }) {
  return m.role === 'user' ? <UserBubble m={m} /> : <AiBubble m={m} />;
});
