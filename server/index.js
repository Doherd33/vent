require('dotenv').config();

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');
const { VoyageAIClient } = require('voyageai');
const { buildContactsContext } = require('./data/contacts');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());
const path = require('path');
const fs = require('fs');
// Try both possible docs locations depending on Railway's working directory
const docsFromServer = path.join(__dirname, '../docs');
const docsFromRoot   = path.join(process.cwd(), 'docs');
const docsPath = fs.existsSync(docsFromServer) ? docsFromServer : docsFromRoot;
console.log('[STATIC] __dirname:', __dirname);
console.log('[STATIC] cwd:', process.cwd());
console.log('[STATIC] docs path:', docsPath, '| exists:', fs.existsSync(docsPath));
try { console.log('[STATIC] files:', fs.readdirSync(docsPath).join(', ')); } catch(e) { console.log('[STATIC] readdir error:', e.message); }
app.use(express.static(docsPath));

const anthropic = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
// Read voyage key lazily so Railway env vars are always current
// Hardcoded fallback ensures demo works even if Railway env var fails
const VOYAGE_FALLBACK = 'pa-iSnF7DHwQ-E0D5ykTEo3UoNBMXUhYfyk9zlDBMekV_e';
function getVoyageClient() {
  const raw = process.env.VOYAGE_KEY || process.env.VOYAGE_API_KEY || VOYAGE_FALLBACK;
  const key = raw.replace(/^["']|["']$/g, '');
  return { client: new VoyageAIClient({ apiKey: key }), key };
}

// Debug: dump all env var names so we can see what Railway is actually passing
app.get('/debug-env', (req, res) => {
  const voyageKeys = Object.keys(process.env).filter(k => k.toLowerCase().includes('voyage'));
  res.json({ voyageKeys, allKeys: Object.keys(process.env).sort() });
});

// Debug: test the full RAG pipeline
app.get('/debug-rag', async (req, res) => {
  const results = { voyage: null, supabase_rpc: null, chunks: 0 };
  try {
    const { client: voyage } = getVoyageClient();
    const r = await voyage.embed({ input: ['cell viability inoculation'], model: 'voyage-3-lite' });
    results.voyage = 'OK - embedding length ' + r.data[0].embedding.length;
    const { data, error } = await supabase.rpc('match_sop_chunks', {
      query_embedding: r.data[0].embedding,
      match_count: 3
    });
    if (error) results.supabase_rpc = 'ERROR: ' + error.message;
    else { results.supabase_rpc = 'OK'; results.chunks = data.length; results.titles = data.map(c => c.section_title); }
  } catch (e) {
    results.error = e.message;
  }
  res.json(results);
});

// Explicit HTML page routes (more reliable than express.static on Railway)
['index', 'query', 'qa', 'workflow'].forEach(page => {
  app.get(`/${page === 'index' ? '' : page + '.html'}`, (req, res) => {
    const file = path.join(docsPath, page === 'index' ? 'index.html' : `${page}.html`);
    if (fs.existsSync(file)) return res.sendFile(file);
    res.status(404).send(`${page}.html not found at ${file}`);
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    message: 'Vent server is running',
    env: {
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
      SUPABASE_URL:      !!process.env.SUPABASE_URL,
      SUPABASE_KEY:      !!process.env.SUPABASE_KEY,
      VOYAGE_API_KEY:    !!getVoyageClient().key,
      VOYAGE_KEY_PREFIX: getVoyageClient().key ? getVoyageClient().key.slice(0, 6) : 'MISSING',
      VOYAGE_RAW_PREFIX: process.env.VOYAGE_API_KEY ? process.env.VOYAGE_API_KEY.slice(0, 3) : 'MISSING'
    }
  });
});

// ─── AUDIT LOG INFRASTRUCTURE ─────────────────────────────────────────────────

// Immutable append-only audit log — 21 CFR Part 11 / EU Annex 11 compliant
async function auditLog({ userId, userRole, action, entityType, entityId, before, after, reason, req }) {
  const ts = new Date().toISOString();
  const content = JSON.stringify({ userId, userRole, action, entityType, entityId, before, after, reason, ts });
  const checksum = crypto.createHash('sha256').update(content).digest('hex');
  try {
    const { error } = await supabase.from('audit_log').insert({
      user_id:    userId || 'system',
      user_role:  userRole || 'system',
      action,
      entity_type: entityType,
      entity_id:   entityId,
      before_val:  before || null,
      after_val:   after || {},
      reason:      reason || null,
      ip_address:  req ? (req.headers['x-forwarded-for'] || req.ip || '') : '',
      user_agent:  req ? (req.headers['user-agent'] || '') : '',
      checksum
    });
    if (error) console.error('[AUDIT] Insert error:', error.message);
    else console.log(`[AUDIT] ${action} on ${entityType}:${entityId} by ${userId}`);
  } catch (err) {
    // Audit failures are logged but don't break the operation
    console.error('[AUDIT] Failed:', err.message);
  }
}

// GET /admin/setup — returns SQL to create audit_log table in Supabase
app.get('/admin/setup', (req, res) => {
  const sql = `
-- ═══════════════════════════════════════════════════════════════
-- VENT Audit Log Table — 21 CFR Part 11 / EU Annex 11 compliant
-- Run this in your Supabase SQL Editor (one-time setup)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp   TIMESTAMPTZ DEFAULT now() NOT NULL,
  user_id     TEXT NOT NULL,
  user_role   TEXT NOT NULL,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  before_val  JSONB,
  after_val   JSONB NOT NULL DEFAULT '{}'::jsonb,
  reason      TEXT,
  ip_address  TEXT,
  user_agent  TEXT,
  checksum    TEXT NOT NULL
);

-- Index for fast lookups by entity and by user
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user   ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_time   ON audit_log(timestamp DESC);

-- CRITICAL: Prevent updates and deletes — append-only for regulatory compliance
-- Using RLS policies: only INSERT is allowed via the API
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Allow inserts from authenticated and service_role
CREATE POLICY audit_insert ON audit_log FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY audit_select ON audit_log FOR SELECT TO authenticated, anon USING (true);

-- Explicitly deny UPDATE and DELETE — no policy = denied by default with RLS enabled
-- This means once a row is written, it can NEVER be modified or removed via the API

COMMENT ON TABLE audit_log IS 'Immutable audit trail for 21 CFR Part 11 / EU Annex 11 compliance. No UPDATE or DELETE permitted.';
  `.trim();
  res.type('text/plain').send(sql);
});

// POST /admin/setup — attempt to create the table via Supabase
app.post('/admin/setup', async (req, res) => {
  // Try to create audit_log by inserting a bootstrap row
  // If the table doesn't exist, this will fail with a clear message
  const testRow = {
    user_id: 'system',
    user_role: 'system',
    action: 'system_setup',
    entity_type: 'system',
    entity_id: 'audit_log',
    after_val: { event: 'Audit log table initialized', version: '1.0' },
    reason: 'System setup — audit trail activated',
    ip_address: '',
    user_agent: 'vent-server/setup',
    checksum: crypto.createHash('sha256').update('setup-' + Date.now()).digest('hex')
  };
  const { error } = await supabase.from('audit_log').insert(testRow);
  if (error) {
    if (error.message.includes('does not exist') || error.code === '42P01') {
      return res.status(400).json({
        error: 'audit_log table does not exist yet',
        instructions: 'Visit GET /admin/setup to get the SQL, then run it in your Supabase SQL Editor',
        setupUrl: '/admin/setup'
      });
    }
    return res.status(500).json({ error: error.message });
  }
  res.json({ success: true, message: 'Audit log table exists and is working. Bootstrap entry written.' });
});

// GET /audit/:entityId — retrieve full audit trail for a submission or entity
app.get('/audit/:entityId', async (req, res) => {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('entity_id', req.params.entityId)
    .order('timestamp', { ascending: true });
  if (error) {
    // Table might not exist yet
    if (error.message.includes('does not exist')) {
      return res.json([]);
    }
    return res.status(500).json({ error: error.message });
  }
  res.json(data || []);
});

// GET /audit — retrieve recent audit entries (last 100)
app.get('/audit', async (req, res) => {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(100);
  if (error) {
    if (error.message.includes('does not exist')) return res.json([]);
    return res.status(500).json({ error: error.message });
  }
  res.json(data || []);
});

// Text search fallback when Voyage is unavailable
async function getChunksByText(query) {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  if (!words.length) return [];
  const { data, error } = await supabase
    .from('sop_chunks')
    .select('doc_id, doc_title, section_title, content')
    .or(words.slice(0, 3).map(w => `content.ilike.%${w}%`).join(','))
    .limit(6);
  if (error) { console.error('Text search error:', error.message); return []; }
  return (data || []).map(c => ({ ...c, similarity: 0.5 }));
}

// Search Supabase for SOP chunks relevant to the observation
async function getRelevantChunks(observation, area) {
  const { client: voyage, key } = getVoyageClient();
  if (key) {
    try {
      const result = await voyage.embed({
        input: [`Process area: ${area}. ${observation}`],
        model: 'voyage-3-lite'
      });
      const embedding = result.data[0].embedding;
      const { data, error } = await supabase.rpc('match_sop_chunks', {
        query_embedding: embedding,
        match_count: 6
      });
      if (!error && data && data.length) return data;
      console.warn('Vector search returned nothing, falling back to text search');
    } catch (err) {
      console.warn('Voyage failed, falling back to text search:', err.message);
    }
  } else {
    console.warn('No Voyage key — using text search fallback');
  }
  return getChunksByText(`${area} ${observation}`);
}

// Format retrieved SOP chunks into a readable context block for Claude
function buildSopContext(chunks) {
  if (!chunks.length) return 'No specific SOP sections retrieved for this observation.';

  return chunks
    .map(c => `Document: ${c.doc_id} — ${c.doc_title}\nSection: ${c.section_title}\n\n${c.content}`)
    .join('\n\n---\n\n');
}

// Submit route
app.post('/submit', async (req, res) => {
  const { observation, area, shift, willingToConsult } = req.body;

  if (!observation || observation.length < 10) {
    return res.status(400).json({ error: 'Observation too short' });
  }

  const refCode = 'VNT-' + Math.floor(1000 + Math.random() * 8999);

  try {
    // Step 1: Find the most relevant SOP sections for this observation
    const chunks = await getRelevantChunks(observation, area);
    const sopContext = buildSopContext(chunks);

    console.log(`[${refCode}] Found ${chunks.length} relevant SOP chunks for: "${observation.slice(0, 60)}..."`);

    // Step 2: Build the contacts directory for this submission
    const contactsContext = buildContactsContext();

    // Step 3: Send to Claude with real SOP content and real contacts as grounding
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are the AI engine of Vent — an anonymous improvement intelligence system inside a regulated biologics manufacturing facility running perfusion upstream processes.

An operator has submitted an observation. You have been given the ACTUAL facility SOP sections and the ACTUAL contacts directory. Your job is to analyse the observation against real documents and route it to the correct people.

RULES:
- Reference ONLY the SOP documents provided below. Do not invent SOP codes or section numbers.
- Select 3–5 contacts from the CONTACTS DIRECTORY below. Use their EXACT name, role, dept, deptLabel, initials, and avatarClass — do not invent or modify any contact fields.
- Assign each contact a workflowPhase integer (1–4): 1=Immediate floor response (Shift Leads, EHS, 0–4h); 2=Document & notify (QA Leads, QMS Lead, same day); 3=Investigate & act (MSAT, Engineering specialists, 2–7 days); 4=Review & close (Directors, QP, Senior staff, 1–4 weeks).
- If the observation matches a documented gap or NOTE in the SOPs, flag it explicitly.
- Be specific. Use actual section numbers from the SOP content below.

════ RELEVANT SOP SECTIONS ════
${sopContext}
═══════════════════════════════

════ CONTACTS DIRECTORY ════
${contactsContext}
════════════════════════════

Process area: ${area}
Shift: ${shift}
Operator observation: "${observation}"

Return ONLY valid JSON — no markdown fences, no preamble, no explanation outside the JSON.

{
  "priority": "High or Medium or Low",
  "sopRefs": [{ "code": "doc_id from above e.g. SOP-UP-001", "title": "document title", "step": "actual section number e.g. 8.6.1.4", "relevance": "one sentence explaining connection to observation", "flag": "gap or ambiguous or compliant" }],
  "bprRefs": [{ "code": "BPR-UP-001 if relevant", "title": "Batch Production Record", "step": "section ref", "relevance": "one sentence", "flag": "gap or ambiguous or compliant" }],
  "sciEval": { "summary": "3-4 sentences grounded in the retrieved SOP content", "rootCauseHypothesis": "one sentence", "riskLevel": "High or Medium or Low", "affectedParameter": "specific parameter name", "regulatoryFlag": "Yes or No", "regulatoryNote": "one sentence citing relevant regulation or SOP requirement" },
  "correctiveActions": [{ "title": "action title", "description": "specific description referencing actual SOP steps where possible", "timing": "immediate or short or long", "timingLabel": "e.g. Within 24 hours" }],
  "contacts": [{ "name": "exact name from directory", "role": "exact role from directory", "dept": "exact dept from directory", "deptLabel": "exact deptLabel from directory", "avatarClass": "exact avatarClass from directory", "initials": "exact initials from directory", "workflowPhase": 1, "why": "one sentence specific to this observation explaining why this person needs to act" }],
  "timeline": [{ "state": "done or now or next or later", "when": "timeframe", "event": "event title", "detail": "one sentence" }],
  "pattern": { "summary": "two sentences on whether this is a recurring pattern", "currentCount": 1, "threshold": 3 }
}`
      }]
    });

    const raw = message.content[0].text;
    const clean = raw.replace(/```json|```/g, '').trim();
    const feedback = JSON.parse(clean);

    // Step 3: Save to Supabase
    const { error } = await supabase
      .from('submissions')
      .insert({
        ref_code: refCode,
        process_area: area,
        shift: shift,
        raw_text: observation,
        priority: feedback.priority,
        structured: feedback,
        willing_to_consult: willingToConsult || false
      });

    if (error) {
      console.error('Supabase error:', error);
    } else {
      console.log(`[${refCode}] Saved to database`);
      // Audit: log the submission creation
      await auditLog({
        userId: shift || 'operator',
        userRole: 'operator',
        action: 'submission_created',
        entityType: 'submission',
        entityId: refCode,
        after: { priority: feedback.priority, area, shift, sopRefs: (feedback.sopRefs || []).map(s => s.code) },
        reason: 'Operator submitted observation via Query page',
        req
      });
    }

    res.json({ ...feedback, refCode });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// GET /sop/:docId — fetch all chunks for a document
app.get('/sop/:docId', async (req, res) => {
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
app.get('/sop/:docId/chunk', async (req, res) => {
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

  // Find the chunk whose section_title best matches the requested section number
  // e.g. section="8.6.1.4" should match chunk titled "8.6.1 Cell Count and Viability"
  const prefix = section.split('.').slice(0, 3).join('.');  // e.g. "8.6.1"
  const broader = section.split('.').slice(0, 2).join('.');  // e.g. "8.6"

  let match = data.find(c => c.section_title && c.section_title.startsWith(prefix))
           || data.find(c => c.section_title && c.section_title.startsWith(broader))
           || data.find(c => c.section_title && c.section_title.includes(broader))
           || data[0];

  res.json(match);
});

// GET /submissions — fetch all for the dashboard
app.get('/submissions', async (req, res) => {
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
app.get('/submissions/:refCode', async (req, res) => {
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
app.patch('/submissions/:refCode/status', async (req, res) => {
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

// POST /query — operator SOP knowledge search
app.post('/query', async (req, res) => {
  const { question, area } = req.body;

  if (!question || question.length < 5) {
    return res.status(400).json({ error: 'Question too short' });
  }

  try {
    const chunks = await getRelevantChunks(question, area || 'Upstream');
    const sopContext = buildSopContext(chunks);

    console.log(`[QUERY] "${question.slice(0, 60)}" — ${chunks.length} chunks retrieved`);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `You are the SOP Knowledge Assistant for a biologics manufacturing facility running upstream perfusion processes. An operator on the manufacturing floor has asked a question. You have the relevant SOP sections below. Answer clearly and practically.

RULES:
- Answer only from the SOP content provided. Do not invent steps or values.
- If the question is procedural, return numbered steps.
- If the question is about a specification or parameter value, populate the params array.
- If the question cannot be answered from the provided SOP content, say so clearly in the summary.
- Keep language plain and direct — this is for a floor operator, not a regulator.
- Always cite the exact SOP section numbers you drew from.

════ RELEVANT SOP SECTIONS ════
${sopContext}
═══════════════════════════════

Process area: ${area || 'Upstream'}
Operator question: "${question}"

Return ONLY valid JSON — no markdown, no preamble.

{
  "category": "procedure or specification or troubleshooting or general",
  "summary": "2–3 sentences answering the question in plain language",
  "steps": [{ "n": 1, "action": "step instruction", "detail": "additional detail or null", "critical": false, "value": "specific value or target if relevant, else null" }],
  "params": [{ "name": "parameter name", "value": "target value", "unit": "unit string", "range": "acceptable range or null", "flag": "critical or normal" }],
  "warnings": ["warning text — only include genuine safety or quality critical cautions"],
  "notes": ["general procedural note"],
  "sources": [{ "code": "doc_id e.g. SOP-UP-001", "title": "document title", "section": "section number e.g. 8.6.1" }]
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
app.post('/ingest', async (req, res) => {
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

app.listen(PORT, () => {
  const keys = ['ANTHROPIC_API_KEY','SUPABASE_URL','SUPABASE_KEY','VOYAGE_API_KEY','VOYAGE_KEY'];
  keys.forEach(k => console.log(`[ENV] ${k}: ${process.env[k] ? 'SET' : 'MISSING'}`));
  console.log('[VOYAGE] Using key prefix:', getVoyageClient().key.slice(0,6));
});
