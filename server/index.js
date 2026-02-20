require('dotenv').config();

const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');
const { VoyageAIClient } = require('voyageai');
const { buildContactsContext } = require('./data/contacts');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

const anthropic = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const voyage = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY });

// Health check
app.get('/', (req, res) => {
  res.json({
    message: 'Vent server is running',
    env: {
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
      SUPABASE_URL:      !!process.env.SUPABASE_URL,
      SUPABASE_KEY:      !!process.env.SUPABASE_KEY,
      VOYAGE_API_KEY:    !!process.env.VOYAGE_API_KEY,
      VOYAGE_KEY_PREFIX: process.env.VOYAGE_API_KEY ? process.env.VOYAGE_API_KEY.slice(0, 6) : 'MISSING'
    }
  });
});

// Search Supabase for SOP chunks relevant to the observation
async function getRelevantChunks(observation, area) {
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

    if (error) {
      console.error('Vector search error:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('getRelevantChunks failed:', err.message);
    return [];
  }
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

// PATCH /submissions/:refCode/status — update workflow status
app.patch('/submissions/:refCode/status', async (req, res) => {
  const { status } = req.body;
  const valid = ['new', 'acknowledged', 'in_progress', 'resolved'];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const { error } = await supabase
    .from('submissions')
    .update({ status })
    .eq('ref_code', req.params.refCode);

  if (error) {
    console.error('Status update error:', error);
    return res.status(500).json({ error: 'Failed to update status' });
  }
  res.json({ ok: true });
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

app.listen(PORT, () => {
  console.log(`Vent server running on http://localhost:${PORT}`);
});
