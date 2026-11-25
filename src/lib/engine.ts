import { contextTokens, modelById } from '@/data/models';
import { CloudError } from '@/providers/cloud';
import { MockProvider } from '@/providers/mock';
import { LlamaProvider, isNativeLlamaAvailable, setNativeLlamaModule } from '@/providers/llama';
import type { ChatProvider, StreamOptions } from '@/providers/types';
import { useEngine } from '@/store/engine';
import { activeModelId, useSettings } from '@/store/settings';
import { uid, useChat, type AgentSnapshot, type Message } from '@/store/chat';
import { assistContext, extractActions, wantsAction, type Action } from './assistant/actions';
import { canUndo, runAction, undoAction } from './assistant/run';
import { buildContext, estimateTokens } from './context';
import { errorSummary, log } from './log';
import { cleanQuery, needsRewrite, queryMessages } from './search-query';
import { systemPrompt } from './system-prompt';
import { SearchError, searchDuckDuckGo, webContext } from './web-search';

/** F1.5/F2: usa el módulo nativo si está disponible, si no el mock. */
export { setNativeLlamaModule };
let provider: ChatProvider = MockProvider;
export const setProvider = (p: ChatProvider) => {
  provider = p;
};
export function activateNativeLlama() {
  if (isNativeLlamaAvailable()) provider = LlamaProvider;
}

/** Agente en la nube (se registra en Android; sin él, los modelos en la nube avisan). */
let cloudProvider: ChatProvider | null = null;
export const setCloudProvider = (p: ChatProvider | null) => {
  cloudProvider = p;
};

/** Quién responde: el motor del teléfono o el de la nube, según el modelo. */
function engineFor(modelId: string): ChatProvider {
  if (!modelById(modelId).cloud) return provider;
  if (!cloudProvider) throw new CloudError('Los modelos en la nube solo funcionan en la app de Android.');
  return cloudProvider;
}

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
export async function send(text: string, convId?: string | null, opts: { web?: boolean } = {}): Promise<string> {
  const chat = useChat.getState();
  const agent = currentAgent();
  let id = convId ?? null;
  if (!id || !chat.conversations.some((c) => c.id === id)) id = chat.newConversation(agent);
  const convId_ = id;
  const conv = useChat.getState().conversations.find((c) => c.id === convId_)!;
  if (conv.messages.length === 0) chat.rename(convId_, titleFrom(text));
  chat.setAgent(convId_, agent);

  // Una aclaración («¿qué texto?») sigue a una petición del asistente: la respuesta corta también lleva las instrucciones.
  const lastReply = [...conv.messages].reverse().find((m) => m.role === 'assistant');
  const lastAsk = [...conv.messages].reverse().find((m) => m.role === 'user');
  const followUp = !!lastReply?.content.includes('?') && !!lastAsk?.assist;
  const assist =
    useSettings.getState().assistant !== 'off' && (wantsAction(text) || followUp) ? assistContext(new Date()) : undefined;
  chat.addMessage(convId_, {
    id: uid(),
    role: 'user',
    content: text,
    createdAt: Date.now(),
    ...(opts.web ? { web: {} } : {}),
    ...(assist ? { assist } : {}),
  });
  const aiId = uid();
  chat.addMessage(convId_, {
    id: aiId,
    role: 'assistant',
    content: '',
    createdAt: Date.now(),
    status: 'thinking',
    modelId: agent.modelId,
  });
  await reply(convId_, aiId, agent);
  return convId_;
}

/** Vuelve a generar la última respuesta de la conversación (sustituye a la anterior). */
export async function regenerate(convId: string): Promise<void> {
  const conv = useChat.getState().conversations.find((c) => c.id === convId);
  const last = conv?.messages[conv.messages.length - 1];
  if (!last || last.role !== 'assistant' || isGenerating(convId)) return;
  const agent = currentAgent();
  const chat = useChat.getState();
  chat.setAgent(convId, agent);
  chat.patchMessage(convId, last.id, {
    content: '',
    thinking: undefined,
    thinkMs: undefined,
    usage: undefined,
    toolCalls: undefined,
    feedback: null,
    status: 'thinking',
    modelId: agent.modelId,
  });
  // Al regenerar, las acciones esperan un toque: repetirlas solas duplicaría eventos o notas.
  await reply(convId, last.id, agent, false);
}

/** Genera la respuesta `aiId` a partir de los mensajes anteriores a ella. */
async function reply(convId_: string, aiId: string, agent: AgentSnapshot, mayRunActions = true): Promise<void> {
  const chat = useChat.getState();
  const started = Date.now();
  const ctx = contextTokens(modelById(agent.modelId), agent.deep);
  const patch = (p: Parameters<typeof chat.patchMessage>[2]) => chat.patchMessage(convId_, aiId, p);
  const ctrl = new AbortController();
  controllers.set(convId_, ctrl);
  let firstToken = true;
  /** Inicio del razonamiento: «Pensó N s» mide solo el razonamiento (no la carga del modelo ni el prefill). */
  let thinkStart: number | null = null;
  try {
    await searchIfAsked(convId_, aiId, { ...agent, contextTokens: ctx, signal: ctrl.signal });
    const system = systemPrompt(agent.modelId);
    const messages = useChat.getState().conversations.find((c) => c.id === convId_)!.messages;
    const history = [
      { role: 'system' as const, content: system },
      ...buildContext(
        messages.slice(0, messages.findIndex((m) => m.id === aiId)),
        { contextTokens: ctx - estimateTokens(system) },
      ),
    ];
    for await (const ev of engineFor(agent.modelId).stream(history, { ...agent, contextTokens: ctx, signal: ctrl.signal })) {
      switch (ev.type) {
        case 'thinking_delta':
          if (thinkStart === null) thinkStart = Date.now();
          patch((m) => ({ thinking: (m.thinking ?? '') + ev.text, status: 'thinking' }));
          break;
        case 'token':
          if (firstToken) {
            firstToken = false;
            if (thinkStart !== null) patch({ thinkMs: Date.now() - thinkStart });
          }
          patch((m) => ({ content: m.content + ev.text, status: 'streaming' }));
          break;
        case 'tool_call':
          patch((m) => ({ toolCalls: [...(m.toolCalls ?? []), { id: ev.id, name: ev.name, args: ev.args }] }));
          break;
        case 'usage':
          patch({ usage: { ...ev.usage, totalMs: Date.now() - started } });
          break;
        case 'error':
          throw new Error(ev.message);
        case 'done':
          patch((m) => ({ status: 'done', ...(m.usage ? { usage: { ...m.usage, totalMs: Date.now() - started } } : {}) }));
          break;
      }
    }
    // Un proveedor que termina sin "done" no debe dejar el mensaje generando.
    patch((m) => (m.status === 'done' ? {} : { status: 'done' }));
    await proposeActions(convId_, aiId, mayRunActions);
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    if (!aborted) log.error('engine.stream', e, { model: agent.modelId });
    patch((m) => ({
      status: aborted ? 'stopped' : 'error',
      content: aborted
        ? m.content
        : `${m.content}${m.content ? '\n\n' : ''}⚠️ ${e instanceof SearchError || e instanceof CloudError ? e.message : errorSummary(e)}`,
    }));
  } finally {
    controllers.delete(convId_);
  }
}

/** Si el mensaje pidió internet y aún no hay resultados, busca y los guarda (al regenerar se reutilizan). */
async function searchIfAsked(convId: string, aiId: string, opts: StreamOptions & { signal: AbortSignal }): Promise<void> {
  const messages = useChat.getState().conversations.find((c) => c.id === convId)!.messages;
  const question = messages[messages.findIndex((m) => m.id === aiId) - 1];
  if (!question || question.role !== 'user' || !question.web || question.web.context) return;
  useEngine.getState().setSearching(true);
  try {
    const query = await searchQuery(messages.slice(0, messages.indexOf(question)), question.content, opts);
    const results = await searchDuckDuckGo(query, opts.signal);
    const chat = useChat.getState();
    chat.patchMessage(convId, question.id, { web: { context: webContext(results, new Date()) } });
    chat.patchMessage(convId, aiId, { web: { query, sources: results.map(({ title, url }) => ({ title, url })) } });
  } finally {
    useEngine.getState().setSearching(false);
  }
}

/** La consulta que sale hacia el buscador: el mensaje, o un resumen que hace el modelo del teléfono. */
async function searchQuery(before: Message[], text: string, opts: StreamOptions & { signal: AbortSignal }): Promise<string> {
  const previous = [...before].reverse().find((m) => m.role === 'user')?.content;
  const model = modelById(opts.modelId);
  if (model.cloud || model.noRewrite || !provider.complete || !needsRewrite(text, previous)) return text;
  try {
    return cleanQuery(await provider.complete(queryMessages(text, previous), opts)) ?? text;
  } catch (e) {
    if (opts.signal.aborted) throw e;
    log.warn('web.query_failed'); // sin el mensaje ni la consulta (S9)
    return text;
  }
}

const findMessage = (convId: string, id: string) =>
  useChat.getState().conversations.find((c) => c.id === convId)?.messages.find((m) => m.id === id);

/**
 * Asistente: convierte los bloques de la respuesta en acciones. Solo si el mensaje del usuario las pidió (llevaba las
 * instrucciones del asistente); lo que venga en una respuesta a otra cosa no se ejecuta.
 */
async function proposeActions(convId: string, aiId: string, mayRun: boolean): Promise<void> {
  const mode = useSettings.getState().assistant;
  const messages = useChat.getState().conversations.find((c) => c.id === convId)?.messages ?? [];
  const index = messages.findIndex((m) => m.id === aiId);
  if (mode === 'off' || index < 1 || !messages[index - 1]!.assist) return;
  const { actions } = extractActions(messages[index]!.content);
  if (!actions.length) return;
  const calls = actions.map((a) => ({ id: uid(), name: a.type, args: JSON.stringify(a), status: 'pending' as const }));
  useChat.getState().patchMessage(convId, aiId, { toolCalls: calls });
  // Ver la lista no cambia nada: se muestra siempre.
  for (const call of calls) if ((mode === 'auto' && mayRun) || call.name === 'list') await confirmAction(convId, aiId, call.id);
}

function updateCall(convId: string, aiId: string, callId: string, patch: Partial<NonNullable<Message['toolCalls']>[number]>) {
  useChat.getState().patchMessage(convId, aiId, (m) => ({
    toolCalls: (m.toolCalls ?? []).map((c) => (c.id === callId ? { ...c, ...patch } : c)),
  }));
}

/** Hace la acción pendiente (automática o al tocar «Hacer»). */
export async function confirmAction(convId: string, aiId: string, callId: string): Promise<void> {
  const call = findMessage(convId, aiId)?.toolCalls?.find((c) => c.id === callId);
  if (!call || (call.status !== 'pending' && call.status !== 'error')) return;
  updateCall(convId, aiId, callId, { status: 'done', result: 'Haciendo…' });
  try {
    const { result, ref } = await runAction(JSON.parse(call.args) as Action);
    updateCall(convId, aiId, callId, { status: 'done', result, ...(ref ? { ref } : {}) });
  } catch (e) {
    updateCall(convId, aiId, callId, { status: 'error', result: e instanceof Error ? e.message : String(e) });
  }
}

export function dismissAction(convId: string, aiId: string, callId: string): void {
  updateCall(convId, aiId, callId, { status: 'dismissed', result: 'Descartada' });
}

export async function revertAction(convId: string, aiId: string, callId: string): Promise<void> {
  const call = findMessage(convId, aiId)?.toolCalls?.find((c) => c.id === callId);
  if (!call?.ref || call.status !== 'done') return;
  const action = JSON.parse(call.args) as Action;
  if (!canUndo(action)) return;
  try {
    await undoAction(action, call.ref);
    updateCall(convId, aiId, callId, { status: 'undone', result: 'Deshecho' });
  } catch (e) {
    updateCall(convId, aiId, callId, { result: e instanceof Error ? e.message : String(e) });
  }
}

export function stop(convId: string) {
  controllers.get(convId)?.abort();
}
