'use strict';
require('dotenv').config();

// ── Config must load first — validates env vars and exits if required ones are missing
const config = require('./lib/config');

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
const Anthropic        = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');

// ── Core library modules ──────────────────────────────────────────────────────
const { authMiddleware, requireAuth, requireRole } = require('./lib/auth');
const { makeAuditLog }                             = require('./lib/audit');
const { getVoyageClient, makeRag }                 = require('./lib/rag');
const { preprocessImage, detectBlueInkRegions }    = require('./lib/gdp-image');
const { buildContactsContext }                     = require('./data/contacts');

// ── Route modules ─────────────────────────────────────────────────────────────
const authRoutes     = require('./routes/auth');
const adminRoutes    = require('./routes/admin');
const submitRoutes   = require('./routes/submit');
const sopRoutes      = require('./routes/sop');
const capaRoutes     = require('./routes/capa');
const gdpRoutes      = require('./routes/gdp');
const builderRoutes  = require('./routes/builder');
const chatRoutes     = require('./routes/chat');
const voiceRoutes    = require('./routes/voice');
const feedbackRoutes = require('./routes/feedback');

// ── Middleware modules ─────────────────────────────────────────────────────────
const requestLogger = require('./middleware/request-logger');
const errorHandler  = require('./middleware/error-handler');

// ── Service factories ─────────────────────────────────────────────────────────
const makeSubmissionService  = require('./services/submission.service');
const makeSopService         = require('./services/sop.service');
const makeCapaService        = require('./services/capa.service');
const makeChatService        = require('./services/chat.service');
const makeSubmissionPipeline = require('./graphs/submission-pipeline');

// ── App + shared clients ──────────────────────────────────────────────────────
const app  = express();
const PORT = config.port;

const anthropic = (() => {
  const client = new Anthropic.default({ apiKey: config.anthropicApiKey });
  if (config.langsmithEnabled) {
    // langsmith's traceable() reads LANGCHAIN_* env vars, not LANGSMITH_* ones.
    // Set them programmatically so wrapSDK works regardless of which prefix the
    // user supplied in their .env file.
    process.env.LANGCHAIN_TRACING_V2 = 'true';
    process.env.LANGCHAIN_API_KEY    = config.langsmithApiKey;
    process.env.LANGCHAIN_PROJECT    = config.langsmithProject;

    const { Client }  = require('langsmith');
    const { wrapSDK } = require('langsmith/wrappers');

    // Pass an explicit Client instance so tracing never falls back to env-var
    // discovery and the project is always attributed correctly.
    const lsClient = new Client({ apiKey: config.langsmithApiKey });
    console.log(`[LANGSMITH] Tracing enabled — project: ${config.langsmithProject}`);
    return wrapSDK(client, { client: lsClient });
  }
  console.log('[LANGSMITH] Tracing disabled — set LANGSMITH_API_KEY + LANGSMITH_TRACING_V2=true to enable');
  return client;
})();
const supabase  = createClient(config.supabaseUrl, config.supabaseKey);
const auditLog  = makeAuditLog(supabase);
const rag       = makeRag(supabase);
const auth      = { requireAuth, requireRole };
const gdpImage  = { preprocessImage, detectBlueInkRegions };

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(authMiddleware);
app.use(requestLogger);

// ── Static file serving ───────────────────────────────────────────────────────
const docsFromServer = path.join(__dirname, '../docs');
const docsFromRoot   = path.join(process.cwd(), 'docs');
const docsPath = fs.existsSync(docsFromServer) ? docsFromServer : docsFromRoot;
console.log('[STATIC] __dirname:', __dirname);
console.log('[STATIC] cwd:', process.cwd());
console.log('[STATIC] docs path:', docsPath, '| exists:', fs.existsSync(docsPath));
try { console.log('[STATIC] files:', fs.readdirSync(docsPath).join(', ')); } catch(e) { console.log('[STATIC] readdir error:', e.message); }
app.use(express.static(docsPath, { etag: false, lastModified: false, setHeaders: (res) => { res.setHeader('Cache-Control', 'no-store'); } }));

// Serve PDF manuals from server/manuals/
const manualsPath = path.join(__dirname, 'manuals');
if (!fs.existsSync(manualsPath)) fs.mkdirSync(manualsPath, { recursive: true });
app.use('/manuals', express.static(manualsPath));

// Serve page index (built by build-page-index.js)
app.get('/manual/:docId/pages', (req, res) => {
  const indexFile = path.join(manualsPath, req.params.docId + '.pages.json');
  if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
  res.json({ pages: [] });
});

// Explicit HTML page routes (more reliable than express.static on Railway)
// Maps URL slug → file path relative to docsPath (now organised into subfolders)
const PAGE_MAP = {
  '':                 'operator/index.html',
  'query.html':       'operator/query.html',
  'feedback.html':    'operator/feedback.html',
  'qa.html':          'qa/qa.html',
  'workflow.html':    'qa/workflow.html',
  'submissions.html': 'qa/submissions.html',
  'dashboard.html':   'management/dashboard.html',
  'builder.html':     'admin/builder.html',
  'readme.html':      'admin/readme.html',
  'login.html':       'auth/login.html',
};
Object.entries(PAGE_MAP).forEach(([urlSlug, filePath]) => {
  app.get(`/${urlSlug}`, (req, res) => {
    const file = path.join(docsPath, filePath);
    if (fs.existsSync(file)) return res.sendFile(file);
    res.status(404).send(`${filePath} not found at ${file}`);
  });
});

// ── Debug + health routes ─────────────────────────────────────────────────────
app.get('/debug-env', requireAuth, (req, res) => {
  res.json({
    voyageKeySet:    !!config.voyageApiKey,
    voyageKeyPrefix: config.voyageApiKey ? config.voyageApiKey.slice(0, 6) : null,
    elevenLabsSet:   !!config.elevenLabsApiKey,
    nodeEnv:         config.nodeEnv,
  });
});

app.get('/debug-rag', requireAuth, async (req, res) => {
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

app.get('/health', (req, res) => {
  res.json({
    message:       'Vent server is running',
    authenticated: !!req.user,
    user:          req.user ? { name: req.user.name, role: req.user.role } : null,
    env: {
      anthropic:   true,  // guaranteed by config — server would have exited otherwise
      supabase:    true,
      voyage:      !!config.voyageApiKey,
      elevenLabs:  !!config.elevenLabsApiKey,
    },
  });
});

// ── Instantiate pipeline + services ───────────────────────────────────────────
const submissionPipeline = makeSubmissionPipeline({ anthropic, rag, buildContactsContext });
const submissionService  = makeSubmissionService({ supabase, anthropic, auditLog, rag, buildContactsContext, pipeline: submissionPipeline });
const sopService         = makeSopService({ supabase, anthropic, auditLog, rag, getVoyageClient });
const capaService        = makeCapaService({ supabase, auditLog });
const chatService        = makeChatService({ supabase, anthropic });

// ── Mount all route modules ───────────────────────────────────────────────────
const deps = { supabase, anthropic, auditLog, rag, auth, gdpImage, getVoyageClient, buildContactsContext,
               submissionService, sopService, capaService, chatService };
authRoutes(app, deps);
adminRoutes(app, deps);
submitRoutes(app, deps);
sopRoutes(app, deps);
capaRoutes(app, deps);
gdpRoutes(app, deps);
builderRoutes(app, deps);
chatRoutes(app, deps);
voiceRoutes(app, deps);
feedbackRoutes(app, deps);

// ── Centralised error handler (must be last) ──────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[SERVER] ✓ Vent running on port ${PORT} (${config.nodeEnv})`);

  // Keep-alive: ping ourselves every 14 minutes to prevent Render free-tier sleep
  const KEEP_ALIVE_MS = 14 * 60 * 1000;
  const selfUrl = config.renderExternalUrl || `http://localhost:${PORT}`;
  setInterval(() => {
    fetch(`${selfUrl}/health`).catch(() => {});
    console.log('[KEEP-ALIVE] pinged', selfUrl);
  }, KEEP_ALIVE_MS);
});
