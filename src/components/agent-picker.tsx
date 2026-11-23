import { Button, Dialog, Switch } from 'heroui-native';
import { Pressable, ScrollView, View } from 'react-native';
import { MODES, modeById, modelForMode } from '@/data/agents';
import { LOCAL_MODELS, contextTokens, modelById } from '@/data/models';
import { formatTokens } from '@/lib/context';
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

/** Selector de modo (que elige el modelo), interruptor Profundo y modelo manual (Avanzado). */
export function AgentPicker({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const s = useSettings();
  const current = modelById(activeModelId(s));
  const auto = modelForMode(s.mode);
  return (
    <Dialog isOpen={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content>
          <Dialog.Close />
          <Dialog.Title>Agente</Dialog.Title>
          <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={{ gap: 8, paddingTop: 4 }}>
            <SectionLabel>Modo</SectionLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {MODES.map((m) => (
                <Pill key={m.id} icon={m.icon} label={m.label} on={s.mode === m.id} onPress={() => s.setMode(m.id)} />
              ))}
            </View>
            <T size={12} tone="muted">
              {modeById(s.mode).hint} · usa {auto.name}
            </T>

            <SectionLabel>Profundo</SectionLabel>
            <Pressable
              onPress={s.toggleDeep}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
              accessibilityRole="switch"
              accessibilityState={{ checked: s.deep }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <T weight="semibold">Razonamiento y más contexto</T>
                <T size={12} tone="muted">
                  {current.thinking
                    ? `${current.name} razona antes de responder · contexto ${formatTokens(contextTokens(current, true))}`
                    : `${current.name} no razona; solo amplía el contexto a ${formatTokens(contextTokens(current, true))}`}
                </T>
              </View>
              <Switch isSelected={s.deep} onSelectedChange={s.setDeep} />
            </Pressable>

            <SectionLabel>Avanzado · modelo</SectionLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <Pill icon="spark" label={`Automático (${auto.name})`} on={s.modelOverride === null} onPress={() => s.setModelOverride(null)} />
              {LOCAL_MODELS.map((m) => (
                <Pill
                  key={m.id}
                  icon="chip"
                  label={m.optional ? `${m.name} · opcional` : m.name}
                  on={s.modelOverride === m.id}
                  onPress={() => s.setModelOverride(m.id)}
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
