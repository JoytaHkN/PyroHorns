import type { ModeId } from '@/data/agents';
import type { AgendaItem, ChatData, Conversation, Message, MessageStatus, Project, ToolCall, Usage, WebInfo } from '@/types/chat';
import { fold, settleStatus, type ChatRepo, type ConversationMeta } from './repo';
import type { SqlDb } from './sql';

interface ConversationRow {
  id: string;
  title: string;
  project_id: string | null;
  created_at: number;
  updated_at: number;
  mode: string;
  deep: number;
  model_id: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  thinking: string | null;
  status: string | null;
  think_ms: number | null;
  model_id: string | null;
  usage: string | null;
  tool_calls: string | null;
  feedback: string | null;
  web: string | null;
  assist: string | null;
  heard: string | null;
  created_at: number;
}

const parseJson = <T>(s: string | null): T | undefined => {
  if (!s) return undefined;
  try {
    return JSON.parse(s) as T;
  } catch {
    return undefined;
  }
};

function toMessage(r: MessageRow): Message {
  const m: Message = {
    id: r.id,
    role: r.role === 'user' ? 'user' : 'assistant',
    content: r.content,
    createdAt: r.created_at,
  };
  if (r.status) m.status = r.status as MessageStatus;
  if (r.think_ms != null) m.thinkMs = r.think_ms;
  if (r.thinking) m.thinking = r.thinking;
  if (r.model_id) m.modelId = r.model_id;
  const usage = parseJson<Usage>(r.usage);
  if (usage) m.usage = usage;
  const calls = parseJson<ToolCall[]>(r.tool_calls);
  if (calls?.length) m.toolCalls = calls;
  if (r.feedback === 'up' || r.feedback === 'down') m.feedback = r.feedback;
  const web = parseJson<WebInfo>(r.web);
  if (web) m.web = web;
  if (r.assist) m.assist = r.assist;
  if (r.heard) m.heard = r.heard;
  return settleStatus(m);
}

/** Convierte texto libre en una consulta FTS5 segura: cada palabra entre comillas y como prefijo. */
export function ftsQuery(term: string): string {
  return term
    .trim()
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w))
    .map((w) => `"${w.replace(/"/g, '""')}"*`)
    .join(' ');
}

const likePattern = (term: string) => `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export class SqlChatRepo implements ChatRepo {
  constructor(
    private readonly db: SqlDb,
    private readonly fts: boolean,
  ) {}

  async loadAll(): Promise<ChatData> {
    const convRows = await this.db.all<ConversationRow>('SELECT * FROM conversations ORDER BY updated_at DESC');
    const msgRows = await this.db.all<MessageRow>('SELECT * FROM messages ORDER BY rid');
    const byConv = new Map<string, Message[]>();
    for (const r of msgRows) {
      const list = byConv.get(r.conversation_id) ?? [];
      list.push(toMessage(r));
      byConv.set(r.conversation_id, list);
    }
    const conversations: Conversation[] = convRows.map((r) => ({
      id: r.id,
      title: r.title,
      projectId: r.project_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      agent: { mode: r.mode as ModeId, deep: r.deep === 1, modelId: r.model_id },
      messages: byConv.get(r.id) ?? [],
    }));
    const projects = await this.db.all<{ id: string; name: string; created_at: number }>(
      'SELECT * FROM projects ORDER BY created_at',
    );
    const items = await this.db.all<{ id: string; kind: string; text: string; due: number | null; done: number; created_at: number }>(
      'SELECT * FROM items ORDER BY created_at',
    );
    return {
      conversations,
      projects: projects.map((p) => ({ id: p.id, name: p.name, createdAt: p.created_at })),
      items: items.map((i) => ({
        id: i.id,
        kind: i.kind === 'task' ? 'task' : 'note',
        text: i.text,
        ...(i.due != null ? { due: i.due } : {}),
        ...(i.done ? { done: true } : {}),
        createdAt: i.created_at,
      })),
    };
  }

  async saveConversation(c: ConversationMeta): Promise<void> {
    await this.db.run(
      `INSERT INTO conversations (id, title, project_id, created_at, updated_at, mode, deep, model_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET title = excluded.title, project_id = excluded.project_id,
         updated_at = excluded.updated_at, mode = excluded.mode, deep = excluded.deep, model_id = excluded.model_id`,
      [c.id, c.title, c.projectId, c.createdAt, c.updatedAt, c.agent.mode, c.agent.deep ? 1 : 0, c.agent.modelId],
    );
  }

  async deleteConversation(id: string): Promise<void> {
    await this.db.run('DELETE FROM conversations WHERE id = ?', [id]);
  }

  async insertMessage(conversationId: string, m: Message): Promise<void> {
    await this.db.transaction(async () => {
      await this.db.run(
        `INSERT INTO messages (id, conversation_id, role, content, thinking, status, think_ms, model_id, usage, tool_calls, feedback, web, assist, heard, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          m.id,
          conversationId,
          m.role,
          m.content,
          m.thinking ?? null,
          m.status ?? null,
          m.thinkMs ?? null,
          m.modelId ?? null,
          m.usage ? JSON.stringify(m.usage) : null,
          m.toolCalls?.length ? JSON.stringify(m.toolCalls) : null,
          m.feedback ?? null,
          m.web ? JSON.stringify(m.web) : null,
          m.assist ?? null,
          m.heard ?? null,
          m.createdAt,
        ],
      );
      await this.db.run('UPDATE conversations SET updated_at = MAX(updated_at, ?) WHERE id = ?', [m.createdAt, conversationId]);
    });
  }

  async updateMessage(m: Message): Promise<void> {
    await this.db.run(
      `UPDATE messages SET content = ?, thinking = ?, status = ?, think_ms = ?, model_id = ?, usage = ?, tool_calls = ?, feedback = ?, web = ?, assist = ?
       WHERE id = ?`,
      [
        m.content,
        m.thinking ?? null,
        m.status ?? null,
        m.thinkMs ?? null,
        m.modelId ?? null,
        m.usage ? JSON.stringify(m.usage) : null,
        m.toolCalls?.length ? JSON.stringify(m.toolCalls) : null,
        m.feedback ?? null,
        m.web ? JSON.stringify(m.web) : null,
        m.assist ?? null,
        m.id,
      ],
    );
  }

  async saveProject(p: Project): Promise<void> {
    await this.db.run(
      'INSERT INTO projects (id, name, created_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name',
      [p.id, p.name, p.createdAt],
    );
  }

  async deleteProject(id: string): Promise<void> {
    await this.db.transaction(async () => {
      await this.db.run('UPDATE conversations SET project_id = NULL WHERE project_id = ?', [id]);
      await this.db.run('DELETE FROM projects WHERE id = ?', [id]);
    });
  }

  async deleteAll(): Promise<void> {
    await this.db.transaction(async () => {
      await this.db.run('DELETE FROM messages');
      await this.db.run('DELETE FROM conversations');
    });
  }

  async saveItem(i: AgendaItem): Promise<void> {
    await this.db.run(
      `INSERT INTO items (id, kind, text, due, done, created_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET text = excluded.text, due = excluded.due, done = excluded.done`,
      [i.id, i.kind, i.text, i.due ?? null, i.done ? 1 : 0, i.createdAt],
    );
  }

  async deleteItem(id: string): Promise<void> {
    await this.db.run('DELETE FROM items WHERE id = ?', [id]);
  }

  async search(term: string): Promise<string[]> {
    const t = term.trim();
    if (!t) return [];
    const ids = new Set<string>();
    const byTitle = await this.db.all<{ id: string; title: string }>('SELECT id, title FROM conversations');
    for (const r of byTitle) if (fold(r.title).includes(fold(t))) ids.add(r.id);
    for (const r of await this.searchMessages(t)) ids.add(r.conversation_id);
    return [...ids];
  }

  private async searchMessages(t: string): Promise<{ conversation_id: string }[]> {
    if (this.fts) {
      const q = ftsQuery(t);
      if (!q) return [];
      try {
        return await this.db.all(
          `SELECT DISTINCT m.conversation_id FROM messages_fts f JOIN messages m ON m.rid = f.rowid
           WHERE messages_fts MATCH ?`,
          [q],
        );
      } catch {
        // Consulta que FTS5 no acepta: se busca con LIKE.
      }
    }
    return this.db.all("SELECT DISTINCT conversation_id FROM messages WHERE content LIKE ? ESCAPE '\\'", [likePattern(t)]);
  }
}
