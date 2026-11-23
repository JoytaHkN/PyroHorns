import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { plasma } from '@/theme/tokens';

/** Degradado Plasma a 120° (aprox. con start/end). */
export function PlasmaGradient({ style, children }: { style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  return (
    <LinearGradient
      colors={plasma.colors}
      locations={plasma.stops}
      start={{ x: 0, y: 0.25 }}
      end={{ x: 1, y: 0.75 }}
      style={style}
    >
      {children}
    </LinearGradient>
  );
}
