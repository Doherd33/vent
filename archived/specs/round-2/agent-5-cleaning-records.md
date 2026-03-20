# Agent 5 — Cleaning Records
# Branch: feature/cleaning-records
# Phase: 2 — Daily Operations
# Complexity: S (2 days)

## What to build
GMP cleaning record management. Track manual cleaning and CIP (Clean-In-Place) cycles for production equipment. Each record captures: equipment ID, cleaning type, detergent/agent used (lot number for traceability), rinse conductivity readings, visual inspection result, operator sign-off, and hold time tracking (time between cleaning and next use). Critical for GMP — ensures equipment is clean and within validated hold times before reuse.

## Files to create
- `docs/operator/cleaning.html` (frontend page)
- `server/services/cleaning-records.service.js` (service layer)
- `server/routes/cleaning-records.js` (API routes)

## Files to modify (additions only)
- `server/routes/admin.js` — add CREATE TABLE
- `server/index.js` — wire service + mount routes + add PAGE_MAP entry
- `server/lib/ids.js` — add ID generator

## Database Tables
Add to `server/routes/admin.js`:

```sql
CREATE TABLE IF NOT EXISTS cleaning_records (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cleaning_id       TEXT UNIQUE NOT NULL,
  equip_id          TEXT NOT NULL,
  cleaning_type     TEXT NOT NULL DEFAULT 'manual',
  cleaning_agent    TEXT DEFAULT '',
  agent_lot_number  TEXT DEFAULT '',
  agent_concentration TEXT DEFAULT '',
  rinse_conductivity NUMERIC,
  rinse_conductivity_limit NUMERIC DEFAULT 1.0,
  visual_inspection TEXT DEFAULT 'pass',
  operator          TEXT NOT NULL,
  verifier          TEXT,
  verified_at       TIMESTAMPTZ,
  status            TEXT DEFAULT 'in_progress',
  started_at        TIMESTAMPTZ DEFAULT now(),
  completed_at      TIMESTAMPTZ,
  hold_time_expires TIMESTAMPTZ,
  hold_time_hours   INTEGER DEFAULT 72,
  notes             TEXT DEFAULT '',
  created_by        TEXT NOT NULL DEFAULT 'system',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cleaning_equip ON cleaning_records(equip_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_status ON cleaning_records(status);
CREATE INDEX IF NOT EXISTS idx_cleaning_hold ON cleaning_records(hold_time_expires);

ALTER TABLE cleaning_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS cleaning_records_all ON cleaning_records FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
```

## ID Generator
Add to `server/lib/ids.js`:
- `cleaningId()` → `CLN-1000…9999`

## API Endpoints
- `POST /cleaning` — create cleaning record (start cleaning)
- `GET /cleaning` — list all cleaning records (filter by status, equip_id, date range)
- `GET /cleaning/:equipId` — cleaning history for specific equipment
- `GET /cleaning/:id/detail` — single cleaning record detail
- `PUT /cleaning/:id` — update record (add readings, complete, verify)
- `POST /cleaning/:id/complete` — mark cleaning complete, start hold time countdown
- `GET /cleaning/hold-times` — all equipment with active hold times (expiring soon / expired)

## Role Access
operator

## AI Features (use Anthropic Claude via service dependency)
- **Hold time auto-alerts** — flag equipment where hold time is about to expire or has expired (needs re-cleaning)
- **Cleaning cycle compliance tracking** — analyse cleaning records for patterns (missed steps, out-of-spec conductivity trends)

## Dependencies
- Equipment Logbook (live) — cleaning is per-equipment, references equip_id from `equipment` table

## Wiring in server/index.js
```js
// Require at top
const cleaningRecordsRoutes = require('./routes/cleaning-records');
const { makeCleaningRecordsService } = require('./services/cleaning-records.service');

// Instantiate service
const cleaningRecordsService = makeCleaningRecordsService({ supabase, auditLog, anthropic });

// Add to PAGE_MAP
'cleaning.html': 'operator/cleaning.html',

// Mount routes
cleaningRecordsRoutes(app, { auth, cleaningRecordsService });
```

## Frontend Page: docs/operator/cleaning.html

### Layout
Split-panel: list (left) + detail (right), matching `docs/qa/deviations.html`.

### Features
1. **Cleaning Record List** (left panel)
   - Filterable by status (in_progress, completed, verified, expired_hold), equipment, date
   - Search by cleaning ID, equipment ID
   - Status badges: In Progress (blue), Completed (gold), Verified (green), Hold Expired (red)
   - Hold time countdown shown on completed records
   - Expired hold times highlighted red

2. **Cleaning Record Detail** (right panel)
   - Header: cleaning ID, equipment name/ID, type (manual/CIP)
   - Status workflow: In Progress → Completed → Verified
   - **Cleaning Details Section:**
     - Cleaning agent + lot number
     - Agent concentration
     - Rinse conductivity reading vs limit (pass/fail indicator)
     - Visual inspection result (pass/fail)
   - **Hold Time Section:**
     - Hold time start (when cleaning completed)
     - Hold time limit (default 72h, configurable)
     - Countdown timer (live)
     - Expiry status: OK (green), Expiring Soon <4h (gold), Expired (red)
   - **Sign-off Section:**
     - Operator sign-off (auto from session)
     - Verifier sign-off (second person verification)
   - Audit trail

3. **Start Cleaning Modal**
   - Select equipment (dropdown from equipment table)
   - Cleaning type: Manual or CIP
   - Cleaning agent + lot number
   - Hold time limit (default 72h)
   - Start button

4. **Complete Cleaning Form** (in detail panel)
   - Rinse conductivity reading (numeric input, auto-compare to limit)
   - Visual inspection (pass/fail toggle)
   - Notes
   - Complete button → starts hold time countdown

5. **Dashboard** (top of page)
   - Active cleaning in progress count
   - Completed awaiting verification
   - Active hold times (with countdown bars)
   - Expired hold times (needs re-clean!)
   - AI: compliance trend indicator

### Required imports
```html
<link rel="stylesheet" href="/shared/styles.css">
<script src="/shared/nav.js"></script>
<script src="/shared/i18n.js"></script>
<script src="/shared/dev-progress.js"></script>
```

Use `authFetch()` for all API calls. Dark theme CSS variables.

## Architecture Rules
- Service factory pattern: `module.exports = { makeCleaningRecordsService }`
- Use `requireAuth` middleware on all routes
- Use `auditLog()` for all create/update/complete/verify operations
- Frontend: `authFetch()` for all API calls
- Frontend: dark theme (--bg, --surface, --accent CSS vars)
- Frontend: split-panel layout (list left, detail right)
- No frameworks — vanilla HTML/CSS/JS only
- 21 CFR Part 11 compliant: immutable audit trail, second-person verification for cleaning sign-off

## Reference files (copy patterns from)
- `docs/qa/deviations.html` — layout, styling, split-panel pattern
- `docs/operator/equipment.html` — equipment-related patterns
- `server/services/equip-logbook.service.js` — service factory pattern
- `server/routes/equip-logbook.js` — route pattern with auth guards
- `server/lib/ids.js` — ID generator pattern
- `server/lib/audit.js` — audit logging
