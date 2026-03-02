'use strict';

/**
 * services/chat.service.js
 *
 * Owns chat-related business logic:
 *   - Session CRUD
 *   - AI-powered session analysis
 *   - AI-powered session search
 *   - Export conversation to structured doc
 *   - Dev to-do list management
 *
 * Routes should call these functions and handle only HTTP concerns.
 */

// Auto-create table on first use
let _chatTableReady = false;
async function ensureChatTable(supabase) {
  if (_chatTableReady) return;
  try {
    const { error } = await supabase.from('chat_sessions').select('id').limit(1);
    if (error && error.message.includes('does not exist')) {
      console.log('[CHAT] chat_sessions table not found. Please create it in the Supabase SQL editor.');
      console.log('[CHAT] SQL: CREATE TABLE chat_sessions (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_id text NOT NULL, title text DEFAULT \'New conversation\', messages jsonb DEFAULT \'[]\'::jsonb, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()); CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);');
    }
    _chatTableReady = true;
  } catch { _chatTableReady = true; }
}

function makeChatService({ supabase, anthropic }) {

  // ── Session CRUD ────────────────────────────────────────────────────────

  async function listSessions(userId) {
    await ensureChatTable(supabase);
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('id, title, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data || [];
  }

  async function createSession(userId, title, messages) {
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({ user_id: userId, title: title || 'New conversation', messages: messages || [] })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function getSession(userId, sessionId) {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    return data || null;
  }

  async function updateSession(userId, sessionId, { title, messages }) {
    const update = { updated_at: new Date().toISOString() };
    if (title !== undefined) update.title = title;
    if (messages !== undefined) update.messages = messages;

    const { data, error } = await supabase
      .from('chat_sessions')
      .update(update)
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function deleteSession(userId, sessionId) {
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId);
    if (error) throw error;
    return { ok: true };
  }

  async function deleteAllSessions(userId) {
    const { data, error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('user_id', userId)
      .select('id');
    if (error) throw error;
    return { ok: true, deleted: (data || []).length };
  }

  // ── AI-powered analysis ─────────────────────────────────────────────────

  async function analyseSessions(userId) {
    await ensureChatTable(supabase);
    const { data: sessions, error } = await supabase
      .from('chat_sessions')
      .select('id, title, messages, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;

    if (!sessions || sessions.length === 0) {
      return {
        totalSessions: 0, totalMessages: 0, dateRange: null,
        html: '<p style="color:var(--dim)">No chat sessions to analyse yet. Start some conversations first.</p>',
      };
    }

    let totalMessages = 0;
    const digest = sessions.map(s => {
      const msgs = (s.messages || []).filter(m => m.role === 'user');
      totalMessages += msgs.length;
      return `Session "${s.title}" (${new Date(s.created_at).toLocaleDateString()}): ${msgs.map(m => m.content).join(' | ')}`;
    }).join('\n');

    const oldest    = sessions[sessions.length - 1].created_at;
    const newest    = sessions[0].created_at;
    const dateRange = new Date(oldest).toLocaleDateString() + ' – ' + new Date(newest).toLocaleDateString();

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `You are analysing chat history data from a biologics manufacturing facility's SOP query system called "Vent". Operators, QA, and engineers use this to ask questions about standard operating procedures, equipment, troubleshooting, and processes.

Below is a digest of all ${sessions.length} chat sessions (${totalMessages} user messages) from ${dateRange}. Each line shows the session title and the user questions asked.

════ CHAT SESSION DIGEST ════
${digest}
══════════════════════════════

Analyse this data and produce a concise report in HTML format (no markdown, no code fences). Structure it as:

<h3>Top Topics</h3>
<ul><li><strong>Topic</strong> — brief description of what people ask about (approximate frequency)</li>...</ul>

<h3>Common Question Types</h3>
<ul><li><strong>Type</strong> — explanation</li>...</ul>

<h3>Trending Areas</h3>
<p>Brief paragraph about what areas/equipment/processes are getting the most attention recently.</p>

<h3>Insights</h3>
<p>1-2 paragraph summary: any patterns you notice, knowledge gaps, areas where better documentation might help, or training opportunities.</p>

Keep it concise and actionable. Use simple HTML tags only (h3, ul, li, p, strong, em). No CSS classes or styles.`,
      }],
    });

    const html = message.content[0].text.replace(/```html|```/g, '').trim();
    return { totalSessions: sessions.length, totalMessages, dateRange, html };
  }

  // ── AI-powered search ───────────────────────────────────────────────────

  async function searchSessions(userId, query) {
    const { data: sessions, error } = await supabase
      .from('chat_sessions')
      .select('id, title, messages, created_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    if (!sessions || !sessions.length) return { matches: [] };

    const summaries = sessions.map((s, i) => {
      let preview = '';
      const msgs = s.messages || [];
      let count = 0;
      for (let j = 0; j < msgs.length && count < 3; j++) {
        if (msgs[j].role === 'user') {
          preview += (preview ? ' | ' : '') + (msgs[j].content || '').substring(0, 150);
          count++;
        }
      }
      return `[${i}] ID=${s.id} | Title: ${s.title || 'Untitled'} | User messages: ${preview || '(empty)'}`;
    }).join('\n');

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `You are searching through conversations from a biologics manufacturing facility's Q&A system.

The user is looking for: "${query}"

Here are the conversations with their titles and user messages:
${summaries}

Return ONLY a JSON array of the matching conversation IDs (strings), ordered by relevance. If nothing matches, return an empty array [].
Example: ["abc-123", "def-456"]

Be generous with matching — the user may describe the conversation loosely or use different words than what's in the title/preview. Think about what the conversation was likely about and match if the intent is similar.`,
      }],
    });

    let text = msg.content[0].text.trim();
    text = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
    return { matches: JSON.parse(text) };
  }

  // ── Export conversation to doc ──────────────────────────────────────────

  async function exportToDoc(messages, title) {
    const conversation = messages.map(m =>
      `${m.role === 'user' ? 'USER' : 'ASSISTANT'}: ${m.content}`).join('\n\n');

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are analysing a Q&A conversation from a biologics manufacturing facility's SOP query system.

The conversation title is: "${title || 'Untitled'}"

Here is the full conversation:
${conversation}

Extract the key issues, procedures, findings, and action items discussed. Convert them into a structured SOP-style document with clear steps.

Return ONLY valid JSON (no markdown fences, no explanation) in this exact format:
{
  "title": "A clear document title based on the conversation topic",
  "area": "One of: Upstream, Media Prep, Harvest / TFF, CIP / SIP, QC / In-process, General",
  "description": "A 1-2 sentence summary of what this document covers",
  "steps": [
    { "title": "Step title", "content": "Detailed step content", "note": "Any warnings or critical notes (or empty string)" }
  ]
}

Create 3-8 meaningful steps that capture the essential information from the conversation.`,
      }],
    });

    let text = msg.content[0].text.trim();
    text = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
    return JSON.parse(text);
  }

  // ── Dev to-dos ──────────────────────────────────────────────────────────

  function _effectiveUserId(userId, page) {
    return (!page || page === 'query') ? userId : page + '::' + userId;
  }

  async function listTodos(userId, page) {
    const effectiveId = _effectiveUserId(userId, page);
    const { data, error } = await supabase
      .from('dev_todos')
      .select('*')
      .eq('user_id', effectiveId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function createTodo(userId, title, parentId, page) {
    const effectiveId = _effectiveUserId(userId, page);
    const { data, error } = await supabase
      .from('dev_todos')
      .insert({ user_id: effectiveId, title, parent_id: parentId || null })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function updateTodo(userId, todoId, { title, done, position, page }) {
    const effectiveId = _effectiveUserId(userId, page);
    const update = { updated_at: new Date().toISOString() };
    if (title !== undefined) update.title = title;
    if (done !== undefined) update.done = done;
    if (position !== undefined) update.position = position;

    const { data, error } = await supabase
      .from('dev_todos')
      .update(update)
      .eq('id', todoId)
      .eq('user_id', effectiveId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function deleteTodo(userId, todoId, page) {
    const effectiveId = _effectiveUserId(userId, page);
    const { error } = await supabase
      .from('dev_todos')
      .delete()
      .eq('id', todoId)
      .eq('user_id', effectiveId);
    if (error) throw error;
    return { ok: true };
  }

  return {
    listSessions, createSession, getSession, updateSession,
    deleteSession, deleteAllSessions,
    analyseSessions, searchSessions, exportToDoc,
    listTodos, createTodo, updateTodo, deleteTodo,
  };
}

module.exports = makeChatService;
