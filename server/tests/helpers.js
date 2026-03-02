'use strict';

/**
 * tests/helpers.js — Shared test utilities & mock factories
 *
 * Provides lightweight stubs for Supabase, Anthropic, auditLog, and RAG
 * so service-layer tests run without network calls.
 */



/** Chainable Supabase query builder stub */
function makeQueryBuilder(resolvedData = [], resolvedError = null) {
  const builder = {};
  const methods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in',
    'order', 'limit', 'single', 'maybeSingle',
  ];
  methods.forEach(m => {
    builder[m] = vi.fn(() => builder);
  });
  // Terminal — returns { data, error }
  builder.then = (resolve) => resolve({ data: resolvedData, error: resolvedError });
  // Allow await to work
  builder[Symbol.for('nodejs.util.promisify.custom')] = undefined;
  // Make it thenable
  Object.defineProperty(builder, 'then', {
    value: (resolve) => resolve({ data: resolvedData, error: resolvedError }),
  });
  return builder;
}

/** Stub Supabase client — .from() returns a chainable query builder */
function mockSupabase(data = [], error = null) {
  const qb = makeQueryBuilder(data, error);
  return {
    from: vi.fn(() => qb),
    rpc: vi.fn(async () => ({ data, error })),
    _qb: qb,
  };
}

/** Stub Anthropic client — .messages.create() returns a configurable response */
function mockAnthropic(text = '{}') {
  return {
    messages: {
      create: vi.fn(async () => ({
        content: [{ type: 'text', text }],
      })),
    },
  };
}

/** Stub auditLog — just records calls */
function mockAuditLog() {
  return vi.fn(async () => {});
}

/** Stub RAG module */
function mockRag() {
  return {
    getRelevantChunks: vi.fn(async () => []),
    buildSopContext: vi.fn(() => '(no SOP context)'),
    findSimilarSubmissions: vi.fn(async () => ({ count: 0, matches: [] })),
    buildPatternContext: vi.fn(() => 'No similar submissions found.'),
  };
}

/** Stub Voyage client */
function mockVoyage() {
  return {
    client: {
      embed: vi.fn(async () => ({ data: [{ embedding: new Array(1024).fill(0) }] })),
    },
  };
}

function mockGetVoyageClient() {
  return vi.fn(() => mockVoyage());
}

/** Stub contacts builder */
function mockBuildContactsContext() {
  return vi.fn(() => 'Dr Test — QA Lead');
}

module.exports = {
  makeQueryBuilder,
  mockSupabase,
  mockAnthropic,
  mockAuditLog,
  mockRag,
  mockVoyage,
  mockGetVoyageClient,
  mockBuildContactsContext,
};
