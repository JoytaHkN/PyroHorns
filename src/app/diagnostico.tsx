import { useToast } from 'heroui-native';
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Card, SectionLabel } from '@/components/list';
import { BackHeader, Screen } from '@/components/screen';
import { T } from '@/components/text';
import { APP_BUILD } from '@/lib/app-build';
import { formatReport, hasCrash, parseDiagnostics, type Diagnostics } from '@/lib/diagnostics';
import { usePalette } from '@/theme/use-palette';
import { clearDiagnostics, readDiagnostics } from '@pyrohorns/llama';

/** Rastros del motor nativo y cierres que registró Android. El texto se puede seleccionar y pegar en un chat. */
export default function Diagnostico() {
  const pal = usePalette();
  const { toast } = useToast();
  const [diag, setDiag] = useState<Diagnostics | null>(() => parseDiagnostics(readDiagnostics()));
  const reload = useCallback(() => setDiag(parseDiagnostics(readDiagnostics())), []);

  return (
    <Screen>
      <BackHeader title="Diagnóstico del motor" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}>
        {diag === null ? (
          <T tone="muted">El motor nativo no está disponible en esta plataforma (solo Android).</T>
        ) : (
          <>
            <T size={13} tone="muted">
              {hasCrash(diag)
                ? 'Se detectó un cierre inesperado. Mantén pulsado el texto de abajo para seleccionarlo, cópialo y pégalo en el chat de tu agente.'
                : 'No hay cierres inesperados registrados. Aquí aparecerán si el motor se cae o Android cierra la app.'}
            </T>
            <SectionLabel>Informe</SectionLabel>
            <View style={{ backgroundColor: pal.surface, borderRadius: 14, borderWidth: 1, borderColor: pal.line, padding: 12 }}>
              <T size={12} selectable style={{ fontFamily: 'JetBrainsMono_400Regular', lineHeight: 17 }}>
                {formatReport(diag, APP_BUILD)}
              </T>
            </View>
            <Card center onPress={reload}>
              <T weight="semibold" tone="ink">
                Actualizar
              </T>
            </Card>
            <Card
              center
              onPress={() => {
                clearDiagnostics();
                reload();
                toast.show({ label: 'Rastro del cierre borrado' });
              }}
            >
              <T weight="semibold" tone="ink">
                Borrar el rastro del último cierre
              </T>
            </Card>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
