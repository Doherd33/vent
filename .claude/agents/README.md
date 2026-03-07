# Vent Agent Directory

33 specialized agents organized by function. Each `.md` file is a Claude Code subagent spec.

---

## Build Pipeline (15 agents)

These run in sequence during a build round. See `pipeline-orchestrator.md` for the full 10-phase flow.

| # | Agent | File | Purpose |
|---|-------|------|---------|
| 1 | Round Planner | `round-planner.md` | Reads dependency graph, picks next 5 modules |
| 2 | Spec Writer | `spec-writer.md` | Writes detailed build specs for each module |
| 3 | Module Builder | `module-builder.md` | Builds service + routes + frontend (runs x5 in parallel) |
| 4 | Code Reviewer | `code-reviewer.md` | Reviews output against spec and conventions (runs x5) |
| 5 | Shared File Merger | `shared-file-merger.md` | Merges 5 outputs into ids.js, admin.js, index.js, nav.js |
| 6 | Schema Validator | `schema-validator.md` | Validates SQL structure, FKs, RLS, naming |
| 7 | Merge Debugger | `merge-debugger.md` | Starts server, fixes wiring bugs until clean startup |
| 8 | Test Writer | `test-writer.md` | Writes Vitest unit tests for service layers |
| 9 | i18n Agent | `i18n-agent.md` | Adds EN/ZH/ES translations for new modules |
| 10 | Integration Tester | `integration-tester.md` | Hits every endpoint with auth, reports pass/fail |
| 11 | Security Auditor | `security-auditor.md` | Checks auth guards, RLS, OWASP, 21 CFR Part 11 |
| 12 | Progress Updater | `progress-updater.md` | Updates dev-progress.js, dev.html, project.html |
| 13 | Docs Generator | `docs-generator.md` | Creates technical READMEs per module |
| 14 | RAG Updater | `rag-updater.md` | Creates SOPs, ingests into RAG for Charlie AI |
| 15 | File Organizer | `file-organizer.md` | Reorganizes stray files into department folders |

## Quality & Analysis (6 agents)

On-demand agents for evaluating codebase health.

| Agent | File | Purpose |
|-------|------|---------|
| Code Profiler | `code-profiler.md` | Complexity, duplication, dead code, tech debt scoring |
| UX Reviewer | `ux-reviewer.md` | Frontend UX, accessibility, design consistency |
| Performance Analyzer | `performance-analyzer.md` | Endpoint profiling, slow queries, page weight |
| Compliance Auditor | `compliance-auditor.md` | FDA 21 CFR Part 11, EU GMP Annex 11, ALCOA+ mapping |
| Test Coverage Analyzer | `test-coverage-analyzer.md` | Finds untested code paths, prioritizes test writing |
| Refactor Planner | `refactor-planner.md` | Identifies duplication, inconsistencies, improvements |

## Research (2 agents)

Deep web research for strategic decision-making.

| Agent | File | Purpose |
|-------|------|---------|
| Research Agent | `research-agent.md` | Industry practices, regulations, competitors, best practices |
| Pitch Researcher | `pitch-researcher.md` | Prospect/investor research, tailored positioning |

## Release & Demo (4 agents)

Preparing releases and demo packages.

| Agent | File | Purpose |
|-------|------|---------|
| Migration Planner | `migration-planner.md` | Safe, reversible database migration scripts |
| Changelog Generator | `changelog-generator.md` | Release notes from git history and round outputs |
| Demo Data Generator | `demo-data-generator.md` | Realistic GMP demo data with cross-module relationships |
| Demo Script Writer | `demo-script-writer.md` | Click-by-click demo walkthroughs for specific audiences |

## Orchestration Pipelines (6 pipelines)

These chain multiple agents together into coordinated workflows.

| Pipeline | File | Agents Used | Trigger |
|----------|------|-------------|---------|
| Build Round | `pipeline-orchestrator.md` | 26 spawns, 9 phases | "Run Round {N}" |
| Code Quality | `pipeline-code-quality.md` | 6 agents, 5 parallel | "Evaluate code quality" |
| Compliance | `pipeline-compliance.md` | 3 agents | "Check FDA compliance" |
| Demo Prep | `pipeline-demo-prep.md` | 4 agents | "Prepare demo for {audience}" |
| Release | `pipeline-release.md` | 4 agents parallel | "Prepare release" |
| Competitive Intel | `pipeline-competitive-intel.md` | 4 agents | "Research the competition" |

---

## How to Use

**Run a single agent:**
```
Use the [agent-name] agent to [task description]
```

**Run a pipeline:**
```
Use the [pipeline-name] pipeline to [goal]
```

**Build a round (tmux parallel):**
```
bash scripts/launch-round.sh
```

## Future: Subdirectory Organization

If Claude Code supports recursive agent discovery, reorganize into:
```
agents/
  build/       (15 files)
  quality/     (6 files)
  research/    (2 files)
  release/     (4 files)
  pipelines/   (6 files)
  README.md
```
Test by moving one agent to a subfolder and checking if it's still discoverable.
