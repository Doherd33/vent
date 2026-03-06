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

-- ── Deviations (Quality Deviation Tracking) ─────────────────
CREATE TABLE IF NOT EXISTS deviations (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dev_id              TEXT UNIQUE NOT NULL,
  title               TEXT NOT NULL,
  description         TEXT DEFAULT '',
  severity            TEXT NOT NULL DEFAULT 'minor',
  status              TEXT NOT NULL DEFAULT 'draft',
  source              TEXT DEFAULT '',
  source_type         TEXT DEFAULT 'observation',
  process_area        TEXT DEFAULT '',
  equipment_ref       TEXT DEFAULT '',
  classification      JSONB DEFAULT '{}'::jsonb,
  five_why            JSONB DEFAULT '[]'::jsonb,
  ishikawa            JSONB DEFAULT '{}'::jsonb,
  root_cause          TEXT DEFAULT '',
  root_cause_category TEXT DEFAULT '',
  capa_id             TEXT,
  reported_by         TEXT NOT NULL DEFAULT 'unknown',
  owner               TEXT DEFAULT 'Unassigned',
  assigned_to         TEXT DEFAULT '',
  owner_role          TEXT DEFAULT '',
  due_date            DATE,
  closed_at           TIMESTAMPTZ,
  closed_by           TEXT,
  ai_severity         TEXT,
  ai_summary          TEXT DEFAULT '',
  ai_investigation    JSONB DEFAULT '{}'::jsonb,
  escalation_history  JSONB DEFAULT '[]'::jsonb,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dev_severity ON deviations(severity);
CREATE INDEX IF NOT EXISTS idx_dev_status   ON deviations(status);
CREATE INDEX IF NOT EXISTS idx_dev_owner    ON deviations(owner);
CREATE INDEX IF NOT EXISTS idx_dev_area     ON deviations(process_area);
CREATE INDEX IF NOT EXISTS idx_dev_capa     ON deviations(capa_id);
CREATE INDEX IF NOT EXISTS idx_dev_created  ON deviations(created_at DESC);

ALTER TABLE deviations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY deviations_all ON deviations FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Equipment (Logbook Master) ─────────────────────────────
CREATE TABLE IF NOT EXISTS equipment (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equip_id        TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'general',
  location        TEXT DEFAULT '',
  serial_number   TEXT DEFAULT '',
  model           TEXT DEFAULT '',
  manufacturer    TEXT DEFAULT '',
  status          TEXT DEFAULT 'active',
  commissioned_at TIMESTAMPTZ,
  created_by      TEXT NOT NULL DEFAULT 'system',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_equipment_type   ON equipment(type);

ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY equipment_all ON equipment FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Equipment Log Entries ──────────────────────────────────
CREATE TABLE IF NOT EXISTS equipment_log_entries (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  log_id          TEXT UNIQUE NOT NULL,
  equip_id        TEXT NOT NULL,
  entry_type      TEXT NOT NULL DEFAULT 'usage',
  title           TEXT NOT NULL DEFAULT '',
  description     TEXT DEFAULT '',
  performed_by    TEXT NOT NULL DEFAULT 'unknown',
  performed_role  TEXT NOT NULL DEFAULT 'operator',
  performed_at    TIMESTAMPTZ DEFAULT now(),
  duration_min    INT,
  status          TEXT DEFAULT 'complete',
  alarm_severity  TEXT,
  esig_user       TEXT,
  esig_at         TIMESTAMPTZ,
  esig_reason     TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eqlog_equip  ON equipment_log_entries(equip_id);
CREATE INDEX IF NOT EXISTS idx_eqlog_type   ON equipment_log_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_eqlog_date   ON equipment_log_entries(performed_at DESC);

ALTER TABLE equipment_log_entries ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY eqlog_all ON equipment_log_entries FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Equipment Status History ─────────────────────────────────
CREATE TABLE IF NOT EXISTS equipment_status_history (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equip_id        TEXT NOT NULL,
  previous_status TEXT NOT NULL,
  new_status      TEXT NOT NULL,
  changed_by      TEXT NOT NULL,
  reason          TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equip_status_hist_equip ON equipment_status_history(equip_id);
CREATE INDEX IF NOT EXISTS idx_equip_status_hist_date ON equipment_status_history(created_at);

ALTER TABLE equipment_status_history ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY equip_status_hist_all ON equipment_status_history FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ══════════════════════════════════════════════════════════════
-- INCUBATOR LOGBOOK (CO2 Incubator Management)
-- ══════════════════════════════════════════════════════════════

-- ── Incubator Units ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incubator_units (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  incubator_id       TEXT UNIQUE NOT NULL,
  name               TEXT NOT NULL,
  model              TEXT DEFAULT '',
  serial_number      TEXT DEFAULT '',
  location           TEXT DEFAULT '',
  status             TEXT DEFAULT 'active',
  co2_setpoint       NUMERIC(5,2),
  temp_setpoint      NUMERIC(5,2),
  humidity_setpoint   NUMERIC(5,2),
  created_by         TEXT NOT NULL DEFAULT 'system',
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incu_status   ON incubator_units(status);
CREATE INDEX IF NOT EXISTS idx_incu_location ON incubator_units(location);

ALTER TABLE incubator_units ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY incubator_units_all ON incubator_units FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TABLE incubator_units IS 'CO2 incubator registration — 21 CFR Part 11 compliant equipment logbook.';

-- ── Incubator Environmental Logs ────────────────────────────
CREATE TABLE IF NOT EXISTS incubator_logs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  log_id          TEXT UNIQUE NOT NULL,
  incubator_id    TEXT NOT NULL,
  recorded_by     TEXT NOT NULL,
  recorded_role   TEXT NOT NULL DEFAULT 'operator',
  recorded_at     TIMESTAMPTZ DEFAULT now(),
  temperature     NUMERIC(5,2),
  co2_level       NUMERIC(5,2),
  humidity        NUMERIC(5,2),
  door_openings   INT,
  notes           TEXT DEFAULT '',
  status          TEXT DEFAULT 'normal',
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ilog_incubator ON incubator_logs(incubator_id);
CREATE INDEX IF NOT EXISTS idx_ilog_status    ON incubator_logs(status);
CREATE INDEX IF NOT EXISTS idx_ilog_recorded  ON incubator_logs(recorded_at DESC);

ALTER TABLE incubator_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY incubator_logs_all ON incubator_logs FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Incubator Alarms ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incubator_alarms (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alarm_id         TEXT UNIQUE NOT NULL,
  incubator_id     TEXT NOT NULL,
  alarm_type       TEXT NOT NULL,
  severity         TEXT DEFAULT 'warning',
  triggered_at     TIMESTAMPTZ DEFAULT now(),
  acknowledged_by  TEXT,
  acknowledged_at  TIMESTAMPTZ,
  resolved_at      TIMESTAMPTZ,
  notes            TEXT DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ialm_incubator ON incubator_alarms(incubator_id);
CREATE INDEX IF NOT EXISTS idx_ialm_severity  ON incubator_alarms(severity);
CREATE INDEX IF NOT EXISTS idx_ialm_triggered ON incubator_alarms(triggered_at DESC);

ALTER TABLE incubator_alarms ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY incubator_alarms_all ON incubator_alarms FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Incubator Calibrations (21 CFR Part 11 e-sig) ──────────
CREATE TABLE IF NOT EXISTS incubator_calibrations (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  calibration_id   TEXT UNIQUE NOT NULL,
  incubator_id     TEXT NOT NULL,
  calibrated_by    TEXT NOT NULL,
  calibrated_role  TEXT NOT NULL DEFAULT 'engineering',
  calibration_date DATE NOT NULL,
  next_due         DATE,
  temp_offset      NUMERIC(5,3),
  co2_offset       NUMERIC(5,3),
  humidity_offset   NUMERIC(5,3),
  result           TEXT DEFAULT 'pass',
  certificate_ref  TEXT DEFAULT '',
  notes            TEXT DEFAULT '',
  esig_user        TEXT,
  esig_at          TIMESTAMPTZ,
  esig_reason      TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ical_incubator ON incubator_calibrations(incubator_id);
CREATE INDEX IF NOT EXISTS idx_ical_result    ON incubator_calibrations(result);
CREATE INDEX IF NOT EXISTS idx_ical_next_due  ON incubator_calibrations(next_due);

ALTER TABLE incubator_calibrations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY incubator_calibrations_all ON incubator_calibrations FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TABLE incubator_calibrations IS 'Calibration records with e-signature — 21 CFR Part 11.';

-- ── Incubator Maintenance ───────────────────────────────────
CREATE TABLE IF NOT EXISTS incubator_maintenance (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_id  TEXT UNIQUE NOT NULL,
  incubator_id    TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'preventive',
  description     TEXT DEFAULT '',
  performed_by    TEXT NOT NULL,
  performed_role  TEXT NOT NULL DEFAULT 'engineering',
  performed_at    TIMESTAMPTZ DEFAULT now(),
  next_due        DATE,
  status          TEXT DEFAULT 'completed',
  notes           TEXT DEFAULT '',
  esig_user       TEXT,
  esig_at         TIMESTAMPTZ,
  esig_reason     TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_imnt_incubator ON incubator_maintenance(incubator_id);
CREATE INDEX IF NOT EXISTS idx_imnt_type      ON incubator_maintenance(type);
CREATE INDEX IF NOT EXISTS idx_imnt_status    ON incubator_maintenance(status);
CREATE INDEX IF NOT EXISTS idx_imnt_next_due  ON incubator_maintenance(next_due);

ALTER TABLE incubator_maintenance ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY incubator_maintenance_all ON incubator_maintenance FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Media & Buffer Prep Records ──────────────────────────────
CREATE TABLE IF NOT EXISTS media_buffer_records (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  record_id         TEXT UNIQUE NOT NULL,
  recipe_name       TEXT NOT NULL,
  recipe_type       TEXT NOT NULL DEFAULT 'media',
  batch_id          TEXT,
  status            TEXT DEFAULT 'draft',
  components        JSONB DEFAULT '[]'::jsonb,
  ph_target         NUMERIC(5,2),
  ph_actual         NUMERIC(5,2),
  ph_adjusted       BOOLEAN DEFAULT false,
  ph_adjusted_by    TEXT,
  ph_adjusted_at    TIMESTAMPTZ,
  filter_type       TEXT,
  filter_lot        TEXT,
  filter_integrity  TEXT DEFAULT 'pending',
  filter_tested_by  TEXT,
  filter_tested_at  TIMESTAMPTZ,
  hold_time_hours   INT,
  hold_start        TIMESTAMPTZ,
  hold_expiry       TIMESTAMPTZ,
  volume_litres     NUMERIC(10,2),
  temperature_c     NUMERIC(5,1),
  prepared_by       TEXT NOT NULL DEFAULT 'unknown',
  prepared_role     TEXT NOT NULL DEFAULT 'operator',
  verified_by       TEXT,
  verified_at       TIMESTAMPTZ,
  esig_user         TEXT,
  esig_at           TIMESTAMPTZ,
  esig_reason       TEXT,
  notes             TEXT DEFAULT '',
  ai_analysis       JSONB,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_prep_status  ON media_buffer_records(status);
CREATE INDEX IF NOT EXISTS idx_media_prep_type    ON media_buffer_records(recipe_type);
CREATE INDEX IF NOT EXISTS idx_media_prep_batch   ON media_buffer_records(batch_id);
CREATE INDEX IF NOT EXISTS idx_media_prep_created ON media_buffer_records(created_at DESC);

ALTER TABLE media_buffer_records ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY media_prep_all ON media_buffer_records FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Training Assignments ────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_assignments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  training_id     TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT DEFAULT '',
  sop_code        TEXT,
  sop_change_key  TEXT,
  assigned_to     TEXT NOT NULL,
  assigned_role   TEXT NOT NULL,
  assigned_by     TEXT NOT NULL,
  due_date        DATE,
  priority        TEXT DEFAULT 'normal',
  status          TEXT DEFAULT 'assigned',
  training_type   TEXT DEFAULT 'initial',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_assign_to ON training_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_training_assign_status ON training_assignments(status);
CREATE INDEX IF NOT EXISTS idx_training_assign_sop ON training_assignments(sop_code);
CREATE INDEX IF NOT EXISTS idx_training_assign_due ON training_assignments(due_date);

ALTER TABLE training_assignments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY training_assignments_all ON training_assignments FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Training Completions ────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_completions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id   UUID NOT NULL REFERENCES training_assignments(id) ON DELETE CASCADE,
  training_id     TEXT NOT NULL,
  completed_by    TEXT NOT NULL,
  completed_at    TIMESTAMPTZ DEFAULT now(),
  score           INT,
  passed          BOOLEAN DEFAULT true,
  evidence        TEXT,
  assessor        TEXT,
  assessor_role   TEXT,
  notes           TEXT DEFAULT '',
  e_signature     TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_comp_assign ON training_completions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_training_comp_tid ON training_completions(training_id);
CREATE INDEX IF NOT EXISTS idx_training_comp_by ON training_completions(completed_by);

ALTER TABLE training_completions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY training_completions_all ON training_completions FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ══════════════════════════════════════════════════════════════
-- SUPPLIER QUALITY (Supplier Qualification Management)
-- ══════════════════════════════════════════════════════════════

-- ── Suppliers (Approved Supplier List) ────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id       TEXT UNIQUE NOT NULL,
  name              TEXT NOT NULL,
  category          TEXT NOT NULL DEFAULT 'raw_material',
  status            TEXT DEFAULT 'pending',
  risk_level        TEXT DEFAULT 'medium',
  contact_name      TEXT DEFAULT '',
  contact_email     TEXT DEFAULT '',
  contact_phone     TEXT DEFAULT '',
  address           TEXT DEFAULT '',
  qualification_date TIMESTAMPTZ,
  next_audit_date   DATE,
  quality_agreement_status TEXT DEFAULT 'none',
  notes             TEXT DEFAULT '',
  created_by        TEXT NOT NULL DEFAULT 'system',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_risk ON suppliers(risk_level);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY suppliers_all ON suppliers FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Supplier Audits ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_audits (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id        TEXT UNIQUE NOT NULL,
  supplier_id     TEXT NOT NULL REFERENCES suppliers(supplier_id),
  audit_type      TEXT NOT NULL DEFAULT 'routine',
  audit_date      DATE NOT NULL,
  auditor         TEXT NOT NULL,
  status          TEXT DEFAULT 'scheduled',
  findings        JSONB DEFAULT '[]',
  score           INTEGER,
  notes           TEXT DEFAULT '',
  created_by      TEXT NOT NULL DEFAULT 'system',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_audits_supplier ON supplier_audits(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_audits_status ON supplier_audits(status);

ALTER TABLE supplier_audits ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY supplier_audits_all ON supplier_audits FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Quality Agreements ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS quality_agreements (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agreement_id    TEXT UNIQUE NOT NULL,
  supplier_id     TEXT NOT NULL REFERENCES suppliers(supplier_id),
  version         TEXT DEFAULT '1.0',
  status          TEXT DEFAULT 'draft',
  effective_date  DATE,
  expiry_date     DATE,
  reviewed_by     TEXT,
  approved_by     TEXT,
  notes           TEXT DEFAULT '',
  created_by      TEXT NOT NULL DEFAULT 'system',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qa_agreements_supplier ON quality_agreements(supplier_id);

ALTER TABLE quality_agreements ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY quality_agreements_all ON quality_agreements FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Shift Handovers (GMP Shift Handover System) ─────────────
CREATE TABLE IF NOT EXISTS shift_handovers (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  handover_id     TEXT UNIQUE NOT NULL,
  shift_type      TEXT NOT NULL DEFAULT 'day',
  shift_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  outgoing_user   TEXT NOT NULL,
  outgoing_role   TEXT DEFAULT '',
  incoming_user   TEXT,
  incoming_role   TEXT DEFAULT '',
  status          TEXT DEFAULT 'draft',
  open_batches    JSONB DEFAULT '[]',
  pending_samples JSONB DEFAULT '[]',
  equipment_holds JSONB DEFAULT '[]',
  safety_items    JSONB DEFAULT '[]',
  notes           TEXT DEFAULT '',
  ai_summary      TEXT DEFAULT '',
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_handovers_date ON shift_handovers(shift_date);
CREATE INDEX IF NOT EXISTS idx_handovers_status ON shift_handovers(status);
CREATE INDEX IF NOT EXISTS idx_handovers_outgoing ON shift_handovers(outgoing_user);

ALTER TABLE shift_handovers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY shift_handovers_all ON shift_handovers FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TABLE shift_handovers IS 'GMP shift handover records — 21 CFR Part 11 compliant structured handover system.';

-- ── Cleaning Records (GMP Equipment Cleaning) ─────────────
CREATE TABLE IF NOT EXISTS cleaning_records (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cleaning_id           TEXT UNIQUE NOT NULL,
  equip_id              TEXT NOT NULL,
  cleaning_type         TEXT NOT NULL DEFAULT 'manual',
  cleaning_agent        TEXT DEFAULT '',
  agent_lot_number      TEXT DEFAULT '',
  agent_concentration   TEXT DEFAULT '',
  rinse_conductivity    NUMERIC,
  rinse_conductivity_limit NUMERIC DEFAULT 1.0,
  visual_inspection     TEXT DEFAULT 'pass',
  operator              TEXT NOT NULL,
  verifier              TEXT,
  verified_at           TIMESTAMPTZ,
  status                TEXT DEFAULT 'in_progress',
  started_at            TIMESTAMPTZ DEFAULT now(),
  completed_at          TIMESTAMPTZ,
  hold_time_expires     TIMESTAMPTZ,
  hold_time_hours       INTEGER DEFAULT 72,
  notes                 TEXT DEFAULT '',
  created_by            TEXT NOT NULL DEFAULT 'system',
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cleaning_equip ON cleaning_records(equip_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_status ON cleaning_records(status);
CREATE INDEX IF NOT EXISTS idx_cleaning_hold ON cleaning_records(hold_time_expires);

ALTER TABLE cleaning_records ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY cleaning_records_all ON cleaning_records FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TABLE cleaning_records IS 'GMP equipment cleaning records — hold time tracking, rinse conductivity, second-person verification.';

-- ══════════════════════════════════════════════════════════════
-- ROUND 3 TABLES
-- ══════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════
-- CHANGE CONTROL (ICH Q10 Change Management)
-- ══════════════════════════════════════════════════════════════

-- ── Change Controls ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS change_controls (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cc_id                 TEXT UNIQUE NOT NULL,
  title                 TEXT NOT NULL,
  description           TEXT NOT NULL DEFAULT '',
  change_type           TEXT NOT NULL DEFAULT 'process',
  sub_category          TEXT DEFAULT '',
  category              TEXT NOT NULL DEFAULT 'minor',
  status                TEXT DEFAULT 'draft',
  priority              TEXT DEFAULT 'medium',
  urgency               TEXT DEFAULT 'planned',
  regulatory_class      TEXT DEFAULT 'none',
  regulatory_filing_type TEXT DEFAULT '',
  originator            TEXT NOT NULL,
  originator_dept       TEXT DEFAULT '',
  affected_departments  JSONB DEFAULT '[]',
  affected_sops         JSONB DEFAULT '[]',
  affected_equipment    JSONB DEFAULT '[]',
  affected_batches      JSONB DEFAULT '[]',
  justification         TEXT DEFAULT '',
  proposed_change       TEXT DEFAULT '',
  risk_assessment       TEXT DEFAULT '',
  risk_severity         INTEGER DEFAULT 0,
  risk_probability      INTEGER DEFAULT 0,
  risk_detectability    INTEGER DEFAULT 0,
  risk_rpn              INTEGER DEFAULT 0,
  ccb_required          BOOLEAN DEFAULT false,
  effectiveness_criteria TEXT DEFAULT '',
  implementation_plan   TEXT DEFAULT '',
  implementation_date   DATE,
  target_completion     DATE,
  actual_completion     DATE,
  effectiveness_check   TEXT DEFAULT '',
  effectiveness_date    DATE,
  effectiveness_result  TEXT DEFAULT '',
  effectiveness_due_date DATE,
  linked_deviation_id   TEXT DEFAULT '',
  linked_capa_id        TEXT DEFAULT '',
  linked_audit_finding  TEXT DEFAULT '',
  ai_impact_summary     TEXT DEFAULT '',
  ai_reg_classification TEXT DEFAULT '',
  ai_risk_score         JSONB DEFAULT '{}',
  ai_checklist          JSONB DEFAULT '[]',
  ai_affected_sops      JSONB DEFAULT '[]',
  ai_similar_changes    JSONB DEFAULT '[]',
  ai_effectiveness_criteria TEXT DEFAULT '',
  closure_notes         TEXT DEFAULT '',
  sla_assessment_due    DATE,
  sla_approval_due      DATE,
  created_by            TEXT NOT NULL DEFAULT 'system',
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cc_status ON change_controls(status);
CREATE INDEX IF NOT EXISTS idx_cc_type ON change_controls(change_type);
CREATE INDEX IF NOT EXISTS idx_cc_priority ON change_controls(priority);
CREATE INDEX IF NOT EXISTS idx_cc_urgency ON change_controls(urgency);
CREATE INDEX IF NOT EXISTS idx_cc_regulatory ON change_controls(regulatory_class);
CREATE INDEX IF NOT EXISTS idx_cc_originator ON change_controls(originator);
CREATE INDEX IF NOT EXISTS idx_cc_ccb ON change_controls(ccb_required);
CREATE INDEX IF NOT EXISTS idx_cc_effectiveness_due ON change_controls(effectiveness_due_date);
ALTER TABLE change_controls ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'change_controls_all') THEN
    CREATE POLICY change_controls_all ON change_controls FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── Change Control Impact Assessments ────────────────────────
CREATE TABLE IF NOT EXISTS cc_impact_assessments (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id     TEXT UNIQUE NOT NULL,
  cc_id             TEXT NOT NULL REFERENCES change_controls(cc_id),
  department        TEXT NOT NULL,
  assessor          TEXT NOT NULL,
  impact_level      TEXT DEFAULT 'none',
  impact_details    TEXT DEFAULT '',
  mitigation        TEXT DEFAULT '',
  validation_required BOOLEAN DEFAULT false,
  validation_type   TEXT DEFAULT '',
  regulatory_impact BOOLEAN DEFAULT false,
  cascade_impacts   TEXT DEFAULT '',
  status            TEXT DEFAULT 'pending',
  due_date          DATE,
  completed_at      TIMESTAMPTZ,
  created_by        TEXT NOT NULL DEFAULT 'system',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ccia_cc ON cc_impact_assessments(cc_id);
CREATE INDEX IF NOT EXISTS idx_ccia_dept ON cc_impact_assessments(department);
CREATE INDEX IF NOT EXISTS idx_ccia_status ON cc_impact_assessments(status);
CREATE INDEX IF NOT EXISTS idx_ccia_due ON cc_impact_assessments(due_date);
ALTER TABLE cc_impact_assessments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cc_impact_assessments_all') THEN
    CREATE POLICY cc_impact_assessments_all ON cc_impact_assessments FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── Change Control Approvals ─────────────────────────────────
CREATE TABLE IF NOT EXISTS cc_approvals (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  approval_id     TEXT UNIQUE NOT NULL,
  cc_id           TEXT NOT NULL REFERENCES change_controls(cc_id),
  approver        TEXT NOT NULL,
  approver_role   TEXT NOT NULL,
  approval_tier   INTEGER DEFAULT 1,
  decision        TEXT DEFAULT 'pending',
  signature_meaning TEXT DEFAULT '',
  comments        TEXT DEFAULT '',
  decided_at      TIMESTAMPTZ,
  created_by      TEXT NOT NULL DEFAULT 'system',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cc_approvals_cc ON cc_approvals(cc_id);
CREATE INDEX IF NOT EXISTS idx_cc_approvals_approver ON cc_approvals(approver);
CREATE INDEX IF NOT EXISTS idx_cc_approvals_decision ON cc_approvals(decision);
CREATE INDEX IF NOT EXISTS idx_cc_approvals_tier ON cc_approvals(approval_tier);
ALTER TABLE cc_approvals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cc_approvals_all') THEN
    CREATE POLICY cc_approvals_all ON cc_approvals FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── Change Control Implementation Tasks ──────────────────────
CREATE TABLE IF NOT EXISTS cc_implementation_tasks (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id         TEXT UNIQUE NOT NULL,
  cc_id           TEXT NOT NULL REFERENCES change_controls(cc_id),
  title           TEXT NOT NULL,
  description     TEXT DEFAULT '',
  task_order      INTEGER DEFAULT 0,
  assigned_to     TEXT DEFAULT '',
  assigned_role   TEXT DEFAULT '',
  status          TEXT DEFAULT 'pending',
  due_date        DATE,
  completed_at    TIMESTAMPTZ,
  completed_by    TEXT DEFAULT '',
  verification_required BOOLEAN DEFAULT false,
  verified_by     TEXT DEFAULT '',
  verified_at     TIMESTAMPTZ,
  effort_estimate TEXT DEFAULT '',
  notes           TEXT DEFAULT '',
  created_by      TEXT NOT NULL DEFAULT 'system',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cc_tasks_cc ON cc_implementation_tasks(cc_id);
CREATE INDEX IF NOT EXISTS idx_cc_tasks_status ON cc_implementation_tasks(status);
CREATE INDEX IF NOT EXISTS idx_cc_tasks_assigned ON cc_implementation_tasks(assigned_to);
ALTER TABLE cc_implementation_tasks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cc_implementation_tasks_all') THEN
    CREATE POLICY cc_implementation_tasks_all ON cc_implementation_tasks FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMENT ON TABLE change_controls IS 'Change control records — ICH Q10 four-stage lifecycle, 21 CFR 211.100(b) compliant.';

-- ══════════════════════════════════════════════════════════════
-- COMPLAINTS & RECALLS (FDA 21 CFR 211.198, 21 CFR Part 7, EU GMP Chapter 8)
-- ══════════════════════════════════════════════════════════════

-- ── Complaints ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaints (
  id                          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  complaint_id                TEXT UNIQUE NOT NULL,
  title                       TEXT NOT NULL,
  description                 TEXT NOT NULL DEFAULT '',
  complaint_type              TEXT NOT NULL DEFAULT 'product_quality',
  source                      TEXT NOT NULL DEFAULT 'customer',
  severity                    TEXT DEFAULT 'minor',
  status                      TEXT DEFAULT 'received',
  priority                    TEXT DEFAULT 'medium',
  product_name                TEXT DEFAULT '',
  product_strength            TEXT DEFAULT '',
  dosage_form                 TEXT DEFAULT '',
  batch_number                TEXT DEFAULT '',
  lot_number                  TEXT DEFAULT '',
  date_received               DATE NOT NULL DEFAULT CURRENT_DATE,
  date_of_event               DATE,
  complainant_name            TEXT DEFAULT '',
  complainant_contact         TEXT DEFAULT '',
  complainant_org             TEXT DEFAULT '',
  country                     TEXT DEFAULT '',
  investigation               TEXT DEFAULT '',
  root_cause                  TEXT DEFAULT '',
  investigation_declined_reason TEXT DEFAULT '',
  initial_risk_assessment     TEXT DEFAULT '',
  immediate_action            TEXT DEFAULT '',
  linked_deviation_id         TEXT DEFAULT '',
  linked_capa_id              TEXT DEFAULT '',
  linked_recall_id            TEXT DEFAULT '',
  affected_batches            JSONB DEFAULT '[]',
  reply_to_complainant        TEXT DEFAULT '',
  reply_date                  DATE,
  follow_up_notes             TEXT DEFAULT '',
  follow_up_date              DATE,
  reportable                  BOOLEAN DEFAULT false,
  reported_to                 TEXT DEFAULT '',
  reported_date               DATE,
  regulatory_report_type      TEXT DEFAULT '',
  regulatory_report_number    TEXT DEFAULT '',
  report_deadline             DATE,
  report_submitted_date       DATE,
  reported_within_deadline    BOOLEAN,
  counterfeit_assessed        BOOLEAN DEFAULT false,
  counterfeit_notes           TEXT DEFAULT '',
  rapid_alert_issued          BOOLEAN DEFAULT false,
  other_batches_checked       BOOLEAN DEFAULT false,
  related_batch_findings      TEXT DEFAULT '',
  competent_authority_notified BOOLEAN DEFAULT false,
  competent_authority_notified_date DATE,
  sample_available            BOOLEAN DEFAULT false,
  sample_tested               BOOLEAN DEFAULT false,
  temperature_excursion       BOOLEAN DEFAULT false,
  ai_classification           JSONB DEFAULT '{}',
  ai_batch_impact             JSONB DEFAULT '{}',
  ai_trend_summary            TEXT DEFAULT '',
  ai_recall_risk              JSONB DEFAULT '{}',
  closure_notes               TEXT DEFAULT '',
  closed_by                   TEXT DEFAULT '',
  closed_at                   TIMESTAMPTZ,
  archived_at                 TIMESTAMPTZ,
  archived_by                 TEXT DEFAULT '',
  created_by                  TEXT NOT NULL DEFAULT 'system',
  created_at                  TIMESTAMPTZ DEFAULT now(),
  updated_at                  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_type ON complaints(complaint_type);
CREATE INDEX IF NOT EXISTS idx_complaints_severity ON complaints(severity);
CREATE INDEX IF NOT EXISTS idx_complaints_batch ON complaints(batch_number);
CREATE INDEX IF NOT EXISTS idx_complaints_product ON complaints(product_name);
CREATE INDEX IF NOT EXISTS idx_complaints_date ON complaints(date_received);
CREATE INDEX IF NOT EXISTS idx_complaints_reportable ON complaints(reportable);
CREATE INDEX IF NOT EXISTS idx_complaints_report_deadline ON complaints(report_deadline);

ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'complaints_all') THEN
    CREATE POLICY complaints_all ON complaints FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── Recall Events ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recall_events (
  id                          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recall_id                   TEXT UNIQUE NOT NULL,
  title                       TEXT NOT NULL,
  description                 TEXT NOT NULL DEFAULT '',
  recall_class                TEXT NOT NULL DEFAULT 'class_ii',
  status                      TEXT DEFAULT 'initiated',
  scope                       TEXT DEFAULT '',
  reason                      TEXT DEFAULT '',
  affected_batches            JSONB DEFAULT '[]',
  affected_markets            JSONB DEFAULT '[]',
  distribution_data           TEXT DEFAULT '',
  units_distributed           INTEGER DEFAULT 0,
  units_recovered             INTEGER DEFAULT 0,
  recovery_rate               NUMERIC(5,2) DEFAULT 0,
  linked_complaint_id         TEXT DEFAULT '',
  notification_status         JSONB DEFAULT '{}',
  regulatory_body             TEXT DEFAULT '',
  regulatory_ref              TEXT DEFAULT '',
  recall_depth                TEXT DEFAULT 'wholesale',
  public_notification_method  TEXT DEFAULT 'none',
  health_hazard_evaluation    JSONB DEFAULT '{}',
  fda_recall_number           TEXT DEFAULT '',
  effectiveness_check_level   TEXT DEFAULT 'C',
  effectiveness_check_results JSONB DEFAULT '{}',
  consignee_tracking          JSONB DEFAULT '[]',
  status_report_dates         JSONB DEFAULT '[]',
  competent_authority_notified BOOLEAN DEFAULT false,
  competent_authority_notified_date DATE,
  rapid_alert_issued          BOOLEAN DEFAULT false,
  recalled_product_disposition TEXT DEFAULT '',
  initiated_by                TEXT NOT NULL,
  initiated_date              DATE NOT NULL DEFAULT CURRENT_DATE,
  target_completion           DATE,
  actual_completion           DATE,
  effectiveness_check         TEXT DEFAULT '',
  ai_scope_assessment         JSONB DEFAULT '{}',
  closure_notes               TEXT DEFAULT '',
  lessons_learned             TEXT DEFAULT '',
  created_by                  TEXT NOT NULL DEFAULT 'system',
  created_at                  TIMESTAMPTZ DEFAULT now(),
  updated_at                  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recalls_status ON recall_events(status);
CREATE INDEX IF NOT EXISTS idx_recalls_class ON recall_events(recall_class);
CREATE INDEX IF NOT EXISTS idx_recalls_complaint ON recall_events(linked_complaint_id);
CREATE INDEX IF NOT EXISTS idx_recalls_fda_number ON recall_events(fda_recall_number);

ALTER TABLE recall_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'recall_events_all') THEN
    CREATE POLICY recall_events_all ON recall_events FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- BATCH DISPOSITION (QP Release / Batch Record Review)
-- ══════════════════════════════════════════════════════════════

-- ── Batch Dispositions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS batch_dispositions (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  disposition_id        TEXT UNIQUE NOT NULL,
  batch_number          TEXT NOT NULL,
  product_name          TEXT NOT NULL,
  status                TEXT DEFAULT 'pending_review',
  priority              TEXT DEFAULT 'normal',
  batch_start_date      DATE,
  batch_end_date        DATE,
  batch_size            TEXT DEFAULT '',
  yield_actual          TEXT DEFAULT '',
  yield_expected        TEXT DEFAULT '',
  reviewer              TEXT DEFAULT '',
  reviewer_role         TEXT DEFAULT '',
  review_started_at     TIMESTAMPTZ,
  review_completed_at   TIMESTAMPTZ,
  qp_name              TEXT DEFAULT '',
  qp_decision          TEXT DEFAULT '',
  qp_decision_date     TIMESTAMPTZ,
  qp_comments          TEXT DEFAULT '',
  qp_signature_meaning TEXT DEFAULT '',
  open_deviations       JSONB DEFAULT '[]',
  open_capas            JSONB DEFAULT '[]',
  open_change_controls  JSONB DEFAULT '[]',
  test_results_summary  JSONB DEFAULT '{}',
  missing_documents     JSONB DEFAULT '[]',
  ai_prescreen_result   TEXT DEFAULT '',
  ai_risk_score         INTEGER DEFAULT NULL,
  ai_anomalies          JSONB DEFAULT '[]',
  ai_review_summary     TEXT DEFAULT '',
  ai_release_recommendation TEXT DEFAULT '',
  ai_confidence         NUMERIC(3,2) DEFAULT NULL,
  rejection_reason      TEXT DEFAULT '',
  rejection_disposition TEXT DEFAULT '',
  hold_reason           TEXT DEFAULT '',
  conditional_release   BOOLEAN DEFAULT false,
  conditional_conditions TEXT DEFAULT '',
  conditional_expiry    DATE,
  conditional_final_disposition TEXT DEFAULT '',
  regulatory_framework  TEXT DEFAULT 'eu_gmp',
  expiry_date           DATE,
  release_date          DATE,
  notes                 TEXT DEFAULT '',
  created_by            TEXT NOT NULL DEFAULT 'system',
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dispositions_status ON batch_dispositions(status);
CREATE INDEX IF NOT EXISTS idx_dispositions_batch ON batch_dispositions(batch_number);
CREATE INDEX IF NOT EXISTS idx_dispositions_product ON batch_dispositions(product_name);
CREATE INDEX IF NOT EXISTS idx_dispositions_priority ON batch_dispositions(priority);
CREATE INDEX IF NOT EXISTS idx_dispositions_qp ON batch_dispositions(qp_name);
ALTER TABLE batch_dispositions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'batch_dispositions_all') THEN
    CREATE POLICY batch_dispositions_all ON batch_dispositions FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── Disposition Checklists ──────────────────────────────────
CREATE TABLE IF NOT EXISTS disposition_checklists (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id      TEXT UNIQUE NOT NULL,
  disposition_id    TEXT NOT NULL REFERENCES batch_dispositions(disposition_id),
  item_category     TEXT NOT NULL DEFAULT 'general',
  item_description  TEXT NOT NULL,
  item_order        INTEGER DEFAULT 0,
  status            TEXT DEFAULT 'pending',
  checked_by        TEXT DEFAULT '',
  checked_at        TIMESTAMPTZ,
  finding           TEXT DEFAULT '',
  severity          TEXT DEFAULT 'none',
  acceptance_criteria TEXT DEFAULT '',
  ai_flagged        BOOLEAN DEFAULT false,
  ai_classification TEXT DEFAULT 'pending',
  ai_reason         TEXT DEFAULT '',
  ai_auto_cleared   BOOLEAN DEFAULT false,
  ai_cleared_basis  TEXT DEFAULT '',
  reviewer_override BOOLEAN DEFAULT false,
  override_justification TEXT DEFAULT '',
  notes             TEXT DEFAULT '',
  created_by        TEXT NOT NULL DEFAULT 'system',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dchk_disposition ON disposition_checklists(disposition_id);
CREATE INDEX IF NOT EXISTS idx_dchk_status ON disposition_checklists(status);
CREATE INDEX IF NOT EXISTS idx_dchk_category ON disposition_checklists(item_category);
CREATE INDEX IF NOT EXISTS idx_dchk_flagged ON disposition_checklists(ai_flagged);
CREATE INDEX IF NOT EXISTS idx_dchk_classification ON disposition_checklists(ai_classification);
ALTER TABLE disposition_checklists ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'disposition_checklists_all') THEN
    CREATE POLICY disposition_checklists_all ON disposition_checklists FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── QP Certification Register (Annex 16) ────────────────────
CREATE TABLE IF NOT EXISTS qp_certification_register (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cert_id           TEXT UNIQUE NOT NULL,
  disposition_id    TEXT NOT NULL REFERENCES batch_dispositions(disposition_id),
  batch_number      TEXT NOT NULL,
  product_name      TEXT NOT NULL,
  batch_size        TEXT DEFAULT '',
  qp_name           TEXT NOT NULL,
  qp_role           TEXT NOT NULL DEFAULT 'qualified_person',
  certification_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  decision          TEXT NOT NULL DEFAULT 'released',
  conditions        TEXT DEFAULT '',
  batch_reference   TEXT DEFAULT '',
  regulatory_framework TEXT DEFAULT 'eu_gmp',
  signature_meaning TEXT DEFAULT 'batch certified for release',
  signature_hash    TEXT DEFAULT '',
  notes             TEXT DEFAULT '',
  created_by        TEXT NOT NULL DEFAULT 'system',
  created_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qpcert_disposition ON qp_certification_register(disposition_id);
CREATE INDEX IF NOT EXISTS idx_qpcert_batch ON qp_certification_register(batch_number);
CREATE INDEX IF NOT EXISTS idx_qpcert_qp ON qp_certification_register(qp_name);
CREATE INDEX IF NOT EXISTS idx_qpcert_date ON qp_certification_register(certification_date);
ALTER TABLE qp_certification_register ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'qp_certification_register_insert') THEN
    CREATE POLICY qp_certification_register_insert ON qp_certification_register FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'qp_certification_register_select') THEN
    CREATE POLICY qp_certification_register_select ON qp_certification_register FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

COMMENT ON TABLE qp_certification_register IS 'Append-only QP certification register — EU GMP Annex 16. No UPDATE or DELETE.';

-- ══════════════════════════════════════════════════════════════
-- QC LAB DASHBOARD (Quality Control Laboratory Management)
-- ══════════════════════════════════════════════════════════════

-- ── QC Samples ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qc_samples (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sample_id         TEXT UNIQUE NOT NULL,
  batch_number      TEXT NOT NULL DEFAULT '',
  product_name      TEXT NOT NULL DEFAULT '',
  sample_type       TEXT NOT NULL DEFAULT 'in_process',
  sample_point      TEXT DEFAULT '',
  description       TEXT DEFAULT '',
  status            TEXT DEFAULT 'received',
  priority          TEXT DEFAULT 'normal',
  batch_critical    BOOLEAN DEFAULT false,
  received_by       TEXT NOT NULL,
  received_date     TIMESTAMPTZ DEFAULT now(),
  required_tests    JSONB DEFAULT '[]',
  storage_condition TEXT DEFAULT 'room_temp',
  storage_location  TEXT DEFAULT '',
  expiry_date       DATE,
  quantity          TEXT DEFAULT '',
  units             TEXT DEFAULT '',
  chain_of_custody  JSONB DEFAULT '[]',
  notes             TEXT DEFAULT '',
  completed_date    TIMESTAMPTZ,
  ai_priority_score INTEGER,
  ai_turnaround_est TEXT DEFAULT '',
  stability_protocol_id TEXT DEFAULT '',
  stability_condition   TEXT DEFAULT '',
  stability_time_point  TEXT DEFAULT '',
  pull_date             DATE,
  is_reserve_sample     BOOLEAN DEFAULT false,
  reserve_disposal_date DATE,
  created_by        TEXT NOT NULL DEFAULT 'system',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qc_samples_status ON qc_samples(status);
CREATE INDEX IF NOT EXISTS idx_qc_samples_batch ON qc_samples(batch_number);
CREATE INDEX IF NOT EXISTS idx_qc_samples_type ON qc_samples(sample_type);
CREATE INDEX IF NOT EXISTS idx_qc_samples_priority ON qc_samples(priority);
CREATE INDEX IF NOT EXISTS idx_qc_samples_critical ON qc_samples(batch_critical);
CREATE INDEX IF NOT EXISTS idx_qc_samples_received ON qc_samples(received_date);
ALTER TABLE qc_samples ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'qc_samples_all') THEN
    CREATE POLICY qc_samples_all ON qc_samples FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── QC Tests ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qc_tests (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id           TEXT UNIQUE NOT NULL,
  sample_id         TEXT NOT NULL REFERENCES qc_samples(sample_id),
  test_name         TEXT NOT NULL,
  test_method       TEXT DEFAULT '',
  test_method_id    TEXT DEFAULT '',
  test_category     TEXT DEFAULT 'chemical',
  spec_version      TEXT DEFAULT '1.0',
  spec_effective_date DATE,
  status            TEXT DEFAULT 'pending',
  assigned_analyst  TEXT DEFAULT '',
  assigned_date     TIMESTAMPTZ,
  started_date      TIMESTAMPTZ,
  completed_date    TIMESTAMPTZ,
  instrument_id     TEXT DEFAULT '',
  specification_min NUMERIC,
  specification_max NUMERIC,
  specification_unit TEXT DEFAULT '',
  specification_text TEXT DEFAULT '',
  target_tat_hours  INTEGER DEFAULT 48,
  due_date          TIMESTAMPTZ,
  notes             TEXT DEFAULT '',
  created_by        TEXT NOT NULL DEFAULT 'system',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qc_tests_sample ON qc_tests(sample_id);
CREATE INDEX IF NOT EXISTS idx_qc_tests_status ON qc_tests(status);
CREATE INDEX IF NOT EXISTS idx_qc_tests_analyst ON qc_tests(assigned_analyst);
CREATE INDEX IF NOT EXISTS idx_qc_tests_instrument ON qc_tests(instrument_id);
CREATE INDEX IF NOT EXISTS idx_qc_tests_due ON qc_tests(due_date);
ALTER TABLE qc_tests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'qc_tests_all') THEN
    CREATE POLICY qc_tests_all ON qc_tests FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── QC Results ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qc_results (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  result_id         TEXT UNIQUE NOT NULL,
  test_id           TEXT NOT NULL REFERENCES qc_tests(test_id),
  sample_id         TEXT NOT NULL REFERENCES qc_samples(sample_id),
  result_value      NUMERIC,
  result_text       TEXT DEFAULT '',
  result_unit       TEXT DEFAULT '',
  pass_fail         TEXT DEFAULT '',
  oos_flag          BOOLEAN DEFAULT false,
  oot_flag          BOOLEAN DEFAULT false,
  reviewed_by       TEXT DEFAULT '',
  reviewed_date     TIMESTAMPTZ,
  approved_by       TEXT DEFAULT '',
  approved_date     TIMESTAMPTZ,
  review_status     TEXT DEFAULT 'pending_review',
  raw_data          JSONB DEFAULT '{}',
  calculation_notes TEXT DEFAULT '',
  retest            BOOLEAN DEFAULT false,
  retest_reason     TEXT DEFAULT '',
  linked_oos_id     TEXT DEFAULT '',
  oos_investigation_phase    TEXT DEFAULT '',
  oos_investigation_status   TEXT DEFAULT '',
  oos_investigation_due_date TIMESTAMPTZ,
  oos_assignee               TEXT DEFAULT '',
  oos_root_cause_category    TEXT DEFAULT '',
  oos_conclusion             TEXT DEFAULT '',
  ai_anomaly_flag   BOOLEAN DEFAULT false,
  ai_anomaly_reason TEXT DEFAULT '',
  notes             TEXT DEFAULT '',
  created_by        TEXT NOT NULL DEFAULT 'system',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qc_results_test ON qc_results(test_id);
CREATE INDEX IF NOT EXISTS idx_qc_results_sample ON qc_results(sample_id);
CREATE INDEX IF NOT EXISTS idx_qc_results_oos ON qc_results(oos_flag);
CREATE INDEX IF NOT EXISTS idx_qc_results_review ON qc_results(review_status);
ALTER TABLE qc_results ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'qc_results_all') THEN
    CREATE POLICY qc_results_all ON qc_results FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── QC Instruments ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qc_instruments (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instrument_id       TEXT UNIQUE NOT NULL,
  name                TEXT NOT NULL,
  instrument_type     TEXT NOT NULL DEFAULT 'analytical',
  model               TEXT DEFAULT '',
  serial_number       TEXT DEFAULT '',
  location            TEXT DEFAULT '',
  status              TEXT DEFAULT 'qualified',
  qualification_date  DATE,
  next_qualification  DATE,
  calibration_date    DATE,
  next_calibration    DATE,
  maintenance_date    DATE,
  next_maintenance    DATE,
  responsible_person  TEXT DEFAULT '',
  sop_reference       TEXT DEFAULT '',
  notes               TEXT DEFAULT '',
  created_by          TEXT NOT NULL DEFAULT 'system',
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qc_instruments_status ON qc_instruments(status);
CREATE INDEX IF NOT EXISTS idx_qc_instruments_type ON qc_instruments(instrument_type);
CREATE INDEX IF NOT EXISTS idx_qc_instruments_next_cal ON qc_instruments(next_calibration);
ALTER TABLE qc_instruments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'qc_instruments_all') THEN
    CREATE POLICY qc_instruments_all ON qc_instruments FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── QC Analyst Qualifications ──────────────────────────────────
CREATE TABLE IF NOT EXISTS qc_analyst_qualifications (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  qualification_id      TEXT UNIQUE NOT NULL,
  analyst_id            TEXT NOT NULL,
  analyst_name          TEXT NOT NULL DEFAULT '',
  test_method           TEXT NOT NULL,
  test_method_id        TEXT DEFAULT '',
  qualified_date        DATE NOT NULL,
  requalification_due   DATE,
  qualification_status  TEXT DEFAULT 'qualified',
  trainer               TEXT DEFAULT '',
  training_record_ref   TEXT DEFAULT '',
  notes                 TEXT DEFAULT '',
  created_by            TEXT NOT NULL DEFAULT 'system',
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qc_analyst_quals_analyst ON qc_analyst_qualifications(analyst_id);
CREATE INDEX IF NOT EXISTS idx_qc_analyst_quals_method ON qc_analyst_qualifications(test_method);
CREATE INDEX IF NOT EXISTS idx_qc_analyst_quals_status ON qc_analyst_qualifications(qualification_status);
CREATE INDEX IF NOT EXISTS idx_qc_analyst_quals_requaldue ON qc_analyst_qualifications(requalification_due);
ALTER TABLE qc_analyst_qualifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'qc_analyst_quals_all') THEN
    CREATE POLICY qc_analyst_quals_all ON qc_analyst_qualifications FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── QC Test Methods ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qc_test_methods (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  method_id            TEXT UNIQUE NOT NULL,
  method_name          TEXT NOT NULL,
  method_category      TEXT DEFAULT 'chemical',
  version              TEXT DEFAULT '1.0',
  validation_status    TEXT DEFAULT 'validated',
  validated_date       DATE,
  next_revalidation    DATE,
  sop_reference        TEXT DEFAULT '',
  applicable_products  JSONB DEFAULT '[]',
  instrument_types     JSONB DEFAULT '[]',
  notes                TEXT DEFAULT '',
  created_by           TEXT NOT NULL DEFAULT 'system',
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qc_test_methods_status ON qc_test_methods(validation_status);
CREATE INDEX IF NOT EXISTS idx_qc_test_methods_category ON qc_test_methods(method_category);
CREATE INDEX IF NOT EXISTS idx_qc_test_methods_reval ON qc_test_methods(next_revalidation);
ALTER TABLE qc_test_methods ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'qc_test_methods_all') THEN
    CREATE POLICY qc_test_methods_all ON qc_test_methods FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── QC Test Templates ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qc_test_templates (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id   TEXT UNIQUE NOT NULL,
  template_name TEXT NOT NULL,
  sample_type   TEXT NOT NULL,
  product_name  TEXT DEFAULT '',
  tests         JSONB DEFAULT '[]',
  notes         TEXT DEFAULT '',
  created_by    TEXT NOT NULL DEFAULT 'system',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qc_test_templates_type ON qc_test_templates(sample_type);
CREATE INDEX IF NOT EXISTS idx_qc_test_templates_product ON qc_test_templates(product_name);
ALTER TABLE qc_test_templates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'qc_test_templates_all') THEN
    CREATE POLICY qc_test_templates_all ON qc_test_templates FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMENT ON TABLE qc_samples IS 'QC laboratory sample management — FDA 21 CFR 211, ICH Q6B compliant sample lifecycle.';
COMMENT ON TABLE qc_results IS 'QC test results with OOS investigation workflow — FDA 2006 OOS guidance, 21 CFR Part 11.';

-- ══════════════════════════════════════════════════════════════
-- CELL BANK MANAGEMENT (Inoculation Suite)
-- ══════════════════════════════════════════════════════════════

-- ── Cell Banks (Cell Bank Management) ─────────────────────
CREATE TABLE IF NOT EXISTS cell_banks (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_id             TEXT UNIQUE NOT NULL,
  name                TEXT NOT NULL,
  bank_type           TEXT NOT NULL DEFAULT 'wcb',
  cell_line           TEXT NOT NULL DEFAULT '',
  clone_id            TEXT DEFAULT '',
  product             TEXT DEFAULT '',
  status              TEXT DEFAULT 'active',
  passage_number      INTEGER DEFAULT 0,
  max_passage_limit   INTEGER DEFAULT 60,
  parent_bank_id      TEXT DEFAULT '',
  total_vials         INTEGER DEFAULT 0,
  available_vials     INTEGER DEFAULT 0,
  withdrawn_vials     INTEGER DEFAULT 0,
  destroyed_vials     INTEGER DEFAULT 0,
  reserved_vials      INTEGER DEFAULT 0,
  quarantine_vials    INTEGER DEFAULT 0,
  storage_temp        TEXT DEFAULT '-196C_LN2',
  storage_location    TEXT DEFAULT '',
  backup_storage_location TEXT DEFAULT '',
  freezer_id          TEXT DEFAULT '',
  date_banked         DATE,
  expiry_date         DATE,
  viability_at_bank   NUMERIC(5,2),
  vcd_at_bank         NUMERIC(10,2),
  coa_reference       TEXT DEFAULT '',
  mycoplasma_status   TEXT DEFAULT 'pending',
  sterility_status    TEXT DEFAULT 'pending',
  identity_status     TEXT DEFAULT 'pending',
  adventitious_status TEXT DEFAULT 'pending',
  karyology_status    TEXT DEFAULT 'pending',
  retrovirus_status   TEXT DEFAULT 'pending',
  genetic_stability_status TEXT DEFAULT 'pending',
  qualification_status TEXT DEFAULT 'pending',
  qualification_approved_by TEXT DEFAULT '',
  qualification_approved_date TIMESTAMPTZ,
  banking_sop_reference TEXT DEFAULT '',
  freezing_protocol   TEXT DEFAULT '',
  stability_protocol  TEXT DEFAULT '',
  deviation_id        TEXT DEFAULT '',
  notes               TEXT DEFAULT '',
  ai_depletion_est    TEXT DEFAULT '',
  ai_rebank_rec       TEXT DEFAULT '',
  created_by          TEXT NOT NULL DEFAULT 'system',
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cell_banks_type ON cell_banks(bank_type);
CREATE INDEX IF NOT EXISTS idx_cell_banks_status ON cell_banks(status);
CREATE INDEX IF NOT EXISTS idx_cell_banks_cell_line ON cell_banks(cell_line);
CREATE INDEX IF NOT EXISTS idx_cell_banks_product ON cell_banks(product);
CREATE INDEX IF NOT EXISTS idx_cell_banks_expiry ON cell_banks(expiry_date);
CREATE INDEX IF NOT EXISTS idx_cell_banks_qualification ON cell_banks(qualification_status);
ALTER TABLE cell_banks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cell_banks_all') THEN
    CREATE POLICY cell_banks_all ON cell_banks FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── Cell Bank Vials ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS cell_bank_vials (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vial_id           TEXT UNIQUE NOT NULL,
  bank_id           TEXT NOT NULL REFERENCES cell_banks(bank_id),
  vial_number       INTEGER NOT NULL,
  status            TEXT DEFAULT 'available',
  freezer_id        TEXT DEFAULT '',
  rack              TEXT DEFAULT '',
  box               TEXT DEFAULT '',
  position          TEXT DEFAULT '',
  volume_ml         NUMERIC(6,2) DEFAULT 1.0,
  cell_count        NUMERIC(12,0),
  viability         NUMERIC(5,2),
  passage_number    INTEGER DEFAULT 0,
  freeze_date       DATE,
  thaw_date         DATE,
  thawed_by         TEXT DEFAULT '',
  reserved_for      TEXT DEFAULT '',
  reserved_date     TIMESTAMPTZ,
  quarantine_reason TEXT DEFAULT '',
  quarantine_date   TIMESTAMPTZ,
  destroyed_date    DATE,
  destroyed_by      TEXT DEFAULT '',
  destruction_reason TEXT DEFAULT '',
  notes             TEXT DEFAULT '',
  created_by        TEXT NOT NULL DEFAULT 'system',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cb_vials_bank ON cell_bank_vials(bank_id);
CREATE INDEX IF NOT EXISTS idx_cb_vials_status ON cell_bank_vials(status);
CREATE INDEX IF NOT EXISTS idx_cb_vials_freezer ON cell_bank_vials(freezer_id);
CREATE INDEX IF NOT EXISTS idx_cb_vials_location ON cell_bank_vials(rack, box, position);
CREATE INDEX IF NOT EXISTS idx_cb_vials_freeze_date ON cell_bank_vials(freeze_date);
ALTER TABLE cell_bank_vials ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cell_bank_vials_all') THEN
    CREATE POLICY cell_bank_vials_all ON cell_bank_vials FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── Cell Bank Transactions ────────────────────────────────
CREATE TABLE IF NOT EXISTS cell_bank_transactions (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id    TEXT UNIQUE NOT NULL,
  bank_id           TEXT NOT NULL REFERENCES cell_banks(bank_id),
  vial_id           TEXT DEFAULT '',
  transaction_type  TEXT NOT NULL DEFAULT 'withdraw',
  quantity          INTEGER DEFAULT 1,
  purpose           TEXT DEFAULT '',
  batch_number      TEXT DEFAULT '',
  requested_by      TEXT NOT NULL,
  approved_by       TEXT DEFAULT '',
  approved_date     TIMESTAMPTZ,
  performed_by      TEXT DEFAULT '',
  performed_date    TIMESTAMPTZ,
  witness           TEXT DEFAULT '',
  status            TEXT DEFAULT 'requested',
  from_location     TEXT DEFAULT '',
  to_location       TEXT DEFAULT '',
  post_thaw_viability NUMERIC(5,2),
  post_thaw_vcd     NUMERIC(10,2),
  time_out_of_storage_minutes INTEGER,
  chain_of_custody  JSONB DEFAULT '[]',
  temperature_log   JSONB DEFAULT '[]',
  e_signature       JSONB DEFAULT '{}',
  notes             TEXT DEFAULT '',
  created_by        TEXT NOT NULL DEFAULT 'system',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cbt_bank ON cell_bank_transactions(bank_id);
CREATE INDEX IF NOT EXISTS idx_cbt_type ON cell_bank_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_cbt_status ON cell_bank_transactions(status);
CREATE INDEX IF NOT EXISTS idx_cbt_batch ON cell_bank_transactions(batch_number);
CREATE INDEX IF NOT EXISTS idx_cbt_date ON cell_bank_transactions(performed_date);
ALTER TABLE cell_bank_transactions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cell_bank_transactions_all') THEN
    CREATE POLICY cell_bank_transactions_all ON cell_bank_transactions FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── Cell Bank Testing ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS cell_bank_testing (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id         TEXT UNIQUE NOT NULL,
  bank_id         TEXT NOT NULL REFERENCES cell_banks(bank_id),
  test_type       TEXT NOT NULL,
  test_method     TEXT DEFAULT '',
  test_date       DATE,
  result          TEXT DEFAULT 'pending',
  report_reference TEXT DEFAULT '',
  performed_by    TEXT DEFAULT '',
  reviewed_by     TEXT DEFAULT '',
  reviewed_date   TIMESTAMPTZ,
  status          TEXT DEFAULT 'scheduled',
  notes           TEXT DEFAULT '',
  created_by      TEXT NOT NULL DEFAULT 'system',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cbt_testing_bank ON cell_bank_testing(bank_id);
CREATE INDEX IF NOT EXISTS idx_cbt_testing_type ON cell_bank_testing(test_type);
CREATE INDEX IF NOT EXISTS idx_cbt_testing_status ON cell_bank_testing(status);
ALTER TABLE cell_bank_testing ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cell_bank_testing_all') THEN
    CREATE POLICY cell_bank_testing_all ON cell_bank_testing FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
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

  // POST /admin/prepare-round — create git worktrees + write AGENT_SPEC.md for a build round
  app.post('/admin/prepare-round', requireAuth, async (req, res) => {
    const { execSync } = require('child_process');
    const fs = require('fs');
    const path = require('path');
    const projectRoot = process.cwd();
    const worktreeBase = path.join(projectRoot, '.claude', 'worktrees');

    const { modules } = req.body;
    if (!modules || !Array.isArray(modules) || modules.length === 0) {
      return res.status(400).json({ error: 'modules array required' });
    }

    // Ensure .claude/worktrees directory exists
    fs.mkdirSync(worktreeBase, { recursive: true });

    const results = [];
    for (const mod of modules) {
      const { id, spec } = mod;
      if (!id) { results.push({ id, status: 'error', message: 'missing id' }); continue; }

      const wtPath = path.join(worktreeBase, id);
      const branchName = 'feature/' + id;
      let status = 'created';

      try {
        if (fs.existsSync(wtPath)) {
          status = 'exists';
        } else {
          // Try checkout existing branch, fall back to creating new branch from HEAD
          try {
            execSync(`git worktree add "${wtPath}" "${branchName}"`, { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe' });
          } catch (_e) {
            execSync(`git worktree add -b "${branchName}" "${wtPath}" HEAD`, { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe' });
          }
        }

        // Write AGENT_SPEC.md if spec provided
        if (spec) {
          fs.writeFileSync(path.join(wtPath, 'AGENT_SPEC.md'), spec, 'utf8');
        }

        results.push({
          id,
          status,
          path: '.claude/worktrees/' + id,
          branch: branchName,
          launchCommand: 'cd .claude/worktrees/' + id + ' && claude "Read AGENT_SPEC.md and build everything specified. Start by reading the reference files."'
        });
      } catch (err) {
        results.push({ id, status: 'error', message: err.message });
      }
    }

    res.json({ ok: true, results });
  });
};
