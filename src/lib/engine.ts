import { MockProvider } from '@/providers/mock';
import type { ChatProvider } from '@/providers/types';
import { activeModelId, useSettings } from '@/store/settings';
import { uid, useChat, type AgentSnapshot } from '@/store/chat';

/** F2 reemplaza esto por el LlamaProvider. */
let provider: ChatProvider = MockProvider;
export const setProvider = (p: ChatProvider) => {
  provider = p;
};

const controllers = new Map<string, AbortController>();

export const isGenerating = (convId: string) => controllers.has(convId);

function currentAgent(): AgentSnapshot {
  const s = useSettings.getState();
  return { mode: s.mode, level: s.level, modelId: activeModelId(s) };
}

function titleFrom(text: string) {
  const t = text.trim().replace(/\s+/g, ' ');
  return t.length > 42 ? `${t.slice(0, 40)}…` : t || 'Nueva conversación';
}

/** Envía un mensaje; crea la conversación si no existe. Devuelve el id de conversación. */
export async function send(text: string, convId?: string | null): Promise<string> {
  const chat = useChat.getState();
  const agent = currentAgent();
  let id = convId ?? null;
  if (!id || !chat.conversations.some((c) => c.id === id)) id = chat.newConversation(agent);
  const conv = useChat.getState().conversations.find((c) => c.id === id)!;
  if (conv.messages.length === 0) chat.rename(id, titleFrom(text));
  chat.setAgent(id, agent);

  chat.addMessage(id, { id: uid(), role: 'user', content: text, createdAt: Date.now() });
  const aiId = uid();
  chat.addMessage(id, { id: aiId, role: 'assistant', content: '', createdAt: Date.now(), status: 'thinking' });

  const history = useChat
    .getState()
    .conversations.find((c) => c.id === id)!
    .messages.filter((m) => m.id !== aiId)
    .map((m) => ({ role: m.role, content: m.content }));

  const ctrl = new AbortController();
  controllers.set(id, ctrl);
  const convId_ = id;
  try {
    for await (const ev of provider.stream(history, { ...agent, signal: ctrl.signal })) {
      if (ev.type === 'thinking') chat.patchMessage(convId_, aiId, { thinkMs: ev.ms, status: 'streaming' });
      else if (ev.type === 'token')
        chat.patchMessage(convId_, aiId, (m) => ({ content: m.content + ev.text, status: 'streaming' }));
      else chat.patchMessage(convId_, aiId, { status: 'done' });
    }
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    chat.patchMessage(convId_, aiId, (m) => ({
      status: aborted ? 'stopped' : 'error',
      content: aborted ? m.content : `${m.content}\n\n⚠️ ${e instanceof Error ? e.message : String(e)}`,
    }));
  } finally {
    controllers.delete(convId_);
  }
  return convId_;
}

export function stop(convId: string) {
  controllers.get(convId)?.abort();
}
