import { ScrollView } from 'react-native';
import { Group, Item, PlasmaTag, SectionLabel } from '@/components/list';
import { BackHeader, Screen } from '@/components/screen';
import { T } from '@/components/text';
import { when } from '@/lib/assistant/actions';
import { useChat } from '@/store/chat';
import type { AgendaItem } from '@/types/chat';

/** Notas y tareas del asistente (se guardan cifradas en el teléfono). */
export default function Agenda() {
  const items = useChat((s) => s.items);
  const save = useChat((s) => s.saveItem);
  const remove = useChat((s) => s.removeItem);
  const section = (title: string, list: AgendaItem[], empty: string) => (
    <>
      <SectionLabel>{title}</SectionLabel>
      {list.length === 0 ? (
        <T size={13} tone="muted">
          {empty}
        </T>
      ) : (
        <Group>
          {list.map((i, n) => (
            <Item
              key={i.id}
              first={n === 0}
              icon={i.kind === 'task' ? (i.done ? 'check' : 'tasks') : 'chat'}
              title={i.text}
              subtitle={i.due ? when(i.due) : when(i.createdAt)}
              {...(i.kind === 'task' ? { onPress: () => save({ ...i, done: !i.done }) } : {})}
              onLongPress={() => remove(i.id)}
              end={i.done ? <PlasmaTag>Hecha</PlasmaTag> : undefined}
            />
          ))}
        </Group>
      )}
    </>
  );
  return (
    <Screen>
      <BackHeader title="Notas y tareas" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 40 }}>
        {section('Tareas', items.filter((i) => i.kind === 'task'), 'Sin tareas. Pídelo en el chat: «anota la tarea…».')}
        {section('Notas', items.filter((i) => i.kind === 'note'), 'Sin notas. Pídelo en el chat: «toma nota de…».')}
        <T size={12} tone="muted">
          Toca una tarea para marcarla; mantén pulsado para borrar.
        </T>
      </ScrollView>
    </Screen>
  );
}
