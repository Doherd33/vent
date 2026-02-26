require('dotenv').config();

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');
const { VoyageAIClient } = require('voyageai');
const { buildContactsContext } = require('./data/contacts');

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
app.use(express.json());
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
app.get('/debug-env', (req, res) => {
  const voyageKeys = Object.keys(process.env).filter(k => k.toLowerCase().includes('voyage'));
  res.json({ voyageKeys, allKeys: Object.keys(process.env).sort() });
});

// Debug: test the full RAG pipeline
app.get('/debug-rag', async (req, res) => {
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

-- ── Add status column to submissions if missing ──────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='submissions' AND column_name='status') THEN
    ALTER TABLE submissions ADD COLUMN status TEXT DEFAULT 'new';
  END IF;
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

// POST /query — operator SOP knowledge search
app.post('/query', requireAuth, async (req, res) => {
  const { question, area } = req.body;

  if (!question || question.length < 5) {
    return res.status(400).json({ error: 'Question too short' });
  }

  try {
    const chunks = await getRelevantChunks(question, area || 'Upstream');
    const sopContext = buildSopContext(chunks);

    console.log(`[QUERY] "${question.slice(0, 60)}" — ${chunks.length} chunks retrieved`);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `You are the SOP Knowledge Assistant for a biologics manufacturing facility running upstream perfusion processes. An operator on the manufacturing floor has asked a question. You have the relevant SOP sections below. Answer clearly and practically.

RULES:
- Answer only from the SOP content provided. Do not invent steps or values.
- If the question is procedural, return numbered steps.
- If the question is about a specification or parameter value, populate the params array.
- If the question cannot be answered from the provided SOP content, say so clearly in the summary.
- Keep language plain and direct — this is for a floor operator, not a regulator.
- Always cite the exact SOP section numbers you drew from.

════ RELEVANT SOP SECTIONS ════
${sopContext}
═══════════════════════════════

Process area: ${area || 'Upstream'}
Operator question: "${question}"

Return ONLY valid JSON — no markdown, no preamble.

{
  "category": "procedure or specification or troubleshooting or general",
  "summary": "2–3 sentences answering the question in plain language",
  "steps": [{ "n": 1, "action": "step instruction", "detail": "additional detail or null", "critical": false, "value": "specific value or target if relevant, else null" }],
  "params": [{ "name": "parameter name", "value": "target value", "unit": "unit string", "range": "acceptable range or null", "flag": "critical or normal" }],
  "warnings": ["warning text — only include genuine safety or quality critical cautions"],
  "notes": ["general procedural note"],
  "sources": [{ "code": "doc_id e.g. WX-SOP-1001-03", "title": "document title", "section": "section number e.g. 8.6.1" }]
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

app.listen(PORT, () => {
  const keys = ['ANTHROPIC_API_KEY','SUPABASE_URL','SUPABASE_KEY','VOYAGE_API_KEY','VOYAGE_KEY'];
  keys.forEach(k => console.log(`[ENV] ${k}: ${process.env[k] ? 'SET' : 'MISSING'}`));
  console.log('[VOYAGE] Using key prefix:', getVoyageClient().key.slice(0,6));
});
