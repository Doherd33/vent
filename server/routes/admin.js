'use strict';
const crypto = require('crypto');
const { createToken, hashPassword } = require('../lib/auth');

module.exports = function(app, { supabase, auditLog, auth }) {
  const { requireAuth } = auth;

  // GET /admin/setup — returns SQL to create all tables in Supabase
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

-- ── Operator Feedback (Voice Feedback Loop) ────────────────
CREATE TABLE IF NOT EXISTS operator_feedback (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           TEXT NOT NULL,
  user_name         TEXT DEFAULT 'Unknown',
  user_role         TEXT DEFAULT 'operator',
  status            TEXT DEFAULT 'active',
  transcript        JSONB DEFAULT '[]'::jsonb,
  raw_text          TEXT DEFAULT '',
  analysis          JSONB,
  categories        TEXT[] DEFAULT '{}',
  sentiment         TEXT,
  severity          TEXT DEFAULT 'low',
  summary           TEXT DEFAULT '',
  key_quotes        TEXT[] DEFAULT '{}',
  generated_prompt  TEXT,
  prompt_generated_at TIMESTAMPTZ,
  session_duration  INT DEFAULT 0,
  message_count     INT DEFAULT 0,
  lang              TEXT DEFAULT 'en',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_user ON operator_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON operator_feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON operator_feedback(created_at DESC);

ALTER TABLE operator_feedback ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY feedback_all ON operator_feedback FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
  `.trim();
    res.type('text/plain').send(sql);
  });

  // POST /admin/setup — attempt to create the table via Supabase
  app.post('/admin/setup', async (req, res) => {
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
};
