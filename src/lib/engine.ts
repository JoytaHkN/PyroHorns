import { contextTokens, modelById } from '@/data/models';
import { MockProvider } from '@/providers/mock';
import { LlamaProvider, isNativeLlamaAvailable, setNativeLlamaModule } from '@/providers/llama';
import type { ChatProvider } from '@/providers/types';
import { activeModelId, useSettings } from '@/store/settings';
import { uid, useChat, type AgentSnapshot } from '@/store/chat';
import { buildContext } from './context';
import { errorSummary, log } from './log';

/** F1.5/F2: usa el módulo nativo si está disponible, si no el mock. */
export { setNativeLlamaModule };
let provider: ChatProvider = isNativeLlamaAvailable() ? LlamaProvider : MockProvider;
export const setProvider = (p: ChatProvider) => {
  provider = p;
};

const controllers = new Map<string, AbortController>();

export const isGenerating = (convId: string) => controllers.has(convId);

export function currentAgent(): AgentSnapshot {
  const s = useSettings.getState();
  return { mode: s.mode, deep: s.deep, modelId: activeModelId(s) };
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
  const convId_ = id;
  const conv = useChat.getState().conversations.find((c) => c.id === convId_)!;
  if (conv.messages.length === 0) chat.rename(convId_, titleFrom(text));
  chat.setAgent(convId_, agent);

  chat.addMessage(convId_, { id: uid(), role: 'user', content: text, createdAt: Date.now() });
  const aiId = uid();
  const started = Date.now();
  chat.addMessage(convId_, {
    id: aiId,
    role: 'assistant',
    content: '',
    createdAt: started,
    status: 'thinking',
    modelId: agent.modelId,
  });

  const ctx = contextTokens(modelById(agent.modelId), agent.deep);
  const history = buildContext(
    useChat
      .getState()
      .conversations.find((c) => c.id === convId_)!
      .messages.filter((m) => m.id !== aiId),
    { contextTokens: ctx },
  );

  const patch = (p: Parameters<typeof chat.patchMessage>[2]) => chat.patchMessage(convId_, aiId, p);
  const ctrl = new AbortController();
  controllers.set(convId_, ctrl);
  let firstToken = true;
  try {
    for await (const ev of provider.stream(history, { ...agent, contextTokens: ctx, signal: ctrl.signal })) {
      switch (ev.type) {
        case 'thinking_delta':
          patch((m) => ({ thinking: (m.thinking ?? '') + ev.text, status: 'thinking' }));
          break;
        case 'token':
          if (firstToken) {
            firstToken = false;
            patch({ thinkMs: Date.now() - started });
          }
          patch((m) => ({ content: m.content + ev.text, status: 'streaming' }));
          break;
        case 'tool_call':
          patch((m) => ({ toolCalls: [...(m.toolCalls ?? []), { id: ev.id, name: ev.name, args: ev.args }] }));
          break;
        case 'usage':
          patch({ usage: ev.usage });
          break;
        case 'error':
          throw new Error(ev.message);
        case 'done':
          patch({ status: 'done' });
          break;
      }
    }
    // Un proveedor que termina sin "done" no debe dejar el mensaje generando.
    patch((m) => (m.status === 'done' ? {} : { status: 'done' }));
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    if (!aborted) log.error('engine.stream', e, { model: agent.modelId });
    patch((m) => ({
      status: aborted ? 'stopped' : 'error',
      content: aborted ? m.content : `${m.content}${m.content ? '\n\n' : ''}⚠️ ${errorSummary(e)}`,
    }));
  } finally {
    controllers.delete(convId_);
  }
  return convId_;
}

export function stop(convId: string) {
  controllers.get(convId)?.abort();
}
