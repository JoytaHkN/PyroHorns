import { Text, type TextProps } from 'react-native';
import { fonts } from '@/theme/tokens';
import { usePalette } from '@/theme/use-palette';

type Weight = 'regular' | 'medium' | 'semibold' | 'bold' | 'mono';
const FAMILY: Record<Weight, string> = {
  regular: fonts.ui,
  medium: fonts.uiMedium,
  semibold: fonts.uiSemi,
  bold: fonts.uiBold,
  mono: fonts.mono,
};

interface TProps extends TextProps {
  weight?: Weight;
  size?: number;
  tone?: 'text' | 'muted' | 'ink' | 'onPlasma';
}

/** Texto con la tipografía Outfit / JetBrains Mono y colores de la paleta. */
export function T({ weight = 'regular', size = 15, tone = 'text', style, ...rest }: TProps) {
  const pal = usePalette();
  const color = tone === 'onPlasma' ? '#1A0B05' : pal[tone];
  return (
    <Text
      {...rest}
      style={[{ fontFamily: FAMILY[weight], fontSize: size, color, lineHeight: Math.round(size * 1.4) }, style]}
    />
  );
}
