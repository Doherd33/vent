---
name: pipeline-competitive-intel
description: Orchestration playbook for comprehensive competitive intelligence gathering. Researches the MES/QMS market, specific competitors, and identifies Vent's strategic positioning.
tools: Agent, Read, Write, Glob, Grep, WebSearch, WebFetch
model: opus
---

# Competitive Intelligence Pipeline

A 3-phase pipeline for understanding Vent's competitive landscape. Run this before fundraising, when entering a new market segment, or quarterly as a strategy refresh.

## Trigger

- "Run competitive intelligence"
- "Research the competition"
- "How do we compare to {competitor}?"
- "What's the MES/QMS market look like?"

## The Pipeline

```
PHASE 1 — MARKET RESEARCH         3 agents parallel    ~5 min
    ↓ (market landscape + competitor deep dives)
PHASE 2 — FEATURE COMPARISON      1 agent              ~3 min
    ↓ (feature-by-feature comparison matrix)
PHASE 3 — STRATEGY BRIEF          orchestrator         ~2 min
    ↓ (positioning + differentiation recommendations)

TOTAL                              4 agents, ~10 min
```

---

## PHASE 1 — Market Research (3 agents in parallel)

### Agent 1: Market Overview
```
research-agent → "Research the pharmaceutical MES and QMS software market in 2025-2026.
                  Market size, growth rate, key trends, consolidation, cloud adoption,
                  AI adoption, regulatory drivers. Focus on biologics manufacturing segment."
```
**Output:** `docs/research/qms-mes-market-overview.md`

### Agent 2: Enterprise Competitors
```
research-agent → "Deep dive on enterprise QMS/MES competitors: Veeva Vault Quality,
                  MasterControl, Sparta TrackWise, ComplianceQuest, Kneat. For each:
                  features, pricing, target market, strengths, weaknesses, recent product
                  launches, customer reviews, market share."
```
**Output:** `docs/research/enterprise-competitors-research.md`

### Agent 3: Startup Competitors
```
research-agent → "Research startup and emerging competitors in pharma quality/manufacturing
                  software: Tulip, Apprentice.io, Aizon, Eigen, Rescale, Benchling (manufacturing),
                  any AI-first QMS startups. Funding, features, traction, positioning."
```
**Output:** `docs/research/startup-competitors-research.md`

## PHASE 2 — Feature Comparison (reads Phase 1)

```
research-agent → "Read the competitor research briefs in docs/research/
                  (enterprise-competitors, startup-competitors). Also read Vent's
                  module definitions in docs/project.html. Produce a comprehensive
                  feature comparison matrix: Vent vs 6-8 competitors across all
                  major QMS/MES capability areas. Identify where Vent leads,
                  matches, or lags."
```

**Output:** `docs/research/competitive-feature-matrix.md`

## PHASE 3 — Strategy Brief

The orchestrator synthesizes all research into:

```markdown
# Competitive Strategy Brief
**Generated:** {date}

## Market Position
Where Vent sits in the landscape (diagram/description).

## Competitive Advantages
1. **Unified platform** — competitors are point solutions, Vent is integrated
2. **AI-native** — built with Claude from day 1, not bolted on
3. **Modern UX** — dark theme, fast, no Java applets
4. **Speed** — one developer + AI agents vs. 50-person engineering teams
5. **Price** — can undercut enterprise pricing significantly

## Competitive Vulnerabilities
1. ...

## Key Battlegrounds
Feature areas where the winner captures the market.

## Recommended Positioning by Audience
| Audience | Lead With | Avoid |
|----------|-----------|-------|
| Enterprise pharma | Compliance, integration | "startup", "one developer" |
| Investors | AI moat, velocity, market size | Technical details |
| Regulators | 21 CFR Part 11, audit trail | AI (they don't care) |

## Feature Gaps to Close
Features competitors have that Vent needs to match.

## Differentiation Opportunities
Features Vent can build that NO competitor has.
```

**Output:** `docs/research/competitive-strategy-brief.md`
