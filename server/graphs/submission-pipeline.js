'use strict';

/**
 * graphs/submission-pipeline.js
 *
 * LangGraph stateful graph for the submission analysis pipeline.
 *
 * Flow:
 *   retrieve → classify → analyse → route → write-capas
 *
 * Each node is a discrete agent with its own LangSmith trace.
 * The graph state accumulates results from each step so downstream
 * nodes can build on upstream outputs.
 *
 * Usage:
 *   const pipeline = makeSubmissionPipeline({ anthropic, rag, buildContactsContext });
 *   const result   = await pipeline.run({ observation, area, shift });
 */

const { StateGraph, END } = require('@langchain/langgraph');
const { Annotation }      = require('@langchain/langgraph');

const makeClassifierAgent  = require('../agents/classifier');
const makeAnalystAgent     = require('../agents/analyst');
const makeRouterAgent      = require('../agents/router');
const makeCapaWriterAgent  = require('../agents/capa-writer');

// ── Graph state schema ────────────────────────────────────────────────────────

const PipelineState = Annotation.Root({
  // Inputs (set once at invocation)
  observation:     Annotation({ reducer: (_, v) => v, default: () => '' }),
  area:            Annotation({ reducer: (_, v) => v, default: () => '' }),
  shift:           Annotation({ reducer: (_, v) => v, default: () => '' }),

  // Retrieval context (set by retrieve node)
  sopContext:      Annotation({ reducer: (_, v) => v, default: () => '' }),
  contactsContext: Annotation({ reducer: (_, v) => v, default: () => '' }),
  patternContext:  Annotation({ reducer: (_, v) => v, default: () => '' }),
  patternCount:    Annotation({ reducer: (_, v) => v, default: () => 0 }),

  // Agent outputs (accumulated per node)
  classification:  Annotation({ reducer: (_, v) => v, default: () => null }),
  analysis:        Annotation({ reducer: (_, v) => v, default: () => null }),
  routing:         Annotation({ reducer: (_, v) => v, default: () => null }),
  capaRecords:     Annotation({ reducer: (_, v) => v, default: () => null }),
});

// ── Pipeline factory ──────────────────────────────────────────────────────────

function makeSubmissionPipeline({ anthropic, rag, buildContactsContext }) {
  const { getRelevantChunks, buildSopContext, findSimilarSubmissions, buildPatternContext } = rag;

  const classifier = makeClassifierAgent(anthropic);
  const analyst    = makeAnalystAgent(anthropic);
  const router     = makeRouterAgent(anthropic);
  const capaWriter = makeCapaWriterAgent(anthropic);

  // ── Node functions ────────────────────────────────────────────────────────

  /** Node 1: Retrieve SOP chunks, contacts, and similar past submissions */
  async function retrieve(state) {
    const chunks  = await getRelevantChunks(state.observation, state.area);
    const sopCtx  = buildSopContext(chunks);
    const contacts = buildContactsContext();
    const patterns = await findSimilarSubmissions(state.observation, state.area);
    const patternCtx = buildPatternContext(patterns);

    console.log(`[PIPELINE:retrieve] ${chunks.length} SOP chunks | ${patterns.count} past matches`);

    return {
      sopContext:      sopCtx,
      contactsContext: contacts,
      patternContext:  patternCtx,
      patternCount:    patterns.count,
    };
  }

  /** Node 2: Classify priority, risk, regulatory flag */
  async function classify(state) {
    const result = await classifier.invoke(state);
    return { classification: result };
  }

  /** Node 3: Deep analysis — SOP refs, corrective actions, timeline */
  async function analyse(state) {
    const result = await analyst.invoke(state);
    return { analysis: result };
  }

  /** Node 4: Route to contacts */
  async function routeContacts(state) {
    const result = await router.invoke(state);
    return { routing: result };
  }

  /** Node 5: Generate formal CAPAs */
  async function writeCapas(state) {
    const result = await capaWriter.invoke(state);
    return { capaRecords: result };
  }

  // ── Build the graph ───────────────────────────────────────────────────────

  const graph = new StateGraph(PipelineState)
    .addNode('retrieve',  retrieve)
    .addNode('classify',  classify)
    .addNode('analyse',   analyse)
    .addNode('route',     routeContacts)
    .addNode('writeCapas', writeCapas)
    .addEdge('__start__', 'retrieve')
    .addEdge('retrieve',  'classify')
    .addEdge('classify',  'analyse')
    .addEdge('analyse',   'route')
    .addEdge('route',     'writeCapas')
    .addEdge('writeCapas', '__end__');

  const compiled = graph.compile();

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Run the full pipeline.
   *
   * @param {{ observation: string, area: string, shift: string }} input
   * @returns {object} Merged feedback object matching the original API shape
   */
  async function run({ observation, area, shift }) {
    console.log(`[PIPELINE] Starting submission pipeline for "${observation.slice(0, 60)}..."`);

    const finalState = await compiled.invoke({
      observation,
      area,
      shift,
    });

    // Merge agent outputs into the flat feedback shape the frontend expects
    const classification = finalState.classification || {};
    const analysis       = finalState.analysis || {};
    const routing        = finalState.routing || {};
    const capaRecords    = finalState.capaRecords || {};

    const feedback = {
      priority:          classification.priority || 'Medium',
      sciEval:           analysis.sciEval || {},
      sopRefs:           analysis.sopRefs || [],
      bprRefs:           analysis.bprRefs || [],
      correctiveActions: analysis.correctiveActions || [],
      contacts:          routing.contacts || [],
      timeline:          analysis.timeline || [],
      pattern:           analysis.pattern || { summary: 'No data', currentCount: 1, threshold: 3 },
      // Enriched CAPA records (downstream can use these for auto-creation)
      _capas:            capaRecords.capas || [],
      // Expose classification metadata for audit
      _classification: {
        category:       classification.category,
        riskLevel:      classification.riskLevel,
        regulatoryFlag: classification.regulatoryFlag,
        regulatoryNote: classification.regulatoryNote,
        reasoning:      classification.reasoning,
      },
    };

    console.log(`[PIPELINE] Complete — ${feedback.priority} priority | ${feedback.sopRefs.length} SOP refs | ${feedback.contacts.length} contacts | ${feedback._capas.length} CAPAs`);

    return feedback;
  }

  return { run, compiled };
}

module.exports = makeSubmissionPipeline;
