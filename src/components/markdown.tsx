import * as Clipboard from 'expo-clipboard';
import { useToast } from 'heroui-native';
import { useState } from 'react';
import { Image, Linking, Pressable, Text, View } from 'react-native';
import { log } from '@/lib/log';
import { fonts } from '@/theme/tokens';
import { usePalette } from '@/theme/use-palette';
import { Icon } from './icons';
import { parseBlocks, parseInline, type Inline } from './markdown-parse';
import { T } from './text';

export const openUrl = (url: string) => {
  Linking.openURL(url).catch((e: unknown) => log.warn('link.open_failed', { error: String(e).slice(0, 80) }));
};

/** Imagen remota: no se descarga hasta que la tocas (S10-B). */
function RemoteImage({ alt, url }: { alt: string; url: string }) {
  const pal = usePalette();
  const [loaded, setLoaded] = useState(false);
  const [ratio, setRatio] = useState(16 / 9);
  if (!loaded)
    return (
      <Pressable
        onPress={() => setLoaded(true)}
        accessibilityRole="button"
        accessibilityLabel={`Cargar imagen${alt ? `: ${alt}` : ''}`}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          padding: 10,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: pal.line,
          backgroundColor: pressed ? pal.surface2 : 'transparent',
        })}
      >
        <Icon name="down" size={16} color={pal.muted} />
        <T size={13} tone="muted" style={{ flex: 1 }} numberOfLines={2}>
          {alt ? `Imagen: ${alt}` : 'Imagen'} · toca para cargar
        </T>
      </Pressable>
    );
  return (
    <Image
      source={{ uri: url }}
      accessibilityLabel={alt || 'Imagen'}
      onLoad={(e) => {
        const { width, height } = e.nativeEvent.source;
        if (width && height) setRatio(width / height);
      }}
      style={{ width: '100%', aspectRatio: ratio, borderRadius: 12, backgroundColor: pal.surface2 }}
      resizeMode="contain"
    />
  );
}

function Paragraph({ text, heading }: { text: string; heading?: number }) {
  const pal = usePalette();
  const parts = parseInline(text);
  const images = parts.filter((p): p is Extract<Inline, { kind: 'image' }> => p.kind === 'image');
  return (
    <View style={{ gap: 8 }}>
      <T
        {...(heading ? { weight: 'bold' as const, size: heading <= 2 ? 18 : 16, accessibilityRole: 'header' as const } : {})}
        style={{ lineHeight: heading ? 24 : 22 }}
      >
        {parts.map((p, i) => {
          switch (p.kind) {
            case 'bold':
              return (
                <Text key={i} style={{ fontFamily: fonts.uiBold }}>
                  {p.text}
                </Text>
              );
            case 'italic':
              return (
                <Text key={i} style={{ fontStyle: 'italic' }}>
                  {p.text}
                </Text>
              );
            case 'code':
              return (
                <Text key={i} style={{ fontFamily: fonts.mono, fontSize: 13, color: pal.ink, backgroundColor: pal.surface2 }}>
                  {` ${p.text} `}
                </Text>
              );
            case 'link':
              return (
                <Text
                  key={i}
                  onPress={() => openUrl(p.url)}
                  accessibilityRole="link"
                  style={{ color: pal.ink, textDecorationLine: 'underline' }}
                >
                  {p.text}
                </Text>
              );
            case 'image':
              return null;
            default:
              return p.text;
          }
        })}
      </T>
      {images.map((img, i) => (
        <RemoteImage key={i} alt={img.alt} url={img.url} />
      ))}
    </View>
  );
}

function CodeBlock({ lang, text }: { lang: string; text: string }) {
  const pal = usePalette();
  const { toast } = useToast();
  const copy = () =>
    void Clipboard.setStringAsync(text).then(
      () => toast.show('Código copiado'),
      () => toast.show('No se pudo copiar'),
    );
  return (
    <View style={{ backgroundColor: pal.termBg, borderRadius: 12, padding: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <T size={11} weight="mono" style={{ color: pal.termDim }}>
          {lang || 'código'}
        </T>
        <Pressable
          onPress={copy}
          accessibilityRole="button"
          accessibilityLabel="Copiar código"
          hitSlop={10}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 4, opacity: pressed ? 0.6 : 1 })}
        >
          <Icon name="copy" size={14} color={pal.termFg} />
          <T size={12} style={{ color: pal.termFg }}>
            Copiar código
          </T>
        </Pressable>
      </View>
      <T weight="mono" size={13} style={{ color: pal.termFg, lineHeight: 19 }} selectable>
        {text}
      </T>
    </View>
  );
}

export function Markdown({ text }: { text: string }) {
  return (
    <View style={{ gap: 8 }}>
      {parseBlocks(text).map((b, i) =>
        b.kind === 'code' ? (
          <CodeBlock key={i} lang={b.lang} text={b.text} />
        ) : (
          <Paragraph key={i} text={b.text} {...(b.kind === 'heading' ? { heading: b.level } : {})} />
        ),
      )}
    </View>
  );
}
