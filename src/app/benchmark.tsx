import * as Clipboard from 'expo-clipboard';
import { useToast } from 'heroui-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Card, Group, Item, PlasmaTag, SectionLabel } from '@/components/list';
import { BackHeader, Screen } from '@/components/screen';
import { T } from '@/components/text';
import { LOCAL_MODELS, canChat } from '@/data/models';
import {
  PRESETS,
  THREAD_OPTIONS,
  buildGroups,
  countRuns,
  describeCpu,
  describeDevice,
  formatResults,
  parseDeviceStatus,
  type BenchConfig,
  type MmapMode,
} from '@/lib/bench';
import { APP_BUILD } from '@/lib/app-build';
import { runBench, stopBench } from '@/lib/bench-runner';
import { parseDiagnostics } from '@/lib/diagnostics';
import { locateModel } from '@/lib/native';
import { useBench } from '@/store/bench';
import { usePalette } from '@/theme/use-palette';
import { readCpuInfo, readDeviceStatus, readDiagnostics } from '@pyrohorns/llama';

const toggle = <V,>(list: V[], v: V) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

function Chip({ label, on, disabled, onPress }: { label: string; on: boolean; disabled?: boolean; onPress: () => void }) {
  const pal = usePalette();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: on, disabled }}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: on ? pal.ink : pal.line,
        backgroundColor: on ? pal.surface2 : 'transparent',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <T weight={on ? 'semibold' : 'regular'}>{label}</T>
    </Pressable>
  );
}

/** Prueba de rendimiento (P13, F1.5 pasos 3 y 4): carga, TTFT, tok/s de prefill y generación, RAM pico. */
export default function Benchmark() {
  const { toast } = useToast();
  const config = useBench((s) => s.config);
  const results = useBench((s) => s.results);
  const running = useBench((s) => s.running);
  const progress = useBench((s) => s.progress);
  const log = useBench((s) => s.log);
  const inProgress = useBench((s) => s.inProgress);
  const [, setTick] = useState(0);
  const pal = usePalette();

  // Los archivos pueden cambiar (importar un modelo): se vuelve a comprobar al abrir la pantalla.
  useEffect(() => setTick((t) => t + 1), []);

  const available = new Set(LOCAL_MODELS.filter((m) => locateModel(m.file) !== null).map((m) => m.id));
  const effective: BenchConfig = { ...config, models: config.models.filter((id) => available.has(id)) };
  const groups = buildGroups(effective);
  const total = countRuns(groups);
  const set = (patch: Partial<BenchConfig>) => useBench.getState().setConfig({ ...config, ...patch });

  const device = parseDiagnostics(readDiagnostics())?.device ?? '';
  // El informe muestra el estado del equipo al empezar la primera medición de esta lista.
  const start = results[0]?.before ?? null;
  const now = parseDeviceStatus(readDeviceStatus());
  const report = formatResults(results, {
    device,
    app: APP_BUILD,
    cpu: describeCpu(readCpuInfo()),
    at: results[results.length - 1]?.at ?? Date.now(),
    start,
  });
  const mono = { fontFamily: 'JetBrainsMono_400Regular', lineHeight: 17 } as const;

  return (
    <Screen>
      <BackHeader title="Prueba de rendimiento" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}>
        {!running && inProgress ? (
          <View style={{ backgroundColor: pal.surface, borderRadius: 14, borderWidth: 1, borderColor: pal.line, padding: 12, gap: 8 }}>
            <T weight="semibold">La app se cerró durante una prueba</T>
            <T size={13} tone="muted">
              {inProgress}. Suele ser falta de memoria: mira Ajustes → Diagnóstico del motor para ver el motivo que registró Android.
            </T>
            <Card center onPress={() => useBench.getState().setInProgress(null)}>
              <T weight="semibold" tone="ink">
                Entendido
              </T>
            </Card>
          </View>
        ) : null}

        <T size={13} tone="muted">
          Mide cuánto tarda en cargar cada modelo, el primer token (TTFT), la velocidad de prefill y de generación (128 tokens) y la RAM pico, con
          3 repeticiones por prueba. La pantalla se mantiene encendida mientras dura. Objetivos de F1.5: TTFT &lt; 1,5 s con un prompt de 1K y ≥ 10 tok/s.
        </T>
        <View style={{ backgroundColor: pal.surface, borderRadius: 14, borderWidth: 1, borderColor: pal.line, padding: 12, gap: 6 }}>
          <T size={13}>Ahora: {describeDevice(now)}</T>
          <T size={12} tone="muted">
            Para medir con precisión: sin cargador, con el ahorro de energía desactivado y el equipo a temperatura normal. El informe anota la temperatura y el estado térmico antes y después de cada prueba.
          </T>
        </View>

        <SectionLabel>Preajustes</SectionLabel>
        <Card center onPress={running ? undefined : () => useBench.getState().setConfig(PRESETS.rapida)}>
          <T weight="semibold" tone="ink">
            Rápida · LFM3, 4 hilos, con y sin mmap
          </T>
        </Card>
        <Card center onPress={running ? undefined : () => useBench.getState().setConfig(PRESETS.resumen)}>
          <T weight="semibold" tone="ink">
            Resumen · todos los modelos, 4 y 8 hilos, 1 repetición (20)
          </T>
        </Card>
        <Card center onPress={running ? undefined : () => useBench.getState().setConfig(PRESETS.completa)}>
          <T weight="semibold" tone="ink">
            Completa · todos los modelos, 4/6/8 hilos, con y sin mmap (180)
          </T>
        </Card>

        <SectionLabel>Modelos</SectionLabel>
        <Group>
          {LOCAL_MODELS.filter(canChat).map((m, i) => {
            const has = available.has(m.id);
            const on = config.models.includes(m.id);
            return (
              <Item
                key={m.id}
                first={i === 0}
                icon="chip"
                title={m.name}
                subtitle={has ? `Contexto ${m.defaultCtx / 1024}K` : 'Falta el archivo: impórtalo en Modelos'}
                onPress={running || !has ? undefined : () => set({ models: toggle(config.models, m.id) })}
                end={on && has ? <PlasmaTag>Incluido</PlasmaTag> : undefined}
              />
            );
          })}
        </Group>

        <SectionLabel>Lectura del archivo</SectionLabel>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {(['mmap', 'nommap'] as MmapMode[]).map((v) => (
            <Chip
              key={v}
              label={v === 'mmap' ? 'Con mmap' : 'Sin mmap'}
              on={config.mmap.includes(v)}
              disabled={running}
              onPress={() => set({ mmap: toggle(config.mmap, v) })}
            />
          ))}
        </View>

        <SectionLabel>Hilos</SectionLabel>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {THREAD_OPTIONS.map((n) => (
            <Chip key={n} label={`${n} hilos`} on={config.threads.includes(n)} disabled={running} onPress={() => set({ threads: toggle(config.threads, n) })} />
          ))}
        </View>

        <Card
          center
          onPress={() => {
            if (running) stopBench();
            else if (total > 0) void runBench(groups);
            else toast.show({ label: 'Elige al menos un modelo disponible, un modo de mmap y un número de hilos' });
          }}
        >
          <T weight="semibold" tone="ink">
            {running ? 'Detener' : total > 0 ? `Empezar · ${total} pruebas` : 'Nada que ejecutar'}
          </T>
        </Card>

        {running && progress ? (
          <T size={13} tone="muted">
            Prueba {Math.min(progress.done + 1, progress.total)} de {progress.total} · {progress.current}
          </T>
        ) : null}
        {log.length > 0 ? (
          <View style={{ backgroundColor: pal.surface, borderRadius: 14, borderWidth: 1, borderColor: pal.line, padding: 12 }}>
            <T size={12} tone="muted" selectable style={mono}>
              {log.join('\n')}
            </T>
          </View>
        ) : null}

        <SectionLabel>Resultados</SectionLabel>
        <View style={{ backgroundColor: pal.surface, borderRadius: 14, borderWidth: 1, borderColor: pal.line, padding: 12 }}>
          <T size={12} selectable style={mono}>
            {report}
          </T>
        </View>
        <Card
          center
          onPress={async () => {
            await Clipboard.setStringAsync(report);
            toast.show({ variant: 'success', label: 'Resultados copiados' });
          }}
        >
          <T weight="semibold" tone="ink">
            Copiar resultados
          </T>
        </Card>
        {results.length > 0 && !running ? (
          <Card center onPress={() => useBench.getState().clearResults()}>
            <T weight="semibold" tone="ink">
              Borrar resultados
            </T>
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
