'use strict';

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

module.exports = function(app, { supabase, anthropic, auth }) {
  const { requireAuth } = auth;

  // GET /chat/sessions — list all sessions for the current user
  app.get('/chat/sessions', requireAuth, async (req, res) => {
    await ensureChatTable(supabase);
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('id, title, created_at, updated_at')
        .eq('user_id', req.user.id || req.user.email)
        .order('updated_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      res.json(data || []);
    } catch (err) {
      console.error('Chat sessions list error:', err);
      res.status(500).json({ error: 'Failed to load chat sessions' });
    }
  });

  // POST /chat/sessions — create a new session
  app.post('/chat/sessions', requireAuth, async (req, res) => {
    const { title, messages } = req.body;
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: req.user.id || req.user.email,
          title: title || 'New conversation',
          messages: messages || []
        })
        .select()
        .single();
      if (error) throw error;
      res.json(data);
    } catch (err) {
      console.error('Chat session create error:', err);
      res.status(500).json({ error: 'Failed to create chat session' });
    }
  });

  // POST /chat/analyse — analyse all chat sessions for trends (uses Claude)
  app.post('/chat/analyse', requireAuth, async (req, res) => {
    await ensureChatTable(supabase);
    try {
      const { data: sessions, error } = await supabase
        .from('chat_sessions')
        .select('id, title, messages, created_at, updated_at')
        .eq('user_id', req.user.id || req.user.email)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (!sessions || sessions.length === 0) {
        return res.json({
          totalSessions: 0, totalMessages: 0, dateRange: null,
          html: '<p style="color:var(--dim)">No chat sessions to analyse yet. Start some conversations first.</p>'
        });
      }

      let totalMessages = 0;
      const digest = sessions.map(s => {
        const msgs = (s.messages || []).filter(m => m.role === 'user');
        totalMessages += msgs.length;
        const questions = msgs.map(m => m.content).join(' | ');
        return `Session "${s.title}" (${new Date(s.created_at).toLocaleDateString()}): ${questions}`;
      }).join('\n');

      const oldest = sessions[sessions.length - 1].created_at;
      const newest = sessions[0].created_at;
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

Keep it concise and actionable. Use simple HTML tags only (h3, ul, li, p, strong, em). No CSS classes or styles.`
        }]
      });

      const html = message.content[0].text.replace(/```html|```/g, '').trim();

      res.json({ totalSessions: sessions.length, totalMessages, dateRange, html });
    } catch (err) {
      console.error('Chat analysis error:', err);
      res.status(500).json({ error: 'Analysis failed: ' + err.message });
    }
  });

  // GET /chat/sessions/:id — get a single session with messages
  app.get('/chat/sessions/:id', requireAuth, async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', req.params.id)
        .eq('user_id', req.user.id || req.user.email)
        .single();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Session not found' });
      res.json(data);
    } catch (err) {
      console.error('Chat session get error:', err);
      res.status(500).json({ error: 'Failed to load chat session' });
    }
  });

  // PUT /chat/sessions/:id — update session (title, messages)
  app.put('/chat/sessions/:id', requireAuth, async (req, res) => {
    const { title, messages } = req.body;
    const update = { updated_at: new Date().toISOString() };
    if (title !== undefined) update.title = title;
    if (messages !== undefined) update.messages = messages;
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .update(update)
        .eq('id', req.params.id)
        .eq('user_id', req.user.id || req.user.email)
        .select()
        .single();
      if (error) throw error;
      res.json(data);
    } catch (err) {
      console.error('Chat session update error:', err);
      res.status(500).json({ error: 'Failed to update chat session' });
    }
  });

  // ── BULK DELETE ALL SESSIONS (must be before :id route) ──
  app.delete('/chat/sessions', requireAuth, async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('user_id', req.user.id || req.user.email)
        .select('id');
      if (error) throw error;
      res.json({ ok: true, deleted: (data || []).length });
    } catch (err) {
      console.error('Bulk delete sessions error:', err);
      res.status(500).json({ error: 'Failed to clear sessions' });
    }
  });

  // DELETE /chat/sessions/:id — delete a single session
  app.delete('/chat/sessions/:id', requireAuth, async (req, res) => {
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', req.params.id)
        .eq('user_id', req.user.id || req.user.email);
      if (error) throw error;
      res.json({ ok: true });
    } catch (err) {
      console.error('Chat session delete error:', err);
      res.status(500).json({ error: 'Failed to delete chat session' });
    }
  });

  // ── EXPORT CHAT TO DOC BUILDER ──
  app.post('/chat/export-to-doc', requireAuth, async (req, res) => {
    try {
      const { messages, title } = req.body;
      if (!messages || !messages.length) return res.status(400).json({ error: 'No messages provided' });

      const conversation = messages.map(m => `${m.role === 'user' ? 'USER' : 'ASSISTANT'}: ${m.content}`).join('\n\n');

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

Create 3-8 meaningful steps that capture the essential information from the conversation. Focus on actionable procedures and key findings.`
        }]
      });

      let text = msg.content[0].text.trim();
      // Strip any markdown code fences
      text = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
      const data = JSON.parse(text);
      res.json(data);
    } catch (err) {
      console.error('Export to doc error:', err);
      res.status(500).json({ error: 'Export failed: ' + err.message });
    }
  });

  // ── AI-POWERED CHAT SEARCH ──
  app.post('/chat/search', requireAuth, async (req, res) => {
    try {
      const { query } = req.body;
      if (!query) return res.status(400).json({ error: 'query required' });

      // Fetch all sessions WITH messages from Supabase
      const { data: sessions, error } = await supabase
        .from('chat_sessions')
        .select('id, title, messages, created_at')
        .eq('user_id', req.user.id || req.user.email)
        .order('updated_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      if (!sessions || !sessions.length) {
        return res.json({ matches: [] });
      }

      // Build rich summaries from actual message content
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

Be generous with matching — the user may describe the conversation loosely or use different words than what's in the title/preview. Think about what the conversation was likely about and match if the intent is similar.`
        }]
      });

      let text = msg.content[0].text.trim();
      text = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
      const matchedIds = JSON.parse(text);
      res.json({ matches: matchedIds });
    } catch (err) {
      console.error('Chat search error:', err);
      res.status(500).json({ error: 'Search failed' });
    }
  });

  // ── DEV TO-DO LIST ──

  // GET /todos — list todos for the current user, filtered by page
  app.get('/todos', requireAuth, async (req, res) => {
    const page = req.query.page || 'query';
    const userId = req.user.id || req.user.email;
    const effectiveId = page === 'query' ? userId : page + '::' + userId;
    try {
      const { data, error } = await supabase
        .from('dev_todos')
        .select('*')
        .eq('user_id', effectiveId)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      res.json(data || []);
    } catch (err) {
      console.error('Todos list error:', err);
      res.status(500).json({ error: 'Failed to load todos' });
    }
  });

  // POST /todos — create a new todo
  app.post('/todos', requireAuth, async (req, res) => {
    const { title, parent_id, page } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    const userId = req.user.id || req.user.email;
    const effectiveId = (!page || page === 'query') ? userId : page + '::' + userId;
    try {
      const { data, error } = await supabase
        .from('dev_todos')
        .insert({
          user_id: effectiveId,
          title,
          parent_id: parent_id || null
        })
        .select()
        .single();
      if (error) throw error;
      res.json(data);
    } catch (err) {
      console.error('Todo create error:', err);
      res.status(500).json({ error: 'Failed to create todo' });
    }
  });

  // PATCH /todos/:id — update a todo (title, done, position)
  app.patch('/todos/:id', requireAuth, async (req, res) => {
    const { title, done, position, page } = req.body;
    const userId = req.user.id || req.user.email;
    const effectiveId = (!page || page === 'query') ? userId : page + '::' + userId;
    const update = { updated_at: new Date().toISOString() };
    if (title !== undefined) update.title = title;
    if (done !== undefined) update.done = done;
    if (position !== undefined) update.position = position;
    try {
      const { data, error } = await supabase
        .from('dev_todos')
        .update(update)
        .eq('id', req.params.id)
        .eq('user_id', effectiveId)
        .select()
        .single();
      if (error) throw error;
      res.json(data);
    } catch (err) {
      console.error('Todo update error:', err);
      res.status(500).json({ error: 'Failed to update todo' });
    }
  });

  // DELETE /todos/:id — delete a todo (cascade removes children)
  app.delete('/todos/:id', requireAuth, async (req, res) => {
    const page = req.query.page || 'query';
    const userId = req.user.id || req.user.email;
    const effectiveId = page === 'query' ? userId : page + '::' + userId;
    try {
      const { error } = await supabase
        .from('dev_todos')
        .delete()
        .eq('id', req.params.id)
        .eq('user_id', effectiveId);
      if (error) throw error;
      res.json({ ok: true });
    } catch (err) {
      console.error('Todo delete error:', err);
      res.status(500).json({ error: 'Failed to delete todo' });
    }
  });
};
