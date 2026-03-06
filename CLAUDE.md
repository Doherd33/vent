# Vent — Claude Code Project Context

## What Is This

Vent is an AI-powered manufacturing intelligence platform for GMP biologics facilities. 76 planned modules across 14 departments. 28 live, 0 WIP, 48 planned.

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
- `SUP-` suppliers, `SAUD-` supplier audits, `QAG-` quality agreements, `HO-` handovers, `CLN-` cleaning
- `CC-` change controls, `CCAP-` approvals, `CCIA-` impact assessments, `CCTK-` tasks, `COMP-` complaints, `RCL-` recalls
- `DISP-` dispositions, `DCHK-` checklists, `CERT-` QP certifications
- `QCS-` QC samples, `QCT-` QC tests, `QCR-` QC results, `QCI-` QC instruments, `QCAQ-` analyst quals, `QCM-` methods, `QCTP-` templates
- `CB-` cell banks, `CBV-` vials, `CBT-` transactions, `CBTEST-` testing

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

## Agent Ecosystem (26 Agents, 6 Pipelines)

Custom subagents live in `.claude/agents/`. Organized into specialized agents and orchestration pipelines.

### Build Agents (Module Construction)

| Agent | Purpose |
|-------|---------|
| `file-organizer` | Reorganize stray files into department folders |
| `round-planner` | Parse dependency graph, recommend next 5-module batch |
| `spec-writer` | Write detailed agent specs (DB, API, frontend, AI) |
| `module-builder` x5 | Build modules in parallel worktrees (service + routes + HTML) |
| `code-reviewer` x5 | Review output against spec and conventions |
| `shared-file-merger` | Merge 5 worktree outputs into ids.js, admin.js, index.js |
| `schema-validator` | Validate SQL structure, FKs, RLS, naming |
| `test-writer` | Write Vitest unit tests for service layers |
| `i18n-agent` | Add EN/ZH/ES translations for new modules |
| `merge-debugger` | Start server, fix wiring bugs until clean startup |
| `integration-tester` | Hit every endpoint with auth, report pass/fail |
| `security-auditor` | Check auth guards, RLS, OWASP, 21 CFR Part 11 |
| `progress-updater` | Update dev-progress.js, dev.html, project.html |
| `docs-generator` | Create technical READMEs per module |
| `rag-updater` | Create SOPs, ingest into RAG for Charlie AI |

### Intelligence & Research Agents

| Agent | Purpose |
|-------|---------|
| `research-agent` | Deep web research on any topic — regulations, competitors, best practices |
| `pitch-researcher` | Research specific prospects/investors for tailored positioning |

### Quality & Analysis Agents

| Agent | Purpose |
|-------|---------|
| `code-profiler` | Analyze code health — complexity, patterns, dead code, tech debt |
| `ux-reviewer` | Review frontend UX, accessibility, design consistency |
| `performance-analyzer` | Profile endpoints, find slow queries, measure page weights |
| `compliance-auditor` | Map modules against FDA 21 CFR Part 11, EU GMP, ALCOA+ |
| `test-coverage-analyzer` | Find untested critical code paths, prioritize test writing |
| `refactor-planner` | Identify duplication, inconsistencies, and improvement opportunities |

### Release & Operations Agents

| Agent | Purpose |
|-------|---------|
| `migration-planner` | Plan safe, reversible database migrations for Supabase |
| `changelog-generator` | Generate release notes from git history and round outputs |
| `demo-data-generator` | Generate realistic GMP demo data with cross-module relationships |
| `demo-script-writer` | Write click-by-click demo scripts tailored to specific audiences |

### Orchestration Pipelines

| Pipeline | Agents | Purpose | Trigger |
|----------|--------|---------|---------|
| `pipeline-orchestrator` | 26 spawns, 9 phases | Full build round end-to-end | "Run Round {N}" |
| `pipeline-code-quality` | 6 agents, 5 parallel | Codebase health evaluation | "Evaluate code quality" |
| `pipeline-compliance` | 3 agents | Regulatory gap analysis | "Check FDA compliance" |
| `pipeline-demo-prep` | 4 agents | Complete demo package for a target | "Prepare demo for {audience}" |
| `pipeline-release` | 4 agents parallel | Safe deployment preparation | "Prepare release" |
| `pipeline-competitive-intel` | 4 agents | Market and competitor research | "Research the competition" |

### 5-Agent Build Process

Each build round:
1. `round-planner` resolves dependencies, picks next 5 modules
2. `spec-writer` produces detailed specs in `round-N-specs/`
3. 5 `module-builder` agents launch in parallel git worktrees
4. Each agent produces 3 files: service, routes, frontend HTML
5. `code-reviewer` validates each module (gate)
6. `shared-file-merger` combines changes into shared files
7. `merge-debugger` fixes wiring until server starts clean
8. `test-writer` + `i18n-agent` run in parallel
9. `integration-tester` + `security-auditor` validate (gate)
10. `progress-updater` + `docs-generator` + `rag-updater` finalize

## Build Phases

| Phase | Modules | Weeks | Status |
|-------|---------|-------|--------|
| 1. Quality Core | 7 | W1-7 | R1 (5) + R2 (2) + R3 (3) complete |
| 2. Daily Operations | 4 | W7-10 | R2 (3) complete |
| 3. QC Lab | 4 | W10-14 | R3 (1: qc-lab) complete, 3 planned |
| 4. Batch / MES | 7 | W14-22 | Planned |
| 5. Inoculation Suite | 10 | W22-28 | R3 (1: inoc-cell-bank) complete, 9 planned |
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
| Custom subagents | `.claude/agents/*.md` |
| Round 3 specs | `round-3-specs/agent-*.md` |
| Pitch decks | `docs/pitches/` |
| Research docs | `docs/research/` |
| NDRC materials | `docs/ndrc/` |

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
