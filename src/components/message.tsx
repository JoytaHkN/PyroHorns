import { memo } from 'react';
import { View } from 'react-native';
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

function AiBubble({ m }: { m: Message }) {
  const pal = usePalette();
  const thinking = m.status === 'thinking';
  const live = thinking || m.status === 'streaming';
  return (
    <View style={{ gap: 8, alignSelf: 'stretch' }}>
      {thinking ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Orb size={12} active />
          <T size={13} tone="muted">
            Pensando…
          </T>
        </View>
      ) : m.thinkMs ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="spark" size={15} plasma />
          <T size={13} tone="muted">
            Pensó {Math.max(1, Math.round(m.thinkMs / 1000))} s
          </T>
        </View>
      ) : null}
      {!thinking && (
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
            {m.status === 'stopped' && (
              <T size={12} tone="muted" style={{ marginTop: 6 }}>
                Detenido
              </T>
            )}
          </View>
        </PlasmaGradient>
      )}
    </View>
  );
}

export const MessageBubble = memo(function MessageBubble({ m }: { m: Message }) {
  return m.role === 'user' ? <UserBubble m={m} /> : <AiBubble m={m} />;
});
