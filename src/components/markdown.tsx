import { Text, View } from 'react-native';
import { fonts } from '@/theme/tokens';
import { usePalette } from '@/theme/use-palette';
import { parseBlocks } from './markdown-parse';
import { T } from './text';

/** Negrita **x** y código `x` en línea. */
function Inline({ text }: { text: string }) {
  const pal = usePalette();
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return (
    <T style={{ lineHeight: 22 }}>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**'))
          return (
            <Text key={i} style={{ fontFamily: fonts.uiBold }}>
              {p.slice(2, -2)}
            </Text>
          );
        if (p.startsWith('`') && p.endsWith('`'))
          return (
            <Text key={i} style={{ fontFamily: fonts.mono, fontSize: 13, color: pal.ink, backgroundColor: pal.surface2 }}>
              {` ${p.slice(1, -1)} `}
            </Text>
          );
        return p;
      })}
    </T>
  );
}

export function Markdown({ text }: { text: string }) {
  const pal = usePalette();
  return (
    <View style={{ gap: 8 }}>
      {parseBlocks(text).map((b, i) =>
        b.kind === 'code' ? (
          <View key={i} style={{ backgroundColor: pal.termBg, borderRadius: 12, padding: 12 }}>
            {b.lang ? (
              <T size={11} weight="mono" style={{ color: pal.termDim, marginBottom: 4 }}>
                {b.lang}
              </T>
            ) : null}
            <T weight="mono" size={13} style={{ color: pal.termFg, lineHeight: 19 }} selectable>
              {b.text}
            </T>
          </View>
        ) : (
          <Inline key={i} text={b.text} />
        ),
      )}
    </View>
  );
}
