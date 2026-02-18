require('dotenv').config();

const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Anthropic client
const anthropic = new Anthropic.default({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Vent server is running' });
});

// Submit route
app.post('/submit', async (req, res) => {
  const { observation, area, shift, willingToConsult } = req.body;

  if (!observation || observation.length < 10) {
    return res.status(400).json({ error: 'Observation too short' });
  }

  // Generate reference code
  const refCode = 'VNT-' + Math.floor(1000 + Math.random() * 8999);

  try {
    // Call Anthropic API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are the AI engine of Vent — an anonymous improvement intelligence system in a regulated biologics manufacturing facility. A floor operator has submitted an observation. Return ONLY valid JSON feedback — no markdown, no preamble.

Process area: ${area}
Shift: ${shift}
Observation: "${observation}"

Return this exact JSON structure with realistic pharmaceutical detail:
{
  "priority": "High or Medium or Low",
  "sopRefs": [{ "code": "SOP code", "title": "title", "step": "step ref", "relevance": "one sentence", "flag": "gap or ambiguous or compliant" }],
  "bprRefs": [{ "code": "BPR code", "title": "title", "step": "step ref", "relevance": "one sentence", "flag": "gap or ambiguous or compliant" }],
  "sciEval": { "summary": "3-4 sentences", "rootCauseHypothesis": "one sentence", "riskLevel": "High or Medium or Low", "affectedParameter": "parameter name", "regulatoryFlag": "Yes or No", "regulatoryNote": "one sentence" },
  "correctiveActions": [{ "title": "title", "description": "description", "timing": "immediate or short or long", "timingLabel": "timeframe" }],
  "contacts": [{ "name": "realistic full name", "role": "job title", "dept": "qa or eng or ops or ms", "deptLabel": "department name", "avatarClass": "av-a or av-b or av-c or av-d or av-e", "initials": "XX", "why": "one sentence" }],
  "timeline": [{ "state": "done or now or next or later", "when": "timeframe", "event": "event title", "detail": "one sentence" }],
  "pattern": { "summary": "two sentences", "currentCount": 1, "threshold": 3 }
}`
      }]
    });

    const raw = message.content[0].text;
    const clean = raw.replace(/```json|```/g, '').trim();
    const feedback = JSON.parse(clean);

    // Save to Supabase
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
      console.log('Submission saved:', refCode);
    }

    // Return feedback to front end
    res.json({ ...feedback, refCode });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.listen(PORT, () => {
  console.log(`Vent server running on http://localhost:${PORT}`);
});