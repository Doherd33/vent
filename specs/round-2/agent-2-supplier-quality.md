# Agent 2 — Supplier Quality
# Branch: feature/supplier-quality
# Phase: 1 — Quality Core
# Complexity: M (4 days)

## What to build
Supplier quality management system. Maintain an approved supplier list, track supplier qualifications, manage quality agreements, schedule and record audits, and generate performance scorecards. GMP facilities must qualify every raw material supplier — this module manages that lifecycle.

## Files to create
- `docs/qa/suppliers.html` (frontend page)
- `server/services/supplier-quality.service.js` (service layer)
- `server/routes/supplier-quality.js` (API routes)

## Files to modify (additions only)
- `server/routes/admin.js` — add CREATE TABLE statements
- `server/index.js` — wire service + mount routes + add PAGE_MAP entry
- `server/lib/ids.js` — add ID generators

## Database Tables
Add to `server/routes/admin.js`:

### suppliers
```sql
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
CREATE POLICY IF NOT EXISTS suppliers_all ON suppliers FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
```

### supplier_audits
```sql
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
CREATE POLICY IF NOT EXISTS supplier_audits_all ON supplier_audits FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
```

### quality_agreements
```sql
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
CREATE POLICY IF NOT EXISTS quality_agreements_all ON quality_agreements FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
```

## ID Generators
Add to `server/lib/ids.js`:
- `supplierId()` → `SUP-1000…9999`
- `supplierAuditId()` → `SAUD-1000…9999`
- `qualityAgreementId()` → `QAG-1000…9999`

## API Endpoints
- `POST /suppliers` — create supplier
- `GET /suppliers` — list all (filter by status, risk_level, category)
- `GET /suppliers/:id` — single supplier detail
- `PUT /suppliers/:id` — update supplier
- `GET /suppliers/:id/scorecard` — performance scorecard (deviation count, audit score trend, agreement status)
- `POST /suppliers/:id/audits` — schedule/record audit
- `GET /suppliers/:id/audits` — audit history
- `POST /suppliers/:id/agreements` — create quality agreement
- `GET /suppliers/:id/agreements` — agreement history

## Role Access
qa (all operations)

## AI Features (use Anthropic Claude via service dependency)
- **Performance trend analysis** — analyse audit scores and deviation history to flag suppliers trending downward
- **Risk scoring** — auto-calculate supplier risk based on category, audit history, deviation frequency
- **Audit finding tracking** — summarise open findings across suppliers, suggest follow-up priorities

## Dependencies
- Deviation Manager (live) — link deviations to suppliers for scorecard

## Wiring in server/index.js
```js
// Require at top
const supplierQualityRoutes = require('./routes/supplier-quality');
const { makeSupplierQualityService } = require('./services/supplier-quality.service');

// Instantiate service
const supplierQualityService = makeSupplierQualityService({ supabase, auditLog, anthropic });

// Add to PAGE_MAP
'suppliers.html': 'qa/suppliers.html',

// Mount routes
supplierQualityRoutes(app, { auth, supplierQualityService });
```

## Frontend Page: docs/qa/suppliers.html

### Layout
Split-panel: list (left) + detail (right), matching `docs/qa/deviations.html`.

### Features
1. **Supplier List** (left panel)
   - Filterable by status (pending, approved, suspended, disqualified), risk level, category
   - Search by name, supplier ID
   - Risk-level color coding (high=red, medium=gold, low=green)
   - Overdue audit indicator

2. **Supplier Detail** (right panel)
   - Full info: ID, name, category, contact, address
   - Status workflow: Pending → Approved → (Suspended/Disqualified)
   - Quality agreement section (current agreement status, version, expiry)
   - Audit history timeline
   - Performance scorecard: deviation count, average audit score, agreement compliance
   - AI risk score with explanation

3. **Create Supplier Modal**
   - Name, category (raw material, excipient, packaging, service, equipment)
   - Contact details, address
   - Initial risk assessment
   - AI: "Calculate risk score" button

4. **Schedule Audit Modal**
   - Audit type (initial, routine, for-cause, follow-up)
   - Date, auditor assignment
   - Checklist/scope

5. **Stats Dashboard** (top)
   - Total suppliers by status
   - Upcoming audits (next 30 days)
   - Overdue quality agreements
   - High-risk supplier count

### Required imports
```html
<link rel="stylesheet" href="/shared/styles.css">
<script src="/shared/nav.js"></script>
<script src="/shared/i18n.js"></script>
<script src="/shared/dev-progress.js"></script>
```

Use `authFetch()` for all API calls. Use CSS variables from shared/styles.css (dark theme).

## Architecture Rules
- Service factory pattern: `module.exports = { makeSupplierQualityService }`
- Use `requireAuth` and `requireRole('qa')` middleware on all routes
- Use `auditLog()` for all create/update/delete operations
- Frontend: `authFetch()` for all API calls
- Frontend: dark theme (--bg, --surface, --accent CSS vars)
- Frontend: split-panel layout (list left, detail right)
- No frameworks — vanilla HTML/CSS/JS only
- 21 CFR Part 11 compliant: immutable audit trail

## Reference files (copy patterns from)
- `docs/qa/deviations.html` — layout, styling, split-panel pattern
- `server/services/deviation-mgr.service.js` — service factory with AI features
- `server/routes/deviation-mgr.js` — route pattern with auth guards
- `server/lib/ids.js` — ID generator pattern
- `server/lib/audit.js` — audit logging
