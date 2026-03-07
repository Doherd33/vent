# Agent 3 — Batch Disposition
# Branch: feature/batch-disposition
# Phase: 1 — Quality Core
# Complexity: M (5 days)

## What to build
Batch disposition and QP (Qualified Person) release system. This is the final QA gate before product release. QA reviews completed batch records, open deviations, pending CAPAs, test results, and all associated documentation. The system provides a structured review checklist, AI-powered pre-screening for anomalies, and a formal QP release/reject decision with electronic signature. Must support review-by-exception (RBE): AI classifies each checklist item as cleared/informational/flagged/critical so the reviewer focuses only on exceptions.

Must comply with EU GMP Annex 16 (QP certification register, personal certification, quality system confirmations), FDA 21 CFR 211.22/188/192 (QCU authority, batch record review, discrepancy investigation), ICH Q7 Section 11 (laboratory controls, OOS investigation, CoA requirements), 21 CFR Part 11 (e-signatures, audit trails), and EU GMP Annex 11 (computerised systems, ALCOA+ data integrity). Supports conditional release workflow for batches with pending results (e.g., sterility, stability).

## Files to create
- `docs/qa/dispositions.html` (frontend page)
- `server/services/batch-disposition.service.js` (service layer)
- `server/routes/batch-disposition.js` (API routes)

## Files to modify (additions only)
- `server/routes/admin.js` — add CREATE TABLE statements
- `server/index.js` — wire service + mount routes + add PAGE_MAP entry
- `server/lib/ids.js` — add ID generators

## Database Tables
Add to `server/routes/admin.js`:

### batch_dispositions
```sql
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
```

### disposition_checklists
```sql
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
```

### qp_certification_register
EU GMP Annex 16 requires a register of all batch certifications. This table provides a dedicated, immutable certification log separate from the disposition record, ensuring the register is always available for inspection and export.

```sql
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
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'qp_certification_register_all') THEN
    CREATE POLICY qp_certification_register_all ON qp_certification_register FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;
```

## ID Generators
Add to `server/lib/ids.js`:
- `dispositionId()` → `DISP-1000…9999`
- `dispositionCheckId()` → `DCHK-1000…9999`
- `certRegisterId()` → `CERT-1000…9999`

## API Endpoints

### Core CRUD
- `POST /dispositions` — create a new batch disposition record (auto-generates default checklist from template)
- `GET /dispositions` — list all (filter by status, product_name, batch_number, priority, reviewer, qp_decision)
- `GET /dispositions/:dispId` — single disposition with checklist items
- `PUT /dispositions/:dispId` — update disposition record

### Review Workflow
- `POST /dispositions/:dispId/start-review` — start QA review (status: pending_review → in_review)
- `POST /dispositions/:dispId/checklist` — add checklist item
- `GET /dispositions/:dispId/checklist` — get all checklist items for a disposition
- `PUT /dispositions/:dispId/checklist/:checkId` — update checklist item (mark complete, add finding, override AI classification with justification)
- `POST /dispositions/:dispId/hold` — place batch on hold with reason (status → on_hold)

### QP Decision
- `POST /dispositions/:dispId/release` — QP release decision (status: in_review → released) — requires e-signature with meaning. Creates entry in qp_certification_register. Blocks if any checklist items have ai_classification='critical' and status='pending' unless override justification provided.
- `POST /dispositions/:dispId/reject` — QP reject decision (status: in_review → rejected) — requires rejection_reason and rejection_disposition (destroy/reprocess/rework/return_to_supplier)
- `POST /dispositions/:dispId/conditional-release` — conditional release with conditions text, expiry date (status: in_review → conditional_release). Creates entry in qp_certification_register with conditions noted. Body: `{ conditions, conditional_expiry, qp_name, qp_comments, signature_password, signature_meaning }`
- `PUT /dispositions/:dispId/conditional-release/resolve` — resolve conditional release: confirm final release or withdraw. Body: `{ final_disposition: 'confirmed_release' | 'withdrawn', reason }`

### QP Certification Register (Annex 16)
- `GET /dispositions/register` — export QP certification register (filter by date_from, date_to, product_name, qp_name). Returns all certification entries in Annex 16-compliant format. Supports `?format=csv` for CSV export.
- `GET /dispositions/register/:certId` — single certification entry detail

### Exception Dashboard (RBE)
- `GET /dispositions/exceptions` — all flagged/critical checklist items across active dispositions (status in_review or conditional_release). Grouped by disposition. Enables QP to see all exceptions requiring attention in one view.

### Timeline & Audit
- `GET /dispositions/:dispId/timeline` — formatted audit trail timeline for the disposition, including all status changes, checklist updates, AI actions, and QP decisions with timestamps and user identity

### Stats
- `GET /dispositions/stats` — dashboard stats (pending count, in-review, conditional_release count, released this month, rejected, average review time, on-hold count, overdue conditional releases)

### AI Endpoints
- `POST /dispositions/:dispId/ai/prescreen` — AI: pre-screen batch record for anomalies. Classifies each checklist item as cleared/informational/flagged/critical. Returns overall risk score (0-100), anomaly list with severity, auto-cleared count, flagged count, blocking count, and confidence level. Logs all AI inputs and outputs to audit trail.
- `POST /dispositions/:dispId/ai/summary` — AI: generate structured review summary (batch overview, manufacturing summary, quality assessment, deviations/CAPAs, yield analysis, environmental monitoring, overall assessment, confidence level). Suitable for batch file inclusion.
- `POST /dispositions/:dispId/ai/recommend` — AI: QP release recommendation (release/conditional_release/reject) with supporting rationale, blocking items list, confidence level, and suggested conditions for conditional release if applicable. Clearly labelled as advisory.
- `POST /dispositions/:dispId/ai/missing-docs` — AI: flag missing documents against expected document list for product type
- `POST /dispositions/:dispId/ai/trend-analysis` — AI: compare current batch against last N batches of same product. Identify trends in yield, test results, deviation frequency. Flag any parameters drifting toward limits.
- `POST /dispositions/:dispId/ai/investigation-review` — AI: assess whether deviation investigations linked to the batch are scientifically adequate (root cause identified, impact assessment thorough, corrective actions proportionate)

## Role Access
- qa (all operations: create, review, checklist management, AI pre-screening)
- director (all operations, QP release/reject/conditional-release decisions, certification register access)
- Note: QP release/reject/conditional-release endpoints enforce that the user has 'director' role. The QP's identity, printed name, role, timestamp, and signature meaning are captured per 21 CFR Part 11 and EU GMP Annex 16.

## AI Features (use Anthropic Claude via service dependency)

All AI outputs must include reasoning/rationale (not just conclusions) for GMP explainability. All AI recommendations are clearly labelled as advisory — the QP/QCU retains full authority. All AI inputs, outputs, and any manual overrides are logged in the audit trail.

### Core AI Features
- **AI pre-screen batch records (RBE engine)** — analyse the batch disposition data (open deviations, CAPAs, test results, yield data, change controls) to identify anomalies and flag items requiring human review. Classify each checklist item using four-tier RBE classification: `cleared` (within all acceptance criteria, no human review required), `informational` (notable but within limits, optional review), `flagged` (outside criteria or anomalous, requires human review), `critical` (blocking issue, must resolve before release). Produce a quantitative risk score (0-100) based on weighted assessment. Log what was auto-cleared and on what basis so the QP can verify. Output format:
  ```json
  {
    "overall_risk_score": 23,
    "risk_level": "low",
    "anomalies": [
      {
        "category": "yield",
        "severity": "medium",
        "classification": "flagged",
        "description": "Actual yield (87.3%) below historical mean (92.1%) for Product X",
        "data": { "actual": 87.3, "expected": 92.1, "range": [85, 99], "historical_mean": 92.1 },
        "recommendation": "Investigate yield reduction. Check for process parameter deviations.",
        "checklist_item_id": "DCHK-1042"
      }
    ],
    "auto_cleared_count": 42,
    "informational_count": 2,
    "flagged_count": 3,
    "critical_count": 0,
    "confidence": 0.92
  }
  ```

- **Generate review summary** — produce a structured narrative summary following this format: (1) Batch Overview (product, batch number, size, dates, expiry), (2) Manufacturing Summary (key process parameters, any excursions), (3) Quality Assessment (IPC and release testing results, OOS investigations), (4) Deviations and CAPAs (summary, root causes, quality impact, CAPA status), (5) Yield Analysis (actual vs expected, historical comparison), (6) Environmental Monitoring (EM data summary, excursions), (7) Overall Assessment (cumulative risk, recommendation), (8) Confidence Level with explanation of uncertainties. Suitable for inclusion in the batch file.

- **QP release recommendation** — based on all available data, provide a recommendation (release / conditional_release / reject) with supporting rationale. Highlight any blocking items that must be resolved before release. Include confidence level. For conditional_release, suggest specific conditions (e.g., "pending sterility test results due 2026-03-10"). Clearly labelled as advisory.

- **Flag missing documents** — cross-reference the disposition checklist against expected documentation (batch record, deviation reports, CAPA records, test certificates, cleaning records, equipment logs, CoA, environmental monitoring reports) and identify any missing or incomplete items.

### Advanced AI Features (research-informed)
- **Trend analysis across batches** — compare current batch against last N batches of the same product. Identify yield trends, test result drift, deviation frequency changes, and any parameters trending toward specification limits. Flag statistical outliers (beyond 2 standard deviations from historical mean). Detect gradual process drift that may not trigger single-batch alerts.

- **Investigation adequacy assessment** — for each deviation investigation linked to the batch, assess whether it is scientifically adequate: root cause properly identified, quality impact assessment thorough, corrective actions proportionate to the issue. Flag investigations that appear superficial or incomplete.

- **Automated checklist verification** — where data is available from linked modules, auto-verify checklist items:
  | Checklist Item | Automation | Data Source |
  |---------------|------------|-------------|
  | Deviations closed/justified | Auto-query status | Deviation Manager |
  | CAPAs addressed | Auto-query status | CAPA Tracker |
  | Yield within range | Compare actual vs expected | Disposition record |
  | Equipment calibrated | Check calibration dates at time of use | Equipment Logbook (future) |
  | Cleaning records complete | Verify records exist and hold times | Cleaning Records (future) |

- **Predictive release assessment** — based on historical batch data, predict likelihood of release/reject/hold. Estimate review duration. Generate risk-ranked review queue sorted by risk score, expiry date urgency, and business criticality. For conditional releases with pending results (e.g., sterility), assess risk based on historical pass rates.

- **Anomaly detection (multivariate)** — beyond single-parameter checks, detect anomalies visible only when multiple parameters are considered together (e.g., yield normal but low relative to specific raw material lots). Identify unexpected correlations between parameters. Flag timeline anomalies (unusual gaps, backdated entries, unusually rapid step completions) as potential data integrity concerns.

## Dependencies
- CAPA Tracker (live R2) — pull open CAPAs linked to the batch
- Deviation Manager (live R1) — pull open/closed deviations, assess investigation adequacy
- Supplier Quality (live R2) — verify raw materials from approved suppliers (Annex 16 requirement)
- Equipment Logbook (live R1) — verify equipment calibration status at time of batch manufacture
- Cleaning Records (live R2) — verify cleaning records complete and hold times not exceeded
- QA Centre (live Phase 0) — integrate with existing QA review workflows

## Wiring in server/index.js
```js
// Require at top
const batchDispositionRoutes = require('./routes/batch-disposition');
const { makeBatchDispositionService } = require('./services/batch-disposition.service');

// Instantiate service
const batchDispositionService = makeBatchDispositionService({ supabase, auditLog, anthropic });

// Add to PAGE_MAP
'dispositions.html': 'qa/dispositions.html',

// Mount routes
batchDispositionRoutes(app, { auth: requireAuth, batchDispositionService });
```

## Frontend Page: docs/qa/dispositions.html

### Layout
Split-panel: list (left) + detail (right), matching `docs/qa/deviations.html`.

### Features
1. **Disposition List** (left panel)
   - Filterable by status (pending_review, in_review, on_hold, conditional_release, released, rejected), priority (normal, urgent, critical), product name
   - Search by disposition ID, batch number, product name
   - Status color coding (pending=gold, in_review=blue, on_hold=orange, conditional_release=purple, released=green, rejected=red)
   - Priority badge (urgent=orange, critical=red)
   - Days-pending counter
   - AI risk score badge (0-100, color-coded: green <30, gold 30-70, red >70)
   - AI pre-screen status indicator (screened/not-screened)
   - Conditional release expiry warning (amber if within 7 days, red if overdue)

2. **Disposition Detail** (right panel)
   - Header: disposition ID, batch number, product name, status badge, priority badge, AI risk score badge
   - Batch info: start date, end date, batch size, yield (actual vs expected), regulatory framework (EU GMP / FDA)
   - Status workflow: Pending Review → In Review → (On Hold) → Released / Conditional Release / Rejected
   - **Review checklist section (RBE-enabled)**: categorised checklist items (batch record, deviations, CAPAs, test results, cleaning, equipment, environmental monitoring, change controls, label reconciliation, raw materials) with:
     - Four-tier AI classification badges: cleared (green check, collapsed by default), informational (blue info icon), flagged (amber warning, expanded), critical (red block, expanded and highlighted)
     - Status toggles, findings text, severity selector
     - Override button: reviewer can override AI classification with documented justification
     - Acceptance criteria shown for each item
     - "Show cleared items" toggle (collapsed by default for RBE workflow)
   - Open deviations list with links and investigation adequacy indicator
   - Open CAPAs list with links
   - Open change controls list (unevaluated changes flagged per Annex 16)
   - Test results summary table with spec limits and pass/fail indicators
   - Missing documents list
   - **Batch comparison panel** (collapsible): current batch vs last 5-10 batches of same product on key metrics (yield, test results, deviation count, review time). Sparkline charts for trend visualization.
   - AI panels: pre-screen results (anomalies with risk scores and classification), review summary, release recommendation with confidence, trend analysis results
   - QP decision section: release/conditional-release/reject with e-signature (captures printed name, role, timestamp, meaning per Part 11), comments, date
   - Conditional release section (shown when status=conditional_release): conditions text, expiry date, countdown timer, resolve button (confirm release / withdraw)
   - Audit trail timeline

3. **Create Disposition Modal**
   - Batch number, product name
   - Batch start/end dates
   - Batch size, expected yield, actual yield
   - Priority dropdown (normal, urgent, critical)
   - Expiry date
   - Notes

4. **QP Decision Modal**
   - Decision: Release / Conditional Release / Reject
   - QP name (auto-filled from logged-in user)
   - QP role (auto-filled)
   - Signature meaning dropdown: "batch certified for release" / "batch certified for conditional release" / "batch rejected" (auto-set based on decision, editable)
   - Comments (required for reject and conditional release)
   - For Conditional Release: conditions text field, condition expiry date picker
   - For Reject: rejection reason (required), rejection disposition dropdown (destroy / reprocess / rework / return_to_supplier)
   - E-signature confirmation (password re-entry) — captures user identity, timestamp, and meaning per 21 CFR Part 11
   - Warning banner if any checklist items are ai_classification='critical' and still pending
   - Warning banner if any open deviations are unresolved (per Annex 16 / 211.192)
   - Release date (for release) / Rejection reason (for reject)

5. **Checklist Management**
   - Default checklist template auto-generated on disposition creation:
     - Batch record completeness (all pages present, all fields completed, all signatures obtained)
     - All deviations closed or justified (per Annex 16 / 211.192)
     - All CAPAs addressed (effectiveness verified or approved timeline)
     - In-process test results within specification
     - Release test results within specification (identity, strength, quality, purity per 211.165)
     - Cleaning records complete (hold times not exceeded, cleaning agent residue within limits)
     - Equipment logs reviewed (qualified, calibrated, cleaned per 211.182)
     - Environmental monitoring data acceptable (viable and non-viable within limits)
     - Label reconciliation complete (received, used, damaged, returned reconciled)
     - Yield within acceptable range (per 211.192 — investigate unexplained discrepancies)
     - Raw materials from approved suppliers (released by QC, within expiry — per Annex 16)
     - Change controls evaluated (all changes since last QP certification assessed — per Annex 16)
     - Process parameters within validated ranges (CPPs, hold times)
     - OOS investigations complete (if any — per ICH Q7 Section 11)
   - Each item includes: acceptance_criteria (configurable per product type), status toggle, findings text, severity selector
   - Each item displays AI classification badge (cleared/informational/flagged/critical) with AI reasoning
   - Reviewer can override AI classification with documented justification (logged to audit trail)
   - Cleared items collapsed by default (RBE workflow — reviewer focuses on flagged/critical)
   - AI: "Pre-Screen All" button — runs AI analysis, classifies all items, updates ai_classification and ai_reason fields
   - AI: "Verify Linked Data" button — auto-queries deviation manager, CAPA tracker, and equipment logbook to verify linked checklist items

6. **Stats Dashboard** (top)
   - Batches pending review
   - Batches in review
   - Conditional releases (with overdue count highlighted)
   - Released this month
   - Rejected this month
   - Average review time (days) — target: 1-3 days per industry benchmark
   - On-hold count
   - Right-first-time rate (% of batches passing QA review without return for corrections)

7. **Exception Dashboard** (tab view)
   - Shows all flagged/critical checklist items across all active dispositions (in_review, conditional_release)
   - Grouped by disposition, sorted by severity (critical first)
   - Enables the QP to see all exceptions requiring attention in a single view
   - Click-through to disposition detail
   - Filter by category, severity, product

8. **QP Certification Register** (tab view)
   - Annex 16-compliant register of all batch certifications
   - Columns: batch number, product name, batch size, QP name, certification date, decision, conditions (if conditional), batch reference
   - Filterable by date range, product, QP name
   - Export to CSV button
   - Searchable by batch number or QP name

### Required imports
```html
<link rel="stylesheet" href="/shared/styles.css">
<script src="/shared/nav.js"></script>
<script src="/shared/i18n.js"></script>
<script src="/shared/dev-progress.js"></script>
```

Use `authFetch()` for all API calls. Use CSS variables from shared/styles.css (dark theme).

## Architecture Rules
- Service factory pattern: `module.exports = { makeBatchDispositionService }`
- Use `requireAuth` and `requireRole('qa')` middleware on all routes
- Use `requireRole('director')` on release/reject/conditional-release endpoints
- Use `auditLog()` for all create/update/release/reject/conditional-release operations
- Log all AI inputs and outputs to audit trail (pre-screen, summary, recommendation, trend analysis)
- Log all reviewer overrides of AI classifications with justification
- Frontend: `authFetch()` for all API calls
- Frontend: dark theme (--bg, --surface, --accent CSS vars)
- Frontend: split-panel layout (list left, detail right) with tab navigation for Exception Dashboard and QP Register
- No frameworks — vanilla HTML/CSS/JS only
- 21 CFR Part 11 compliant: immutable audit trail, e-signature on QP release/reject/conditional-release
- EU GMP Annex 16 compliant: QP certification register, personal certification, quality system confirmations
- EU GMP Annex 11 compliant: ALCOA+ data integrity, electronic signatures permanently linked to records
- AI outputs clearly labelled as advisory — never presented as decisions
- AI outputs include reasoning/rationale for GMP explainability
- qp_certification_register table is append-only (no UPDATE/DELETE operations)

## Regulatory Compliance Checklist
The agent building this module must ensure:
- [ ] E-signature captures: user identity (printed name), role, password re-entry, timestamp, and meaning (21 CFR Part 11)
- [ ] Audit trail is immutable and captures all changes with before/after values (Part 11, Annex 11)
- [ ] QP certification register data can be exported in Annex 16-compliant format (CSV)
- [ ] Open/unresolved deviations block or prominently warn against release (Annex 16, 211.192)
- [ ] Unexplained yield discrepancies flagged for investigation (211.192)
- [ ] All checklist items have documented acceptance criteria (RBE foundation)
- [ ] AI outputs include reasoning/rationale, not just conclusions (GMP explainability)
- [ ] AI recommendations clearly labelled as advisory, not decisions (regulatory boundary)
- [ ] All AI inputs and outputs logged in the audit trail
- [ ] Reviewer can override any AI classification with documented justification
- [ ] Role-based access: only director role can perform release/reject/conditional-release
- [ ] Rejection requires documented reason and disposition plan (destroy/reprocess/rework/return)
- [ ] Conditional release tracks conditions, expiry date, and final disposition
- [ ] Raw material supplier approval status verified (Annex 16)
- [ ] Change controls since last QP certification flagged for evaluation (Annex 16)

## Competitive Differentiation
Vent's batch disposition module differentiates against established competitors on three axes:

| Capability | Veeva Vault | Siemens SIPAT | Tulip | MasterControl | **Vent** |
|-----------|-------------|---------------|-------|---------------|----------|
| QP Release Workflow | Yes | No | No | Partial | **Yes** |
| Checklist Verification | Yes | No | Partial | Yes | **Yes (AI-assisted)** |
| Review by Exception | No | Yes | Partial | No | **Yes (AI-powered, 4-tier)** |
| AI Pre-Screening | No | No | No | No | **Yes (LLM + rules)** |
| AI Anomaly Detection | No | Partial (MVDA) | No | No | **Yes (contextual LLM)** |
| AI Summary Generation | No | No | No | No | **Yes** |
| Trend Analysis | No | Yes (statistical) | No | No | **Yes (LLM + statistical)** |
| Conditional Release | Partial | No | No | No | **Yes (tracked workflow)** |
| Deviation Integration | Yes | No | No | Yes | **Yes** |
| CAPA Integration | Yes | No | No | Yes | **Yes** |
| QP Certification Register | Partial | No | No | No | **Yes (Annex 16)** |
| Electronic Signatures | Yes | No | No | Yes | **Yes (Part 11)** |
| Immutable Audit Trail | Yes | Partial | Partial | Yes | **Yes** |
| Cost | $$$$ | $$$$ | $$ | $$$ | **$** |

**Key differentiators:**
1. **AI-First**: No competitor offers LLM-powered pre-screening, contextual anomaly detection, summary generation, and release recommendations. First-mover advantage.
2. **Integrated + Lightweight**: Deviation, CAPA, equipment, supplier, and batch disposition integration in a lightweight, fast-to-deploy package vs Veeva's complexity and cost.
3. **RBE + AI**: Structured four-tier RBE classification (cleared/informational/flagged/critical) combined with AI contextual analysis. No competitor offers this combination.

## Reference files (copy patterns from)
- `docs/qa/deviations.html` — layout, styling, split-panel pattern
- `server/services/deviation-mgr.service.js` — service factory with AI features
- `server/routes/deviation-mgr.js` — route pattern with auth guards
- `server/lib/ids.js` — ID generator pattern
- `server/lib/audit.js` — audit logging
