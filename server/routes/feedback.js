'use strict';

// Auto-check table existence (follows ensureChatTable pattern)
let _feedbackTableReady = false;
async function ensureFeedbackTable(supabase) {
  if (_feedbackTableReady) return;
  try {
    const { error } = await supabase.from('operator_feedback').select('id').limit(1);
    if (error && error.message.includes('does not exist')) {
      console.log('[FEEDBACK] operator_feedback table not found. Run the SQL from GET /admin/setup in Supabase.');
    }
    _feedbackTableReady = true;
  } catch { _feedbackTableReady = true; }
}

module.exports = function(app, { supabase, anthropic, auditLog, auth }) {
  const { requireAuth, requireRole } = auth;

  // Internal: analyse a completed feedback session
  async function triggerFeedbackAnalysis(sessionId) {
    const { data: session, error } = await supabase
      .from('operator_feedback')
      .select('*')
      .eq('id', sessionId)
      .single();
    if (error) throw error;
    if (!session.transcript || session.transcript.length === 0) return;

    const transcriptText = session.transcript
      .map(t => `${t.role === 'user' ? 'Operator' : 'Charlie'}: ${t.content}`)
      .join('\n');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are analysing a raw voice feedback transcript from an operator at a pharmaceutical manufacturing facility. The operator was providing feedback about "Vent", a manufacturing intelligence platform.

Analyse the transcript and produce structured JSON. Be thorough and specific.

Respond with valid JSON only:
{
  "categories": ["UX"|"missing_feature"|"bug"|"workflow"|"sop_gap"|"training"|"performance"|"praise"],
  "sentiment": "positive"|"neutral"|"negative"|"mixed",
  "severity": "low"|"medium"|"high"|"critical",
  "summary": "2-3 sentence summary of the key feedback",
  "key_quotes": ["direct quote 1", "direct quote 2"],
  "themes": [{"name": "...", "description": "...", "frequency": "..."}],
  "actionable_items": [{"title": "...", "description": "...", "category": "...", "priority": "low|medium|high|critical"}]
}

Focus on extracting actionable, specific feedback. Distinguish between cosmetic preferences and genuine workflow blockers. Quote the operator directly when their words capture the issue well.

TRANSCRIPT:
${transcriptText}`,
      }],
    });

    let raw = response.content[0].text.trim();
    raw = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
    let analysis;
    try { analysis = JSON.parse(raw); } catch { analysis = { summary: raw, categories: [], sentiment: 'neutral', severity: 'low', key_quotes: [], themes: [], actionable_items: [] }; }

    await supabase
      .from('operator_feedback')
      .update({
        status: 'analysed',
        analysis,
        categories: analysis.categories || [],
        sentiment: analysis.sentiment || 'neutral',
        severity: analysis.severity || 'low',
        summary: analysis.summary || '',
        key_quotes: analysis.key_quotes || [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    console.log(`[FEEDBACK] Session ${sessionId} analysed: ${analysis.sentiment}, severity=${analysis.severity}`);
  }

  // POST /charlie/feedback — Layer 1: Feedback conversation with Charlie
  app.post('/charlie/feedback', requireAuth, async (req, res) => {
    await ensureFeedbackTable(supabase);
    const { question, sessionId, lang, history } = req.body;
    if (!question) return res.status(400).json({ error: 'question is required' });

    const langNames = { en: 'English', zh: 'Chinese (Mandarin)', es: 'Spanish' };
    const targetLang = langNames[lang] || 'English';

    try {
      let session = null;
      let transcript = [];

      // Load or create session
      if (sessionId) {
        const { data, error } = await supabase
          .from('operator_feedback')
          .select('*')
          .eq('id', sessionId)
          .single();
        if (error) throw error;
        session = data;
        transcript = session.transcript || [];
      } else {
        // Create new feedback session
        const { data, error } = await supabase
          .from('operator_feedback')
          .insert({
            user_id: req.user.id || req.user.email,
            user_name: req.user.name || 'Unknown',
            user_role: req.user.role || 'operator',
            status: 'active',
            lang: lang || 'en',
            transcript: [],
          })
          .select()
          .single();
        if (error) throw error;
        session = data;

        await auditLog({
          userId: req.user.id || req.user.email,
          userRole: req.user.role,
          action: 'feedback_session_started',
          entityType: 'operator_feedback',
          entityId: session.id,
          after: { lang },
          req,
        });
      }

      // Build conversation history for Claude
      const messages = [];
      transcript.forEach(t => {
        messages.push({ role: t.role, content: t.content });
      });
      messages.push({ role: 'user', content: question });

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: `You are Charlie, the voice assistant for Vent — a manufacturing intelligence platform used in pharmaceutical facilities. You are currently in FEEDBACK MODE.

Your job is to have a natural, empathetic conversation to understand the operator's experience using Vent. You are a friendly, curious listener who wants to genuinely understand what is working, what is frustrating, and what is missing.

Conversation strategy:
1. On first message, start warm: "Hey! I'd love to hear how things are going with Vent. What's been on your mind?"
2. Ask probing follow-up questions. Don't settle for surface answers. Examples:
   - "Can you walk me through what happened?"
   - "How often does that come up?"
   - "What would you ideally want to happen instead?"
   - "Is that something other people on your shift have noticed too?"
3. Cover these areas naturally (don't interrogate — let the conversation flow):
   - What works well / what they like
   - What frustrates them or slows them down
   - What features or capabilities are missing
   - Any bugs or errors they've encountered
   - SOPs or workflows that could be improved
4. After 4-6 meaningful exchanges, gently wrap up: "Thanks for sharing all that — this is really helpful. Anything else on your mind before we finish up?"
5. When the operator says they're done or you've covered enough ground, end the session.

Respond with valid JSON only: { "answer": "...", "action": "continue"|"end_session" }
Keep answers conversational (1-3 sentences). Respond in ${targetLang}. Be warm, encouraging, and make the operator feel heard.`,
        messages,
      });

      let raw = response.content[0].text.trim();
      // Strip markdown code fences Claude sometimes wraps around JSON
      raw = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
      let parsed;
      try { parsed = JSON.parse(raw); } catch { parsed = { answer: raw, action: 'continue' }; }

      const answer = parsed.answer || raw;
      const action = parsed.action || 'continue';

      // Append this exchange to transcript
      const now = new Date().toISOString();
      transcript.push({ role: 'user', content: question, ts: now });
      transcript.push({ role: 'assistant', content: answer, ts: now });

      const updateFields = {
        transcript,
        message_count: Math.floor(transcript.length / 2),
        updated_at: now,
      };

      // If session should end, finalise
      if (action === 'end_session') {
        const rawText = transcript.map(t => `${t.role}: ${t.content}`).join('\n');
        const duration = Math.floor((new Date(now) - new Date(session.created_at)) / 1000);
        Object.assign(updateFields, {
          status: 'completed',
          raw_text: rawText,
          session_duration: duration,
        });
      }

      await supabase
        .from('operator_feedback')
        .update(updateFields)
        .eq('id', session.id);

      // Auto-trigger analysis when session ends (fire-and-forget)
      if (action === 'end_session') {
        triggerFeedbackAnalysis(session.id).catch(err =>
          console.error('[FEEDBACK] Auto-analysis failed:', err.message)
        );
      }

      res.json({
        answer,
        sessionId: session.id,
        action,
        turnCount: Math.floor(transcript.length / 2),
      });
    } catch (err) {
      console.error('[CHARLIE/FEEDBACK] Error:', err.message);
      res.status(500).json({ error: 'Feedback conversation failed' });
    }
  });

  // POST /charlie/feedback/end — manually end a feedback session
  app.post('/charlie/feedback/end', requireAuth, async (req, res) => {
    await ensureFeedbackTable(supabase);
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

    try {
      const { data: session, error } = await supabase
        .from('operator_feedback')
        .select('*')
        .eq('id', sessionId)
        .single();
      if (error) throw error;
      if (session.status !== 'active') return res.json({ ok: true, sessionId });

      const now = new Date().toISOString();
      const rawText = (session.transcript || []).map(t => `${t.role}: ${t.content}`).join('\n');
      const duration = Math.floor((new Date(now) - new Date(session.created_at)) / 1000);

      await supabase
        .from('operator_feedback')
        .update({ status: 'completed', raw_text: rawText, session_duration: duration, updated_at: now })
        .eq('id', sessionId);

      await auditLog({
        userId: req.user.id || req.user.email,
        userRole: req.user.role,
        action: 'feedback_session_ended',
        entityType: 'operator_feedback',
        entityId: sessionId,
        after: { message_count: session.message_count, duration },
        req,
      });

      // Trigger analysis
      triggerFeedbackAnalysis(sessionId).catch(err =>
        console.error('[FEEDBACK] Auto-analysis failed:', err.message)
      );

      res.json({ ok: true, sessionId });
    } catch (err) {
      console.error('[FEEDBACK/END] Error:', err.message);
      res.status(500).json({ error: 'Failed to end session' });
    }
  });

  // POST /feedback/analyse — manually trigger analysis for a session
  app.post('/feedback/analyse', requireAuth, async (req, res) => {
    await ensureFeedbackTable(supabase);
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

    try {
      await triggerFeedbackAnalysis(sessionId);
      const { data } = await supabase
        .from('operator_feedback')
        .select('analysis, categories, sentiment, severity, summary, key_quotes')
        .eq('id', sessionId)
        .single();
      res.json({ sessionId, ...data });
    } catch (err) {
      console.error('[FEEDBACK/ANALYSE] Error:', err.message);
      res.status(500).json({ error: 'Analysis failed' });
    }
  });

  // POST /feedback/generate-prompt — Layer 3: Generate a Claude Code implementation prompt
  app.post('/feedback/generate-prompt', requireAuth, async (req, res) => {
    await ensureFeedbackTable(supabase);
    const { sessionIds } = req.body;
    if (!sessionIds || !sessionIds.length) return res.status(400).json({ error: 'sessionIds array is required' });

    try {
      const { data: sessions, error } = await supabase
        .from('operator_feedback')
        .select('id, user_name, user_role, analysis, summary, categories, severity, key_quotes, created_at')
        .in('id', sessionIds);
      if (error) throw error;
      if (!sessions.length) return res.status(404).json({ error: 'No sessions found' });

      const feedbackDigest = sessions.map(s => {
        const items = (s.analysis?.actionable_items || []).map(i => `  - [${i.priority}] ${i.title}: ${i.description}`).join('\n');
        return `Session by ${s.user_name} (${s.user_role}, ${new Date(s.created_at).toLocaleDateString()}):
  Summary: ${s.summary}
  Categories: ${(s.categories || []).join(', ')}
  Severity: ${s.severity}
  Key quotes: ${(s.key_quotes || []).map(q => `"${q}"`).join('; ')}
  Actionable items:
${items}`;
      }).join('\n\n');

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: `You are a product analyst translating operator feedback into a clear requirements brief. This brief will be given to a developer using Claude Code who already has full access to the codebase — they do NOT need code snippets, diffs, or implementation details. They need to understand WHAT the user wants and WHY.

Your job is to:
1. Distil the raw feedback into clear, specific requirements
2. Capture the user's intent, not just their words
3. Prioritise by impact
4. Be specific about desired behaviour and user experience

OPERATOR FEEDBACK:
${feedbackDigest}

Generate a requirements brief in this exact format:

## What the user wants
A 2-3 sentence plain-English summary of what the operator is asking for. Focus on the desired outcome, not implementation.

## Key requirements
A numbered list of specific, testable requirements. Each should describe a behaviour or outcome, not a code change. Be precise — "the panel should show X when the user does Y" not "update the panel".

## User experience details
Specific UX details the operator mentioned or implied:
- How things should look and feel
- What the workflow/flow should be (step by step)
- What's currently frustrating them and what "good" looks like
- Any specific examples, references, or comparisons they made

## Priority
Rank the requirements by impact (what matters most to the user).

## Acceptance criteria
How would you verify each requirement is met? Write these as "When I do X, I should see Y" statements.

RULES:
- Write in plain English, no code
- Be specific and detailed — vague requirements lead to wrong implementations
- Include direct quotes from the operator where they capture the intent well
- If the operator referenced any specific pages, features, or workflows, name them exactly
- Do NOT include implementation suggestions, code snippets, file paths, or technical architecture — the developer already knows the codebase`,
        }],
      });

      const prompt = response.content[0].text;
      const feedbackSummary = sessions.map(s => s.summary).join(' | ');

      // Store prompt on the first session (or all if batched)
      const now = new Date().toISOString();
      for (const s of sessions) {
        await supabase
          .from('operator_feedback')
          .update({ generated_prompt: prompt, prompt_generated_at: now })
          .eq('id', s.id);
      }

      await auditLog({
        userId: req.user.id || req.user.email,
        userRole: req.user.role,
        action: 'feedback_prompt_generated',
        entityType: 'operator_feedback',
        entityId: sessionIds.join(','),
        after: { sessionCount: sessions.length },
        req,
      });

      res.json({ prompt, sessionCount: sessions.length, feedbackSummary });
    } catch (err) {
      console.error('[FEEDBACK/PROMPT] Error:', err.message);
      res.status(500).json({ error: 'Prompt generation failed' });
    }
  });

  // GET /feedback/sessions — list feedback sessions
  app.get('/feedback/sessions', requireAuth, async (req, res) => {
    await ensureFeedbackTable(supabase);
    const { status, limit = 50 } = req.query;
    try {
      let query = supabase
        .from('operator_feedback')
        .select('id, user_name, user_role, status, categories, sentiment, severity, summary, message_count, session_duration, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

      // Operators see only their own sessions
      const role = req.user.role;
      if (role === 'operator') {
        query = query.eq('user_id', req.user.id || req.user.email);
      }
      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      res.json(data || []);
    } catch (err) {
      console.error('[FEEDBACK/LIST] Error:', err.message);
      res.status(500).json({ error: 'Failed to load feedback sessions' });
    }
  });

  // GET /feedback/sessions/:id — get a single feedback session
  app.get('/feedback/sessions/:id', requireAuth, async (req, res) => {
    await ensureFeedbackTable(supabase);
    try {
      let query = supabase
        .from('operator_feedback')
        .select('*')
        .eq('id', req.params.id)
        .single();

      // Operators can only view their own
      if (req.user.role === 'operator') {
        query = query.eq('user_id', req.user.id || req.user.email);
      }

      const { data, error } = await query;
      if (error) throw error;
      res.json(data);
    } catch (err) {
      console.error('[FEEDBACK/GET] Error:', err.message);
      res.status(500).json({ error: 'Failed to load feedback session' });
    }
  });

  // POST /feedback/batch-analyse — aggregate trend report across sessions
  app.post('/feedback/batch-analyse', requireAuth, requireRole('qa', 'director', 'admin'), async (req, res) => {
    await ensureFeedbackTable(supabase);
    const { sessionIds, dateRange } = req.body;
    try {
      let query = supabase
        .from('operator_feedback')
        .select('id, user_name, user_role, analysis, summary, categories, sentiment, severity, key_quotes, created_at')
        .in('status', ['completed', 'analysed'])
        .order('created_at', { ascending: false });

      if (sessionIds && sessionIds.length) {
        query = query.in('id', sessionIds);
      }
      if (dateRange?.from) query = query.gte('created_at', dateRange.from);
      if (dateRange?.to) query = query.lte('created_at', dateRange.to);
      query = query.limit(100);

      const { data: sessions, error } = await query;
      if (error) throw error;

      if (!sessions || sessions.length === 0) {
        return res.json({
          totalSessions: 0,
          html: '<p style="color:var(--dim)">No feedback sessions to analyse yet.</p>',
        });
      }

      const digest = sessions.map(s => {
        return `${s.user_name} (${s.user_role}, ${new Date(s.created_at).toLocaleDateString()}): ${s.summary || 'No summary'}. Categories: ${(s.categories || []).join(', ')}. Severity: ${s.severity}.`;
      }).join('\n');

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `You are analysing aggregated operator feedback from a pharmaceutical manufacturing facility using the "Vent" platform.

Below is a digest of ${sessions.length} feedback sessions. Identify trends, recurring themes, and priority areas.

Return valid HTML (no <html>/<body> tags, just content divs) styled for a dark theme (background: #1e1e1e, text: #cccccc). Use these CSS classes: .trend-card { background:#2a2a2a; border:1px solid #3c3c3c; border-radius:8px; padding:16px; margin-bottom:12px; } .trend-title { color:#e0e0e0; font-size:14px; font-weight:600; margin-bottom:8px; } .trend-body { color:#999; font-size:12px; line-height:1.6; } .severity-badge { display:inline-block; padding:2px 8px; border-radius:4px; font-size:10px; font-weight:600; } .sev-critical { background:#5c1a1a; color:#ff6b6b; } .sev-high { background:#5c3a1a; color:#ffa94d; } .sev-medium { background:#4a4a1a; color:#ffd43b; } .sev-low { background:#1a3a1a; color:#69db7c; }

Include: 1) Overall sentiment summary, 2) Top 5 recurring themes with frequency, 3) Priority action items ranked by impact, 4) Category breakdown, 5) Notable operator quotes.

FEEDBACK DIGEST:
${digest}`,
        }],
      });

      const html = message.content[0].text;
      res.json({ totalSessions: sessions.length, html });
    } catch (err) {
      console.error('[FEEDBACK/BATCH] Error:', err.message);
      res.status(500).json({ error: 'Batch analysis failed' });
    }
  });
};
