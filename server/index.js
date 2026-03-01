'use strict';
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
const Anthropic      = require('@anthropic-ai/sdk');
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

// ── App + shared clients ──────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 3001;

const anthropic = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase  = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const auditLog  = makeAuditLog(supabase);
const rag       = makeRag(supabase);
const auth      = { requireAuth, requireRole };
const gdpImage  = { preprocessImage, detectBlueInkRegions };

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(authMiddleware);

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
['index', 'query', 'qa', 'workflow', 'dashboard', 'submissions', 'login', 'builder', 'readme', 'deck', 'feedback'].forEach(page => {
  app.get(`/${page === 'index' ? '' : page + '.html'}`, (req, res) => {
    const file = path.join(docsPath, page === 'index' ? 'index.html' : `${page}.html`);
    if (fs.existsSync(file)) return res.sendFile(file);
    res.status(404).send(`${page}.html not found at ${file}`);
  });
});

// ── Debug + health routes ─────────────────────────────────────────────────────
app.get('/debug-env', requireAuth, (req, res) => {
  const voyageKeys = Object.keys(process.env).filter(k => k.toLowerCase().includes('voyage'));
  res.json({ voyageKeys, allKeys: Object.keys(process.env).sort() });
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
    message: 'Vent server is running',
    authenticated: !!req.user,
    user: req.user ? { name: req.user.name, role: req.user.role } : null,
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

// ── Mount all route modules ───────────────────────────────────────────────────
const deps = { supabase, anthropic, auditLog, rag, auth, gdpImage, getVoyageClient, buildContactsContext };
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

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  const keys = ['ANTHROPIC_API_KEY','SUPABASE_URL','SUPABASE_KEY','VOYAGE_API_KEY','VOYAGE_KEY','ELEVENLABS_API_KEY'];
  keys.forEach(k => console.log(`[ENV] ${k}: ${process.env[k] ? 'SET' : 'MISSING'}`));
  console.log('[VOYAGE] Using key prefix:', getVoyageClient().key.slice(0,6));

  // Keep-alive: ping ourselves every 14 minutes to prevent Render free-tier sleep
  const KEEP_ALIVE_MS = 14 * 60 * 1000;
  const selfUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  setInterval(() => {
    fetch(`${selfUrl}/health`).catch(() => {});
    console.log('[KEEP-ALIVE] pinged', selfUrl);
  }, KEEP_ALIVE_MS);
});
