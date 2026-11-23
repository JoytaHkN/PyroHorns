import { useSettings } from '@/store/settings';
import { palette, type Palette } from './tokens';

export function usePalette(): Palette {
  const scheme = useSettings((s) => s.scheme);
  return palette[scheme];
}

export function useScheme() {
  return useSettings((s) => s.scheme);
}
