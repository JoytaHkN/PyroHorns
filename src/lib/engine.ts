import { CLOUD_DEFAULT_ID, contextTokens, modelById } from '@/data/models';
import { parseRoute, rewriteCommand } from './assistant/intents';
import { CloudError } from '@/providers/cloud';
import { MockProvider } from '@/providers/mock';
import { LlamaProvider, isLoadedLlama, isNativeLlamaAvailable, setNativeLlamaModule } from '@/providers/llama';
import type { ChatProvider, ProviderMessage, StreamOptions } from '@/providers/types';
import { useEngine } from '@/store/engine';
import { activeModelId, useSettings } from '@/store/settings';
import { uid, useChat, type AgentSnapshot, type Message } from '@/store/chat';
import type { ToolCall } from '@/types/chat';
import { assistContext, describeAction, extractActions, problemOf, wantsAction, type Action } from './assistant/actions';
import { canUndo, runAction, undoAction } from './assistant/run';
import { foldText } from './assistant/template';
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

/** Respuesta si el modelo no escribió texto (y no hay acciones): se dice, en vez de dejar la burbuja en blanco (P26-E). */
const EMPTY_REPLY = 'No obtuve respuesta. Prueba otra vez o dímelo de otra forma.';

/** Lo que propone el modelo y crea o avisa algo: en Automático espera un toque (P26-C2). Lo demás sigue la regla de siempre. */
const NEEDS_TAP_FROM_MODEL: ReadonlySet<Action['type']> = new Set<Action['type']>(['event', 'alarm', 'timer']);

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
export async function send(
  input: string,
  convId?: string | null,
  opts: { web?: boolean; cloud?: boolean; voice?: boolean; heard?: string } = {},
): Promise<string> {
  // «@llamar Ana» y similares: el menú del cuadro de texto se traduce antes de todo.
  const command = rewriteCommand(input);
  const text = command.text;
  const web = !!opts.web || command.web;
  const chat = useChat.getState();
  const agent = opts.cloud ? { ...currentAgent(), modelId: CLOUD_DEFAULT_ID } : currentAgent();
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
    ...(web ? { web: {} } : {}),
    ...(assist ? { assist } : {}),
    // Dictado: lo que oyó la voz, cuando la corrección cambió la frase (se muestra bajo el mensaje).
    ...(opts.heard ? { heard: opts.heard } : {}),
  });

  // Planilla de intenciones: lo que la app puede hacer sin el modelo se resuelve aquí (evita respuestas inventadas).
  const mode = useSettings.getState().assistant;
  // «Sí» o «no» responden a la acción pendiente de la última respuesta (modo con confirmación).
  const pending = pendingCall(convId_);
  const decision = pending ? decisionOf(text) : null;
  if (pending && decision) {
    if (decision === 'yes') await confirmAction(convId_, pending.aiId, pending.callId);
    else dismissAction(convId_, pending.aiId, pending.callId);
    if (opts.voice) say(decision === 'yes' ? resultOf(convId_, pending.aiId, pending.callId) : 'Descartada.');
    return convId_;
  }

  const route = mode !== 'off' && !web && !opts.cloud ? parseRoute(text, new Date()) : null;
  if (route?.kind === 'question' || route?.kind === 'answer') return answerNow(convId_, agent.modelId, route.text, opts.voice);
  if (route?.kind === 'action') {
    // Lo que no tiene sentido (un texto vago, una fecha pasada) se pregunta en vez de hacerlo (P26-C1).
    const problem = problemOf(route.action, new Date());
    if (problem) return answerNow(convId_, agent.modelId, problem, opts.voice);
    const aiId = uid();
    const callId = uid();
    chat.addMessage(convId_, {
      id: aiId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      status: 'done',
      modelId: agent.modelId,
      toolCalls: [{ id: callId, name: route.action.type, args: JSON.stringify(route.action), status: 'pending' }],
    });
    if (mode === 'auto') {
      await confirmAction(convId_, aiId, callId);
      if (opts.voice) say(resultOf(convId_, aiId, callId));
    } else if (opts.voice) {
      say(`${describeAction(route.action)}. ¿Lo hago? Di sí o no.`);
    }
    return convId_;
  }

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
  if (opts.voice) say(spokenReply(convId_, aiId));
  return convId_;
}

/** Voz de salida (la pone la app al arrancar; el motor no depende de la librería de voz). */
let speaker: ((text: string) => void) | null = null;
export const setSpeaker = (fn: ((text: string) => void) | null) => {
  speaker = fn;
};

/** Lee en voz alta si el ajuste lo permite. */
function say(text: string) {
  const clean = text.trim();
  if (!clean || !speaker || !useSettings.getState().voiceReply) return;
  speaker(clean);
}

/** Respuesta de la propia app (sin modelo): se escribe y, con voz, se lee. */
function answerNow(convId: string, modelId: string, text: string, voice?: boolean): string {
  useChat.getState().addMessage(convId, { id: uid(), role: 'assistant', content: text, createdAt: Date.now(), status: 'done', modelId });
  if (voice) say(text);
  return convId;
}

/** Lo que se lee de una respuesta: su texto y, si hay una acción esperando un toque, la pregunta de confirmación. */
function spokenReply(convId: string, aiId: string): string {
  const m = findMessage(convId, aiId);
  const waiting = m?.toolCalls?.find((c) => c.status === 'pending');
  const ask = waiting ? `${describeAction(JSON.parse(waiting.args) as Action)}. ¿Lo hago? Di sí o no.` : '';
  return [m?.content ?? '', ask].filter(Boolean).join(' ');
}

/** Lo que se lee de una acción hecha: el resultado y, si hay que elegir contacto, los nombres. */
const resultOf = (convId: string, aiId: string, callId: string): string => {
  const call = findMessage(convId, aiId)?.toolCalls?.find((c) => c.id === callId);
  return [call?.result ?? '', call?.choices?.join(', ') ?? ''].filter(Boolean).join(' ');
};

/** Acción pendiente de la última respuesta del asistente, si la hay. */
function pendingCall(convId: string): { aiId: string; callId: string } | null {
  const messages = useChat.getState().conversations.find((c) => c.id === convId)?.messages ?? [];
  const last = [...messages].reverse().find((m) => m.role === 'assistant');
  const call = last?.toolCalls?.find((c) => c.status === 'pending');
  return last && call ? { aiId: last.id, callId: call.id } : null;
}

/** «sí», «hazlo», «adelante» → yes; «no», «cancela», «olvídalo» → no; cualquier otra cosa → null. */
export function decisionOf(text: string): 'yes' | 'no' | null {
  const f = foldText(text).trim();
  if (/^(si|hazlo|confirmalo|confirma|adelante|dale|vale|ok)\b/.test(f)) return 'yes';
  if (/^(no|cancelalo|cancela|olvidalo|dejalo)\b/.test(f)) return 'no';
  return null;
}

/** Vuelve a generar la última respuesta de la conversación (sustituye a la anterior). */
export async function regenerate(convId: string): Promise<void> {
  const conv = useChat.getState().conversations.find((c) => c.id === convId);
  const last = conv?.messages[conv.messages.length - 1];
  if (!last || last.role !== 'assistant' || isGenerating(convId)) return;
  // Una respuesta de la nube se regenera con la nube, aunque el modelo activo sea otro.
  const agent = last.modelId && modelById(last.modelId).cloud ? { ...currentAgent(), modelId: last.modelId } : currentAgent();
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
    // Si no llegó texto ni acciones, se dice en vez de dejar una burbuja en blanco (P26-E).
    patch((m) => ({
      ...(m.status === 'done' ? {} : { status: 'done' as const }),
      ...(m.content.trim() || m.toolCalls?.length ? {} : { content: EMPTY_REPLY }),
    }));
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
  // Lo que no tiene sentido (un texto vago, una fecha pasada, la medianoche sin hora) no se hace: queda como error con su motivo (P26-C1).
  const calls = actions.map((a): ToolCall => {
    const id = uid();
    const problem = problemOf(a, new Date());
    return problem
      ? { id, name: a.type, args: JSON.stringify(a), status: 'error', result: problem }
      : { id, name: a.type, args: JSON.stringify(a), status: 'pending' };
  });
  useChat.getState().patchMessage(convId, aiId, { toolCalls: calls });
  for (let i = 0; i < calls.length; i++) {
    const call = calls[i]!;
    if (call.status !== 'pending') continue;
    // Ver la lista no cambia nada: se muestra siempre. Evento, alarma y temporizador esperan un toque en Automático (P26-C2).
    const auto = (mode === 'auto' && mayRun && !NEEDS_TAP_FROM_MODEL.has(actions[i]!.type)) || call.name === 'list';
    if (auto) await confirmAction(convId, aiId, call.id);
  }
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
  const action = JSON.parse(call.args) as Action;
  // Se vuelve a mirar antes de hacerla: lo que se pidió con un toque también puede estar vacío o caducado (P26-C1).
  const problem = problemOf(action, new Date());
  if (problem) {
    updateCall(convId, aiId, callId, { status: 'error', result: problem });
    return;
  }
  updateCall(convId, aiId, callId, { status: 'done', result: 'Haciendo…' });
  try {
    const { result, ref, choices } = await runAction(action);
    updateCall(convId, aiId, callId, { status: choices ? 'choose' : 'done', result, ...(ref ? { ref } : {}), ...(choices ? { choices } : {}) });
  } catch (e) {
    updateCall(convId, aiId, callId, { status: 'error', result: e instanceof Error ? e.message : String(e) });
  }
}

/** El usuario tocó un contacto: se hace la acción con ese nombre completo. */
export async function chooseContact(convId: string, aiId: string, callId: string, name: string): Promise<void> {
  const call = findMessage(convId, aiId)?.toolCalls?.find((c) => c.id === callId);
  if (!call || call.status !== 'choose') return;
  const action = { ...(JSON.parse(call.args) as Action), name, exact: true };
  updateCall(convId, aiId, callId, { args: JSON.stringify(action), status: 'pending', choices: undefined });
  await confirmAction(convId, aiId, callId);
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

/**
 * Completa con el modelo del teléfono sin cargar ninguno (P26-A3): null si el modelo es de la nube, si no está cargado
 * con este contexto o si hay una respuesta en curso (no se hace esperar al dictado).
 */
export async function completeLocal(messages: ProviderMessage[], maxTokens: number): Promise<string | null> {
  const agent = currentAgent();
  const model = modelById(agent.modelId);
  const contextSize = contextTokens(model, agent.deep);
  if (model.cloud || !provider.complete || controllers.size > 0 || !isLoadedLlama(model.id, contextSize)) return null;
  return provider.complete(messages, { modelId: model.id, mode: agent.mode, deep: agent.deep, contextTokens: contextSize, maxTokens });
}
