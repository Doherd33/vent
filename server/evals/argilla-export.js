'use strict';

/**
 * evals/argilla-export.js — Export feedback sessions & agent outputs to Argilla
 *
 * Exports data in the Argilla dataset format for human annotation:
 *  1. Feedback sessions  — classify sentiment, severity, categories
 *  2. Agent outputs      — rate quality of classifier/router/charlie responses
 *
 * Usage:
 *   node evals/argilla-export.js                       — export all feedback
 *   node evals/argilla-export.js --since 2025-01-01    — filter by date
 *   node evals/argilla-export.js --type agent-outputs   — export agent logs
 *   node evals/argilla-export.js --out path/to/file.json — custom output path
 *
 * The output JSON can be imported into Argilla via:
 *   - Argilla Python client (rg.log)
 *   - Argilla REST API POST /api/v1/datasets/{id}/records
 *   - HuggingFace Datasets library
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');

const config = require('../lib/config');
const { createClient } = require('@supabase/supabase-js');

// ── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

function argVal(flag) {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
}

const sinceDate = argVal('--since') || '2020-01-01';
const exportType = argVal('--type') || 'feedback';
const outPath = argVal('--out') || path.join(__dirname, 'exports',
  `${exportType}-${new Date().toISOString().slice(0, 10)}.json`);

// ── Argilla dataset schemas ─────────────────────────────────────────────────

/**
 * Argilla uses a fields + questions schema.
 * Fields define what the annotator sees.
 * Questions define what they label.
 */
const FEEDBACK_SCHEMA = {
  name: 'vent-operator-feedback',
  guidelines: `Review the operator feedback session with Charlie (the Vent voice assistant).
Rate the AI analysis quality and adjust labels if needed.

**Sentiment**: Does the AI's sentiment label match the transcript tone?
**Severity**: Is the severity appropriate for the issues raised?
**Categories**: Are all relevant categories captured? Any missing?
**Summary quality**: Does the summary accurately capture key points?`,
  fields: [
    { name: 'session_id', title: 'Session ID', type: 'text' },
    { name: 'operator', title: 'Operator', type: 'text' },
    { name: 'transcript', title: 'Full Transcript', type: 'text' },
    { name: 'ai_summary', title: 'AI Summary', type: 'text' },
    { name: 'ai_sentiment', title: 'AI Sentiment', type: 'text' },
    { name: 'ai_severity', title: 'AI Severity', type: 'text' },
    { name: 'ai_categories', title: 'AI Categories', type: 'text' },
    { name: 'ai_key_quotes', title: 'AI Key Quotes', type: 'text' },
  ],
  questions: [
    {
      name: 'sentiment_correct',
      title: 'Is the AI sentiment label correct?',
      type: 'label_selection',
      labels: ['correct', 'should_be_positive', 'should_be_negative', 'should_be_neutral', 'should_be_mixed'],
    },
    {
      name: 'severity_correct',
      title: 'Is the severity rating appropriate?',
      type: 'label_selection',
      labels: ['correct', 'too_high', 'too_low'],
    },
    {
      name: 'categories_correct',
      title: 'Are all categories captured?',
      type: 'label_selection',
      labels: ['correct', 'missing_categories', 'wrong_categories', 'both_missing_and_wrong'],
    },
    {
      name: 'summary_quality',
      title: 'Rate the AI summary quality (1-5)',
      type: 'rating',
      values: [1, 2, 3, 4, 5],
    },
    {
      name: 'corrected_categories',
      title: 'Corrected categories (if any)',
      type: 'text',
      required: false,
    },
    {
      name: 'annotator_notes',
      title: 'Additional notes',
      type: 'text',
      required: false,
    },
  ],
};

const AGENT_OUTPUT_SCHEMA = {
  name: 'vent-agent-outputs',
  guidelines: `Review the agent output for the given input.
Rate accuracy, completeness, and appropriateness.`,
  fields: [
    { name: 'agent', title: 'Agent Name', type: 'text' },
    { name: 'input_summary', title: 'Input Summary', type: 'text' },
    { name: 'full_input', title: 'Full Input (JSON)', type: 'text' },
    { name: 'output', title: 'Agent Output (JSON)', type: 'text' },
    { name: 'trace_url', title: 'LangSmith Trace URL', type: 'text' },
  ],
  questions: [
    {
      name: 'accuracy',
      title: 'How accurate is the output?',
      type: 'rating',
      values: [1, 2, 3, 4, 5],
    },
    {
      name: 'completeness',
      title: 'How complete is the output?',
      type: 'rating',
      values: [1, 2, 3, 4, 5],
    },
    {
      name: 'issues',
      title: 'Issues found',
      type: 'multi_label_selection',
      labels: ['hallucination', 'wrong_priority', 'missing_sop_ref', 'wrong_contact', 'formatting', 'tone', 'none'],
    },
    {
      name: 'annotator_notes',
      title: 'Notes',
      type: 'text',
      required: false,
    },
  ],
};

// ── Export feedback sessions ────────────────────────────────────────────────

async function exportFeedback(supabase) {
  console.log(`Fetching feedback sessions since ${sinceDate}...`);

  const { data: sessions, error } = await supabase
    .from('operator_feedback')
    .select('*')
    .gte('created_at', sinceDate)
    .in('status', ['analysed', 'completed'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase error:', error.message);
    process.exit(1);
  }

  console.log(`Found ${(sessions || []).length} analysed feedback sessions.`);

  const records = (sessions || []).map(s => {
    const transcript = (s.transcript || [])
      .map(t => `${t.role === 'user' ? 'Operator' : 'Charlie'}: ${t.content}`)
      .join('\n\n');

    const analysis = s.analysis || {};

    return {
      fields: {
        session_id: s.id,
        operator: `${s.user_name} (${s.user_role})`,
        transcript: transcript || '(empty)',
        ai_summary: analysis.summary || s.summary || '(not analysed)',
        ai_sentiment: analysis.sentiment || s.sentiment || 'unknown',
        ai_severity: analysis.severity || s.severity || 'unknown',
        ai_categories: JSON.stringify(analysis.categories || s.categories || []),
        ai_key_quotes: JSON.stringify(analysis.key_quotes || s.key_quotes || []),
      },
      metadata: {
        source_id: s.id,
        created_at: s.created_at,
        message_count: s.message_count,
        session_duration: s.session_duration,
        lang: s.lang,
      },
    };
  });

  return { schema: FEEDBACK_SCHEMA, records };
}

// ── Export agent outputs (from LangSmith) ───────────────────────────────────

async function exportAgentOutputs() {
  if (!config.langsmithEnabled) {
    console.error('LangSmith not enabled — cannot export agent outputs.');
    console.log('Set LANGSMITH_API_KEY and LANGSMITH_TRACING_V2=true in .env');
    process.exit(1);
  }

  console.log('Fetching agent runs from LangSmith...');

  const { Client } = require('langsmith');
  const client = new Client({ apiKey: config.langsmithApiKey });

  const agentNames = ['classifier', 'analyst', 'router', 'capa-writer', 'sop-query', 'charlie'];
  const records = [];

  for (const agentName of agentNames) {
    try {
      const runs = client.listRuns({
        projectName: config.langsmithProject,
        filter: `has(tags, "${agentName}")`,
        startTime: new Date(sinceDate),
        limit: 50,
      });

      for await (const run of runs) {
        records.push({
          fields: {
            agent: agentName,
            input_summary: truncate(JSON.stringify(run.inputs), 300),
            full_input: JSON.stringify(run.inputs, null, 2),
            output: JSON.stringify(run.outputs, null, 2),
            trace_url: run.url || `https://smith.langchain.com/o/${run.session_id}/runs/${run.id}`,
          },
          metadata: {
            run_id: run.id,
            trace_id: run.trace_id,
            start_time: run.start_time,
            latency_ms: run.total_tokens,
            status: run.status,
          },
        });
      }

      console.log(`  ${agentName}: ${records.filter(r => r.fields.agent === agentName).length} runs`);
    } catch (err) {
      console.warn(`  ${agentName}: skipped (${err.message})`);
    }
  }

  return { schema: AGENT_OUTPUT_SCHEMA, records };
}

function truncate(s, max) {
  return s && s.length > max ? s.slice(0, max) + '…' : s;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Vent → Argilla Export\n');

  const supabase = createClient(config.supabaseUrl, config.supabaseKey);

  let result;
  if (exportType === 'feedback') {
    result = await exportFeedback(supabase);
  } else if (exportType === 'agent-outputs') {
    result = await exportAgentOutputs();
  } else {
    console.error(`Unknown type: ${exportType}. Use 'feedback' or 'agent-outputs'.`);
    process.exit(1);
  }

  // Ensure exports directory
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Write Argilla-compatible JSON
  const output = {
    _meta: {
      tool: 'vent-argilla-export',
      exportedAt: new Date().toISOString(),
      type: exportType,
      sinceDate,
      recordCount: result.records.length,
    },
    schema: result.schema,
    records: result.records,
  };

  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nExported ${result.records.length} records → ${outPath}`);

  // Print import instructions
  console.log(`
To import into Argilla:
  1. pip install argilla
  2. python -c "
import argilla as rg
import json

rg.init(api_url='http://localhost:6900', api_key='YOUR_KEY')

with open('${outPath}') as f:
    data = json.load(f)

dataset = rg.FeedbackDataset.from_argilla('${result.schema.name}')
# Or create new: rg.FeedbackDataset(fields=..., questions=...)

records = [rg.FeedbackRecord(**r) for r in data['records']]
dataset.add_records(records)
"
  `);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
