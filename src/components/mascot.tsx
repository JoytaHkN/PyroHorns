import { Image, type ImageStyle, type StyleProp } from 'react-native';
import { useScheme } from '@/theme/use-palette';

const DARK = require('../../assets/brand/ibex-dark.jpg');
const LIGHT = require('../../assets/brand/ibex-light.jpg');

/** Ibex: cuernos curvos con el degradado que termina en chispa. */
export function Mascot({ size = 40, style }: { size?: number; style?: StyleProp<ImageStyle> }) {
  const scheme = useScheme();
  return (
    <Image
      source={scheme === 'dark' ? DARK : LIGHT}
      style={[{ width: size, height: size, borderRadius: size * 0.24 }, style]}
      accessibilityLabel="Agora Fire"
    />
  );
}
