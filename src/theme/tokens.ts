/**
 * Tokens Plasma en TypeScript. Deben coincidir con global.css.
 * Se usan donde Tailwind no llega (SVG, degradados, StatusBar) y servirán
 * de fuente para la variante Compose (F6).
 */
export const plasma = {
  p1: '#FF3366',
  p2: '#FF9900',
  p3: '#FFCC00',
  onPlasma: '#1A0B05',
  /** Paradas del degradado: 0, 55 %, 100 %, ángulo 120°. */
  stops: [0, 0.55, 1] as const,
  colors: ['#FF3366', '#FF9900', '#FFCC00'] as const,
} as const;

export type Scheme = 'dark' | 'light';

export const palette = {
  dark: {
    page: '#121212',
    bg: '#1A1A1A',
    surface: '#2D2D2D',
    surface2: '#363636',
    raise: '#3F3F3F',
    text: '#E6E4E1',
    muted: '#9C9893',
    ink: '#FF9C66',
    line: 'rgba(255,255,255,0.08)',
    tileHi: 'rgba(255,255,255,0.10)',
    termBg: '#0F0F0F',
    termFg: '#DAD6D0',
    termDim: '#8A857E',
    glow: 'rgba(255,90,60,0.30)',
  },
  light: {
    page: '#E3E0DC',
    bg: '#F1EFEC',
    surface: '#FFFFFF',
    surface2: '#E9E6E2',
    raise: '#FFFFFF',
    text: '#1D1C1A',
    muted: '#6B6762',
    ink: '#C4133F',
    line: 'rgba(0,0,0,0.09)',
    tileHi: 'rgba(255,255,255,0.9)',
    termBg: '#1C1B1A',
    termFg: '#E8E4DE',
    termDim: '#A19B93',
    glow: 'rgba(255,90,60,0.38)',
  },
} as const;

export type Palette = (typeof palette)[Scheme];

/** Presets de color de tema (Ajustes → Color del tema). Solo Plasma activo en F1. */
export const themePresets = [
  { id: 'plasma', label: 'Plasma', colors: plasma.colors },
  { id: 'moss', label: 'Musgo', colors: ['#4C8C4A', '#4C8C4A', '#4C8C4A'] },
  { id: 'ocean', label: 'Océano', colors: ['#4A6FA5', '#4A6FA5', '#4A6FA5'] },
  { id: 'iris', label: 'Iris', colors: ['#8A5FB0', '#8A5FB0', '#8A5FB0'] },
  { id: 'brass', label: 'Latón', colors: ['#B98A3E', '#B98A3E', '#B98A3E'] },
] as const;

export const fonts = {
  ui: 'Outfit_400Regular',
  uiMedium: 'Outfit_500Medium',
  uiSemi: 'Outfit_600SemiBold',
  uiBold: 'Outfit_700Bold',
  mono: 'JetBrainsMono_400Regular',
} as const;
