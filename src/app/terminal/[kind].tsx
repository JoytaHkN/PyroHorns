import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { BackHeader, Screen } from '@/components/screen';
import { T } from '@/components/text';
import { fonts } from '@/theme/tokens';
import { usePalette } from '@/theme/use-palette';

type Line = { t: string; k?: 'prompt' | 'dim' | 'accent' };

const ALPINE: Line[] = [
  { t: 'pyrohorns:~# ', k: 'accent' }, { t: 'cat /etc/alpine-release\n3.22.1\n' },
  { t: 'pyrohorns:~# ', k: 'accent' }, { t: 'apk add python3\n' },
  { t: '(1/9) Installing libffi\n(2/9) Installing gdbm\n…\n(9/9) Installing python3\n', k: 'dim' },
  { t: 'OK: 78 MiB in 44 packages\n' },
  { t: 'pyrohorns:~# ', k: 'accent' }, { t: 'python3 -c "print(2**10)"\n1024\n' },
  { t: 'pyrohorns:~# ', k: 'accent' },
];

const TERMUX: Line[] = [
  { t: '~ $ ', k: 'prompt' }, { t: 'pkg install proot-distro\n' },
  { t: 'Setting up proot-distro …\n', k: 'dim' },
  { t: '~ $ ', k: 'prompt' }, { t: 'proot-distro install debian\n' },
  { t: '[*] Installing Debian (trixie)…\n[*] Finished.\n', k: 'dim' },
  { t: '~ $ ', k: 'prompt' }, { t: 'proot-distro login debian\n' },
  { t: 'root@localhost:~# ', k: 'accent' }, { t: 'uname -m\naarch64\n' },
  { t: 'root@localhost:~# ', k: 'accent' },
];

const KEYS = ['ESC', 'TAB', 'CTRL', 'ALT', '-', '/', '↑', '↓'];

/** Vista previa de terminal. La terminal real (proot / Termux) llega en F5. */
export default function Terminal() {
  const { kind } = useLocalSearchParams<{ kind: string }>();
  const pal = usePalette();
  const termux = kind === 'termux';
  const lines = termux ? TERMUX : ALPINE;
  const color = (k?: Line['k']) =>
    k === 'accent' ? pal.ink : k === 'prompt' ? '#5FB36B' : k === 'dim' ? pal.termDim : pal.termFg;

  return (
    <Screen>
      <BackHeader title={termux ? 'Termux' : 'Terminal Alpine'} />
      {termux && (
        <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingTop: 10 }}>
          {['debian', 'ubuntu', '+'].map((t, i) => (
            <View key={t} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: i === 0 ? pal.surface2 : 'transparent' }}>
              <T size={13} weight={i === 0 ? 'semibold' : 'regular'} tone={i === 0 ? 'text' : 'muted'}>{t}</T>
            </View>
          ))}
        </View>
      )}
      <ScrollView style={{ flex: 1, margin: 16, backgroundColor: pal.termBg, borderRadius: 18 }} contentContainerStyle={{ padding: 14 }}>
        <Text style={{ fontFamily: fonts.mono, fontSize: 13, lineHeight: 20 }}>
          {lines.map((l, i) => (
            <Text key={i} style={{ color: color(l.k) }}>{l.t}</Text>
          ))}
          <Text style={{ color: pal.ink }}>▍</Text>
        </Text>
      </ScrollView>
      <T size={12} tone="muted" style={{ textAlign: 'center' }}>Vista previa · la terminal real llega en F5</T>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 12 }}>
        {KEYS.map((k) => (
          <View key={k} style={{ paddingHorizontal: 8, paddingVertical: 8, borderRadius: 8, backgroundColor: pal.surface }}>
            <T size={12} weight="mono">{k}</T>
          </View>
        ))}
      </View>
    </Screen>
  );
}
