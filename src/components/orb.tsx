import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { PlasmaGradient } from './plasma';

/** Orbe Plasma: el "lugar donde vive" la IA. Pulsa cuando está activa. */
export function Orb({ size = 14, active = false }: { size?: number; active?: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (active) t.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
    else {
      cancelAnimation(t);
      t.value = withTiming(0, { duration: 200 });
    }
  }, [active, t]);
  const halo = useAnimatedStyle(() => ({
    opacity: 0.25 + t.value * 0.35,
    transform: [{ scale: 1 + t.value * 0.6 }],
  }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute', width: size, height: size }, halo]}>
        <PlasmaGradient style={{ flex: 1, borderRadius: size }} />
      </Animated.View>
      <PlasmaGradient style={{ width: size, height: size, borderRadius: size }} />
    </View>
  );
}
