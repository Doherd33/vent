# Vent — Project Context

## Vision

Vent is a **spatially-grounded manufacturing intelligence system** for the pharmaceutical sector. The core idea: a visual, interactive 3D representation of the manufacturing floor where every piece of equipment is a living node connected to the facility's entire knowledge graph.

### The Hub is the Product

The hub page is the centrepiece — not a landing page, not a dashboard, but the **primary interface** through which all intelligence flows. An operator walks up, sees the floor, taps a bioreactor, and instantly has access to:

- **SOPs** — every procedure tied to that equipment
- **PBRs** — batch-specific execution records
- **Deviations / CAPAs** — what's gone wrong, what was fixed
- **Training records / OJTs** — who's qualified, what's outstanding
- **Maintenance logs** — service history, calibration status
- **Real-time context** — current batch, current phase, recent observations
- **Company data** — any relevant organisational knowledge

The LLM layer sits on top of this spatial knowledge graph. Operators ask questions in plain language (voice or text) and get answers grounded in the actual connected data — not generic responses, but answers that know which equipment, which batch, which SOP section, which training gap.

### Why Visual-First

Reading documents is not the same as interacting with a system. Operators think spatially — "the pump on Reactor 3" — not "SOP WX-SOP-1003 section 4.2." A visual floor map collapses what currently takes 20 minutes of digging through QMS systems into 2 seconds. That's not incremental improvement, that's a category change in how people interact with manufacturing knowledge.

### The Ambition

This system, fully built out, connects what no other platform connects: QMS, CMMS, LMS, batch records, and real-time process data — all through the equipment itself. Every module already built (submissions, CAPAs, doc control, SOP query, GDP check, voice AI) becomes a detail view reachable from the spatial context. The hub is the front door to everything.

The goal is to build the most powerful AI system in pharmaceutical manufacturing.

### Current State

**MVP demo phase.** The core pipeline works (observation -> deviation -> CAPA -> SOP change). 13 modules visible, 17 more built but hidden. The visual hub with Three.js is being built out. Everything centres on proving the hub concept and making the floor come alive.

Three.js is the rendering engine for now — sufficient for demo and proof-of-concept, but will be replaced as the visual system scales to full facility representation. Future candidates include WebGPU-based renderers, game engines (Unity/Unreal), or digital twin platforms. The rendering engine is a swappable layer, not a permanent decision.

---

## Architecture

- **Frontend**: Vanilla HTML/CSS/JS + Three.js (3D viewport) + Vite dev server. No framework — intentionally lightweight.
- **Backend**: Node.js/Express with service-factory pattern (dependency injection).
- **AI**: Claude (Anthropic) via multi-agent LangGraph pipeline. Discrete agents: classifier, analyst, router, capa-writer, charlie (voice), sop-query.
- **RAG**: VoyageAI embeddings + Supabase pgvector. Text-search fallback.
- **Voice**: ElevenLabs STT/TTS + Charlie conversational assistant.
- **Database**: Supabase PostgreSQL + pgvector. 14+ tables. Immutable audit log with SHA-256 checksums.
- **Compliance**: 21 CFR Part 11 / EU Annex 11. ALCOA+ audit trails. Role-based access control (7 roles).
- **Prompts**: Versioned markdown files (.v1.md) with loader caching and variable interpolation.

## Key Paths

- `client/` — frontend (restructured from `docs/`). Hub at `client/hub/`.
- `server/agents/` — LLM agents (classifier, analyst, router, capa-writer, charlie, sop-query)
- `server/services/` — business logic (submission, sop, capa, chat, voice, doc-control)
- `server/routes/` — thin HTTP handlers delegating to services
- `server/prompts/` — versioned prompt templates
- `server/lib/` — core utilities (auth, audit, rag, config)
- `server/graphs/` — LangGraph stateful pipelines

## Navigation

- **Nav tabs**: `client/shared/nav.js` -> `MVP_TABS` array (single source of truth)
- **Hub cards**: `client/hub/hub.html` -> `cardRules` object
- Phase 2 modules routed in PAGE_MAP, fully functional, just hidden from nav/hub

## Dev

```bash
npm run dev        # Vite dev server (frontend) + Express (backend)
cd server && npm start  # Backend only
cd server && npm test   # Vitest
```
