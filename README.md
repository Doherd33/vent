# Vent

**AI-Powered Manufacturing Intelligence for Regulated Biologics**

Vent is a full-stack platform for GMP biologics manufacturing — replacing paper batch records, disconnected quality systems, and tribal knowledge with an AI-native, operator-first digital facility. Built by one developer using Claude AI as a 5-agent parallel development team.

76 modules across 14 departments. 23 built. ~46 weeks to full facility coverage.

---

## How It's Built — One Developer, Five AI Agents

Vent is built by a single developer (Darren Doherty) acting as project manager, with **Claude Code** as the engineering team. The development workflow uses a parallel multi-agent approach:

### The 5-Agent Build Process

Each build round launches **5 Claude Code agents simultaneously**, each working in an isolated git worktree on a separate module:

```
┌─────────────────────────────────────────────────────────────┐
│                    DARREN (Project Manager)                   │
│                                                              │
│  ┌─ Writes agent specs (DB schema, API, frontend, AI)       │
│  ├─ Launches 5 agents in parallel git worktrees              │
│  ├─ Reviews output, resolves merge conflicts                 │
│  └─ Merges into main, updates tracking, pushes               │
└──────────┬──────────┬──────────┬──────────┬──────────┬───────┘
           │          │          │          │          │
     ┌─────▼──┐ ┌─────▼──┐ ┌─────▼──┐ ┌─────▼──┐ ┌─────▼──┐
     │Agent 1 │ │Agent 2 │ │Agent 3 │ │Agent 4 │ │Agent 5 │
     │Worktree│ │Worktree│ │Worktree│ │Worktree│ │Worktree│
     │        │ │        │ │        │ │        │ │        │
     │Service │ │Service │ │Service │ │Service │ │Service │
     │Routes  │ │Routes  │ │Routes  │ │Routes  │ │Routes  │
     │Frontend│ │Frontend│ │Frontend│ │Frontend│ │Frontend│
     └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
```

**Per agent, each module produces 3 files:**
1. `server/services/[module].service.js` — Business logic, AI methods, CRUD
2. `server/routes/[module].js` — Express routes with auth guards
3. `docs/[dept]/[module].html` — Full frontend page

**Shared files are merged manually** after all agents complete:
- `server/lib/ids.js` — Centralised ID generators
- `server/routes/admin.js` — CREATE TABLE statements
- `server/index.js` — Service wiring, PAGE_MAP, route mounting
- `docs/shared/nav.js` — Role-based navigation rules

### Round 1 Results (Complete)

5 modules built in parallel, merged into main:

| Agent | Module | Files |
|-------|--------|-------|
| 1 | **Deviation Manager** | `deviation-mgr.service.js` · `deviation-mgr.js` · `qa/deviations.html` |
| 2 | **Equipment Logbook** | `equip-logbook.service.js` · `equip-logbook.js` · `operator/equipment.html` |
| 3 | **Incubator Management** | `inoc-incubator.service.js` · `inoc-incubator.js` · `inoc/incubators.html` |
| 4 | **Media & Buffer Prep** | `us-media-prep.service.js` · `us-media-prep.js` · `process/media-prep.html` |
| 5 | **Training Matrix** | `training-matrix.service.js` · `training-matrix.js` · `training/matrix.html` |

### Round 2 Results (Complete)

5 more modules, completing Phase 1 (Quality Core) and most of Phase 2 (Daily Operations):

| Agent | Module | Phase |
|-------|--------|-------|
| 1 | **CAPA Tracker UI** | Quality Core |
| 2 | **Supplier Quality** | Quality Core |
| 3 | **Shift Handover** | Daily Operations |
| 4 | **Equipment Status Board** | Daily Operations |
| 5 | **Cleaning Records** | Daily Operations |

### Project Command Centre

All build progress is tracked in `docs/project.html` — an interactive dashboard with:
- **Gantt Chart** — 8-phase timeline with dependency mapping
- **Phase Board** — Kanban columns by build phase
- **Module Registry** — Searchable table of all 76 modules with specs
- **Progress Dashboard** — Burndown chart and velocity tracking
- **Build Rounds** — Agent specs for each parallel build round

A floating progress bar (`docs/shared/dev-progress.js`) appears on every module page showing overall build status and quick navigation.

---

## The Problem

In regulated manufacturing, the people closest to the process — the operators — spot problems first. But the systems they use are slow, bureaucratic, and attached to their name. Observations go unreported, tacit knowledge stays locked in people's heads, and the same issues recur across shifts.

SOPs sit in binders that nobody reads proactively, deviations get filed weeks after they happen, and new starters are thrown onto the floor with a stack of text documents and a prayer.

Vent fixes all of this.

---

## What Vent Does

### Core Platform (13 Live Modules)

#### 1. Anonymous Observation Submission
Operators submit floor observations in plain language — no forms, no deviation numbers, no fear of blame.

#### 2. AI-Powered Analysis (RAG Pipeline)
Every submission is analysed by Claude against the facility's actual SOPs:
- **SOP Retrieval** — VoyageAI embeddings + Supabase pgvector similarity search
- **Structured Analysis** — priority classification, SOP references, root cause hypothesis, corrective actions, contact routing, pattern detection, timeline

#### 3. Multi-Phase Workflow
Submissions flow through a structured lifecycle with role-based access control:

| Phase | Who | Timeframe |
|---|---|---|
| 1 — Immediate Response | Shift Leads, EHS | 0–4 hours |
| 2 — Document & Notify | QA Leads, QMS Lead | Same day |
| 3 — Investigate & Act | MSAT, Engineering | 2–7 days |
| 4 — Review & Close | Directors, QP | 1–4 weeks |

#### 4. QA Control Centre
Professional IDE-style workspace: submission queue, SOP cross-reference panel, change management, notes, audit trail.

#### 5. CAPA Tracking
Auto-created corrective actions from AI analysis with assigned owners, due dates, evidence, QA sign-off, and full audit trail.

#### 6. Director Dashboard
Analytics: submission volume/trends, breakdown by priority/status/area, open vs closed pipeline, CAPA metrics.

#### 7. SOP Knowledge Search
Plain-language queries against the SOP database — numbered procedural steps, parameter values, safety warnings, source citations.

#### 8. Document Builder
IDE-style authoring for controlled documents: SOPs, work instructions, batch record templates. Three-panel layout, version history, AI assist, electronic sign-off.

#### 9. Charlie — Voice AI Assistant
Hands-free voice interface: speech-to-text (ElevenLabs STT), text-to-speech responses, real-time translation (EN/ZH/ES), SOP-aware conversation with full RAG context.

#### 10. GDP Check
Camera-based Good Documentation Practice review: image preprocessing, blue ink detection, AI-powered finding detection (missing signatures, incorrect dates, correction fluid), finding management.

#### 11. Hub
Central navigation and landing page for all modules, role-aware.

#### 12. Feedback System
Structured feedback collection with AI-powered batch analysis, theme identification, and prioritised recommendations.

#### 13. Internationalisation (i18n)
Full multi-language support: English, Simplified Chinese, Spanish. Dynamic switching, persistent preference.

### Round 1 Modules (Live)

#### 14. Deviation Manager
Full deviation lifecycle: open → investigating → root cause → CAPA pending → closed. AI auto-classifies severity (critical/major/minor). 5-Why interactive investigation, Ishikawa diagram (6M), root cause suggestions from similar deviations + SOP context.

#### 15. Equipment Logbook
Per-equipment digital logbook replacing paper: usage records, cleaning events, maintenance, alarms, calibration. 21 CFR Part 11 compliant with immutable audit trail and e-signatures.

#### 16. Incubator Management
CO2 incubator unit tracking: temperature/CO2/humidity monitoring, log entries, alarm management, calibration records, maintenance scheduling. Real-time status dashboard.

#### 17. Media & Buffer Prep
Media and buffer preparation records: recipe management, preparation execution with step tracking, QC release, expiry management. Batch-linked with full traceability.

#### 18. Training Matrix
Role-based training assignments mapped to SOPs. SOP revision triggers automatic retraining cascades. Compliance dashboard: who's current, who's overdue. AI-generated competency assessments.

### Round 2 Modules (Live)

#### 19. CAPA Tracker
Full CAPA lifecycle with filtering, effectiveness verification (30/60/90-day follow-ups), overdue alerts, linked deviations and observations.

#### 20. Supplier Quality
Supplier management with qualification status, audit scheduling, material certifications, risk scoring, and performance trending.

#### 21. Shift Handover
Structured handover forms: open batches, pending samples, equipment holds, safety notes. Voice note recording. AI auto-summarises shift events.

#### 22. Equipment Status Board
Real-time grid of all equipment with status (available/in-use/cleaning/maintenance/hold). Click to open logbook. Filter by area, status, type.

#### 23. Cleaning Records
Manual and CIP cleaning execution records. Detergent lot, rinse conductivity, visual inspection sign-off. Hold time tracking with auto-alerts.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (docs/)                          │
│  shared/styles.css · shared/nav.js · shared/i18n.js             │
│  shared/dev-progress.js (build tracking bar)                     │
│                                                                  │
│  Core:   index.html · query.html · qa.html · workflow.html       │
│          dashboard.html · submissions.html · builder.html        │
│          feedback.html · login.html · hub.html                   │
│                                                                  │
│  QA:     qa/deviations.html                                      │
│  Ops:    operator/equipment.html                                 │
│  Inoc:   inoc/incubators.html                                    │
│  Process: process/media-prep.html                                │
│  Training: training/matrix.html                                  │
│                                                                  │
│  Planning: project.html · dev.html                               │
│                                                                  │
│  Static HTML/CSS/JS — no framework, intentionally lightweight    │
└─────────────────────────┬───────────────────────────────────────┘
                          │ REST API
┌─────────────────────────▼───────────────────────────────────────┐
│                     Server (server/)                              │
│  Express 5.x · HMAC Auth · Role-based access · Audit logging     │
│                                                                  │
│  lib/                            services/                       │
│    auth.js    (JWT, RBAC)          submission.service.js          │
│    audit.js   (audit log)          sop.service.js                │
│    rag.js     (embeddings)         capa.service.js               │
│    ids.js     (ID generation)      chat.service.js               │
│    gdp-image.js (vision)           voice.service.js              │
│                                    deviation-mgr.service.js      │
│  agents/                           equip-logbook.service.js      │
│    analyst.js · classifier.js      inoc-incubator.service.js     │
│    router.js · charlie.js          us-media-prep.service.js      │
│    capa-writer.js                  training-matrix.service.js    │
│    builder.js · sop-query.js                                     │
│                                                                  │
│  graphs/                                                         │
│    submission-pipeline.js  (LangGraph multi-agent pipeline)      │
└──────┬──────────────┬──────────────┬──────────────┬─────────────┘
       │              │              │              │
┌──────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐ ┌────▼────────┐
│  Claude AI  │ │  Supabase  │ │  VoyageAI  │ │ ElevenLabs  │
│  (Anthropic)│ │ PostgreSQL │ │ Embeddings │ │  STT / TTS  │
│             │ │ + pgvector │ │ voyage-3-  │ │             │
│  Analysis,  │ │ + Storage  │ │ lite       │ │  Voice I/O  │
│  routing,   │ │            │ │            │ │  for Charlie │
│  knowledge, │ │  25+ tables│ │ SOP chunks │ │  and floor   │
│  GDP check, │ │            │ │ embedded   │ │  operators   │
│  agents     │ │            │ │            │ │             │
└─────────────┘ └────────────┘ └────────────┘ └─────────────┘
```

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Static HTML/CSS/JS (no framework — intentionally lightweight) |
| Server | Node.js + Express 5 |
| AI | Claude (Anthropic) via `@anthropic-ai/sdk` |
| AI Agents | LangGraph-style multi-agent pipeline (7 specialised agents) |
| Embeddings | VoyageAI (`voyage-3-lite`) |
| Voice | ElevenLabs (STT/TTS) |
| Database | Supabase (PostgreSQL + pgvector + RLS) |
| Auth | Custom HMAC-signed JWT with PBKDF2 hashing |
| Hosting | Render |
| Dev Workflow | Claude Code with parallel 5-agent git worktree builds |

### Roles

| Role | Access |
|---|---|
| `operator` | Query SOPs, Doc Builder, Feedback, Equipment |
| `qa` | + Submit, Submissions, QA Control, Training |
| `director` | + Dashboard |
| `msat` | Submit, Query SOPs, Submissions, Doc Builder |
| `engineering` | Submit, Query SOPs, Submissions, Doc Builder, Equipment |
| `admin` | Full access to all modules |

---

## Build Phases (8 Phases, ~46 Weeks)

```
Phase                          Wk1   5    10   15   20   25   30   35   40   45
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Quality Core      (7 mods)  ██████████████
2. Daily Operations  (4 mods)              ████████
3. QC Lab            (4 mods)                      ████████████
4. Batch / MES       (7 mods)                              ████████████████████
5. Inoculation Suite (10 mods)                                         ████████████
6. Process Ops       (14 mods)                                                 ████████████████████
7. Support Functions (12 mods)                                                                 ████████████████
8. Analytics         (5 mods)                                                                              ████████
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Current Progress

| Status | Count | Modules |
|--------|-------|---------|
| **Live** | 23 | Hub, Charlie AI, Voice, Observations, My Activity, QA Centre, QA Workflow, GDP Check, Analytics, Doc Builder, Feedback, Login, Demo, Deviation Manager, Equipment Logbook, Incubator Mgmt, Media Prep, Training Matrix, CAPA Tracker, Supplier Quality, Shift Handover, Equipment Status, Cleaning Records |
| **Planned** | 53 | Change Control, Doc Control, Batch Disposition, Complaints, QC Lab, OOS Investigation, Environmental Monitoring, Stability Program, Batch Execution (MES), and 44 more |

Full module registry and interactive Gantt chart: see `docs/project.html`

---

## AI Architecture — 7 Layers

| Layer | What It Does | Status |
|-------|-------------|--------|
| **1. Charlie AI** | Contextual AI panel on every module. RAG-backed, SOP-aware conversation | Live |
| **2. Classification Engine** | Auto-classify deviations, observations, complaints, change controls on creation | Live |
| **3. Investigation Assistant** | 5-Why chains, Ishikawa diagrams, root cause suggestions from similar events + SOPs | Live (deviations) |
| **4. Predictive Engine** | Predict deviations from process trends, equipment failures, batch outcomes | Planned |
| **5. Review by Exception** | AI pre-screens batch records, EM data, QC results — humans review exceptions only | Planned |
| **6. Document Intelligence** | Auto-generate SOPs, training assessments, APQR narratives from cross-module data | Planned |
| **7. Cross-Module Intelligence** | Connect deviation patterns → equipment history → EM excursions → training gaps | Planned |

---

## Compliance

- **21 CFR Part 11 / EU Annex 11** — electronic signatures with user ID + reason
- **Immutable audit trail** — SHA-256 checksummed, timestamped, IP-logged
- **ALCOA+ principles** — Attributable, Legible, Contemporaneous, Original, Accurate
- **Role-based access control** — sensitive operations restricted by role
- **Row Level Security** — database-level access via Supabase RLS

---

## SOP Database

| Document | Title |
|---|---|
| WX-SOP-1001-03 | Bioreactor Setup, Preparation and Inoculation |
| WX-SOP-1002-03 | Perfusion Media Preparation, Sterile Filtration and Exchange |
| WX-SOP-1003-03 | Cell Density, Viability Monitoring and Bleed Rate Management |
| WX-SOP-1004-03 | Environmental Monitoring and Cleanroom Operations |
| WX-SOP-1005-03 | Equipment Cleaning, Sterilisation and Changeover |
| WX-BPR-2001-03 | Batch Production Record — Upstream Perfusion |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project with pgvector extension
- Anthropic API key
- VoyageAI API key
- ElevenLabs API key (optional — voice features)

### Environment Variables

```env
ANTHROPIC_API_KEY=your-anthropic-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
VOYAGE_API_KEY=your-voyage-key
TOKEN_SECRET=your-token-secret
ELEVENLABS_API_KEY=your-elevenlabs-key
```

### Setup

```bash
cd server
npm install

# Start the server (port 3001)
npm start

# Run DB setup SQL from GET /admin/setup in Supabase SQL Editor
# Ingest SOPs into vector database
npm run ingest
```

### Database Tables

Start the server and visit `GET /admin/setup` for the full SQL schema. Creates 25+ tables including:

**Core:** `submissions`, `sop_chunks`, `audit_log`, `users`, `qa_notes`, `sop_changes`, `sop_annotations`, `notifications`, `capas`, `documents`, `gdp_documents`, `chat_sessions`, `feedback_entries`, `feedback_analysis`

**Round 1:** `deviations`, `equipment`, `equipment_log_entries`, `incubator_units`, `incubator_logs`, `incubator_alarms`, `incubator_calibrations`, `incubator_maintenance`, `media_buffer_records`, `training_assignments`, `training_completions`

**Round 2:** `suppliers`, `supplier_audits`, `supplier_materials`, `shift_handovers`, `equipment_status_log`, `cleaning_records`

---

## Project Structure

```
vent/
├── docs/                              # Frontend (static HTML/CSS/JS)
│   ├── shared/
│   │   ├── styles.css                 # Design system (CSS variables, layout)
│   │   ├── nav.js                     # Auth helpers, guard, role filtering
│   │   ├── i18n.js                    # Internationalisation (EN, ZH, ES)
│   │   └── dev-progress.js            # Floating build progress bar
│   │
│   ├── hub/hub.html                   # Hub (landing page)
│   ├── auth/login.html                # Authentication
│   ├── operator/                      # Operator pages
│   │   ├── query.html                 # SOP knowledge search
│   │   ├── equipment.html             # Equipment Logbook (Round 1)
│   │   ├── feedback.html              # Feedback
│   │   └── index.html                 # Observation submission
│   ├── qa/                            # Quality Assurance
│   │   ├── qa.html                    # QA Control Centre
│   │   ├── workflow.html              # QA Workflow
│   │   ├── submissions.html           # Floor submissions
│   │   └── deviations.html            # Deviation Manager (Round 1)
│   ├── management/                    # Leadership
│   │   └── dashboard.html             # Director Dashboard
│   ├── admin/                         # Admin
│   │   └── builder.html               # Document Builder
│   ├── inoc/                          # Inoculation
│   │   └── incubators.html            # Incubator Management (Round 1)
│   ├── process/                       # Process Operations
│   │   └── media-prep.html            # Media & Buffer Prep (Round 1)
│   ├── training/                      # Training
│   │   └── matrix.html                # Training Matrix (Round 1)
│   │
│   ├── project.html                   # Project Command Centre (Gantt, registry)
│   └── dev.html                       # Dev board (kanban)
│
├── server/                            # Backend
│   ├── index.js                       # Express app — middleware, mounts, listen
│   ├── lib/
│   │   ├── auth.js                    # JWT tokens, password hashing, RBAC
│   │   ├── audit.js                   # SHA-256 checksummed immutable audit log
│   │   ├── rag.js                     # VoyageAI embeddings, SOP context building
│   │   ├── ids.js                     # Centralised ID generation (VNT-, DEV-, EQ-, etc.)
│   │   └── gdp-image.js              # Image preprocessing, blue ink detection
│   ├── agents/                        # LangGraph AI agents
│   │   ├── analyst.js                 # Submission analysis
│   │   ├── classifier.js             # Priority/category classification
│   │   ├── router.js                  # Contact routing
│   │   ├── charlie.js                 # Conversational AI
│   │   ├── capa-writer.js            # CAPA generation
│   │   ├── builder.js                 # Document AI assist
│   │   └── sop-query.js              # SOP knowledge search
│   ├── graphs/
│   │   └── submission-pipeline.js     # Multi-agent pipeline orchestration
│   ├── services/                      # Business logic (service factory pattern)
│   │   ├── submission.service.js
│   │   ├── sop.service.js
│   │   ├── capa.service.js
│   │   ├── chat.service.js
│   │   ├── voice.service.js
│   │   ├── deviation-mgr.service.js   # Round 1
│   │   ├── equip-logbook.service.js   # Round 1
│   │   ├── inoc-incubator.service.js  # Round 1
│   │   ├── us-media-prep.service.js   # Round 1
│   │   └── training-matrix.service.js # Round 1
│   ├── routes/                        # Express route handlers
│   │   ├── auth.js · admin.js · submit.js · sop.js
│   │   ├── capa.js · gdp.js · builder.js · chat.js
│   │   ├── voice.js · feedback.js
│   │   ├── deviation-mgr.js           # Round 1
│   │   ├── equip-logbook.js           # Round 1
│   │   ├── inoc-incubator.js          # Round 1
│   │   ├── us-media-prep.js           # Round 1
│   │   └── training-matrix.js         # Round 1
│   ├── data/contacts.js               # Facility contacts directory
│   └── docs/sops/                     # Source SOP documents (Markdown)
│
└── project/                           # Deployment config
    └── render.yaml
```

---

## The Vision

Vent exists because the best ideas for improving a manufacturing process come from the people running it — and those ideas should never be lost to fear, bureaucracy, or forgetting.

Every observation an operator submits makes the facility smarter. Every document they review raises the bar. Every pattern the AI detects makes quality stronger. Every voice question asked on the floor makes SOPs more accessible.

The operators aren't just following procedures. They're building the most complete, living quality intelligence system in biologics manufacturing — and they're doing it anonymously, safely, and as part of their normal work.

---

*Built by Darren Doherty with Claude AI. Last updated: March 2026.*
