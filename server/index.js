require('dotenv').config();

const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');
const { VoyageAIClient } = require('voyageai');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

const anthropic = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const voyage = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY });

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Vent server is running' });
});

// Search Supabase for SOP chunks relevant to the observation
async function getRelevantChunks(observation, area) {
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

    // Step 2: Send to Claude with the real SOP content as grounding
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are the AI engine of Vent — an anonymous improvement intelligence system inside a regulated biologics manufacturing facility running perfusion upstream processes.

An operator has submitted an observation. You have been given the ACTUAL facility SOP sections most relevant to this report. Your job is to analyse the observation against these real documents and identify genuine procedural gaps, ambiguities, or compliance risks.

RULES:
- Reference ONLY the documents provided below. Do not invent SOP codes or section numbers.
- If the observation matches a documented gap or NOTE in the SOPs, flag it explicitly.
- If no SOP sections were retrieved, state that clearly in sciEval.summary.
- Be specific. Use actual section numbers from the content below.

════ RELEVANT SOP SECTIONS ════
${sopContext}
═══════════════════════════════

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
  "contacts": [{ "name": "realistic full name", "role": "job title", "dept": "qa or eng or ops or ms", "deptLabel": "full department name", "avatarClass": "av-a or av-b or av-c or av-d or av-e", "initials": "XX", "why": "one sentence on why this person is relevant" }],
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

app.listen(PORT, () => {
  console.log(`Vent server running on http://localhost:${PORT}`);
});
