import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { usePalette } from '@/theme/use-palette';
import { IconTile, type IconName } from './icons';
import { PlasmaGradient } from './plasma';
import { T } from './text';

export function SectionLabel({ children }: { children: string }) {
  return (
    <T weight="semibold" size={12} tone="muted" style={{ textTransform: 'uppercase', letterSpacing: 1, marginTop: 8 }}>
      {children}
    </T>
  );
}

export function Group({ children }: { children: ReactNode }) {
  const pal = usePalette();
  return (
    <View
      style={{
        backgroundColor: pal.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: pal.line,
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  );
}

interface ItemProps {
  icon: IconName;
  title: string;
  subtitle?: string;
  end?: ReactNode;
  children?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  first?: boolean;
}

export function Item({ icon, title, subtitle, end, children, onPress, onLongPress, first }: ItemProps) {
  const pal = usePalette();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!onPress && !onLongPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: pal.line,
        backgroundColor: pressed ? pal.surface2 : 'transparent',
      })}
    >
      <IconTile name={icon} />
      <View style={{ flex: 1, gap: 2 }}>
        <T weight="semibold">{title}</T>
        {subtitle ? (
          <T size={13} tone="muted">
            {subtitle}
          </T>
        ) : null}
        {children}
      </View>
      {end}
    </Pressable>
  );
}

/** Menú desplegable: la cabecera se toca para ver u ocultar su contenido (P33). */
export function Collapsible({
  title,
  detail,
  open,
  onToggle,
  children,
}: {
  title: string;
  detail?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const pal = usePalette();
  return (
    <View style={{ borderRadius: 14, borderWidth: 1, borderColor: pal.line, overflow: 'hidden' }}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: pressed ? pal.surface2 : 'transparent',
        })}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <T size={14} weight="semibold">
            {title}
          </T>
          {detail ? (
            <T size={11} tone="muted">
              {detail}
            </T>
          ) : null}
        </View>
        <T size={16} tone="muted">
          {open ? '▾' : '▸'}
        </T>
      </Pressable>
      {open ? <View style={{ paddingHorizontal: 10, paddingBottom: 10, gap: 8 }}>{children}</View> : null}
    </View>
  );
}

/** Etiqueta con degradado Plasma ("Activo", "Nuevo"). */
export function PlasmaTag({ children }: { children: string }) {
  return (
    <PlasmaGradient style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
      <T weight="semibold" size={12} tone="onPlasma">
        {children}
      </T>
    </PlasmaGradient>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const pal = usePalette();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: pal.surface2, marginTop: 8, overflow: 'hidden' }}>
      <PlasmaGradient style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 3 }} />
    </View>
  );
}

/** Tarjeta grande pulsable (proyectos, importar). */
export function Card({ children, onPress, center }: { children: ReactNode; onPress?: () => void; center?: boolean }) {
  const pal = usePalette();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: center ? 'center' : 'flex-start',
        gap: 12,
        padding: 14,
        borderRadius: 18,
        backgroundColor: pressed ? pal.surface2 : pal.surface,
        borderWidth: 1,
        borderColor: pal.line,
      })}
    >
      {children}
    </Pressable>
  );
}
