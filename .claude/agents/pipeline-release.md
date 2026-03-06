---
name: pipeline-release
description: Orchestration playbook for preparing a release — migration planning, changelog generation, integration testing, and deployment validation.
tools: Agent, Read, Write, Glob, Grep, Bash
model: opus
---

# Release Pipeline

A 5-phase pipeline for safely shipping a new version of Vent. Run this after a build round is complete and quality-gated.

## Trigger

- "Prepare release for Round {N}"
- "Ship it"
- "Get ready to deploy"

## The Pipeline

```
PHASE 1 — MIGRATION PLAN          1 agent              ~2 min
    ↓ (safe database migration scripts)
PHASE 2 — INTEGRATION TEST        1 agent              ~3 min
    ↓ (all endpoints verified)
PHASE 3 — CHANGELOG               1 agent              ~2 min
    ↓ (release notes generated)
PHASE 4 — SECURITY GATE           1 agent              ~3 min
    ↓ (no critical vulnerabilities)
PHASE 5 — DEPLOY CHECKLIST        orchestrator         ~1 min
    ↓ (step-by-step deployment guide)

TOTAL                              4 agents, ~11 min
```

## Parallelism

```
[migration-planner]  [integration-tester]  [changelog-generator]  [security-auditor]
         ↓                    ↓                     ↓                      ↓
         ↓ ←────────── all complete ──────────→     ↓
                    [orchestrator: deploy checklist]
```

All 4 agents run in parallel. The orchestrator synthesizes.

---

## PHASE 1 — Migration Plan

```
migration-planner → "Plan database migration for Round {N}. Read the new tables
                     in admin.js, compare against what's currently deployed, and
                     produce safe migration scripts with rollback."
```

**Output:** `server/migrations/{date}-round-{N}.sql`

## PHASE 2 — Integration Test

```
integration-tester → "Start server, hit every endpoint with auth tokens.
                      Verify all Round {N} endpoints return expected responses.
                      Also verify all existing endpoints still work (regression)."
```

**Output:** Integration test report

## PHASE 3 — Changelog

```
changelog-generator → "Generate changelog for Round {N}. Read git log,
                        round specs, and module changes. Produce both
                        user-facing and internal changelogs."
```

**Output:** `docs/CHANGELOG.md` (updated) + `docs/research/changelog-internal-round-{N}.md`

## PHASE 4 — Security Gate

```
security-auditor → "Final security audit of all Round {N} modules.
                    This is the last gate before deployment. Flag any
                    critical or high issues as deployment blockers."
```

**Output:** Security audit report

## PHASE 5 — Deploy Checklist

The orchestrator produces:

```markdown
# Deployment Checklist: Round {N}
**Date:** {date}
**Modules:** {list}

## Pre-Deploy
- [ ] All integration tests pass
- [ ] No critical security issues
- [ ] Migration script reviewed
- [ ] Changelog reviewed
- [ ] Demo data updated if needed

## Database Migration
1. Connect to Supabase SQL Editor
2. Run: `server/migrations/{file}.sql`
3. Verify new tables exist
4. Verify RLS policies active

## Server Deploy
1. Pull latest from main
2. Run `npm install` (if new dependencies)
3. Restart server
4. Verify health endpoint: `curl http://localhost:3001/health`

## Post-Deploy Verification
- [ ] Each new page loads
- [ ] Each new endpoint responds
- [ ] Existing modules still work
- [ ] Audit log captures new module events

## Rollback Plan
If issues found:
1. Run rollback migration: {file}
2. Revert to previous commit: `git revert HEAD~{N}`
3. Restart server
```

**Output:** `docs/research/deploy-checklist-round-{N}.md`
