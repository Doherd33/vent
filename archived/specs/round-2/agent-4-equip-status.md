# Agent 4 — Equipment Status Board
# Branch: feature/equip-status
# Phase: 2 — Daily Operations
# Complexity: M (4 days)

## What to build
Real-time equipment status board showing all production equipment across the facility. At a glance, operators and engineers can see what's available, in-use, being cleaned, under maintenance, or on hold. This builds ON TOP of the Equipment Logbook module — it reads from the existing `equipment` table and adds status tracking.

## Existing backend (READ FIRST)
- `server/services/equip-logbook.service.js` — existing equipment service with `listEquipment`, `getEquipment`, `createEquipment`, `addLogEntry`
- `server/routes/equip-logbook.js` — existing routes for equipment CRUD
- `server/routes/admin.js` — already has `CREATE TABLE equipment` and `CREATE TABLE equipment_log_entries`
- The `equipment` table already has a `status` column (TEXT DEFAULT 'active')

**Read these files first.** You are extending the equipment system, not creating a parallel one.

## Files to create
- `docs/operator/equipment-status.html` (frontend page)
- `server/services/equip-status.service.js` (service layer — status-specific operations)
- `server/routes/equip-status.js` (API routes — status-specific endpoints)

## Files to modify (additions only)
- `server/routes/admin.js` — add status_history table if needed
- `server/index.js` — wire service + mount routes + add PAGE_MAP entry

## Database Tables
The `equipment` table already exists. You may want to add a status history table:

```sql
CREATE TABLE IF NOT EXISTS equipment_status_history (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equip_id        TEXT NOT NULL,
  previous_status TEXT NOT NULL,
  new_status      TEXT NOT NULL,
  changed_by      TEXT NOT NULL,
  reason          TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equip_status_hist_equip ON equipment_status_history(equip_id);
CREATE INDEX IF NOT EXISTS idx_equip_status_hist_date ON equipment_status_history(created_at);

ALTER TABLE equipment_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS equip_status_hist_all ON equipment_status_history FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
```

## API Endpoints
- `GET /equipment/status` — all equipment with current status (board view data)
- `PUT /equipment/:id/status` — update equipment status (available, in-use, cleaning, maintenance, hold, retired)
- `GET /equipment/:id/status-history` — status change history for one equipment
- `GET /equipment/status/summary` — counts by status for dashboard

## Role Access
operator, engineering, qa

## AI Features (use Anthropic Claude via service dependency)
- **Real-time status tracking** — detect equipment that's been in a transitional state (cleaning, maintenance) for too long and flag it
- **Capacity planning suggestions** — based on current status distribution, suggest if capacity is at risk

## Dependencies
- Equipment Logbook (live) — reads from `equipment` table, extends with status operations

## Wiring in server/index.js
```js
// Require at top
const equipStatusRoutes = require('./routes/equip-status');
const { makeEquipStatusService } = require('./services/equip-status.service');

// Instantiate service (needs supabase to read equipment table)
const equipStatusService = makeEquipStatusService({ supabase, auditLog, anthropic });

// Add to PAGE_MAP
'equipment-status.html': 'operator/equipment-status.html',

// Mount routes
equipStatusRoutes(app, { auth, equipStatusService });
```

## Frontend Page: docs/operator/equipment-status.html

### Layout
This is a BOARD view (not split-panel). Think kanban columns by status.

### Features
1. **Status Board** (main view)
   - Columns: Available | In Use | Cleaning | Maintenance | Hold | Retired
   - Each column shows equipment cards
   - Cards show: equipment ID, name, type, location, time in current status
   - Drag-and-drop OR click to change status (with reason modal)
   - Color-coded columns (green=available, blue=in-use, gold=cleaning, orange=maintenance, red=hold, grey=retired)
   - Real-time count per column in header

2. **Equipment Card**
   - Equipment ID + name
   - Type icon/badge
   - Location
   - Duration in current status (e.g., "In maintenance for 2h 15m")
   - Last log entry summary
   - Click to expand: status history timeline, link to Equipment Logbook

3. **Status Change Modal**
   - Select new status
   - Required: reason for change
   - Optional: expected duration (for maintenance/cleaning)
   - Confirm button
   - Audit trail entry created

4. **Summary Dashboard** (top of page)
   - Total equipment count
   - Availability rate (% available)
   - Equipment in each status (colored badges)
   - Alerts: equipment in cleaning >4h, in maintenance >24h, on hold >48h
   - AI: capacity risk indicator

5. **Filters**
   - Filter by type, location, status
   - Search by equipment ID or name
   - Toggle: show/hide retired

### Required imports
```html
<link rel="stylesheet" href="/shared/styles.css">
<script src="/shared/nav.js"></script>
<script src="/shared/i18n.js"></script>
<script src="/shared/dev-progress.js"></script>
```

Use `authFetch()` for all API calls. Dark theme CSS variables.

## Architecture Rules
- Service factory pattern: `module.exports = { makeEquipStatusService }`
- Use `requireAuth` middleware on all routes
- Use `auditLog()` for all status changes
- DO NOT duplicate equipment CRUD — only add status-specific operations
- Frontend: `authFetch()` for all API calls
- Frontend: dark theme (--bg, --surface, --accent CSS vars)
- Frontend: board/kanban layout for this module (not split-panel)
- No frameworks — vanilla HTML/CSS/JS only
- 21 CFR Part 11 compliant: immutable audit trail for status changes

## Reference files (copy patterns from)
- `docs/qa/deviations.html` — styling patterns, CSS variables
- `docs/operator/equipment.html` — the existing Equipment Logbook page (understand existing patterns)
- `server/services/equip-logbook.service.js` — existing equipment service (don't duplicate, extend)
- `server/routes/equip-logbook.js` — existing equipment routes
- `server/lib/ids.js` — ID generator pattern (no new IDs needed unless adding status_history)
- `server/lib/audit.js` — audit logging
