---
name: pipeline-orchestrator
description: Master orchestration spec that defines the full 15-agent build pipeline for a round. Not an executable agent itself — it is the playbook the human operator and Claude follow to run a complete round end-to-end.
tools: Agent, Read, Write, Glob, Grep, Bash, WebSearch, WebFetch
model: opus
---

# Pipeline Orchestrator — Full Round Build Playbook

This document defines the complete 15-agent pipeline for building a round of 5 modules. The operator (Darren) triggers each phase by saying "run phase N" or "run the full pipeline for Round X". Claude acts as the orchestrator — spawning agents, passing outputs between them, and gating progress.

## Project Root

`/Users/darrendoherty/Desktop/vent`

## Inputs

- **Round number** (e.g., 3)
- **Module list** (e.g., change-control, complaint-mgr, batch-disposition, qc-lab, inoc-cell-bank)
- Existing specs in `round-{N}-specs/` (if spec-writer has already run)

---

## The Pipeline

```
PHASE 1 — INTELLIGENCE          5 agents in parallel     ~5 min
    ↓ (research briefs land in docs/research/)
PHASE 2 — PLANNING              2 agents sequential      ~3 min
    ↓ (specs land in round-N-specs/)
PHASE 3 — BUILD                  5 agents in parallel     ~8 min
    ↓ (service + routes + HTML per module)
PHASE 4 — REVIEW GATE            5 agents in parallel     ~3 min
    ↓ (pass/fail per module — fix before proceeding)
PHASE 5 — MERGE                  1 agent                  ~3 min
    ↓ (shared files updated: ids.js, admin.js, index.js, nav.js)
PHASE 6 — VALIDATE               2 agents in parallel     ~2 min
    ↓ (schema + tests)
PHASE 7 — INTEGRATION            1 agent                  ~3 min
    ↓ (server starts clean)
PHASE 8 — QUALITY GATE           2 agents in parallel     ~3 min
    ↓ (endpoints work + security passes)
PHASE 9 — FINALIZE               3 agents in parallel     ~2 min
    ↓ (progress tracking + docs + RAG updated)

TOTAL                            ~15 agents, ~30 min
```

---

## PHASE 1 — Intelligence Gathering (NEW)

**Agents:** 5x `research-agent` in parallel
**Trigger:** "Run Phase 1 for Round {N}"
**Depends on:** Nothing — this is the starting point

Spawn 5 research agents simultaneously, one per module:

```
research-agent → "Research change control in GMP biologics manufacturing"
research-agent → "Research complaints and recalls management in pharmaceutical manufacturing"
research-agent → "Research batch disposition and release in biologics"
research-agent → "Research QC laboratory management in pharmaceutical manufacturing"
research-agent → "Research cell bank management for biologics manufacturing"
```

Each agent reads the existing spec in `round-{N}-specs/` for context, then conducts web research and saves a brief to `docs/research/`.

**Outputs:**
- `docs/research/change-control-research.md`
- `docs/research/complaints-recalls-research.md`
- `docs/research/batch-disposition-research.md`
- `docs/research/qc-lab-research.md`
- `docs/research/cell-bank-research.md`

**Gate:** All 5 briefs exist and are non-empty. Operator reviews key findings.

---

## PHASE 2 — Planning & Spec Enhancement

**Agents:** `round-planner` then `spec-writer` (sequential)
**Trigger:** "Run Phase 2 for Round {N}"
**Depends on:** Phase 1 outputs (research briefs)

### Step 2a: Round Planner
If modules are already selected for this round, skip this step. Otherwise:

```
round-planner → "Plan Round {N}. Read the research briefs in docs/research/ for context."
```

### Step 2b: Spec Writer (Enhanced)
If specs already exist, the spec-writer should READ the research briefs and ENHANCE the existing specs with:
- Regulatory requirements discovered in research
- Competitor features worth matching
- AI opportunities identified
- Workflow improvements from best practices

```
spec-writer → "Write/enhance specs for Round {N}.
               Read the research briefs in docs/research/ and incorporate:
               - Regulatory requirements into the spec
               - Best practice workflows into the frontend features
               - AI feature recommendations into the AI Features section
               - Competitor features we should match into the feature list
               Modules: {list}"
```

**Outputs:** 5 spec files in `round-{N}-specs/`

**Gate:** Operator reviews specs. Each spec should reference research findings.

---

## PHASE 3 — Parallel Build

**Agents:** 5x `module-builder` in parallel (each in its own git worktree)
**Trigger:** "Run Phase 3 for Round {N}"
**Depends on:** Phase 2 outputs (specs)

Spawn 5 module builders simultaneously, each in an isolated worktree:

```
module-builder (worktree) → "Build module from round-{N}-specs/agent-1-change-control.md"
module-builder (worktree) → "Build module from round-{N}-specs/agent-2-complaint-mgr.md"
module-builder (worktree) → "Build module from round-{N}-specs/agent-3-batch-disposition.md"
module-builder (worktree) → "Build module from round-{N}-specs/agent-4-qc-lab.md"
module-builder (worktree) → "Build module from round-{N}-specs/agent-5-inoc-cell-bank.md"
```

Each produces 3 files:
- `server/services/{module}.service.js`
- `server/routes/{module}.js`
- `docs/{dept}/{page}.html`

**Outputs:** 15 files across 5 worktrees

**Gate:** All 5 builders complete without errors.

---

## PHASE 4 — Code Review Gate

**Agents:** 5x `code-reviewer` in parallel
**Trigger:** "Run Phase 4 for Round {N}"
**Depends on:** Phase 3 outputs (built modules)

```
code-reviewer → "Review change-control module against spec and project conventions"
code-reviewer → "Review complaint-mgr module against spec and project conventions"
code-reviewer → "Review batch-disposition module against spec and project conventions"
code-reviewer → "Review qc-lab module against spec and project conventions"
code-reviewer → "Review inoc-cell-bank module against spec and project conventions"
```

Each reviewer checks:
- Service follows factory pattern
- Routes have auth guards on every endpoint
- Audit logging on all mutations
- Frontend uses authFetch(), dark theme, split-panel layout
- Matches the spec (including research-informed features)
- No security vulnerabilities

**Outputs:** 5 review reports (pass/fail with issues)

**Gate:** ALL modules must pass. If any fail, fix issues and re-review before proceeding.

---

## PHASE 5 — Merge

**Agents:** 1x `shared-file-merger`
**Trigger:** "Run Phase 5 for Round {N}"
**Depends on:** Phase 4 (all reviews pass)

```
shared-file-merger → "Merge 5 Round {N} module outputs into shared files:
                       - server/lib/ids.js (new ID generators)
                       - server/routes/admin.js (new CREATE TABLE statements)
                       - server/index.js (require, instantiate, PAGE_MAP, mount)
                       - docs/shared/nav.js (nav menu entries if needed)"
```

**Outputs:** 4 shared files updated with exact insertion points

**Gate:** No merge conflicts. All insertions in correct locations.

---

## PHASE 6 — Validate (Parallel)

**Agents:** `schema-validator` + `test-writer` in parallel
**Trigger:** "Run Phase 6 for Round {N}"
**Depends on:** Phase 5 (merge complete)

```
schema-validator → "Validate all new SQL in admin.js for Round {N} modules"
test-writer      → "Write Vitest unit tests for all 5 Round {N} service layers"
```

Run simultaneously. Also spawn `i18n-agent` here:

```
i18n-agent → "Add EN/ZH/ES translation keys for all 5 Round {N} modules"
```

**Outputs:**
- Schema validation report (pass/fail)
- Test files in `server/tests/` or `tests/`
- Updated `docs/shared/i18n.js`

**Gate:** Schema validates. Tests exist (don't need to pass yet — merge-debugger may fix wiring first).

---

## PHASE 7 — Integration Fix-up

**Agents:** 1x `merge-debugger`
**Trigger:** "Run Phase 7 for Round {N}"
**Depends on:** Phase 6 (validation complete)

```
merge-debugger → "Start the server and fix all wiring bugs until clean startup.
                  Then run the test suite and fix any failures."
```

This agent:
1. Runs `node server/index.js`
2. Reads error output
3. Fixes require paths, missing dependencies, typos
4. Repeats until server starts cleanly
5. Runs tests and fixes failures

**Outputs:** Clean server startup, passing tests

**Gate:** Server starts without errors. Tests pass.

---

## PHASE 8 — Quality Gate (Parallel)

**Agents:** `integration-tester` + `security-auditor` in parallel
**Trigger:** "Run Phase 8 for Round {N}"
**Depends on:** Phase 7 (server starts clean)

```
integration-tester → "Start server, hit every new Round {N} endpoint with auth tokens, report pass/fail"
security-auditor   → "Audit all 5 Round {N} modules for auth guards, SQL injection, RLS, OWASP, 21 CFR Part 11"
```

**Outputs:**
- Integration test report (endpoint → status code → pass/fail)
- Security audit report (issues by severity)

**Gate:** All endpoints return expected responses. No critical/high security issues.

---

## PHASE 9 — Finalize (Parallel)

**Agents:** `progress-updater` + `docs-generator` + `rag-updater` in parallel
**Trigger:** "Run Phase 9 for Round {N}"
**Depends on:** Phase 8 (quality gate passes)

```
progress-updater → "Update dev-progress.js, dev.html kanban, and project.html for Round {N} modules (status: live)"
docs-generator   → "Create technical README for each Round {N} module"
rag-updater      → "Create SOP markdown files for Round {N} modules and ingest into RAG"
```

**Outputs:**
- Updated tracking files (dev-progress.js, dev.html, project.html)
- README files per module
- SOP documents ingested into RAG pipeline

**Gate:** None — this is the final step.

---

## Operator Commands

The operator can run the pipeline in different ways:

| Command | What Happens |
|---------|-------------|
| "Run the full pipeline for Round 3" | All 9 phases, sequentially gated |
| "Run Phase 1 for Round 3" | Just intelligence gathering |
| "Run Phases 1-2 for Round 3" | Research + planning only |
| "Run Phase 3 for Round 3" | Just the build (assumes specs exist) |
| "Resume from Phase 5 for Round 3" | Pick up mid-pipeline |
| "Re-run Phase 4 for change-control" | Re-review a single module |

## Parallelism Map

```
Phase 1:  [research] [research] [research] [research] [research]    ← 5 parallel
Phase 2:  [round-planner] → [spec-writer]                           ← sequential
Phase 3:  [builder]  [builder]  [builder]  [builder]  [builder]     ← 5 parallel
Phase 4:  [reviewer] [reviewer] [reviewer] [reviewer] [reviewer]    ← 5 parallel
Phase 5:  [merger]                                                   ← 1 sequential
Phase 6:  [schema-validator] [test-writer] [i18n-agent]              ← 3 parallel
Phase 7:  [merge-debugger]                                           ← 1 sequential
Phase 8:  [integration-tester] [security-auditor]                    ← 2 parallel
Phase 9:  [progress-updater] [docs-generator] [rag-updater]          ← 3 parallel
```

**Max parallelism:** 5 agents simultaneously (Phases 1, 3, 4)
**Total agent spawns:** 26 (some phases spawn multiple)
**Sequential bottlenecks:** Phase 2 (planning), Phase 5 (merge), Phase 7 (debug)

## Error Recovery

| Situation | Action |
|-----------|--------|
| Research agent fails on one module | Re-run just that one research agent |
| Builder produces broken code | Code reviewer catches it → fix → re-review |
| Merge conflicts | Shared-file-merger resolves, or escalate to operator |
| Server won't start | Merge-debugger iterates until fixed (max 10 attempts) |
| Integration tests fail | Fix endpoint → re-run integration-tester |
| Security issue found | Fix issue → re-run security-auditor on affected module |

## File System = Shared Memory

Agents communicate through the file system:

```
docs/research/*.md          ← Phase 1 writes, Phase 2 reads
round-N-specs/*.md          ← Phase 2 writes, Phase 3 reads
server/services/*.js        ← Phase 3 writes, Phase 4+ reads
server/routes/*.js          ← Phase 3 writes, Phase 4+ reads
docs/{dept}/*.html          ← Phase 3 writes, Phase 4+ reads
server/lib/ids.js           ← Phase 5 modifies
server/routes/admin.js      ← Phase 5 modifies
server/index.js             ← Phase 5 modifies
docs/shared/i18n.js         ← Phase 6 modifies
docs/shared/dev-progress.js ← Phase 9 modifies
```

Every agent reads files from disk. Every agent writes files to disk. The file system is the message bus.
