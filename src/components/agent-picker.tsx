import { Button, Dialog } from 'heroui-native';
import { Pressable, ScrollView, View } from 'react-native';
import { LEVELS, MODES } from '@/data/agents';
import { LOCAL_MODELS, modelForLevel } from '@/data/models';
import { activeModelId, useSettings } from '@/store/settings';
import { usePalette } from '@/theme/use-palette';
import { Icon } from './icons';
import { SectionLabel } from './list';
import { PlasmaGradient } from './plasma';
import { T } from './text';

function Pill({ on, label, onPress, icon }: { on: boolean; label: string; onPress: () => void; icon?: Parameters<typeof Icon>[0]['name'] }) {
  const pal = usePalette();
  const inner = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: on ? 'transparent' : pal.surface2,
      }}
    >
      {icon ? <Icon name={icon} size={15} plasma={!on} color={on ? '#1A0B05' : undefined} /> : null}
      <T size={13} weight="semibold" tone={on ? 'onPlasma' : 'text'}>
        {label}
      </T>
    </View>
  );
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }}>
      {on ? <PlasmaGradient style={{ borderRadius: 999 }}>{inner}</PlasmaGradient> : inner}
    </Pressable>
  );
}

/** Selector de agente (modo), nivel Fire y modelo. */
export function AgentPicker({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const s = useSettings();
  const current = activeModelId(s);
  return (
    <Dialog isOpen={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content>
          <Dialog.Close />
          <Dialog.Title>Agente</Dialog.Title>
          <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 8, paddingTop: 4 }}>
            <SectionLabel>Modo</SectionLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {MODES.map((m) => (
                <Pill key={m.id} icon={m.icon} label={m.label} on={s.mode === m.id} onPress={() => s.setMode(m.id)} />
              ))}
            </View>
            <SectionLabel>Nivel</SectionLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {LEVELS.map((l) => (
                <Pill key={l.id} label={l.label} on={s.level === l.id} onPress={() => s.setLevel(l.id)} />
              ))}
            </View>
            <T size={12} tone="muted">
              {LEVELS.find((l) => l.id === s.level)?.hint} · modelo por defecto: {modelForLevel(s.level).name}
            </T>
            <SectionLabel>Modelo</SectionLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {LOCAL_MODELS.map((m) => (
                <Pill
                  key={m.id}
                  icon="chip"
                  label={m.name}
                  on={current === m.id}
                  onPress={() => s.setModelOverride(m.id === modelForLevel(s.level).id ? null : m.id)}
                />
              ))}
            </View>
          </ScrollView>
          <Button className="mt-4" onPress={() => onOpenChange(false)}>
            <Button.Label>Listo</Button.Label>
          </Button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
