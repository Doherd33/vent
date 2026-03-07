# Agent 1 — CAPA Tracker
# Branch: feature/capa-tracker
# Phase: 1 — Quality Core
# Complexity: M (4 days)

## What to build
CAPA (Corrective and Preventive Action) full-lifecycle tracker. Users raise CAPAs linked to deviations, assign owners, set deadlines, track implementation, and verify effectiveness 30-90 days post-implementation. This module already has a backend service (`server/services/capa.service.js`) and routes (`server/routes/capa.js`) — **you are building the frontend page and upgrading the backend to support the full lifecycle**.

## Existing backend (READ FIRST)
- `server/services/capa.service.js` — existing service with `listCapas`, `createCapa`, `updateCapa`
- `server/routes/capa.js` — existing routes: `GET /capas`, `POST /capas`, `PATCH /capas/:capaId`
- `server/routes/admin.js` — already has `CREATE TABLE capas` (lines ~137-161)
- `server/lib/ids.js` — already has `capaId()` generating `CAPA-1000…9999`

**Read these files first before making changes.** You are extending, not replacing.

## Files to create
- `docs/qa/capas.html` (frontend page — this is the main deliverable)

## Files to modify
- `server/services/capa.service.js` — add: getCapaById, effectiveness verification, dashboard stats, AI features
- `server/routes/capa.js` — add new endpoints below
- `server/routes/admin.js` — add any new columns/tables if needed for effectiveness tracking

## Database
Existing table: `capas` — extend if needed for:
- effectiveness_check_date, effectiveness_status, effectiveness_notes
- root_cause_category, capa_type (corrective vs preventive)

## API Endpoints (extend existing)
- `GET /capas` (existing — enhance with filters: status, owner, overdue, type)
- `POST /capas` (existing — enhance to accept capa_type, root_cause_category)
- `PATCH /capas/:capaId` (existing — enhance for status transitions)
- `GET /capas/:capaId` (NEW — single CAPA detail)
- `POST /capas/:capaId/verify-effectiveness` (NEW — QA verifies effectiveness)
- `GET /capas/stats` (NEW — dashboard: open, overdue, effectiveness rate)

## Role Access
qa, director, admin

## AI Features (use Anthropic Claude via service dependency)
- **Effectiveness prediction** — based on CAPA type and historical data, predict likelihood of on-time closure
- **Similar CAPA search** — when creating a new CAPA, find similar past CAPAs to avoid duplicates
- **Auto-suggest preventive actions** — given a root cause, suggest preventive actions from past CAPAs

## Dependencies
- Deviation Manager (live) — CAPAs are linked to deviations via submission_ref

## Frontend Page: docs/qa/capas.html

### Layout
Split-panel: list (left) + detail (right), matching the pattern in `docs/qa/deviations.html`.

### Features
1. **CAPA List** (left panel)
   - Filterable by status (open, in_progress, closed, overdue), owner, type (corrective/preventive)
   - Sortable by due date, created date, severity
   - Color-coded status badges
   - Overdue CAPAs highlighted in red
   - Search by CAPA ID, title, description

2. **CAPA Detail** (right panel)
   - Full CAPA info: ID, title, description, linked deviation, root cause category
   - Owner assignment with role
   - Due date with countdown
   - Status workflow: Open → In Progress → Pending Verification → Closed
   - Evidence/attachment section
   - Effectiveness verification section (appears 30-90 days post-implementation)
   - Audit trail timeline

3. **Create CAPA Modal**
   - Link to deviation (search/select)
   - Type: Corrective or Preventive
   - Title, description, root cause category
   - Owner assignment, due date
   - AI: "Suggest similar CAPAs" button
   - AI: "Suggest preventive actions" button

4. **Stats Dashboard** (top of page)
   - Total open, in progress, overdue, closed this month
   - Effectiveness rate (% verified effective)
   - Average days to close

### Required imports
```html
<link rel="stylesheet" href="/shared/styles.css">
<script src="/shared/nav.js"></script>
<script src="/shared/i18n.js"></script>
<script src="/shared/dev-progress.js"></script>
```

Use `authFetch()` for all API calls. Use CSS variables from shared/styles.css (dark theme).

## Architecture Rules
- Follow the service factory pattern: `module.exports = { makeCapaService }`
- Use `requireAuth` and `requireRole()` middleware on all routes
- Use `auditLog()` for all create/update/delete operations
- Frontend: use `authFetch()` for all API calls
- Frontend: dark theme (--bg, --surface, --accent CSS vars)
- Frontend: split-panel layout (list left, detail right)
- No frameworks — vanilla HTML/CSS/JS only
- 21 CFR Part 11 compliant: immutable audit trail, e-signatures where needed

## Reference files (copy patterns from)
- `docs/qa/deviations.html` — layout, styling, split-panel pattern
- `server/services/deviation-mgr.service.js` — service factory with AI features
- `server/routes/deviation-mgr.js` — route pattern with auth guards
- `server/lib/audit.js` — audit logging pattern
- `docs/shared/styles.css` — design system variables
