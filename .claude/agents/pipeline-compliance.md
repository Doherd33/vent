---
name: pipeline-compliance
description: Orchestration playbook for full regulatory compliance assessment. Chains compliance auditing, research on current regulations, gap analysis, and remediation planning.
tools: Agent, Read, Write, Glob, Grep, Bash, WebSearch, WebFetch
model: opus
---

# Compliance & Validation Pipeline

A 4-phase pipeline for assessing and improving Vent's regulatory compliance posture. Run this before customer demos, investor meetings, or when preparing for an audit.

## Trigger

- "Run the compliance pipeline"
- "How audit-ready are we?"
- "Check FDA compliance"
- "Prepare for regulatory review"

## The Pipeline

```
PHASE 1 — REGULATION RESEARCH     1 agent (web)        ~4 min
    ↓ (current regulatory requirements)
PHASE 2 — COMPLIANCE AUDIT        1 agent              ~4 min
    ↓ (gap analysis against regulations)
PHASE 3 — SECURITY AUDIT          1 agent (parallel)   ~3 min
    ↓ (technical security assessment)
PHASE 4 — REMEDIATION PLAN        orchestrator         ~2 min
    ↓ (prioritized fix list)

TOTAL                              3 agents, ~10 min
```

## Parallelism

```
[research-agent: "FDA 21 CFR Part 11 + EU GMP Annex 11 + ALCOA+ current requirements"]
    ↓ research brief saved
[compliance-auditor]  [security-auditor]    ← parallel, both read research
    ↓                      ↓
    ↓ ←── both complete ──→↓
[orchestrator synthesizes remediation plan]
```

---

## PHASE 1 — Regulatory Research

```
research-agent → "Research current FDA 21 CFR Part 11 requirements, EU GMP Annex 11,
                  ICH Q10, and ALCOA+ data integrity guidance. Focus on requirements
                  for electronic quality management systems in biologics manufacturing.
                  Include any recent FDA warning letters or enforcement actions related
                  to computerised systems."
```

**Output:** `docs/research/regulatory-requirements-research.md`

## PHASE 2 — Compliance Audit (reads Phase 1)

```
compliance-auditor → "Audit all live Vent modules against the regulatory requirements
                      in docs/research/regulatory-requirements-research.md. Map each
                      21 CFR Part 11 section to our implementation. Identify all gaps."
```

**Output:** `docs/research/compliance-audit-all.md`

## PHASE 3 — Security Audit (parallel with Phase 2)

```
security-auditor → "Audit all modules for technical security: auth guards, SQL injection,
                    RLS policies, XSS prevention, session management, password handling.
                    Frame findings in context of 21 CFR Part 11 access controls."
```

**Output:** `docs/research/security-audit-compliance.md`

## PHASE 4 — Remediation Plan

The orchestrator reads both audit reports and produces:

```markdown
# Compliance Remediation Roadmap
**Generated:** {date}
**Overall Compliance Score:** X%

## Regulatory Readiness

| Regulation | Score | Gaps |
|-----------|-------|------|
| 21 CFR Part 11 | X% | N |
| EU GMP Annex 11 | X% | N |
| ALCOA+ | X% | N |

## Critical Remediations (Block Audit)
Items that would cause an audit failure. Fix immediately.

## Major Remediations (Block Sale)
Items that a pharma buyer would flag. Fix before demos.

## Minor Remediations (Improve Posture)
Nice-to-haves that show maturity.

## Estimated Effort
- Critical fixes: ~X hours
- Major fixes: ~X hours
- Minor fixes: ~X hours
```

**Output:** `docs/research/compliance-remediation-roadmap.md`
