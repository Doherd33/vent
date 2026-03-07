# Agent 5 — Cell Thaw & Revival
# Branch: feature/inoc-thaw
# Phase: 5 — Inoculation Suite
# Complexity: M (4 days)

## What to build
Cell thaw and revival protocol execution system. Manages the critical process of thawing working cell bank (WCB) vials for biologics manufacturing — the first step in the seed train that produces biologic drug substance. Tracks 37°C water bath timing (<2 min critical window per USP <1046> and industry standard), cryoprotectant (DMSO) removal by centrifugation or dilution, post-thaw viability assessment (≥70% threshold per ICH Q5D industry practice), seeding density calculations, and initial culture establishment. Links to Cell Bank module for vial withdrawal tracking and chain of custody documentation. The thaw event establishes Passage 0 (P0) of the production seed train, making it a critical control point for cell identity (ICH Q5B), genetic stability (ICH Q5D), and viral safety (ICH Q5A). Regulatory requirements span ICH Q5A/Q5B/Q5D, 21 CFR 211.100/211.188, 21 CFR Part 11, 21 CFR 610.12/610.18, EU GMP Annex 1 (2023) and Annex 2. Protocol execution follows a step-by-step wizard pattern with real-time timers, equipment readiness verification, two-person vial identity verification, and automated deviation triggering when critical parameters are exceeded. AI-native features provide real-time timer management with alerts at critical windows, viability threshold prediction based on cell line history, seeding density auto-calculation, historical performance analysis, optimal thaw parameter suggestion, and post-thaw growth curve prediction — differentiating Vent from incumbents (MasterControl, Veeva, MODA) that lack protocol-aware AI for cell thaw operations.

## Files to create
- `docs/inoc/cell-thaw.html` (frontend page)
- `server/services/thaw.service.js` (service layer)
- `server/routes/thaw.js` (API routes)

## Files to modify (additions only)
- `server/routes/admin.js` — add CREATE TABLE statements
- `server/index.js` — wire service + mount routes + add PAGE_MAP entry
- `server/lib/ids.js` — add ID generators

## Database Tables
Add to `server/routes/admin.js`:

### thaw_records
```sql
CREATE TABLE IF NOT EXISTS thaw_records (
  id                          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thaw_id                     TEXT UNIQUE NOT NULL,
  -- thaw_id: unique identifier THW-1000..9999
  cell_bank_id                TEXT NOT NULL,
  -- cell_bank_id: FK to cell_banks(bank_id) — source cell bank (MCB/WCB)
  vial_id                     TEXT DEFAULT '',
  -- vial_id: primary vial identifier from cell_bank_vials
  vial_ids                    JSONB DEFAULT '[]',
  -- vial_ids: array of vial IDs for multi-vial thaws (e.g. ["CBV-1234","CBV-1235"])
  transaction_id              TEXT DEFAULT '',
  -- transaction_id: FK to cell_bank_transactions — the approved withdrawal transaction
  cell_line                   TEXT NOT NULL,
  -- cell_line: inherited from source cell bank (e.g. "CHO-K1", "HEK293")
  clone_id                    TEXT DEFAULT '',
  -- clone_id: clone identifier inherited from source cell bank
  passage_number              INTEGER NOT NULL DEFAULT 0,
  -- passage_number: passage number at thaw — establishes P0 of the production seed train (ICH Q5D, Q5B)
  protocol_id                 TEXT DEFAULT '',
  -- protocol_id: reference to the thaw SOP document
  protocol_version            TEXT DEFAULT '',
  -- protocol_version: version of the thaw SOP used (21 CFR 211.100)
  batch_id                    TEXT DEFAULT '',
  -- batch_id: production batch number if this thaw is for a production campaign (21 CFR 211.188)
  status                      TEXT DEFAULT 'planned',
  -- status workflow: planned → in-progress → thaw-complete → wash-complete → seeded → viability-assessed → approved → failed → aborted
  -- planned: thaw scheduled, vial identified
  -- in-progress: operator has started the thaw protocol
  -- thaw-complete: vial removed from water bath, cells transferred to media
  -- wash-complete: DMSO removal step completed (centrifugation or dilution)
  -- seeded: cells seeded into culture vessel and placed in incubator
  -- viability-assessed: post-thaw cell count and viability completed
  -- approved: QA/MSAT review and approval complete (record locked)
  -- failed: thaw failed acceptance criteria (viability < threshold, contamination, etc.)
  -- aborted: thaw abandoned before completion (equipment failure, operator decision)
  operator                    TEXT NOT NULL,
  -- operator: person performing the thaw (user ID) — 21 CFR 211.188, ALCOA+
  verifier                    TEXT DEFAULT '',
  -- verifier: second person who verified vial identity and procedure — EU GMP Annex 2, two-person verification
  vial_out_of_storage_time    TIMESTAMPTZ,
  -- vial_out_of_storage_time: time vial was removed from cryogenic storage (ICH Q5D)
  thaw_start_time             TIMESTAMPTZ,
  -- thaw_start_time: time vial was placed in water bath / thaw device (21 CFR 211.188)
  thaw_end_time               TIMESTAMPTZ,
  -- thaw_end_time: time vial was removed from water bath / thaw device (21 CFR 211.188)
  thaw_duration_seconds       INTEGER DEFAULT 0,
  -- thaw_duration_seconds: computed thaw_end_time - thaw_start_time — CRITICAL: must be <= 120 seconds
  transfer_to_media_time      TIMESTAMPTZ,
  -- transfer_to_media_time: time cells were transferred to culture media
  incubation_start_time       TIMESTAMPTZ,
  -- incubation_start_time: time culture vessel placed in incubator (21 CFR 211.188)
  total_process_time_minutes  INTEGER DEFAULT 0,
  -- total_process_time_minutes: computed incubation_start_time - vial_out_of_storage_time
  target_thaw_temp            NUMERIC(4,1) DEFAULT 37.0,
  -- target_thaw_temp: target water bath temperature (°C) — standard is 37.0°C
  actual_thaw_temp            NUMERIC(4,1),
  -- actual_thaw_temp: actual measured water bath temperature at time of thaw (21 CFR 211.68)
  thaw_method                 TEXT DEFAULT 'water-bath',
  -- thaw_method values: water-bath, bead-bath, automated-device (ThawSTAR, CoolCell)
  water_bath_id               TEXT DEFAULT '',
  -- water_bath_id: equipment ID of thaw device (link to equipment logbook) — 21 CFR 211.68
  cryoprotectant_removal_method TEXT DEFAULT 'dilution',
  -- cryoprotectant_removal_method values: centrifugation (for sensitive cell lines), dilution (standard for CHO/HEK293), direct-seed (no removal — rare)
  wash_media                  TEXT DEFAULT '',
  -- wash_media: media used for DMSO removal / dilution (e.g. "CD CHO", "DMEM")
  wash_media_lot              TEXT DEFAULT '',
  -- wash_media_lot: lot number of wash media (21 CFR 211.188)
  wash_media_expiry           DATE,
  -- wash_media_expiry: expiry date of wash media (21 CFR 211.87)
  wash_volume_ml              NUMERIC(8,2),
  -- wash_volume_ml: volume of media used for dilution or wash
  dilution_ratio              TEXT DEFAULT '',
  -- dilution_ratio: dilution ratio if dilution method (e.g. "1:15") — DMSO must be diluted to < 1% v/v
  centrifuge_speed_g          INTEGER,
  -- centrifuge_speed_g: g-force if centrifugation method (typical: 200-300 x g)
  centrifuge_time_min         INTEGER,
  -- centrifuge_time_min: centrifugation duration in minutes (typical: 5-10 min)
  centrifuge_temp_c           NUMERIC(4,1),
  -- centrifuge_temp_c: centrifugation temperature (°C) — typically room temperature
  pre_thaw_cell_count         NUMERIC(12,0),
  -- pre_thaw_cell_count: expected cell count from vial label or cell bank historical data
  post_thaw_cell_count        NUMERIC(12,0),
  -- post_thaw_cell_count: total cell count after thaw (viable + dead) — 21 CFR 211.160
  post_thaw_viable_count      NUMERIC(12,0),
  -- post_thaw_viable_count: viable cell count after thaw — 21 CFR 211.160
  post_thaw_viability_pct     NUMERIC(5,2),
  -- post_thaw_viability_pct: viability percentage = (viable / total) x 100 — ICH Q5D
  post_thaw_vcd               NUMERIC(12,2),
  -- post_thaw_vcd: viable cell density (cells/mL) — 21 CFR 211.160
  viability_method            TEXT DEFAULT 'trypan-blue',
  -- viability_method values: trypan-blue (manual hemocytometer), vi-cell (automated), nucleocounter (automated), cedex (Cedex HiRes automated)
  viability_instrument_id     TEXT DEFAULT '',
  -- viability_instrument_id: equipment ID of cell counter (link to equipment logbook) — 21 CFR 211.68
  target_viability_pct        NUMERIC(5,2) DEFAULT 70.00,
  -- target_viability_pct: minimum acceptable viability threshold — 70% per ICH Q5D industry practice
  viability_pass              BOOLEAN,
  -- viability_pass: computed post_thaw_viability_pct >= target_viability_pct
  viability_delta_from_bank   NUMERIC(5,2),
  -- viability_delta_from_bank: difference from viability_at_bank on cell_banks record — flag if > 10% points
  seeding_density             NUMERIC(12,2),
  -- seeding_density: actual seeding density achieved (cells/mL or cells/cm^2)
  seeding_density_unit        TEXT DEFAULT 'cells-per-ml',
  -- seeding_density_unit values: cells-per-ml (suspension cultures), cells-per-cm2 (adherent cultures)
  target_seeding_density      NUMERIC(12,2),
  -- target_seeding_density: target from process SOP for this cell line
  seeding_volume_ml           NUMERIC(8,2),
  -- seeding_volume_ml: volume of cell suspension actually seeded into culture vessel
  vessel_type                 TEXT DEFAULT 't-flask-75',
  -- vessel_type values: t-flask-25, t-flask-75, t-flask-175, shake-flask-125, shake-flask-250, shake-flask-500, spinner-flask, wave-bag
  vessel_id                   TEXT DEFAULT '',
  -- vessel_id: culture vessel lot/ID if tracked per GMP traceability
  culture_volume_ml           NUMERIC(8,2),
  -- culture_volume_ml: total culture volume in vessel (media + cells)
  culture_media               TEXT DEFAULT '',
  -- culture_media: basal medium name for culture (e.g. "CD CHO", "EX-CELL 325") — 21 CFR 211.186
  culture_media_lot           TEXT DEFAULT '',
  -- culture_media_lot: culture media lot number — 21 CFR 211.188
  culture_media_expiry        DATE,
  -- culture_media_expiry: culture media expiry date — 21 CFR 211.87
  supplements                 JSONB DEFAULT '[]',
  -- supplements: array of supplements [{name, lot, expiry, concentration}] — 21 CFR 211.188
  incubator_id                TEXT DEFAULT '',
  -- incubator_id: equipment ID of incubator (link to equipment logbook) — 21 CFR 211.68
  incubator_temp              NUMERIC(4,1),
  -- incubator_temp: incubator temperature setpoint (°C) — typically 37.0°C
  co2_pct                     NUMERIC(4,1),
  -- co2_pct: CO2 percentage setpoint — typically 5.0%
  humidity_pct                NUMERIC(5,1),
  -- humidity_pct: humidity percentage (if humidified incubator) — typically > 85% RH
  shaker_rpm                  INTEGER,
  -- shaker_rpm: orbital shaker speed for shake flasks (typically 100-150 RPM for CHO)
  morphology_notes            TEXT DEFAULT '',
  -- morphology_notes: cell morphology observations (round, clumpy, debris, normal)
  appearance                  TEXT DEFAULT 'not-assessed',
  -- appearance values: normal, abnormal, not-assessed
  mycoplasma_check            BOOLEAN DEFAULT false,
  -- mycoplasma_check: whether mycoplasma sample was collected — ICH Q5D
  mycoplasma_sample_id        TEXT DEFAULT '',
  -- mycoplasma_sample_id: link to QC lab sample (FK -> qc_samples)
  sterility_check             BOOLEAN DEFAULT false,
  -- sterility_check: whether sterility sample was collected — 21 CFR 610.12
  sterility_sample_id         TEXT DEFAULT '',
  -- sterility_sample_id: link to QC lab sample (FK -> qc_samples)
  environmental_monitoring    JSONB DEFAULT '[]',
  -- environmental_monitoring: EM results during thaw [{type, location, result, limit}] — EU GMP Annex 1
  chain_of_custody            JSONB DEFAULT '[]',
  -- chain_of_custody: custody chain [{step, from, to, timestamp, verified_by}] — ICH Q5D, EU GMP Annex 2
  deviation_id                TEXT DEFAULT '',
  -- deviation_id: link to deviation record if any deviation occurred (FK -> deviations) — 21 CFR 211.100
  overall_result              TEXT DEFAULT 'pending',
  -- overall_result values: pending, pass, fail, conditional
  ai_seeding_calc             JSONB DEFAULT '{}',
  -- ai_seeding_calc: AI-calculated seeding parameters {target_density, required_volume, recommended_vessel, rationale}
  ai_viability_prediction     JSONB DEFAULT '{}',
  -- ai_viability_prediction: AI-predicted viability {predicted_pct, confidence, factors, cell_line_avg, recommendation}
  ai_risk_assessment          JSONB DEFAULT '{}',
  -- ai_risk_assessment: AI risk flags {equipment_risks, trending_concerns, recommendations}
  ai_growth_prediction        JSONB DEFAULT '{}',
  -- ai_growth_prediction: AI-predicted growth trajectory {day_1, day_2, day_3, expected_p1_date, confidence}
  ai_optimal_params           JSONB DEFAULT '{}',
  -- ai_optimal_params: AI-suggested optimal thaw parameters based on cell line and historical success
  e_signature                 JSONB DEFAULT '{}',
  -- e_signature: electronic signature data {signer, meaning, timestamp, method} — 21 CFR Part 11.10(k)
  notes                       TEXT DEFAULT '',
  approved_by                 TEXT DEFAULT '',
  -- approved_by: QA/MSAT reviewer who approved the thaw record — 21 CFR Part 11
  approved_at                 TIMESTAMPTZ,
  -- approved_at: timestamp of approval — record becomes immutable after approval
  reviewed_by                 TEXT DEFAULT '',
  -- reviewed_by: initial reviewer (may differ from approver)
  reviewed_at                 TIMESTAMPTZ,
  created_by                  TEXT NOT NULL DEFAULT 'system',
  created_at                  TIMESTAMPTZ DEFAULT now(),
  updated_at                  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_thaw_status ON thaw_records(status);
CREATE INDEX IF NOT EXISTS idx_thaw_cell_bank ON thaw_records(cell_bank_id);
CREATE INDEX IF NOT EXISTS idx_thaw_cell_line ON thaw_records(cell_line);
CREATE INDEX IF NOT EXISTS idx_thaw_operator ON thaw_records(operator);
CREATE INDEX IF NOT EXISTS idx_thaw_viability ON thaw_records(viability_pass);
CREATE INDEX IF NOT EXISTS idx_thaw_result ON thaw_records(overall_result);
CREATE INDEX IF NOT EXISTS idx_thaw_batch ON thaw_records(batch_id);
CREATE INDEX IF NOT EXISTS idx_thaw_created ON thaw_records(created_at);
ALTER TABLE thaw_records ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'thaw_records_all') THEN
    CREATE POLICY thaw_records_all ON thaw_records FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;
```

### thaw_protocol_steps
```sql
CREATE TABLE IF NOT EXISTS thaw_protocol_steps (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  step_id                 TEXT UNIQUE NOT NULL,
  -- step_id: unique identifier THWS-1000..9999
  thaw_id                 TEXT NOT NULL REFERENCES thaw_records(thaw_id),
  -- thaw_id: FK to parent thaw record
  step_number             INTEGER NOT NULL DEFAULT 0,
  -- step_number: execution order within the protocol (1-based)
  step_name               TEXT NOT NULL,
  -- step_name: human-readable step name (e.g. "Vial Identity Verification", "Water Bath Thaw", "Cell Count")
  description             TEXT DEFAULT '',
  -- description: detailed instructions for this step
  step_type               TEXT NOT NULL DEFAULT 'preparation',
  -- step_type values: preparation (pre-thaw checks), thaw (water bath immersion), wash (DMSO removal), count (cell count/viability), seed (vessel seeding), incubate (incubator placement), verify (two-person verification), document (record completion)
  status                  TEXT DEFAULT 'pending',
  -- status values: pending (not started), in-progress (currently executing), completed (successfully finished), skipped (not applicable for this thaw), failed (step failed acceptance criteria)
  target_duration_seconds INTEGER DEFAULT 0,
  -- target_duration_seconds: expected duration for timed steps (e.g. 120 seconds for water bath thaw)
  actual_duration_seconds INTEGER DEFAULT 0,
  -- actual_duration_seconds: measured duration from timer_start to timer_end
  timer_start             TIMESTAMPTZ,
  -- timer_start: timestamp when step timer was started (for timed steps)
  timer_end               TIMESTAMPTZ,
  -- timer_end: timestamp when step timer was stopped
  critical_step           BOOLEAN DEFAULT false,
  -- critical_step: true for steps with critical timing or acceptance criteria (e.g. water bath thaw, viability check)
  critical_limit          TEXT DEFAULT '',
  -- critical_limit: acceptance criteria for critical steps (e.g. "<= 120 seconds", ">= 70% viability")
  verification_required   BOOLEAN DEFAULT false,
  -- verification_required: true for steps requiring two-person verification (e.g. vial identity check)
  verified_by             TEXT DEFAULT '',
  -- verified_by: second person who verified this step — EU GMP Annex 2
  verified_at             TIMESTAMPTZ,
  temperature_reading     NUMERIC(4,1),
  -- temperature_reading: temperature measurement taken during this step (°C)
  equipment_id            TEXT DEFAULT '',
  -- equipment_id: equipment used for this step (link to equipment logbook)
  data_captured           JSONB DEFAULT '{}',
  -- data_captured: step-specific data as key-value pairs (flexible per step type)
  deviation_triggered     BOOLEAN DEFAULT false,
  -- deviation_triggered: true if this step triggered an automatic deviation
  notes                   TEXT DEFAULT '',
  completed_by            TEXT DEFAULT '',
  completed_at            TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_thaw_steps_thaw ON thaw_protocol_steps(thaw_id);
CREATE INDEX IF NOT EXISTS idx_thaw_steps_status ON thaw_protocol_steps(status);
CREATE INDEX IF NOT EXISTS idx_thaw_steps_type ON thaw_protocol_steps(step_type);
CREATE INDEX IF NOT EXISTS idx_thaw_steps_critical ON thaw_protocol_steps(critical_step);
ALTER TABLE thaw_protocol_steps ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'thaw_protocol_steps_all') THEN
    CREATE POLICY thaw_protocol_steps_all ON thaw_protocol_steps FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;
```

### thaw_quality_checks
```sql
CREATE TABLE IF NOT EXISTS thaw_quality_checks (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  check_id        TEXT UNIQUE NOT NULL,
  -- check_id: unique identifier THWC-1000..9999
  thaw_id         TEXT NOT NULL REFERENCES thaw_records(thaw_id),
  -- thaw_id: FK to parent thaw record
  check_type      TEXT NOT NULL,
  -- check_type values: viability (trypan blue / automated count), sterility (culture-based sterility test), mycoplasma (PCR or culture), identity (cell line identity confirmation), morphology (microscopic assessment), growth-rate (post-thaw growth kinetics at 24/48/72h), metabolite (glucose/lactate/pH monitoring)
  check_time      TEXT NOT NULL DEFAULT 'immediate',
  -- check_time values: immediate (at thaw), 4h (adherent attachment check), 24h, 48h, 72h, day-7 (first passage)
  scheduled_at    TIMESTAMPTZ,
  -- scheduled_at: when this check is due (auto-calculated from thaw time + check_time offset)
  performed_at    TIMESTAMPTZ,
  -- performed_at: when the check was actually performed
  result_value    TEXT DEFAULT '',
  -- result_value: measured value (e.g. "85.3" for viability %, "2.5e6" for cell count)
  result_unit     TEXT DEFAULT '',
  -- result_unit: unit of measurement (e.g. "%", "cells/mL", "pass/fail")
  spec_low        TEXT DEFAULT '',
  -- spec_low: lower specification limit (e.g. "70" for viability %)
  spec_high       TEXT DEFAULT '',
  -- spec_high: upper specification limit
  pass            BOOLEAN,
  -- pass: true if result_value is within [spec_low, spec_high]
  method          TEXT DEFAULT '',
  -- method: analytical method used (e.g. "trypan blue exclusion", "rapid PCR", "culture-based")
  instrument_id   TEXT DEFAULT '',
  -- instrument_id: equipment ID of instrument used (link to equipment logbook) — 21 CFR 211.68
  analyst         TEXT DEFAULT '',
  -- analyst: person who performed the quality check
  morphology_score TEXT DEFAULT '',
  -- morphology_score: for morphology checks — normal, abnormal, clumpy, debris, mixed
  growth_rate     NUMERIC(8,4),
  -- growth_rate: for growth-rate checks — specific growth rate (µ, per hour) or doubling time (hours)
  cell_count      NUMERIC(12,0),
  -- cell_count: for growth-rate checks — viable cell count at this timepoint
  viability_pct   NUMERIC(5,2),
  -- viability_pct: for growth-rate checks — viability at this timepoint
  photo_url       TEXT DEFAULT '',
  -- photo_url: microscopy image URL for morphology checks
  deviation_id    TEXT DEFAULT '',
  -- deviation_id: link to deviation if check failed — 21 CFR 211.100
  notes           TEXT DEFAULT '',
  created_by      TEXT NOT NULL DEFAULT 'system',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_thaw_checks_thaw ON thaw_quality_checks(thaw_id);
CREATE INDEX IF NOT EXISTS idx_thaw_checks_type ON thaw_quality_checks(check_type);
CREATE INDEX IF NOT EXISTS idx_thaw_checks_time ON thaw_quality_checks(check_time);
CREATE INDEX IF NOT EXISTS idx_thaw_checks_pass ON thaw_quality_checks(pass);
CREATE INDEX IF NOT EXISTS idx_thaw_checks_scheduled ON thaw_quality_checks(scheduled_at);
ALTER TABLE thaw_quality_checks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'thaw_quality_checks_all') THEN
    CREATE POLICY thaw_quality_checks_all ON thaw_quality_checks FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;
```

## ID Generators
Add to `server/lib/ids.js`:
- `thawId()` → `THW-1000…9999`
- `thawStepId()` → `THWS-1000…9999`
- `thawCheckId()` → `THWC-1000…9999`

## API Endpoints

### Core CRUD
- `POST /inoc/thaw` — create a new thaw record. Auto-generates THW-ID. Validates that source cell bank exists, is qualified, and is within expiry. Validates that vial exists and has an approved withdrawal transaction. Auto-populates cell_line, clone_id, passage_number from the source cell bank/vial. Creates default protocol steps based on cell line and SOP. Sets status = 'planned'.
- `GET /inoc/thaw` — list all thaw records. Filter by status, cell_line, cell_bank_id, operator, viability_pass, overall_result, date range, batch_id.
- `GET /inoc/thaw/:thawId` — single thaw record with protocol steps and quality checks. Includes source cell bank summary and vial details.
- `PUT /inoc/thaw/:thawId` — update thaw record fields. Blocked if status = 'approved' (record immutable after approval). Auto-calculates thaw_duration_seconds, total_process_time_minutes, viability_pass, viability_delta_from_bank on relevant field updates.

### Protocol Step Execution
- `POST /inoc/thaw/:thawId/steps/:stepId/start` — start a protocol step. Sets status = 'in-progress', records timer_start. For the water bath thaw step, initiates the critical 2-minute countdown.
- `POST /inoc/thaw/:thawId/steps/:stepId/complete` — complete a protocol step. Sets status = 'completed', records timer_end, calculates actual_duration_seconds. For critical steps: auto-checks against critical_limit. If exceeded (e.g. thaw > 120 seconds), sets deviation_triggered = true and prompts deviation creation. Captures step-specific data in data_captured JSONB.
- `POST /inoc/thaw/:thawId/steps/:stepId/verify` — two-person verification of a step. Sets verified_by and verified_at. Required before step can be marked complete for verification_required steps.
- `POST /inoc/thaw/:thawId/steps/:stepId/skip` — skip a non-critical step with justification. Sets status = 'skipped'. Blocked for critical steps.
- `POST /inoc/thaw/:thawId/steps/:stepId/fail` — mark step as failed with reason. Sets status = 'failed'. Triggers deviation creation for critical steps.

### Workflow Transitions
- `POST /inoc/thaw/:thawId/start` — begin thaw execution (planned → in-progress). Records vial_out_of_storage_time. Validates all pre-thaw checks: equipment readiness (water bath calibrated, BSC certified, incubator qualified, cell counter calibrated), cell bank qualification status, vial availability, operator training currency.
- `POST /inoc/thaw/:thawId/complete-thaw` — mark thaw step complete (in-progress → thaw-complete). Records thaw_end_time, calculates thaw_duration_seconds. Auto-triggers deviation if thaw_duration_seconds > 120.
- `POST /inoc/thaw/:thawId/complete-wash` — mark DMSO removal complete (thaw-complete → wash-complete). Records wash parameters.
- `POST /inoc/thaw/:thawId/seed` — mark culture seeding complete (wash-complete → seeded). Records seeding density, vessel info, incubation conditions. Records incubation_start_time. Auto-schedules post-thaw quality checks (24h, 48h, 72h).
- `POST /inoc/thaw/:thawId/assess` — record viability assessment (seeded → viability-assessed). Records post-thaw cell count, viability, VCD. Auto-calculates viability_pass, viability_delta_from_bank, overall_result. If viability < target: auto-triggers deviation.
- `POST /inoc/thaw/:thawId/approve` — QA/MSAT approval (viability-assessed → approved). Captures e-signature with signer, meaning, timestamp per 21 CFR Part 11.10(k). Record becomes immutable. Blocked if any critical protocol steps are incomplete or failed without deviation.
- `POST /inoc/thaw/:thawId/fail` — mark thaw as failed (any status → failed). Records failure reason. Triggers deviation creation.
- `POST /inoc/thaw/:thawId/abort` — abort thaw (any status except approved → aborted). Records abort reason and cleanup actions.

### Vial Withdrawal Integration
- `POST /inoc/thaw/:thawId/link-withdrawal` — link thaw record to an existing cell bank withdrawal transaction. Validates transaction exists and is approved. Pulls vial details into thaw record.
- `GET /inoc/thaw/:thawId/vial-info` — get source vial and cell bank details for this thaw (cell bank qualification status, vial freeze date, passage number, banking viability, available vial count).

### Quality Checks
- `POST /inoc/thaw/:thawId/checks` — add a quality check record (viability, sterility, mycoplasma, identity, morphology, growth-rate, metabolite). Sets scheduled_at based on check_time offset from thaw time.
- `GET /inoc/thaw/:thawId/checks` — list all quality checks for a thaw record, ordered by check_time.
- `PUT /inoc/thaw/:thawId/checks/:checkId` — update quality check with results. Auto-calculates pass based on result_value vs spec_low/spec_high. If fail: flags for investigation.
- `GET /inoc/thaw/checks/overdue` — list all quality checks past their scheduled_at without results (for QC dashboard).

### Chain of Custody
- `POST /inoc/thaw/:thawId/custody` — add a chain of custody entry (step, from, to, timestamp, verified_by). Appends to chain_of_custody JSONB array.
- `GET /inoc/thaw/:thawId/custody` — get full chain of custody for a thaw record.

### Dashboard & Analytics
- `GET /inoc/thaw/stats` — dashboard stats: total thaws by status, average viability, viability pass rate, average thaw duration, thaws by cell line, thaws by operator, thaws this month, failed thaws, thaws with deviations, average process time, overdue quality checks count.
- `GET /inoc/thaw/trends` — viability trend data: average viability by week/month, by cell line, by operator. Thaw duration trends. Seeding density trends. For trend charts on the dashboard.

### AI Endpoints
- `POST /inoc/thaw/:thawId/ai/timer` — AI: real-time timer management. Returns countdown status, alerts, and recommendations based on elapsed time. Generates alerts at critical windows (90 seconds = warning, 120 seconds = critical, >120 seconds = deviation).
- `POST /inoc/thaw/:thawId/ai/viability-predict` — AI: predict expected post-thaw viability based on cell line historical data, vial age (time since banking), storage conditions, thaw duration, and operator performance history. Returns predicted viability %, confidence interval, and factors affecting prediction.
- `POST /inoc/thaw/:thawId/ai/seeding-calc` — AI: calculate optimal seeding density based on post-thaw viable cell count, target vessel type, cell line-specific growth rate, and historical seed train data. Returns: required cell suspension volume, recommended vessel, target density, rationale, and alternative options if cells are insufficient for target density.
- `POST /inoc/thaw/:thawId/ai/historical` — AI: compare this thaw to all historical thaws for the same cell line. Returns: average viability for this cell line, this thaw's percentile rank, anomaly flags (viability significantly lower than average, thaw duration longer than average), trending analysis (is viability declining over time for this cell bank?), and actionable recommendations.
- `POST /inoc/thaw/:thawId/ai/optimal-params` — AI: suggest optimal thaw parameters for this cell line based on historical success rates. Analyses which thaw method (water bath vs bead bath), DMSO removal method (dilution vs centrifugation), vessel type, and seeding density produced the best viability and growth outcomes. Returns parameter recommendations with supporting data.
- `POST /inoc/thaw/:thawId/ai/growth-predict` — AI: predict expected growth trajectory post-thaw. Based on seeding density, cell line growth characteristics, and historical post-thaw recovery data, predict: expected VCD at 24h/48h/72h, expected time to first passage (P1), recommended observation schedule, and warning flags if growth is expected to be slow based on low seeding density or viability.

## Role Access
- operator (create thaw records, execute protocol steps, enter cell count / viability results, add quality check results, add chain of custody entries)
- msat (all operator permissions + review and approve thaw records, access AI features, manage protocol templates, view trends and analytics)
- qa (view all thaw records, review deviations from thaws, approve thaw records, view quality check results, access analytics)
- admin (all operations)

### Approval Matrix
- **Standard thaws:** MSAT or QA reviewer approval (single approver sufficient)
- **Failed thaws (viability < target):** QA approval required + linked deviation must be opened
- **Thaws with deviations (thaw time > 2 min, equipment OOS):** QA approval required + deviation must be investigated before culture can progress to P1

## AI Features (use Anthropic Claude via service dependency)

### Build Now (Round 4)

- **Timer management with critical window alerts** — real-time countdown timer for the water bath thaw step. The timer is started when the operator begins the thaw step and provides visual and audible alert cues: green zone (0-90 seconds, normal), amber zone (90-120 seconds, approaching limit), red zone (>120 seconds, critical limit exceeded). If thaw exceeds 120 seconds, the system auto-flags for deviation with pre-populated context: "Water bath thaw duration exceeded 2-minute critical limit. Actual duration: {X} seconds. Extended DMSO exposure at 37°C increases cytotoxicity risk per USP <1046>." The AI analyses the specific overshoot duration against cell line sensitivity data and predicts the expected viability impact: "Based on 15 historical thaws of CHO-K1 that exceeded 2 minutes, each additional 30 seconds beyond the limit correlated with a 3-5% reduction in post-thaw viability."

- **Viability threshold prediction** — before and during the thaw, predict whether the post-thaw viability will meet the ≥70% threshold. The prediction model considers: (1) cell line historical viability data from all previous thaws of this cell line, (2) vial age — time since the vial was banked (older vials tend to have lower viability due to slow ice crystal damage during storage), (3) storage conditions — LN2 vapour phase vs liquid phase, any temperature excursion events, (4) thaw duration — if the thaw took longer than 2 minutes, predict the viability impact, (5) operator performance — historical pass rates for this operator, (6) banking viability — the viability recorded when the vial was originally frozen. Return a prediction with confidence interval: "Predicted viability: 82% ± 5% (95% CI). Based on 23 historical thaws of CHO-K1 WCB-003, average viability is 84.2%. This vial was banked 14 months ago; age-related decline is minimal for this cell line."

- **Seeding density auto-calculation** — after the post-thaw cell count and viability are entered, automatically calculate the optimal seeding density for the target culture vessel. The calculation considers: (1) post-thaw viable cell count, (2) target seeding density from the cell line's process SOP, (3) target culture vessel and its capacity, (4) historical growth rate data for this cell line at P0. If the viable cell count is insufficient to achieve the target density in the planned vessel, recommend alternatives: "Post-thaw viable count: 3.2 × 10⁶ cells. Target density for T-175: 5.0 × 10⁴ cells/cm². Required: 8.75 × 10⁶ cells. INSUFFICIENT — recommend T-75 (required: 3.75 × 10⁶ cells) or reduce target density to 1.83 × 10⁴ cells/cm² in T-175." Store the calculation and recommendation in ai_seeding_calc JSONB.

- **Historical performance analysis** — compare the current thaw to all historical thaws for the same cell line and cell bank. Identify: (1) where this thaw's viability falls in the distribution (percentile rank), (2) whether viability is trending down for this cell bank over time (indicating potential storage degradation), (3) whether the thaw duration was within the normal range for this operator and equipment, (4) any anomalies compared to the expected performance envelope. If the viability is significantly lower than the historical average (>1 standard deviation below mean), flag for investigation: "Post-thaw viability of 72.1% is below the historical mean of 84.2% ± 4.3% for CHO-K1. This is 2.8 standard deviations below the mean. Recommend: (1) review storage conditions for this cell bank, (2) check water bath calibration records, (3) consider scheduling a stability study for remaining vials."

- **Optimal thaw parameter suggestion** — for a given cell line, analyse all historical thaw records to determine which parameter combinations produce the best outcomes (highest viability, shortest time to P1, best growth kinetics). Consider: thaw method (water bath vs bead bath), DMSO removal method (dilution vs centrifugation), dilution ratio, culture vessel type, seeding density, media formulation. Return actionable recommendations: "Based on 45 historical thaws of CHO-K1, optimal parameters are: bead bath thaw (avg viability 86.3% vs 83.1% for water bath), direct dilution at 1:20 ratio (avg viability 85.7% vs 81.2% for centrifugation), seeding into 125 mL shake flask at 0.3 × 10⁶ cells/mL (fastest time to P1: 3.2 days vs 4.1 days at 0.2 × 10⁶)."

- **Post-thaw growth curve prediction** — after seeding, predict the expected growth trajectory for the first 72 hours based on the actual seeding density, cell line growth characteristics, and historical post-thaw recovery data. Predict: expected VCD and viability at 24h, 48h, and 72h; expected time to reach target density for first passage (P1); recommended observation schedule based on predicted growth rate. Flag concerns: "Seeding density of 0.15 × 10⁶ cells/mL is below the optimal range of 0.2-0.5 × 10⁶ for CHO-K1. Predicted time to P1: 5.2 days (vs normal 3.0-3.5 days). Recommend increasing observation frequency — check at 24h and 48h to confirm growth."

### Future Enhancements (not Round 4)
- **Automated thaw device integration** — direct data feed from ThawSTAR or CoolCell automated thaw devices, eliminating manual time recording
- **Image-based morphology AI** — machine vision analysis of microscopy images for automated morphology scoring
- **Predictive cell bank depletion** — forecast when cell banks will be depleted based on thaw frequency and plan re-banking
- **Cross-module growth tracking** — link thaw record to downstream passage tracker for complete seed train visibility
- **Natural language querying** — "Show me all thaws of CHO-K1 in the last 3 months with viability below 80%" via the Vent query engine
- **Environmental monitoring integration** — auto-pull EM results from the facility monitoring system during the thaw window

## Dependencies
- Cell Bank Management (live R3) — source of cell banks, vials, and withdrawal transactions. The thaw module reads cell bank qualification status, vial inventory, and creates/links to withdrawal transactions.
- Equipment Logbook (live R1) — equipment readiness verification. Query water bath, BSC, incubator, and cell counter calibration/qualification status.
- Deviation Manager (live R1) — auto-create deviations when thaw parameters exceed limits (thaw time > 2 min, viability < 70%).
- Incubator Monitor (live R1) — verify incubator qualification and current conditions before placement.
- Training Matrix (live R1) — verify operator is trained on thaw SOP before allowing execution.

## Wiring in server/index.js
```js
// Require at top
const thawRoutes = require('./routes/thaw');
const { makeThawService } = require('./services/thaw.service');

// Instantiate service
const thawService = makeThawService({ supabase, auditLog, anthropic });

// Add to PAGE_MAP
'thaw.html': 'inoc/cell-thaw.html',

// Mount routes
thawRoutes(app, { auth: requireAuth, thawService });
```

## Frontend Page: docs/inoc/cell-thaw.html

### Layout
Split-panel: list (left) + detail (right), matching `docs/inoc/cell-banks.html`.

### Features
1. **Thaw Record List** (left panel)
   - Filterable by status (planned, in-progress, thaw-complete, wash-complete, seeded, viability-assessed, approved, failed, aborted), cell line, cell bank, operator, viability pass/fail, overall result (pass, fail, conditional), date range
   - Search by THW ID, cell line, operator, batch ID
   - Status badges with workflow stage colors:
     - planned = grey, in-progress = blue (pulsing), thaw-complete = amber, wash-complete = amber, seeded = teal, viability-assessed = green, approved = green (solid), failed = red, aborted = dark red
   - Viability indicator: green badge (≥85%), amber badge (70-85%), red badge (<70%)
   - Active thaw indicator: pulsing blue border for in-progress thaws (operator is currently executing)
   - Sort by: created date, status, viability, cell line, operator
   - Quick action buttons: "New Thaw" at top of list

2. **Thaw Protocol Execution View** (right panel — primary view during active thaw)
   - Header: THW ID, cell line, passage number (P0), status badge, operator, verifier
   - Source information banner: cell bank ID (clickable link to cell bank detail), vial ID, banking viability, freeze date, qualification status indicator
   - **Step-by-step protocol wizard:**
     - Vertical step list showing all protocol steps in order
     - Current step highlighted with active styling and expanded instructions
     - Completed steps show green checkmarks with timestamps and duration
     - Failed steps show red X with deviation link
     - Skipped steps show grey dash
     - Each step card shows: step number, name, description, step type badge, critical step indicator (red border), verification required indicator
     - Step actions: "Start" button (starts timer if timed step), "Complete" button (stops timer, captures data), "Verify" button (for two-person steps), "Skip" button (non-critical only), "Fail" button
   - **Default protocol steps (auto-created on thaw record creation):**
     1. Vial Identity Verification (verify) — two-person check of vial ID, cell line, passage number
     2. Equipment Readiness Check (preparation) — verify water bath temp, BSC certification, incubator qualification, cell counter calibration
     3. Media Preparation (preparation) — verify media type, lot, expiry, pre-warming
     4. Chain of Custody (verify) — document handoff from storage to production
     5. Water Bath Thaw (thaw) — CRITICAL: 120-second timer, temperature recording
     6. Transfer to BSC (preparation) — wipe vial, move to BSC
     7. Cryoprotectant Removal (wash) — dilution or centrifugation per method
     8. Cell Count & Viability (count) — CRITICAL: must meet ≥70% threshold
     9. Seeding Density Calculation (document) — AI-assisted calculation
     10. Culture Vessel Setup (seed) — label vessel, transfer cells, record volumes
     11. Incubator Placement (incubate) — place in incubator, record conditions
     12. Record Completion (document) — final review, notes, submit for approval

3. **Timer Panel** (embedded in step wizard, visible during timed steps)
   - Large digital countdown display (MM:SS format)
   - Color-coded background: green (0-90s), amber (90-120s), red (>120s)
   - Start / Stop / Reset buttons
   - Audio alert at 90 seconds (warning tone)
   - Audio alert at 120 seconds (alarm tone)
   - If timer exceeds 120 seconds: red flash, deviation banner appears with auto-populated deviation context
   - Elapsed time persisted to server on stop

4. **Viability Calculator** (embedded in Cell Count step)
   - Input fields: total cell count, viable cell count (or direct viability % from automated counter)
   - Auto-calculated: viability %, VCD (cells/mL based on volume)
   - Comparison to banking viability with delta display
   - Pass/fail indicator against target threshold (default 70%)
   - If fail: red banner with "Deviation Required" prompt and pre-populated deviation context
   - Historical viability sparkline for this cell line (last 10 thaws)

5. **Seeding Density Calculator** (embedded in Seeding step)
   - Input fields: target density, vessel type, culture volume
   - Auto-calculated: required volume of cell suspension, actual seeding density
   - AI "Calculate Optimal" button — runs ai/seeding-calc and shows recommendation
   - Vessel recommendation if cells insufficient for planned vessel
   - Formula display showing the calculation (transparent to operator)

6. **Thaw Detail View** (right panel — view for completed/approved thaws)
   - Header: THW ID, cell line, passage number, status badge, overall result badge, viability badge
   - **Timing summary:** vial out of storage → thaw start → thaw end (duration) → transfer → incubation start (total process time). Visual timeline with duration bars.
   - **Thaw parameters:** method, device, temperature, DMSO removal method + parameters
   - **Post-thaw results:** cell count, viability %, VCD, viability pass/fail, delta from banking
   - **Seeding:** density, vessel type, culture volume, media + lot
   - **Incubation:** incubator ID, temp, CO2, humidity, shaker RPM
   - **Protocol steps timeline:** accordion list of all steps with timestamps, durations, data, verifications
   - **Quality checks section:** table of quality checks (immediate, 24h, 48h, 72h) with results, pass/fail, linked deviations
   - **Chain of custody:** visual chain showing each handoff step
   - **Linked records:** cell bank (clickable), vial, withdrawal transaction, deviation (if any), batch (if assigned)
   - **AI Results panels:** viability prediction, seeding calculation, historical comparison, growth prediction, optimal parameters
   - **Approval section:** reviewer name, approval timestamp, e-signature display (signer, meaning, timestamp per Part 11), immutability notice
   - **Audit trail timeline:** immutable log of all actions with timestamp, user, action, and before/after data (21 CFR Part 11.10(e))

7. **Create Thaw Modal**
   - Cell bank selector (dropdown filtered to qualified, non-expired banks)
   - Vial selector (dropdown filtered to available vials for selected bank, ordered by FIFO)
   - FIFO override: if operator selects a non-FIFO vial, require justification text
   - Auto-populated fields (from cell bank/vial): cell line, clone ID, passage number, banking viability
   - Linked withdrawal transaction selector (dropdown of approved withdrawals for this bank, or "Create New Withdrawal" option)
   - Operator (auto-filled from current user)
   - Verifier selector (dropdown of qualified operators, excluding current user)
   - Thaw method dropdown (water-bath, bead-bath, automated-device)
   - DMSO removal method dropdown (dilution, centrifugation, direct-seed)
   - Protocol/SOP reference and version
   - Batch ID (optional — if for production campaign)
   - Target viability threshold (default 70%, editable)
   - Notes field

8. **Stats Dashboard** (top of page)
   - Total thaws by status (clickable counts to filter list)
   - Viability pass rate (this month / all time) — with trend arrow
   - Average post-thaw viability (this month) — with comparison to previous month
   - Average thaw duration (seconds) — with warning if trending above 100s
   - Failed thaws this month — count with alert if > 0
   - Active thaws (in-progress) — count with operator names
   - Overdue quality checks — count with alert badge
   - Thaws by cell line (mini bar chart)

9. **Post-Thaw Monitoring Timeline** (sub-section in detail view)
   - Visual timeline showing scheduled quality checks: immediate, 4h (adherent only), 24h, 48h, 72h, day-7
   - Each check shows: scheduled time, actual time (if performed), result, pass/fail
   - Overdue checks highlighted in red with alert icon
   - Growth curve chart: viability and VCD at each timepoint (if growth-rate checks recorded)
   - Expected vs actual comparison using AI growth prediction

### Required imports
```html
<link rel="stylesheet" href="../shared/styles.css">
<script src="../shared/nav.js"></script>
<script src="../shared/i18n.js"></script>
<script src="../shared/dev-progress.js"></script>
```

Use `authFetch()` for all API calls. Use CSS variables from shared/styles.css (dark theme).

## Architecture Rules
- Service factory pattern: `module.exports = { makeThawService }`
- Use `requireAuth` on all routes
- Use `requireRole('operator', 'msat')` on create/execute routes (operators execute thaws, MSAT manages)
- Use `requireRole('qa', 'msat')` on approval routes (QA or MSAT can approve)
- Use `requireRole('qa')` on deviation-linked routes (QA must review failed thaws)
- Use `auditLog()` for all create/update/delete/transition/approve operations — every state change must be logged
- Audit trail entries must include: action, userId, timestamp, and the full before/after state diff (21 CFR Part 11.10(e))
- E-signatures on approvals must capture: printed name (from user profile), timestamp, and signature meaning (review/approval) per 21 CFR Part 11.10(k)
- Auto-calculate `thaw_duration_seconds` = thaw_end_time - thaw_start_time on every thaw_end_time update
- Auto-calculate `total_process_time_minutes` = incubation_start_time - vial_out_of_storage_time on incubation_start_time update
- Auto-calculate `viability_pass` = (post_thaw_viability_pct >= target_viability_pct) on viability update
- Auto-calculate `viability_delta_from_bank` = post_thaw_viability_pct - banking viability from cell_banks record
- Auto-set `overall_result` = 'pass' if viability_pass is true and no critical step failures; 'fail' if viability_pass is false; 'conditional' if non-critical deviations exist
- Auto-trigger deviation creation when: thaw_duration_seconds > 120, post_thaw_viability_pct < target_viability_pct, equipment found out of calibration during readiness check, viability_delta_from_bank > 10 percentage points
- Block approval (status → approved) if: any critical protocol steps are incomplete or failed without linked deviation, viability assessment not completed, chain of custody incomplete
- Block thaw start (planned → in-progress) if: source cell bank is not qualified, vial has no approved withdrawal transaction, operator is not trained on thaw SOP (check training matrix), any required equipment is out of calibration
- Record becomes immutable after approval — no further edits permitted (return 403)
- FIFO enforcement: if non-FIFO vial selected, require justification recorded in audit trail
- Two-person verification: verifier must be a different user from operator
- Frontend: `authFetch()` for all API calls
- Frontend: dark theme (--bg, --surface, --accent CSS vars from shared/styles.css)
- Frontend: split-panel layout (list left, detail right)
- No frameworks — vanilla HTML/CSS/JS only
- 21 CFR Part 11 compliant: immutable audit trail, e-signature on approvals with printed name + timestamp + meaning, access controls, data integrity (ALCOA+)
- ICH Q5D compliant: defined thaw procedure, post-thaw viability assessment, complete chain of custody, passage number tracking
- ICH Q5A compliant: cell bank qualification verification before thaw, raw material lot tracking, culture conditions documentation
- ICH Q5B compliant: cell line identity verification at thaw, passage number tracking for genetic stability
- EU GMP Annex 2 compliant: restricted access, two-person verification, documented chain of custody
- EU GMP Annex 1 compliant: environmental monitoring fields, contamination control strategy support

## Reference files (copy patterns from)
- `docs/inoc/cell-banks.html` — layout, styling, split-panel pattern, inoculation suite design
- `server/services/cell-bank.service.js` — service factory with AI features, cell bank domain knowledge
- `server/routes/cell-bank.js` — route pattern with auth guards, inoculation suite endpoint style
- `server/lib/ids.js` — ID generator pattern
- `server/lib/audit.js` — audit logging
- `docs/qa/deviations.html` — deviation linking pattern
