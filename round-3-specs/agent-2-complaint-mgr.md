# Agent 2 — Complaints & Recalls
# Branch: feature/complaint-mgr
# Phase: 1 — Quality Core
# Complexity: L (6 days)

## What to build
Product complaint and recall management system. Track customer and internal complaints through intake, classification, investigation, batch linkage, trending, and closure. When complaints reveal systemic issues, trigger and track recall events with scope assessment, notification tracking, and reconciliation. Must support 21 CFR Part 11 with full audit trail. Links to deviations (investigation findings) and CAPAs (corrective actions from complaints).

**Regulatory scope:** FDA 21 CFR 211.198 (complaint files), FDA 21 CFR Part 7 (recalls), EU GMP Chapter 8 (complaints & product recalls), ICH Q10 (pharmaceutical quality system — knowledge management and continual improvement). All FDA-mandated record fields from 211.198(b) must be present. Recall management must support FDA recall classification (Class I/II/III), recall depth, health hazard evaluation, effectiveness checks, and periodic status reporting per 21 CFR 7.41–7.55. Soft-delete only — never hard-delete complaint or recall records (regulatory retention requirement).

## Files to create
- `docs/qa/complaints.html` (frontend page)
- `server/services/complaint-mgr.service.js` (service layer)
- `server/routes/complaint-mgr.js` (API routes)

## Files to modify (additions only)
- `server/routes/admin.js` — add CREATE TABLE statements
- `server/index.js` — wire service + mount routes + add PAGE_MAP entry
- `server/lib/ids.js` — add ID generators

## Database Tables
Add to `server/routes/admin.js`:

### complaints
```sql
CREATE TABLE IF NOT EXISTS complaints (
  id                          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  complaint_id                TEXT UNIQUE NOT NULL,
  title                       TEXT NOT NULL,
  description                 TEXT NOT NULL DEFAULT '',
  complaint_type              TEXT NOT NULL DEFAULT 'product_quality',
  -- complaint_type values: product_quality, adverse_event, adverse_reaction, packaging_integrity,
  --   labelling_error, potency_failure, sterility_failure, particulate_matter,
  --   delivery_logistics, counterfeit_suspect, device_malfunction, stability_failure
  source                      TEXT NOT NULL DEFAULT 'customer',
  -- source values: customer, internal, regulatory, distributor
  severity                    TEXT DEFAULT 'minor',
  -- severity values: critical, major, minor
  status                      TEXT DEFAULT 'received',
  -- status values: received, triaging, investigating, pending_capa, pending_response, closed, void
  priority                    TEXT DEFAULT 'medium',
  product_name                TEXT DEFAULT '',
  product_strength            TEXT DEFAULT '',
  -- FDA 211.198(b) requires name AND strength separately
  dosage_form                 TEXT DEFAULT '',
  -- helps classification and trending for biologics
  batch_number                TEXT DEFAULT '',
  lot_number                  TEXT DEFAULT '',
  date_received               DATE NOT NULL DEFAULT CURRENT_DATE,
  date_of_event               DATE,
  -- Complainant info (FDA 211.198(b) field 3)
  complainant_name            TEXT DEFAULT '',
  complainant_contact         TEXT DEFAULT '',
  complainant_org             TEXT DEFAULT '',
  country                     TEXT DEFAULT '',
  -- Investigation (FDA 211.198(b) field 6)
  investigation               TEXT DEFAULT '',
  root_cause                  TEXT DEFAULT '',
  investigation_declined_reason TEXT DEFAULT '',
  -- FDA: if no investigation, must record reason and responsible person
  initial_risk_assessment     TEXT DEFAULT '',
  -- triage documentation
  -- Immediate & corrective action (FDA 211.198(b) field 7)
  immediate_action            TEXT DEFAULT '',
  linked_deviation_id         TEXT DEFAULT '',
  linked_capa_id              TEXT DEFAULT '',
  linked_recall_id            TEXT DEFAULT '',
  affected_batches            JSONB DEFAULT '[]',
  -- Reply to complainant (FDA 211.198(b) field 5 — mandatory)
  reply_to_complainant        TEXT DEFAULT '',
  reply_date                  DATE,
  -- Follow-up (FDA 211.198(b) field 8 — mandatory)
  follow_up_notes             TEXT DEFAULT '',
  follow_up_date              DATE,
  -- Regulatory reporting fields
  reportable                  BOOLEAN DEFAULT false,
  reported_to                 TEXT DEFAULT '',
  reported_date               DATE,
  regulatory_report_type      TEXT DEFAULT '',
  -- regulatory_report_type values: medwatch, field_alert, cioms, vigilance, none
  regulatory_report_number    TEXT DEFAULT '',
  report_deadline             DATE,
  -- 15-day (biologics adverse event) or 3-day (field alert) deadline
  report_submitted_date       DATE,
  reported_within_deadline    BOOLEAN,
  -- computed/set on submission — proves timely reporting
  -- EU GMP Chapter 8 specific fields
  counterfeit_assessed        BOOLEAN DEFAULT false,
  counterfeit_notes           TEXT DEFAULT '',
  rapid_alert_issued          BOOLEAN DEFAULT false,
  other_batches_checked       BOOLEAN DEFAULT false,
  related_batch_findings      TEXT DEFAULT '',
  competent_authority_notified BOOLEAN DEFAULT false,
  competent_authority_notified_date DATE,
  -- Sample tracking
  sample_available            BOOLEAN DEFAULT false,
  sample_tested               BOOLEAN DEFAULT false,
  temperature_excursion       BOOLEAN DEFAULT false,
  -- AI analysis outputs
  ai_classification           JSONB DEFAULT '{}',
  -- structured: { type, severity, confidence, reasoning, reportable_assessment, recommended_investigation_scope }
  ai_batch_impact             JSONB DEFAULT '{}',
  ai_trend_summary            TEXT DEFAULT '',
  ai_recall_risk              JSONB DEFAULT '{}',
  -- predictive recall risk score and analysis
  -- Closure
  closure_notes               TEXT DEFAULT '',
  closed_by                   TEXT DEFAULT '',
  closed_at                   TIMESTAMPTZ,
  -- Soft-delete (never hard-delete — 21 CFR Part 11 retention)
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
```

### recall_events
```sql
CREATE TABLE IF NOT EXISTS recall_events (
  id                          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recall_id                   TEXT UNIQUE NOT NULL,
  title                       TEXT NOT NULL,
  description                 TEXT NOT NULL DEFAULT '',
  recall_class                TEXT NOT NULL DEFAULT 'class_ii',
  -- recall_class values: class_i, class_ii, class_iii (per FDA 21 CFR 7.41)
  status                      TEXT DEFAULT 'initiated',
  -- status values: initiated, strategy_approved, notifications_sent, in_progress,
  --   effectiveness_checking, pending_termination, terminated
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
  -- FDA 21 CFR Part 7 — Recall strategy fields
  recall_depth                TEXT DEFAULT 'wholesale',
  -- recall_depth values: wholesale, retail, consumer_user (per 21 CFR 7.42)
  public_notification_method  TEXT DEFAULT 'none',
  -- values: press_release, direct_notification, both, none
  health_hazard_evaluation    JSONB DEFAULT '{}',
  -- structured: { disease_injuries_occurred, vulnerable_populations, seriousness,
  --   likelihood_of_occurrence, consequences_assessment, overall_risk }
  fda_recall_number           TEXT DEFAULT '',
  -- FDA-assigned recall event number
  effectiveness_check_level   TEXT DEFAULT 'C',
  -- FDA levels: A (100%), B (>10%), C (10%), D (2%), E (none)
  effectiveness_check_results JSONB DEFAULT '{}',
  -- structured tracking of effectiveness check data
  consignee_tracking          JSONB DEFAULT '[]',
  -- array: [{ consignee, notified_date, responded, quantity_accounted, action_taken }]
  status_report_dates         JSONB DEFAULT '[]',
  -- array of dates periodic status reports submitted to FDA (21 CFR 7.53)
  -- EU GMP Chapter 8 specific
  competent_authority_notified BOOLEAN DEFAULT false,
  competent_authority_notified_date DATE,
  rapid_alert_issued          BOOLEAN DEFAULT false,
  recalled_product_disposition TEXT DEFAULT '',
  -- segregated, destroyed, reworked, returned_to_supplier
  initiated_by                TEXT NOT NULL,
  initiated_date              DATE NOT NULL DEFAULT CURRENT_DATE,
  target_completion           DATE,
  actual_completion           DATE,
  effectiveness_check         TEXT DEFAULT '',
  ai_scope_assessment         JSONB DEFAULT '{}',
  -- structured AI assessment output
  closure_notes               TEXT DEFAULT '',
  lessons_learned             TEXT DEFAULT '',
  -- Recall records should never be archivable (permanent retention)
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
```

## ID Generators
Add to `server/lib/ids.js`:
- `complaintId()` → `COMP-1000…9999`
- `recallId()` → `RCL-1000…9999`

## API Endpoints

### Complaint CRUD
- `POST /complaints` — create a new complaint (sets status to `received`, assigns complaint_id)
- `GET /complaints` — list all (filter by status, complaint_type, severity, source, product_name, batch_number, date range, reportable, country)
- `GET /complaints/:compId` — single complaint detail
- `PUT /complaints/:compId` — update complaint fields (audit-logged)

### Complaint Workflow
- `POST /complaints/:compId/triage` — triage complaint (status: received -> triaging), set priority, initial risk assessment, reportability determination
- `POST /complaints/:compId/investigate` — start investigation (status: triaging -> investigating), assign investigator
- `POST /complaints/:compId/decline-investigation` — decline investigation with mandatory justification (FDA requires reason and responsible person name when investigation not conducted)
- `POST /complaints/:compId/respond` — record reply to complainant (body: `{ reply_to_complainant, reply_date }`) — FDA 211.198(b) field 5
- `POST /complaints/:compId/follow-up` — record follow-up (body: `{ follow_up_notes, follow_up_date }`) — FDA 211.198(b) field 8
- `POST /complaints/:compId/close` — close complaint with closure notes (status -> closed, requires QA approval)
- `POST /complaints/:compId/void` — void duplicate/invalid complaint (status -> void, requires justification)
- `POST /complaints/:compId/archive` — soft-archive closed complaint (sets archived_at, archived_by)

### Complaint Reporting
- `GET /complaints/stats` — dashboard stats (open count, by type, by severity, trending, overdue SLAs, reportable count)
- `GET /complaints/trends` — complaint trend data over time (for charts)
- `GET /complaints/sla-status` — SLA adherence report (days to triage, investigate, close vs targets)
- `GET /complaints/regulatory-deadlines` — list complaints with approaching or overdue regulatory report deadlines

### Complaint AI Endpoints
- `POST /complaints/:compId/ai/classify` — AI: auto-classify complaint type and severity. Returns structured JSON: `{ type, severity, confidence, reasoning, reportable_assessment, recommended_investigation_scope }`
- `POST /complaints/:compId/ai/batch-impact` — AI: analyse batch impact across related complaints, same-batch complaints, related-batch complaints, shared equipment issues. Returns risk assessment and recall recommendation.
- `POST /complaints/:compId/ai/trends` — AI: detect trends and patterns in recent complaints (last 90 days). Returns statistical analysis with alert tier (signal/trend/alarm).
- `POST /complaints/ai/predict-recall-risk` — AI: predictive recall risk scoring based on complaint patterns, batch history, and cross-module data. Returns risk score 0-1, contributing factors, recommended actions, and similar historical cases. **Key competitive differentiator — no competitor offers this.**
- `POST /complaints/:compId/ai/draft-report` — AI: generate draft MedWatch 3500A or Field Alert Report from complaint data. Maps complaint fields to regulatory form fields and generates narrative sections for QA review.

### Recall CRUD
- `POST /recalls` — initiate a recall event (status: initiated)
- `GET /recalls` — list all recalls (filter by status, recall_class, recall_depth)
- `GET /recalls/:recallId` — single recall detail
- `PUT /recalls/:recallId` — update recall fields (audit-logged)

### Recall Workflow
- `POST /recalls/:recallId/approve-strategy` — approve recall strategy (status: initiated -> strategy_approved)
- `POST /recalls/:recallId/send-notifications` — mark notifications sent (status: strategy_approved -> notifications_sent)
- `POST /recalls/:recallId/start-recovery` — begin active recovery tracking (status: notifications_sent -> in_progress)
- `POST /recalls/:recallId/effectiveness-check` — record effectiveness check results (status: in_progress -> effectiveness_checking)
- `POST /recalls/:recallId/submit-termination` — submit for regulatory termination (status -> pending_termination)
- `POST /recalls/:recallId/terminate` — officially close recall (status -> terminated, requires director approval)
- `POST /recalls/:recallId/status-report` — record periodic status report submission to FDA (appends to status_report_dates)
- `PUT /recalls/:recallId/consignees` — update consignee tracking data (notified, responded, quantity accounted)

### Recall Reporting & AI
- `GET /recalls/stats` — recall dashboard stats (active count, by class, recovery rates, overdue effectiveness checks)
- `POST /recalls/:recallId/ai/scope` — AI: assess recall scope and impact, recommend classification, estimate affected units, identify priority markets, generate health hazard evaluation draft

## Role Access
- qa (all operations on complaints and recalls)
- director (all operations, approve recalls, close complaints)
- admin (all operations)

## AI Features (use Anthropic Claude via service dependency)

### 1. Auto-Classify Complaint (existing — enhanced)
Analyse the complaint description to automatically classify it using the expanded taxonomy: product_quality, adverse_event, adverse_reaction, packaging_integrity, labelling_error, potency_failure, sterility_failure, particulate_matter, delivery_logistics, counterfeit_suspect, device_malfunction, stability_failure. Suggest severity (critical, major, minor). Provide confidence score and reasoning.

**Output structure (JSONB stored in ai_classification):**
```json
{
  "type": "sterility_failure",
  "severity": "critical",
  "confidence": 0.92,
  "reasoning": "Complaint describes visible particulates in a sterile injectable...",
  "reportable_assessment": "Likely reportable — sterility failure in injectable biologic requires 15-day MedWatch and field alert evaluation",
  "recommended_investigation_scope": "single_batch",
  "adverse_event_flag": true,
  "counterfeit_flag": false
}
```

**Prompt strategy:** Use structured few-shot prompting with real-world complaint examples. Include regulatory context in the system prompt (what makes something reportable under 21 CFR 600.80 for biologics, when adverse events must be escalated). Flag potential MedWatch-reportable events with high sensitivity (err on the side of flagging for human review — target >95% sensitivity for reportability, >90% for type, >85% for severity).

### 2. Batch Impact Analysis (existing — enhanced)
Given a complaint linked to a batch, query across multiple data dimensions:
1. **Same batch complaints** — other complaints against the same lot/batch number
2. **Same product, same period** — complaints for the same product within +/- 30 days of manufacturing
3. **Same equipment** — if batch records link to equipment, check for equipment-related complaints
4. **Same raw materials** — if raw material lots are tracked, check for material-linked issues
5. **Distribution overlap** — which markets/customers received the affected batch

**Output structure (JSONB stored in ai_batch_impact):**
```json
{
  "same_batch_complaints": [],
  "related_batch_complaints": [],
  "shared_equipment_issues": [],
  "risk_assessment": "high",
  "recommended_scope": "multiple_batches",
  "recall_recommendation": "monitor",
  "affected_batch_list": ["LOT-001", "LOT-002"],
  "estimated_units_at_risk": 15000,
  "reasoning": "..."
}
```

### 3. Trend Detection (existing — enhanced with statistical methods)
Analyse recent complaints (last 90 days) to identify patterns. Apply:
- **Moving average analysis** — 3-month rolling average of complaint rates per product
- **Control chart logic** — flag when complaint rate exceeds mean + 2 sigma (Upper Control Limit)
- **Pareto analysis** — identify the 20% of complaint types causing 80% of volume
- **Geographic clustering** — detect complaints concentrated in specific markets
- **Temporal clustering** — detect spikes around specific manufacturing dates
- **Recurrence detection** — identify complaints with same root cause that have appeared before

**Alert tiers in output:**
1. **Signal** — early pattern, worth monitoring (e.g., 2 similar complaints in 30 days)
2. **Trend** — confirmed pattern requiring investigation (e.g., statistically significant increase)
3. **Alarm** — urgent pattern requiring immediate action (e.g., multiple adverse events)

**Trigger thresholds:**
- More than 3 complaints on same batch: automatic investigation trigger
- Complaint rate exceeding historical average by 2 standard deviations: management notification
- Any adverse event: immediate regulatory assessment
- Cluster of same complaint type within 30 days: trend alert

### 4. Recall Scope Assessment (existing — enhanced)
When a recall is initiated, analyse distribution data and affected batches to:
- Recommend recall classification (Class I/II/III per FDA 21 CFR 7.41)
- Generate draft health hazard evaluation (disease/injuries occurred, vulnerable populations, seriousness, likelihood, consequences)
- Recommend recall depth (wholesale/retail/consumer_user)
- Estimate affected units and identify markets requiring notification
- Suggest effectiveness check level (A/B/C/D/E) based on recall class and risk
- Suggest communication priorities and draft notification language

### 5. Predictive Recall Risk (NEW — competitive differentiator)
Use complaint patterns to predict when a recall may become necessary before it is formally triggered. No competitor (MasterControl, Veeva, TrackWise) offers this capability.

**Input signals:**
- Rising complaint rate on a specific batch or product
- Multiple complaints of the same type (especially sterility, potency, particulate)
- Adverse event reports
- Cross-module data (deviations, equipment issues) linked to production batches

**Output structure (JSONB stored in ai_recall_risk):**
```json
{
  "recall_risk_score": 0.78,
  "risk_level": "high",
  "contributing_factors": [
    "3 sterility complaints on batch LOT-2026-0042 in 14 days",
    "Related deviation DEV-2341 flagged environmental monitoring excursion"
  ],
  "recommended_actions": [
    "Immediate quarantine of remaining LOT-2026-0042 inventory",
    "Initiate expanded investigation",
    "Prepare recall strategy as contingency"
  ],
  "similar_historical_cases": [
    { "case": "COMP-3421", "outcome": "Class II recall" }
  ]
}
```

### 6. Regulatory Report Drafting (NEW)
AI generates draft MedWatch 3500A reports or Field Alert Reports from complaint data. Extract structured data from the complaint record, map fields to regulatory form fields, generate narrative sections. Output a pre-filled draft for QA review and submission. Saves significant manual effort on a task that is error-prone and time-sensitive (15-day/3-day deadlines).

## Dependencies
- Deviation Manager (live R1) — link complaints to deviations for investigation
- CAPA Tracker (live R2) — link complaints to CAPAs for corrective actions

## Wiring in server/index.js
```js
// Require at top
const complaintRoutes = require('./routes/complaint-mgr');
const { makeComplaintService } = require('./services/complaint-mgr.service');

// Instantiate service
const complaintService = makeComplaintService({ supabase, auditLog, anthropic });

// Add to PAGE_MAP
'complaints.html': 'qa/complaints.html',

// Mount routes
complaintRoutes(app, { auth: requireAuth, complaintService });
```

## Frontend Page: docs/qa/complaints.html

### Layout
Split-panel: list (left) + detail (right), matching `docs/qa/deviations.html`.

### Features

1. **Complaint List** (left panel)
   - Filterable by status (received, triaging, investigating, pending_capa, pending_response, closed, void), complaint type, severity (critical, major, minor), source (customer, internal, regulatory, distributor)
   - Search by complaint ID, title, batch number, product name, complainant name
   - Severity color coding (critical=red, major=orange, minor=green)
   - Reportable indicator badge (red exclamation icon)
   - Regulatory deadline warning badge (amber clock icon when report_deadline is within 3 days or overdue)
   - Days-open counter for open complaints
   - SLA status indicator (green/amber/red based on time-in-status vs SLA targets)
   - Tab toggle: "Complaints" / "Recalls" to switch list view

2. **Complaint Detail** (right panel)
   - Header: complaint ID, title, status badge, severity badge, reportable flag, priority badge
   - **Complainant info section:** name, contact, organisation, country
   - **Product/batch info section:** product name, product strength, dosage form, batch number, lot number, date of event
   - Description and immediate action taken
   - **Status workflow bar:** Received -> Triaging -> Investigating -> Pending CAPA -> Pending Response -> Closed
     - Each step clickable with confirmation modal for state transitions
     - "Void" option available from any pre-closed state with justification required
   - **Investigation section:** investigation notes, root cause, initial risk assessment
     - "Decline Investigation" button with mandatory justification field (FDA requirement)
     - "Other Batches Checked" checkbox and related batch findings textarea (EU GMP Chapter 8)
   - **Reply to Complainant section:** reply text field, reply date (FDA 211.198(b) field 5)
   - **Follow-up section:** follow-up notes, follow-up date (FDA 211.198(b) field 8)
   - **Regulatory Reporting section:**
     - Reportable toggle
     - Report type dropdown (MedWatch, Field Alert, CIOMS, Vigilance)
     - Report number field
     - Report deadline date (auto-calculated: 15 days for biologics adverse events, 3 days for field alerts)
     - Report submitted date
     - "Within Deadline" indicator (auto-computed green/red)
     - AI: "Draft Report" button — generates pre-filled MedWatch/Field Alert draft
   - **EU GMP Compliance section:**
     - Counterfeit assessed checkbox + notes
     - Competent authority notified checkbox + date
     - Rapid alert issued checkbox
   - **Sample tracking section:** sample available, sample tested, temperature excursion checkboxes
   - **Linked records:** deviation link, CAPA link, recall link (clickable links to other modules)
   - **Affected batches list** with expand to see batch details
   - **AI Panels** (collapsible cards):
     - Auto-classification result with confidence score, reasoning, and reportability assessment
     - Batch impact analysis with risk assessment and affected batch map
     - Trend summary with alert tier badge (signal/trend/alarm)
     - Predictive recall risk score (0-100 gauge visualisation with contributing factors)
   - **Audit trail timeline** (bottom of detail panel)

3. **Create Complaint Modal**
   - Title, description
   - Complaint type dropdown — expanded taxonomy: product_quality, adverse_event, adverse_reaction, packaging_integrity, labelling_error, potency_failure, sterility_failure, particulate_matter, delivery_logistics, counterfeit_suspect, device_malfunction, stability_failure
   - Source dropdown (customer, internal, regulatory, distributor)
   - Severity dropdown (critical, major, minor)
   - Product name, product strength, dosage form
   - Batch number, lot number
   - Date of event
   - Complainant details (name, contact, organisation, country)
   - Immediate action taken
   - Sample available checkbox
   - AI: "Auto-Classify" button — fills type, severity, reportability assessment with reasoning and confidence

4. **Initiate Recall Modal**
   - Title, reason/description
   - Recall classification dropdown (Class I, Class II, Class III) with colour coding and description of each class
   - Recall depth dropdown (Wholesale, Retail, Consumer/User)
   - Affected batches (multi-select or comma-separated)
   - Affected markets
   - Distribution data summary
   - Units distributed
   - Public notification method (Press Release, Direct Notification, Both, None)
   - Effectiveness check level (A/B/C/D/E) with description of each level
   - Linked complaint ID (auto-populated if initiated from complaint detail)
   - Target completion date
   - AI: "Assess Scope" button — analyses batch and distribution data, generates draft health hazard evaluation

5. **Recall Detail Panel** (within complaint detail or standalone view)
   - Recall ID, status, classification badge (Class I=red, Class II=orange, Class III=yellow)
   - **Recall workflow bar:** Initiated -> Strategy Approved -> Notifications Sent -> In Progress -> Effectiveness Checking -> Pending Termination -> Terminated
   - Health hazard evaluation summary (structured display of JSONB data)
   - Recall depth and public notification method
   - Affected batches and markets
   - **Recovery tracking:** units distributed vs recovered, recovery rate percentage with progress bar
   - **Consignee tracking table:** consignee name, notified date, responded (yes/no), quantity accounted, action taken — editable inline
   - **Notification status checklist** (FDA, EMA, HPRA, etc.) with dates
   - **Status report log:** list of periodic status report dates submitted to FDA
   - Effectiveness check level and results
   - AI scope assessment summary
   - Lessons learned field (populated at termination)
   - Closure and final report

6. **Stats Dashboard** (top of page)
   - Total open complaints by severity (stacked bar or donut chart)
   - Complaints received this month vs previous month (with delta percentage)
   - Average time to close (last 30 days)
   - Active recalls count (with class breakdown)
   - Reportable complaints count with approaching deadlines highlighted
   - SLA adherence rate (% of complaints triaged within 24h, investigated on time, closed on time)
   - Trend sparkline (complaints over last 12 months)
   - AI: Predictive recall risk alerts banner (if any product/batch has risk score > 0.6, show amber/red warning)

### Required imports
```html
<link rel="stylesheet" href="/shared/styles.css">
<script src="/shared/nav.js"></script>
<script src="/shared/i18n.js"></script>
<script src="/shared/dev-progress.js"></script>
```

Use `authFetch()` for all API calls. Use CSS variables from shared/styles.css (dark theme).

## Complaint Status Lifecycle
```
received -> triaging -> investigating -> pending_capa -> pending_response -> closed
                   \                                                      /
                    \--> void (from any pre-closed state, requires justification)
```

**SLA Targets (build into service layer for dashboard reporting):**
- Triage: within 24 hours of receipt
- Reportable determination: within 3 calendar days
- Critical complaints investigation start: within 24 hours of triage
- Major complaints investigation start: within 5 business days
- Minor complaints investigation start: within 10 business days
- Investigation completion: 30 days (critical), 60 days (major), 90 days (minor)
- Closure: within 30 days of CAPA completion

## Recall Status Lifecycle
```
initiated -> strategy_approved -> notifications_sent -> in_progress -> effectiveness_checking -> pending_termination -> terminated
```

## Regulatory Compliance Notes

**FDA 21 CFR 211.198 — Complaint Files:**
All 8 mandatory record fields are present in the schema: (1) product name + strength, (2) lot number, (3) complainant name, (4) nature of complaint, (5) reply to complainant, (6) investigation findings, (7) corrective action, (8) follow-up. If investigation is declined, `investigation_declined_reason` is required.

**FDA 21 CFR Part 7 — Recalls:**
Recall classification (Class I/II/III), recall depth, health hazard evaluation, effectiveness check levels (A-E), consignee tracking, periodic status reports, and FDA recall number are all captured.

**EU GMP Chapter 8:**
Counterfeit assessment, competent authority notification, rapid alert system, and cross-batch checking fields are included. Every complaint must have `counterfeit_assessed` addressed.

**ICH Q10:**
Cross-module linkage (complaints -> deviations -> CAPAs) supports knowledge management mandate. AI trend detection directly implements ICH Q10 Section 3.2.1 knowledge management. Complaint data feeds into management review via stats/trends endpoints.

**Retention:** Soft-delete only. Complaints use `archived_at`/`archived_by`. Recall records are never archivable (permanent retention). This is non-negotiable for 21 CFR Part 11 compliance.

## Architecture Rules
- Service factory pattern: `module.exports = { makeComplaintService }`
- Use `requireAuth` and `requireRole('qa')` middleware on all write routes; `requireAuth` on read routes
- Use `requireRole('director')` on recall approval (`approve-strategy`) and recall termination (`terminate`)
- Use `auditLog()` for all create/update/delete/close/status-change operations — every mutation gets an audit entry
- Soft-delete only — never hard-delete complaint or recall records
- All AI classification outputs stored as structured JSONB (not plain text) for queryability
- Service layer should compute SLA metrics (days_open, days_to_triage, days_to_close) for dashboard
- Service layer should compute `reported_within_deadline` on report submission
- Cross-module queries: complaint service should validate deviation and CAPA links exist when set
- Frontend: `authFetch()` for all API calls
- Frontend: dark theme (--bg, --surface, --accent CSS vars)
- Frontend: split-panel layout (list left, detail right)
- No frameworks — vanilla HTML/CSS/JS only
- 21 CFR Part 11 compliant: immutable audit trail on every field change

## Reference files (copy patterns from)
- `docs/qa/deviations.html` — layout, styling, split-panel pattern
- `server/services/deviation-mgr.service.js` — service factory with AI features
- `server/routes/deviation-mgr.js` — route pattern with auth guards
- `server/lib/ids.js` — ID generator pattern
- `server/lib/audit.js` — audit logging
