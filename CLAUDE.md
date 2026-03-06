# Vent — Claude Code Project Context

## What Is This

Vent is an AI-powered manufacturing intelligence platform for GMP biologics facilities. 76 planned modules across 14 departments. 23 live, 0 WIP, 53 planned.

Built by one developer (Darren) acting as project manager, with Claude Code as the engineering team using parallel 5-agent git worktree builds.

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS in `docs/` — no framework, no build step
- **Backend:** Node.js + Express 5.x in `server/` — port 3001
- **Database:** Supabase (PostgreSQL + pgvector + RLS)
- **AI:** Anthropic Claude via `@anthropic-ai/sdk`, VoyageAI embeddings, ElevenLabs voice
- **Auth:** Custom HMAC-signed JWT tokens, PBKDF2 password hashing

## Key Patterns

### Service Factory Pattern
Every module's business logic lives in a service factory:
```js
// server/services/[module].service.js
function makeXService({ supabase, auditLog, anthropic }) {
  return {
    async create(data) { ... },
    async list(filters) { ... },
    async getById(id) { ... },
    async update(id, data) { ... },
  };
}
module.exports = { makeXService };
```

### Route Pattern
Routes are thin HTTP wrappers with auth guards:
```js
// server/routes/[module].js
module.exports = function(app, { auth, xService }) {
  app.post('/x', auth, async (req, res) => { ... });
  app.get('/x', auth, async (req, res) => { ... });
};
```

### Wiring (server/index.js)
1. `require()` the route module
2. Create service via factory: `const xService = makeXService({ supabase, auditLog, anthropic })`
3. Add to PAGE_MAP: `'page.html': 'dept/page.html'`
4. Mount routes: `xRoutes(app, { auth: requireAuth, xService })`

### ID Generation (server/lib/ids.js)
All entity IDs are centralised. Pattern: `PREFIX-1000..9999`
- `VNT-` submissions, `DEV-` deviations, `EQ-` equipment, `EQLOG-` equipment logs
- `INOC-` incubators, `ILOG-` incubator logs, `IALM-` alarms, `ICAL-` calibrations, `IMNT-` maintenance
- `MP-` media prep, `TRN-` training, `CAPA-` CAPAs

### Frontend Pattern
```
docs/[dept]/[module].html
```
- Imports: `shared/styles.css`, `shared/nav.js`, `shared/i18n.js`
- Uses `authFetch()` from nav.js for all API calls
- Split-panel layout: list (left) + detail (right)
- Each page includes `<script src="/shared/dev-progress.js"></script>` for build tracking

### Auth Helpers (docs/shared/nav.js)
- `authFetch(url, opts)` — adds auth headers to fetch calls
- `getAuthHeaders()` — returns `{ Authorization: 'Bearer ...' }`
- `window.__user` — current user object after auth

### DB Setup
All CREATE TABLE statements live in `server/routes/admin.js`.
Run via `GET /admin/setup` → copy SQL → run in Supabase SQL Editor.

### Audit Logging
```js
const auditLog = makeAuditLog(supabase);
await auditLog({ action: 'deviation.created', userId, detail: { devId }, req });
```

## Module Status Lifecycle

`planned` → `wip` → `live`

Track in:
- `docs/dev.html` — kanban board
- `docs/project.html` — Gantt chart, registry, progress, rounds
- `docs/shared/dev-progress.js` — floating bar on all module pages

## 5-Agent Build Process

Each build round:
1. Darren writes agent specs (DB schema, API endpoints, frontend, AI features)
2. 5 Claude Code agents launch in parallel git worktrees
3. Each agent produces 3 files: service, routes, frontend HTML
4. Darren merges: copies new files, combines shared file changes
5. Shared files to merge: `ids.js`, `admin.js`, `index.js`, `nav.js`
6. Update `dev.html` + `project.html` + `dev-progress.js` with new module status

## Build Phases

| Phase | Modules | Weeks | Status |
|-------|---------|-------|--------|
| 1. Quality Core | 7 | W1-7 | Round 1 (5) + Round 2 (2) complete |
| 2. Daily Operations | 4 | W7-10 | Round 2 (3) complete |
| 3. QC Lab | 4 | W10-14 | Planned |
| 4. Batch / MES | 7 | W14-22 | Planned |
| 5. Inoculation Suite | 10 | W22-28 | Planned |
| 6. Process Operations | 14 | W28-36 | Planned |
| 7. Support Functions | 12 | W36-43 | Planned |
| 8. Analytics & Leadership | 5 | W43-46 | Planned |

## File Locations

| What | Where |
|------|-------|
| Server entry | `server/index.js` |
| Auth middleware | `server/lib/auth.js` |
| Audit logging | `server/lib/audit.js` |
| RAG / embeddings | `server/lib/rag.js` |
| ID generators | `server/lib/ids.js` |
| DB table schemas | `server/routes/admin.js` |
| AI agents | `server/agents/*.js` |
| LangGraph pipeline | `server/graphs/submission-pipeline.js` |
| Frontend design system | `docs/shared/styles.css` |
| Frontend auth/nav | `docs/shared/nav.js` |
| i18n translations | `docs/shared/i18n.js` |
| Build progress bar | `docs/shared/dev-progress.js` |
| Project command centre | `docs/project.html` |
| Facility contacts | `server/data/contacts.js` |
| SOP source docs | `server/docs/sops/*.md` |

## Conventions

- No TypeScript, no React, no build tools — vanilla JS everywhere
- Use `'use strict';` at top of all server files
- Express 5.x (async error handling built in)
- Service dependencies injected via factory pattern, never imported globally
- All mutations get audit log entries
- All routes behind `requireAuth` or `requireRole('qa')` etc.
- Frontend pages served via PAGE_MAP in index.js (slug → file path)
- CSS uses the design system variables from `shared/styles.css`
- Dark theme throughout (background: #0e0e12, cards: #16161e)

## Server Port

Runs on **port 3001** (not 3000).

## Current Date

Today is 2026-03-06.
