'use strict';

/**
 * evals/run-evals.js — Evaluation runner for agent quality testing
 *
 * Runs each agent against its curated dataset and reports:
 *   • Pass/fail per example (exact match on key fields)
 *   • Aggregate accuracy per agent
 *   • Detailed mismatches for debugging
 *
 * Usage:
 *   node evals/run-evals.js                  — run all evals
 *   node evals/run-evals.js classifier       — run only classifier
 *   node evals/run-evals.js --dry-run        — show datasets without calling Claude
 *
 * Requires: ANTHROPIC_API_KEY in .env (uses real Claude calls)
 * Optionally logs results to LangSmith if tracing is enabled.
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');

const config = require('../lib/config');
const Anthropic = require('@anthropic-ai/sdk');

// ── Agent factories ─────────────────────────────────────────────────────────
const makeClassifierAgent = require('../agents/classifier');
const makeRouterAgent     = require('../agents/router');
const makeSopQueryAgent   = require('../agents/sop-query');
const { makeRag }         = require('../lib/rag');
const { createClient }    = require('@supabase/supabase-js');

// ── CLI args ────────────────────────────────────────────────────────────────
const args     = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const agentFilter = args.find(a => !a.startsWith('--'));

// ── Colours for terminal output ─────────────────────────────────────────────
const C = {
  green:  s => `\x1b[32m${s}\x1b[0m`,
  red:    s => `\x1b[31m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  cyan:   s => `\x1b[36m${s}\x1b[0m`,
  dim:    s => `\x1b[2m${s}\x1b[0m`,
  bold:   s => `\x1b[1m${s}\x1b[0m`,
};

// ── Scoring functions ───────────────────────────────────────────────────────

function scoreClassifier(result, expected) {
  const checks = [];

  if (expected.priority) {
    checks.push({
      field: 'priority',
      pass: result.priority === expected.priority,
      expected: expected.priority,
      actual: result.priority,
    });
  }
  if (expected.riskLevel) {
    checks.push({
      field: 'riskLevel',
      pass: result.riskLevel === expected.riskLevel,
      expected: expected.riskLevel,
      actual: result.riskLevel,
    });
  }
  if (expected.regulatoryFlag) {
    checks.push({
      field: 'regulatoryFlag',
      pass: result.regulatoryFlag === expected.regulatoryFlag,
      expected: expected.regulatoryFlag,
      actual: result.regulatoryFlag,
    });
  }
  if (expected.category) {
    checks.push({
      field: 'category',
      pass: result.category === expected.category,
      expected: expected.category,
      actual: result.category,
    });
  }

  return checks;
}

function scoreRouter(result, expected) {
  const checks = [];
  const contacts = result.contacts || [];

  if (expected.contactCount) {
    checks.push({
      field: 'contactCount',
      pass: contacts.length >= expected.contactCount.min && contacts.length <= expected.contactCount.max,
      expected: `${expected.contactCount.min}–${expected.contactCount.max}`,
      actual: contacts.length,
    });
  }
  if (expected.mustIncludeRoles) {
    for (const role of expected.mustIncludeRoles) {
      const found = contacts.some(c => c.role && c.role.toLowerCase().includes(role.toLowerCase()));
      checks.push({
        field: `includes "${role}"`,
        pass: found,
        expected: true,
        actual: found,
      });
    }
  }
  if (expected.workflowPhases) {
    const phases = contacts.map(c => c.workflowPhase).filter(Boolean);
    for (const phase of expected.workflowPhases) {
      checks.push({
        field: `has phase ${phase}`,
        pass: phases.includes(phase),
        expected: true,
        actual: phases.includes(phase),
      });
    }
  }

  return checks;
}

function scoreSopQuery(result, expected) {
  const checks = [];
  const answer = (result.answer || '').toLowerCase();
  const sources = result.sources || [];

  if (expected.mustMentionDocIds) {
    for (const docId of expected.mustMentionDocIds) {
      const inAnswer = answer.includes(docId.toLowerCase());
      const inSources = sources.some(s => s.docId === docId);
      checks.push({
        field: `mentions ${docId}`,
        pass: inAnswer || inSources,
        expected: true,
        actual: inAnswer || inSources,
      });
    }
  }
  if (expected.mustMentionTerms) {
    for (const term of expected.mustMentionTerms) {
      checks.push({
        field: `mentions "${term}"`,
        pass: answer.includes(term.toLowerCase()),
        expected: true,
        actual: answer.includes(term.toLowerCase()),
      });
    }
  }
  if (expected.minSources !== undefined) {
    checks.push({
      field: 'sourceCount',
      pass: sources.length >= expected.minSources,
      expected: `≥${expected.minSources}`,
      actual: sources.length,
    });
  }

  return checks;
}

// ── Run a single eval suite ─────────────────────────────────────────────────

async function runSuite(suiteName, datasetPath, agentFactory, scoreFn) {
  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));

  console.log(`\n${C.bold(`═══ ${suiteName.toUpperCase()} ═══`)} (${dataset.length} examples)`);

  if (isDryRun) {
    dataset.forEach(ex => console.log(`  ${C.dim(ex.id)} ${ex.name}`));
    return { suite: suiteName, total: dataset.length, passed: 0, skipped: true };
  }

  let totalChecks = 0;
  let passedChecks = 0;
  let examplesPassed = 0;

  for (const example of dataset) {
    process.stdout.write(`  ${C.dim(example.id)} ${example.name} ... `);

    try {
      const result = await agentFactory(example.input);
      const checks = scoreFn(result, example.expected);

      totalChecks += checks.length;
      const exPassed = checks.every(c => c.pass);
      if (exPassed) examplesPassed++;

      const failures = checks.filter(c => !c.pass);
      passedChecks += checks.filter(c => c.pass).length;

      if (exPassed) {
        console.log(C.green('✓ PASS') + C.dim(` (${checks.length} checks)`));
      } else {
        console.log(C.red('✗ FAIL'));
        failures.forEach(f => {
          console.log(`    ${C.red('✗')} ${f.field}: expected ${C.yellow(String(f.expected))}, got ${C.red(String(f.actual))}`);
        });
      }
    } catch (err) {
      console.log(C.red('✗ ERROR: ' + err.message));
    }
  }

  const accuracy = totalChecks > 0 ? ((passedChecks / totalChecks) * 100).toFixed(1) : '0.0';
  console.log(`  ${C.cyan('Result')}: ${examplesPassed}/${dataset.length} examples passed | ${passedChecks}/${totalChecks} checks (${accuracy}%)`);

  return { suite: suiteName, total: dataset.length, passed: examplesPassed, accuracy };
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(C.bold('\n🔬 Vent Agent Evaluation Runner\n'));

  if (isDryRun) {
    console.log(C.yellow('DRY RUN — showing datasets without calling Claude\n'));
  }

  // Set up real clients (evals use actual Claude calls for quality measurement)
  let anthropic;
  if (!isDryRun) {
    const client = new Anthropic.default({ apiKey: config.anthropicApiKey });

    if (config.langsmithEnabled) {
      process.env.LANGCHAIN_TRACING_V2 = 'true';
      process.env.LANGCHAIN_API_KEY    = config.langsmithApiKey;
      process.env.LANGCHAIN_PROJECT    = config.langsmithProject + '-evals';

      const { Client }  = require('langsmith');
      const { wrapSDK } = require('langsmith/wrappers');
      const lsClient = new Client({ apiKey: config.langsmithApiKey });
      anthropic = wrapSDK(client, { client: lsClient });
      console.log(C.dim(`LangSmith tracing → project: ${config.langsmithProject}-evals\n`));
    } else {
      anthropic = client;
    }
  }

  const suites = [];
  const datasetsDir = path.join(__dirname, 'datasets');

  // ── Classifier eval ───────────────────────────────────────────────────
  if (!agentFilter || agentFilter === 'classifier') {
    const classifier = isDryRun ? null : makeClassifierAgent(anthropic);
    suites.push(await runSuite(
      'Classifier',
      path.join(datasetsDir, 'classifier.json'),
      isDryRun ? () => {} : (input) => classifier.invoke(input),
      scoreClassifier,
    ));
  }

  // ── Router eval ───────────────────────────────────────────────────────
  if (!agentFilter || agentFilter === 'router') {
    const router = isDryRun ? null : makeRouterAgent(anthropic);
    suites.push(await runSuite(
      'Router',
      path.join(datasetsDir, 'router.json'),
      isDryRun ? () => {} : (input) => router.invoke(input),
      scoreRouter,
    ));
  }

  // ── SOP Query eval ────────────────────────────────────────────────────
  if (!agentFilter || agentFilter === 'sop-query') {
    let sopAgent;
    if (!isDryRun) {
      const supabase = createClient(config.supabaseUrl, config.supabaseKey);
      const rag = makeRag(supabase);
      sopAgent = makeSopQueryAgent(anthropic, rag);
    }
    suites.push(await runSuite(
      'SOP Query',
      path.join(datasetsDir, 'sop-query.json'),
      isDryRun ? () => {} : (input) => sopAgent.invoke(input),
      scoreSopQuery,
    ));
  }

  // ── Summary ───────────────────────────────────────────────────────────
  console.log(`\n${C.bold('═══ SUMMARY ═══')}`);
  let allPassed = true;
  for (const s of suites) {
    if (s.skipped) {
      console.log(`  ${s.suite}: ${C.dim('skipped (dry run)')}`);
    } else {
      const emoji = s.passed === s.total ? '✓' : '✗';
      const color = s.passed === s.total ? C.green : C.red;
      console.log(`  ${color(emoji)} ${s.suite}: ${s.passed}/${s.total} (${s.accuracy}%)`);
      if (s.passed < s.total) allPassed = false;
    }
  }

  if (!isDryRun) {
    console.log(`\n${allPassed ? C.green('All evals passed!') : C.yellow('Some evals failed — review above for details.')}\n`);
  }

  process.exit(allPassed || isDryRun ? 0 : 1);
}

main().catch(err => {
  console.error(C.red('Fatal error:'), err.message);
  process.exit(1);
});
