---
name: pipeline-code-quality
description: Orchestration playbook for evaluating and improving code quality across the codebase. Chains profiling, UX review, performance analysis, refactoring planning, and test coverage analysis.
tools: Agent, Read, Write, Glob, Grep, Bash
model: opus
---

# Code Quality Pipeline

A 6-phase pipeline for evaluating and improving Vent's code quality. Run this after a build round to harden the codebase, or periodically as a health check.

## Trigger

- "Run the code quality pipeline"
- "Evaluate code quality"
- "How healthy is the codebase?"

## The Pipeline

```
PHASE 1 — PROFILE            1 agent              ~3 min
    ↓ (code health scorecard)
PHASE 2 — UX REVIEW          1 agent              ~3 min
    ↓ (UX issues and recommendations)
PHASE 3 — PERFORMANCE        1 agent              ~3 min
    ↓ (slow endpoints, heavy pages)
PHASE 4 — SECURITY           1 agent              ~3 min
    ↓ (vulnerabilities and compliance gaps)
PHASE 5 — TEST COVERAGE      1 agent              ~2 min
    ↓ (untested critical paths)
PHASE 6 — REFACTOR PLAN      1 agent              ~2 min
    ↓ (prioritized improvement backlog)

TOTAL                         6 agents, ~16 min
```

## Parallelism

Phases 1-5 are ALL independent — run them in parallel:

```
[code-profiler] [ux-reviewer] [performance-analyzer] [security-auditor] [test-coverage-analyzer]
                                    ↓ all complete ↓
                              [refactor-planner]
                        (reads all 5 reports as input)
```

This means 5 agents in parallel, then 1 sequential. Total wall time: ~5 min.

---

## PHASE 1 — Code Profile

```
code-profiler → "Profile all live modules. Check pattern compliance, complexity,
                 API consistency, frontend consistency, security surface, and dead code."
```

**Output:** `docs/research/code-profile-all.md`

## PHASE 2 — UX Review

```
ux-reviewer → "Review all live frontend pages for usability, accessibility,
               design consistency, and GMP-specific UX patterns."
```

**Output:** `docs/research/ux-review-all.md`

## PHASE 3 — Performance Analysis

```
performance-analyzer → "Profile all endpoints for response times. Analyze service
                        files for slow query patterns. Check frontend page weights."
```

**Output:** `docs/research/performance-report-all.md`

## PHASE 4 — Security Audit

```
security-auditor → "Audit all live modules for auth guards, SQL injection, RLS,
                    XSS, OWASP top 10, and 21 CFR Part 11 compliance."
```

**Output:** `docs/research/security-audit-all.md`

## PHASE 5 — Test Coverage

```
test-coverage-analyzer → "Analyze test coverage across all modules. Identify
                          critical untested code paths and prioritize."
```

**Output:** `docs/research/test-coverage-report.md`

## PHASE 6 — Refactor Plan (reads all above)

```
refactor-planner → "Read the reports in docs/research/ (code-profile, ux-review,
                    performance-report, security-audit, test-coverage-report) and
                    produce a unified refactoring backlog prioritized by impact."
```

**Output:** `docs/research/refactor-plan-all.md`

---

## Final Deliverable

After all phases complete, the orchestrator produces a summary:

```markdown
# Code Quality Report — {date}

## Health Score: X/100

| Dimension | Score | Critical Issues |
|-----------|-------|----------------|
| Code Quality | X/100 | N |
| UX & Accessibility | X/100 | N |
| Performance | X/100 | N |
| Security | X/100 | N |
| Test Coverage | X% | N untested critical paths |

## Top 5 Actions
1. ...
```

Saved to `docs/research/code-quality-summary.md`.
