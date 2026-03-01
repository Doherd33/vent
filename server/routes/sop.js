'use strict';
const path = require('path');
const fs   = require('fs');

module.exports = function(app, { supabase, anthropic, auditLog, rag, auth, getVoyageClient }) {
  const { requireAuth, requireRole } = auth;
  const { getRelevantChunks, buildSopContext } = rag;

// POST /sop/discover — AI-powered natural language SOP finder
app.post('/sop/discover', requireAuth, async (req, res) => {
  const { description } = req.body;
  if (!description || description.length < 5) {
    return res.status(400).json({ error: 'Description too short' });
  }

  try {
    // Use Voyage to find semantically relevant chunks
    const chunks = await getRelevantChunks(description, 'General');
    if (!chunks.length) {
      return res.json({ message: 'No matching SOPs found for that description.', results: [] });
    }

    // Deduplicate by doc_id, keeping highest similarity
    const docMap = {};
    chunks.forEach(c => {
      if (!docMap[c.doc_id] || c.similarity > docMap[c.doc_id].similarity) {
        docMap[c.doc_id] = c;
      }
    });
    const uniqueDocs = Object.values(docMap);

    // Ask Claude to summarise which SOPs are relevant and why
    const sopList = uniqueDocs.map(c =>
      `- ${c.doc_id} (${c.doc_title}): Section "${c.section_title}" — ${c.content.substring(0, 200)}`
    ).join('\n');

    const aiRes = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [{ role: 'user', content: `A user in a biologics manufacturing facility described what they are working on:

"${description}"

Here are the SOP documents that matched their description:
${sopList}

Respond with a short, helpful message (2-4 sentences max) explaining which SOPs are relevant and why. Be conversational and friendly. Reference each SOP by its doc_id. Do NOT use markdown or formatting — plain text only.` }]
    });

    const message = aiRes.content[0]?.text || 'Found some relevant SOPs for you.';

    res.json({
      message,
      results: uniqueDocs.map(c => ({
        doc_id: c.doc_id,
        doc_title: c.doc_title || '',
        section_title: c.section_title,
        similarity: c.similarity
      }))
    });
  } catch (err) {
    console.error('SOP discover error:', err);
    res.status(500).json({ error: 'Failed to find SOPs' });
  }
});

// GET /sop/search?q=... — search SOPs by title/content (MUST be before /sop/:docId)
// Fetches first chunk per doc_id, then filters server-side.
app.get('/sop/search', requireAuth, async (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  try {
    const knownDocs = ['WX-SOP-1001-03','WX-SOP-1002-03','WX-SOP-1003-03','WX-SOP-1004-03','WX-SOP-1005-03','WX-BPR-2001-03'];
    const allChunks = [];
    for (const docId of knownDocs) {
      const { data } = await supabase
        .from('sop_chunks')
        .select('section_title, content')
        .eq('doc_id', docId)
        .order('created_at', { ascending: true })
        .limit(1);
      if (data && data.length) allChunks.push({ doc_id: docId, ...data[0] });
    }
    const filtered = q.length >= 2
      ? allChunks.filter(r => (r.content || '').toLowerCase().includes(q) || (r.section_title || '').toLowerCase().includes(q) || (r.doc_id || '').toLowerCase().includes(q))
      : allChunks;
    res.json(filtered);
  } catch (err) {
    console.error('SOP search error:', err);
    res.status(500).json({ error: 'Failed to search SOPs' });
  }
});

// GET /sop/:docId — fetch all chunks for a document
app.get('/sop/:docId', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('sop_chunks')
    .select('section_title, content')
    .eq('doc_id', req.params.docId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('SOP fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch SOP' });
  }
  res.json(data || []);
});

// GET /sop/:docId/chunk?section=8.6.1 — fetch the best-matching chunk for a section reference
app.get('/sop/:docId/chunk', requireAuth, async (req, res) => {
  const section = (req.query.section || '').trim();

  const { data, error } = await supabase
    .from('sop_chunks')
    .select('section_title, content')
    .eq('doc_id', req.params.docId)
    .order('created_at', { ascending: true });

  if (error || !data) {
    return res.status(500).json({ error: 'Failed to fetch SOP' });
  }

  if (!section) {
    return res.json(data[0] || null);
  }

  const prefix = section.split('.').slice(0, 3).join('.');
  const broader = section.split('.').slice(0, 2).join('.');

  let match = data.find(c => c.section_title && c.section_title.startsWith(prefix))
           || data.find(c => c.section_title && c.section_title.startsWith(broader))
           || data.find(c => c.section_title && c.section_title.includes(broader))
           || data[0];

  res.json(match);
});

// GET /sop/:docId/rationale — fetch rationale explanations for a BPR/SOP
app.get('/sop/:docId/rationale', requireAuth, (req, res) => {
  const docId = req.params.docId;
  const filePath = path.join(__dirname, 'docs', 'rationale', docId + '.json');
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(data);
  } catch (err) {
    if (err.code === 'ENOENT') return res.json([]);
    console.error('Rationale fetch error:', err);
    res.status(500).json({ error: 'Failed to load rationale' });
  }
});

// POST /sop/:docId/ask — ask a question scoped to a single SOP document
app.post('/sop/:docId/ask', requireAuth, async (req, res) => {
  const { question } = req.body;
  const docId = req.params.docId;

  if (!question || question.length < 3) {
    return res.status(400).json({ error: 'Question too short' });
  }

  try {
    // Fetch all chunks for this specific document
    const { data: chunks, error } = await supabase
      .from('sop_chunks')
      .select('section_title, content')
      .eq('doc_id', docId)
      .order('created_at', { ascending: true });

    if (error || !chunks || !chunks.length) {
      return res.status(404).json({ error: 'No content found for this document' });
    }

    const sopContext = chunks
      .map(c => `Section: ${c.section_title}\n${c.content}`)
      .join('\n\n---\n\n');

    console.log(`[SOP-ASK] "${question.slice(0, 60)}" in ${docId} — ${chunks.length} sections`);

    const aiRes = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{ role: 'user', content: `You are a concise SOP assistant. Answer the operator's question using ONLY the content from document ${docId} below.

RULES:
- Be concise — 2-4 sentences max unless a detailed procedure is needed.
- Reference the specific section(s) where the answer comes from.
- If the answer isn't in this document, say so clearly.
- Plain text only, no markdown formatting.

════ ${docId} CONTENT ════
${sopContext}
═════════════════════════

Question: "${question}"` }]
    });

    const answer = aiRes.content[0]?.text || 'No answer could be generated.';
    res.json({ answer });
  } catch (err) {
    console.error('SOP ask error:', err);
    res.status(500).json({ error: 'Failed to answer question' });
  }
});

// GET /submissions — fetch all for the dashboard
app.get('/submissions', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch submissions' });
  }
  res.json(data || []);
});

// GET /submissions/:refCode — fetch a single submission
app.get('/submissions/:refCode', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('ref_code', req.params.refCode)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Submission not found' });
  }
  res.json(data);
});

// PATCH /submissions/:refCode/status — update workflow status with audit trail
app.patch('/submissions/:refCode/status', requireRole('qa', 'director', 'admin'), async (req, res) => {
  const { status, userId, userRole, reason, meaning } = req.body;
  const validStatuses = ['new', 'acknowledged', 'under_review', 'corrective_action', 'qa_approved', 'director_signoff', 'closed', 'rejected'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') });
  }

  // E-signature required for approval / signoff / close transitions
  const requiresSignature = ['qa_approved', 'director_signoff', 'closed', 'rejected'].includes(status);
  if (requiresSignature && (!userId || !reason)) {
    return res.status(400).json({ error: 'Electronic signature required: userId and reason must be provided for this transition' });
  }

  // Fetch current state for before_val
  const { data: current, error: fetchErr } = await supabase
    .from('submissions')
    .select('status, ref_code, priority')
    .eq('ref_code', req.params.refCode)
    .single();

  if (fetchErr || !current) {
    return res.status(404).json({ error: 'Submission not found' });
  }

  const previousStatus = current.status;

  // Update status
  const { error } = await supabase
    .from('submissions')
    .update({ status })
    .eq('ref_code', req.params.refCode);

  if (error) {
    console.error('Status update error:', error);
    return res.status(500).json({ error: 'Failed to update status' });
  }

  // Write audit entry
  await auditLog({
    userId: userId || 'unknown',
    userRole: userRole || 'unknown',
    action: 'status_changed',
    entityType: 'submission',
    entityId: req.params.refCode,
    before: { status: previousStatus },
    after: { status, ...(meaning ? { signatureMeaning: meaning } : {}) },
    reason: reason || `Status changed from ${previousStatus} to ${status}`,
    req
  });

  res.json({ ok: true, previousStatus, newStatus: status,
    auditEntry: { userId, action: 'status_changed', from: previousStatus, to: status, meaning, reason }
  });
});

// POST /query — operator SOP knowledge search (with conversation history)
app.post('/query', requireAuth, async (req, res) => {
  const { question, area, history } = req.body;

  if (!question || question.length < 5) {
    return res.status(400).json({ error: 'Question too short' });
  }

  try {
    const chunks = await getRelevantChunks(question, area || 'Upstream');
    const sopContext = buildSopContext(chunks);

    console.log(`[QUERY] "${question.slice(0, 60)}" — ${chunks.length} chunks retrieved, history: ${(history || []).length} turns`);

    // Build conversation context from history (last 6 turns max)
    let conversationContext = '';
    if (history && history.length) {
      const recent = history.slice(-6);
      conversationContext = '\n\n════ CONVERSATION HISTORY ════\n' +
        recent.map(h => h.role === 'user'
          ? `Operator asked: "${h.content}"`
          : `You answered: "${h.summary || '(no summary)'}"`)
        .join('\n') +
        '\n══════════════════════════════\n\nThe operator is now asking a FOLLOW-UP question. Use the conversation context above to understand what they are referring to.';
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `You are a concise SOP assistant for a biologics manufacturing facility. Answer the operator's question using ONLY the SOP content below.

CRITICAL RULES:
- Be VERY concise. Summary: 1–2 sentences max. Steps: 5 or fewer.
- Do NOT dump large blocks of text. Distil the key information.
- If the operator asks for images, pictures, or diagrams: the system will show relevant manual pages alongside your answer. Give a SHORT description (1–2 sentences) and mention a diagram is shown below.
- Only include steps if the question is procedural. Only include params if asking about values.
- Only include warnings if they are genuine safety risks.
- Omit empty arrays — do not include steps, params, warnings, or notes if they would be empty.
- ALWAYS set diagramHint to specific equipment/component keywords for the best matching diagram page. Be specific: "hardware front view", "reagent disk assembly", "cuvette rotor", "sample rack positions", "touchscreen main menu". If the question is about a specific part, name that part.

════ SOP CONTENT ════
${sopContext}
═════════════════════
${conversationContext}

Area: ${area || 'Upstream'}
Question: "${question}"

Return ONLY valid JSON — no markdown, no fences, no preamble.

{
  "category": "procedure|specification|troubleshooting|general",
  "summary": "1–2 sentence answer. Be direct and concise.",
  "diagramHint": "specific equipment/component keyword for diagram lookup e.g. 'hardware front view' or 'reagent disk' or 'cuvette rotor' — be specific to what the operator is asking about",
  "steps": [{ "n": 1, "action": "short instruction", "detail": "extra detail or null", "critical": false, "value": "target value or null" }],
  "params": [{ "name": "param", "value": "val", "unit": "unit", "range": "range or null", "flag": "critical or normal" }],
  "warnings": ["only real safety warnings"],
  "notes": ["brief note"],
  "sources": [{ "code": "doc_id", "title": "doc title", "section": "section ref" }],
  "followUps": ["2-3 natural follow-up questions the operator might ask next based on this answer — short, specific, actionable"]
}`
      }]
    });

    const raw = message.content[0].text;
    const clean = raw.replace(/```json|```/g, '').trim();
    const answer = JSON.parse(clean);

    res.json(answer);

  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: 'Query failed' });
  }
});

// ─── SOP INGEST ROUTE ──────────────────────────────────────────────────────
app.post('/ingest', requireRole('admin'), async (req, res) => {
  const DOCS_DIR = path.join(__dirname, 'docs/sops');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  try {
    // Clear existing chunks
    const { error: delErr } = await supabase.from('sop_chunks').delete().gte('created_at','2000-01-01');
    if (delErr) return res.status(500).json({ error: 'Clear failed: ' + delErr.message });

    const files = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.md'));
    const { client: voyage } = getVoyageClient();
    let total = 0;
    const details = [];

    for (const file of files) {
      const docId = file.replace('.md', '');
      const content = fs.readFileSync(path.join(DOCS_DIR, file), 'utf8');

      // Parse into chunks by heading
      const titleMatch = content.match(/\*\*Title\*\*\s*\|\s*(.+)/);
      const docTitle = titleMatch ? titleMatch[1].trim() : docId;
      const chunks = [];
      const lines = content.split('\n');
      let curTitle = 'Overview', curLines = [];
      for (const line of lines) {
        if (line.match(/^#{2,4}\s+/)) {
          const text = curLines.join('\n').trim();
          if (text.length > 80) chunks.push({ doc_id: docId, doc_title: docTitle, section_title: curTitle, content: `[${docId}] ${docTitle}\nSection: ${curTitle}\n\n${text}` });
          curTitle = line.replace(/^#+\s+/, '').trim();
          curLines = [];
        } else { curLines.push(line); }
      }
      const lastText = curLines.join('\n').trim();
      if (lastText.length > 80) chunks.push({ doc_id: docId, doc_title: docTitle, section_title: curTitle, content: `[${docId}] ${docTitle}\nSection: ${curTitle}\n\n${lastText}` });

      // Embed and store each chunk
      for (const chunk of chunks) {
        const r = await voyage.embed({ input: [chunk.content], model: 'voyage-3-lite' });
        const { error } = await supabase.from('sop_chunks').insert({ ...chunk, embedding: r.data[0].embedding });
        if (error) console.error(`Chunk error (${docId}):`, error.message);
        await sleep(120);
      }
      total += chunks.length;
      details.push({ docId, chunks: chunks.length });
    }

    res.json({ success: true, totalChunks: total, documents: details });
  } catch (err) {
    console.error('Ingest error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── NOTES ──────────────────────────────────────────────────────────────────
// Simple session notes persisted to Supabase (qa_notes table)
app.get('/notes', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('qa_notes')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1);
  if (error) {
    // Table may not exist yet — return empty
    if (error.message.includes('does not exist')) return res.json([]);
    return res.status(500).json({ error: error.message });
  }
  res.json(data || []);
});

app.post('/notes', requireAuth, async (req, res) => {
  const { content, userId } = req.body;
  // Upsert: update the single notes row or create it
  const { data: existing } = await supabase
    .from('qa_notes')
    .select('id')
    .limit(1);

  if (existing && existing.length) {
    const { error } = await supabase
      .from('qa_notes')
      .update({ content, user_id: userId || 'unknown', updated_at: new Date().toISOString() })
      .eq('id', existing[0].id);
    if (error) return res.status(500).json({ error: error.message });
  } else {
    const { error } = await supabase
      .from('qa_notes')
      .insert({ content, user_id: userId || 'unknown' });
    if (error) {
      if (error.message.includes('does not exist')) {
        return res.status(400).json({ error: 'qa_notes table does not exist. Run the setup SQL.' });
      }
      return res.status(500).json({ error: error.message });
    }
  }
  res.json({ ok: true });
});

// ─── SOP CHANGE MANAGEMENT ──────────────────────────────────────────────────
// Persist drafts, acceptances, rejections, and annotations for SOP changes

// GET /sop-changes/:submissionRef — get all changes for a submission
app.get('/sop-changes/:submissionRef', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('sop_changes')
    .select('*')
    .eq('submission_ref', req.params.submissionRef)
    .order('created_at', { ascending: true });
  if (error) {
    if (error.message.includes('does not exist')) return res.json([]);
    return res.status(500).json({ error: error.message });
  }
  res.json(data || []);
});

// POST /sop-changes — create or update an SOP change record
app.post('/sop-changes', requireRole('qa', 'director', 'admin'), async (req, res) => {
  const { submissionRef, sopCode, section, action, draft, reason, userId, userRole } = req.body;
  if (!submissionRef || !sopCode || !action) {
    return res.status(400).json({ error: 'submissionRef, sopCode, and action are required' });
  }

  const key = `${submissionRef}:${sopCode}:${section || ''}`;

  // Check for existing record with this key
  const { data: existing } = await supabase
    .from('sop_changes')
    .select('id')
    .eq('change_key', key)
    .limit(1);

  const record = {
    change_key: key,
    submission_ref: submissionRef,
    sop_code: sopCode,
    section: section || '',
    action, // 'draft', 'accepted', 'rejected'
    draft_text: draft || null,
    reason: reason || null,
    user_id: userId || 'unknown',
    user_role: userRole || 'unknown'
  };

  let error;
  if (existing && existing.length) {
    ({ error } = await supabase
      .from('sop_changes')
      .update({ ...record, updated_at: new Date().toISOString() })
      .eq('id', existing[0].id));
  } else {
    ({ error } = await supabase.from('sop_changes').insert(record));
  }

  if (error) {
    if (error.message.includes('does not exist')) {
      return res.status(400).json({ error: 'sop_changes table does not exist. Run the setup SQL.' });
    }
    return res.status(500).json({ error: error.message });
  }

  // Audit log the change
  await auditLog({
    userId: userId || 'unknown',
    userRole: userRole || 'unknown',
    action: 'sop_change_' + action,
    entityType: 'sop_change',
    entityId: key,
    after: { sopCode, section, action, draft: draft ? draft.slice(0, 200) : null },
    reason: reason || `SOP change ${action} for ${sopCode}`,
    req
  });

  res.json({ ok: true, action });
});

// POST /sop-annotations — add an annotation to an SOP change
app.post('/sop-annotations', requireAuth, async (req, res) => {
  const { submissionRef, sopCode, section, text, userId, userRole } = req.body;
  if (!submissionRef || !sopCode || !text) {
    return res.status(400).json({ error: 'submissionRef, sopCode, and text are required' });
  }

  const changeKey = `${submissionRef}:${sopCode}:${section || ''}`;

  const { error } = await supabase.from('sop_annotations').insert({
    change_key: changeKey,
    submission_ref: submissionRef,
    sop_code: sopCode,
    section: section || '',
    text,
    user_id: userId || 'unknown',
    user_role: userRole || 'unknown'
  });

  if (error) {
    if (error.message.includes('does not exist')) {
      return res.status(400).json({ error: 'sop_annotations table does not exist. Run the setup SQL.' });
    }
    return res.status(500).json({ error: error.message });
  }

  await auditLog({
    userId: userId || 'unknown',
    userRole: userRole || 'unknown',
    action: 'sop_annotation_added',
    entityType: 'sop_annotation',
    entityId: changeKey,
    after: { sopCode, section, text: text.slice(0, 200) },
    reason: 'Annotation added to SOP change',
    req
  });

  res.json({ ok: true });
});

// GET /sop-annotations/:submissionRef — get all annotations
app.get('/sop-annotations/:submissionRef', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('sop_annotations')
    .select('*')
    .eq('submission_ref', req.params.submissionRef)
    .order('created_at', { ascending: true });
  if (error) {
    if (error.message.includes('does not exist')) return res.json([]);
    return res.status(500).json({ error: error.message });
  }
  res.json(data || []);
});

};
