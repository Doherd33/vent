# Agent 1 — Change Control
# Branch: feature/change-control
# Phase: 1 — Quality Core
# Complexity: L (7 days)

## What to build
Change control management system. Every change to equipment, processes, materials, facilities, or documentation in a GMP biologics facility must go through formal change control per 21 CFR 211.100(b), EU GMP Annex 15 (Paras 12-14), and ICH Q10 Section 3.2.4. This module manages the full ICH Q10 four-stage lifecycle: evaluation (initiation + cross-functional impact assessment), approval (multi-level workflow with tiered approval matrix), implementation (task tracking with dependency ordering), and effectiveness review (objective criteria defined at approval, evaluated post-implementation). Supports regulatory classification against both FDA SUPAC levels (1/2/3) and EU Variation types (IA/IAIN/IB/II). Includes urgency pathways (planned, urgent, emergency) with expedited workflows for safety-critical changes. Provides structured FMEA-style risk scoring (severity x probability x detectability) per ICH Q9 principles. Links to deviations (root cause changes) and CAPAs (corrective action changes). AI-native features provide cross-functional impact prediction, regulatory classification, implementation checklist generation, affected SOP identification via RAG, similar change finding via vector search, and effectiveness criteria suggestion — differentiating Vent from incumbents (MasterControl, Veeva, TrackWise) that lack built-in AI for change control.

## Files to create
- `docs/qa/change-control.html` (frontend page)
- `server/services/change-control.service.js` (service layer)
- `server/routes/change-control.js` (API routes)

## Files to modify (additions only)
- `server/routes/admin.js` — add CREATE TABLE statements
- `server/index.js` — wire service + mount routes + add PAGE_MAP entry
- `server/lib/ids.js` — add ID generators

## Database Tables
Add to `server/routes/admin.js`:

### change_controls
```sql
CREATE TABLE IF NOT EXISTS change_controls (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cc_id                 TEXT UNIQUE NOT NULL,
  title                 TEXT NOT NULL,
  description           TEXT NOT NULL DEFAULT '',
  change_type           TEXT NOT NULL DEFAULT 'process',
  -- change_type values: process, equipment, material, facility, documentation, system, analytical
  sub_category          TEXT DEFAULT '',
  -- sub_category: granular classification within change_type (e.g. for equipment: like-for-like, upgrade, new, relocation, software-update; for process: parameter, ipc, batch-size, hold-time, step-change, cleaning, sterilisation)
  category              TEXT NOT NULL DEFAULT 'minor',
  -- category values: minor, moderate, major, critical (maps to research Section 2.2 impact levels)
  status                TEXT DEFAULT 'draft',
  -- status workflow: draft → submitted → under-review → approved → implementing → closed | rejected
  priority              TEXT DEFAULT 'medium',
  urgency               TEXT DEFAULT 'planned',
  -- urgency values: planned (standard workflow), urgent (expedited 48h SLAs), emergency (implement immediately, retrospective documentation within 24h)
  regulatory_class      TEXT DEFAULT 'none',
  -- regulatory_class values: none, type-ia, type-iain, type-ib, type-ii (EU Variations Reg EC 1234/2008)
  regulatory_filing_type TEXT DEFAULT '',
  -- regulatory_filing_type: specific filing mechanism — FDA: annual-report, cbe-30, pas; EU: type-ia, type-iain, type-ib, type-ii, extension
  originator            TEXT NOT NULL,
  originator_dept       TEXT DEFAULT '',
  affected_departments  JSONB DEFAULT '[]',
  affected_sops         JSONB DEFAULT '[]',
  affected_equipment    JSONB DEFAULT '[]',
  affected_batches      JSONB DEFAULT '[]',
  justification         TEXT DEFAULT '',
  proposed_change       TEXT DEFAULT '',
  risk_assessment       TEXT DEFAULT '',
  -- Structured FMEA risk scoring per ICH Q9 (severity x probability x detectability)
  risk_severity         INTEGER DEFAULT 0,
  -- risk_severity: 1-5 scale (1=negligible, 5=catastrophic)
  risk_probability      INTEGER DEFAULT 0,
  -- risk_probability: 1-5 scale (1=rare, 5=almost certain)
  risk_detectability    INTEGER DEFAULT 0,
  -- risk_detectability: 1-5 scale (1=easily detected, 5=undetectable)
  risk_rpn              INTEGER DEFAULT 0,
  -- risk_rpn: Risk Priority Number = severity x probability x detectability (auto-calculated, 1-125)
  ccb_required          BOOLEAN DEFAULT false,
  -- ccb_required: true if Change Control Board review is needed (auto-set for major/critical changes)
  effectiveness_criteria TEXT DEFAULT '',
  -- effectiveness_criteria: objective criteria defined during approval stage, evaluated post-implementation (ICH Q10 3.2.4(d))
  implementation_plan   TEXT DEFAULT '',
  implementation_date   DATE,
  target_completion     DATE,
  actual_completion     DATE,
  effectiveness_check   TEXT DEFAULT '',
  effectiveness_date    DATE,
  effectiveness_result  TEXT DEFAULT '',
  -- effectiveness_result values: pending, effective, partially-effective, not-effective
  effectiveness_due_date DATE,
  -- effectiveness_due_date: auto-set based on change type (30-90 days post-implementation)
  linked_deviation_id   TEXT DEFAULT '',
  linked_capa_id        TEXT DEFAULT '',
  linked_audit_finding  TEXT DEFAULT '',
  -- linked_audit_finding: cross-reference to triggering audit finding
  ai_impact_summary     TEXT DEFAULT '',
  ai_reg_classification TEXT DEFAULT '',
  ai_risk_score         JSONB DEFAULT '{}',
  -- ai_risk_score: AI-suggested FMEA scores with reasoning { severity, probability, detectability, rpn, reasoning }
  ai_checklist          JSONB DEFAULT '[]',
  ai_affected_sops      JSONB DEFAULT '[]',
  ai_similar_changes    JSONB DEFAULT '[]',
  -- ai_similar_changes: vector-search results of similar past change controls with outcomes
  ai_effectiveness_criteria TEXT DEFAULT '',
  -- ai_effectiveness_criteria: AI-suggested objective effectiveness criteria
  closure_notes         TEXT DEFAULT '',
  sla_assessment_due    DATE,
  -- sla_assessment_due: deadline for impact assessment completion (default: 5 business days from submission)
  sla_approval_due      DATE,
  -- sla_approval_due: deadline for approval completion (default: 3 business days from assessment complete)
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
```

### cc_impact_assessments
```sql
CREATE TABLE IF NOT EXISTS cc_impact_assessments (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id     TEXT UNIQUE NOT NULL,
  cc_id             TEXT NOT NULL REFERENCES change_controls(cc_id),
  department        TEXT NOT NULL,
  -- department values: qa, qc, regulatory, production, engineering, msat, validation, facilities, supply-chain, ehs, it-automation
  assessor          TEXT NOT NULL,
  impact_level      TEXT DEFAULT 'none',
  -- impact_level values: none, low, medium, high
  impact_details    TEXT DEFAULT '',
  mitigation        TEXT DEFAULT '',
  validation_required BOOLEAN DEFAULT false,
  validation_type   TEXT DEFAULT '',
  -- validation_type: specific revalidation needed — iq, oq, pq, process-validation, cleaning-validation, method-validation, csv (per EU GMP Annex 15 Para 44)
  regulatory_impact BOOLEAN DEFAULT false,
  cascade_impacts   TEXT DEFAULT '',
  -- cascade_impacts: second-order effects identified (e.g. SOP update triggers training, spec change triggers method validation)
  status            TEXT DEFAULT 'pending',
  -- status values: pending, in-progress, completed
  due_date          DATE,
  -- due_date: SLA deadline for this department's assessment
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
```

### cc_approvals
```sql
CREATE TABLE IF NOT EXISTS cc_approvals (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cc_id           TEXT NOT NULL REFERENCES change_controls(cc_id),
  approver        TEXT NOT NULL,
  approver_role   TEXT NOT NULL,
  approval_tier   INTEGER DEFAULT 1,
  -- approval_tier: 1=departmental, 2=cross-functional, 3=CCB/site director. Tiered per change category.
  decision        TEXT DEFAULT 'pending',
  -- decision values: pending, approved, rejected, request-info
  signature_meaning TEXT DEFAULT '',
  -- signature_meaning: per 21 CFR Part 11.10(k) — "review", "approval", "responsibility", "authorship"
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
```

### cc_implementation_tasks
```sql
CREATE TABLE IF NOT EXISTS cc_implementation_tasks (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id         TEXT UNIQUE NOT NULL,
  cc_id           TEXT NOT NULL REFERENCES change_controls(cc_id),
  title           TEXT NOT NULL,
  description     TEXT DEFAULT '',
  task_order      INTEGER DEFAULT 0,
  -- task_order: dependency ordering (AI-generated, lower numbers first)
  assigned_to     TEXT DEFAULT '',
  assigned_role   TEXT DEFAULT '',
  status          TEXT DEFAULT 'pending',
  -- status values: pending, in-progress, completed, blocked
  due_date        DATE,
  completed_at    TIMESTAMPTZ,
  completed_by    TEXT DEFAULT '',
  verification_required BOOLEAN DEFAULT false,
  -- verification_required: true for tasks needing QA verification before marking complete
  verified_by     TEXT DEFAULT '',
  verified_at     TIMESTAMPTZ,
  effort_estimate TEXT DEFAULT '',
  -- effort_estimate: estimated effort (hours/days) — AI-suggested
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
```

## ID Generators
Add to `server/lib/ids.js`:
- `changeControlId()` → `CC-1000…9999`
- `ccImpactId()` → `CCIA-1000…9999`
- `ccTaskId()` → `CCTK-1000…9999`

## API Endpoints

### Core CRUD
- `POST /change-controls` — create a new change control (auto-generates CC-ID, sets SLA dates based on urgency)
- `GET /change-controls` — list all (filter by status, change_type, priority, urgency, regulatory_class, originator, category, ccb_required, overdue)
- `GET /change-controls/:ccId` — single change control with impact assessments, approvals, and implementation tasks
- `PUT /change-controls/:ccId` — update change control (auto-calculates risk_rpn when severity/probability/detectability change)

### Workflow Transitions
- `POST /change-controls/:ccId/submit` — submit for impact assessment (draft → submitted). Sets sla_assessment_due. For emergency urgency: skips to approved with retrospective flag.
- `POST /change-controls/:ccId/review` — move to under-review when all impact assessments are complete (submitted → under-review). Auto-sets ccb_required for major/critical categories.
- `POST /change-controls/:ccId/approve` — record approval decision (approve/reject/request-info). Captures signature_meaning per 21 CFR Part 11.10(k). Requires all tier-appropriate approvals for status transition.
- `POST /change-controls/:ccId/implement` — mark as implementation started (approved → implementing). Blocked if regulatory_filing_type requires pre-approval and filing is incomplete.
- `POST /change-controls/:ccId/close` — close with effectiveness check (implementing → closed). Blocked if any implementation tasks are incomplete or effectiveness_result is empty. Sets actual_completion date.

### Impact Assessments
- `POST /change-controls/:ccId/impact` — add/update impact assessment for a department (includes validation_type and cascade_impacts)
- `GET /change-controls/:ccId/impacts` — list all impact assessments for a change control

### Approvals
- `GET /change-controls/:ccId/approvals` — list all approval records

### Implementation Tasks
- `POST /change-controls/:ccId/tasks` — add implementation task (manual or from AI checklist)
- `GET /change-controls/:ccId/tasks` — list all tasks for a change control (ordered by task_order)
- `PUT /change-controls/:ccId/tasks/:taskId` — update task status/assignment
- `POST /change-controls/:ccId/tasks/:taskId/verify` — QA verification of completed task (sets verified_by, verified_at)

### Dashboard & Analytics
- `GET /change-controls/stats` — dashboard stats (open count, overdue, by category, by status, by urgency, avg cycle time, SLA compliance rate)
- `GET /change-controls/overdue` — list all changes with overdue SLAs (assessment, approval, implementation, or effectiveness)

### AI Endpoints
- `POST /change-controls/:ccId/ai/impact` — AI: auto-assess cross-functional impact with department-specific narratives and cascade detection
- `POST /change-controls/:ccId/ai/classify` — AI: suggest regulatory classification (EU variation type + FDA SUPAC level) with confidence score
- `POST /change-controls/:ccId/ai/checklist` — AI: generate implementation checklist with dependency ordering, effort estimates, and responsible roles
- `POST /change-controls/:ccId/ai/sops` — AI: identify affected SOPs via RAG with relevance scores
- `POST /change-controls/:ccId/ai/risk` — AI: suggest FMEA risk scores (severity, probability, detectability) with reasoning
- `POST /change-controls/:ccId/ai/similar` — AI: find similar past change controls via vector search, surface outcomes and lessons learned
- `POST /change-controls/:ccId/ai/effectiveness` — AI: suggest objective effectiveness criteria based on change type and implementation plan

## Role Access
- qa (all operations — create, approve, close, AI endpoints)
- regulatory (view all, approve tier 2+, impact assessment, regulatory classification review)
- engineering (view all, impact assessment, implementation task updates)
- msat (view all, impact assessment, implementation task updates)
- production (view all, impact assessment, implementation task updates)
- qc (view all, impact assessment)
- validation (view all, impact assessment — specifically validation_required and validation_type fields)
- facilities (view all, impact assessment)
- ehs (view all, impact assessment)
- director (view all, approve tier 3 / CCB, close, effectiveness review sign-off)
- admin (all operations)

### Approval Matrix (by category)
- **Minor:** QA Manager approval (tier 1) sufficient
- **Moderate:** QA Manager + affected department heads (tier 1 + 2)
- **Major:** Cross-functional approval (tier 2) + CCB review required
- **Critical:** Site Director / VP Quality (tier 3) + CCB + corporate QA notification

## AI Features (use Anthropic Claude via service dependency)

### Build Now (Round 3)

- **Auto-assess cross-functional impact** — given the change description, automatically identify which departments are affected (QA, QC, Regulatory, Production, Engineering, MSAT, Validation, Facilities, Supply Chain, EHS, IT/Automation) and generate department-specific impact narratives. Instead of just flagging "Production is affected", produce specific descriptions like "This media change will require re-evaluation of the cell culture process at the 2000L scale. Consider running 3 comparability batches and monitoring CQAs including glycosylation profile and charge variants." Detect cascade impacts (e.g. raw material change → spec update → SOP revision → training). Pre-populate impact assessment requests for each affected department.

- **Suggest regulatory classification** — analyse the change against both EU Variations Regulation (EC 1234/2008) for Type IA/IAIN/IB/II classification AND FDA SUPAC guidance for Level 1/2/3 classification. Include a confidence score (0-100) so users know when manual Regulatory Affairs review is critical. Flag low-confidence classifications (<70) for senior QA review. Provide structured reasoning citing specific regulatory criteria. Also suggest the regulatory_filing_type (annual-report, cbe-30, pas for FDA; type-ia, type-iain, type-ib, type-ii for EU).

- **Generate implementation checklist** — produce a dependency-ordered implementation plan based on the change type, affected areas, and impact assessments. Each task includes: title, description, responsible role, effort estimate (hours/days), and dependency on other tasks. Automatically include regulatory submission tasks when the change requires Type IB or II variation. Include validation activities (IQ/OQ/PQ, process validation, cleaning validation, method validation as appropriate), training requirements, document updates, and communication steps. Store as structured JSONB in ai_checklist and auto-create cc_implementation_tasks records.

- **Identify affected SOPs** — cross-reference the change description against the SOP document base (via RAG / pgvector embeddings) to identify SOPs that may need revision, with relevance scores. Return SOP ID, title, relevance score, and a brief explanation of why the SOP is affected.

- **FMEA risk scoring** — analyse the change description, type, and affected areas to suggest structured risk scores: severity (1-5), probability (1-5), detectability (1-5) with a calculated Risk Priority Number (RPN). Provide reasoning for each score based on biologics-specific risk factors (e.g. cell line changes score higher severity than documentation changes). Reference ICH Q9 principles in the reasoning.

- **Similar change finding** — embed the change description using VoyageAI and search for similar past change controls via pgvector similarity. Return the top 5 most similar changes with: CC-ID, title, similarity score, how they were classified, what impacts were found, time to close, and any issues that arose during implementation. Surface precedent-based insights like "Based on 5 similar changes, the average time to close was 45 days. 3 of 5 required process validation."

- **Effectiveness criteria suggestion** — based on the change type, affected areas, and implementation plan, suggest objective effectiveness criteria to be evaluated post-implementation. For example: "For this process parameter change, monitor the following CQAs over the next 10 batches: potency (target: 95-105%), aggregation (target: <2%), charge variant profile (target: main peak >70%)." Include recommended review period (30/60/90 days or N batches).

### Future Enhancements (not Round 3)
- **Cycle time prediction** — predict time to closure based on change characteristics and historical data
- **Bottleneck identification** — identify departments/approvers that consistently delay change controls
- **Overdue risk scoring** — predict which open changes are most likely to become overdue
- **Natural language querying** — "Show me all open equipment changes that affect the filling line" via the existing Vent query engine
- **Regulatory intelligence** — cross-reference changes against FDA warning letters and EU GMP non-compliance reports

## Dependencies
- Deviation Manager (live R1) — link change controls originating from deviations
- CAPA Tracker (live R2) — link change controls originating from CAPAs

## Wiring in server/index.js
```js
// Require at top
const changeControlRoutes = require('./routes/change-control');
const { makeChangeControlService } = require('./services/change-control.service');

// Instantiate service
const changeControlService = makeChangeControlService({ supabase, auditLog, anthropic });

// Add to PAGE_MAP
'change-control.html': 'qa/change-control.html',

// Mount routes
changeControlRoutes(app, { auth: requireAuth, changeControlService });
```

## Frontend Page: docs/qa/change-control.html

### Layout
Split-panel: list (left) + detail (right), matching `docs/qa/deviations.html`.

### Features
1. **Change Control List** (left panel)
   - Filterable by status (draft, submitted, under-review, approved, implementing, closed, rejected), change type (process, equipment, material, facility, documentation, system, analytical), priority (low, medium, high, critical), urgency (planned, urgent, emergency), regulatory classification, category (minor, moderate, major, critical), CCB required
   - Search by CC ID, title, originator
   - Priority color coding (critical=red, high=orange, medium=gold, low=green)
   - Urgency indicator: emergency changes get a pulsing red border, urgent changes get amber border
   - Overdue indicator for changes past target completion date or past SLA deadlines
   - SLA status indicators: green (on track), amber (approaching deadline), red (overdue)
   - Status badges with workflow stage colors
   - Sort by: created date, priority, urgency, RPN score, target completion

2. **Change Control Detail** (right panel)
   - Header: CC ID, title, status badge, priority badge, urgency badge, regulatory classification badge, RPN score badge (color-coded: green <30, amber 30-60, red >60)
   - Full description, justification, proposed change
   - **Risk Assessment panel:** free-text risk_assessment + structured FMEA grid showing severity, probability, detectability sliders (1-5 each) with auto-calculated RPN. AI "Suggest Risk Scores" button.
   - Status workflow visualiser: horizontal progress bar showing Draft → Submitted → Under Review → Approved → Implementing → Effectiveness Review → Closed (or Rejected at any review stage). Current stage highlighted. Shows SLA countdown for current stage.
   - **Impact Assessment section:** table of departments with impact level (none/low/medium/high), assessor, status, due date, details, validation type, cascade impacts. Overdue assessments highlighted red. AI "Auto-Assess All" button at top.
   - **Approval section:** grouped by tier (1=departmental, 2=cross-functional, 3=CCB/director). Each approval shows approver name, role, decision status, signature meaning, timestamp. CCB Required banner for major/critical changes.
   - **Implementation Tasks section:** ordered task list with status (pending/in-progress/completed/blocked), assigned role, due date, effort estimate, completion tracking, QA verification status. Progress bar showing % complete. Block closure if any tasks incomplete. AI "Generate Checklist" button.
   - **Linked records:** deviation link (clickable to deviation detail), CAPA link (clickable to CAPA detail), audit finding reference
   - **Effectiveness Review section** (visible when status=implementing or closed): effectiveness criteria (defined at approval), effectiveness due date, result (pending/effective/partially-effective/not-effective), reviewer notes. AI "Suggest Criteria" button.
   - **Similar Changes panel:** AI-powered panel showing top 5 similar past change controls with similarity scores, outcomes, and lessons learned. "Find Similar" button.
   - **AI Results panels:** impact summary with department-specific narratives, regulatory recommendation with confidence score, implementation checklist, affected SOPs list with relevance scores
   - **Audit trail timeline:** immutable log of all actions with timestamp, user, and action description (21 CFR Part 11 compliant)

3. **Create Change Control Modal**
   - Title, description, justification, proposed change
   - Change type dropdown (process, equipment, material, facility, documentation, system, analytical)
   - Sub-category dropdown (dynamic options based on selected change type — e.g. equipment: like-for-like, upgrade, new, relocation, software-update)
   - Category dropdown (minor, moderate, major, critical) — with tooltip explaining each level
   - Priority dropdown (low, medium, high, critical)
   - Urgency dropdown (planned, urgent, emergency) — emergency shows warning: "Emergency changes require retrospective documentation within 24 hours"
   - Target completion date
   - Linked deviation ID (optional, with autocomplete search)
   - Linked CAPA ID (optional, with autocomplete search)
   - Linked audit finding (optional)
   - AI: "Assess Impact" button — auto-fills affected departments, impact summary, and cascade effects
   - AI: "Classify Regulatory" button — suggests regulatory classification (EU + FDA) with confidence score and reasoning
   - AI: "Score Risk" button — suggests FMEA risk scores with reasoning

4. **Impact Assessment Modal**
   - Department selector (qa, qc, regulatory, production, engineering, msat, validation, facilities, supply-chain, ehs, it-automation)
   - Impact level (none, low, medium, high)
   - Impact details (free text)
   - Mitigation steps
   - Validation required checkbox
   - Validation type dropdown (iq, oq, pq, process-validation, cleaning-validation, method-validation, csv) — visible when validation required is checked
   - Regulatory impact checkbox
   - Cascade impacts (free text — second-order effects)
   - Due date for assessment completion (auto-populated from SLA)

5. **Approval Modal**
   - Decision (approve, reject, request more information)
   - Signature meaning dropdown (review, approval, responsibility) — per 21 CFR Part 11.10(k)
   - Comments (required for reject/request-info)
   - Displays: printed name (from user profile), timestamp (auto-captured), decision meaning — satisfying Part 11 e-signature requirements

6. **Stats Dashboard** (top)
   - Total open change controls by status (with clickable counts to filter list)
   - Overdue changes: past target completion, past SLA deadlines (assessment, approval)
   - Changes by regulatory classification (pie chart)
   - Changes by category (minor/moderate/major/critical bar chart)
   - Average time to close (last 30 days)
   - SLA compliance rate (% of changes meeting SLA targets)
   - Overdue effectiveness reviews count
   - Emergency changes in last 30 days

7. **Emergency Change Banner**
   - When urgency=emergency, display a prominent banner on the detail view explaining the expedited workflow: immediate implementation is permitted, but all assessment and approval documentation must be completed retrospectively within 24 hours. Auto-escalate to QA Manager and Site Director.

### Required imports
```html
<link rel="stylesheet" href="/shared/styles.css">
<script src="/shared/nav.js"></script>
<script src="/shared/i18n.js"></script>
<script src="/shared/dev-progress.js"></script>
```

Use `authFetch()` for all API calls. Use CSS variables from shared/styles.css (dark theme).

## Architecture Rules
- Service factory pattern: `module.exports = { makeChangeControlService }`
- Use `requireAuth` and `requireRole('qa')` middleware on write routes; `requireAuth` on read routes for cross-functional access
- Impact assessment write routes: allow qa + the specific department role (e.g. engineering can submit their own impact assessment)
- Approval routes: enforce approval_tier — only users with appropriate role for the tier can approve (tier 1: dept heads, tier 2: cross-functional leads, tier 3: director/site-director)
- Use `auditLog()` for all create/update/delete/approve/transition operations — every state change must be logged
- Audit trail entries must include: action, userId, timestamp, and the full before/after state diff for the changed record (21 CFR Part 11.10(e))
- E-signatures on approvals must capture: printed name (from user profile), timestamp, and signature meaning (review/approval/responsibility) per 21 CFR Part 11.10(k)
- Auto-calculate `risk_rpn` (severity x probability x detectability) on every update to risk score fields
- Auto-set `ccb_required = true` when category is 'major' or 'critical'
- Auto-set SLA dates on submission: `sla_assessment_due` = submission date + 5 business days (2 days for urgent, 0 for emergency); `sla_approval_due` = assessment completion + 3 business days (1 day for urgent)
- Auto-set `effectiveness_due_date` on transition to implementing: minor = +30 days, moderate = +60 days, major/critical = +90 days
- Block closure (status → closed) if any cc_implementation_tasks have status != 'completed' or if verification_required tasks lack verified_by
- Block implementation (status → implementing) if regulatory_filing_type requires pre-approval (pas, type-ii) and no regulatory approval decision exists
- Emergency changes (urgency = 'emergency'): allow immediate transition to implementing, but flag for retrospective documentation and auto-escalate to QA Manager and Site Director
- Frontend: `authFetch()` for all API calls
- Frontend: dark theme (--bg, --surface, --accent CSS vars)
- Frontend: split-panel layout (list left, detail right)
- No frameworks — vanilla HTML/CSS/JS only
- 21 CFR Part 11 compliant: immutable audit trail, e-signature on approvals with printed name + timestamp + meaning
- EU GMP Annex 15 compliant: risk-based evaluation of changes, requalification flagging via validation_required/validation_type
- ICH Q10 compliant: four-stage lifecycle (evaluate → approve → implement → effectiveness review)
- ICH Q9 compliant: structured FMEA risk scoring (severity x probability x detectability)

## Reference files (copy patterns from)
- `docs/qa/deviations.html` — layout, styling, split-panel pattern
- `server/services/deviation-mgr.service.js` — service factory with AI features
- `server/routes/deviation-mgr.js` — route pattern with auth guards
- `server/lib/ids.js` — ID generator pattern
- `server/lib/audit.js` — audit logging
