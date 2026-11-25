import { useId } from 'react';
import { View, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { plasma } from '@/theme/tokens';
import { usePalette } from '@/theme/use-palette';

/** Trazos del sistema de iconos (mockup): 24×24, trazo redondeado. */
export const ICON_PATHS = {
  menu: 'M4 7h16M4 12h16M4 17h10',
  globe: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z',
  share: 'M18 3a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM6 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM18 16a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM8.2 10.8l7.6-4.1M8.2 13.2l7.6 4.1',
  copy: 'M10 8h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM5 16V4a1 1 0 0 1 1-1h10',
  thumbUp: 'M7 11v9H4v-9zM7 11l4-8c1.7 0 2.6 1.2 2.3 2.8L12.7 9H18a2 2 0 0 1 2 2.4l-1.4 7a2 2 0 0 1-2 1.6H7',
  thumbDown: 'M7 13V4H4v9zM7 13l4 8c1.7 0 2.6-1.2 2.3-2.8L12.7 15H18a2 2 0 0 0 2-2.4l-1.4-7a2 2 0 0 0-2-1.6H7',
  refresh: 'M20 12a8 8 0 1 1-2.4-5.7M20 4v5h-5',
  branch: 'M12 21v-8l-6-6M12 13l6-6M6 12V7h5M13 7h5v5',
  plus: 'M12 5v14M5 12h14',
  more: 'M12 6h.01M12 12h.01M12 18h.01',
  chat: 'M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  sliders: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
  chip: 'M7 7h10v10H7zM10 10h4v4h-4zM10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4',
  term: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM7 10l3 2.5L7 15M12.5 15H17',
  up: 'M12 19V5M6 11l6-6 6 6',
  cloud: 'M7 18a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 17.2 9.1 4.5 4.5 0 0 1 17 18z',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 16.5v4M16.5 18.5h4',
  search: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM16.5 16.5L20 20',
  down: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  back: 'M19 12H5M11 6l-6 6 6 6',
  palette:
    'M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2 0-1.6 1-2 2.5-2H18a3 3 0 0 0 3-3c0-5-4-9-9-9zM7.5 12h.01M9.5 8h.01M14.5 8h.01',
  tasks: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  remote: 'M4 5h16v11H4zM9 20h6M12 16v4',
  box: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8 9l3 3-3 3M13 15h3',
  gear: 'M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1',
  mic: 'M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  stop: 'M7 7h10v10H7z',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  sun: 'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  check: 'M5 12.5l4.5 4.5L19 7',
  close: 'M6 6l12 12M18 6L6 18',
  lock: 'M8 11V8a4 4 0 0 1 8 0v3M7 11h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zM12 15v2',
} as const;

export type IconName = keyof typeof ICON_PATHS;

interface IconProps {
  name: IconName;
  size?: number;
  /** Color sólido; si `plasma` es true se ignora y se usa el degradado. */
  color?: string;
  plasma?: boolean;
  strokeWidth?: number;
  style?: ViewStyle;
}

export function Icon({ name, size = 22, color, plasma: usePlasma, strokeWidth = 2, style }: IconProps) {
  const pal = usePalette();
  const gid = `g${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const stroke = usePlasma ? `url(#${gid})` : (color ?? pal.text);
  return (
    <View style={style} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {usePlasma && (
          <Defs>
            <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
              {plasma.colors.map((c, i) => (
                <Stop key={c} offset={plasma.stops[i]} stopColor={c} />
              ))}
            </LinearGradient>
          </Defs>
        )}
        <Path
          d={ICON_PATHS[name]}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

/** Baldosa en relieve con icono Plasma (sistema de íconos del mockup). */
export function IconTile({ name, size = 36 }: { name: IconName; size?: number }) {
  const pal = usePalette();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        backgroundColor: pal.raise,
        alignItems: 'center',
        justifyContent: 'center',
        borderTopWidth: 1,
        borderTopColor: pal.tileHi,
        boxShadow: pal.page === '#121212' ? '0 3px 8px rgba(0,0,0,0.45)' : '0 3px 8px rgba(60,40,20,0.16)',
      }}
    >
      <Icon name={name} size={size * 0.56} plasma />
    </View>
  );
}
