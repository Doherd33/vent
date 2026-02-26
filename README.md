# Vent

**Anonymous Improvement Intelligence for Regulated Biologics Manufacturing**

Vent is an AI-powered platform that lets manufacturing floor operators anonymously submit observations, deviations, and improvement ideas — and routes them through a structured, GMP-compliant workflow that connects the right people, the right SOPs, and the right corrective actions automatically.

Built for upstream perfusion biologics facilities. Designed for operators first.

---

## The Problem

In regulated manufacturing, the people closest to the process — the operators — are the ones who spot problems first. But the systems they're expected to use are slow, bureaucratic, and attached to their name. So observations go unreported, tacit knowledge stays locked in people's heads, and the same issues recur across shifts.

Meanwhile, SOPs sit in binders (or PDFs) that nobody reads proactively, deviations get filed weeks after they happen, and new starters are thrown onto the floor with a stack of text documents and a prayer.

Vent fixes all of this.

---

## What Vent Does

### 1. Anonymous Observation Submission

Operators submit floor observations in plain language — no forms, no deviation numbers, no fear of blame. They describe what they saw, select the process area and shift, and hit submit.

**What happens next is where Vent earns its name.**

### 2. AI-Powered Analysis (RAG Pipeline)

Every submission is analysed by Claude against the facility's actual SOPs, using a retrieval-augmented generation pipeline:

- **SOP Retrieval** — Operator observations are embedded via VoyageAI and matched against SOP chunks stored in Supabase (vector similarity search). The most relevant SOP sections are retrieved automatically.
- **Structured Analysis** — Claude receives the observation alongside the retrieved SOP content, a contacts directory, and similar past submissions. It produces a structured JSON response containing:
  - **Priority classification** (High / Medium / Low)
  - **SOP references** with exact section numbers and gap/compliance flags
  - **Scientific evaluation** — root cause hypothesis, risk level, affected parameters, regulatory flags
  - **Corrective actions** with timing bands (immediate / short-term / long-term)
  - **Contact routing** — real people from the facility directory, assigned to workflow phases
  - **Pattern detection** — flags when similar observations have been submitted before
  - **Timeline** — recommended sequence of actions with ownership

### 3. Multi-Phase Workflow

Submissions flow through a structured lifecycle with role-based access control:

| Phase | Who | Timeframe | Actions |
|---|---|---|---|
| 1 — Immediate Response | Shift Leads, EHS | 0–4 hours | Acknowledge, floor response |
| 2 — Document & Notify | QA Leads, QMS Lead | Same day | Review, document, notify |
| 3 — Investigate & Act | MSAT, Engineering | 2–7 days | Root cause, corrective action |
| 4 — Review & Close | Directors, QP | 1–4 weeks | Sign-off, closure, trend review |

Status transitions requiring approval (QA sign-off, director sign-off, closure) enforce **electronic signatures** — user ID and reason are required and logged.

### 4. QA Control Centre

A dedicated QA interface modelled on a professional IDE workspace:

- **Submission queue** with filtering by priority, status, and area
- **SOP cross-reference panel** — click any SOP reference to view the exact section inline
- **SOP change management** — draft, accept, or reject proposed SOP changes with annotations
- **Notes panel** — persistent session notes for QA reviewers
- **Audit trail viewer** — full history of every action on every submission

### 5. CAPA Tracking

Corrective actions from AI analysis are automatically created as CAPA records:

- Assigned to the most relevant contact based on workflow phase
- Due dates calculated from timing bands
- Status tracking (open → in progress → closed)
- Evidence attachment and QA sign-off for closure
- Full audit trail on every state change

### 6. Director Dashboard

Analytics view for facility leadership:

- Submission volume and trends (week-over-week)
- Breakdown by priority, status, process area
- Open vs. closed pipeline
- CAPA metrics — open, overdue, closed
- Recent submission and CAPA activity feeds

### 7. SOP Knowledge Search

Operators can query the SOP database directly — ask a plain-language question and get a structured answer:

- Numbered procedural steps extracted from actual SOPs
- Parameter values with ranges and units
- Safety warnings and critical flags
- Source citations with exact section numbers

### 8. Cross-Submission Pattern Detection

Every new submission is compared against historical submissions using keyword overlap and process area matching. Recurring patterns are flagged automatically, helping QA identify systemic issues before they become deviations.

### 9. Document Builder

A full IDE-style document authoring environment for creating, editing, and versioning controlled workflow documents — SOPs, work instructions, batch record templates, and more.

- **Three-panel layout** — document list (left), document viewer (centre), and edit/AI/versions panel (right), with a resizable activity log at the bottom
- **Drag-to-resize panels** — VS Code-style resizers between all panels for a customisable workspace
- **Step-based document structure** — documents are composed of ordered steps with titles, detailed instructions, and collapsible sections
- **Version history** — every save creates a timestamped snapshot; previous versions can be viewed at any time
- **Grouped by process area** — documents are automatically organised by upstream area (Media Prep, Bioreactor Ops, Sampling, etc.)
- **Status tracking** — Draft → In Review → Approved lifecycle with visual badges
- **Activity log** — real-time log of all document operations (create, edit, delete, version)
- **Search and filter** — instant filtering across all documents by title or content
- **Local-first storage** — documents persist in localStorage for fast, offline-capable access
- **AI Assist tab** — placeholder for future AI-powered document drafting and review

The Document Builder gives operators and QA a structured tool to author the documents that drive manufacturing — living alongside the observation and SOP systems rather than sitting in separate, disconnected tools.

### 10. Notification System

When a submission is created, all routed contacts receive notifications with:

- Priority level and observation excerpt
- Their assigned workflow phase
- Why they specifically were routed (contextual reason from AI analysis)

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        Frontend (docs/)                        │
│  query.html · qa.html · workflow.html · dashboard.html         │
│  submissions.html · builder.html · login.html                  │
│  Static HTML/CSS/JS — served by Express                        │
└────────────────────────┬───────────────────────────────────────┘
                         │ REST API
┌────────────────────────▼───────────────────────────────────────┐
│                     Server (server/)                           │
│  Express.js · Auth (HMAC tokens) · Role-based access           │
│                                                                │
│  Routes:                                                       │
│    /submit          — observation submission + AI analysis      │
│    /query           — SOP knowledge search                     │
│    /submissions     — CRUD + status workflow                   │
│    /sop/:docId      — SOP chunk retrieval                      │
│    /sop-changes     — SOP change management                    │
│    /sop-annotations — SOP change annotations                   │
│    /capas           — CAPA tracking                            │
│    /notifications   — user notification system                 │
│    /analytics       — dashboard aggregations                   │
│    /audit           — audit trail queries                      │
│    /auth/*          — register, login, password management     │
│    /ingest          — SOP ingestion pipeline                   │
└──────┬──────────────────┬──────────────────┬───────────────────┘
       │                  │                  │
┌──────▼──────┐  ┌────────▼────────┐  ┌──────▼──────┐
│  Claude AI  │  │    Supabase     │  │  VoyageAI   │
│  (Anthropic)│  │  PostgreSQL +   │  │  Embeddings │
│             │  │  Vector Search  │  │  voyage-3-  │
│  Analysis,  │  │  + Storage      │  │  lite       │
│  routing,   │  │                 │  │             │
│  knowledge  │  │  Tables:        │  │  SOP chunks │
│  queries    │  │  submissions    │  │  & queries  │
│             │  │  sop_chunks     │  │  embedded   │
│             │  │  audit_log      │  │  for vector │
│             │  │  users          │  │  similarity │
│             │  │  qa_notes       │  │  search     │
│             │  │  sop_changes    │  │             │
│             │  │  sop_annotations│  │             │
│             │  │  notifications  │  │             │
│             │  │  capas          │  │             │
└─────────────┘  └─────────────────┘  └─────────────┘
```

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Static HTML/CSS/JS (no framework — intentionally lightweight) |
| Server | Node.js + Express 5 |
| AI | Claude (Anthropic) via `@anthropic-ai/sdk` |
| Embeddings | VoyageAI (`voyage-3-lite` model) |
| Database | Supabase (PostgreSQL + pgvector + Row Level Security) |
| Auth | Custom HMAC-signed JWT tokens with PBKDF2 password hashing |
| Hosting | Railway |

### Roles

| Role | Access |
|---|---|
| `operator` | Query SOPs, build documents, view own notifications |
| `qa` | All operator access + QA control centre, status transitions, SOP changes, CAPAs |
| `director` | All QA access + dashboard analytics, director sign-off |
| `msat` | Specialist access for investigation phase |
| `engineering` | Specialist access for technical investigation |
| `admin` | Full access including SOP ingestion and system setup |

---

## Compliance

Vent is built for GMP-regulated environments and implements:

- **21 CFR Part 11 / EU Annex 11** — electronic signatures with user ID + reason for approval transitions
- **Immutable audit trail** — every action (submission, status change, SOP change, CAPA update, login) is logged with SHA-256 checksums, timestamps, IP addresses, and user agents
- **ALCOA+ principles** — data is Attributable, Legible, Contemporaneous, Original, and Accurate
- **Role-based access control** — sensitive operations (status transitions, SOP changes, CAPA management) are restricted by role
- **Row Level Security** — database-level access control via Supabase RLS policies

---

## SOP Database

Vent ships with upstream processing SOPs that are ingested, chunked by section, embedded, and stored in Supabase for vector similarity search:

| Document | Title |
|---|---|
| WX-SOP-1001-03 | Bioreactor Setup, Preparation and Inoculation |
| WX-SOP-1002-03 | Perfusion Media Preparation, Sterile Filtration and Exchange |
| WX-SOP-1003-03 | Cell Density, Viability Monitoring and Bleed Rate Management |
| WX-SOP-1004-03 | Environmental Monitoring and Cleanroom Operations |
| WX-SOP-1005-03 | Equipment Cleaning, Sterilisation and Changeover |
| WX-BPR-2001-03 | Batch Production Record — Upstream Perfusion |

The ingestion pipeline (`/ingest` or `npm run ingest`) parses each markdown SOP by heading, embeds each chunk via VoyageAI, and stores it in the `sop_chunks` table with its vector for semantic search.

---

## Planned Feature: Visual SOP Engine

> *Full proposal: [server/docs/FEATURE-VISUAL-SOP-ENGINE.md](server/docs/FEATURE-VISUAL-SOP-ENGINE.md)*

This is the next major evolution of Vent — turning operators from passive SOP readers into active contributors who build living, visual documentation as a by-product of their daily work.

### The Concept

Operators already perform every SOP step, every shift. Vent gives them a way to capture what they do — photos, short videos, annotated clips — directly from the manufacturing floor. The AI engine then maps that media to specific SOP steps and automatically assembles rich visual walkthroughs that new starters can watch and learn from.

### How It Works

**Capture** — Operators record during normal operations using a mobile-friendly interface. A photo of the sample port, a 30-second video of aseptic technique, a screenshot of the cell counter reading. Total extra effort: ~2 minutes per operation.

**Map** — Vent uses its existing embedding infrastructure (VoyageAI + Supabase vectors) and Claude to automatically align each photo or video to the exact SOP step it belongs to. Media uploaded during a "Daily Sampling" workflow maps to WX-SOP-1003-03 §5.2–5.5 without the operator needing to specify.

**Build** — With enough mapped media, Vent generates visual SOP walkthroughs: the original SOP text at each step, with embedded photos, video clips, and operator tips alongside it. It also builds searchable media libraries and training playlists — curated sequences covering end-to-end processes.

**Profile** — Each operator builds a personal expertise record within Vent. Every contribution is tracked — which procedures they've documented, how much their content is used by trainees. Senior operators get recognised for sharing knowledge. New operators get clear visual training paths with completion tracking.

### Why This Changes Everything

| Before | After |
|---|---|
| New starters read 300-line text SOPs cold | They watch the best operators perform each step on video |
| Tacit knowledge walks out the door when people leave | It's captured in a permanent, searchable media library |
| Training quality depends on who's on shift | Every new starter gets the same standardised visual walkthrough |
| Operators passively follow procedures | They actively build the facility's training library |
| QA has paper sign-off sheets for training evidence | There's visual competency records tied to SOP steps |

### Rollout Phases

1. **Capture & Store (MVP)** — Mobile upload tied to workflows, basic step tagging, gallery view
2. **AI Mapping & Visual SOPs** — Automatic step alignment, visual walkthrough renderer, searchable media via AI chat
3. **Profiles & Training Pathways** — Operator profiles, competency mapping, auto-generated training playlists
4. **Continuous Improvement** — AI identifies coverage gaps, prompts operators to fill them, version-tracks media against SOP revisions

### GMP Safeguards

- All uploads pass through QA approval before entering training materials
- Written SOPs remain the controlled documents — visual content is supplementary
- Full audit trail on every upload, approval, and edit
- Uploaded media is checksummed and immutable once approved (ALCOA+)
- Role-based access controls who can upload, approve, and view

---

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project with pgvector extension enabled
- Anthropic API key (Claude access)
- VoyageAI API key

### Environment Variables

```env
ANTHROPIC_API_KEY=your-anthropic-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
VOYAGE_API_KEY=your-voyage-key
TOKEN_SECRET=your-token-secret
```

### Setup

```bash
# Install dependencies
cd server
npm install

# Get the database setup SQL
# Visit GET /admin/setup after starting the server, then run the SQL in Supabase SQL Editor

# Ingest SOPs into the vector database
npm run ingest

# Start the server
npm start
```

The server runs on port 3001 by default. The frontend is served as static files from the `docs/` directory.

### Database Setup

Start the server and visit `GET /admin/setup` to get the full SQL schema. Run it in your Supabase SQL Editor. This creates all required tables:

- `submissions` — operator observations with AI analysis
- `sop_chunks` — embedded SOP sections for vector search
- `audit_log` — immutable audit trail
- `users` — authentication with hashed passwords
- `qa_notes` — QA session notes
- `sop_changes` — SOP change tracking
- `sop_annotations` — annotations on SOP changes
- `notifications` — user notification queue
- `capas` — corrective action tracking

---

## Project Structure

```
vent/
├── docs/                          # Frontend (static HTML/CSS/JS)
│   ├── index.html                 # Observation submission
│   ├── query.html                 # Operator SOP knowledge search
│   ├── builder.html               # Document Builder (IDE-style editor)
│   ├── qa.html                    # QA Control Centre
│   ├── workflow.html              # Observation submission workflow
│   ├── dashboard.html             # Director analytics dashboard
│   ├── submissions.html           # Floor submissions view
│   └── login.html                 # Authentication
│
└── server/                        # Backend
    ├── index.js                   # Express server — all routes and logic
    ├── package.json
    ├── data/
    │   └── contacts.js            # Facility contacts directory
    ├── docs/
    │   ├── FEATURE-VISUAL-SOP-ENGINE.md  # Visual SOP Engine proposal
    │   └── sops/                  # Source SOP documents (Markdown)
    │       ├── WX-SOP-1001-03.md
    │       ├── WX-SOP-1002-03.md
    │       ├── WX-SOP-1003-03.md
    │       ├── WX-SOP-1004-03.md
    │       ├── WX-SOP-1005-03.md
    │       └── WX-BPR-2001-03.md
    └── scripts/
        └── ingest-sops.js         # SOP ingestion pipeline script
```

---

## The Vision

Vent exists because the best ideas for improving a manufacturing process come from the people running it — and those ideas should never be lost to fear, bureaucracy, or forgetting.

Every observation an operator submits makes the facility smarter. Every video they capture makes training better. Every pattern the AI detects makes quality stronger. The knowledge compounds.

The operators aren't just following procedures. They're building the most complete, living quality intelligence system in biologics manufacturing — and they're doing it anonymously, safely, and as part of their normal work.
