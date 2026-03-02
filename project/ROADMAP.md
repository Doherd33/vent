# Vent — Refactor Roadmap & Architecture

> Living document tracking the architectural refactor from prototype to production-grade system.
> Started: March 2026

---

## Progress Tracker

```mermaid
gantt
    title Vent Architectural Refactor
    dateFormat  YYYY-MM-DD
    axisFormat  %d %b

    section Phase 1 · Foundations
    LangSmith instrumentation ✓        :done, p1a, 2026-03-02, 1d
    Config module + remove hardcoded keys ✓ :done, p1b, after p1a, 1d
    Error handling + request logging middleware ✓ :done, p1d, after p1b, 1d
    Service layer extraction ✓         :done, p1c, after p1d, 1d
    Basic test harness (Vitest) ✓      :done, p1e, after p1c, 1d

    section Phase 2 · Multi-Agent Pipeline
    Specialised agents (classifier, analyst, router, CAPA) ✓ :done, p2a, after p1e, 2d
    LangGraph submission pipeline graph ✓ :done, p2b, after p2a, 2d
    SOP query agent + builder agent ✓  :done, p2c, after p2b, 1d
    Charlie voice agent refactor ✓     :done, p2d, after p2c, 1d

    section Phase 3 · Voice
    VAPI integration + Charlie handoff  :p3a, after p2d, 1d
    Real-time voice pipeline testing    :p3b, after p3a, 1d

    section Phase 4 · Observability
    LangSmith eval datasets            :p4a, after p3b, 2d
    Argilla annotation setup           :p4b, after p4a, 3d
    Prompt versioning + regression tests :p4c, after p4b, 2d
```

---

## Target System Architecture

```mermaid
flowchart TD
    subgraph CLIENT["Client (Browser)"]
        UI_Q[query.html\nSOP Search]
        UI_W[workflow.html\nSubmission Workflow]
        UI_QA[qa.html\nQA Control Centre]
        UI_D[dashboard.html\nDirector Analytics]
        UI_B[builder.html\nDoc Builder]
        UI_V[Voice · Charlie\nVAPI / ElevenLabs]
    end

    subgraph SERVER["Express Server"]
        subgraph ROUTES["routes/ · Thin HTTP handlers only"]
            R_SOP[sop.js]
            R_SUB[submit.js]
            R_CHAT[chat.js]
            R_CAPA[capa.js]
            R_VOICE[voice.js]
            R_GDP[gdp.js]
        end

        subgraph SERVICES["services/ · Business logic"]
            S_SUB[submission.service.js]
            S_CAPA[capa.service.js]
            S_SOP[sop.service.js]
            S_WF[workflow.service.js]
        end

        subgraph GRAPHS["graphs/ · LangGraph"]
            G_PIPE[submission-pipeline.js\nClassify → Retrieve → Analyse\n→ Route → Create CAPA]
        end

        subgraph AGENTS["agents/ · Specialised AI"]
            A_CL[classifier.js\nTriage + Priority]
            A_AN[analyst.js\nRoot Cause + Actions]
            A_RO[router.js\nContact Assignment]
            A_CA[capa-writer.js\nCAPA Records]
            A_SQ[sop-query.js\nSemantic Search]
            A_CH[charlie.js\nVoice Assistant]
            A_BD[builder.js\nSOP Drafting]
        end

        subgraph LIB["lib/ · Core utilities"]
            L_RAG[rag.js\nVoyage + pgvector]
            L_AUD[audit.js\nAudit logging]
            L_AUTH[auth.js\nJWT + RBAC]
            L_CFG[config.js ✨new\nEnv validation]
        end

        subgraph MW["middleware/"]
            MW_ERR[error-handler.js]
            MW_LOG[request-logger.js]
        end
    end

    subgraph EXTERNAL["External Services"]
        CLAUDE[Anthropic Claude\nclaude-sonnet-4]
        VOYAGE[VoyageAI\nEmbeddings]
        ELEVEN[ElevenLabs\nSTT + TTS]
        VAPI[VAPI\nReal-time Voice Pipelines]
        LS[LangSmith\nTracing + Evals]
        ARGILLA[Argilla\nDataset Annotation]
    end

    subgraph DATA["Supabase (Postgres)"]
        DB_SUB[(submissions)]
        DB_SOP[(sop_chunks\npgvector)]
        DB_CAPA[(capa_records)]
        DB_CHAT[(chat_sessions)]
        DB_AUD[(audit_log)]
    end

    CLIENT --> ROUTES
    ROUTES --> SERVICES
    SERVICES --> GRAPHS
    GRAPHS --> AGENTS
    AGENTS --> CLAUDE
    AGENTS --> LS
    SERVICES --> LIB
    LIB --> VOYAGE
    LIB --> DATA
    R_VOICE --> VAPI
    R_VOICE --> ELEVEN
    A_CH --> VAPI
    CLAUDE -.->|traces| LS
    LS -.->|curated data| ARGILLA
```

---

## What Each Phase Does

### Phase 1 — Foundations
*Goal: Stop flying blind. Make the codebase behave like professional software.*

| Task | What it does | Why it matters |
|---|---|---|
| **LangSmith instrumentation** | Wraps every Claude call with tracing | You can see exactly what every AI call costs, how long it takes, and what it returned. Essential for a regulated environment. |
| **Config module** | Validates all env vars at startup, removes hardcoded API keys | Right now a missing key silently fails mid-request. With a config module it fails loudly at boot. Also removes the hardcoded VoyageAI key in `rag.js`. |
| **Service layer** | Moves business logic out of route handlers | Routes should only handle HTTP (parse body, set status, send response). Services own the actual logic. This makes testing possible. |
| **Error + logging middleware** | Centralised error handler and structured request logs | Right now errors are scattered `console.error` calls. One middleware catches everything consistently. |
| **Test harness** | Vitest setup with a handful of unit tests on services | Proves the code actually works and catches regressions when you change things. |

---

### Phase 2 — Multi-Agent Pipeline
*Goal: Replace "one Big Claude doing everything" with a graph of specialised agents.*

**Current state:** A single massive Claude call in your submission route handles triage, root cause, SOP cross-referencing, CAPA generation, and contact routing all at once. One prompt, one response, no visibility into which step failed.

**Target state:** A LangGraph stateful graph where each node is a discrete agent with a single responsibility:

```
Submission arrives
      │
      ▼
ClassifierAgent ──── assigns priority + process area
      │
      ▼
RetrieverAgent ────── fetches relevant SOP chunks via RAG
      │
      ▼
AnalystAgent ────────  root cause hypothesis, risk, regulatory flags
      │
      ▼
RouterAgent ──────── assigns contacts, workflow phase, CAPA timing
      │
      ▼
CAPAAgent ─────────  generates structured CAPA records
      │
      ▼
 Saved to Supabase
```

Each node can be retried independently. Each has its own LangSmith trace. Human-in-the-loop pause points can be added between any two nodes (e.g., QA must approve before `CAPAAgent` fires). This maps directly onto your existing multi-phase workflow model.

---

### Phase 3 — Voice
*Goal: Replace the manually stitched ElevenLabs STT → Claude → ElevenLabs TTS chain with a proper real-time voice pipeline.*

**Current state:** Your `/charlie/ask` endpoint is request/response — operator speaks, browser records, sends base64 audio to your server, you call ElevenLabs STT, pass text to Claude, pass response to ElevenLabs TTS, return audio. Round-trip latency: 3-5 seconds minimum. No interruption handling.

**Target state:** [VAPI](https://vapi.ai) manages a persistent WebRTC session. Charlie becomes a VAPI assistant with a Claude backend. You get:
- Sub-300ms turn detection
- Natural interruption handling (operator can cut Charlie off mid-sentence)
- Built-in STT/TTS, or bring your own ElevenLabs voice
- Server-sent events for real-time transcripts
- A single `/vapi/webhook` endpoint on your server to handle tool calls

This is mostly a **reduction** in code, not an addition.

---

### Phase 4 — Observability & Evals
*Goal: Know whether your AI is actually good. Build the data flywheel.*

- **LangSmith eval datasets** — curate real submission inputs and expected outputs into evaluation sets. Run them automatically to catch prompt regressions.
- **Argilla** — the feedback data you're already collecting via your feedback routes gets annotated and curated into training/eval datasets. Over time this tells you exactly where the model is weak (wrong priority classification, bad contact routing, etc.).
- **Prompt versioning** — prompts live in version-controlled files, not inline strings. You can A/B test prompt changes against your eval sets before deploying.

---

## Current vs Target File Structure

```
server/
├── agents/                     ✨ new
│   ├── classifier.js
│   ├── analyst.js
│   ├── router.js
│   ├── capa-writer.js
│   ├── sop-query.js
│   ├── charlie.js
│   └── builder.js
├── graphs/                     ✨ new
│   └── submission-pipeline.js
├── services/                   ✨ new
│   ├── submission.service.js
│   ├── capa.service.js
│   ├── sop.service.js
│   └── workflow.service.js
├── middleware/                  ✨ new
│   ├── error-handler.js
│   └── request-logger.js
├── lib/
│   ├── config.js               ✨ new  — centralised env validation
│   ├── rag.js                  ✅ keep — already solid
│   ├── audit.js                ✅ keep
│   └── auth.js                 ✅ keep
├── routes/                     ♻️  thin down — HTTP only, no business logic
│   ├── auth.js
│   ├── admin.js
│   ├── submit.js
│   ├── sop.js
│   ├── capa.js
│   ├── gdp.js
│   ├── builder.js
│   ├── chat.js
│   ├── voice.js
│   └── feedback.js
├── data/
│   └── contacts.js             ✅ keep
└── index.js                    ♻️  wire in new middleware
```

---

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Runtime | Node.js (stay) | No reason to split the stack for LangGraph.js |
| Agent framework | LangGraph.js | Has a proper JS SDK, traces to LangSmith natively, fits your stateful submission pipeline exactly |
| Observability | LangSmith | First-party Anthropic/LangChain integration, minimal setup |
| Voice pipeline | VAPI | Managed WebRTC, handles STT/TTS, far less code than current approach |
| Dataset curation | Argilla | Best open-source tool for this; connects to LangSmith |
| Testing | Vitest | Fast, native ESM support, good DX |
| Model | Claude Sonnet 4 (keep) | Already using it; specialised agents means smaller prompts = cheaper per call |

---

*Update this document as phases complete. Check off tasks in the Gantt by moving their start dates to match actual progress.*
