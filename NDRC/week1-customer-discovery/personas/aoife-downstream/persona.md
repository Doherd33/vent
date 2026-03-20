# Persona: Aoife — Bioprocess Associate (Downstream)

## Demographics
- **Role:** Bioprocess Associate — Downstream Purification
- **Experience:** 5 years in biopharma (2 years upstream, 3 years downstream)
- **Employer:** Biopharma CDMO, Ireland
- **Shift pattern:** 12-hour continental shifts

---

## Day-to-Day

Aoife runs chromatography columns, TFF (tangential flow filtration), depth filtration, and viral inactivation/filtration steps. Her day involves:
- Setting up and packing chromatography columns
- Running purification cycles (Protein A, CEX, AEX, HIC)
- Monitoring UV, conductivity, pressure, and flow rates
- Performing buffer exchanges and UF/DF operations
- Integrity testing filters (pre and post-use)
- Yield calculations and in-process sampling
- Cleaning and sanitising skids between batches

---

## Current Tools & Systems
Same stack as upstream (QMS, MES, CMMS, LMS) with additional reliance on:
- **UNICORN / ChromaTool** — chromatography control software
- **Sartorius / Pall systems** — filtration monitoring
- **LIMS** — sample tracking and release data
- **Excel** — yield trending, column lifetime tracking (yes, still Excel)

---

## Frustrations

### 1. "Every step is critical path and the pressure is insane"
Downstream is where the product is worth the most — a contamination or yield loss here can mean losing a batch worth €500K–€2M. The stakes are higher than upstream, but the tools are the same. She needs faster access to information because she has less time to make decisions.

### 2. "Column lifetime tracking is a nightmare"
She tracks how many cycles each chromatography column has done in a spreadsheet that lives on a shared drive. When the column hits its validated lifetime, it needs to be repacked or replaced. If someone forgets to update the spreadsheet — and they do — she could run a batch on an expired column. That's a deviation at best, a batch loss at worst.

### 3. "I need to know what happened upstream before I start"
If upstream had a contamination event, a pH excursion, or a low viability, that directly affects her purification strategy. But she finds out from shift handover (if it's mentioned) or not at all. There's no system connecting upstream events to downstream impact.

### 4. "Filter integrity test failures at 2am"
A post-use filter integrity test fails. Is it a real failure or an operator error? She needs the SOP, the troubleshooting guide, the last 5 integrity test results for that filter housing, and the equipment maintenance history — all from different systems. On night shift, alone, with the clock ticking because product is sitting in a hold tank.

### 5. "I've been trained on 40 SOPs and I can't remember which version changed what"
Downstream has more SOPs per operator than any other department because of the number of unit operations. When an SOP is revised, she reads it and signs off — but the change might be one line in a 50-page document. She has no way to quickly see "what changed and why" without reading the entire thing.

---

## Goals
- Instant access to equipment-specific information during a purification run
- Visibility into what happened upstream before she starts her process
- Automated tracking of column lifetimes, filter usage, and equipment status
- Quick access to troubleshooting guides when things fail on shift
- Understand SOP changes without re-reading entire documents

---

## What Vent Changes

| Frustration | Vent Solution |
|-------------|---------------|
| High-stakes, no time | Spatial interface — tap the chrom skid, get everything in seconds |
| Column tracking in Excel | Equipment node tracks lifecycle, usage, maintenance — no spreadsheets |
| No upstream visibility | Knowledge graph connects upstream events to downstream equipment |
| Filter integrity failures at 2am | Ask Charlie: "Show me the last 5 integrity tests for filter housing FH-201" |
| SOP version confusion | Ask: "What changed in SOP-2034 revision 4?" — get a grounded diff, not a 50-page PDF |

---

## Key Quote
> "By the time product reaches me, the company has already spent six figures growing it. I can't afford to guess — I need to know."

---

## Archetype: THE GUARDIAN
Aoife is meticulous and protective of product quality. She doesn't cut corners and she doesn't trust systems that make her life harder. Win her trust with a tool that's as precise as she is, and she'll make it part of her workflow.
