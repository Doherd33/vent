'use strict';

/**
 * services/sop.service.js
 *
 * Owns SOP-related business logic:
 *   - AI-powered SOP discovery
 *   - Scoped document Q&A
 *   - Operator knowledge queries (with conversation history)
 *   - SOP ingest pipeline
 *   - Submission CRUD + status transitions with audit
 *   - Notes persistence
 *   - SOP change management + annotations
 *
 * Routes should call these functions and handle only HTTP concerns.
 */

const path = require('path');
const fs   = require('fs');

function makeSopService({ supabase, anthropic, auditLog, rag, getVoyageClient }) {
  const { getRelevantChunks, buildSopContext } = rag;

  // ── AI-powered discovery ──────────────────────────────────────────────────

  async function discoverSops(description) {
    const chunks = await getRelevantChunks(description, 'General');
    if (!chunks.length) return { message: 'No matching SOPs found for that description.', results: [] };

    // Deduplicate by doc_id, keep highest similarity
    const docMap = {};
    chunks.forEach(c => {
      if (!docMap[c.doc_id] || c.similarity > docMap[c.doc_id].similarity) {
        docMap[c.doc_id] = c;
      }
    });
    const uniqueDocs = Object.values(docMap);

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

    return {
      message: aiRes.content[0]?.text || 'Found some relevant SOPs for you.',
      results: uniqueDocs.map(c => ({
        doc_id: c.doc_id,
        doc_title: c.doc_title || '',
        section_title: c.section_title,
        similarity: c.similarity,
      })),
    };
  }

  // ── SOP search (keyword / text) ──────────────────────────────────────────

  async function searchSops(query) {
    const q = (query || '').trim().toLowerCase();
    const knownDocs = [
      'WX-SOP-1001-03', 'WX-SOP-1002-03', 'WX-SOP-1003-03',
      'WX-SOP-1004-03', 'WX-SOP-1005-03', 'WX-BPR-2001-03',
    ];

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

    return q.length >= 2
      ? allChunks.filter(r =>
          (r.content || '').toLowerCase().includes(q) ||
          (r.section_title || '').toLowerCase().includes(q) ||
          (r.doc_id || '').toLowerCase().includes(q))
      : allChunks;
  }

  // ── Fetch full document ──────────────────────────────────────────────────

  async function fetchDocument(docId) {
    const { data, error } = await supabase
      .from('sop_chunks')
      .select('section_title, content')
      .eq('doc_id', docId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  // ── Fetch best-matching chunk for a section reference ────────────────────

  async function fetchChunk(docId, section) {
    const { data, error } = await supabase
      .from('sop_chunks')
      .select('section_title, content')
      .eq('doc_id', docId)
      .order('created_at', { ascending: true });
    if (error || !data) throw error || new Error('No data');

    if (!section) return data[0] || null;

    const prefix  = section.split('.').slice(0, 3).join('.');
    const broader = section.split('.').slice(0, 2).join('.');

    return data.find(c => c.section_title && c.section_title.startsWith(prefix))
        || data.find(c => c.section_title && c.section_title.startsWith(broader))
        || data.find(c => c.section_title && c.section_title.includes(broader))
        || data[0];
  }

  // ── Rationale JSON (filesystem) ─────────────────────────────────────────

  function fetchRationale(docId) {
    const filePath = path.join(__dirname, '..', 'docs', 'rationale', docId + '.json');
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw err;
    }
  }

  // ── Ask a question scoped to a single SOP ───────────────────────────────

  async function askDocumentQuestion(docId, question) {
    const chunks = await fetchDocument(docId);
    if (!chunks.length) return null;

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

    return aiRes.content[0]?.text || 'No answer could be generated.';
  }

  // ── Operator knowledge query (with conversation history) ────────────────

  async function queryKnowledge({ question, area, history }) {
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
  "diagramHint": "specific equipment/component keyword for diagram lookup",
  "steps": [{ "n": 1, "action": "short instruction", "detail": "extra detail or null", "critical": false, "value": "target value or null" }],
  "params": [{ "name": "param", "value": "val", "unit": "unit", "range": "range or null", "flag": "critical or normal" }],
  "warnings": ["only real safety warnings"],
  "notes": ["brief note"],
  "sources": [{ "code": "doc_id", "title": "doc title", "section": "section ref" }],
  "followUps": ["2-3 natural follow-up questions the operator might ask next"]
}`,
      }],
    });

    const raw = message.content[0].text;
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  }

  // ── SOP ingest pipeline ─────────────────────────────────────────────────

  async function ingestSops() {
    const DOCS_DIR = path.join(__dirname, '..', 'docs', 'sops');
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    // Clear existing chunks
    const { error: delErr } = await supabase.from('sop_chunks').delete().gte('created_at', '2000-01-01');
    if (delErr) throw new Error('Clear failed: ' + delErr.message);

    const files = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.md'));
    const { client: voyage } = getVoyageClient();
    let total = 0;
    const details = [];

    for (const file of files) {
      const docId   = file.replace('.md', '');
      const content = fs.readFileSync(path.join(DOCS_DIR, file), 'utf8');

      const titleMatch = content.match(/\*\*Title\*\*\s*\|\s*(.+)/);
      const docTitle   = titleMatch ? titleMatch[1].trim() : docId;
      const chunks     = [];
      const lines      = content.split('\n');
      let curTitle = 'Overview', curLines = [];

      for (const line of lines) {
        if (line.match(/^#{2,4}\s+/)) {
          const text = curLines.join('\n').trim();
          if (text.length > 80) {
            chunks.push({ doc_id: docId, doc_title: docTitle, section_title: curTitle,
              content: `[${docId}] ${docTitle}\nSection: ${curTitle}\n\n${text}` });
          }
          curTitle = line.replace(/^#+\s+/, '').trim();
          curLines = [];
        } else {
          curLines.push(line);
        }
      }
      const lastText = curLines.join('\n').trim();
      if (lastText.length > 80) {
        chunks.push({ doc_id: docId, doc_title: docTitle, section_title: curTitle,
          content: `[${docId}] ${docTitle}\nSection: ${curTitle}\n\n${lastText}` });
      }

      for (const chunk of chunks) {
        const r = await voyage.embed({ input: [chunk.content], model: 'voyage-3-lite' });
        const { error } = await supabase.from('sop_chunks').insert({ ...chunk, embedding: r.data[0].embedding });
        if (error) console.error(`Chunk error (${docId}):`, error.message);
        await sleep(120);
      }
      total += chunks.length;
      details.push({ docId, chunks: chunks.length });
    }

    return { success: true, totalChunks: total, documents: details };
  }

  // ── Submission CRUD ─────────────────────────────────────────────────────

  async function listSubmissions() {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function getSubmission(refCode) {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('ref_code', refCode)
      .single();
    if (error || !data) return null;
    return data;
  }

  async function updateSubmissionStatus({ refCode, status, userId, userRole, reason, meaning, req }) {
    const validStatuses = ['new', 'acknowledged', 'under_review', 'corrective_action',
      'qa_approved', 'director_signoff', 'closed', 'rejected'];

    if (!validStatuses.includes(status)) {
      throw Object.assign(new Error('Invalid status. Must be one of: ' + validStatuses.join(', ')), { statusCode: 400 });
    }

    const requiresSignature = ['qa_approved', 'director_signoff', 'closed', 'rejected'].includes(status);
    if (requiresSignature && (!userId || !reason)) {
      throw Object.assign(new Error('Electronic signature required: userId and reason must be provided'), { statusCode: 400 });
    }

    const { data: current, error: fetchErr } = await supabase
      .from('submissions')
      .select('status, ref_code, priority')
      .eq('ref_code', refCode)
      .single();

    if (fetchErr || !current) {
      throw Object.assign(new Error('Submission not found'), { statusCode: 404 });
    }

    const previousStatus = current.status;

    const { error } = await supabase
      .from('submissions')
      .update({ status })
      .eq('ref_code', refCode);
    if (error) throw error;

    await auditLog({
      userId: userId || 'unknown',
      userRole: userRole || 'unknown',
      action: 'status_changed',
      entityType: 'submission',
      entityId: refCode,
      before: { status: previousStatus },
      after: { status, ...(meaning ? { signatureMeaning: meaning } : {}) },
      reason: reason || `Status changed from ${previousStatus} to ${status}`,
      req,
    });

    return { previousStatus, newStatus: status, auditEntry: { userId, action: 'status_changed', from: previousStatus, to: status, meaning, reason } };
  }

  // ── Notes ───────────────────────────────────────────────────────────────

  async function getNotes() {
    const { data, error } = await supabase
      .from('qa_notes')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1);
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  async function saveNotes(content, userId) {
    const { data: existing } = await supabase
      .from('qa_notes')
      .select('id')
      .limit(1);

    if (existing && existing.length) {
      const { error } = await supabase
        .from('qa_notes')
        .update({ content, user_id: userId || 'unknown', updated_at: new Date().toISOString() })
        .eq('id', existing[0].id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('qa_notes')
        .insert({ content, user_id: userId || 'unknown' });
      if (error) throw error;
    }
    return { ok: true };
  }

  // ── SOP change management ──────────────────────────────────────────────

  async function getSopChanges(submissionRef) {
    const { data, error } = await supabase
      .from('sop_changes')
      .select('*')
      .eq('submission_ref', submissionRef)
      .order('created_at', { ascending: true });
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  async function upsertSopChange({ submissionRef, sopCode, section, action, draft, reason, userId, userRole, req }) {
    const key = `${submissionRef}:${sopCode}:${section || ''}`;

    const { data: existing } = await supabase
      .from('sop_changes')
      .select('id')
      .eq('change_key', key)
      .limit(1);

    const record = {
      change_key: key, submission_ref: submissionRef, sop_code: sopCode,
      section: section || '', action, draft_text: draft || null,
      reason: reason || null, user_id: userId || 'unknown', user_role: userRole || 'unknown',
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
    if (error) throw error;

    await auditLog({
      userId: userId || 'unknown', userRole: userRole || 'unknown',
      action: 'sop_change_' + action, entityType: 'sop_change', entityId: key,
      after: { sopCode, section, action, draft: draft ? draft.slice(0, 200) : null },
      reason: reason || `SOP change ${action} for ${sopCode}`, req,
    });

    return { ok: true, action };
  }

  // ── SOP annotations ────────────────────────────────────────────────────

  async function getSopAnnotations(submissionRef) {
    const { data, error } = await supabase
      .from('sop_annotations')
      .select('*')
      .eq('submission_ref', submissionRef)
      .order('created_at', { ascending: true });
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  async function addSopAnnotation({ submissionRef, sopCode, section, text, userId, userRole, req }) {
    const changeKey = `${submissionRef}:${sopCode}:${section || ''}`;

    const { error } = await supabase.from('sop_annotations').insert({
      change_key: changeKey, submission_ref: submissionRef, sop_code: sopCode,
      section: section || '', text, user_id: userId || 'unknown', user_role: userRole || 'unknown',
    });
    if (error) throw error;

    await auditLog({
      userId: userId || 'unknown', userRole: userRole || 'unknown',
      action: 'sop_annotation_added', entityType: 'sop_annotation', entityId: changeKey,
      after: { sopCode, section, text: text.slice(0, 200) },
      reason: 'Annotation added to SOP change', req,
    });

    return { ok: true };
  }

  return {
    discoverSops, searchSops, fetchDocument, fetchChunk,
    fetchRationale, askDocumentQuestion, queryKnowledge, ingestSops,
    listSubmissions, getSubmission, updateSubmissionStatus,
    getNotes, saveNotes,
    getSopChanges, upsertSopChange, getSopAnnotations, addSopAnnotation,
  };
}

module.exports = makeSopService;
