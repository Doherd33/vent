---
name: pipeline-demo-prep
description: Orchestration playbook for preparing a complete demo package — research the audience, generate demo data, write the script, and prepare objection handling.
tools: Agent, Read, Write, Glob, Grep, Bash, WebSearch, WebFetch
model: opus
---

# Demo Preparation Pipeline

A 4-phase pipeline for preparing a complete, tailored demo for a specific audience. Run this before investor pitches, customer demos, or accelerator interviews.

## Trigger

- "Prepare a demo for {audience}"
- "Get me ready for the {company} meeting"
- "Build a demo package for {event}"

## Inputs

- **Who:** Target name (e.g., "NDRC", "Wuxi Biologics QA team", "a16z bio partner")
- **When:** Date of meeting
- **Duration:** How long is the demo slot
- **Context:** What's the meeting about (pitch, demo, interview, etc.)

## The Pipeline

```
PHASE 1 — AUDIENCE RESEARCH       1 agent (web)        ~4 min
    ↓ (intelligence on who we're meeting)
PHASE 2 — DEMO DATA               1 agent              ~3 min
    ↓ (realistic data loaded)
PHASE 3 — DEMO SCRIPT             1 agent              ~3 min
    ↓ (click-by-click walkthrough)
PHASE 4 — PITCH PREP              1 agent (web)        ~3 min
    ↓ (talking points + objection handling)

TOTAL                              4 agents, ~13 min
```

## Parallelism

```
[pitch-researcher: "{target}"]  [demo-data-generator: "all live modules"]
         ↓                              ↓
         ↓ ←──── both complete ────→    ↓
[demo-script-writer: reads pitch intel + knows data is loaded]
         ↓
[orchestrator: compiles final demo package]
```

Phases 1 & 2 run in parallel. Phase 3 needs both. Phase 4 is synthesis.

---

## PHASE 1 — Audience Research

```
pitch-researcher → "Research {target}. Context: {meeting type} on {date}.
                    Find their investment thesis/buying criteria, key people
                    we'll meet, portfolio/customers similar to Vent, and how
                    to position Vent for this specific audience."
```

**Output:** `docs/research/pitch-intel-{target}.md`

## PHASE 2 — Demo Data (parallel with Phase 1)

```
demo-data-generator → "Generate realistic demo data for all live modules.
                        Create an interconnected dataset: deviations linked
                        to equipment, CAPAs linked to deviations, training
                        linked to SOPs. Use VBP Dublin as the facility."
```

**Output:** `server/data/demo-seed-{target}.sql` + `docs/research/demo-data-manifest.md`

## PHASE 3 — Demo Script (reads Phase 1 output)

```
demo-script-writer → "Write a {duration} demo script for {audience type}.
                       Read the pitch intel at docs/research/pitch-intel-{target}.md
                       to tailor the demo. Focus on features that match their
                       interests. Include talking points and key moments."
```

**Output:** `docs/research/demo-script-{target}-{duration}.md`

## PHASE 4 — Final Package

The orchestrator compiles everything into a single prep document:

```markdown
# Demo Package: {Target} — {Date}

## Quick Reference
- **Who:** {names and roles}
- **Duration:** {time}
- **Key angles:** {from pitch intel}
- **Demo data:** Loaded (run {sql file})

## Pre-Demo Checklist
- [ ] Demo data loaded
- [ ] Browser at 125% zoom
- [ ] Logged in as QA Manager
- [ ] Incognito mode (no personal bookmarks)
- [ ] Phone on silent
- [ ] Backup: screenshots in case of server issues

## Demo Flow
{Condensed from demo script — just the beats}

## Top 3 Things to Emphasize
1. ...

## If They Ask...
{Top 10 likely questions with answers}

## After the Demo
- Follow-up email template
- Next steps to propose
```

**Output:** `docs/research/demo-package-{target}.md`
