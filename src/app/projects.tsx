import { Button, Dialog, Input } from 'heroui-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { IconTile, Icon } from '@/components/icons';
import { Card } from '@/components/list';
import { BackHeader, Screen } from '@/components/screen';
import { T } from '@/components/text';
import { currentAgent } from '@/lib/engine';
import { useChat } from '@/store/chat';

export default function Projects() {
  const projects = useChat((s) => s.projects);
  const conversations = useChat((s) => s.conversations);
  const addProject = useChat((s) => s.addProject);
  const removeProject = useChat((s) => s.removeProject);
  const newConversation = useChat((s) => s.newConversation);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  const create = () => {
    if (!name.trim()) return;
    addProject(name.trim());
    setName('');
    setOpen(false);
  };

  const openProject = (id: string) => {
    newConversation(currentAgent(), id);
    router.navigate('/chat');
  };

  return (
    <Screen>
      <BackHeader title="Proyectos" />
      <View style={{ padding: 16, gap: 10 }}>
        {projects.length === 0 && (
          <T tone="muted">Agrupa conversaciones y archivos por tema. Los archivos llegan en F4 (RAG).</T>
        )}
        {projects.map((p) => {
          const n = conversations.filter((c) => c.projectId === p.id).length;
          return (
            <Card key={p.id} onPress={() => openProject(p.id)}>
              <IconTile name="folder" />
              <View style={{ flex: 1 }}>
                <T weight="semibold">{p.name}</T>
                <T size={13} tone="muted">
                  {n} {n === 1 ? 'conversación' : 'conversaciones'} · toca para abrir una nueva
                </T>
              </View>
              <Button variant="ghost" size="sm" isIconOnly onPress={() => removeProject(p.id)} accessibilityLabel={`Borrar ${p.name}`}>
                <Icon name="trash" size={18} />
              </Button>
            </Card>
          );
        })}
        <Card center onPress={() => setOpen(true)}>
          <Icon name="plus" plasma />
          <T weight="semibold" tone="ink">
            Nuevo proyecto
          </T>
        </Card>
      </View>

      <Dialog isOpen={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content>
            <Dialog.Title>Nuevo proyecto</Dialog.Title>
            <Input
              className="mt-3"
              placeholder="Nombre del proyecto"
              value={name}
              onChangeText={setName}
              onSubmitEditing={create}
              autoFocus
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <Button variant="ghost" onPress={() => setOpen(false)}>
                <Button.Label>Cancelar</Button.Label>
              </Button>
              <Button onPress={create} isDisabled={!name.trim()}>
                <Button.Label>Crear</Button.Label>
              </Button>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </Screen>
  );
}
