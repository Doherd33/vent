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
- **AI Assist** — Claude-powered document operations: rewrite, expand, safety review, formatting, step generation from SOP context, and GMP compliance checking
- **Electronic sign-off** — 21 CFR Part 11 compliant sign-off with user authentication and reason capture
- **Server-side persistence** — documents stored in Supabase with full CRUD, versioning, and audit trail
- **Search and filter** — instant filtering across all documents by title or content

The Document Builder gives operators and QA a structured tool to author the documents that drive manufacturing — living alongside the observation and SOP systems rather than sitting in separate, disconnected tools.

### 10. Notification System

When a submission is created, all routed contacts receive notifications with:

- Priority level and observation excerpt
- Their assigned workflow phase
- Why they specifically were routed (contextual reason from AI analysis)

### 11. GDP Check

Camera-based document review for Good Documentation Practice compliance. Operators photograph paper batch records and logbook entries directly from the manufacturing floor:

- **Image preprocessing** — automatic contrast normalisation and sharpening for consistent AI analysis
- **Blue ink detection** — pixel-grid flood-fill algorithm identifies handwritten entries and annotations, generating bounding regions for Claude's visual inspection
- **AI-powered finding detection** — Claude vision analyses the document image against GDP rules: missing signatures, incorrect date formats, use of correction fluid, illegible entries, crossed-out text without countersignature
- **Finding management** — each finding is categorised by severity, linked to a specific document region, and tracked through a correction workflow
- **Document persistence** — GDP review documents are stored in Supabase with status tracking (draft → reviewed → corrected → closed)

### 12. Charlie — Voice AI Assistant

A conversational voice interface that lets operators interact with Vent hands-free:

- **Speech-to-text** — operators dictate questions or observations using ElevenLabs STT
- **Text-to-speech** — AI responses are spoken back for hands-free operation on the manufacturing floor
- **Real-time translation** — instant translation between English, Chinese, and Spanish
- **SOP-aware conversation** — `/charlie/ask` provides a Claude-backed conversational interface with full RAG context, so operators can ask SOP questions by voice and get spoken answers grounded in actual procedures

### 13. Chat System

Persistent chat sessions with Claude, backed by the full SOP RAG pipeline:

- **Session management** — create, resume, and search across conversation threads
- **SOP-grounded responses** — every answer is informed by relevant SOP context retrieved via vector search
- **Analysis export** — conversation analysis can be exported directly to the Document Builder as a new document
- **Personal todo list** — lightweight task tracking within the chat interface
- **Conversation search** — full-text search across all chat sessions

### 14. Feedback System

Structured feedback collection from operators about their Vent experience:

- **Categorised submissions** — feedback tagged by type (bug, feature request, usability, praise)
- **AI-powered batch analysis** — Claude analyses groups of feedback entries, identifies themes and patterns, generates prioritised recommendations
- **Prompt generation** — analysis results can be used to generate improvement prompts for product development
- **Role-scoped access** — operators, QA, directors, and admins can all submit feedback; analysis tools are available to QA and above

### 15. Internationalisation (i18n)

Full multi-language support across the entire interface:

- **Three languages** — English, Simplified Chinese (简体中文), and Spanish (Español)
- **Comprehensive coverage** — all navigation labels, role names, form placeholders, status badges, and UI text are translated
- **Persistent preference** — language selection stored in localStorage and applied on every page load
- **Dynamic switching** — language can be changed at any time without page reload

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (docs/)                          │
│  shared/styles.css · shared/nav.js · i18n.js                    │
│                                                                  │
│  index.html · query.html · qa.html · workflow.html               │
│  dashboard.html · submissions.html · builder.html                │
│  feedback.html · login.html                                      │
│                                                                  │
│  Static HTML/CSS/JS — served by Express                          │
└─────────────────────────┬───────────────────────────────────────┘
                          │ REST API
┌─────────────────────────▼───────────────────────────────────────┐
│                     Server (server/)                              │
│  Express.js · Auth (HMAC tokens) · Role-based access             │
│                                                                  │
│  lib/                          routes/                           │
│    auth.js    (JWT, RBAC)        auth.js      (login, register)  │
│    audit.js   (audit log)        admin.js     (setup, bootstrap) │
│    rag.js     (embeddings)       submit.js    (observations)     │
│    gdp-image.js (vision)         sop.js       (SOP search/CRUD) │
│                                  capa.js      (CAPAs, analytics) │
│                                  gdp.js       (GDP check)        │
│                                  builder.js   (doc builder)      │
│                                  chat.js      (chat sessions)    │
│                                  voice.js     (STT/TTS/Charlie)  │
│                                  feedback.js  (feedback loop)    │
└──────┬──────────────┬──────────────┬──────────────┬─────────────┘
       │              │              │              │
┌──────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐ ┌────▼────────┐
│  Claude AI  │ │  Supabase  │ │  VoyageAI  │ │ ElevenLabs  │
│  (Anthropic)│ │ PostgreSQL │ │ Embeddings │ │  STT / TTS  │
│             │ │ + pgvector │ │ voyage-3-  │ │             │
│  Analysis,  │ │ + Storage  │ │ lite       │ │  Voice I/O  │
│  routing,   │ │            │ │            │ │  for Charlie │
│  knowledge, │ │ Tables:    │ │ SOP chunks │ │  and floor   │
│  GDP check, │ │ submissions│ │ & queries  │ │  operators   │
│  chat,      │ │ sop_chunks │ │ embedded   │ │             │
│  doc assist │ │ audit_log  │ │ for vector │ └─────────────┘
│             │ │ users      │ │ similarity │
│             │ │ qa_notes   │ │ search     │
│             │ │ sop_changes│ │            │
│             │ │ sop_annot… │ └────────────┘
│             │ │ notific…   │
│             │ │ capas      │
│             │ │ documents  │
│             │ │ gdp_docs   │
│             │ │ chat_sess… │
│             │ │ feedback_… │
└─────────────┘ └────────────┘
```

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Static HTML/CSS/JS (no framework — intentionally lightweight) |
| Shared Frontend | `shared/styles.css` (CSS variables, title bar, nav) + `shared/nav.js` (auth, role filtering) |
| i18n | Custom `i18n.js` (English, Chinese, Spanish) |
| Server | Node.js + Express 5 |
| AI | Claude (Anthropic) via `@anthropic-ai/sdk` |
| Embeddings | VoyageAI (`voyage-3-lite` model) |
| Vision / Image | `sharp` (preprocessing, blue ink detection for GDP Check) |
| Voice | ElevenLabs (speech-to-text, text-to-speech) |
| Database | Supabase (PostgreSQL + pgvector + Row Level Security) |
| Auth | Custom HMAC-signed JWT tokens with PBKDF2 password hashing |
| Hosting | Railway |

### Roles

| Role | Nav Access |
|---|---|
| `operator` | Query SOPs, Doc Builder, Feedback |
| `qa` | Submit, Query SOPs, Submissions, Doc Builder, QA Control, Feedback |
| `director` | Submit, Query SOPs, Submissions, Doc Builder, QA Control, Dashboard, Feedback |
| `msat` | Submit, Query SOPs, Submissions, Doc Builder |
| `engineering` | Submit, Query SOPs, Submissions, Doc Builder |
| `admin` | Full access — Submit, Query SOPs, Submissions, Doc Builder, QA Control, Workflow, Dashboard, Feedback |

---

## Compliance

Vent is built for GMP-regulated environments and implements:

- **21 CFR Part 11 / EU Annex 11** — electronic signatures with user ID + reason for approval transitions
- **Immutable audit trail** — every action (submission, status change, SOP change, CAPA update, GDP review, document sign-off, login) is logged with SHA-256 checksums, timestamps, IP addresses, and user agents
- **ALCOA+ principles** — data is Attributable, Legible, Contemporaneous, Original, and Accurate
- **Role-based access control** — sensitive operations (status transitions, SOP changes, CAPA management, document sign-off) are restricted by role
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
- ElevenLabs API key (optional — for voice features)

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
- `documents` — Document Builder documents with versioning
- `gdp_documents` — GDP Check review documents and findings
- `chat_sessions` — persistent chat conversation history
- `feedback_entries` — operator feedback submissions
- `feedback_analysis` — AI-generated feedback analysis results

---

## Project Structure

```
vent/
├── docs/                              # Frontend (static HTML/CSS/JS)
│   ├── shared/
│   │   ├── styles.css                 # Shared CSS variables, title bar, nav
│   │   └── nav.js                     # Auth helpers, guard, role filtering
│   ├── i18n.js                        # Internationalisation (EN, ZH, ES)
│   ├── index.html                     # Observation submission
│   ├── query.html                     # SOP knowledge search
│   ├── builder.html                   # Document Builder (IDE-style)
│   ├── qa.html                        # QA Control Centre
│   ├── workflow.html                  # Observation workflow
│   ├── dashboard.html                 # Director analytics
│   ├── submissions.html               # Floor submissions
│   ├── feedback.html                  # Operator feedback
│   └── login.html                     # Authentication
│
└── server/                            # Backend
    ├── index.js                       # Express app — middleware, mounts, listen (~140 lines)
    ├── package.json
    ├── lib/
    │   ├── auth.js                    # JWT tokens, password hashing, RBAC middleware
    │   ├── audit.js                   # SHA-256 checksummed immutable audit log
    │   ├── rag.js                     # VoyageAI embeddings, SOP context building
    │   └── gdp-image.js              # Image preprocessing, blue ink detection
    ├── routes/
    │   ├── auth.js                    # Register, login, /me, change-password
    │   ├── admin.js                   # DB setup, bootstrap, audit queries
    │   ├── submit.js                  # Observation submission + AI analysis
    │   ├── sop.js                     # SOP search, query, ingest, annotations
    │   ├── capa.js                    # Notifications, CAPAs, analytics
    │   ├── gdp.js                     # GDP Check + visual query + persistence
    │   ├── builder.js                 # Doc Builder AI + sign-off
    │   ├── chat.js                    # Chat sessions, todos, analysis
    │   ├── voice.js                   # STT, TTS, translate, Charlie voice
    │   └── feedback.js                # Feedback collection + AI analysis
    ├── data/
    │   └── contacts.js                # Facility contacts directory
    ├── docs/
    │   ├── FEATURE-VISUAL-SOP-ENGINE.md  # Visual SOP Engine proposal
    │   └── sops/                      # Source SOP documents (Markdown)
    │       ├── WX-SOP-1001-03.md
    │       ├── WX-SOP-1002-03.md
    │       ├── WX-SOP-1003-03.md
    │       ├── WX-SOP-1004-03.md
    │       ├── WX-SOP-1005-03.md
    │       └── WX-BPR-2001-03.md
    └── scripts/
        └── ingest-sops.js             # SOP ingestion pipeline
```

---

## The Vision

Vent exists because the best ideas for improving a manufacturing process come from the people running it — and those ideas should never be lost to fear, bureaucracy, or forgetting.

Every observation an operator submits makes the facility smarter. Every document they review for GDP compliance raises the bar. Every pattern the AI detects makes quality stronger. Every voice question asked on the floor makes SOPs more accessible. The knowledge compounds.

The operators aren't just following procedures. They're building the most complete, living quality intelligence system in biologics manufacturing — and they're doing it anonymously, safely, and as part of their normal work.
