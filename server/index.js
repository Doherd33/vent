require('dotenv').config();

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');
const { VoyageAIClient } = require('voyageai');
const { buildContactsContext } = require('./data/contacts');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── AUTH CONFIGURATION ──────────────────────────────────────────────────────
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'vent-prototype-secret-' + (process.env.SUPABASE_KEY || '').slice(0, 12);
const TOKEN_EXPIRY_HOURS = 24;

// Create HMAC-signed token
function createToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (TOKEN_EXPIRY_HOURS * 3600)
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(header + '.' + body).digest('base64url');
  return header + '.' + body + '.' + sig;
}

// Verify token — returns payload or null
function verifyToken(token) {
  try {
    const [header, body, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(header + '.' + body).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

// Hash password with salt
function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

// Verify password
function verifyPassword(password, hash, salt) {
  const result = hashPassword(password, salt);
  return result.hash === hash;
}

// Auth middleware — extracts user from token, attaches to req.user
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const user = verifyToken(token);
    if (user) {
      req.user = user;
    }
  }
  next();
}

// Require auth — rejects if no valid token
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// Require specific roles
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions. Required: ' + roles.join(' or ') });
    }
    next();
  };
}

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(authMiddleware); // Parse auth token on every request
const path = require('path');
const fs = require('fs');
// Try both possible docs locations depending on Railway's working directory
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

const anthropic = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
// Read voyage key lazily so Railway env vars are always current
// Hardcoded fallback ensures demo works even if Railway env var fails
const VOYAGE_FALLBACK = 'pa-iSnF7DHwQ-E0D5ykTEo3UoNBMXUhYfyk9zlDBMekV_e';
function getVoyageClient() {
  const raw = process.env.VOYAGE_KEY || process.env.VOYAGE_API_KEY || VOYAGE_FALLBACK;
  const key = raw.replace(/^["']|["']$/g, '');
  return { client: new VoyageAIClient({ apiKey: key }), key };
}

// Debug: dump all env var names so we can see what Railway is actually passing
app.get('/debug-env', requireAuth, (req, res) => {
  const voyageKeys = Object.keys(process.env).filter(k => k.toLowerCase().includes('voyage'));
  res.json({ voyageKeys, allKeys: Object.keys(process.env).sort() });
});

// Debug: test the full RAG pipeline
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

// Explicit HTML page routes (more reliable than express.static on Railway)
['index', 'query', 'qa', 'workflow', 'dashboard', 'submissions', 'login', 'builder', 'readme', 'deck'].forEach(page => {
  app.get(`/${page === 'index' ? '' : page + '.html'}`, (req, res) => {
    const file = path.join(docsPath, page === 'index' ? 'index.html' : `${page}.html`);
    if (fs.existsSync(file)) return res.sendFile(file);
    res.status(404).send(`${page}.html not found at ${file}`);
  });
});

// Health check
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

// ─── AUTHENTICATION ROUTES ──────────────────────────────────────────────────

// POST /auth/register — create a new user account
// Prototype mode: open registration. For production, re-enable admin-only gate.
app.post('/auth/register', async (req, res) => {
  const { email, password, name, role } = req.body;
  
  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: 'email, password, name, and role are required' });
  }
  
  const validRoles = ['operator', 'qa', 'director', 'msat', 'engineering', 'admin'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be one of: ' + validRoles.join(', ') });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  // Check if user already exists
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .limit(1);
  
  if (existing && existing.length) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  // Hash password and create user
  const { hash, salt } = hashPassword(password);
  const userId = crypto.randomUUID();

  const { error } = await supabase.from('users').insert({
    id: userId,
    email: email.toLowerCase().trim(),
    name: name.trim(),
    role,
    password_hash: hash,
    password_salt: salt
  });

  if (error) {
    if (error.message.includes('does not exist')) {
      return res.status(400).json({ error: 'users table does not exist. Run the setup SQL from GET /admin/setup' });
    }
    return res.status(500).json({ error: error.message });
  }

  // Create token
  const token = createToken({ id: userId, email: email.toLowerCase().trim(), name: name.trim(), role });

  await auditLog({
    userId: name.trim(),
    userRole: role,
    action: 'user_registered',
    entityType: 'user',
    entityId: userId,
    after: { email, name, role },
    reason: 'New user account created',
    req
  });

  res.json({ ok: true, token, user: { id: userId, email, name: name.trim(), role } });
});

// POST /auth/login — sign in with email and password
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .limit(1);

  if (error) {
    if (error.message.includes('does not exist')) {
      return res.status(400).json({ error: 'users table does not exist. Run the setup SQL.' });
    }
    return res.status(500).json({ error: error.message });
  }

  if (!users || !users.length) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const user = users[0];
  
  if (!verifyPassword(password, user.password_hash, user.password_salt)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = createToken({ id: user.id, email: user.email, name: user.name, role: user.role });

  await auditLog({
    userId: user.name,
    userRole: user.role,
    action: 'user_login',
    entityType: 'user',
    entityId: user.id,
    after: { email: user.email, role: user.role },
    reason: 'User signed in',
    req
  });

  res.json({ ok: true, token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

// GET /auth/me — verify token and return current user info
app.get('/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// POST /auth/change-password — change password for current user
app.post('/auth/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('id', req.user.id)
    .limit(1);

  if (!users || !users.length) {
    return res.status(404).json({ error: 'User not found' });
  }

  const user = users[0];
  if (!verifyPassword(currentPassword, user.password_hash, user.password_salt)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const { hash, salt } = hashPassword(newPassword);
  const { error } = await supabase
    .from('users')
    .update({ password_hash: hash, password_salt: salt, updated_at: new Date().toISOString() })
    .eq('id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });

  await auditLog({
    userId: user.name,
    userRole: user.role,
    action: 'password_changed',
    entityType: 'user',
    entityId: user.id,
    after: {},
    reason: 'User changed their password',
    req
  });

  res.json({ ok: true });
});

// ─── AUDIT LOG INFRASTRUCTURE ─────────────────────────────────────────────────

// Immutable append-only audit log — 21 CFR Part 11 / EU Annex 11 compliant
async function auditLog({ userId, userRole, action, entityType, entityId, before, after, reason, req }) {
  const ts = new Date().toISOString();
  const content = JSON.stringify({ userId, userRole, action, entityType, entityId, before, after, reason, ts });
  const checksum = crypto.createHash('sha256').update(content).digest('hex');
  try {
    const { error } = await supabase.from('audit_log').insert({
      user_id:    userId || 'system',
      user_role:  userRole || 'system',
      action,
      entity_type: entityType,
      entity_id:   entityId,
      before_val:  before || null,
      after_val:   after || {},
      reason:      reason || null,
      ip_address:  req ? (req.headers['x-forwarded-for'] || req.ip || '') : '',
      user_agent:  req ? (req.headers['user-agent'] || '') : '',
      checksum
    });
    if (error) console.error('[AUDIT] Insert error:', error.message);
    else console.log(`[AUDIT] ${action} on ${entityType}:${entityId} by ${userId}`);
  } catch (err) {
    // Audit failures are logged but don't break the operation
    console.error('[AUDIT] Failed:', err.message);
  }
}

// GET /admin/setup — returns SQL to create audit_log table in Supabase
app.get('/admin/setup', (req, res) => {
  const sql = `
-- ═══════════════════════════════════════════════════════════════
-- VENT Full Database Setup — 21 CFR Part 11 / EU Annex 11
-- Run this in your Supabase SQL Editor (one-time setup)
-- ═══════════════════════════════════════════════════════════════

-- ── Audit Log (immutable) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp   TIMESTAMPTZ DEFAULT now() NOT NULL,
  user_id     TEXT NOT NULL,
  user_role   TEXT NOT NULL,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  before_val  JSONB,
  after_val   JSONB NOT NULL DEFAULT '{}'::jsonb,
  reason      TEXT,
  ip_address  TEXT,
  user_agent  TEXT,
  checksum    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user   ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_time   ON audit_log(timestamp DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS audit_insert ON audit_log FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY IF NOT EXISTS audit_select ON audit_log FOR SELECT TO authenticated, anon USING (true);

COMMENT ON TABLE audit_log IS 'Immutable audit trail — 21 CFR Part 11 / EU Annex 11. No UPDATE or DELETE.';

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY,
  email          TEXT UNIQUE NOT NULL,
  name           TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'operator',
  password_hash  TEXT NOT NULL,
  password_salt  TEXT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS users_all ON users FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- ── QA Notes ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qa_notes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content    TEXT NOT NULL DEFAULT '',
  user_id    TEXT NOT NULL DEFAULT 'unknown',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE qa_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS qa_notes_all ON qa_notes FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- ── SOP Change Management ────────────────────────────────────
CREATE TABLE IF NOT EXISTS sop_changes (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  change_key      TEXT NOT NULL,
  submission_ref  TEXT NOT NULL,
  sop_code        TEXT NOT NULL,
  section         TEXT DEFAULT '',
  action          TEXT NOT NULL,              -- draft, accepted, rejected
  draft_text      TEXT,
  reason          TEXT,
  user_id         TEXT NOT NULL DEFAULT 'unknown',
  user_role       TEXT NOT NULL DEFAULT 'unknown',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sop_changes_sub ON sop_changes(submission_ref);
CREATE INDEX IF NOT EXISTS idx_sop_changes_key ON sop_changes(change_key);

ALTER TABLE sop_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS sop_changes_all ON sop_changes FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- ── SOP Annotations ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sop_annotations (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  change_key      TEXT NOT NULL,
  submission_ref  TEXT NOT NULL,
  sop_code        TEXT NOT NULL,
  section         TEXT DEFAULT '',
  text            TEXT NOT NULL,
  user_id         TEXT NOT NULL DEFAULT 'unknown',
  user_role       TEXT NOT NULL DEFAULT 'unknown',
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sop_anno_key ON sop_annotations(change_key);
CREATE INDEX IF NOT EXISTS idx_sop_anno_sub ON sop_annotations(submission_ref);

ALTER TABLE sop_annotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS sop_annotations_all ON sop_annotations FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- ── Notifications ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         TEXT NOT NULL,
  user_role       TEXT DEFAULT 'unknown',
  type            TEXT NOT NULL,               -- submission_routed, status_changed, capa_assigned, etc.
  title           TEXT NOT NULL,
  body            TEXT DEFAULT '',
  entity_type     TEXT DEFAULT 'submission',
  entity_id       TEXT DEFAULT '',
  workflow_phase  INT DEFAULT 1,
  why             TEXT DEFAULT '',
  read            BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notify_user ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notify_entity ON notifications(entity_id);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS notifications_all ON notifications FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- ── CAPA Tracking ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS capas (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  capa_id         TEXT UNIQUE NOT NULL,
  submission_ref  TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT DEFAULT '',
  timing          TEXT DEFAULT 'short',        -- immediate, short, long
  timing_label    TEXT DEFAULT '',
  owner           TEXT DEFAULT 'Unassigned',
  owner_role      TEXT DEFAULT '',
  due_date        DATE,
  status          TEXT DEFAULT 'open',          -- open, in_progress, closed, overdue
  evidence        TEXT,
  closed_by       TEXT,
  closed_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_capas_sub ON capas(submission_ref);
CREATE INDEX IF NOT EXISTS idx_capas_status ON capas(status);
CREATE INDEX IF NOT EXISTS idx_capas_owner ON capas(owner);

ALTER TABLE capas ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS capas_all ON capas FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- ── Doc Builder documents ────────────────────────────────────
CREATE TABLE IF NOT EXISTS builder_docs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     TEXT NOT NULL,
  client_id   TEXT NOT NULL,
  title       TEXT NOT NULL DEFAULT 'Untitled',
  area        TEXT NOT NULL DEFAULT 'Other',
  description TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'draft',
  steps       JSONB DEFAULT '[]'::jsonb,
  versions    JSONB DEFAULT '[]'::jsonb,
  source      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_builder_docs_user   ON builder_docs(user_id);
CREATE INDEX IF NOT EXISTS idx_builder_docs_client ON builder_docs(client_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_builder_docs_user_client ON builder_docs(user_id, client_id);
ALTER TABLE builder_docs ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS builder_docs_all ON builder_docs FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- ── Add status column to submissions if missing ──────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='submissions' AND column_name='status') THEN
    ALTER TABLE submissions ADD COLUMN status TEXT DEFAULT 'new';
  END IF;
END $$;

-- ── GDP Documents ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gdp_documents (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           TEXT NOT NULL,
  filename          TEXT DEFAULT 'Untitled',
  page_count        INT DEFAULT 0,
  total_errors      INT DEFAULT 0,
  critical_count    INT DEFAULT 0,
  major_count       INT DEFAULT 0,
  minor_count       INT DEFAULT 0,
  recommendations   JSONB DEFAULT '[]'::jsonb,
  review_status     TEXT DEFAULT 'pending_review',
  processing_status TEXT DEFAULT 'complete',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gdp_docs_user ON gdp_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_gdp_docs_status ON gdp_documents(review_status);

ALTER TABLE gdp_documents ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY gdp_documents_all ON gdp_documents FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── GDP Findings (one row per entry/error per page) ─────────
CREATE TABLE IF NOT EXISTS gdp_findings (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id         UUID NOT NULL REFERENCES gdp_documents(id) ON DELETE CASCADE,
  page_number         INT NOT NULL,
  region_index        INT,
  classification      TEXT DEFAULT 'handwritten',
  ink_color           TEXT DEFAULT 'blue',
  bbox                JSONB,
  extracted_text      TEXT DEFAULT '',
  error_type          TEXT,
  severity            TEXT,
  title               TEXT DEFAULT '',
  location            TEXT DEFAULT '',
  description         TEXT DEFAULT '',
  correction          TEXT DEFAULT '',
  status              TEXT DEFAULT 'ok',
  confidence          REAL,
  entry_id            INT,
  manually_corrected  BOOLEAN DEFAULT false,
  corrected_text      TEXT,
  corrected_by        TEXT,
  corrected_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gdp_findings_doc ON gdp_findings(document_id);
CREATE INDEX IF NOT EXISTS idx_gdp_findings_error ON gdp_findings(error_type);

ALTER TABLE gdp_findings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY gdp_findings_all ON gdp_findings FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
  `.trim();
  res.type('text/plain').send(sql);
});

// POST /admin/setup — attempt to create the table via Supabase
app.post('/admin/setup', async (req, res) => {
  // Try to create audit_log by inserting a bootstrap row
  // If the table doesn't exist, this will fail with a clear message
  const testRow = {
    user_id: 'system',
    user_role: 'system',
    action: 'system_setup',
    entity_type: 'system',
    entity_id: 'audit_log',
    after_val: { event: 'Audit log table initialized', version: '1.0' },
    reason: 'System setup — audit trail activated',
    ip_address: '',
    user_agent: 'vent-server/setup',
    checksum: crypto.createHash('sha256').update('setup-' + Date.now()).digest('hex')
  };
  const { error } = await supabase.from('audit_log').insert(testRow);
  if (error) {
    if (error.message.includes('does not exist') || error.code === '42P01') {
      return res.status(400).json({
        error: 'audit_log table does not exist yet',
        instructions: 'Visit GET /admin/setup to get the SQL, then run it in your Supabase SQL Editor',
        setupUrl: '/admin/setup'
      });
    }
    return res.status(500).json({ error: error.message });
  }
  res.json({ success: true, message: 'Audit log table exists and is working. Bootstrap entry written.' });
});

// POST /admin/bootstrap — create the first admin user (only works when zero users exist)
app.post('/admin/bootstrap', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, and name are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  // Check if any users exist
  const { data: existing, error: checkErr } = await supabase
    .from('users')
    .select('id')
    .limit(1);

  if (checkErr) {
    return res.status(500).json({ error: 'Could not check users table: ' + checkErr.message });
  }

  if (existing && existing.length > 0) {
    return res.status(403).json({ error: 'Users already exist. Bootstrap is disabled. Use /auth/register with admin auth.' });
  }

  // Create admin user
  const { hash, salt } = hashPassword(password);
  const userId = crypto.randomUUID();

  const { error } = await supabase.from('users').insert({
    id: userId,
    email: email.toLowerCase().trim(),
    name: name.trim(),
    role: 'admin',
    password_hash: hash,
    password_salt: salt
  });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const token = createToken({ id: userId, email: email.toLowerCase().trim(), name: name.trim(), role: 'admin' });

  await auditLog({
    userId: name.trim(),
    userRole: 'admin',
    action: 'admin_bootstrap',
    entityType: 'user',
    entityId: userId,
    after: { email, name, role: 'admin' },
    reason: 'First admin account created via bootstrap',
    req
  });

  console.log(`[BOOTSTRAP] First admin created: ${email}`);
  res.json({ ok: true, token, user: { id: userId, email, name: name.trim(), role: 'admin' } });
});

// GET /audit/:entityId — retrieve full audit trail for a submission or entity
app.get('/audit/:entityId', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('entity_id', req.params.entityId)
    .order('timestamp', { ascending: true });
  if (error) {
    // Table might not exist yet
    if (error.message.includes('does not exist')) {
      return res.json([]);
    }
    return res.status(500).json({ error: error.message });
  }
  res.json(data || []);
});

// GET /audit — retrieve recent audit entries (last 100)
app.get('/audit', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(100);
  if (error) {
    if (error.message.includes('does not exist')) return res.json([]);
    return res.status(500).json({ error: error.message });
  }
  res.json(data || []);
});

// Text search fallback when Voyage is unavailable
async function getChunksByText(query) {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  if (!words.length) return [];
  const { data, error } = await supabase
    .from('sop_chunks')
    .select('doc_id, doc_title, section_title, content')
    .or(words.slice(0, 3).map(w => `content.ilike.%${w}%`).join(','))
    .limit(6);
  if (error) { console.error('Text search error:', error.message); return []; }
  return (data || []).map(c => ({ ...c, similarity: 0.5 }));
}

// Search Supabase for SOP chunks relevant to the observation
async function getRelevantChunks(observation, area) {
  const { client: voyage, key } = getVoyageClient();
  if (key) {
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
      if (!error && data && data.length) return data;
      console.warn('Vector search returned nothing, falling back to text search');
    } catch (err) {
      console.warn('Voyage failed, falling back to text search:', err.message);
    }
  } else {
    console.warn('No Voyage key — using text search fallback');
  }
  return getChunksByText(`${area} ${observation}`);
}

// Format retrieved SOP chunks into a readable context block for Claude
function buildSopContext(chunks) {
  if (!chunks.length) return 'No specific SOP sections retrieved for this observation.';

  return chunks
    .map(c => `Document: ${c.doc_id} — ${c.doc_title}\nSection: ${c.section_title}\n\n${c.content}`)
    .join('\n\n---\n\n');
}

// ─── CROSS-SUBMISSION PATTERN DETECTION ──────────────────────────────────────

// Search existing submissions for similar observations
async function findSimilarSubmissions(observation, area) {
  try {
    // Text-based similarity search against existing submissions
    const words = observation.toLowerCase().split(/\s+/)
      .filter(w => w.length > 4)
      .slice(0, 5);
    if (!words.length) return { matches: [], count: 0 };

    const { data, error } = await supabase
      .from('submissions')
      .select('ref_code, process_area, priority, raw_text, created_at, status, structured')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !data) return { matches: [], count: 0 };

    // Score each submission by keyword overlap
    const scored = data.map(row => {
      const text = (row.raw_text || '').toLowerCase();
      const matchedWords = words.filter(w => text.includes(w));
      const areaMatch = (row.process_area || '').toLowerCase() === (area || '').toLowerCase();
      const score = matchedWords.length + (areaMatch ? 1.5 : 0);
      return { ...row, score, matchedWords };
    }).filter(r => r.score >= 2)  // At least 2 keyword matches to be considered similar
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return {
      matches: scored.map(s => ({
        ref: s.ref_code,
        area: s.process_area,
        priority: s.priority,
        status: s.status || 'new',
        date: s.created_at,
        excerpt: (s.raw_text || '').slice(0, 150),
        matchedWords: s.matchedWords,
        score: s.score
      })),
      count: scored.length,
      totalSubmissions: data.length
    };
  } catch (err) {
    console.warn('Pattern detection failed:', err.message);
    return { matches: [], count: 0 };
  }
}

// Build pattern context string for Claude
function buildPatternContext(patterns) {
  if (!patterns.matches.length) {
    return 'No similar previous submissions found in the database.';
  }
  const lines = patterns.matches.map((m, i) =>
    `${i + 1}. ${m.ref} (${m.area}, ${m.priority}, ${m.status}) — ${m.date.slice(0, 10)}\n   "${m.excerpt}"`
  );
  return `${patterns.count} similar submission(s) found out of ${patterns.totalSubmissions} total:\n\n${lines.join('\n\n')}`;
}

// GET /patterns?observation=...&area=... — standalone pattern search endpoint
app.get('/patterns', requireAuth, async (req, res) => {
  const { observation, area } = req.query;
  if (!observation) return res.status(400).json({ error: 'observation query param required' });
  const patterns = await findSimilarSubmissions(observation, area);
  res.json(patterns);
});

// Submit route
app.post('/submit', requireAuth, async (req, res) => {
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

    // Step 2.5: Search for similar past submissions (pattern detection)
    const patterns = await findSimilarSubmissions(observation, area);
    const patternContext = buildPatternContext(patterns);
    console.log(`[${refCode}] Pattern detection: ${patterns.count} similar submission(s) found`);

    // Step 3: Send to Claude with real SOP content, real contacts, and real patterns as grounding
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

════ SIMILAR PAST SUBMISSIONS ════
${patternContext}
══════════════════════════════════

Process area: ${area}
Shift: ${shift}
Operator observation: "${observation}"

Return ONLY valid JSON — no markdown fences, no preamble, no explanation outside the JSON.

{
  "priority": "High or Medium or Low",
  "sopRefs": [{ "code": "doc_id from above e.g. WX-SOP-1001-03", "title": "document title", "step": "actual section number e.g. 8.6.1.4", "relevance": "one sentence explaining connection to observation", "flag": "gap or ambiguous or compliant" }],
  "bprRefs": [{ "code": "WX-BPR-2001-03 if relevant", "title": "Batch Production Record", "step": "section ref", "relevance": "one sentence", "flag": "gap or ambiguous or compliant" }],
  "sciEval": { "summary": "3-4 sentences grounded in the retrieved SOP content", "rootCauseHypothesis": "one sentence", "riskLevel": "High or Medium or Low", "affectedParameter": "specific parameter name", "regulatoryFlag": "Yes or No", "regulatoryNote": "one sentence citing relevant regulation or SOP requirement" },
  "correctiveActions": [{ "title": "action title", "description": "specific description referencing actual SOP steps where possible", "timing": "immediate or short or long", "timingLabel": "e.g. Within 24 hours" }],
  "contacts": [{ "name": "exact name from directory", "role": "exact role from directory", "dept": "exact dept from directory", "deptLabel": "exact deptLabel from directory", "avatarClass": "exact avatarClass from directory", "initials": "exact initials from directory", "workflowPhase": 1, "why": "one sentence specific to this observation explaining why this person needs to act" }],
  "timeline": [{ "state": "done or now or next or later", "when": "timeframe", "event": "event title", "detail": "one sentence" }],
  "pattern": { "summary": "two sentences on whether this is a recurring pattern based on the SIMILAR PAST SUBMISSIONS data above", "currentCount": ${patterns.count + 1}, "threshold": 3 }
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
      // Audit: log the submission creation
      await auditLog({
        userId: shift || 'operator',
        userRole: 'operator',
        action: 'submission_created',
        entityType: 'submission',
        entityId: refCode,
        after: { priority: feedback.priority, area, shift, sopRefs: (feedback.sopRefs || []).map(s => s.code) },
        reason: 'Operator submitted observation via Query page',
        req
      });

      // Notify routed contacts
      await notifyContacts(
        { refCode, priority: feedback.priority, observation },
        feedback.contacts || []
      );

      // Auto-create CAPAs from corrective actions
      for (const ca of (feedback.correctiveActions || [])) {
        try {
          const capaId = 'CAPA-' + Math.floor(1000 + Math.random() * 8999);
          // Find the best matching contact to assign as owner
          const matchContact = (feedback.contacts || [])
            .sort((a, b) => (a.workflowPhase || 99) - (b.workflowPhase || 99))
            .find(c => c.workflowPhase >= 2) || (feedback.contacts || [])[0];
          await supabase.from('capas').insert({
            capa_id: capaId,
            submission_ref: refCode,
            title: ca.title,
            description: ca.description || '',
            timing: ca.timing || 'short',
            timing_label: ca.timingLabel || '',
            owner: matchContact ? matchContact.name : 'Unassigned',
            owner_role: matchContact ? matchContact.role : '',
            due_date: ca.timing === 'immediate' ? new Date(Date.now() + 86400000).toISOString().slice(0, 10)
                     : ca.timing === 'short' ? new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
                     : new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
            status: 'open'
          }).then(() => console.log(`[${refCode}] CAPA ${capaId} created: ${ca.title}`))
            .catch(e => console.warn(`[${refCode}] CAPA creation skipped:`, e.message));
        } catch (e) { /* table may not exist yet */ }
      }
    }

    res.json({ ...feedback, refCode });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// POST /sop/discover — AI-powered natural language SOP finder
app.post('/sop/discover', requireAuth, async (req, res) => {
  const { description } = req.body;
  if (!description || description.length < 5) {
    return res.status(400).json({ error: 'Description too short' });
  }

  try {
    // Use Voyage to find semantically relevant chunks
    const chunks = await getRelevantChunks(description, 'General');
    if (!chunks.length) {
      return res.json({ message: 'No matching SOPs found for that description.', results: [] });
    }

    // Deduplicate by doc_id, keeping highest similarity
    const docMap = {};
    chunks.forEach(c => {
      if (!docMap[c.doc_id] || c.similarity > docMap[c.doc_id].similarity) {
        docMap[c.doc_id] = c;
      }
    });
    const uniqueDocs = Object.values(docMap);

    // Ask Claude to summarise which SOPs are relevant and why
    const sopList = uniqueDocs.map(c =>
      `- ${c.doc_id} (${c.doc_title}): Section "${c.section_title}" — ${c.content.substring(0, 200)}`
    ).join('\n');

    const aiRes = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [{ role: 'user', content: `A user in a biologics manufacturing facility described what they are working on:

"${description}"

Here are the SOP documents that matched their description:
${sopList}

Respond with a short, helpful message (2-4 sentences max) explaining which SOPs are relevant and why. Be conversational and friendly. Reference each SOP by its doc_id. Do NOT use markdown or formatting — plain text only.` }]
    });

    const message = aiRes.content[0]?.text || 'Found some relevant SOPs for you.';

    res.json({
      message,
      results: uniqueDocs.map(c => ({
        doc_id: c.doc_id,
        doc_title: c.doc_title || '',
        section_title: c.section_title,
        similarity: c.similarity
      }))
    });
  } catch (err) {
    console.error('SOP discover error:', err);
    res.status(500).json({ error: 'Failed to find SOPs' });
  }
});

// GET /sop/search?q=... — search SOPs by title/content (MUST be before /sop/:docId)
// Fetches first chunk per doc_id, then filters server-side.
app.get('/sop/search', requireAuth, async (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  try {
    const knownDocs = ['WX-SOP-1001-03','WX-SOP-1002-03','WX-SOP-1003-03','WX-SOP-1004-03','WX-SOP-1005-03','WX-BPR-2001-03'];
    const allChunks = [];
    for (const docId of knownDocs) {
      const { data } = await supabase
        .from('sop_chunks')
        .select('section_title, content')
        .eq('doc_id', docId)
        .order('created_at', { ascending: true })
        .limit(1);
      if (data && data.length) allChunks.push({ doc_id: docId, ...data[0] });
    }
    const filtered = q.length >= 2
      ? allChunks.filter(r => (r.content || '').toLowerCase().includes(q) || (r.section_title || '').toLowerCase().includes(q) || (r.doc_id || '').toLowerCase().includes(q))
      : allChunks;
    res.json(filtered);
  } catch (err) {
    console.error('SOP search error:', err);
    res.status(500).json({ error: 'Failed to search SOPs' });
  }
});

// GET /sop/:docId — fetch all chunks for a document
app.get('/sop/:docId', requireAuth, async (req, res) => {
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
app.get('/sop/:docId/chunk', requireAuth, async (req, res) => {
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

  const prefix = section.split('.').slice(0, 3).join('.');
  const broader = section.split('.').slice(0, 2).join('.');

  let match = data.find(c => c.section_title && c.section_title.startsWith(prefix))
           || data.find(c => c.section_title && c.section_title.startsWith(broader))
           || data.find(c => c.section_title && c.section_title.includes(broader))
           || data[0];

  res.json(match);
});

// GET /sop/:docId/rationale — fetch rationale explanations for a BPR/SOP
app.get('/sop/:docId/rationale', requireAuth, (req, res) => {
  const docId = req.params.docId;
  const filePath = path.join(__dirname, 'docs', 'rationale', docId + '.json');
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(data);
  } catch (err) {
    if (err.code === 'ENOENT') return res.json([]);
    console.error('Rationale fetch error:', err);
    res.status(500).json({ error: 'Failed to load rationale' });
  }
});

// POST /sop/:docId/ask — ask a question scoped to a single SOP document
app.post('/sop/:docId/ask', requireAuth, async (req, res) => {
  const { question } = req.body;
  const docId = req.params.docId;

  if (!question || question.length < 3) {
    return res.status(400).json({ error: 'Question too short' });
  }

  try {
    // Fetch all chunks for this specific document
    const { data: chunks, error } = await supabase
      .from('sop_chunks')
      .select('section_title, content')
      .eq('doc_id', docId)
      .order('created_at', { ascending: true });

    if (error || !chunks || !chunks.length) {
      return res.status(404).json({ error: 'No content found for this document' });
    }

    const sopContext = chunks
      .map(c => `Section: ${c.section_title}\n${c.content}`)
      .join('\n\n---\n\n');

    console.log(`[SOP-ASK] "${question.slice(0, 60)}" in ${docId} — ${chunks.length} sections`);

    const aiRes = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{ role: 'user', content: `You are a concise SOP assistant. Answer the operator's question using ONLY the content from document ${docId} below.

RULES:
- Be concise — 2-4 sentences max unless a detailed procedure is needed.
- Reference the specific section(s) where the answer comes from.
- If the answer isn't in this document, say so clearly.
- Plain text only, no markdown formatting.

════ ${docId} CONTENT ════
${sopContext}
═════════════════════════

Question: "${question}"` }]
    });

    const answer = aiRes.content[0]?.text || 'No answer could be generated.';
    res.json({ answer });
  } catch (err) {
    console.error('SOP ask error:', err);
    res.status(500).json({ error: 'Failed to answer question' });
  }
});

// GET /submissions — fetch all for the dashboard
app.get('/submissions', requireAuth, async (req, res) => {
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
app.get('/submissions/:refCode', requireAuth, async (req, res) => {
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

// PATCH /submissions/:refCode/status — update workflow status with audit trail
app.patch('/submissions/:refCode/status', requireRole('qa', 'director', 'admin'), async (req, res) => {
  const { status, userId, userRole, reason, meaning } = req.body;
  const validStatuses = ['new', 'acknowledged', 'under_review', 'corrective_action', 'qa_approved', 'director_signoff', 'closed', 'rejected'];
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') });
  }

  // E-signature required for approval / signoff / close transitions
  const requiresSignature = ['qa_approved', 'director_signoff', 'closed', 'rejected'].includes(status);
  if (requiresSignature && (!userId || !reason)) {
    return res.status(400).json({ error: 'Electronic signature required: userId and reason must be provided for this transition' });
  }

  // Fetch current state for before_val
  const { data: current, error: fetchErr } = await supabase
    .from('submissions')
    .select('status, ref_code, priority')
    .eq('ref_code', req.params.refCode)
    .single();

  if (fetchErr || !current) {
    return res.status(404).json({ error: 'Submission not found' });
  }

  const previousStatus = current.status;

  // Update status
  const { error } = await supabase
    .from('submissions')
    .update({ status })
    .eq('ref_code', req.params.refCode);

  if (error) {
    console.error('Status update error:', error);
    return res.status(500).json({ error: 'Failed to update status' });
  }

  // Write audit entry
  await auditLog({
    userId: userId || 'unknown',
    userRole: userRole || 'unknown',
    action: 'status_changed',
    entityType: 'submission',
    entityId: req.params.refCode,
    before: { status: previousStatus },
    after: { status, ...(meaning ? { signatureMeaning: meaning } : {}) },
    reason: reason || `Status changed from ${previousStatus} to ${status}`,
    req
  });

  res.json({ ok: true, previousStatus, newStatus: status,
    auditEntry: { userId, action: 'status_changed', from: previousStatus, to: status, meaning, reason }
  });
});

// POST /query — operator SOP knowledge search (with conversation history)
app.post('/query', requireAuth, async (req, res) => {
  const { question, area, history } = req.body;

  if (!question || question.length < 5) {
    return res.status(400).json({ error: 'Question too short' });
  }

  try {
    const chunks = await getRelevantChunks(question, area || 'Upstream');
    const sopContext = buildSopContext(chunks);

    console.log(`[QUERY] "${question.slice(0, 60)}" — ${chunks.length} chunks retrieved, history: ${(history || []).length} turns`);

    // Build conversation context from history (last 6 turns max)
    let conversationContext = '';
    if (history && history.length) {
      const recent = history.slice(-6);
      conversationContext = '\n\n════ CONVERSATION HISTORY ════\n' +
        recent.map(h => h.role === 'user'
          ? `Operator asked: "${h.content}"`
          : `You answered: "${h.summary || '(no summary)'}"`)
        .join('\n') +
        '\n══════════════════════════════\n\nThe operator is now asking a FOLLOW-UP question. Use the conversation context above to understand what they are referring to.';
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `You are a concise SOP assistant for a biologics manufacturing facility. Answer the operator's question using ONLY the SOP content below.

CRITICAL RULES:
- Be VERY concise. Summary: 1–2 sentences max. Steps: 5 or fewer.
- Do NOT dump large blocks of text. Distil the key information.
- If the operator asks for images, pictures, or diagrams: the system will show relevant manual pages alongside your answer. Give a SHORT description (1–2 sentences) and mention a diagram is shown below.
- Only include steps if the question is procedural. Only include params if asking about values.
- Only include warnings if they are genuine safety risks.
- Omit empty arrays — do not include steps, params, warnings, or notes if they would be empty.
- ALWAYS set diagramHint to specific equipment/component keywords for the best matching diagram page. Be specific: "hardware front view", "reagent disk assembly", "cuvette rotor", "sample rack positions", "touchscreen main menu". If the question is about a specific part, name that part.

════ SOP CONTENT ════
${sopContext}
═════════════════════
${conversationContext}

Area: ${area || 'Upstream'}
Question: "${question}"

Return ONLY valid JSON — no markdown, no fences, no preamble.

{
  "category": "procedure|specification|troubleshooting|general",
  "summary": "1–2 sentence answer. Be direct and concise.",
  "diagramHint": "specific equipment/component keyword for diagram lookup e.g. 'hardware front view' or 'reagent disk' or 'cuvette rotor' — be specific to what the operator is asking about",
  "steps": [{ "n": 1, "action": "short instruction", "detail": "extra detail or null", "critical": false, "value": "target value or null" }],
  "params": [{ "name": "param", "value": "val", "unit": "unit", "range": "range or null", "flag": "critical or normal" }],
  "warnings": ["only real safety warnings"],
  "notes": ["brief note"],
  "sources": [{ "code": "doc_id", "title": "doc title", "section": "section ref" }],
  "followUps": ["2-3 natural follow-up questions the operator might ask next based on this answer — short, specific, actionable"]
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

// ─── SOP INGEST ROUTE ──────────────────────────────────────────────────────
app.post('/ingest', requireRole('admin'), async (req, res) => {
  const DOCS_DIR = path.join(__dirname, 'docs/sops');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  try {
    // Clear existing chunks
    const { error: delErr } = await supabase.from('sop_chunks').delete().gte('created_at','2000-01-01');
    if (delErr) return res.status(500).json({ error: 'Clear failed: ' + delErr.message });

    const files = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.md'));
    const { client: voyage } = getVoyageClient();
    let total = 0;
    const details = [];

    for (const file of files) {
      const docId = file.replace('.md', '');
      const content = fs.readFileSync(path.join(DOCS_DIR, file), 'utf8');

      // Parse into chunks by heading
      const titleMatch = content.match(/\*\*Title\*\*\s*\|\s*(.+)/);
      const docTitle = titleMatch ? titleMatch[1].trim() : docId;
      const chunks = [];
      const lines = content.split('\n');
      let curTitle = 'Overview', curLines = [];
      for (const line of lines) {
        if (line.match(/^#{2,4}\s+/)) {
          const text = curLines.join('\n').trim();
          if (text.length > 80) chunks.push({ doc_id: docId, doc_title: docTitle, section_title: curTitle, content: `[${docId}] ${docTitle}\nSection: ${curTitle}\n\n${text}` });
          curTitle = line.replace(/^#+\s+/, '').trim();
          curLines = [];
        } else { curLines.push(line); }
      }
      const lastText = curLines.join('\n').trim();
      if (lastText.length > 80) chunks.push({ doc_id: docId, doc_title: docTitle, section_title: curTitle, content: `[${docId}] ${docTitle}\nSection: ${curTitle}\n\n${lastText}` });

      // Embed and store each chunk
      for (const chunk of chunks) {
        const r = await voyage.embed({ input: [chunk.content], model: 'voyage-3-lite' });
        const { error } = await supabase.from('sop_chunks').insert({ ...chunk, embedding: r.data[0].embedding });
        if (error) console.error(`Chunk error (${docId}):`, error.message);
        await sleep(120);
      }
      total += chunks.length;
      details.push({ docId, chunks: chunks.length });
    }

    res.json({ success: true, totalChunks: total, documents: details });
  } catch (err) {
    console.error('Ingest error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── NOTES ──────────────────────────────────────────────────────────────────
// Simple session notes persisted to Supabase (qa_notes table)
app.get('/notes', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('qa_notes')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1);
  if (error) {
    // Table may not exist yet — return empty
    if (error.message.includes('does not exist')) return res.json([]);
    return res.status(500).json({ error: error.message });
  }
  res.json(data || []);
});

app.post('/notes', requireAuth, async (req, res) => {
  const { content, userId } = req.body;
  // Upsert: update the single notes row or create it
  const { data: existing } = await supabase
    .from('qa_notes')
    .select('id')
    .limit(1);
  
  if (existing && existing.length) {
    const { error } = await supabase
      .from('qa_notes')
      .update({ content, user_id: userId || 'unknown', updated_at: new Date().toISOString() })
      .eq('id', existing[0].id);
    if (error) return res.status(500).json({ error: error.message });
  } else {
    const { error } = await supabase
      .from('qa_notes')
      .insert({ content, user_id: userId || 'unknown' });
    if (error) {
      if (error.message.includes('does not exist')) {
        return res.status(400).json({ error: 'qa_notes table does not exist. Run the setup SQL.' });
      }
      return res.status(500).json({ error: error.message });
    }
  }
  res.json({ ok: true });
});

// ─── SOP CHANGE MANAGEMENT ──────────────────────────────────────────────────
// Persist drafts, acceptances, rejections, and annotations for SOP changes

// GET /sop-changes/:submissionRef — get all changes for a submission
app.get('/sop-changes/:submissionRef', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('sop_changes')
    .select('*')
    .eq('submission_ref', req.params.submissionRef)
    .order('created_at', { ascending: true });
  if (error) {
    if (error.message.includes('does not exist')) return res.json([]);
    return res.status(500).json({ error: error.message });
  }
  res.json(data || []);
});

// POST /sop-changes — create or update an SOP change record
app.post('/sop-changes', requireRole('qa', 'director', 'admin'), async (req, res) => {
  const { submissionRef, sopCode, section, action, draft, reason, userId, userRole } = req.body;
  if (!submissionRef || !sopCode || !action) {
    return res.status(400).json({ error: 'submissionRef, sopCode, and action are required' });
  }

  const key = `${submissionRef}:${sopCode}:${section || ''}`;
  
  // Check for existing record with this key
  const { data: existing } = await supabase
    .from('sop_changes')
    .select('id')
    .eq('change_key', key)
    .limit(1);
  
  const record = {
    change_key: key,
    submission_ref: submissionRef,
    sop_code: sopCode,
    section: section || '',
    action, // 'draft', 'accepted', 'rejected'
    draft_text: draft || null,
    reason: reason || null,
    user_id: userId || 'unknown',
    user_role: userRole || 'unknown'
  };

  let error;
  if (existing && existing.length) {
    ({ error } = await supabase
      .from('sop_changes')
      .update({ ...record, updated_at: new Date().toISOString() })
      .eq('id', existing[0].id));
  } else {
    ({ error } = await supabase.from('sop_changes').insert(record));
  }

  if (error) {
    if (error.message.includes('does not exist')) {
      return res.status(400).json({ error: 'sop_changes table does not exist. Run the setup SQL.' });
    }
    return res.status(500).json({ error: error.message });
  }

  // Audit log the change
  await auditLog({
    userId: userId || 'unknown',
    userRole: userRole || 'unknown',
    action: 'sop_change_' + action,
    entityType: 'sop_change',
    entityId: key,
    after: { sopCode, section, action, draft: draft ? draft.slice(0, 200) : null },
    reason: reason || `SOP change ${action} for ${sopCode}`,
    req
  });

  res.json({ ok: true, action });
});

// POST /sop-annotations — add an annotation to an SOP change
app.post('/sop-annotations', requireAuth, async (req, res) => {
  const { submissionRef, sopCode, section, text, userId, userRole } = req.body;
  if (!submissionRef || !sopCode || !text) {
    return res.status(400).json({ error: 'submissionRef, sopCode, and text are required' });
  }

  const changeKey = `${submissionRef}:${sopCode}:${section || ''}`;

  const { error } = await supabase.from('sop_annotations').insert({
    change_key: changeKey,
    submission_ref: submissionRef,
    sop_code: sopCode,
    section: section || '',
    text,
    user_id: userId || 'unknown',
    user_role: userRole || 'unknown'
  });

  if (error) {
    if (error.message.includes('does not exist')) {
      return res.status(400).json({ error: 'sop_annotations table does not exist. Run the setup SQL.' });
    }
    return res.status(500).json({ error: error.message });
  }

  await auditLog({
    userId: userId || 'unknown',
    userRole: userRole || 'unknown',
    action: 'sop_annotation_added',
    entityType: 'sop_annotation',
    entityId: changeKey,
    after: { sopCode, section, text: text.slice(0, 200) },
    reason: 'Annotation added to SOP change',
    req
  });

  res.json({ ok: true });
});

// GET /sop-annotations/:submissionRef — get all annotations
app.get('/sop-annotations/:submissionRef', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('sop_annotations')
    .select('*')
    .eq('submission_ref', req.params.submissionRef)
    .order('created_at', { ascending: true });
  if (error) {
    if (error.message.includes('does not exist')) return res.json([]);
    return res.status(500).json({ error: error.message });
  }
  res.json(data || []);
});

// ─── NOTIFICATIONS ──────────────────────────────────────────────────────────

// GET /notifications/:userId — get notifications for a user
app.get('/notifications/:userId', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', req.params.userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) {
    if (error.message.includes('does not exist')) return res.json([]);
    return res.status(500).json({ error: error.message });
  }
  res.json(data || []);
});

// PATCH /notifications/:id/read — mark a notification as read
app.patch('/notifications/:id/read', requireAuth, async (req, res) => {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// POST /notifications/read-all — mark all as read for a user
app.post('/notifications/read-all', requireAuth, async (req, res) => {
  const { userId } = req.body;
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// Internal helper: create notifications for contacts when a submission is created
async function notifyContacts(submission, contacts) {
  if (!contacts || !contacts.length) return;
  const notifications = contacts.map(c => ({
    user_id: c.name, // using contact name as user_id for now
    user_role: c.dept || 'unknown',
    type: 'submission_routed',
    title: `New ${submission.priority} priority observation routed to you`,
    body: `${submission.refCode}: ${(submission.observation || '').slice(0, 120)}...`,
    entity_type: 'submission',
    entity_id: submission.refCode,
    workflow_phase: c.workflowPhase || 1,
    why: c.why || '',
    read: false
  }));
  
  try {
    const { error } = await supabase.from('notifications').insert(notifications);
    if (error) console.error('[NOTIFY] Insert error:', error.message);
    else console.log(`[NOTIFY] Sent ${notifications.length} notifications for ${submission.refCode}`);
  } catch (err) {
    console.error('[NOTIFY] Failed:', err.message);
  }
}

// ─── CAPA TRACKING ──────────────────────────────────────────────────────────

// GET /capas — list all CAPAs
app.get('/capas', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('capas')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    if (error.message.includes('does not exist')) return res.json([]);
    return res.status(500).json({ error: error.message });
  }
  res.json(data || []);
});

// GET /capas/:submissionRef — list CAPAs for a specific submission
app.get('/capas/:submissionRef', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('capas')
    .select('*')
    .eq('submission_ref', req.params.submissionRef)
    .order('created_at', { ascending: true });
  if (error) {
    if (error.message.includes('does not exist')) return res.json([]);
    return res.status(500).json({ error: error.message });
  }
  res.json(data || []);
});

// POST /capas — create a CAPA from a corrective action
app.post('/capas', requireRole('qa', 'director', 'admin'), async (req, res) => {
  const { submissionRef, title, description, timing, timingLabel, owner, ownerRole, dueDate } = req.body;
  if (!submissionRef || !title) {
    return res.status(400).json({ error: 'submissionRef and title are required' });
  }

  const capaId = 'CAPA-' + Math.floor(1000 + Math.random() * 8999);

  const { error } = await supabase.from('capas').insert({
    capa_id: capaId,
    submission_ref: submissionRef,
    title,
    description: description || '',
    timing: timing || 'short',
    timing_label: timingLabel || '',
    owner: owner || 'Unassigned',
    owner_role: ownerRole || '',
    due_date: dueDate || null,
    status: 'open',
    evidence: null,
    closed_by: null,
    closed_at: null
  });

  if (error) {
    if (error.message.includes('does not exist')) {
      return res.status(400).json({ error: 'capas table does not exist. Run the setup SQL.' });
    }
    return res.status(500).json({ error: error.message });
  }

  await auditLog({
    userId: owner || 'system',
    userRole: ownerRole || 'system',
    action: 'capa_created',
    entityType: 'capa',
    entityId: capaId,
    after: { submissionRef, title, timing, owner, dueDate },
    reason: `CAPA created from submission ${submissionRef}`,
    req
  });

  res.json({ ok: true, capaId });
});

// PATCH /capas/:capaId — update a CAPA (status, owner, evidence, etc.)
app.patch('/capas/:capaId', requireRole('qa', 'director', 'admin'), async (req, res) => {
  const { status, owner, ownerRole, evidence, dueDate, userId, reason } = req.body;
  
  const { data: current, error: fetchErr } = await supabase
    .from('capas')
    .select('*')
    .eq('capa_id', req.params.capaId)
    .single();
  if (fetchErr || !current) return res.status(404).json({ error: 'CAPA not found' });

  const updates = {};
  if (status) updates.status = status;
  if (owner) updates.owner = owner;
  if (ownerRole) updates.owner_role = ownerRole;
  if (evidence) updates.evidence = evidence;
  if (dueDate) updates.due_date = dueDate;
  if (status === 'closed') {
    updates.closed_by = userId || 'unknown';
    updates.closed_at = new Date().toISOString();
  }
  updates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('capas')
    .update(updates)
    .eq('capa_id', req.params.capaId);
  if (error) return res.status(500).json({ error: error.message });

  await auditLog({
    userId: userId || 'unknown',
    userRole: ownerRole || current.owner_role || 'unknown',
    action: 'capa_updated',
    entityType: 'capa',
    entityId: req.params.capaId,
    before: { status: current.status, owner: current.owner },
    after: updates,
    reason: reason || `CAPA updated: ${Object.keys(updates).join(', ')}`,
    req
  });

  res.json({ ok: true, capaId: req.params.capaId, updates });
});

// ─── ANALYTICS / DASHBOARD ──────────────────────────────────────────────────

// GET /analytics — aggregate stats for the director dashboard
app.get('/analytics', requireRole('qa', 'director', 'admin'), async (req, res) => {
  try {
    // Fetch all submissions
    const { data: subs, error: subErr } = await supabase
      .from('submissions')
      .select('ref_code, process_area, priority, status, created_at, structured')
      .order('created_at', { ascending: false });

    if (subErr) return res.status(500).json({ error: subErr.message });

    // Fetch CAPAs
    let capas = [];
    const { data: capaData, error: capaErr } = await supabase
      .from('capas')
      .select('*')
      .order('created_at', { ascending: false });
    if (!capaErr && capaData) capas = capaData;

    const now = new Date();
    const submissions = subs || [];

    // Summary stats
    const total = submissions.length;
    const byPriority = { High: 0, Medium: 0, Low: 0 };
    const byStatus = {};
    const byArea = {};
    const byMonth = {};

    submissions.forEach(s => {
      byPriority[s.priority] = (byPriority[s.priority] || 0) + 1;
      const st = s.status || 'new';
      byStatus[st] = (byStatus[st] || 0) + 1;
      byArea[s.process_area] = (byArea[s.process_area] || 0) + 1;
      const month = s.created_at.slice(0, 7); // YYYY-MM
      byMonth[month] = (byMonth[month] || 0) + 1;
    });

    // Open vs closed
    const openStatuses = ['new', 'acknowledged', 'under_review', 'corrective_action'];
    const openCount = submissions.filter(s => openStatuses.includes(s.status || 'new')).length;
    const closedCount = submissions.filter(s => ['closed', 'rejected'].includes(s.status)).length;
    const inReview = submissions.filter(s => ['qa_approved', 'director_signoff'].includes(s.status)).length;

    // CAPA stats
    const openCapas = capas.filter(c => c.status === 'open' || c.status === 'in_progress').length;
    const overdueCapas = capas.filter(c => {
      if (c.status === 'closed') return false;
      return c.due_date && new Date(c.due_date) < now;
    }).length;
    const closedCapas = capas.filter(c => c.status === 'closed').length;

    // Recent trends (last 7 days vs previous 7 days)
    const weekAgo = new Date(now - 7 * 86400000);
    const twoWeeksAgo = new Date(now - 14 * 86400000);
    const thisWeek = submissions.filter(s => new Date(s.created_at) >= weekAgo).length;
    const lastWeek = submissions.filter(s => { const d = new Date(s.created_at); return d >= twoWeeksAgo && d < weekAgo; }).length;
    const trend = lastWeek ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : 0;

    res.json({
      total, byPriority, byStatus, byArea, byMonth,
      openCount, closedCount, inReview,
      capas: { total: capas.length, open: openCapas, overdue: overdueCapas, closed: closedCapas },
      trend: { thisWeek, lastWeek, percentChange: trend },
      recentSubmissions: submissions.slice(0, 10).map(s => ({
        ref: s.ref_code, area: s.process_area, priority: s.priority,
        status: s.status || 'new', date: s.created_at
      })),
      recentCapas: capas.slice(0, 10)
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── VISUAL SOP QUERY (Image/Video Analysis) ─────────────────────────────────

app.post('/query/visual', requireAuth, async (req, res) => {
  const { image, mimeType, area, context } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'No image data provided' });
  }

  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const mediaType = mimeType || 'image/jpeg';
  if (!validTypes.includes(mediaType)) {
    return res.status(400).json({ error: 'Unsupported image type. Use JPEG, PNG, GIF, or WebP.' });
  }

  try {
    // Step 1: Send image to Claude Vision to identify equipment, errors, readings
    console.log(`[VISUAL-QUERY] Analysing image (${mediaType}, ${Math.round(image.length / 1024)}KB)…`);

    const visionMessage = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: image
            }
          },
          {
            type: 'text',
            text: `You are an equipment specialist in a GMP biologics manufacturing facility running upstream perfusion processes.

Analyse this image and identify:
1. What equipment, instrument, or system is shown
2. Any error codes, alarm messages, or abnormal readings visible
3. The current state or condition of what's shown
4. Any visible parameters, values, or display readings
${context ? '\nOperator context: "' + context + '"' : ''}

Return ONLY valid JSON — no markdown fences:
{
  "equipment": "name of equipment/instrument identified",
  "error": "error code or alarm message if visible, or null",
  "condition": "brief description of what's shown and its state",
  "readings": [{"parameter": "name", "value": "reading", "unit": "unit"}],
  "searchQuery": "the best SOP search query to find procedures relevant to this equipment/situation — be specific, include equipment name and error/condition"
}`
          }
        ]
      }]
    });

    const visionRaw = visionMessage.content[0].text;
    const visionClean = visionRaw.replace(/```json|```/g, '').trim();
    const vision = JSON.parse(visionClean);

    console.log(`[VISUAL-QUERY] Identified: ${vision.equipment} | Error: ${vision.error || 'none'} | Query: "${vision.searchQuery}"`);

    // Step 2: Use the vision analysis to search SOPs via RAG
    const searchText = vision.searchQuery || vision.equipment + ' ' + (vision.error || '') + ' ' + (vision.condition || '');
    const chunks = await getRelevantChunks(searchText, area || 'Upstream');
    const sopContext = buildSopContext(chunks);

    // Step 3: Send to Claude with SOP context for a complete answer
    const queryMessage = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are the SOP Knowledge Assistant for a biologics manufacturing facility. An operator has taken a photo of equipment on the manufacturing floor. The image has been analysed and the following was identified:

Equipment: ${vision.equipment}
${vision.error ? 'Error/Alarm: ' + vision.error : 'No error code visible'}
Condition: ${vision.condition}
${vision.readings && vision.readings.length ? 'Readings: ' + vision.readings.map(r => r.parameter + ': ' + r.value + ' ' + (r.unit || '')).join(', ') : ''}
${context ? 'Operator note: "' + context + '"' : ''}

Using the SOP sections below, provide the relevant procedure, troubleshooting steps, and any critical parameters. Be practical — this is for an operator on the floor who needs help right now.

RULES:
- Answer only from the SOP content provided. Do not invent steps or values.
- If the image shows an error or alarm, prioritise troubleshooting procedures.
- If the question cannot be answered from the provided SOP content, say so clearly.
- Always cite the exact SOP section numbers.

════ RELEVANT SOP SECTIONS ════
${sopContext}
═══════════════════════════════

Return ONLY valid JSON — no markdown, no preamble:
{
  "category": "procedure or specification or troubleshooting or general",
  "summary": "2–3 sentences describing what was identified and the relevant SOP guidance",
  "steps": [{ "n": 1, "action": "step instruction", "detail": "additional detail or null", "critical": false, "value": "specific value or target if relevant, else null" }],
  "params": [{ "name": "parameter name", "value": "target value", "unit": "unit string", "range": "acceptable range or null", "flag": "critical or normal" }],
  "warnings": ["warning text — only genuine safety or quality critical cautions"],
  "notes": ["general procedural note"],
  "sources": [{ "code": "doc_id", "title": "document title", "section": "section number" }]
}`
      }]
    });

    const queryRaw = queryMessage.content[0].text;
    const queryClean = queryRaw.replace(/```json|```/g, '').trim();
    const answer = JSON.parse(queryClean);

    // Return both the vision analysis and the SOP answer
    res.json({
      vision,
      answer
    });

    console.log(`[VISUAL-QUERY] Complete — ${answer.steps?.length || 0} steps, ${answer.sources?.length || 0} sources`);

  } catch (error) {
    console.error('Visual query error:', error);
    res.status(500).json({ error: 'Visual query failed: ' + error.message });
  }
});

// ─── GDP CHECK ENDPOINT ──────────────────────────────────────────────────────

// ─── IMAGE PREPROCESSING ─────────────────────────────────────────────────────
// Improve Claude's vision accuracy with contrast normalization + sharpening
async function preprocessImage(base64Data) {
  const buffer = Buffer.from(base64Data, 'base64');
  const processed = await sharp(buffer)
    .normalize()                    // Auto-contrast normalization
    .sharpen({ sigma: 1.2 })        // Sharpen text edges
    .resize({
      width: 2048,
      height: 2048,
      fit: 'inside',
      withoutEnlargement: true      // Don't upscale small images
    })
    .jpeg({ quality: 90 })
    .toBuffer();
  return processed.toString('base64');
}

// Detect blue ink regions using sharp pixel analysis
async function detectBlueInkRegions(base64Data) {
  const buffer = Buffer.from(base64Data, 'base64');
  const { data, info } = await sharp(buffer).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  // Grid-based detection: divide image into cells
  const GRID = 100; // 100×100 grid for precision
  const cellW = Math.ceil(width / GRID);
  const cellH = Math.ceil(height / GRID);
  const gridW = Math.ceil(width / cellW);
  const gridH = Math.ceil(height / cellH);

  // Count blue pixels per cell
  const grid = new Uint16Array(gridW * gridH);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];

      // Blue ink detection: blue channel dominant, not grey/white/black
      // Blue pen ink: B > 100, B > R + 25, B > G + 15, not too bright (not white)
      const brightness = (r + g + b) / 3;
      if (b > 90 && b > r + 20 && b > g + 10 && brightness < 200 && brightness > 40) {
        const gx = Math.min(Math.floor(x / cellW), gridW - 1);
        const gy = Math.min(Math.floor(y / cellH), gridH - 1);
        grid[gy * gridW + gx]++;
      }
    }
  }

  // Threshold: cell must have > 1.5% blue pixels to count
  const threshold = Math.max(3, (cellW * cellH) * 0.015);
  const blueCells = new Set();
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] > threshold) blueCells.add(i);
  }

  // Flood-fill to cluster adjacent blue cells into regions
  const visited = new Set();
  const regions = [];

  for (const cell of blueCells) {
    if (visited.has(cell)) continue;
    const region = [];
    const stack = [cell];
    while (stack.length) {
      const c = stack.pop();
      if (visited.has(c) || !blueCells.has(c)) continue;
      visited.add(c);
      region.push(c);
      const cx = c % gridW, cy = Math.floor(c / gridW);
      // Check 8-connected neighbours + skip-1 for bridging small gaps
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = cx + dx, ny = cy + dy;
          if (nx >= 0 && nx < gridW && ny >= 0 && ny < gridH) {
            stack.push(ny * gridW + nx);
          }
        }
      }
    }

    if (region.length >= 2) { // Skip single-cell noise
      let minX = gridW, minY = gridH, maxX = 0, maxY = 0;
      for (const c of region) {
        const cx = c % gridW, cy = Math.floor(c / gridW);
        minX = Math.min(minX, cx);
        minY = Math.min(minY, cy);
        maxX = Math.max(maxX, cx);
        maxY = Math.max(maxY, cy);
      }

      // Add 0.5 cell padding for tight but visible boxes
      const pad = 0.5;
      const x = Math.max(0, ((minX - pad) * cellW / width) * 100);
      const y = Math.max(0, ((minY - pad) * cellH / height) * 100);
      const w = Math.min(100 - x, ((maxX - minX + 1 + pad * 2) * cellW / width) * 100);
      const h = Math.min(100 - y, ((maxY - minY + 1 + pad * 2) * cellH / height) * 100);

      regions.push({
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
        w: Math.round(w * 100) / 100,
        h: Math.round(h * 100) / 100,
        cells: region.length
      });
    }
  }

  // Sort top-to-bottom, left-to-right
  regions.sort((a, b) => {
    if (Math.abs(a.y - b.y) < 2) return a.x - b.x;
    return a.y - b.y;
  });

  console.log(`[GDP-VISION] Detected ${regions.length} blue ink regions (${width}×${height}, grid ${gridW}×${gridH})`);
  return { regions, width, height };
}

app.post('/query/gdp', requireAuth, async (req, res) => {
  const { images } = req.body;

  if (!images || !Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: 'No images provided' });
  }
  if (images.length > 10) {
    return res.status(400).json({ error: 'Maximum 10 pages per check' });
  }

  try {
    const pageResults = [];

    for (let i = 0; i < images.length; i++) {
      const { image, pageNumber, filename } = images[i];
      const pNum = pageNumber || i + 1;

      console.log(`[GDP-CHECK] Page ${pNum}/${images.length} — preprocessing…`);

      // Step 0: Preprocess image for better vision results
      const preprocessedImage = await preprocessImage(image);
      console.log(`[GDP-CHECK] Page ${pNum} — preprocessed (${Math.round(image.length/1024)}KB → ${Math.round(preprocessedImage.length/1024)}KB)`);

      // Step 1: Detect blue ink regions with sharp (use ORIGINAL for color accuracy)
      const { regions } = await detectBlueInkRegions(image);

      console.log(`[GDP-CHECK] Page ${pNum} — ${regions.length} blue regions found, sending to Claude…`);

      // Step 2: Build region summary for Claude
      const regionList = regions.map((r, idx) =>
        `  Region ${idx + 1}: x=${r.x}%, y=${r.y}%, w=${r.w}%, h=${r.h}%`
      ).join('\n');

      // Step 3: Send PREPROCESSED image to Claude for GDP analysis (better contrast/sharpness)
      const gdpMessage = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: preprocessedImage }
            },
            {
              type: 'text',
              text: `You are an expert GMP Quality Assurance reviewer for pharmaceutical batch records.

This is a photo of a batch record form. The form has a PRE-PRINTED structure (field labels, table headers, grid lines, logos, document IDs) — IGNORE all pre-printed content. Your job is to find and review only the HANDWRITTEN entries that operators filled in by hand.

WHAT COUNTS AS HANDWRITTEN: signatures, initials, dates written by hand, values filled into blank fields, checkmarks, corrections, notes added by a person. Handwriting has irregular strokes, personal style, and is visually distinct from the uniform machine-printed text of the form.

WHAT TO IGNORE: all pre-printed form labels, column headers, row labels, document titles, revision numbers, SOP references, page numbers, logos, watermarks, and any other machine-printed text that is part of the form template.

I have run pixel analysis and detected ${regions.length} regions likely containing BLUE INK:
${regionList || '  (none detected)'}

These blue-ink regions are hints. Operators may also write in black ink or pencil — look for those too, but ONLY in areas where the form expects operator input (fill-in fields, signature lines, data cells).

YOUR TASK:
1. Identify each HANDWRITTEN entry on the page (in any ink color)
2. Transcribe what was written
3. Check each entry for GDP compliance
4. Note any fields that are EMPTY but should have been filled in (IE errors)

For entries matching a detected blue ink region, use those EXACT bounding box coordinates.
For handwritten entries NOT in my detected regions, estimate the bbox as % of image.

GDP ERROR CATEGORIES:
- EE (Erroneous Entry): Wrong values, incorrect dates/times, calculation errors
- LE (Late Entry): Different ink shade suggesting different time, times out of sequence, squeezed entries
- IE (Incomplete Entry): Blank fields that should have data, missing signatures/initials/dates
- CE (Correction Error): Correction fluid used, no single-line strikethrough, missing initials/date/reason on corrections
- GDP (Other): Illegible handwriting, blank spaces not lined through, pencil use

Return ONLY valid JSON:
{
  "pageNumber": ${pNum},
  "description": "brief description of what this form page documents",
  "entries": [
    {
      "id": 1,
      "text": "transcribed handwriting",
      "bbox": {"x": 0, "y": 0, "w": 0, "h": 0},
      "status": "ok|error|warning",
      "errorType": null,
      "inkColor": "blue|black|grey|other",
      "classification": "handwritten"
    }
  ],
  "errors": [
    {
      "type": "EE|LE|IE|CE|GDP",
      "severity": "critical|major|minor",
      "title": "short title",
      "location": "human-readable location (e.g. Row 3, Signature field)",
      "bbox": {"x": 0, "y": 0, "w": 0, "h": 0},
      "description": "what was observed",
      "correction": "correct GDP procedure",
      "entryId": 1
    }
  ]
}

CRITICAL RULES:
- ONLY include handwritten content in "entries" — NEVER include pre-printed form text
- Every entry must have classification "handwritten" — if it's printed, do not include it
- Use EXACT bbox coordinates from my detected regions where they match
- Do NOT invent GDP issues — only flag genuine, visible problems
- Be conservative: if something looks acceptable, mark it status "ok"
- For IE errors (empty fields), estimate the bbox of the blank field`
            }
          ]
        }]
      });

      let pageResult;
      try {
        const raw = gdpMessage.content[0].text.trim();
        pageResult = JSON.parse(raw);
      } catch (parseErr) {
        const jsonMatch = gdpMessage.content[0].text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          pageResult = JSON.parse(jsonMatch[0]);
        } else {
          pageResult = { pageNumber: pNum, description: 'Could not parse analysis', entries: [], errors: [] };
        }
      }
      pageResult.pageNumber = pNum;
      pageResults.push(pageResult);
    }

    // Aggregate counts
    let totalErrors = 0, criticalCount = 0, majorCount = 0, minorCount = 0;
    const allErrors = [];
    pageResults.forEach(page => {
      (page.errors || []).forEach(e => {
        totalErrors++;
        if (e.severity === 'critical') criticalCount++;
        else if (e.severity === 'major') majorCount++;
        else minorCount++;
        allErrors.push(e);
      });
    });

    // Recommendations
    const recommendations = [];
    const errorTypes = allErrors.map(e => e.type);
    if (errorTypes.filter(t => t === 'IE').length >= 2)
      recommendations.push('Multiple incomplete entries found — ensure all fields are completed at time of activity before moving to next step.');
    if (errorTypes.includes('CE'))
      recommendations.push('Correction errors detected — single line strikethrough, initial, date, and reason for every correction. Never use correction fluid.');
    if (errorTypes.includes('LE'))
      recommendations.push('Late entries identified — all entries must be contemporaneous. If unavoidable, annotate with "Late Entry", reason, date, time, and signature.');
    if (errorTypes.includes('EE'))
      recommendations.push('Erroneous entries found — double-check all values against source data before recording.');
    if (allErrors.some(e => e.description?.toLowerCase().includes('illegible')))
      recommendations.push('Illegible handwriting noted — all entries must be clearly legible.');
    if (allErrors.some(e => e.description?.toLowerCase().includes('blank')))
      recommendations.push('Unused blank spaces should be lined through with a single diagonal line.');
    if (totalErrors === 0)
      recommendations.push('Excellent GDP compliance on the reviewed pages.');

    // ── Persist to Supabase (non-fatal — results still return on failure) ──
    let savedDocId = null;
    try {
      await ensureGdpTables();
      const userId = req.user.id || req.user.email;
      const docFilename = images[0]?.filename || `GDP Check ${new Date().toISOString().slice(0, 10)}`;

      const { data: docRow, error: docErr } = await supabase
        .from('gdp_documents')
        .insert({
          user_id: userId,
          filename: docFilename,
          page_count: images.length,
          total_errors: totalErrors,
          critical_count: criticalCount,
          major_count: majorCount,
          minor_count: minorCount,
          recommendations,
          review_status: 'pending_review',
          processing_status: 'complete'
        })
        .select('id')
        .single();

      if (docErr) throw docErr;
      savedDocId = docRow.id;

      // Build findings rows — merge entries + errors per page
      const findingRows = [];
      pageResults.forEach(page => {
        (page.entries || []).forEach((entry, idx) => {
          const linkedError = (page.errors || []).find(e => e.entryId === entry.id);
          findingRows.push({
            document_id: savedDocId,
            page_number: page.pageNumber,
            region_index: idx,
            classification: entry.classification || 'handwritten',
            ink_color: entry.inkColor || 'blue',
            bbox: entry.bbox || null,
            extracted_text: entry.text || '',
            error_type: linkedError?.type || null,
            severity: linkedError?.severity || null,
            title: linkedError?.title || '',
            location: linkedError?.location || '',
            description: linkedError?.description || '',
            correction: linkedError?.correction || '',
            status: entry.status || 'ok',
            entry_id: entry.id
          });
        });
        // Standalone errors (IE errors with no matching entry)
        (page.errors || []).forEach(err => {
          const hasEntry = (page.entries || []).some(e => e.id === err.entryId);
          if (!hasEntry) {
            findingRows.push({
              document_id: savedDocId,
              page_number: page.pageNumber,
              classification: 'handwritten',
              ink_color: 'unknown',
              bbox: err.bbox || null,
              extracted_text: '',
              error_type: err.type,
              severity: err.severity,
              title: err.title || '',
              location: err.location || '',
              description: err.description || '',
              correction: err.correction || '',
              status: 'error',
              entry_id: err.entryId || null
            });
          }
        });
      });

      if (findingRows.length > 0) {
        const { error: findErr } = await supabase.from('gdp_findings').insert(findingRows);
        if (findErr) console.error('[GDP] Findings insert error:', findErr.message);
      }

      await auditLog({
        userId, userRole: req.user.role || 'user',
        action: 'gdp_check_completed', entityType: 'gdp_document', entityId: savedDocId,
        after: { totalErrors, criticalCount, majorCount, minorCount, pageCount: images.length },
        req
      });
      console.log(`[GDP] Saved document ${savedDocId} with ${findingRows.length} findings`);
    } catch (persistErr) {
      console.error('[GDP] Persistence error (non-fatal):', persistErr.message);
    }

    res.json({ documentId: savedDocId, pages: pageResults, totalErrors, criticalCount, majorCount, minorCount, recommendations });
    console.log(`[GDP-CHECK] Complete — ${totalErrors} issues (${criticalCount}C/${majorCount}M/${minorCount}m), ${pageResults.reduce((a, p) => a + (p.entries?.length || 0), 0)} entries across ${images.length} page(s)`);

  } catch (error) {
    console.error('GDP check error:', error);
    res.status(500).json({ error: 'GDP check failed: ' + error.message });
  }
});

// ─── GDP DOCUMENT IDENTIFICATION ────────────────────────────────────────────

// POST /gdp/identify-docs — Identify WX-SOP/WX-MBR doc IDs from batch record images
app.post('/gdp/identify-docs', requireAuth, async (req, res) => {
  const { images } = req.body;

  if (!images || !images.length) {
    return res.status(400).json({ error: 'No images provided' });
  }

  console.log(`[GDP-ID] Identifying document IDs for ${images.length} page(s)…`);

  try {
    const results = [];

    for (let i = 0; i < images.length; i++) {
      const { base64, mimeType, pageNumber } = images[i];
      const mediaType = ['image/jpeg','image/png','image/gif','image/webp'].includes(mimeType)
        ? mimeType : 'image/jpeg';

      console.log(`[GDP-ID] Page ${pageNumber || i + 1} — sending to Claude…`);

      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: `Look at this pharmaceutical batch record / GMP document page. Find the document identifier printed on it.

Document IDs typically follow patterns like:
- WX-SOP-001, WX-SOP-042 (Standard Operating Procedures)
- WX-MBR-001, WX-MBR-042 (Master Batch Records)
- WX-FRM-xxx (Forms)
- WX-LOG-xxx (Logbooks)
- Or similar alphanumeric reference numbers with a prefix and number

Also identify the document title and the page/section title if visible.

Return ONLY valid JSON (no markdown fences):
{
  "documentId": "WX-SOP-001 or null if not found",
  "documentTitle": "The full document title if visible",
  "pageTitle": "The section or page title if different from document title",
  "confidence": "high|medium|low"
}` }
          ]
        }]
      });

      let parsed;
      try {
        const raw = msg.content[0].text.trim();
        parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
      } catch {
        parsed = { documentId: null, documentTitle: 'Unknown', pageTitle: '', confidence: 'low' };
      }
      parsed.pageNumber = pageNumber || i + 1;
      results.push(parsed);
      console.log(`[GDP-ID] Page ${parsed.pageNumber} → ${parsed.documentId || 'unidentified'} (${parsed.confidence})`);
    }

    console.log(`[GDP-ID] Complete — identified ${results.filter(r => r.documentId).length}/${results.length} pages`);
    res.json({ pages: results });
  } catch (error) {
    console.error('GDP identify-docs error:', error?.message || error);
    if (error?.status) console.error('[GDP-ID] API status:', error.status);
    res.status(500).json({ error: 'Document identification failed: ' + (error?.message || String(error)) });
  }
});

// ─── GDP PERSISTENCE & REVIEW ────────────────────────────────────────────────

let _gdpTableReady = false;
async function ensureGdpTables() {
  if (_gdpTableReady) return;
  try {
    const { error } = await supabase.from('gdp_documents').select('id').limit(1);
    if (error && error.message.includes('does not exist')) {
      console.log('[GDP] gdp_documents table not found — run the SQL from GET /admin/setup in Supabase.');
    }
    _gdpTableReady = true;
  } catch { _gdpTableReady = true; }
}

// GET /api/gdp/documents — list GDP check history for the current user
app.get('/api/gdp/documents', requireAuth, async (req, res) => {
  await ensureGdpTables();
  try {
    const { data, error } = await supabase
      .from('gdp_documents')
      .select('id, filename, page_count, total_errors, critical_count, major_count, minor_count, review_status, created_at')
      .eq('user_id', req.user.id || req.user.email)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('GDP doc list error:', err);
    res.status(500).json({ error: 'Failed to load GDP history' });
  }
});

// GET /api/gdp/documents/:id — get a single GDP check with all findings
app.get('/api/gdp/documents/:id', requireAuth, async (req, res) => {
  await ensureGdpTables();
  try {
    const { data: doc, error: docErr } = await supabase
      .from('gdp_documents')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (docErr) throw docErr;
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const { data: findings, error: findErr } = await supabase
      .from('gdp_findings')
      .select('*')
      .eq('document_id', req.params.id)
      .order('page_number', { ascending: true })
      .order('region_index', { ascending: true });
    if (findErr) throw findErr;

    // Reconstruct the pages format the frontend expects
    const pageMap = {};
    (findings || []).forEach(f => {
      if (!pageMap[f.page_number]) {
        pageMap[f.page_number] = { pageNumber: f.page_number, entries: [], errors: [] };
      }
      const page = pageMap[f.page_number];

      page.entries.push({
        id: f.entry_id,
        text: f.manually_corrected ? f.corrected_text : f.extracted_text,
        originalText: f.manually_corrected ? f.extracted_text : undefined,
        bbox: f.bbox,
        status: f.status,
        inkColor: f.ink_color,
        classification: f.classification,
        findingId: f.id,
        manuallyCorrected: f.manually_corrected
      });

      if (f.error_type) {
        page.errors.push({
          type: f.error_type,
          severity: f.severity,
          title: f.title,
          location: f.location,
          bbox: f.bbox,
          description: f.description,
          correction: f.correction,
          entryId: f.entry_id,
          findingId: f.id
        });
      }
    });

    const pages = Object.values(pageMap).sort((a, b) => a.pageNumber - b.pageNumber);

    res.json({
      ...doc,
      pages,
      totalErrors: doc.total_errors,
      criticalCount: doc.critical_count,
      majorCount: doc.major_count,
      minorCount: doc.minor_count,
      recommendations: doc.recommendations
    });
  } catch (err) {
    console.error('GDP doc detail error:', err);
    res.status(500).json({ error: 'Failed to load GDP document' });
  }
});

// PATCH /api/gdp/documents/:docId/findings/:findingId — correct a finding's text
app.patch('/api/gdp/documents/:docId/findings/:findingId', requireAuth, async (req, res) => {
  await ensureGdpTables();
  const { corrected_text } = req.body;

  if (corrected_text === undefined) {
    return res.status(400).json({ error: 'corrected_text is required' });
  }

  try {
    const { data: doc } = await supabase
      .from('gdp_documents')
      .select('id, user_id')
      .eq('id', req.params.docId)
      .single();

    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const userId = req.user.id || req.user.email;
    const userRole = req.user.role || 'user';

    // Allow owner or QA/admin roles
    if (doc.user_id !== userId && !['qa', 'admin', 'director'].includes(userRole)) {
      return res.status(403).json({ error: 'Not authorized to edit this document' });
    }

    const { data: original } = await supabase
      .from('gdp_findings')
      .select('extracted_text, corrected_text, manually_corrected')
      .eq('id', req.params.findingId)
      .eq('document_id', req.params.docId)
      .single();

    const { data, error } = await supabase
      .from('gdp_findings')
      .update({
        manually_corrected: true,
        corrected_text,
        corrected_by: userId,
        corrected_at: new Date().toISOString()
      })
      .eq('id', req.params.findingId)
      .eq('document_id', req.params.docId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Finding not found' });

    await auditLog({
      userId, userRole,
      action: 'gdp_finding_corrected', entityType: 'gdp_finding', entityId: req.params.findingId,
      before: { text: original?.extracted_text, corrected: original?.manually_corrected },
      after: { corrected_text },
      req
    });

    res.json(data);
  } catch (err) {
    console.error('GDP finding correction error:', err);
    res.status(500).json({ error: 'Failed to update finding' });
  }
});

// PATCH /api/gdp/documents/:docId/status — update review status
app.patch('/api/gdp/documents/:docId/status', requireAuth, async (req, res) => {
  await ensureGdpTables();
  const { review_status } = req.body;

  const validStatuses = ['pending_review', 'reviewed', 'approved'];
  if (!validStatuses.includes(review_status)) {
    return res.status(400).json({ error: 'Invalid status. Must be: ' + validStatuses.join(', ') });
  }

  const userId = req.user.id || req.user.email;
  const userRole = req.user.role || 'user';

  try {
    const { data: doc } = await supabase
      .from('gdp_documents')
      .select('review_status, user_id')
      .eq('id', req.params.docId)
      .single();

    if (!doc) return res.status(404).json({ error: 'Document not found' });

    if (review_status === 'approved' && !['qa', 'admin', 'director'].includes(userRole)) {
      return res.status(403).json({ error: 'Only QA, admin, or director can approve GDP checks' });
    }

    const { data, error } = await supabase
      .from('gdp_documents')
      .update({ review_status, updated_at: new Date().toISOString() })
      .eq('id', req.params.docId)
      .select()
      .single();

    if (error) throw error;

    await auditLog({
      userId, userRole,
      action: 'gdp_review_status_changed', entityType: 'gdp_document', entityId: req.params.docId,
      before: { review_status: doc.review_status },
      after: { review_status },
      req
    });

    res.json(data);
  } catch (err) {
    console.error('GDP status update error:', err);
    res.status(500).json({ error: 'Failed to update review status' });
  }
});

// ─── DOC BUILDER AI ENDPOINTS ─────────────────────────────────────────────────

// AI Assist — rewrite, expand, add safety, format as SOP
app.post('/docs/ai-assist', requireAuth, async (req, res) => {
  const { action, stepTitle, stepContent, stepNote, docTitle, area } = req.body;

  const validActions = ['rewrite', 'expand', 'safety', 'format'];
  if (!validActions.includes(action)) {
    return res.status(400).json({ error: 'Invalid action. Must be: ' + validActions.join(', ') });
  }
  if (!stepContent || stepContent.length < 5) {
    return res.status(400).json({ error: 'Step content too short' });
  }

  const prompts = {
    rewrite: `Rewrite the following SOP step for maximum clarity, precision, and readability. Use active voice, short sentences, and unambiguous language. Keep all technical accuracy. Do not add or remove information — just improve the writing.\n\nReturn ONLY valid JSON: { "title": "improved step title", "content": "improved content", "note": "any note/warning or empty string" }`,
    expand: `Expand the following SOP step with additional detail that an operator would need on the manufacturing floor. Add specific sub-steps, expected observations, and acceptance criteria where appropriate. Keep it practical and actionable.\n\nReturn ONLY valid JSON: { "title": "step title", "content": "expanded content with sub-steps", "note": "any note/warning or empty string" }`,
    safety: `Review the following SOP step and add all relevant safety warnings, PPE requirements, hazard callouts, and precautions. Consider chemical exposure, biological hazards, equipment risks, ergonomic concerns, and GMP requirements. Add warnings as notes and integrate safety language into the content.\n\nReturn ONLY valid JSON: { "title": "step title", "content": "content with safety language integrated", "note": "safety warnings and PPE requirements" }`,
    format: `Reformat the following content as a proper GMP SOP step. Structure it with: a clear objective, numbered sub-steps, acceptance criteria, and any critical control points marked. Use standard SOP language conventions.\n\nReturn ONLY valid JSON: { "title": "formatted step title", "content": "properly formatted SOP content", "note": "any critical notes or empty string" }`
  };

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `${prompts[action]}

Document: "${docTitle || 'Untitled'}"
Process Area: ${area || 'General'}
Step Title: "${stepTitle || 'Untitled Step'}"
Step Content:
${stepContent}
${stepNote ? '\nExisting Note/Warning: ' + stepNote : ''}

Return ONLY valid JSON — no markdown fences, no preamble.`
      }]
    });

    const raw = message.content[0].text;
    const clean = raw.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    console.log(`[DOC-AI] ${action} on "${stepTitle}" — success`);
    res.json(result);

  } catch (error) {
    console.error('Doc AI assist error:', error);
    res.status(500).json({ error: 'AI assist failed: ' + error.message });
  }
});

// Generate document steps from an SOP
app.post('/docs/generate-steps', requireAuth, async (req, res) => {
  const { docId } = req.body;

  if (!docId) {
    return res.status(400).json({ error: 'docId is required' });
  }

  try {
    // Fetch all SOP sections for this document
    const { data: sections, error } = await supabase
      .from('sop_chunks')
      .select('doc_id, doc_title, section_title, content')
      .eq('doc_id', docId)
      .order('chunk_index', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    if (!sections || !sections.length) {
      return res.status(404).json({ error: 'No SOP sections found for ' + docId });
    }

    const sopContent = sections.map(s => `Section: ${s.section_title}\n${s.content}`).join('\n\n---\n\n');
    const docTitle = sections[0].doc_title || docId;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: `You are a GMP documentation specialist. Generate a complete set of document steps from the following SOP. Each step should be practical, actionable, and ready for an operator to follow on the manufacturing floor.

Rules:
- Create 5–12 steps covering the full scope of the SOP
- Each step should have a clear title, detailed content, and a note/warning if applicable
- Include specific parameter values, acceptance criteria, and critical control points from the SOP
- Mark safety-critical information in the notes
- Use the actual values and specifications from the SOP — do not invent data

════ SOP CONTENT: ${docId} — ${docTitle} ════
${sopContent}
═══════════════════════════════════════════════

Return ONLY valid JSON — no markdown fences, no preamble:
{
  "title": "suggested document title",
  "description": "1-2 sentence description of what this document covers",
  "steps": [
    { "title": "step title", "content": "detailed step content", "note": "warning or critical note, or empty string" }
  ]
}`
      }]
    });

    const raw = message.content[0].text;
    const clean = raw.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    console.log(`[DOC-GEN] Generated ${result.steps?.length || 0} steps from ${docId}`);
    res.json(result);

  } catch (error) {
    console.error('Doc generate error:', error);
    res.status(500).json({ error: 'Step generation failed: ' + error.message });
  }
});

// Compliance checker — review a full document
app.post('/docs/compliance-check', requireAuth, async (req, res) => {
  const { docTitle, area, steps } = req.body;

  if (!steps || !steps.length) {
    return res.status(400).json({ error: 'Document must have at least one step' });
  }

  try {
    // Build the document content for review
    const docContent = steps.map((s, i) =>
      `Step ${i + 1}: ${s.title}\nContent: ${s.content}${s.note ? '\nNote: ' + s.note : ''}`
    ).join('\n\n---\n\n');

    // Optionally fetch relevant SOP chunks to cross-reference
    let sopContext = '';
    try {
      const chunks = await getRelevantChunks(docTitle + ' ' + steps.map(s => s.title).join(' '), area || 'Upstream');
      sopContext = buildSopContext(chunks);
    } catch (e) {
      console.warn('[COMPLIANCE] Could not fetch SOP context:', e.message);
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2500,
      messages: [{
        role: 'user',
        content: `You are a GMP compliance reviewer for a biologics manufacturing facility. Review the following workflow document for compliance gaps, missing information, and quality issues.

Check for:
1. Missing PPE or safety warnings on steps that involve chemicals, biologics, or equipment
2. Steps without acceptance criteria or verification points
3. Undefined acronyms or ambiguous terminology
4. Missing sign-off or approval points for critical operations
5. Deviations from SOP parameters (compare against the SOP sections provided)
6. Missing material/equipment specifications
7. Incomplete procedures (missing steps that would be expected)
8. Non-compliance with GMP documentation standards

${sopContext ? '════ RELEVANT SOP SECTIONS FOR CROSS-REFERENCE ════\n' + sopContext + '\n═══════════════════════════════════════════════════════\n' : ''}

════ DOCUMENT UNDER REVIEW ════
Title: ${docTitle || 'Untitled Document'}
Process Area: ${area || 'General'}

${docContent}
════════════════════════════════

Return ONLY valid JSON — no markdown fences, no preamble:
{
  "score": 0-100,
  "grade": "A or B or C or D or F",
  "summary": "2-3 sentence overall assessment",
  "checks": [
    {
      "category": "safety|criteria|terminology|signoff|sop_deviation|materials|completeness|gmp_format",
      "status": "pass|warn|fail",
      "title": "short check title",
      "detail": "specific finding and recommendation",
      "stepRef": "which step number this applies to, or 'Document' for overall issues"
    }
  ],
  "recommendations": ["top 3 priority improvements as short strings"]
}`
      }]
    });

    const raw = message.content[0].text;
    const clean = raw.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    console.log(`[COMPLIANCE] Reviewed "${docTitle}" — score: ${result.score}, ${result.checks?.length || 0} checks`);
    res.json(result);

  } catch (error) {
    console.error('Compliance check error:', error);
    res.status(500).json({ error: 'Compliance check failed: ' + error.message });
  }
});

// ─── DOC BUILDER PERSISTENCE ─────────────────────────────────────────────────
// Table: builder_docs (see /admin/setup SQL output)

let _builderTableReady = false;
async function ensureBuilderTable() {
  if (_builderTableReady) return;
  try {
    const { error } = await supabase.from('builder_docs').select('id').limit(1);
    if (error && error.message.includes('does not exist')) {
      console.log('[DOCS] builder_docs table not found. Run the SQL from GET /admin/setup in Supabase.');
    }
    _builderTableReady = true;
  } catch { _builderTableReady = true; }
}

// GET /docs/documents — list all documents for the current user
app.get('/docs/documents', requireAuth, async (req, res) => {
  await ensureBuilderTable();
  try {
    const { data, error } = await supabase
      .from('builder_docs')
      .select('client_id, title, area, description, status, steps, versions, source, created_at, updated_at')
      .eq('user_id', req.user.id || req.user.email)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Doc list error:', err);
    res.status(500).json({ error: 'Failed to load documents' });
  }
});

// POST /docs/documents — create a new document
app.post('/docs/documents', requireAuth, async (req, res) => {
  await ensureBuilderTable();
  const { client_id, title, area, description, status, steps, versions, source } = req.body;
  if (!client_id) return res.status(400).json({ error: 'client_id is required' });
  try {
    const { data, error } = await supabase
      .from('builder_docs')
      .insert({
        user_id: req.user.id || req.user.email,
        client_id,
        title: title || 'Untitled',
        area: area || 'Other',
        description: description || '',
        status: status || 'draft',
        steps: steps || [],
        versions: versions || [],
        source: source || null
      })
      .select()
      .single();
    if (error) throw error;

    await auditLog({
      userId: req.user.id || req.user.email,
      userRole: req.user.role || 'user',
      action: 'doc_created',
      entityType: 'builder_doc',
      entityId: client_id,
      after: { title, area, status: status || 'draft' },
      req
    });

    res.json(data);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Document already exists' });
    console.error('Doc create error:', err);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// GET /docs/documents/:clientId — get a single document
app.get('/docs/documents/:clientId', requireAuth, async (req, res) => {
  await ensureBuilderTable();
  try {
    const { data, error } = await supabase
      .from('builder_docs')
      .select('*')
      .eq('client_id', req.params.clientId)
      .eq('user_id', req.user.id || req.user.email)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Document not found' });
    res.json(data);
  } catch (err) {
    console.error('Doc get error:', err);
    res.status(500).json({ error: 'Failed to load document' });
  }
});

// PUT /docs/documents/:clientId — update a document
app.put('/docs/documents/:clientId', requireAuth, async (req, res) => {
  await ensureBuilderTable();
  const { title, area, description, status, steps, versions, signoffs } = req.body;
  const update = { updated_at: new Date().toISOString() };
  if (title !== undefined) update.title = title;
  if (area !== undefined) update.area = area;
  if (description !== undefined) update.description = description;
  if (steps !== undefined) update.steps = steps;
  if (versions !== undefined) update.versions = versions;
  if (signoffs !== undefined) update.signoffs = signoffs;

  // Track status changes for audit
  let oldStatus = null;
  if (status !== undefined) {
    update.status = status;
    try {
      const { data: existing } = await supabase
        .from('builder_docs')
        .select('status')
        .eq('client_id', req.params.clientId)
        .eq('user_id', req.user.id || req.user.email)
        .single();
      if (existing) oldStatus = existing.status;
    } catch {}
  }

  try {
    const { data, error } = await supabase
      .from('builder_docs')
      .update(update)
      .eq('client_id', req.params.clientId)
      .eq('user_id', req.user.id || req.user.email)
      .select()
      .single();
    if (error) throw error;

    if (status !== undefined && oldStatus && oldStatus !== status) {
      await auditLog({
        userId: req.user.id || req.user.email,
        userRole: req.user.role || 'user',
        action: 'doc_status_changed',
        entityType: 'builder_doc',
        entityId: req.params.clientId,
        before: { status: oldStatus },
        after: { status },
        req
      });
    }

    res.json(data);
  } catch (err) {
    console.error('Doc update error:', err);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// DELETE /docs/documents/:clientId — delete a document
app.delete('/docs/documents/:clientId', requireAuth, async (req, res) => {
  await ensureBuilderTable();
  try {
    const { error } = await supabase
      .from('builder_docs')
      .delete()
      .eq('client_id', req.params.clientId)
      .eq('user_id', req.user.id || req.user.email);
    if (error) throw error;

    await auditLog({
      userId: req.user.id || req.user.email,
      userRole: req.user.role || 'user',
      action: 'doc_deleted',
      entityType: 'builder_doc',
      entityId: req.params.clientId,
      req
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Doc delete error:', err);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// ─── DOCUMENT SIGN-OFF ──────────────────────────────────────────────────────

// POST /docs/documents/:clientId/signoff — electronic sign-off (21 CFR Part 11)
app.post('/docs/documents/:clientId/signoff', requireAuth, async (req, res) => {
  await ensureBuilderTable();
  const { action, comment } = req.body;
  const userId = req.user.id || req.user.email;
  const role = req.user.role || 'operator';
  const name = req.user.name || userId;

  const validActions = ['reviewed', 'approved', 'rejected'];
  if (!validActions.includes(action)) {
    return res.status(400).json({ error: 'Invalid action. Must be: ' + validActions.join(', ') });
  }

  // Role-based permissions
  const canReview = ['qa', 'director', 'admin'].includes(role);
  const canApprove = ['director', 'admin'].includes(role);

  if (action === 'reviewed' && !canReview) {
    return res.status(403).json({ error: 'Only QA, Director, or Admin can review documents' });
  }
  if (action === 'approved' && !canApprove) {
    return res.status(403).json({ error: 'Only Director or Admin can approve documents' });
  }

  try {
    // Fetch current document
    const { data: doc, error: fetchErr } = await supabase
      .from('builder_docs')
      .select('*')
      .eq('client_id', req.params.clientId)
      .eq('user_id', userId)
      .single();

    if (fetchErr || !doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const oldStatus = doc.status;

    // Validate status transition
    if (action === 'reviewed' && oldStatus !== 'draft') {
      return res.status(400).json({ error: 'Only draft documents can be reviewed' });
    }
    if (action === 'approved' && oldStatus !== 'reviewed') {
      return res.status(400).json({ error: 'Only reviewed documents can be approved' });
    }

    // Build sign-off entry
    const signoffEntry = {
      id: 'signoff-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      action,
      user: name,
      role,
      timestamp: new Date().toISOString(),
      comment: comment || null
    };

    // Update document
    const signoffs = Array.isArray(doc.signoffs) ? doc.signoffs : [];
    signoffs.push(signoffEntry);

    const newStatus = action === 'rejected' ? 'draft' : action;
    const versions = Array.isArray(doc.versions) ? doc.versions : [];
    const actionLabel = action === 'reviewed' ? 'Reviewed' : action === 'approved' ? 'Approved' : 'Rejected';
    versions.push({
      time: signoffEntry.timestamp,
      label: actionLabel + ' by ' + name + ' (' + role.toUpperCase() + ')' + (comment ? ' — ' + comment : ''),
      user: name
    });

    const { data: updated, error: updateErr } = await supabase
      .from('builder_docs')
      .update({
        status: newStatus,
        signoffs,
        versions,
        updated_at: signoffEntry.timestamp
      })
      .eq('client_id', req.params.clientId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Immutable audit log
    await auditLog({
      userId,
      userRole: role,
      action: 'doc_' + action,
      entityType: 'builder_doc',
      entityId: req.params.clientId,
      before: { status: oldStatus },
      after: { status: newStatus, signoff: signoffEntry },
      reason: comment || null,
      req
    });

    console.log(`[SIGNOFF] ${actionLabel} doc ${req.params.clientId} by ${name} (${role})`);
    res.json({ ok: true, status: newStatus, signoff: signoffEntry });
  } catch (err) {
    console.error('Sign-off error:', err);
    res.status(500).json({ error: 'Sign-off failed: ' + err.message });
  }
});

// ─── CHAT SESSIONS (persistent conversation history) ─────────────────────────
// Table: chat_sessions (id uuid PK, user_id text, title text, messages jsonb, created_at timestamptz, updated_at timestamptz)
// Create in Supabase SQL editor:
//   CREATE TABLE IF NOT EXISTS chat_sessions (
//     id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//     user_id text NOT NULL,
//     title text DEFAULT 'New conversation',
//     messages jsonb DEFAULT '[]'::jsonb,
//     created_at timestamptz DEFAULT now(),
//     updated_at timestamptz DEFAULT now()
//   );
//   CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);

// Auto-create table on first use
let _chatTableReady = false;
async function ensureChatTable() {
  if (_chatTableReady) return;
  try {
    // Try a simple select to see if table exists
    const { error } = await supabase.from('chat_sessions').select('id').limit(1);
    if (error && error.message.includes('does not exist')) {
      // Table doesn't exist — try to create via rpc (requires a migration function) or just log
      console.log('[CHAT] chat_sessions table not found. Please create it in the Supabase SQL editor.');
      console.log('[CHAT] SQL: CREATE TABLE chat_sessions (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_id text NOT NULL, title text DEFAULT \'New conversation\', messages jsonb DEFAULT \'[]\'::jsonb, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()); CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);');
    }
    _chatTableReady = true;
  } catch { _chatTableReady = true; }
}

// GET /chat/sessions — list all sessions for the current user
app.get('/chat/sessions', requireAuth, async (req, res) => {
  await ensureChatTable();
  try {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('id, title, created_at, updated_at')
      .eq('user_id', req.user.id || req.user.email)
      .order('updated_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Chat sessions list error:', err);
    res.status(500).json({ error: 'Failed to load chat sessions' });
  }
});

// POST /chat/sessions — create a new session
app.post('/chat/sessions', requireAuth, async (req, res) => {
  const { title, messages } = req.body;
  try {
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: req.user.id || req.user.email,
        title: title || 'New conversation',
        messages: messages || []
      })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Chat session create error:', err);
    res.status(500).json({ error: 'Failed to create chat session' });
  }
});

// POST /chat/analyse — analyse all chat sessions for trends (uses Claude)
app.post('/chat/analyse', requireAuth, async (req, res) => {
  await ensureChatTable();
  try {
    const { data: sessions, error } = await supabase
      .from('chat_sessions')
      .select('id, title, messages, created_at, updated_at')
      .eq('user_id', req.user.id || req.user.email)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    if (!sessions || sessions.length === 0) {
      return res.json({
        totalSessions: 0, totalMessages: 0, dateRange: null,
        html: '<p style="color:var(--dim)">No chat sessions to analyse yet. Start some conversations first.</p>'
      });
    }

    let totalMessages = 0;
    const digest = sessions.map(s => {
      const msgs = (s.messages || []).filter(m => m.role === 'user');
      totalMessages += msgs.length;
      const questions = msgs.map(m => m.content).join(' | ');
      return `Session "${s.title}" (${new Date(s.created_at).toLocaleDateString()}): ${questions}`;
    }).join('\n');

    const oldest = sessions[sessions.length - 1].created_at;
    const newest = sessions[0].created_at;
    const dateRange = new Date(oldest).toLocaleDateString() + ' – ' + new Date(newest).toLocaleDateString();

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `You are analysing chat history data from a biologics manufacturing facility's SOP query system called "Vent". Operators, QA, and engineers use this to ask questions about standard operating procedures, equipment, troubleshooting, and processes.

Below is a digest of all ${sessions.length} chat sessions (${totalMessages} user messages) from ${dateRange}. Each line shows the session title and the user questions asked.

════ CHAT SESSION DIGEST ════
${digest}
══════════════════════════════

Analyse this data and produce a concise report in HTML format (no markdown, no code fences). Structure it as:

<h3>Top Topics</h3>
<ul><li><strong>Topic</strong> — brief description of what people ask about (approximate frequency)</li>...</ul>

<h3>Common Question Types</h3>
<ul><li><strong>Type</strong> — explanation</li>...</ul>

<h3>Trending Areas</h3>
<p>Brief paragraph about what areas/equipment/processes are getting the most attention recently.</p>

<h3>Insights</h3>
<p>1-2 paragraph summary: any patterns you notice, knowledge gaps, areas where better documentation might help, or training opportunities.</p>

Keep it concise and actionable. Use simple HTML tags only (h3, ul, li, p, strong, em). No CSS classes or styles.`
      }]
    });

    const html = message.content[0].text.replace(/```html|```/g, '').trim();

    res.json({ totalSessions: sessions.length, totalMessages, dateRange, html });
  } catch (err) {
    console.error('Chat analysis error:', err);
    res.status(500).json({ error: 'Analysis failed: ' + err.message });
  }
});

// GET /chat/sessions/:id — get a single session with messages
app.get('/chat/sessions/:id', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id || req.user.email)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Session not found' });
    res.json(data);
  } catch (err) {
    console.error('Chat session get error:', err);
    res.status(500).json({ error: 'Failed to load chat session' });
  }
});

// PUT /chat/sessions/:id — update session (title, messages)
app.put('/chat/sessions/:id', requireAuth, async (req, res) => {
  const { title, messages } = req.body;
  const update = { updated_at: new Date().toISOString() };
  if (title !== undefined) update.title = title;
  if (messages !== undefined) update.messages = messages;
  try {
    const { data, error } = await supabase
      .from('chat_sessions')
      .update(update)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id || req.user.email)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Chat session update error:', err);
    res.status(500).json({ error: 'Failed to update chat session' });
  }
});

// ── BULK DELETE ALL SESSIONS (must be before :id route) ──
app.delete('/chat/sessions', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('user_id', req.user.id || req.user.email)
      .select('id');
    if (error) throw error;
    res.json({ ok: true, deleted: (data || []).length });
  } catch (err) {
    console.error('Bulk delete sessions error:', err);
    res.status(500).json({ error: 'Failed to clear sessions' });
  }
});

// DELETE /chat/sessions/:id — delete a single session
app.delete('/chat/sessions/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id || req.user.email);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('Chat session delete error:', err);
    res.status(500).json({ error: 'Failed to delete chat session' });
  }
});

// ── EXPORT CHAT TO DOC BUILDER ──
app.post('/chat/export-to-doc', requireAuth, async (req, res) => {
  try {
    const { messages, title } = req.body;
    if (!messages || !messages.length) return res.status(400).json({ error: 'No messages provided' });

    const conversation = messages.map(m => `${m.role === 'user' ? 'USER' : 'ASSISTANT'}: ${m.content}`).join('\n\n');

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are analysing a Q&A conversation from a biologics manufacturing facility's SOP query system.

The conversation title is: "${title || 'Untitled'}"

Here is the full conversation:
${conversation}

Extract the key issues, procedures, findings, and action items discussed. Convert them into a structured SOP-style document with clear steps.

Return ONLY valid JSON (no markdown fences, no explanation) in this exact format:
{
  "title": "A clear document title based on the conversation topic",
  "area": "One of: Upstream, Media Prep, Harvest / TFF, CIP / SIP, QC / In-process, General",
  "description": "A 1-2 sentence summary of what this document covers",
  "steps": [
    { "title": "Step title", "content": "Detailed step content", "note": "Any warnings or critical notes (or empty string)" }
  ]
}

Create 3-8 meaningful steps that capture the essential information from the conversation. Focus on actionable procedures and key findings.`
      }]
    });

    let text = msg.content[0].text.trim();
    // Strip any markdown code fences
    text = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
    const data = JSON.parse(text);
    res.json(data);
  } catch (err) {
    console.error('Export to doc error:', err);
    res.status(500).json({ error: 'Export failed: ' + err.message });
  }
});

// ── AI-POWERED CHAT SEARCH ──
app.post('/chat/search', requireAuth, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'query required' });

    // Fetch all sessions WITH messages from Supabase
    const { data: sessions, error } = await supabase
      .from('chat_sessions')
      .select('id, title, messages, created_at')
      .eq('user_id', req.user.id || req.user.email)
      .order('updated_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    if (!sessions || !sessions.length) {
      return res.json({ matches: [] });
    }

    // Build rich summaries from actual message content
    const summaries = sessions.map((s, i) => {
      let preview = '';
      const msgs = s.messages || [];
      let count = 0;
      for (let j = 0; j < msgs.length && count < 3; j++) {
        if (msgs[j].role === 'user') {
          preview += (preview ? ' | ' : '') + (msgs[j].content || '').substring(0, 150);
          count++;
        }
      }
      return `[${i}] ID=${s.id} | Title: ${s.title || 'Untitled'} | User messages: ${preview || '(empty)'}`;
    }).join('\n');

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `You are searching through conversations from a biologics manufacturing facility's Q&A system.

The user is looking for: "${query}"

Here are the conversations with their titles and user messages:
${summaries}

Return ONLY a JSON array of the matching conversation IDs (strings), ordered by relevance. If nothing matches, return an empty array [].
Example: ["abc-123", "def-456"]

Be generous with matching — the user may describe the conversation loosely or use different words than what's in the title/preview. Think about what the conversation was likely about and match if the intent is similar.`
      }]
    });

    let text = msg.content[0].text.trim();
    text = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
    const matchedIds = JSON.parse(text);
    res.json({ matches: matchedIds });
  } catch (err) {
    console.error('Chat search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ── DEV TO-DO LIST ──

// GET /todos — list todos for the current user, filtered by page
// Page separation uses a user_id prefix: "builder::{email}" vs raw email
app.get('/todos', requireAuth, async (req, res) => {
  const page = req.query.page || 'query';
  const userId = req.user.id || req.user.email;
  const effectiveId = page === 'query' ? userId : page + '::' + userId;
  try {
    const { data, error } = await supabase
      .from('dev_todos')
      .select('*')
      .eq('user_id', effectiveId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Todos list error:', err);
    res.status(500).json({ error: 'Failed to load todos' });
  }
});

// POST /todos — create a new todo
app.post('/todos', requireAuth, async (req, res) => {
  const { title, parent_id, page } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const userId = req.user.id || req.user.email;
  const effectiveId = (!page || page === 'query') ? userId : page + '::' + userId;
  try {
    const { data, error } = await supabase
      .from('dev_todos')
      .insert({
        user_id: effectiveId,
        title,
        parent_id: parent_id || null
      })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Todo create error:', err);
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

// PATCH /todos/:id — update a todo (title, done, position)
app.patch('/todos/:id', requireAuth, async (req, res) => {
  const { title, done, position, page } = req.body;
  const userId = req.user.id || req.user.email;
  const effectiveId = (!page || page === 'query') ? userId : page + '::' + userId;
  const update = { updated_at: new Date().toISOString() };
  if (title !== undefined) update.title = title;
  if (done !== undefined) update.done = done;
  if (position !== undefined) update.position = position;
  try {
    const { data, error } = await supabase
      .from('dev_todos')
      .update(update)
      .eq('id', req.params.id)
      .eq('user_id', effectiveId)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Todo update error:', err);
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

// DELETE /todos/:id — delete a todo (cascade removes children)
app.delete('/todos/:id', requireAuth, async (req, res) => {
  const page = req.query.page || 'query';
  const userId = req.user.id || req.user.email;
  const effectiveId = page === 'query' ? userId : page + '::' + userId;
  try {
    const { error } = await supabase
      .from('dev_todos')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', effectiveId);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('Todo delete error:', err);
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

// ─── ELEVENLABS SPEECH-TO-TEXT PROXY ──────────────────────────────────────────
app.post('/stt', async (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ElevenLabs API key not configured' });

  const { audio, mimeType = 'audio/webm', language_code } = req.body;
  if (!audio) return res.status(400).json({ error: 'Audio data is required' });

  try {
    const audioBuffer = Buffer.from(audio, 'base64');

    // Build multipart/form-data manually
    const boundary = 'vent-stt-' + Date.now();
    const validLangs = ['eng', 'cmn', 'spa'];
    const parts = [
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="recording.webm"\r\nContent-Type: ${mimeType}\r\n\r\n`,
      audioBuffer,
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model_id"\r\n\r\nscribe_v1`,
      ...(language_code && validLangs.includes(language_code) ? [`\r\n--${boundary}\r\nContent-Disposition: form-data; name="language_code"\r\n\r\n${language_code}`] : []),
      `\r\n--${boundary}--\r\n`,
    ];
    const body = Buffer.concat(parts.map(p => typeof p === 'string' ? Buffer.from(p) : p));

    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[STT] ElevenLabs error:', err);
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    res.json({ text: data.text || '' });
  } catch (err) {
    console.error('[STT] Error:', err.message);
    res.status(500).json({ error: 'Speech-to-text failed' });
  }
});

// ─── ELEVENLABS TTS PROXY ────────────────────────────────────────────────────
app.post('/tts', async (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ElevenLabs API key not configured' });

  const { text, voiceId = 'pNInz6obpgDQGcFmaJgB', modelId = 'eleven_multilingual_v2' } = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required' });

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3 },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    res.set('Content-Type', 'audio/mpeg');
    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error('[TTS] Error:', err.message);
    res.status(500).json({ error: 'TTS request failed' });
  }
});

// ─── TRANSLATION ENDPOINT (Claude-powered) ──────────────────────────────────
app.post('/translate', requireAuth, async (req, res) => {
  const { text, targetLang, context } = req.body;
  if (!text || !targetLang) return res.status(400).json({ error: 'text and targetLang are required' });

  const langNames = { en: 'English', zh: 'Simplified Chinese', es: 'Spanish' };
  const target = langNames[targetLang];
  if (!target) return res.status(400).json({ error: 'Unsupported language. Use en, zh, or es.' });

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `You are a translator specialising in pharmaceutical manufacturing and GMP terminology. Translate the given text into ${target}. Preserve any technical terms, SOP references, or batch record numbers exactly. Return ONLY the translated text, no explanations.`,
      messages: [{ role: 'user', content: context ? `Context: ${context}\n\nTranslate: ${text}` : text }],
    });
    const translated = message.content[0].text;
    res.json({ translated, lang: targetLang });
  } catch (err) {
    console.error('[TRANSLATE] Error:', err.message);
    res.status(500).json({ error: 'Translation failed' });
  }
});

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
