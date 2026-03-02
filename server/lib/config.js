'use strict';

/**
 * lib/config.js — Centralised environment configuration
 *
 * Validates all required env vars at startup and exports a single frozen
 * config object. The app should never read process.env directly after this.
 * Import this module before anything else in index.js.
 */

const REQUIRED = [
  'ANTHROPIC_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_KEY',
];

const OPTIONAL = {
  VOYAGE_API_KEY:       null,
  VOYAGE_KEY:           null,  // alias some deployments use
  ELEVENLABS_API_KEY:   null,
  RENDER_EXTERNAL_URL:  null,
  // LangSmith supports both LANGSMITH_* and LANGCHAIN_* prefixes — accept either
  LANGSMITH_API_KEY:    null,
  LANGCHAIN_API_KEY:    null,
  LANGSMITH_PROJECT:    'vent',
  LANGCHAIN_PROJECT:    null,
  LANGSMITH_TRACING_V2: null,
  LANGCHAIN_TRACING_V2: null,
  PORT:                 '3001',
  NODE_ENV:             'development',
};

function load() {
  const missing = REQUIRED.filter(k => !process.env[k]);

  if (missing.length) {
    console.error('\n[CONFIG] ❌ Missing required environment variables:');
    missing.forEach(k => console.error(`  - ${k}`));
    console.error('\nSet these in your .env file or deployment environment and restart.\n');
    process.exit(1);
  }

  // Voyage key — try both names, no hardcoded fallback
  const voyageKey = (process.env.VOYAGE_API_KEY || process.env.VOYAGE_KEY || '').replace(/^["']|["']$/g, '');
  if (!voyageKey) {
    console.warn('[CONFIG] ⚠️  No VOYAGE_API_KEY or VOYAGE_KEY set — RAG will fall back to text search');
  }

  const config = Object.freeze({
    anthropicApiKey:    process.env.ANTHROPIC_API_KEY,
    supabaseUrl:        process.env.SUPABASE_URL,
    supabaseKey:        process.env.SUPABASE_KEY,
    voyageApiKey:       voyageKey || null,
    elevenLabsApiKey:   process.env.ELEVENLABS_API_KEY || null,
    renderExternalUrl:  process.env.RENDER_EXTERNAL_URL || null,
    // Accept both LANGSMITH_* and LANGCHAIN_* prefixes so either works in .env
    langsmithApiKey:    process.env.LANGSMITH_API_KEY || process.env.LANGCHAIN_API_KEY || null,
    langsmithProject:   process.env.LANGSMITH_PROJECT || process.env.LANGCHAIN_PROJECT || 'vent',
    langsmithEnabled:   !!(
      (process.env.LANGSMITH_API_KEY || process.env.LANGCHAIN_API_KEY) &&
      (process.env.LANGSMITH_TRACING_V2 !== 'false' && process.env.LANGCHAIN_TRACING_V2 !== 'false')
    ),
    port:               parseInt(process.env.PORT || OPTIONAL.PORT, 10),
    nodeEnv:            process.env.NODE_ENV || OPTIONAL.NODE_ENV,
    isDev:              (process.env.NODE_ENV || 'development') === 'development',
    isProd:             process.env.NODE_ENV === 'production',
  });

  console.log('[CONFIG] ✓ Environment validated');
  console.log(`[CONFIG]   NODE_ENV:          ${config.nodeEnv}`);
  console.log(`[CONFIG]   ANTHROPIC_API_KEY: SET`);
  console.log(`[CONFIG]   SUPABASE_URL:      SET`);
  console.log(`[CONFIG]   VOYAGE_API_KEY:    ${config.voyageApiKey ? 'SET (' + config.voyageApiKey.slice(0, 6) + '...)' : 'MISSING — text search fallback active'}`);
  console.log(`[CONFIG]   ELEVENLABS_API_KEY:${config.elevenLabsApiKey ? ' SET' : ' MISSING — voice features disabled'}`);
  console.log(`[CONFIG]   LANGSMITH:         ${config.langsmithEnabled ? 'ENABLED (project: ' + config.langsmithProject + ')' : 'disabled — set LANGSMITH_API_KEY to enable tracing'}`);

  return config;
}

module.exports = load();
