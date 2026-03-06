# Agent 3 — Shift Handover
# Branch: feature/shift-handover
# Phase: 2 — Daily Operations
# Complexity: M (5 days)

## What to build
Structured shift handover system for GMP manufacturing. Outgoing shift creates a handover report covering open batches, pending samples, equipment holds, safety issues, and free-text notes. Incoming shift reviews and acknowledges. Ensures nothing falls through the cracks at shift change — a critical GMP requirement.

## Files to create
- `docs/operator/handover.html` (frontend page)
- `server/services/shift-handover.service.js` (service layer)
- `server/routes/shift-handover.js` (API routes)

## Files to modify (additions only)
- `server/routes/admin.js` — add CREATE TABLE
- `server/index.js` — wire service + mount routes + add PAGE_MAP entry
- `server/lib/ids.js` — add ID generator

## Database Tables
Add to `server/routes/admin.js`:

```sql
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
CREATE POLICY IF NOT EXISTS shift_handovers_all ON shift_handovers FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
```

## ID Generator
Add to `server/lib/ids.js`:
- `handoverId()` → `HO-1000…9999`

## API Endpoints
- `POST /handovers` — create new handover (outgoing shift)
- `GET /handovers` — list handovers (filter by date, shift_type, status)
- `GET /handovers/current` — get the most recent open/pending handover for today
- `GET /handovers/:id` — single handover detail
- `PUT /handovers/:id` — update handover (add items, edit notes)
- `POST /handovers/:id/acknowledge` — incoming shift acknowledges receipt
- `POST /handovers/:id/summarise` — AI generates summary of shift events

## Role Access
operator, qa

## AI Features (use Anthropic Claude via service dependency)
- **Auto-summarise shift events** — generate a concise shift summary from the structured data (open batches, holds, samples, notes)
- **Voice note transcription** — accept text that was transcribed from voice (transcription happens client-side or via existing voice service) and incorporate into handover
- **Flag unresolved items** — highlight items from previous handovers that remain unresolved, carry forward automatically

## Dependencies
- Hub (live) — handover accessible from the operator hub

## Wiring in server/index.js
```js
// Require at top
const shiftHandoverRoutes = require('./routes/shift-handover');
const { makeShiftHandoverService } = require('./services/shift-handover.service');

// Instantiate service
const shiftHandoverService = makeShiftHandoverService({ supabase, auditLog, anthropic });

// Add to PAGE_MAP
'handover.html': 'operator/handover.html',

// Mount routes
shiftHandoverRoutes(app, { auth, shiftHandoverService });
```

## Frontend Page: docs/operator/handover.html

### Layout
Split-panel: list (left) + detail (right), matching `docs/qa/deviations.html`.

### Features
1. **Handover List** (left panel)
   - Grouped by date, most recent first
   - Filterable by shift type (day, night, evening), status (draft, pending, acknowledged)
   - Status badges: Draft (grey), Pending Acknowledgement (gold), Acknowledged (green)
   - Quick view: date, shift type, outgoing user, item count

2. **Handover Detail** (right panel)
   - Header: handover ID, date, shift type, outgoing/incoming users
   - Status workflow: Draft → Submitted (Pending Ack) → Acknowledged
   - **Structured sections** (each collapsible):
     - Open Batches — batch ID, product, stage, notes
     - Pending Samples — sample ID, test type, due time
     - Equipment Holds — equipment ID, reason, since when
     - Safety Items — description, severity
     - General Notes — free text
   - AI Summary section (generated)
   - Unresolved items carried from previous shift (highlighted)
   - Acknowledge button (for incoming shift)
   - Audit trail

3. **Create Handover Flow**
   - Step 1: Select shift type, auto-fill outgoing user from session
   - Step 2: Add items to each section (open batches, samples, holds, safety, notes)
   - Each section has + Add Item button with inline form
   - AI: "Summarise shift" button — generates narrative from structured data
   - Submit for acknowledgement

4. **Dashboard** (top of page)
   - Current shift status (is there an open handover?)
   - Unacknowledged handovers count
   - Unresolved items count across recent handovers

### Required imports
```html
<link rel="stylesheet" href="/shared/styles.css">
<script src="/shared/nav.js"></script>
<script src="/shared/i18n.js"></script>
<script src="/shared/dev-progress.js"></script>
```

Use `authFetch()` for all API calls. Dark theme CSS variables.

## Architecture Rules
- Service factory pattern: `module.exports = { makeShiftHandoverService }`
- Use `requireAuth` middleware on all routes
- Use `auditLog()` for all create/update/acknowledge operations
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
