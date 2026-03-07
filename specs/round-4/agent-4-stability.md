# Agent 4 — Stability Program
# Branch: feature/stability
# Phase: 3 — Quality Control Lab
# Complexity: M (5 days)

## What to build
ICH-compliant stability study management system for GMP biologics facilities. Stability testing is a regulatory requirement under ICH Q1A-Q1E (small molecules) and ICH Q5C (biotechnological/biological products) to establish shelf-life, storage conditions, and retest periods. This module manages the full stability lifecycle: protocol definition, study initiation, sample pull scheduling at ICH-defined timepoints (0, 3, 6, 9, 12, 18, 24, 36 months), results entry with specification limits, statistical trend analysis, shelf-life estimation, out-of-trend (OOT) detection, and regulatory reporting.

Supports all ICH storage conditions: long-term (25C/60%RH), intermediate (30C/65%RH), accelerated (40C/75%RH), refrigerated (5C/ambient RH), frozen (-20C, -80C), stress, and photostability per ICH Q1B. Tracks stability chamber qualification, monitoring, and excursion management. Implements matrixing and bracketing designs per ICH Q1D to reduce testing burden while maintaining statistical validity. Performs statistical analysis per ICH Q1E: poolability assessment across batches/strengths/packaging, linear regression with 95% confidence intervals for shelf-life estimation, and significant change detection per ICH criteria (5% potency loss from initial, pH shift outside limits, dissolution failure below Q, physical attribute changes).

AI-native features provide trend extrapolation with linear regression to predict future values, shelf-life modelling per ICH Q1E statistical methods, OOT detection using moving averages and control charts, pull schedule optimisation via matrixing/bracketing per ICH Q1D, significant change detection per ICH criteria, and chamber excursion impact assessment — differentiating Vent from incumbents (LIMS, Benchling, Empower) that treat stability as an afterthought bolted onto general lab workflows.

## Files to create
- `docs/qc/stability.html` (frontend page)
- `server/services/stability.service.js` (service layer)
- `server/routes/stability.js` (API routes)

## Files to modify (additions only)
- `server/routes/admin.js` — add CREATE TABLE statements
- `server/index.js` — wire service + mount routes + add PAGE_MAP entry
- `server/lib/ids.js` — add ID generators

## Database Tables
Add to `server/routes/admin.js`:

### stability_studies
```sql
CREATE TABLE IF NOT EXISTS stability_studies (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  study_id              TEXT UNIQUE NOT NULL,
  title                 TEXT NOT NULL,
  protocol_number       TEXT NOT NULL DEFAULT '',
  -- protocol_number: unique protocol identifier for cross-referencing with QMS (e.g. STAB-PROT-001)
  study_type            TEXT NOT NULL DEFAULT 'long-term',
  -- study_type values: long-term, intermediate, accelerated, stress, photostability, in-use, post-approval, ongoing
  product_name          TEXT NOT NULL,
  product_code          TEXT NOT NULL DEFAULT '',
  -- product_code: internal product/material code for cross-reference
  batch_id              TEXT DEFAULT '',
  -- batch_id: link to batch record when available
  batch_number          TEXT NOT NULL DEFAULT '',
  dosage_form           TEXT NOT NULL DEFAULT '',
  -- dosage_form values: liquid, lyophilised, suspension, pre-filled-syringe, vial, ampoule, cartridge, bag, other
  strength              TEXT DEFAULT '',
  -- strength: product strength/concentration (e.g. "100 mg/mL", "50 MIU/vial")
  container_closure     TEXT DEFAULT '',
  -- container_closure: packaging description (e.g. "10 mL Type I borosilicate vial with 20mm FluroTec stopper")
  storage_condition     TEXT NOT NULL DEFAULT '25-60',
  -- storage_condition values: 25-60 (25C/60%RH long-term), 30-65 (30C/65%RH intermediate), 40-75 (40C/75%RH accelerated), 5-ambient (2-8C refrigerated), minus20 (-20C frozen), minus80 (-80C ultra-cold), custom
  custom_temp           NUMERIC,
  -- custom_temp: temperature in Celsius when storage_condition = 'custom'
  custom_rh             NUMERIC,
  -- custom_rh: relative humidity percentage when storage_condition = 'custom'
  start_date            DATE NOT NULL,
  planned_duration_months INTEGER NOT NULL DEFAULT 24,
  -- planned_duration_months: total study duration — long-term: 12-60 months, accelerated: 6 months, intermediate: 12 months per ICH Q1A
  status                TEXT DEFAULT 'planned',
  -- status workflow: planned → active → on-hold → completed → cancelled → reporting
  orientation           TEXT DEFAULT 'upright',
  -- orientation values: upright, inverted, sideways — per ICH Q1A(R2) Section 2.2.7 for container closure assessment
  chamber_id            TEXT DEFAULT '',
  -- chamber_id: FK reference to stability_chambers.chamber_id
  initiated_by          TEXT NOT NULL,
  approved_by           TEXT DEFAULT '',
  -- approved_by: QA approver who authorised the study protocol
  regulatory_commitment BOOLEAN DEFAULT false,
  -- regulatory_commitment: true if study is required by a regulatory authority filing
  commitment_type       TEXT DEFAULT '',
  -- commitment_type values: initial-filing, post-approval, annual-report, variation, renewal, who-prequalification
  protocol_doc_id       TEXT DEFAULT '',
  -- protocol_doc_id: link to document control system for the approved stability protocol
  matrixing_design      JSONB DEFAULT '{}',
  -- matrixing_design: ICH Q1D design — defines which factors (strengths, container sizes) are tested at which timepoints
  -- Example: { "factors": ["10mg", "50mg", "100mg"], "timepoints": { "0": ["all"], "3": ["10mg","100mg"], "6": ["50mg"], ... } }
  bracketing_design     JSONB DEFAULT '{}',
  -- bracketing_design: ICH Q1D design — tests only extremes of design factors (e.g. smallest and largest container sizes)
  -- Example: { "factor": "container_size", "extremes": ["2mL", "50mL"], "intermediates_skipped": ["10mL", "20mL"] }
  specifications        JSONB DEFAULT '[]',
  -- specifications: array of test parameters with acceptance criteria
  -- Example: [{ "parameter": "potency", "method": "SEC-HPLC", "spec_low": 90, "spec_high": 110, "unit": "% LC", "trending_limit": 95 }, ...]
  timepoints            JSONB DEFAULT '[]',
  -- timepoints: array of planned timepoint months — standard ICH: [0, 3, 6, 9, 12, 18, 24, 36] for long-term; [0, 3, 6] for accelerated
  notes                 TEXT DEFAULT '',
  ai_shelf_life         JSONB DEFAULT '{}',
  -- ai_shelf_life: AI-calculated shelf-life estimate { months, confidence_interval, method, poolability, regression_data }
  ai_trend_summary      TEXT DEFAULT '',
  -- ai_trend_summary: AI-generated narrative summary of trending data and predictions
  created_by            TEXT NOT NULL DEFAULT 'system',
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stab_status ON stability_studies(status);
CREATE INDEX IF NOT EXISTS idx_stab_type ON stability_studies(study_type);
CREATE INDEX IF NOT EXISTS idx_stab_product ON stability_studies(product_code);
CREATE INDEX IF NOT EXISTS idx_stab_condition ON stability_studies(storage_condition);
CREATE INDEX IF NOT EXISTS idx_stab_batch ON stability_studies(batch_number);
CREATE INDEX IF NOT EXISTS idx_stab_chamber ON stability_studies(chamber_id);
CREATE INDEX IF NOT EXISTS idx_stab_commitment ON stability_studies(regulatory_commitment);
CREATE INDEX IF NOT EXISTS idx_stab_initiated ON stability_studies(initiated_by);
ALTER TABLE stability_studies ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'stability_studies_all') THEN
    CREATE POLICY stability_studies_all ON stability_studies FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;
```

### stability_pulls
```sql
CREATE TABLE IF NOT EXISTS stability_pulls (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pull_id           TEXT UNIQUE NOT NULL,
  study_id          TEXT NOT NULL REFERENCES stability_studies(study_id),
  timepoint_months  INTEGER NOT NULL,
  -- timepoint_months: ICH timepoint in months (0, 3, 6, 9, 12, 18, 24, 36, 48, 60)
  planned_date      DATE NOT NULL,
  -- planned_date: calculated from study start_date + timepoint_months
  actual_date       DATE,
  -- actual_date: date sample was actually pulled (within ICH-allowed window)
  status            TEXT DEFAULT 'scheduled',
  -- status workflow: scheduled → due → pulled → tested → reported → missed
  pulled_by         TEXT DEFAULT '',
  samples_pulled    INTEGER DEFAULT 0,
  -- samples_pulled: number of units pulled at this timepoint
  samples_remaining INTEGER DEFAULT 0,
  -- samples_remaining: remaining units in chamber for future timepoints
  storage_location  TEXT DEFAULT '',
  -- storage_location: where pulled samples are held pending testing (e.g. "QC Lab Freezer-3, Shelf B")
  pull_window_start DATE,
  -- pull_window_start: earliest allowed pull date per ICH (timepoint - allowable variance)
  pull_window_end   DATE,
  -- pull_window_end: latest allowed pull date per ICH (timepoint + allowable variance)
  tests_required    JSONB DEFAULT '[]',
  -- tests_required: array of parameter names to test at this timepoint (may differ per matrixing design)
  notes             TEXT DEFAULT '',
  created_by        TEXT NOT NULL DEFAULT 'system',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_spull_study ON stability_pulls(study_id);
CREATE INDEX IF NOT EXISTS idx_spull_status ON stability_pulls(status);
CREATE INDEX IF NOT EXISTS idx_spull_planned ON stability_pulls(planned_date);
CREATE INDEX IF NOT EXISTS idx_spull_timepoint ON stability_pulls(timepoint_months);
ALTER TABLE stability_pulls ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'stability_pulls_all') THEN
    CREATE POLICY stability_pulls_all ON stability_pulls FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;
```

### stability_results
```sql
CREATE TABLE IF NOT EXISTS stability_results (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  result_id         TEXT UNIQUE NOT NULL,
  pull_id           TEXT NOT NULL REFERENCES stability_pulls(pull_id),
  study_id          TEXT NOT NULL REFERENCES stability_studies(study_id),
  parameter         TEXT NOT NULL,
  -- parameter values: potency, purity, aggregation, charge-variants, appearance, ph, moisture, particulates, sterility, endotoxin, osmolality, viscosity, sub-visible-particles, oxidation, deamidation, fragmentation, color, clarity, bioburden, container-closure-integrity, extractables, reconstitution-time
  method            TEXT DEFAULT '',
  -- method: analytical method reference (e.g. "SOP-QC-042 Rev 3, SEC-HPLC")
  result_value      NUMERIC,
  -- result_value: quantitative result (NULL for qualitative pass/fail tests like appearance)
  result_text       TEXT DEFAULT '',
  -- result_text: qualitative result for non-numeric parameters (e.g. "Clear, colourless solution, free from visible particles")
  result_unit       TEXT DEFAULT '',
  -- result_unit: unit of measure (%, mg/mL, EU/mL, pH units, cP, particles/mL, etc.)
  spec_low          NUMERIC,
  -- spec_low: lower specification limit for this parameter at this timepoint
  spec_high         NUMERIC,
  -- spec_high: upper specification limit for this parameter at this timepoint
  status            TEXT DEFAULT 'pending',
  -- status values: pending, within-spec, oot, oos (auto-calculated on result entry)
  trending_status   TEXT DEFAULT 'normal',
  -- trending_status values: normal, watch, alert, action — based on AI trend analysis
  -- normal: within control limits; watch: approaching trending limit; alert: crossed trending limit but within spec; action: OOT confirmed, investigation required
  analyst           TEXT DEFAULT '',
  -- analyst: QC analyst who performed the test
  tested_at         TIMESTAMPTZ,
  -- tested_at: date/time testing was performed
  instrument_id     TEXT DEFAULT '',
  -- instrument_id: FK reference to QC Lab instruments table (QCI-xxxx)
  reviewed_by       TEXT DEFAULT '',
  -- reviewed_by: second-person review per GMP data integrity requirements
  reviewed_at       TIMESTAMPTZ,
  comments          TEXT DEFAULT '',
  deviation_id      TEXT DEFAULT '',
  -- deviation_id: link to deviation record if OOS/OOT triggers investigation
  created_by        TEXT NOT NULL DEFAULT 'system',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sres_pull ON stability_results(pull_id);
CREATE INDEX IF NOT EXISTS idx_sres_study ON stability_results(study_id);
CREATE INDEX IF NOT EXISTS idx_sres_param ON stability_results(parameter);
CREATE INDEX IF NOT EXISTS idx_sres_status ON stability_results(status);
CREATE INDEX IF NOT EXISTS idx_sres_trending ON stability_results(trending_status);
CREATE INDEX IF NOT EXISTS idx_sres_analyst ON stability_results(analyst);
ALTER TABLE stability_results ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'stability_results_all') THEN
    CREATE POLICY stability_results_all ON stability_results FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;
```

### stability_chambers
```sql
CREATE TABLE IF NOT EXISTS stability_chambers (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chamber_id        TEXT UNIQUE NOT NULL,
  name              TEXT NOT NULL,
  -- name: human-readable chamber identifier (e.g. "Walk-In Chamber WIC-01", "Reach-In SC-03")
  location          TEXT DEFAULT '',
  -- location: physical location (e.g. "QC Lab, Room 210, Bay 3")
  chamber_type      TEXT NOT NULL DEFAULT 'reach-in',
  -- chamber_type values: walk-in, reach-in, photostability, refrigerator, freezer, ultra-low-freezer
  set_temp          NUMERIC NOT NULL,
  -- set_temp: target temperature in Celsius
  set_rh            NUMERIC,
  -- set_rh: target relative humidity percentage (NULL for freezers)
  temp_range_low    NUMERIC NOT NULL,
  -- temp_range_low: qualified operating range lower limit (Celsius)
  temp_range_high   NUMERIC NOT NULL,
  -- temp_range_high: qualified operating range upper limit (Celsius)
  rh_range_low      NUMERIC,
  -- rh_range_low: qualified operating range lower limit (% RH)
  rh_range_high     NUMERIC,
  -- rh_range_high: qualified operating range upper limit (% RH)
  status            TEXT DEFAULT 'qualified',
  -- status values: qualified, in-use, maintenance, excursion, decommissioned
  last_calibration  DATE,
  -- last_calibration: date of last temperature/humidity calibration
  next_calibration  DATE,
  -- next_calibration: date of next scheduled calibration
  calibration_interval_days INTEGER DEFAULT 365,
  -- calibration_interval_days: calibration frequency (typically annual per GMP)
  capacity          INTEGER DEFAULT 0,
  -- capacity: maximum number of studies the chamber can hold simultaneously
  current_studies   INTEGER DEFAULT 0,
  -- current_studies: number of active studies currently in this chamber
  manufacturer      TEXT DEFAULT '',
  model             TEXT DEFAULT '',
  serial_number     TEXT DEFAULT '',
  asset_tag         TEXT DEFAULT '',
  -- asset_tag: internal equipment asset ID for cross-reference with equipment management module
  mapping_report    TEXT DEFAULT '',
  -- mapping_report: reference to temperature/humidity mapping qualification report
  alarm_contacts    JSONB DEFAULT '[]',
  -- alarm_contacts: array of contacts for out-of-range alarms [{ "name": "...", "email": "...", "phone": "...", "role": "..." }]
  excursion_history JSONB DEFAULT '[]',
  -- excursion_history: log of past excursion events [{ "date": "...", "duration_hours": 0, "temp_max": 0, "temp_min": 0, "impact": "...", "resolution": "..." }]
  notes             TEXT DEFAULT '',
  created_by        TEXT NOT NULL DEFAULT 'system',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scham_status ON stability_chambers(status);
CREATE INDEX IF NOT EXISTS idx_scham_type ON stability_chambers(chamber_type);
CREATE INDEX IF NOT EXISTS idx_scham_next_cal ON stability_chambers(next_calibration);
ALTER TABLE stability_chambers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'stability_chambers_all') THEN
    CREATE POLICY stability_chambers_all ON stability_chambers FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;
```

## ID Generators
Add to `server/lib/ids.js`:
- `stabilityStudyId()` → `STAB-1000…9999`
- `stabilityPullId()` → `SPULL-1000…9999`
- `stabilityResultId()` → `SRES-1000…9999`
- `stabilityChamberIdGen()` → `SCHAM-1000…9999`

## API Endpoints

### Core CRUD — Studies
- `POST /stability/studies` — create a new stability study (auto-generates STAB-ID, auto-generates pull schedule based on study_type and timepoints array, validates storage_condition against chamber capabilities if chamber_id provided)
- `GET /stability/studies` — list all studies (filter by status, study_type, product_code, batch_number, storage_condition, regulatory_commitment, chamber_id)
- `GET /stability/studies/:studyId` — single study with all pulls, results, chamber info, and AI analysis
- `PUT /stability/studies/:studyId` — update study (auto-recalculates pull schedule if timepoints or start_date change, blocked if study is completed/cancelled)

### Workflow Transitions — Studies
- `POST /stability/studies/:studyId/activate` — activate study (planned → active). Validates: protocol approved (approved_by is set), chamber assigned and qualified, specifications defined, timepoints defined. Auto-sets pull statuses to 'scheduled'. Auto-generates pulls if not already created.
- `POST /stability/studies/:studyId/hold` — place study on hold (active → on-hold). Requires reason. Pauses pull schedule reminders.
- `POST /stability/studies/:studyId/resume` — resume study (on-hold → active). Recalculates upcoming pull dates if needed.
- `POST /stability/studies/:studyId/complete` — complete study (active → completed). Blocked if any pulls have status = 'scheduled' or 'due'. All results must be entered and reviewed.
- `POST /stability/studies/:studyId/cancel` — cancel study (any → cancelled). Requires justification. Does not delete data.

### Pulls
- `POST /stability/studies/:studyId/pulls` — manually add a pull (for ad-hoc timepoints outside the standard schedule)
- `GET /stability/studies/:studyId/pulls` — list all pulls for a study (ordered by timepoint_months)
- `PUT /stability/pulls/:pullId` — update pull record (record actual_date, pulled_by, samples_pulled, samples_remaining when pull is performed)
- `POST /stability/pulls/:pullId/execute` — execute a pull (scheduled/due → pulled). Records who pulled, when, how many samples. Decrements samples_remaining.
- `POST /stability/pulls/:pullId/miss` — mark pull as missed (scheduled/due → missed). Requires justification. Auto-logs deviation reference.

### Results
- `POST /stability/results` — enter result for a pull (auto-calculates status: compares result_value against spec_low/spec_high to set within-spec/oos; checks trending_limit from study specifications to set trending_status)
- `GET /stability/results` — list results (filter by study_id, pull_id, parameter, status, trending_status, analyst)
- `GET /stability/results/:resultId` — single result with full context (study info, pull info, specification, historical values for trending)
- `PUT /stability/results/:resultId` — update result (recalculates status and trending_status; blocked after QA review unless deviation raised)
- `POST /stability/results/:resultId/review` — second-person review of result (sets reviewed_by, reviewed_at). Required per GMP data integrity.

### Chambers
- `POST /stability/chambers` — register a new stability chamber (auto-generates SCHAM-ID)
- `GET /stability/chambers` — list all chambers (filter by status, chamber_type)
- `GET /stability/chambers/:chamberId` — single chamber with list of active studies, calibration history, excursion history
- `PUT /stability/chambers/:chamberId` — update chamber (status, calibration dates, alarm contacts)
- `POST /stability/chambers/:chamberId/excursion` — log a chamber excursion event (auto-flags all active studies in chamber, triggers AI impact assessment)
- `POST /stability/chambers/:chamberId/calibrate` — record calibration completion (updates last_calibration, calculates next_calibration based on interval)

### Dashboard & Analytics
- `GET /stability/stats` — dashboard stats (active studies count, upcoming pulls this week/month, overdue pulls, OOT count, OOS count, chambers in excursion, studies by status, studies by storage condition, average time to complete pulls, regulatory commitment studies count)
- `GET /stability/upcoming` — upcoming pulls in next 7/14/30 days with study context (for the stability calendar/schedule view)
- `GET /stability/overdue` — all overdue pulls (past planned_date, status still scheduled/due)
- `GET /stability/oot-alerts` — all results with trending_status = 'alert' or 'action' that have not been resolved
- `GET /stability/trends/:studyId/:parameter` — time-series data for a specific parameter across all timepoints (for charting). Returns: timepoint, value, spec_low, spec_high, trending_limit, status, regression line data.

### AI Endpoints
- `POST /stability/studies/:studyId/ai/trend` — AI: trend extrapolation for all parameters. Performs linear regression on existing data points, projects values at remaining timepoints, identifies parameters trending toward specification limits with estimated time to OOT.
- `POST /stability/studies/:studyId/ai/shelf-life` — AI: shelf-life estimation per ICH Q1E. Performs poolability assessment across conditions (if multiple conditions exist for same product), applies linear regression with 95% one-sided confidence interval, estimates shelf-life as point where lower confidence bound crosses spec limit.
- `POST /stability/studies/:studyId/ai/oot-analysis` — AI: OOT statistical analysis. Applies moving average, detects deviations >2 sigma from trend, applies Nelson rules, identifies results that warrant investigation even if within specification.
- `POST /stability/studies/:studyId/ai/optimise-schedule` — AI: pull schedule optimisation. Analyses existing data to suggest matrixing/bracketing design per ICH Q1D that reduces testing burden while maintaining statistical validity. Recommends which timepoints/factors can be skipped.
- `POST /stability/studies/:studyId/ai/significant-change` — AI: significant change detection per ICH criteria. Checks for: >=5% potency change from initial value, failure to meet acceptance criteria for dissolution, degradation product changes, failure to meet appearance/physical criteria, failure to meet pH specification.
- `POST /stability/chambers/:chamberId/ai/excursion-impact` — AI: chamber excursion impact assessment. Given excursion details (temp, duration), predicts impact on all active studies in chamber based on Arrhenius kinetics and product degradation profiles. Recommends actions (pull forward testing, extended monitoring, study invalidation).

## Role Access
- qc (create studies, enter results, execute pulls, manage chambers, run AI analysis, create/update all records)
- qa (approve study protocols, review results, close/complete studies, approve chamber qualifications, override OOT decisions)
- regulatory (view all studies, flag regulatory commitments, review shelf-life data, access AI shelf-life and trend reports, export data for regulatory submissions)
- admin (all operations)

### Permission Details
- **Study creation:** qc, qa, admin
- **Study activation:** qa (requires protocol approval), admin
- **Study completion/closure:** qa, admin
- **Pull execution:** qc, admin
- **Result entry:** qc, admin
- **Result review (second person):** qc (different user than analyst), qa, admin
- **Chamber management:** qc, admin
- **Chamber excursion logging:** qc, qa, admin
- **AI endpoint access:** qc, qa, regulatory, admin
- **Regulatory commitment flagging:** regulatory, qa, admin
- **Read access (all endpoints):** qc, qa, regulatory, admin

## AI Features (use Anthropic Claude via service dependency)

### Build Now (Round 4)

- **Trend extrapolation** — for each parameter in a stability study, perform linear regression on all available data points (timepoint_months vs result_value). Calculate slope, intercept, R-squared, and 95% confidence interval. Project values at all remaining planned timepoints. Flag parameters where the projected value crosses specification limits before the planned study end date. For biologics, apply appropriate models: linear for potency/purity degradation, potentially exponential for aggregation growth. Return structured JSON with regression coefficients, projected values, time-to-OOT estimates, and a narrative summary. Example output: "Potency is declining at 0.8% per month (R2=0.94). Projected to reach the 90% lower specification limit at month 30 (current: month 18, value: 96.2%). Recommend enhanced monitoring."

- **Shelf-life modelling** — implement ICH Q1E statistical approach for shelf-life estimation. Steps: (1) Assess poolability — if multiple batches/strengths/container sizes are in the study, test whether data can be pooled using analysis of covariance (compare slopes and intercepts). (2) Apply linear regression with 95% one-sided confidence interval. (3) Shelf-life = the earlier of: the point where the 95% lower confidence bound crosses the spec limit, OR the supported period from the longest available timepoint. For accelerated data showing significant change, limit long-term shelf-life claim to data-supported period only (ICH Q1E Section 3.4). Return: estimated shelf-life in months, confidence interval, poolability result, regression parameters, and supporting rationale.

- **OOT statistical analysis** — apply statistical process control methods to stability trending data. Calculate moving averages (3-point, 5-point), identify results deviating >2 standard deviations from the trend line, apply Nelson rules (7+ consecutive points on one side of mean, 6+ points trending in one direction, 14+ points alternating up/down). Classify each result: normal (within trend), watch (approaching control limit), alert (crossed trending limit, within spec), action (confirmed OOT, investigation required). Generate control chart data (center line, UCL, LCL, data points with flags). Distinguish OOT (trending toward limit) from OOS (outside specification) — both require investigation but through different workflows.

- **Pull schedule optimisation** — analyse the study design and existing results to recommend reduced testing via ICH Q1D matrixing and bracketing. For matrixing: identify which factors (strengths, container sizes) can be tested at alternating timepoints rather than every timepoint. For bracketing: identify factors where only extreme levels need testing (e.g., smallest and largest container sizes). Validate that the reduced design maintains statistical power to detect degradation trends. Output: recommended modified schedule, estimated testing reduction percentage, statistical justification, and any risks/limitations.

- **Significant change detection** — evaluate results against ICH Q1A(R2) criteria for significant change in accelerated and intermediate studies. Criteria: (a) >=5% change in potency from initial value (or equivalent biological potency), (b) any specified degradant exceeding its specification, (c) failure to meet pH acceptance criteria (if applicable), (d) dissolution failure for >=12 units (if applicable), (e) failure to meet specification for appearance/physical attributes. If significant change is detected at accelerated conditions (40C/75%RH), intermediate condition testing (30C/65%RH) becomes required per ICH Q1A. Flag affected studies automatically.

- **Chamber excursion impact assessment** — when a chamber excursion is logged, evaluate the potential impact on all active studies stored in that chamber. Apply Arrhenius equation principles: estimate accelerated degradation based on excursion temperature, duration, and known degradation kinetics for the product type. For biologics (proteins/mAbs), consider temperature-sensitive degradation pathways: aggregation (exponential with temperature), deamidation (pH and temperature dependent), oxidation (temperature and light dependent). Recommend actions: pull-forward testing (test immediately to assess impact), extended monitoring (add additional timepoints), study continuation with annotation, or study invalidation (for severe/prolonged excursions). Generate an excursion impact report suitable for inclusion in regulatory submissions.

### Future Enhancements (not Round 4)
- **Cross-study comparison** — compare trending data across multiple studies for the same product (e.g., different batches, different conditions) to identify batch-to-batch variability
- **Regulatory submission generator** — auto-generate stability data tables and summaries in CTD Module 3.2.P.8 format for regulatory filings
- **Predictive chamber maintenance** — analyse chamber performance data to predict calibration drift or equipment failure
- **Natural language querying** — "Show me all accelerated studies where potency dropped more than 3% in the first 6 months" via the existing Vent query engine
- **Comparability protocol support** — generate comparability protocols for process changes that require stability bridging studies

## Dependencies
- QC Lab (live R3) — links to QC instruments (instrument_id FK), test methods, and analyst qualifications for stability testing

## Wiring in server/index.js
```js
// Require at top
const stabilityRoutes = require('./routes/stability');
const { makeStabilityService } = require('./services/stability.service');

// Instantiate service
const stabilityService = makeStabilityService({ supabase, auditLog, anthropic });

// Add to PAGE_MAP
'stability.html': 'qc/stability.html',

// Mount routes
stabilityRoutes(app, { auth: requireAuth, stabilityService });
```

## Frontend Page: docs/qc/stability.html

### Layout
Split-panel: list (left) + detail (right), matching `docs/qc/lab.html`.

### Features
1. **Study List** (left panel)
   - Filterable by status (planned, active, on-hold, completed, cancelled, reporting), study type (long-term, intermediate, accelerated, stress, photostability, in-use, post-approval, ongoing), product code, storage condition (25-60, 30-65, 40-75, 5-ambient, minus20, minus80), regulatory commitment (yes/no), chamber
   - Search by study ID, title, product name, batch number, protocol number
   - Status badges with workflow stage colors: planned=grey, active=green, on-hold=amber, completed=blue, cancelled=red, reporting=purple
   - Storage condition color coding: 25-60=green, 30-65=amber, 40-75=red, 5-ambient=cyan, minus20=blue, minus80=indigo
   - Regulatory commitment indicator (flag icon) for regulatory-required studies
   - OOT/OOS alert indicators on studies with trending issues (pulsing dot)
   - Sort by: created date, start date, next pull date, product, status
   - Study count badge in panel header

2. **Study Detail** (right panel)
   - Header: study ID, title, status badge, study type badge, storage condition badge, regulatory commitment flag
   - **Study Information panel:** protocol number, product name/code, batch number, dosage form, strength, container closure, orientation, start date, planned duration, chamber assignment (clickable to chamber detail), initiated by, approved by
   - **Status workflow visualiser:** horizontal progress bar showing Planned → Active → On-Hold → Completed → Reporting (or Cancelled). Current stage highlighted with pulsing animation.
   - **Specifications panel:** editable table of test parameters with columns: parameter name, analytical method, specification low, specification high, unit, trending limit. Add/remove rows. Pre-populated from common biologics parameters when creating new study.
   - **Pull Schedule panel:** timeline/calendar view of all planned pulls. Each pull shows: timepoint (months), planned date, actual date, status badge, pulled by, samples pulled/remaining. Color coding: scheduled=grey, due=amber, pulled=green, tested=blue, reported=purple, missed=red. "Execute Pull" button for scheduled/due pulls. "Add Pull" button for ad-hoc timepoints. Pull window indicators (earliest/latest allowed dates per ICH).
   - **Results Table panel:** grouped by timepoint, then by parameter. Columns: timepoint, parameter, method, result value, unit, spec low, spec high, status badge, trending status badge, analyst, tested date, reviewed by. Status auto-calculated: within-spec (green), OOT (amber), OOS (red), pending (grey). "Enter Results" button opens result entry form for a specific pull.
   - **Trend Charts panel:** interactive line charts for each parameter across timepoints. Shows: data points, specification limits (horizontal lines), trending limit (dashed line), linear regression line with confidence band, projected values (dotted extension). Multiple parameters can be overlaid or viewed individually. Uses CSS/SVG charting (no external chart library — vanilla JS canvas or inline SVG).
   - **AI Analysis panel:**
     - "Analyse Trends" button — runs trend extrapolation, displays results with parameter-by-parameter projections
     - "Estimate Shelf-Life" button — runs ICH Q1E analysis, displays shelf-life estimate with statistical details
     - "OOT Analysis" button — runs statistical analysis, displays control charts with flagged points
     - "Optimise Schedule" button — runs matrixing/bracketing analysis, displays recommended schedule changes
     - "Check Significant Change" button — runs ICH criteria check, displays pass/fail with details
     - Results displayed in collapsible panels with structured data + narrative summary
   - **Linked Records panel:** chamber link (clickable), related QC samples/tests, deviation links (for OOS/OOT investigations)
   - **Audit trail timeline:** immutable log of all actions with timestamp, user, and action description (21 CFR Part 11 compliant)

3. **Create Study Modal**
   - Title, protocol number
   - Product name, product code, batch number
   - Dosage form dropdown (liquid, lyophilised, suspension, pre-filled-syringe, vial, ampoule, cartridge, bag, other)
   - Strength (free text)
   - Container/closure description (free text)
   - Study type dropdown (long-term, intermediate, accelerated, stress, photostability, in-use, post-approval, ongoing) — with tooltip explaining ICH conditions for each type
   - Storage condition dropdown (25C/60%RH, 30C/65%RH, 40C/75%RH, 2-8C, -20C, -80C, Custom) — auto-fills temperature/humidity based on selection. Custom shows temp/rh input fields
   - Orientation dropdown (upright, inverted, sideways)
   - Chamber assignment dropdown (populated from active/qualified chambers matching the storage condition)
   - Start date (date picker)
   - Planned duration (months)
   - Timepoints: pre-populated based on study type (long-term: 0,3,6,9,12,18,24,36; accelerated: 0,1,2,3,6; intermediate: 0,3,6,9,12). Editable — add/remove individual timepoints
   - Specifications builder: add rows for each parameter to test (parameter dropdown, method text, spec low, spec high, unit, trending limit). Pre-populate with common biologics parameters (potency, purity, aggregation, pH, appearance, sub-visible particles)
   - Regulatory commitment checkbox + commitment type dropdown (visible when checked)
   - Notes (free text)
   - Protocol document reference (free text, link to doc control)

4. **Execute Pull Modal**
   - Displays: study ID, timepoint, planned date, pull window (earliest-latest)
   - Actual pull date (date picker, defaults to today, validated against pull window)
   - Pulled by (auto-populated with current user, editable)
   - Samples pulled (integer)
   - Samples remaining (integer)
   - Storage location for pulled samples (free text)
   - Notes

5. **Enter Results Modal**
   - Displays: study ID, pull ID, timepoint
   - For each parameter in the study specifications: result value input, result text input (for qualitative), analyst (auto-populated), instrument ID (dropdown from QC instruments), tested date/time
   - Auto-calculates status (within-spec/OOT/OOS) on entry based on specification limits
   - Visual indicator: green check (within-spec), amber warning (OOT), red alert (OOS)
   - OOS results trigger warning: "This result is outside specification. An OOS investigation will be required."
   - Batch entry: enter results for all parameters at once for a given pull

6. **Result Review Modal**
   - Displays: full result details (study, pull, parameter, value, spec, status)
   - Reviewer name (auto-populated from logged-in user)
   - Review comments (optional, required if result is OOT/OOS)
   - Confirm review button (sets reviewed_by, reviewed_at)
   - Warning if reviewing own results: "GMP requires second-person review. You entered this result."

7. **Chamber Management Panel** (accessible via "Chambers" tab or link)
   - List of all stability chambers with: name, type, set conditions, status, active studies count, next calibration date
   - Chamber detail: full specs, calibration history, excursion history, list of active studies
   - "Log Excursion" button — opens excursion modal (date, duration, temp range observed, RH range observed, cause, immediate actions taken)
   - "Record Calibration" button — records calibration completion, auto-calculates next due date
   - AI "Assess Excursion Impact" button — runs impact assessment on all active studies in chamber
   - Chamber status color coding: qualified=green, in-use=blue, maintenance=amber, excursion=red, decommissioned=grey
   - Calibration due indicator: green (>30 days), amber (7-30 days), red (<7 days or overdue)

8. **Stability Overview Dashboard** (top section, collapsible)
   - Active studies count by storage condition (segmented bar)
   - Upcoming pulls: this week, next 2 weeks, this month (clickable counts to filter)
   - Overdue pulls count (red badge, clickable)
   - OOT alerts count (amber badge, clickable to OOT alerts list)
   - OOS count (red badge)
   - Chamber status summary: qualified count, in-use count, excursion count, calibration due soon count
   - Regulatory commitment studies: active count, upcoming pull count
   - Quick actions: "Create Study", "Enter Results", "Manage Chambers"

9. **Stability Calendar View** (toggle from list view)
   - Month-by-month calendar showing scheduled pulls across all active studies
   - Color-coded by study/product
   - Pull status indicators (scheduled, due, completed, missed)
   - Click on a date to see all pulls due that day with study details
   - Overdue pulls highlighted in red

### Required imports
```html
<link rel="stylesheet" href="/shared/styles.css">
<script src="/shared/nav.js"></script>
<script src="/shared/i18n.js"></script>
<script src="/shared/dev-progress.js"></script>
```

Use `authFetch()` for all API calls. Use CSS variables from shared/styles.css (dark theme).

## Architecture Rules
- Service factory pattern: `module.exports = { makeStabilityService }`
- Use `requireAuth` on all read routes; `requireRole('qc')` on write routes for studies, pulls, results, chambers; `requireRole('qa')` on approval/review/completion routes
- Use `auditLog()` for all create/update/delete/transition operations — every state change must be logged
- Audit trail entries must include: action, userId, timestamp, and the full before/after state diff for the changed record (21 CFR Part 11.10(e))
- Auto-generate pull schedule when study is created: for each timepoint in the timepoints array, create a stability_pulls record with planned_date = start_date + timepoint_months, status = 'scheduled'
- Auto-calculate result status on entry: compare result_value against spec_low and spec_high from study specifications. Set 'within-spec' if spec_low <= value <= spec_high, 'oos' if outside, 'oot' if within spec but beyond trending_limit
- Auto-flag trending_status: 'normal' if well within limits, 'watch' if within 10% of trending limit, 'alert' if past trending limit but within spec, 'action' if confirmed OOT requiring investigation
- Auto-update pull status to 'due' when planned_date is within 7 days of current date (can be done via stats/upcoming query or on list fetch)
- Block study completion if any pulls have status = 'scheduled' or 'due' (all must be pulled/tested/reported or explicitly missed)
- Block result update after review unless deviation is raised (data integrity — reviewed results are locked)
- Validate pull dates against ICH-allowed windows: timepoint +/- allowable variance (0-2 months: +/- 2 days; 3-11 months: +/- 7 days; 12+ months: +/- 14 days)
- E-signatures on reviews must capture: printed name (from user profile), timestamp per 21 CFR Part 11.10(k)
- Chamber excursion auto-flags all active studies in that chamber with a notification/alert
- Frontend: `authFetch()` for all API calls
- Frontend: dark theme (--bg, --surface, --accent CSS vars)
- Frontend: split-panel layout (list left, detail right)
- No frameworks — vanilla HTML/CSS/JS only
- 21 CFR Part 11 compliant: immutable audit trail, e-signature on reviews with printed name + timestamp
- ICH Q1A(R2) compliant: standard storage conditions, timepoints, testing requirements, significant change criteria
- ICH Q1B compliant: photostability study type support
- ICH Q1C compliant: support for new dosage forms and reduced testing
- ICH Q1D compliant: matrixing and bracketing designs for reduced testing
- ICH Q1E compliant: statistical shelf-life estimation, poolability assessment, regression analysis
- ICH Q5C compliant: biotechnological/biological product-specific stability requirements

## Reference files (copy patterns from)
- `docs/qc/lab.html` — layout, styling, split-panel pattern, filter bar, search, card styling
- `server/services/qc-lab.service.js` — service factory with AI features, prompt templates, result parsing
- `server/routes/qc-lab.js` — route pattern with auth guards, role-based access
- `server/lib/ids.js` — ID generator pattern
- `server/lib/audit.js` — audit logging
