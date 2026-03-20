# Agent 4 — QC Lab Dashboard
# Branch: feature/qc-lab
# Phase: 3 — Quality Control Lab
# Complexity: L (7 days)

## What to build
Quality Control laboratory management system. Manage the full sample lifecycle: sample receipt and login, test assignment to analysts, results recording with specification limits, review and approval, and instrument qualification tracking. The QC Lab is the testing backbone of a biologics facility — every batch requires in-process and release testing. This module provides a sample queue, analyst workload view, instrument schedule, and priority flagging for batch-critical samples. OOS (Out of Specification) results are flagged immediately for investigation.

## Regulatory Context
This module must satisfy requirements from multiple regulatory frameworks:
- **FDA 21 CFR 211 Subpart I** (Sections 211.160–211.176) — laboratory controls, testing/release, stability testing, reserve samples
- **FDA 21 CFR Part 11** — electronic records, audit trails, e-signatures on result approvals
- **EU GMP Chapter 6** — QC independence, analyst qualifications, OOS investigation two-phase process (6.30–6.35), sampling controls, reagent/reference standard tracking
- **ICH Q2(R2)** — analytical method validation lifecycle (accuracy, precision, specificity, LOD, LOQ, linearity, range, robustness)
- **ICH Q7 Section 11** — laboratory controls for APIs, Certificate of Analysis, impurity profiles, ongoing stability
- **ICH Q6A/Q6B** — specifications for chemical substances and biotechnological/biological products (identity, purity, potency, quantity)
- **ICH Q1A(R2)** — stability testing conditions and time-point schedules

Key compliance requirements enforced by this module:
1. **OOS two-phase investigation** — Phase I (lab error assessment, 1-3 days) and Phase II (full-scale investigation, up to 30 days) per FDA 2006 guidance
2. **Analyst qualification enforcement** — only qualified analysts perform specific test methods (EU GMP 6.4–6.6)
3. **Method validation tracking** — test methods must be validated and have current validation status (ICH Q2)
4. **Dual sign-off** — results require review (Level 1) and approval (Level 2) before release (21 CFR 211.165)
5. **Immutable audit trail** — all record modifications captured with before/after state, attribution, and timestamp (Part 11)
6. **Specification versioning** — track which spec version was in force when each test was executed

## Files to create
- `docs/qc/lab.html` (frontend page — NEW department folder `docs/qc/`)
- `server/services/qc-lab.service.js` (service layer)
- `server/routes/qc-lab.js` (API routes)

## Files to modify (additions only)
- `server/routes/admin.js` — add CREATE TABLE statements
- `server/index.js` — wire service + mount routes + add PAGE_MAP entry
- `server/lib/ids.js` — add ID generators

## Database Tables
Add to `server/routes/admin.js`:

### qc_samples
```sql
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
  -- Stability sample tracking (ICH Q1A)
  stability_protocol_id TEXT DEFAULT '',
  stability_condition   TEXT DEFAULT '',
  stability_time_point  TEXT DEFAULT '',
  pull_date             DATE,
  -- Reserve/retention sample tracking (21 CFR 211.170)
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
```

### qc_tests
```sql
CREATE TABLE IF NOT EXISTS qc_tests (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id           TEXT UNIQUE NOT NULL,
  sample_id         TEXT NOT NULL REFERENCES qc_samples(sample_id),
  test_name         TEXT NOT NULL,
  test_method       TEXT DEFAULT '',
  test_method_id    TEXT DEFAULT '',
  test_category     TEXT DEFAULT 'chemical',
  -- Specification versioning (tracks which spec version was in force)
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
```

### qc_results
```sql
CREATE TABLE IF NOT EXISTS qc_results (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  result_id         TEXT UNIQUE NOT NULL,
  test_id           TEXT NOT NULL REFERENCES qc_tests(test_id),
  sample_id         TEXT NOT NULL,
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
  -- OOS investigation workflow (FDA 2006 guidance, EU GMP 6.30-6.35)
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
```

### qc_instruments
```sql
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
```

### qc_analyst_qualifications
Tracks which analysts are qualified to perform which test methods. EU GMP 6.4-6.6 requires only qualified personnel perform testing. System warns when assigning tests to unqualified analysts.
```sql
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
```

### qc_test_methods
Registry of validated analytical methods. ICH Q2(R2) requires documented validation status. The `test_method_id` field in `qc_tests` references this table for traceability.
```sql
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
```

### qc_test_templates
Pre-configured test panels by sample type and product. Speeds up sample login by auto-populating required tests (e.g., biologics release panel includes identity, purity, potency, sterility, endotoxin per ICH Q6B).
```sql
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
```

## ID Generators
Add to `server/lib/ids.js`:
- `qcSampleId()` → `QCS-1000…9999`
- `qcTestId()` → `QCT-1000…9999`
- `qcResultId()` → `QCR-1000…9999`
- `qcInstrumentId()` → `QCI-1000…9999`
- `qcQualificationId()` → `QCAQ-1000…9999`
- `qcMethodId()` → `QCM-1000…9999`
- `qcTemplateId()` → `QCTP-1000…9999`

## API Endpoints
### Samples
- `POST /qc/samples` — register a new sample
- `GET /qc/samples` — list all (filter by status, sample_type, batch_number, priority, batch_critical, date range)
- `GET /qc/samples/:sampleId` — single sample with tests and results
- `PUT /qc/samples/:sampleId` — update sample
- `POST /qc/samples/:sampleId/complete` — mark sample as completed (all tests done)

### Tests
- `POST /qc/tests` — create/assign a test to a sample
- `GET /qc/tests` — list all tests (filter by status, assigned_analyst, instrument_id, due_date)
- `GET /qc/tests/:testId` — single test detail
- `PUT /qc/tests/:testId` — update test (assign analyst, update status)
- `POST /qc/tests/:testId/start` — mark test as in-progress
- `POST /qc/tests/:testId/complete` — mark test as completed

### Results
- `POST /qc/results` — record a test result
- `GET /qc/results` — list results (filter by sample_id, test_id, oos_flag, review_status)
- `GET /qc/results/:resultId` — single result detail
- `PUT /qc/results/:resultId` — update result
- `POST /qc/results/:resultId/review` — reviewer approves/rejects result
- `POST /qc/results/:resultId/approve` — second-level approval

### Instruments
- `POST /qc/instruments` — register an instrument
- `GET /qc/instruments` — list all (filter by status, instrument_type, overdue calibration)
- `GET /qc/instruments/:instId` — single instrument detail
- `PUT /qc/instruments/:instId` — update instrument

### Analyst Qualifications
- `POST /qc/qualifications` — record an analyst qualification for a test method
- `GET /qc/qualifications` — list all (filter by analyst_id, test_method, qualification_status, overdue requalification)
- `GET /qc/qualifications/:qualId` — single qualification detail
- `PUT /qc/qualifications/:qualId` — update qualification (e.g., renew requalification date)
- `GET /qc/qualifications/check/:analystId/:testMethod` — check if analyst is qualified for a specific method (used during test assignment to warn if unqualified)

### Test Methods
- `POST /qc/methods` — register a validated test method
- `GET /qc/methods` — list all (filter by method_category, validation_status, overdue revalidation)
- `GET /qc/methods/:methodId` — single method detail
- `PUT /qc/methods/:methodId` — update method (e.g., update validation status, bump version)

### Test Templates
- `POST /qc/templates` — create a test panel template
- `GET /qc/templates` — list all (filter by sample_type, product_name)
- `GET /qc/templates/:templateId` — single template detail
- `PUT /qc/templates/:templateId` — update template
- `GET /qc/templates/for/:sampleType` — get applicable templates for a sample type (used during sample login to auto-populate required tests)

### OOS Investigation
- `POST /qc/results/:resultId/oos/initiate` — initiate Phase I OOS investigation (auto-sets phase, status, due date +3 days, assigns investigator)
- `PUT /qc/results/:resultId/oos/update` — update OOS investigation (root cause, notes, status changes)
- `POST /qc/results/:resultId/oos/escalate` — escalate to Phase II (sets new due date +30 days, links to Deviation Manager for CAPA)
- `POST /qc/results/:resultId/oos/close` — close OOS investigation with conclusion (confirmed_oos, invalidated, within_spec)

### Certificate of Analysis (future-ready)
- `GET /qc/samples/:sampleId/coa` — generate Certificate of Analysis from all approved results for a sample (returns JSON structure suitable for PDF rendering)

### Dashboard & AI
- `GET /qc/stats` — dashboard stats (sample queue depth, tests in progress, overdue tests, OOS count, instrument status, methods due for revalidation, analysts due for requalification)
- `GET /qc/workload` — analyst workload breakdown (tests per analyst, estimated hours, qualification coverage)
- `POST /qc/ai/turnaround` — AI: predict turnaround time for a sample based on current queue
- `POST /qc/ai/anomaly` — AI: flag anomalous results across recent test data
- `POST /qc/ai/workload` — AI: optimise workload distribution across analysts
- `POST /qc/ai/priority` — AI: auto-prioritise sample queue based on batch criticality and deadlines
- `POST /qc/ai/oos-rootcause` — AI: suggest likely OOS root causes based on historical investigation data for similar test/product/instrument combinations

## Role Access
- qc (all operations: sample management, test assignment, result recording, instrument management, analyst qualifications, test methods, test templates)
- qa (view all, approve results, review OOS flags, close OOS investigations, dashboard access, method validation approval)

## AI Features (use Anthropic Claude via service dependency)
These AI features are Vent's primary competitive differentiator vs. traditional LIMS (LabWare, STARLIMS) which have limited or no AI capabilities.

- **Predict turnaround times** — analyse the current sample queue depth, analyst availability, test complexity, and historical turnaround data to estimate when a sample's results will be available. Flag samples at risk of missing their target TAT. Input signals: queue depth by test type, historical TAT for similar sample/test combos, analyst workload, instrument availability, day-of-week patterns, priority levels of competing samples. Return estimated completion datetime and confidence level (high/medium/low).
- **Flag anomalous results** — analyse recent test results across multiple samples/batches to detect statistical outliers, unexpected trends, or results that deviate from historical norms. Flag potential OOS/OOT before formal review. Provide reasoning for each flag. Detection patterns include: statistical outliers (>2-3 sigma from mean), trend detection (Nelson rules — 7+ consecutive points on one side of mean, 6+ trending in one direction), shift detection, cross-test correlation anomalies (e.g., pH normal but potency shifted suggesting degradation), batch-to-batch comparison, and instrument drift detection. For each anomaly, return: which result, why it is unusual, severity (info/warning/critical), and recommended action.
- **Workload optimisation** — analyse current test assignments, analyst skills/qualifications (from `qc_analyst_qualifications`), instrument availability, and priority levels to suggest optimal workload distribution. Identify bottlenecks and recommend rebalancing. Consider: analyst qualification for specific methods, current backlog per analyst, test priority and due dates, instrument assignments, historical throughput per test type, and grouping tests by instrument to reduce setup time.
- **Auto-priority for batch-critical samples** — automatically score and prioritise samples in the queue based on: batch-critical flag (30% weight), production schedule proximity (25%), sample age since receipt (15%), number of required tests (10%), test complexity/TAT estimate (10%), and product tier (10%). Return a priority score (1-100), priority category (critical/urgent/normal), and rationale for each sample. Provides auditable justification for priority decisions.
- **OOS root cause suggestion** — when an OOS investigation is initiated, analyse historical OOS investigations for similar test/product/instrument combinations and suggest likely root causes. Categorise as: lab_error_calculation, lab_error_sample_prep, lab_error_equipment, lab_error_method, process_related, or inconclusive. Reference relevant previous investigation IDs and outcomes.

## Dependencies
- Equipment Logbook (live R1) — link instruments to equipment records for maintenance/calibration history
- Deviation Manager (live R1) — link OOS investigations to deviations for CAPA escalation via `linked_oos_id`
- Training Matrix (live R1) — analyst qualifications complement the training module's competency tracking

## Wiring in server/index.js
```js
// Require at top
const qcLabRoutes = require('./routes/qc-lab');
const { makeQcLabService } = require('./services/qc-lab.service');

// Instantiate service
const qcLabService = makeQcLabService({ supabase, auditLog, anthropic });

// Add to PAGE_MAP
'qc-lab.html': 'qc/lab.html',

// Mount routes
qcLabRoutes(app, { auth: requireAuth, qcLabService });
```

## Frontend Page: docs/qc/lab.html

### Layout
Split-panel: list (left) + detail (right), matching `docs/qa/deviations.html`. Note: this page is in a NEW department folder `docs/qc/` — create the directory.

### Features
1. **Sample Queue** (left panel)
   - Filterable by status (received, in_testing, pending_review, completed, cancelled), sample type (in_process, release, stability, raw_material, reference_standard, environmental), priority (normal, urgent, critical), batch-critical flag
   - Search by sample ID, batch number, product name
   - Priority color coding (critical=red, urgent=orange, normal=green)
   - Batch-critical badge (red star indicator)
   - TAT indicator (on-track=green, at-risk=gold, overdue=red)
   - Toggle between Sample view and Test view (all tests across samples)

2. **Sample Detail** (right panel)
   - Header: sample ID, batch number, product name, status badge, priority badge, batch-critical flag
   - Sample info: type, sample point, received by, received date, storage condition/location, quantity
   - Status workflow: Received → In Testing → Pending Review → Completed
   - Test list table: test name, method, assigned analyst, instrument, status, result, pass/fail, OOS flag
   - Each test expandable to show full result detail (value, spec limits, raw data, review status)
   - OOS results highlighted in red with immediate investigation link
   - OOS investigation panel (inline, below OOS result): shows investigation phase (Phase I / Phase II), status, assignee, due date countdown, root cause category, conclusion. Buttons: "Initiate Phase I", "Escalate to Phase II", "Close Investigation". AI: "Suggest Root Cause" button populates likely causes from historical data.
   - AI panels: predicted turnaround time, anomaly flags with reasoning
   - Chain of custody log
   - Analyst qualification warning — if assigned analyst is not qualified for the test method, show amber warning badge with tooltip "Analyst not qualified for this method"
   - Audit trail timeline

3. **Register Sample Modal**
   - Batch number, product name
   - Sample type dropdown (in_process, release, stability, raw_material, reference_standard, environmental)
   - Sample point, description
   - Priority dropdown (normal, urgent, critical)
   - Batch-critical checkbox
   - Required tests multi-select (with pre-populated test templates based on sample type — fetched from `qc_test_templates` via `GET /qc/templates/for/:sampleType`)
   - "Apply Template" dropdown — select a test panel template to auto-populate the required tests list
   - Storage condition, storage location
   - Quantity, units, expiry date
   - Stability fields (shown when sample_type = 'stability'): protocol ID, storage condition, time point, pull date
   - Reserve sample checkbox and disposal date (shown when is_reserve_sample checked)
   - AI: "Auto-Prioritise" button — calculates priority based on production schedule

4. **Assign Test Modal**
   - Test name, test method (dropdown from `qc_test_methods` registry), test category (chemical, biological, microbiological, physical)
   - Method validation status badge — shows current validation status from `qc_test_methods` (validated=green, due_for_revalidation=amber, expired=red)
   - Assigned analyst dropdown — shows qualification status next to each analyst name (qualified=green check, not qualified=amber warning, expired=red X). Fetched via `GET /qc/qualifications/check/:analystId/:testMethod`
   - Instrument dropdown (filtered by qualified instruments for this test type)
   - Specification: min value, max value, unit, text specification
   - Spec version and effective date (auto-populated from latest spec, editable)
   - Target TAT (hours)
   - Due date (auto-calculated from TAT)

5. **Record Result Modal**
   - Result value (numeric), result text (for qualitative tests)
   - Result unit
   - Pass/fail (auto-calculated against spec limits, manual override available)
   - OOS flag (auto-set if result outside spec, manual override available)
   - OOT flag (trending toward OOS)
   - Calculation notes
   - Raw data attachment (JSON)
   - Notes

6. **Instrument Panel** (accessible from detail or separate tab)
   - Instrument list: name, type, model, status, next calibration date, next qualification date
   - Overdue calibration/qualification highlighted in red
   - Instrument detail: full info, qualification history, calibration schedule

7. **Workload View** (tab or toggle)
   - Analyst workload table: analyst name, assigned tests count, estimated hours, overdue tests
   - Qualification coverage column — shows how many of the analyst's assigned tests they are qualified for
   - AI-suggested rebalancing recommendations
   - Capacity utilisation chart (bar chart per analyst)

8. **Analyst Qualifications Panel** (accessible from Workload View or separate tab)
   - Qualification matrix table: rows = analysts, columns = test methods, cells = qualified/expired/not qualified with color coding
   - Overdue requalifications highlighted in red
   - Add Qualification modal: analyst, test method (from `qc_test_methods`), qualified date, requalification due date, trainer, training record reference
   - Requalification due alerts (due within 30 days = amber, overdue = red)

9. **Test Methods Registry** (accessible from settings or separate tab)
   - Method list: method name, category, version, validation status badge, next revalidation date
   - Overdue revalidation highlighted in red
   - Add/Edit Method modal: method name, category (chemical, biological, microbiological, physical), version, validation status (validated, due_for_revalidation, expired, draft), validated date, next revalidation, SOP reference, applicable products, compatible instrument types

10. **Test Templates Panel** (accessible from settings or separate tab)
    - Template list: template name, sample type, product, test count
    - Add/Edit Template modal: template name, sample type, product name, tests list (add/remove individual tests with name, method, category, spec limits)

11. **Stats Dashboard** (top)
    - Samples in queue (by status)
    - Tests in progress
    - Overdue tests count
    - OOS results this month (with open investigation count)
    - Average TAT (last 30 days) — broken down: receipt-to-start, start-to-complete, complete-to-approved
    - Instruments due for calibration
    - Methods due for revalidation
    - Analyst requalifications due
    - Analyst utilisation summary

### Required imports
```html
<link rel="stylesheet" href="/shared/styles.css">
<script src="/shared/nav.js"></script>
<script src="/shared/i18n.js"></script>
<script src="/shared/dev-progress.js"></script>
```

Use `authFetch()` for all API calls. Use CSS variables from shared/styles.css (dark theme).

## Architecture Rules
- Service factory pattern: `module.exports = { makeQcLabService }`
- Use `requireAuth` middleware on all routes; use `requireRole('qc')` on write operations, `requireRole('qa')` on approval operations
- Use `auditLog()` for all create/update/approve operations
- Frontend: `authFetch()` for all API calls
- Frontend: dark theme (--bg, --surface, --accent CSS vars)
- Frontend: split-panel layout (list left, detail right)
- No frameworks — vanilla HTML/CSS/JS only
- 21 CFR Part 11 compliant: immutable audit trail, e-signature on result approvals
- Auto-flag OOS: if result_value is outside specification_min/specification_max, auto-set oos_flag=true and pass_fail='fail'
- Analyst qualification check: when assigning a test, query `qc_analyst_qualifications` — if analyst is not qualified for the test method, allow assignment but include `qualification_warning: true` in the response (warn, don't block, for MVP)
- OOS investigation auto-initiation: when a result is flagged OOS and review confirms it, auto-create a Phase I investigation record with due date = now + 3 business days
- Method validation gate: when creating a test referencing a `test_method_id`, check `qc_test_methods` validation status — if expired, include `method_validation_warning: true` in the response

## Competitive Positioning
Vent's QC Lab module is positioned against enterprise LIMS systems (LabWare $500K-$2M+, STARLIMS $300K-$1M+) and modern alternatives (Labguru, Benchling). Key advantages:
1. **AI-native** — LLM-powered TAT prediction, anomaly detection, workload optimisation, and OOS root cause suggestion are genuine differentiators. Traditional LIMS have limited/add-on analytics only.
2. **Modern UX** — clean, dark-themed, responsive UI vs. legacy interfaces of LabWare/STARLIMS. Lower training burden like Labguru but with enterprise GMP compliance.
3. **Rapid deployment** — cloud-native, configured in days vs. 6-18 month implementation projects.
4. **Integrated platform** — QC Lab is one module in a 76-module manufacturing intelligence platform, not a standalone LIMS requiring integration with 5+ other systems.
5. **OOS investigation workflow** — full Phase I/II tracking matching enterprise LIMS depth, but with AI-assisted root cause suggestion.
6. **Instrument integration** — manual entry only for MVP (acceptable). Roadmap for instrument data interfaces (HPLC, spectrophotometer, etc.) in future phases.

## Reference files (copy patterns from)
- `docs/qa/deviations.html` — layout, styling, split-panel pattern
- `server/services/deviation-mgr.service.js` — service factory with AI features
- `server/routes/deviation-mgr.js` — route pattern with auth guards
- `server/lib/ids.js` — ID generator pattern
- `server/lib/audit.js` — audit logging
