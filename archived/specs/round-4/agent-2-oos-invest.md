# Agent 2 — OOS Investigation
# Branch: feature/oos-invest
# Phase: 3 — Quality Control Lab
# Complexity: L (6 days)

## What to build
FDA-mandated two-phase Out-of-Specification (OOS) investigation system for GMP biologics manufacturing. Every OOS test result must trigger a formal investigation per FDA Guidance for Industry "Investigating Out-of-Specification (OOS) Test Results for Pharmaceutical Production" (October 2006) and the landmark *United States v. Barr Laboratories* (812 F. Supp. 458, D.N.J. 1993) decision. The module enforces a structured two-phase investigation model: Phase I is a laboratory investigation (completed within 1 business day) with a mandatory 10-item checklist to determine whether an assignable laboratory error caused the OOS result. If Phase I does not identify a documented assignable cause, the investigation must escalate to Phase II — a full-scale manufacturing investigation (completed within 30 calendar days) involving cross-functional review, root cause analysis, retesting/resampling protocols, batch impact assessment per 21 CFR 211.192, and mandatory CAPA linkage before closure. The module tracks the entire investigation lifecycle from OOS detection through final disposition (lab-error-invalidated, confirmed-oos, or inconclusive-oos-stands), with enforced timelines, mandatory escalation triggers, timeline extension workflows, and cross-batch impact analysis. Integrates with the live QC Lab module (qc_samples FK), Deviation Manager (linked deviations), and CAPA Tracker (mandatory CAPA linkage for Phase II closures). AI features provide root cause suggestion from historical data, cross-batch impact identification, historical OOS trending, Phase II prediction from Phase I findings, timeline enforcement alerts, and CAPA scope suggestion — differentiating Vent from incumbents (Veeva QMS, MasterControl, TrackWise, LabWare) that lack AI-native OOS investigation capabilities and charge $100K+ annually with 6-12 month implementations.

## Files to create
- `docs/qc/oos.html` (frontend page)
- `server/services/oos.service.js` (service layer)
- `server/routes/oos.js` (API routes)

## Files to modify (additions only)
- `server/routes/admin.js` — add CREATE TABLE statements
- `server/index.js` — wire service + mount routes + add PAGE_MAP entry
- `server/lib/ids.js` — add ID generators

## Database Tables
Add to `server/routes/admin.js`:

### oos_investigations
```sql
CREATE TABLE IF NOT EXISTS oos_investigations (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  oos_id                  TEXT UNIQUE NOT NULL,
  sample_id               TEXT NOT NULL REFERENCES qc_samples(sample_id),
  -- sample_id: FK to the originating QC sample record
  result_id               TEXT DEFAULT '',
  -- result_id: FK to the specific qc_results record that triggered the OOS flag (QCR-XXXX)
  test_id                 TEXT DEFAULT '',
  -- test_id: FK to the qc_tests record (QCT-XXXX)
  test_method             TEXT NOT NULL DEFAULT '',
  -- test_method: analytical method used (e.g. 'HPLC-Potency', 'USP <85> BET', 'SEC-Aggregation')
  test_method_version     TEXT DEFAULT '',
  -- test_method_version: specific version of the method SOP
  test_parameter          TEXT NOT NULL DEFAULT '',
  -- test_parameter: the specific parameter tested (e.g. 'potency', 'endotoxin', 'aggregation', 'pH')
  spec_limit_low          NUMERIC,
  -- spec_limit_low: lower specification limit (NULL if one-sided upper limit only)
  spec_limit_high         NUMERIC,
  -- spec_limit_high: upper specification limit (NULL if one-sided lower limit only)
  spec_text               TEXT DEFAULT '',
  -- spec_text: text-based specification for pass/fail tests (e.g. 'No growth', 'Conforms')
  result_value            NUMERIC,
  -- result_value: the actual OOS result value
  result_text             TEXT DEFAULT '',
  -- result_text: text result for non-numeric tests
  result_unit             TEXT DEFAULT '',
  -- result_unit: unit of measurement (e.g. '%', 'EU/mL', 'mg/mL')
  oos_type                TEXT NOT NULL DEFAULT 'chemical',
  -- oos_type values: chemical, microbiological, biological, physical
  phase                   TEXT NOT NULL DEFAULT 'phase-1',
  -- phase values: phase-1 (lab investigation), phase-2 (full-scale investigation), confirmed-oos (batch fails spec), invalidated (lab error confirmed, original result invalidated)
  status                  TEXT NOT NULL DEFAULT 'open',
  -- status workflow: open → phase-1-in-progress → phase-1-complete → phase-2-in-progress → phase-2-complete → pending-qa-approval → closed-confirmed → closed-invalidated → closed-inconclusive
  investigation_category  TEXT DEFAULT '',
  -- investigation_category values: analyst-error, instrument-error, calculation-error, sampling-error, reagent-error, method-error, sample-prep-error, process-related, material-related, facility-related, equipment-related, environmental, unknown, inconclusive
  priority                TEXT DEFAULT 'high',
  -- priority values: critical (batch-critical sample, released product), high (default for all OOS), medium (stability/retain samples), low (development/R&D)
  batch_id                TEXT DEFAULT '',
  product                 TEXT DEFAULT '',
  lot_number              TEXT DEFAULT '',
  original_analyst        TEXT NOT NULL DEFAULT '',
  -- original_analyst: the analyst who performed the original test (cannot be the Phase I investigator)
  equipment_ids           JSONB DEFAULT '[]',
  -- equipment_ids: array of instrument/equipment IDs used during testing (e.g. ["QCI-1023", "QCI-1045"])
  reagent_lots            JSONB DEFAULT '[]',
  -- reagent_lots: array of reagent/standard lot information used during testing
  -- Phase I fields
  phase1_investigator     TEXT DEFAULT '',
  -- phase1_investigator: person conducting Phase I (must differ from original_analyst per FDA guidance)
  phase1_started_at       TIMESTAMPTZ,
  phase1_due_date         DATE,
  -- phase1_due_date: Phase I must complete within 1 business day of OOS detection (auto-set on creation)
  phase1_completed_at     TIMESTAMPTZ,
  phase1_conclusion       TEXT DEFAULT '',
  -- phase1_conclusion values: lab-error-found (assignable cause documented with evidence → original result invalidated), no-lab-error (no assignable cause → escalate to Phase II), inconclusive (suspicion but insufficient evidence → escalate to Phase II)
  phase1_assignable_cause TEXT DEFAULT '',
  -- phase1_assignable_cause: specific cause identified in Phase I (required when conclusion = lab-error-found). Must be documented with objective evidence — "analyst error" without specifics is NOT acceptable per FDA guidance.
  phase1_evidence         TEXT DEFAULT '',
  -- phase1_evidence: documentation of evidence supporting Phase I conclusion
  phase1_approved_by      TEXT DEFAULT '',
  -- phase1_approved_by: QC supervisor who reviewed and approved Phase I conclusion
  phase1_approved_at      TIMESTAMPTZ,
  -- Phase II fields
  phase2_lead             TEXT DEFAULT '',
  -- phase2_lead: QA representative leading the Phase II investigation
  phase2_team             JSONB DEFAULT '[]',
  -- phase2_team: array of cross-functional team members [{name, role, department}]
  phase2_started_at       TIMESTAMPTZ,
  phase2_due_date         DATE,
  -- phase2_due_date: Phase II must complete within 30 calendar days of initiation (auto-set on escalation)
  phase2_completed_at     TIMESTAMPTZ,
  root_cause              TEXT DEFAULT '',
  -- root_cause: detailed root cause description (free text, required for Phase II closure)
  root_cause_category     TEXT DEFAULT '',
  -- root_cause_category values: lab-error-late (evidence emerged after Phase I), process-related, method-related, sampling-error, material-related, equipment-malfunction, environmental-excursion, confirmed-oos (batch genuinely fails spec), inconclusive
  corrective_action       TEXT DEFAULT '',
  -- corrective_action: immediate corrective action taken
  preventive_action       TEXT DEFAULT '',
  -- preventive_action: preventive action to avoid recurrence
  capa_id                 TEXT DEFAULT '',
  -- capa_id: linked CAPA record (CAPA-XXXX). Required for Phase II closure per 21 CFR 211.192.
  deviation_id            TEXT DEFAULT '',
  -- deviation_id: linked deviation record (DEV-XXXX) if a deviation was raised
  change_control_id       TEXT DEFAULT '',
  -- change_control_id: linked change control (CC-XXXX) if method/process change results from investigation
  affected_batches        JSONB DEFAULT '[]',
  -- affected_batches: structured batch impact assessment [{batch_id, product, relationship, risk_level, assessment, detail, assessed_by, assessed_at}]
  retest_results          JSONB DEFAULT '[]',
  -- retest_results: array of retest records [{retest_id, retest_type, result_value, spec_met, analyst, instrument, date}] — also stored individually in oos_retests table
  statistical_evaluation  JSONB DEFAULT '{}',
  -- statistical_evaluation: statistical analysis of combined original + retest data {method, p_value, outlier_identified, conclusion}
  final_disposition       TEXT DEFAULT '',
  -- final_disposition values: lab-error-invalidated (Phase I or Phase II lab error → original result invalidated, retest = reportable), confirmed-oos (batch genuinely fails spec → reject/reprocess), inconclusive-oos-stands (root cause unknown → original OOS treated as valid, typically batch rejected)
  closure_summary         TEXT DEFAULT '',
  -- closure_summary: final investigation summary narrative for regulatory file
  closed_by               TEXT DEFAULT '',
  -- closed_by: QA head who approved investigation closure (e-signature)
  closed_at               TIMESTAMPTZ,
  -- Timeline extension fields
  extension_requested     BOOLEAN DEFAULT false,
  extension_justification TEXT DEFAULT '',
  extension_approved_by   TEXT DEFAULT '',
  extension_approved_at   TIMESTAMPTZ,
  extension_new_due_date  DATE,
  -- extension_new_due_date: extended due date (must be documented and justified per FDA guidance)
  -- AI fields
  ai_root_cause           JSONB DEFAULT '{}',
  -- ai_root_cause: AI-suggested root causes with confidence [{category, confidence, reasoning, similar_investigations}]
  ai_impact_analysis      JSONB DEFAULT '{}',
  -- ai_impact_analysis: AI-generated cross-batch impact assessment {affected_batches, risk_summary, recommendations}
  ai_trending             JSONB DEFAULT '{}',
  -- ai_trending: AI historical OOS trending analysis {oos_rate, trend_direction, risk_level, patterns}
  ai_phase2_prediction    JSONB DEFAULT '{}',
  -- ai_phase2_prediction: AI prediction of whether Phase II will be needed {prediction, confidence, reasoning}
  ai_capa_suggestion      JSONB DEFAULT '{}',
  -- ai_capa_suggestion: AI-suggested CAPA scope based on root cause {corrective_actions, preventive_actions, scope}
  created_by              TEXT NOT NULL DEFAULT 'system',
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_oos_status ON oos_investigations(status);
CREATE INDEX IF NOT EXISTS idx_oos_phase ON oos_investigations(phase);
CREATE INDEX IF NOT EXISTS idx_oos_type ON oos_investigations(oos_type);
CREATE INDEX IF NOT EXISTS idx_oos_priority ON oos_investigations(priority);
CREATE INDEX IF NOT EXISTS idx_oos_sample ON oos_investigations(sample_id);
CREATE INDEX IF NOT EXISTS idx_oos_batch ON oos_investigations(batch_id);
CREATE INDEX IF NOT EXISTS idx_oos_product ON oos_investigations(product);
CREATE INDEX IF NOT EXISTS idx_oos_analyst ON oos_investigations(original_analyst);
CREATE INDEX IF NOT EXISTS idx_oos_category ON oos_investigations(investigation_category);
CREATE INDEX IF NOT EXISTS idx_oos_phase1_due ON oos_investigations(phase1_due_date);
CREATE INDEX IF NOT EXISTS idx_oos_phase2_due ON oos_investigations(phase2_due_date);
CREATE INDEX IF NOT EXISTS idx_oos_disposition ON oos_investigations(final_disposition);
CREATE INDEX IF NOT EXISTS idx_oos_capa ON oos_investigations(capa_id);
CREATE INDEX IF NOT EXISTS idx_oos_deviation ON oos_investigations(deviation_id);
ALTER TABLE oos_investigations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'oos_investigations_all') THEN
    CREATE POLICY oos_investigations_all ON oos_investigations FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;
```

### oos_phase1_checks
```sql
CREATE TABLE IF NOT EXISTS oos_phase1_checks (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  check_id        TEXT UNIQUE NOT NULL,
  oos_id          TEXT NOT NULL REFERENCES oos_investigations(oos_id),
  -- oos_id: FK to the parent OOS investigation record
  check_type      TEXT NOT NULL,
  -- check_type values: analyst-interview (interview the original analyst — most critical step), calculation-verify (re-perform all calculations from raw data), instrument-cal (verify instrument calibration status and SST results), method-compliance (verify correct method version and parameters followed), analyst-technique (assess analyst competency and technique), sample-integrity (verify sample storage, hold time, chain of custody), reagent-check (verify reagent/standard lot, expiry, preparation), standard-check (verify reference standard identity, potency, expiry), system-suitability (verify SST criteria were met for the analytical run), environmental-review (verify lab temp, humidity, vibration within limits)
  check_order     INTEGER DEFAULT 0,
  -- check_order: display order for the checklist (1-10, matching FDA guidance sequence)
  result          TEXT DEFAULT 'pending',
  -- result values: pending (not yet performed), pass (check completed, no issue found), fail (check completed, issue identified — potential assignable cause), na (check not applicable for this test type)
  findings        TEXT DEFAULT '',
  -- findings: detailed findings for this check item (required when result = fail)
  evidence_ref    TEXT DEFAULT '',
  -- evidence_ref: reference to supporting documents, records, screenshots, logbook pages
  auto_populated  JSONB DEFAULT '{}',
  -- auto_populated: AI-pre-populated context data for this check (e.g. instrument calibration status, reagent lot info, analyst training status)
  checked_by      TEXT DEFAULT '',
  -- checked_by: person who performed this check (must be ≠ original_analyst for independence)
  checked_at      TIMESTAMPTZ,
  -- checked_at: timestamp of check completion (server-generated for Part 11 compliance)
  e_signature     JSONB DEFAULT '{}',
  -- e_signature: per 21 CFR Part 11.50 — {printed_name, meaning, timestamp} where meaning is "I have completed this check and the findings are accurately recorded"
  notes           TEXT DEFAULT '',
  created_by      TEXT NOT NULL DEFAULT 'system',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_oos_checks_oos ON oos_phase1_checks(oos_id);
CREATE INDEX IF NOT EXISTS idx_oos_checks_type ON oos_phase1_checks(check_type);
CREATE INDEX IF NOT EXISTS idx_oos_checks_result ON oos_phase1_checks(result);
ALTER TABLE oos_phase1_checks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'oos_phase1_checks_all') THEN
    CREATE POLICY oos_phase1_checks_all ON oos_phase1_checks FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;
```

### oos_retests
```sql
CREATE TABLE IF NOT EXISTS oos_retests (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  retest_id         TEXT UNIQUE NOT NULL,
  oos_id            TEXT NOT NULL REFERENCES oos_investigations(oos_id),
  -- oos_id: FK to the parent OOS investigation record
  retest_type       TEXT NOT NULL DEFAULT 'retest-original',
  -- retest_type values: retest-original (retest from original sample — same preparation), resample-retest (new sample taken from batch and tested), reanalysis (re-injection/re-read of already-prepared sample — diagnostic only, not a formal retest), re-preparation (new preparation from original sample aliquot — Phase I diagnostic)
  retest_number     INTEGER DEFAULT 1,
  -- retest_number: sequential number within this investigation (1, 2, 3...). Total retests must match pre-approved protocol.
  result_value      NUMERIC,
  -- result_value: the retest result value
  result_text       TEXT DEFAULT '',
  -- result_text: text result for non-numeric tests
  result_unit       TEXT DEFAULT '',
  spec_met          BOOLEAN DEFAULT false,
  -- spec_met: whether the retest result meets specification limits
  analyst           TEXT NOT NULL DEFAULT '',
  -- analyst: analyst who performed the retest (should differ from original analyst per FDA guidance — "ideally performed by a different qualified analyst")
  instrument        TEXT DEFAULT '',
  -- instrument: instrument/equipment used for retest
  method_version    TEXT DEFAULT '',
  -- method_version: method version used for retest (should match original unless method change is part of investigation)
  justification     TEXT DEFAULT '',
  -- justification: scientific justification for performing this retest (required per FDA guidance — retesting is not a substitute for investigation)
  protocol_ref      TEXT DEFAULT '',
  -- protocol_ref: reference to the pre-approved retest protocol (number of retests, statistical method, acceptance criteria must be pre-specified before retesting begins)
  approved_by       TEXT DEFAULT '',
  -- approved_by: QA approval of retest (retesting must be approved before execution)
  approved_at       TIMESTAMPTZ,
  performed_at      TIMESTAMPTZ,
  -- performed_at: when the retest was actually performed
  notes             TEXT DEFAULT '',
  created_by        TEXT NOT NULL DEFAULT 'system',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_oos_retests_oos ON oos_retests(oos_id);
CREATE INDEX IF NOT EXISTS idx_oos_retests_type ON oos_retests(retest_type);
CREATE INDEX IF NOT EXISTS idx_oos_retests_analyst ON oos_retests(analyst);
CREATE INDEX IF NOT EXISTS idx_oos_retests_spec ON oos_retests(spec_met);
ALTER TABLE oos_retests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'oos_retests_all') THEN
    CREATE POLICY oos_retests_all ON oos_retests FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;
```

## ID Generators
Add to `server/lib/ids.js`:
- `oosId()` → `OOS-1000...9999`
- `oosCheckId()` → `OOSC-1000...9999`
- `oosRetestId()` → `OOSR-1000...9999`

## API Endpoints

### Core CRUD
- `POST /oos` — create a new OOS investigation (auto-generates OOS-ID, sets Phase I due date to current date + 1 business day, auto-creates the 10 Phase I checklist items, auto-quarantines batch). Required fields: sample_id, test_method, test_parameter, result_value, oos_type, original_analyst. Auto-populates spec limits from linked sample/test records where available.
- `GET /oos` — list all investigations (filter by status, phase, oos_type, priority, product, batch_id, original_analyst, investigation_category, final_disposition, overdue flag, date range)
- `GET /oos/:oosId` — single investigation with Phase I checklist items, retests, and affected batches. Returns full sub-records joined.
- `PUT /oos/:oosId` — update investigation fields (auto-validates status transitions, enforces business rules). Cannot update closed investigations.

### Phase I Workflow
- `POST /oos/:oosId/phase1/checks/:checkId` — complete a Phase I checklist item (set result: pass/fail/na, findings, evidence_ref). Validates that checked_by differs from original_analyst. Captures e-signature per Part 11.
- `POST /oos/:oosId/phase1/conclude` — submit Phase I conclusion (lab-error-found, no-lab-error, inconclusive). If lab-error-found: requires phase1_assignable_cause and phase1_evidence (rejects if empty — "analyst error" without documented evidence is not acceptable per FDA guidance). If no-lab-error or inconclusive: automatically triggers Phase II escalation prompt. Validates all mandatory checklist items are completed before allowing conclusion.
- `POST /oos/:oosId/phase1/approve` — QC supervisor approval of Phase I conclusion. Captures e-signature with printed_name, meaning ("I have reviewed all Phase I findings and concur with the conclusion"), timestamp. Required before Phase I can be considered complete.

### Phase II Workflow (Escalation & Full Investigation)
- `POST /oos/:oosId/escalate` — escalate from Phase I to Phase II (phase-1 → phase-2, status → phase-2-in-progress). Sets phase2_due_date to current date + 30 calendar days. Requires phase2_lead assignment (must be QA role). Accepts phase2_team array. Blocked if Phase I is not yet concluded/approved.
- `POST /oos/:oosId/retests` — add a retest record. Validates: Phase II must be active (retesting only permitted during Phase II per FDA guidance), retest must have approved_by (QA pre-approval required), analyst should differ from original_analyst (warning if same). Creates oos_retests record and updates retest_results JSONB on parent.
- `GET /oos/:oosId/retests` — list all retests for an investigation (ordered by retest_number)
- `POST /oos/:oosId/root-cause` — submit root cause determination (root_cause_category, root_cause detail, corrective_action, preventive_action). Validates that root_cause_category is from the allowed taxonomy.
- `POST /oos/:oosId/batch-impact` — add a batch to the impact assessment. Accepts: batch_id, product, relationship (same-analyst, same-equipment, same-method, same-reagent-lot, same-campaign, same-raw-material), risk_level, assessment (cleared, additional-testing-required, quarantined, rejected), detail. Required per 21 CFR 211.192 — investigation must extend to other batches.
- `POST /oos/:oosId/link-capa` — link a CAPA to the investigation. Validates CAPA exists. Required for Phase II closure (cannot close without CAPA linkage per regulatory requirement).
- `POST /oos/:oosId/link-deviation` — link a deviation to the investigation. Optional but recommended for process-related root causes.
- `POST /oos/:oosId/close` — close the investigation with final disposition. Validates:
  1. Phase II investigation is complete (all required fields populated)
  2. Root cause is documented (root_cause_category and root_cause are non-empty)
  3. CAPA is linked (capa_id is non-empty) — blocked if missing
  4. Batch impact assessment is complete (affected_batches is non-empty for process-related root causes)
  5. Closure requires QA head approval (closed_by must be qa role)
  6. Final disposition is set (lab-error-invalidated, confirmed-oos, or inconclusive-oos-stands)
  Sets closed_at, status to appropriate closed-* value.

### Timeline Management
- `POST /oos/:oosId/extend` — request timeline extension (justification required, new_due_date). Creates audit trail entry. Does not auto-approve.
- `POST /oos/:oosId/extend/approve` — QA approval of timeline extension. Sets extension_approved_by, extension_approved_at, updates the relevant due date.

### Dashboard & Analytics
- `GET /oos/stats` — dashboard statistics: total open investigations, count by phase, count by status, overdue Phase I count, overdue Phase II count, OOS rate (last 30/90/365 days), Phase I resolution rate, Phase II resolution rate, lab error rate, confirmed OOS rate, inconclusive rate, average time-to-close (Phase I), average time-to-close (Phase II), investigations by oos_type, by product, by test_parameter, by investigation_category, CAPA linkage rate
- `GET /oos/overdue` — list all investigations with overdue Phase I (past phase1_due_date) or Phase II (past phase2_due_date) deadlines. Sorted by days overdue descending. Used for daily QA management review and escalation.

### AI Endpoints
- `POST /oos/:oosId/ai/root-cause` — AI: suggest assignable causes based on test type, parameter, analyst history, equipment history, reagent lot history, and historical OOS investigations. Returns top 3 most likely root cause categories with confidence percentages, specific factors to investigate first, similar historical investigations and their outcomes, recommended Phase I focus areas. Uses the enhanced prompt pattern from the research brief.
- `POST /oos/:oosId/ai/impact` — AI: cross-batch impact analysis. Given the root cause, identify all potentially affected batches from the database (same analyst, equipment, method, reagent lot, campaign). Rank by risk level, suggest assessment actions for each. Returns structured impact matrix.
- `POST /oos/:oosId/ai/trending` — AI: historical OOS trending for the investigation's test/product combination. Analyse OOS rate over time, identify patterns (analyst-dependent, equipment-dependent, seasonal), flag concerning trends. Returns trend data with visualisation-ready format.
- `POST /oos/:oosId/ai/predict-phase2` — AI: predict whether Phase II investigation will be needed based on Phase I findings so far. Analyses checklist results, historical patterns for similar OOS types, and the nature of the OOS. Returns prediction with confidence and reasoning.
- `POST /oos/:oosId/ai/suggest-capa` — AI: suggest CAPA scope based on the confirmed root cause. Recommends corrective actions (immediate fixes), preventive actions (systemic improvements), and suggested CAPA scope (which processes/procedures/equipment need attention). References similar past CAPAs and their effectiveness.
- `POST /oos/:oosId/ai/timeline-check` — AI: timeline enforcement analysis. Checks all open investigations against their due dates, flags approaching/overdue deadlines, suggests prioritisation based on batch criticality and regulatory risk. Returns list of at-risk investigations with days remaining and recommended actions.

## Role Access
- qc (create OOS investigation, perform Phase I investigation — complete checklist items, submit Phase I conclusion; add retests during Phase II; view all investigations)
- qa (all operations — approve Phase I, lead Phase II, submit root cause, close investigation, approve timeline extensions, approve retests, link CAPAs, AI endpoints, view all)
- admin (all operations)

### Access Rules Detail
- **Create investigation:** qc or qa (typically triggered by QC analyst or supervisor when OOS is detected during result entry)
- **Phase I checklist:** qc — the investigator (phase1_investigator) must differ from the original_analyst; system enforces this
- **Phase I conclusion approval:** qa or senior qc (phase1_approved_by)
- **Phase II escalation:** qa (decision to escalate must be made by quality function)
- **Phase II investigation:** qa leads (phase2_lead), qc assists with lab portions
- **Retest approval:** qa only (approved_by on retest must be qa role — retesting without QA pre-approval is a common FDA 483 finding)
- **CAPA linkage:** qa
- **Investigation closure:** qa only (closed_by must be QA Head or equivalent — the quality unit has final authority per FDA guidance)
- **Timeline extensions:** qa to approve (extension_approved_by)
- **AI endpoints:** qc and qa (suggestions are informational; human decision-making is always required)
- **View/list:** requireAuth (any authenticated user can view OOS investigations for transparency, but only qc/qa can modify)

## AI Features (use Anthropic Claude via service dependency)

### Build Now (Round 4)

- **Suggest assignable causes (root cause suggestion)** — when a new OOS investigation is opened, query the database for: historical OOS investigations for the same test/product combination (with root causes and outcomes), the analyst's OOS rate vs. lab average, the instrument's OOS history and calibration status, current reagent/standard lot information and any OOS results obtained with the same lots, recent changes (method updates, new analysts, equipment maintenance in the last 30 days). Feed this context into Claude with the enhanced prompt pattern from the research brief. Return the top 3 most likely root cause categories with confidence percentages, specific factors to investigate first (prioritised), similar historical investigations and their outcomes, and recommended Phase I focus areas. This replaces the basic `aiOosRootcause()` in the QC Lab module with a much richer, investigation-specific analysis.

- **Historical OOS trending** — for a given test/product combination, pull all historical results (not just OOS) and analyse: OOS rate over time (rolling 12-month), trend by analyst (identify analysts with abnormally high OOS rates — >2x lab average is a red flag), trend by instrument/equipment, trend by reagent lot, seasonal patterns, and comparison against industry benchmarks (typical pharma OOS rate: 1-3%). Return structured trending data with risk assessment and recommended actions. This data feeds both the AI panel on the investigation detail page and the stats dashboard.

- **Cross-batch impact analysis** — when Phase II identifies a root cause, automatically query the database for all batches that share the identified root cause factor: same analyst within the time window, same equipment within the calibration period, same method version, same reagent/standard lot, same campaign/production run, same raw material lots. Rank affected batches by risk level based on temporal proximity, degree of factor overlap, and whether their test results were near specification limits (within 10% of spec). Generate a structured impact matrix with recommended actions (additional testing, review existing data, quarantine, no action needed) for each affected batch. Return ready-to-populate data for the affected_batches JSONB field.

- **Timeline enforcement alerts** — on each API call to `/oos/stats` or `/oos/overdue`, evaluate all open investigations against their due dates. Flag: Phase I investigations approaching 1-day deadline (4+ hours elapsed without completion), Phase I investigations overdue, Phase II investigations at 25+ days (5-day warning per WHO guidance), Phase II investigations overdue (30+ days), investigations with approved extensions approaching their extended deadline. Return prioritised list with days remaining, batch criticality, and recommended escalation actions.

- **Predict Phase II likelihood** — after Phase I checklist items are completed (but before Phase I conclusion), analyse the checklist results, the nature of the OOS (type, test, magnitude of exceedance), and historical patterns for similar OOS types to predict whether Phase II will be needed. Return a probability score (0-100), confidence level, and reasoning. This helps QA managers allocate resources proactively — if Phase II is highly likely, the cross-functional team can be assembled before Phase I officially concludes, saving 1-2 days.

- **Suggest CAPA scope** — when Phase II root cause is submitted, analyse the root cause category and detail against historical CAPAs for similar root causes. Suggest: specific corrective actions (immediate fixes to address the identified cause), specific preventive actions (systemic improvements to prevent recurrence), CAPA scope (which processes, procedures, equipment, or training need attention), expected timeline based on historical CAPA closures for similar scopes, and effectiveness criteria to monitor. Return structured data that can be used to pre-populate a CAPA record in the CAPA Tracker module.

### Future Enhancements (not Round 4)
- **Proactive OOT (Out-of-Trend) detection** — statistical engine using Nelson rules, CUSUM charts, and regression analysis to detect trends before they become OOS. The research brief identifies this as the highest-value AI opportunity in the OOS domain.
- **Investigation report generation** — AI-generated comprehensive investigation report suitable for regulatory review, compiling all Phase I/II findings into a structured narrative with regulatory references.
- **Predictive risk scoring** — assign risk scores to pending tests before they are run based on historical OOS rates, analyst performance, equipment history, and environmental conditions.
- **Natural language OOS querying** — extend Charlie AI to answer OOS-related queries ("What is the most common root cause for assay failures?", "Are there any overdue OOS investigations?")

## Dependencies
- QC Lab (live R3) — `qc_samples` table FK, `qc_results` OOS flag detection, reuse of test method/parameter data
- Deviation Manager (live R1) — link OOS investigations to deviations when process-related root causes are identified
- CAPA Tracker (live R2) — mandatory CAPA linkage for Phase II closure; validates CAPA existence on link

## Wiring in server/index.js
```js
// Require at top
const oosRoutes = require('./routes/oos');
const { makeOosService } = require('./services/oos.service');

// Instantiate service
const oosService = makeOosService({ supabase, auditLog, anthropic });

// Add to PAGE_MAP
'oos.html': 'qc/oos.html',

// Mount routes
oosRoutes(app, { auth: requireAuth, oosService });
```

## Frontend Page: docs/qc/oos.html

### Layout
Split-panel: list (left) + detail (right), matching `docs/qc/qc-lab.html`.

### Features
1. **OOS Investigation List** (left panel)
   - Filterable by status (open, phase-1-in-progress, phase-1-complete, phase-2-in-progress, phase-2-complete, pending-qa-approval, closed-confirmed, closed-invalidated, closed-inconclusive), phase (phase-1, phase-2, confirmed-oos, invalidated), oos_type (chemical, microbiological, biological, physical), priority (critical, high, medium, low), product, investigation_category, final_disposition
   - Search by OOS ID, batch ID, product, lot number, analyst
   - Phase color coding: phase-1 = amber, phase-2 = red, confirmed-oos = deep red, invalidated = green
   - Status badges with workflow stage colors matching phase
   - Priority indicator: critical = pulsing red border, high = red badge, medium = amber, low = green
   - Overdue indicator: red "OVERDUE" badge with days-overdue count for investigations past their due date
   - Timeline countdown: displays remaining time (e.g. "6h 23m remaining" for Phase I, "12 days remaining" for Phase II)
   - Sort by: created date (default), priority, due date, product, days-open

2. **OOS Investigation Detail** (right panel)
   - **Header:** OOS ID, status badge, phase badge, priority badge, oos_type badge, timeline countdown (days/hours remaining or days overdue in red)
   - **Investigation summary bar:** product, batch ID, lot number, test method, test parameter, result value vs. spec limits (with visual indicator showing how far the result is from spec), original analyst name
   - **Phase progress visualiser:** horizontal progress bar showing: OOS Detected → Phase I In Progress → Phase I Complete → [Phase II In Progress → Phase II Complete → Pending QA Approval] → Closed. Current stage highlighted. Branches to show that Phase I lab-error-found skips directly to closed-invalidated. Shows due date countdown at each active stage.

   - **Phase I Investigation Section** (always visible)
     - **Investigator assignment:** shows phase1_investigator with validation that they differ from original_analyst. Editable until Phase I is concluded.
     - **Phase I Checklist:** 10-item structured checklist displayed as an interactive card grid or table:
       1. Analyst Interview — interview the original analyst (documented summary required)
       2. Calculation Verification — re-perform all calculations from raw data
       3. Instrument Calibration — verify calibration status, SST results, equipment qualification
       4. Method Compliance — verify correct method version and parameters followed
       5. Analyst Technique — assess analyst competency, training status, qualification for this method
       6. Sample Integrity — verify sample storage, hold time, chain of custody, identification
       7. Reagent Check — verify reagent/standard lot, expiry dates, preparation records
       8. Standard Check — verify reference standard identity, potency, expiry, certificate
       9. System Suitability — verify SST criteria were met for the analytical run
       10. Environmental Review — verify lab temperature, humidity, conditions within limits
     - Each checklist item shows: check_type name, auto-populated context (if available), result selector (pending/pass/fail/na), findings text field (required on fail), evidence reference field, completed_by, completed_at
     - Items with result=fail are highlighted red as potential assignable causes
     - AI "Auto-Populate Context" button — pre-fills each checklist item with relevant data from linked records (instrument calibration status, reagent lot info, analyst training status, environmental monitoring data)
     - Progress indicator: "7 of 10 checks complete"
     - **Phase I Conclusion form:** conclusion dropdown (lab-error-found, no-lab-error, inconclusive), assignable cause text (required if lab-error-found — must be specific and documented), evidence description, QC supervisor approval with e-signature capture

   - **Phase II Investigation Section** (visible when phase = phase-2 or later)
     - **Investigation team:** phase2_lead (QA), team members with roles/departments. Editable team composition.
     - **Root cause analysis form:** root_cause_category dropdown (lab-error-late, process-related, method-related, sampling-error, material-related, equipment-malfunction, environmental-excursion, confirmed-oos, inconclusive), root_cause detail (free text, required), corrective_action, preventive_action
     - AI "Suggest Root Cause" button — triggers AI root cause analysis, displays suggestions in a panel with confidence scores
     - **Retesting section:** table of retest records (retest_type, result_value, spec_met, analyst, instrument, date). "Add Retest" button opens modal. Warning banner: "Retesting is not a substitute for investigation. All retests require QA pre-approval and a pre-defined protocol."
     - **Batch Impact Assessment section:** table of affected batches with columns: batch_id, product, relationship (why affected), risk_level, assessment (cleared/additional-testing/quarantined/rejected), detail, assessed_by. "Add Affected Batch" button. AI "Identify Affected Batches" button — auto-populates from database analysis.
     - **Statistical Evaluation panel:** if retests were performed, display combined original + retest dataset with statistical analysis (outlier tests, mean, SD, confidence intervals). Read-only summary generated by the service layer.
     - **CAPA Linkage:** linked CAPA ID (clickable to CAPA Tracker detail), status badge, "Link CAPA" button. Warning if Phase II investigation has root cause but no linked CAPA.
     - **Linked Records:** deviation link (if applicable), change control link (if method/process change required)

   - **Timeline Section**
     - Visual timeline of key milestones: OOS detected, Phase I started, Phase I due, Phase I completed, Phase II started (if applicable), Phase II due, Phase II completed, closure
     - Overdue milestones highlighted in red with days-overdue count
     - Extension request button (opens modal for justification + new due date)
     - Extension history (if any extensions were requested/approved)

   - **AI Insights Panel** (collapsible sidebar or tab)
     - Root cause suggestions with confidence scores and reasoning
     - Historical OOS trending chart for this test/product (mini sparkline or bar chart)
     - Cross-batch impact summary
     - Phase II prediction (if Phase I is in progress)
     - CAPA scope suggestion (if root cause is submitted)
     - "Refresh AI Analysis" button

   - **Audit Trail Timeline** (bottom section, collapsible)
     - Immutable chronological log of all actions: investigation creation, checklist completions, phase transitions, root cause submissions, retest entries, CAPA links, approvals, closures
     - Each entry shows: timestamp (server-generated), user, action description, before/after values for field changes
     - 21 CFR Part 11 compliant — cannot be modified or deleted

3. **Create OOS Investigation Modal**
   - Sample ID (with autocomplete/search against qc_samples, only shows samples with OOS-flagged results)
   - Result ID (auto-populated from selected sample's OOS results)
   - Test method (auto-populated from linked test record)
   - Test parameter (auto-populated from linked test record)
   - Result value and unit (auto-populated from linked result record)
   - Specification limits (auto-populated: spec_limit_low, spec_limit_high from result/test record)
   - OOS type dropdown (chemical, microbiological, biological, physical)
   - Priority dropdown (critical, high, medium, low) — default: high
   - Batch ID, product, lot number (auto-populated from sample record where available)
   - Original analyst (auto-populated from result record)
   - Phase I investigator assignment (required — must differ from original analyst; dropdown of QC personnel)
   - Equipment IDs used (auto-populated from test record if available)
   - Submit creates the investigation and auto-generates 10 Phase I checklist items

4. **Add Retest Modal**
   - Retest type dropdown (retest-original, resample-retest, reanalysis, re-preparation)
   - Result value and unit
   - Specification met (auto-calculated from result vs. spec limits)
   - Analyst (dropdown of qualified analysts — warning if same as original analyst)
   - Instrument used
   - Method version
   - Scientific justification (required — per FDA guidance)
   - Protocol reference
   - QA approval (approved_by — required before retest can be submitted)

5. **Add Affected Batch Modal**
   - Batch ID (with search/autocomplete against batch records)
   - Product name
   - Relationship dropdown (same-analyst, same-equipment, same-method, same-reagent-lot, same-campaign, same-raw-material)
   - Risk level (high, medium, low)
   - Assessment dropdown (cleared, additional-testing-required, quarantined, rejected)
   - Assessment detail (justification text — required)

6. **Timeline Extension Modal**
   - Current due date (displayed, not editable)
   - Requested new due date (date picker)
   - Justification (required — must explain why extension is needed)
   - Submit creates extension request; requires separate QA approval

7. **Stats Dashboard** (top of page, above list)
   - Total open OOS investigations by phase (phase-1 count, phase-2 count) with clickable counts to filter list
   - Overdue investigations count (Phase I overdue + Phase II overdue) — highlighted red
   - OOS rate: last 30 days, 90 days, 365 days (percentage of total tests that were OOS)
   - Resolution breakdown: Phase I resolution rate, Phase II resolution rate, lab error rate, confirmed OOS rate, inconclusive rate
   - Average time-to-close: Phase I (days), Phase II (days)
   - Investigations by OOS type (pie/donut chart: chemical, microbiological, biological, physical)
   - Investigations by root cause category (bar chart)
   - Top 3 products by OOS count (mini table)
   - CAPA linkage rate (percentage of closed Phase II investigations with linked CAPAs — should be 100%)

### Required imports
```html
<link rel="stylesheet" href="/shared/styles.css">
<script src="/shared/nav.js"></script>
<script src="/shared/i18n.js"></script>
<script src="/shared/dev-progress.js"></script>
```

Use `authFetch()` for all API calls. Use CSS variables from shared/styles.css (dark theme).

## Architecture Rules
- Service factory pattern: `module.exports = { makeOosService }`
- Use `requireAuth` on all read routes; `requireRole('qc')` on create and Phase I checklist routes; `requireRole('qa')` on Phase II close, approve, timeline extension approval, and retest approval routes
- Phase I investigator must differ from original_analyst — enforce in service layer on checklist completion (reject if checked_by === original_analyst)
- Phase I conclusion "lab-error-found" requires non-empty phase1_assignable_cause and phase1_evidence — reject with descriptive error message if either is empty ("Assignable cause must be documented with specific, objective evidence per FDA Guidance Section IV.A")
- Phase I cannot be concluded until all mandatory checklist items (analyst-interview, calculation-verify, instrument-cal, method-compliance, sample-integrity, reagent-check) have result != 'pending' — block with list of incomplete items
- Phase II cannot be initiated until Phase I is concluded and approved (phase1_conclusion is non-empty and phase1_approved_by is non-empty)
- Retesting is only permitted during Phase II — block retest creation if phase != 'phase-2'
- Retest records require QA pre-approval (approved_by must be non-empty) — block creation without approval
- Investigation closure blocked if: root_cause is empty, capa_id is empty (for non-lab-error closures), final_disposition is empty, any mandatory Phase II fields are incomplete
- Auto-set `phase1_due_date` = creation date + 1 business day on investigation creation
- Auto-set `phase2_due_date` = escalation date + 30 calendar days on escalation to Phase II
- Auto-generate 10 Phase I checklist items (oos_phase1_checks records) on investigation creation, with check_order 1-10
- Use `auditLog()` for all create/update/transition/approve/close operations — every state change must be logged with before/after state diff
- Audit trail entries must include: action, userId, timestamp, and field-level before/after values per 21 CFR Part 11.10(e)
- E-signatures on Phase I checklist completion, Phase I approval, Phase II closure must capture: printed_name, timestamp (server-generated), meaning per 21 CFR Part 11.10(k)
- All timestamps must be server-generated (not client-supplied) to prevent tampering per Part 11
- Original OOS result value (result_value) is immutable once the investigation is created — updates are rejected
- Frontend: `authFetch()` for all API calls
- Frontend: dark theme (--bg, --surface, --accent CSS vars)
- Frontend: split-panel layout (list left, detail right)
- No frameworks — vanilla HTML/CSS/JS only
- 21 CFR Part 11 compliant: immutable audit trail, e-signatures on investigation milestones, authority checks on role-based actions
- 21 CFR 211.192 compliant: mandatory cross-batch impact assessment, investigation must extend to other batches of same product
- EU GMP Chapter 6 (6.32-6.35) compliant: structured OOS investigation procedure, retest protocol enforcement, original result preserved
- FDA OOS Guidance (Oct 2006) compliant: two-phase model, assignable cause requirement, no testing into compliance, all data retained

## Reference files (copy patterns from)
- `docs/qc/qc-lab.html` — layout, styling, split-panel pattern, OOS-related UI
- `server/services/qc-lab.service.js` — service factory with AI features, existing OOS functions (initiateOos, updateOos, escalateOos, closeOos, aiOosRootcause)
- `server/routes/qc-lab.js` — route pattern with auth guards, OOS-related routes
- `server/services/deviation-mgr.service.js` — service factory with CAPA linkage pattern
- `server/routes/deviation-mgr.js` — route pattern with role-based access
- `server/lib/ids.js` — ID generator pattern
- `server/lib/audit.js` — audit logging pattern
