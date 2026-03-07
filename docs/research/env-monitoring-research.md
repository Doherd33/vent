# Environmental Monitoring (EM) for GMP Cleanrooms — Research Brief

**Date:** 2026-03-07
**Author:** Research Agent (Claude Code)
**Module:** Environmental Monitoring (Planned — Phase 5: Inoculation Suite / Phase 6: Process Operations)
**Target departments:** QA, Manufacturing, Inoculation Suite, Fill/Finish

---

## 1. Regulatory Requirements

### 1.1 EU GMP Annex 1 (2022 Revision) — Manufacture of Sterile Medicinal Products

The 2022 revision of EU GMP Annex 1 is the single most important regulatory document for environmental monitoring in pharmaceutical manufacturing. It replaced the 2008 version with significantly expanded EM requirements. Effective 25 August 2023, all sterile product manufacturers supplying EU markets must comply.

**Key sections relevant to EM:**

**Section 3 — Pharmaceutical Quality System (PQS):**
- The PQS must include a Contamination Control Strategy (CCS) document that addresses environmental monitoring as a core element (Annex 1, paragraph 3.1)
- The CCS must be a living document, regularly reviewed and updated based on EM trending data
- EM data must feed into periodic product quality reviews (PQRs) and management review

**Section 4 — Premises:**
- Cleanroom qualification must include EM as part of the performance qualification (PQ) protocol
- Environmental monitoring sample point locations must be justified based on risk assessment
- Cleanroom layout must facilitate effective monitoring (accessible sample points, no dead legs in airflow)

**Section 9 — Environmental and Process Monitoring:**
This is the core EM section (paragraphs 9.1 through 9.35). Key requirements:

- **Paragraph 9.1:** An environmental and process monitoring programme should be established based on a thorough risk assessment. It should consider monitoring of air (viable and non-viable particulate), surfaces, and personnel.
- **Paragraph 9.2:** Monitoring locations should be defined based on qualification data, risk assessment, and knowledge of the process. The number and position of monitoring points should be justified.
- **Paragraph 9.3:** Grade A zones must have continuous non-viable particle monitoring for the full duration of critical processing, including equipment assembly. This is a hard requirement, not a recommendation.
- **Paragraph 9.4:** The monitoring system should detect transient events (short-duration excursions) — this implies real-time or near-real-time data capture for particle counting, not periodic batch sampling.
- **Paragraph 9.5:** For Grade A zones, the particle count sample volume should be at least 1 cubic metre per sample point. Sample tubing length should be minimised to avoid particle losses.
- **Paragraph 9.6:** Grade B, C, and D areas should be monitored at defined intervals during operations. Frequency must be justified by risk assessment and historical data.
- **Paragraph 9.7:** Warning (alert) and action limits must be established using qualification data and historical monitoring trends. Limits should be set to detect adverse trends before they reach action levels.
- **Paragraph 9.8:** Any action limit breach must trigger investigation, root cause analysis, and consideration of the impact on product quality and batch disposition.
- **Paragraph 9.9:** Viable monitoring methods should include settle plates, active air sampling, surface monitoring (contact plates or swabs), and personnel monitoring.
- **Paragraph 9.10:** Personnel gowning qualification monitoring should demonstrate that operators do not contribute unacceptable contamination. Grade A/B operators require gowning qualification by viable surface monitoring.
- **Paragraph 9.25:** EM data must be trended over time. Trend analysis should detect gradual deterioration, seasonal patterns, and correlation with facility events (maintenance, personnel changes).
- **Paragraph 9.26:** Where unusual organisms or elevated counts are detected, the investigation should include organism identification to at least genus level. Objectionable organisms must be identified to species level.
- **Paragraph 9.27:** An environmental isolate library should be maintained, enabling tracking of specific organisms across locations and time periods.

**Annex 1 Grade Classification Limits:**

| Grade | At Rest — Max Particles >= 0.5 um/m3 | At Rest — Max Particles >= 5.0 um/m3 | In Operation — Max Particles >= 0.5 um/m3 | In Operation — Max Particles >= 5.0 um/m3 |
|-------|--------------------------------------|--------------------------------------|-------------------------------------------|------------------------------------------|
| A | 3,520 | 20 | 3,520 | 20 |
| B | 3,520 | 29 | 352,000 | 2,900 |
| C | 352,000 | 2,900 | 3,520,000 | 29,000 |
| D | 3,520,000 | 29,000 | Not defined | Not defined |

**Annex 1 Viable Monitoring Recommended Limits (In Operation):**

| Grade | Air Sample (CFU/m3) | Settle Plate 90mm dia (CFU/4 hours) | Contact Plate 55mm dia (CFU/plate) | Glove Print 5 fingers (CFU/glove) |
|-------|---------------------|--------------------------------------|--------------------------------------|-----------------------------------|
| A | < 1 | < 1 | < 1 | < 1 |
| B | 10 | 5 | 5 | 5 |
| C | 100 | 50 | 25 | - |
| D | 200 | 100 | 50 | - |

**Critical Annex 1 changes from 2008 to 2022 revision:**
- Contamination Control Strategy (CCS) is now mandatory — EM programme must be part of CCS
- Continuous particle monitoring for Grade A is now explicitly required for the full duration of processing (previously ambiguous)
- Risk-based approach to monitoring programme design is now mandated (not just best practice)
- Environmental isolate library and organism tracking are now explicit requirements
- Personnel monitoring requirements are more prescriptive
- Trend analysis requirements are significantly expanded
- Smoke studies and airflow visualisation must be performed and documented as part of cleanroom qualification
- Recovery time testing required after a contamination event

**Vent implementation note:** The 2022 Annex 1 is the gold standard. Any EM module must capture continuous particle count data for Grade A, support configurable alert/action limits per grade, enforce organism identification workflows for excursions, maintain an environmental isolate library, and provide robust trending and CCS integration.

### 1.2 FDA Guidance for Industry — Sterile Drug Products Produced by Aseptic Processing (2004, with subsequent updates)

The FDA's primary guidance on aseptic processing includes extensive environmental monitoring requirements. While older than Annex 1 (2022), it remains the primary US regulatory reference and is enforced during FDA inspections.

**Key EM requirements from the FDA guidance:**

**Section V.A — Buildings and Facilities (Environmental Monitoring):**
- The aseptic processing facility must establish a comprehensive EM programme
- The programme should monitor airborne particulate (viable and non-viable), surfaces, and personnel
- Monitoring locations, methods, and frequencies must be documented and scientifically justified

**Section V.B — Particulate Monitoring:**
- Critical areas (Class 100 / ISO 5) should have continuous or frequent particulate monitoring during aseptic operations
- Portable particle counters can supplement continuous monitoring in supporting cleanrooms
- Particle count data should be reviewed promptly to allow timely response to excursions

**Section V.C — Microbiological Monitoring:**
- The EM programme should include air sampling (settle plates and/or active air sampling), surface sampling (contact plates, swabs), and personnel monitoring (glove and gown sampling)
- Sample collection frequency should be sufficient to assess the state of microbiological control
- **Alert and action levels should be established based on qualification data and historical trends** — the FDA does not prescribe specific CFU limits but expects each facility to establish and justify their own limits
- When action levels are exceeded, investigation is required, including an assessment of impact on product quality
- Organism identification to at least genus level is expected for action limit breaches and unusual organisms
- A trending programme must be in place to detect adverse trends before action levels are reached

**FDA Classification (Federal Standard 209E equivalents, now replaced by ISO 14644):**

| FDA Classification | ISO Equivalent | EU GMP Grade | Particles >= 0.5 um per ft3 | Particles >= 0.5 um per m3 |
|-------------------|----------------|--------------|-----------------------------|-----------------------------|
| Class 100 | ISO 5 | Grade A/B (at rest) | 100 | 3,520 |
| Class 1,000 | ISO 6 | — | 1,000 | 35,200 |
| Class 10,000 | ISO 7 | Grade C (at rest) | 10,000 | 352,000 |
| Class 100,000 | ISO 8 | Grade D (at rest) | 100,000 | 3,520,000 |

**FDA Warning Letter trends (2020-2025) related to EM deficiencies:**
The following are among the most common FDA 483 observations related to environmental monitoring:
1. Failure to establish adequate alert and action limits
2. Failure to investigate action limit excursions
3. Inadequate trending of EM data
4. Insufficient monitoring frequency or locations
5. Failure to identify organisms from action limit excursions
6. Missing or incomplete EM records (data integrity)
7. Failure to assess batch impact following Grade A/ISO 5 excursions
8. Personnel monitoring not performed or not linked to gowning qualification
9. Continuous particle monitoring not maintained during critical operations
10. Alert/action limits not set based on qualification data (arbitrary limits)

**Vent implementation note:** The FDA does not prescribe specific CFU limits (unlike EU GMP Annex 1), meaning Vent must support fully configurable alert and action limits per location, per grade, per sample type. The system must also support the FDA's emphasis on trending, investigation, and batch impact assessment.

### 1.3 ISO 14644 — Cleanrooms and Associated Controlled Environments

ISO 14644 is the international standard series for cleanroom design, classification, and monitoring. Key parts relevant to EM:

**ISO 14644-1:2015 — Classification of Air Cleanliness by Particle Concentration:**
- Defines ISO classes 1 through 9 based on maximum permitted particle concentration at specified particle sizes
- Classification is performed by sampling air at defined locations and calculating whether particle concentrations meet the class limits
- **Minimum sample volume:** 2 litres per sample point (for >= 0.5 um particles at ISO 5)
- **Minimum number of sample locations:** The square root of the cleanroom area in square metres, rounded up (minimum 1)
- **Statistical evaluation:** 95% upper confidence limit (UCL) must not exceed the class limit

**ISO 14644-1 Classification Table (key classes for pharma):**

| ISO Class | Max Particles >= 0.1 um/m3 | Max Particles >= 0.2 um/m3 | Max Particles >= 0.3 um/m3 | Max Particles >= 0.5 um/m3 | Max Particles >= 1.0 um/m3 | Max Particles >= 5.0 um/m3 |
|-----------|----------------------------|----------------------------|----------------------------|----------------------------|----------------------------|----------------------------|
| ISO 5 | 100,000 | 23,700 | 10,200 | 3,520 | 832 | 20 (Note 1) |
| ISO 6 | 1,000,000 | 237,000 | 102,000 | 35,200 | 8,320 | 293 |
| ISO 7 | — | — | — | 352,000 | 83,200 | 2,930 |
| ISO 8 | — | — | — | 3,520,000 | 832,000 | 29,300 |

Note 1: ISO 5 at 5.0 um has a concentration limit of 20 particles/m3 when measured, but due to statistical limitations of low counts, this size is often used for information only at ISO 5. EU GMP Annex 1 nonetheless uses 20 particles/m3 at 5.0 um as a Grade A limit.

**ISO 14644-2:2015 — Monitoring to Provide Evidence of Cleanroom Performance:**
- Requires ongoing monitoring to demonstrate continued compliance with the classification established under ISO 14644-1
- Specifies a monitoring plan that includes: sample locations, frequency, particle sizes, and acceptance criteria
- Monitoring frequency must be based on risk assessment; critical areas require more frequent monitoring
- Recommends re-classification testing at defined intervals (typically annually or after significant facility changes)
- Introduces the concept of a "monitoring plan" separate from the "classification plan" — routine monitoring may use fewer points and different frequencies than the initial classification

**ISO 14644-3:2019 — Test Methods:**
- Defines standardised test methods for cleanroom performance: particle counting, airflow velocity, air pressure difference, recovery time, containment leak testing
- Specifies instrument calibration requirements for optical particle counters (OPCs)
- **Recovery test:** After a contamination event or interruption, the cleanroom must return to its classified state within a defined time (typically 15-20 minutes for ISO 5-7). This recovery time must be measured and documented.

**Mapping ISO to EU GMP to FDA:**

| ISO 14644 | EU GMP Grade | FDA (FS 209E) | Typical Use |
|-----------|-------------|---------------|-------------|
| ISO 5 | Grade A | Class 100 | Aseptic filling, critical interventions, open product exposure |
| ISO 5 (at rest) / ISO 7 (in operation) | Grade B | — | Background to Grade A (isolators/RABS), gowning area |
| ISO 7 (at rest) / ISO 8 (in operation) | Grade C | Class 10,000 | Less critical processing steps, buffer preparation |
| ISO 8 | Grade D | Class 100,000 | Component preparation, less critical steps |

**Vent implementation note:** The module should store both ISO class and EU GMP Grade for each monitoring location, since customers may need to report in either framework depending on their regulatory market. The ISO classification data from initial qualification should be linkable to the monitoring programme so that routine monitoring results can be compared against the classification baseline.

### 1.4 USP <1116> — Microbiological Control and Monitoring of Aseptic Processing Environments

USP <1116> is a key US Pharmacopeial chapter providing guidance on microbiological environmental monitoring. While informational (not compendial), it is widely referenced by FDA inspectors and industry practitioners.

**Key content:**

**Monitoring Programme Design:**
- The programme should be based on the results of an initial risk assessment considering: room classification, process criticality, personnel traffic patterns, material flow, and historical data
- Sample point selection should focus on areas of highest risk: near open product, at points of potential ingress (doors, pass-throughs), operator working positions, and areas of highest personnel activity
- The number and location of monitoring points should be documented in a monitoring plan (site map with numbered locations)

**Sampling Methods and Their Application:**

| Method | Type | Best For | Limitations |
|--------|------|----------|-------------|
| Active air sampling (impaction) | Viable airborne | Quantitative assessment of viable particles; slit-to-agar or centrifugal samplers | Impaction stress may reduce recovery of some organisms; media fill volume must be validated |
| Active air sampling (impingement) | Viable airborne | Recovery of fastidious organisms; liquid collection medium | Equipment more complex; less commonly used in routine monitoring |
| Settle plates | Viable airborne (passive) | Qualitative assessment; captures viable particles settling under gravity over time | Not quantitative (CFU/m3 not directly calculable); provides CFU/time/area; long exposure time |
| Contact plates (RODAC) | Viable surface | Flat, regular surfaces (floors, walls, equipment surfaces, bench tops) | Not suitable for irregular surfaces, small areas, or equipment interiors |
| Swabs | Viable surface | Irregular surfaces, small areas, hard-to-reach locations, equipment interiors | Less reproducible than contact plates; recovery efficiency varies |
| Glove/gown sampling | Viable personnel | Assessing operator contamination contribution; gowning qualification | Snapshot in time; technique-dependent |
| Optical particle counter (OPC) | Non-viable airborne | Continuous or periodic particle count measurement | Does not distinguish viable from non-viable; counts all particles |

**Setting Alert and Action Limits:**

USP <1116> provides detailed guidance on statistical approaches to limit-setting:

- **Action limit:** The level at which a predetermined corrective action is required. Should be set such that exceedances are rare under normal operating conditions. Typically set at the 95th or 99th percentile of historical data, or at the pharmacopeial/regulatory recommended limit (whichever is lower).
- **Alert limit:** An early warning level indicating a potential drift from normal conditions. Typically set at the 90th or 95th percentile of historical data, or approximately 50-80% of the action limit. Alert exceedances should trigger heightened awareness and investigation, but not necessarily corrective action.
- **Data-driven approach:** USP <1116> recommends that limits be established using at least 20-30 data points from qualification or initial operational monitoring, and then refined as the historical database grows.
- **Periodic review:** Limits should be reviewed at least annually (or more frequently for new facilities) and tightened if data supports lower limits. Limits should never be loosened without thorough justification.

**Organism Identification Strategy:**

- All colonies recovered from Grade A/ISO 5 samples should be identified to at least genus level (species level preferred)
- Colonies recovered from action limit excursions in any grade should be identified
- A representative sample of colonies from routine monitoring (even within limits) should be identified periodically to maintain the environmental isolate library
- Identification methods: phenotypic (API, Vitek), genotypic (16S rRNA sequencing, MALDI-TOF), or a combination
- Objectionable organisms (organisms with known pathogenicity or product-spoilage potential) require enhanced investigation regardless of count

**Vent implementation note:** USP <1116> directly informs the data model. The system needs: configurable alert/action limits per location per sample type, statistical limit-setting tools (calculate percentiles from historical data), organism identification fields with genus/species, and an environmental isolate library table linking organism IDs to locations and dates.

### 1.5 PDA Technical Report No. 13 (Revised 2001, Reissued 2021) — Fundamentals of an Environmental Monitoring Program

PDA TR13 is the pharmaceutical industry's definitive best-practice guide for environmental monitoring programme design and implementation. It is the most comprehensive single reference for EM practitioners.

**Key content relevant to Vent module design:**

**Programme Design:**
- The EM programme must be documented in an EM SOP or programme document that defines: scope, responsibilities, monitoring locations (with justification), sampling methods, media, incubation conditions, frequencies, limits, investigation procedures, trending, and data review
- A risk assessment (e.g., using FMEA, HACCP principles, or ICH Q9 risk management tools) should be used to determine monitoring locations, methods, and frequencies
- The programme should be designed to detect both transient and persistent contamination

**Sample Point Mapping:**
- A floor plan or site map should be created showing all monitoring locations with unique location codes
- Each location should have a documented justification (why this point is monitored)
- Locations should be categorised by proximity to product/critical surfaces:
  - **Zone 1:** Product contact surfaces and critical areas (Grade A, filling zone, open containers)
  - **Zone 2:** Surfaces adjacent to Zone 1 (equipment surfaces near open product, operators' hands)
  - **Zone 3:** Floors, walls, equipment in classified areas that do not contact product
  - **Zone 4:** Areas outside classified rooms (corridors, gowning rooms, airlocks)
- This zoning model is widely used in industry and is referenced by FDA inspectors

**Monitoring Frequency:**

| Zone / Grade | Non-Viable Particles | Viable Air | Settle Plates | Surface (Contact/Swab) | Personnel |
|-------------|---------------------|------------|---------------|------------------------|-----------|
| Grade A / Zone 1 | Continuous | Each shift or per batch | Continuous (expose for duration of operation, max 4 hours) | After each campaign/batch | After each critical intervention |
| Grade B / Zone 2 | At least daily during operations | At least daily | Daily (4-hour exposure) | Daily or per shift | After each entry to Grade B; at exit from Grade B |
| Grade C / Zone 3 | Weekly during operations | Weekly | Weekly | Weekly | Monthly or per campaign |
| Grade D / Zone 4 | Monthly or per campaign | Monthly | Monthly | Monthly | Quarterly or per campaign |

Note: These frequencies represent industry best practice derived from PDA TR13 and aligned with EU GMP Annex 1. Actual frequencies must be justified per facility based on risk assessment and historical performance.

**Incubation Conditions:**

PDA TR13 specifies dual-temperature incubation for viable monitoring media:
- **First incubation:** 20-25 degrees C for a minimum of 48-72 hours (to recover environmental fungi and slow-growing bacteria)
- **Second incubation:** 30-35 degrees C for a minimum of 48-72 hours (to recover mesophilic bacteria)
- Total incubation: minimum 5-7 days
- Some facilities use a single temperature (30-35 degrees C for 3-5 days) for routine monitoring, with dual-temperature for investigations

**Data Review and Approval:**

- EM results should be reviewed by qualified personnel (typically QA microbiologist or EM specialist)
- Review should occur within a defined timeframe (typically 24-48 hours of incubation completion)
- Any exceedances of alert or action limits must be flagged for investigation
- A formal data review and trending report should be generated at least monthly

**Vent implementation note:** PDA TR13's zoning model (Zones 1-4) is an excellent framework for the monitoring location data model. Each sample point in the system should have a zone assignment, enabling zone-based trending and reporting. The dual-temperature incubation tracking (start/end times and temperatures for each incubation phase) should be captured in the sample record.

### 1.6 Additional Regulatory and Standards References

| Regulation / Standard | Relevance to EM Module |
|---|---|
| **21 CFR Part 211** (cGMP for finished pharmaceuticals) | Section 211.42: Cleanroom design requirements; Section 211.46: HVAC requirements; Section 211.113: Environmental controls for microbiological contamination |
| **21 CFR Part 11** (Electronic records, electronic signatures) | All EM data captured electronically must comply: audit trails, access controls, e-signatures for data review and approval |
| **EU GMP Annex 11** (Computerised systems) | European equivalent of 21 CFR Part 11; data integrity requirements for EM systems |
| **EU GMP Annex 15** (Qualification and validation) | Cleanroom qualification protocols that generate the baseline EM data for limit-setting |
| **ICH Q9** (Quality risk management) | Framework for the risk assessments that drive EM programme design (monitoring locations, frequencies) |
| **ICH Q10** (Pharmaceutical quality system) | EM programme as part of the overall quality system; management review of EM trends |
| **ISPE Baseline Guide Vol 3** (Sterile manufacturing facilities) | Facility design considerations that affect EM: airlock design, pressure cascades, HVAC zoning |
| **WHO TRS 961 Annex 6** (Good manufacturing practices for sterile pharmaceutical products) | WHO-aligned EM requirements for manufacturers supplying WHO-prequalified products |
| **Ph. Eur. 5.1.4** (Microbiological quality of pharmaceutical preparations) | European pharmacopoeial guidance on environmental monitoring for non-sterile and sterile manufacturing |
| **USP <797>** (Pharmaceutical compounding — sterile preparations) | EM requirements for compounding pharmacies (less stringent than manufacturing but same principles) |

---

## 2. Monitoring Types — Detailed Technical Reference

### 2.1 Non-Viable Particle Monitoring

Non-viable particle monitoring measures total airborne particulate (viable and non-viable) using optical particle counters (OPCs). It is the primary continuous monitoring method for cleanroom classification compliance.

**Continuous Particle Monitoring (Grade A / ISO 5):**

- **Instrument:** Laser-based optical particle counter (OPC) with isokinetic sampling probe
- **Sample flow rate:** Typically 28.3 litres/minute (1 CFM) or 50 litres/minute
- **Particle sizes measured:** >= 0.5 um and >= 5.0 um (minimum); some systems also measure >= 0.3 um and >= 1.0 um
- **Data capture:** Continuous, with counts aggregated per 1-minute sample period (configurable)
- **Output:** Particles per cubic metre (particles/m3) or particles per cubic foot (particles/ft3), displayed as time-series data
- **Alarm capability:** Real-time alerts when particle counts exceed alert or action limits
- **Probe placement:** Within the critical zone, as close to the point of product exposure as practical without disrupting unidirectional airflow. Must be justified through qualification (typically smoke studies to verify probe does not create turbulence)
- **Tubing length:** Minimised (typically < 2 metres) to reduce particle losses in transport tubing. Losses increase significantly above 3 metres for 5.0 um particles
- **Number of probes:** Typically 1-3 per Grade A zone depending on size. Each filling line point, each stopper bowl, each critical intervention point should have coverage
- **Data integrity:** Particle counter data must be electronically captured with timestamps, instrument ID, and location code. Manual transcription of particle count data is a common FDA 483 observation

**Portable Particle Counting (Grade B/C/D):**

- **Instrument:** Handheld or portable OPC (e.g., Met One HHPC+, Lighthouse Handheld)
- **Use:** Periodic monitoring at defined sample points in supporting cleanrooms
- **Sample time:** Typically 1 minute per location (at 28.3 L/min, this samples 28.3 litres = 0.0283 m3; must be converted to particles/m3)
- **Minimum sample volume per ISO 14644-1:** 2 litres for >= 0.5 um at ISO 5; in practice, 28.3 litres is used as a standard 1-minute sample
- **Frequency:** Daily or per shift for Grade B; weekly for Grade C; monthly for Grade D (per risk assessment)
- **Data transfer:** Ideally direct electronic download from instrument to EM system. Manual recording is acceptable but carries higher data integrity risk

**Key data fields for non-viable particle monitoring:**

| Field | Description |
|---|---|
| Sample ID | Unique identifier for the sample event |
| Location code | Unique location identifier (tied to site map) |
| Room / zone | Room name and cleanroom zone |
| Grade / ISO class | Classification of the monitored area |
| Sample date/time | Timestamp of sample collection |
| Instrument ID | Particle counter serial number (for calibration traceability) |
| Sample volume | Volume of air sampled (litres or m3) |
| Count >= 0.5 um | Particle count at >= 0.5 um |
| Count >= 5.0 um | Particle count at >= 5.0 um |
| Count per m3 >= 0.5 um | Calculated concentration (count / volume in m3) |
| Count per m3 >= 5.0 um | Calculated concentration |
| Alert limit >= 0.5 um | Location-specific alert limit |
| Action limit >= 0.5 um | Location-specific action limit |
| Alert limit >= 5.0 um | Location-specific alert limit |
| Action limit >= 5.0 um | Location-specific action limit |
| Excursion flag | Boolean — did count exceed alert or action limit? |
| Excursion type | None / Alert / Action |
| Operator | Person who performed the sampling |
| Comments / notes | Free-text field for observations |
| Status | Draft / Reviewed / Approved |
| Reviewed by | QA reviewer |
| Review date | Date of data review |

### 2.2 Viable Airborne Monitoring

Viable airborne monitoring detects living microorganisms in the air. Two primary methods are used: active air sampling and passive air sampling (settle plates).

**Active Air Sampling — Impaction:**

- **Principle:** Air is drawn through a perforated plate or slit and impacted onto an agar surface at high velocity. Viable particles are captured on the agar and incubated to form colonies.
- **Instruments:** Slit-to-agar (STA) samplers (e.g., Bioscience International STA), centrifugal samplers (e.g., bioMerieux AirIdeal), Andersen cascade impactor (6-stage or 2-stage)
- **Sample volume:** Typically 1,000 litres (1 m3) per sample. For Grade A, some facilities sample larger volumes (2-4 m3) to improve detection sensitivity
- **Media:** Tryptic Soy Agar (TSA) for bacteria; Sabouraud Dextrose Agar (SDA) for fungi. Dual media or single TSA with dual-temperature incubation
- **Incubation:** 20-25 degrees C for 48-72 hours, then 30-35 degrees C for 48-72 hours
- **Result:** Reported as CFU/m3 (colony-forming units per cubic metre of air sampled)
- **Positive hole correction:** When using an Andersen-type sampler, apply the positive-hole correction factor to account for the probability of multiple particles passing through the same hole

**Active Air Sampling — Impingement:**

- **Principle:** Air is drawn through a liquid collection medium (e.g., phosphate buffer, peptone water). Particles are captured in the liquid, which is then plated onto agar or analysed by other methods
- **Instruments:** AGI-30 impinger, BioSampler (SKC Inc.)
- **Advantage:** Better recovery of stress-sensitive organisms (impaction can damage fragile cells)
- **Disadvantage:** More complex to operate, higher contamination risk during handling, less commonly used in routine GMP monitoring
- **Use case:** Investigation sampling when impaction results suggest unusual organisms or when enhanced recovery is needed

**Passive Air Sampling — Settle Plates:**

- **Principle:** Standard 90mm Petri dishes containing TSA (or SDA for fungi) are exposed to the environment for a defined period. Viable particles settling under gravity are captured on the agar surface
- **Exposure time:** Maximum 4 hours (EU GMP Annex 1 recommendation). In Grade A, plates are exposed for the duration of the critical operation (up to 4 hours). If operations exceed 4 hours, plates are changed and a new plate exposed
- **Media:** TSA (bacteria) or SDA (fungi); some facilities use TSA with lecithin and polysorbate (neutralising agents) in areas where cleaning residues may inhibit growth
- **Result:** Reported as CFU per plate per exposure period (e.g., CFU/4 hours)
- **Limitation:** Settle plates do not provide a quantitative volumetric measurement (CFU/m3). They capture organisms that settle under gravity plus Brownian motion, which correlates with but does not equal total airborne viable count
- **Placement:** Settle plates should be placed at working height, near the point of product exposure in Grade A, and at representative locations in other grades. Plates must not be placed where they could contaminate product or compromise airflow

### 2.3 Viable Surface Monitoring

Surface monitoring assesses the microbiological cleanliness of surfaces in the cleanroom environment, including equipment, walls, floors, and furniture.

**Contact Plates (RODAC Plates):**

- **Principle:** Pre-poured agar plates (55mm diameter, convex surface) are pressed firmly onto flat surfaces for a defined contact time (typically 10 seconds). The plate is then incubated and colonies counted
- **Media:** TSA with lecithin and polysorbate 80 (neutralising agents to inactivate residual disinfectants) is standard
- **Incubation:** Dual-temperature per viable air sampling (20-25 degrees C then 30-35 degrees C)
- **Result:** CFU per plate (per 25 cm2 surface area)
- **Best for:** Flat, smooth surfaces — equipment surfaces, walls, bench tops, floors
- **Limitation:** Cannot be used on irregular surfaces, inside equipment (tubing, valves), or on product-contact surfaces where agar residue is unacceptable. Surfaces must be cleaned after sampling to remove agar residue
- **Surface area:** Standardised at 25 cm2 (the area of the 55mm contact plate surface)

**Swab Sampling:**

- **Principle:** A sterile swab (cotton, polyester, or calcium alginate) moistened with diluent (sterile water, phosphate buffer, or neutralising solution) is rubbed over a defined surface area. The swab is then placed in diluent, vortexed to release organisms, and the diluent is plated onto agar
- **Sampling area:** Typically 25 cm2 (using a sterile template), but can be adapted for irregular surfaces
- **Best for:** Irregular surfaces, small areas, inside equipment, hard-to-reach locations, and surfaces where contact plate agar residue is unacceptable
- **Limitation:** Lower and more variable recovery efficiency compared to contact plates (typically 20-60% recovery depending on surface type, organism, and swab material)
- **Result:** CFU per swab (per defined area sampled)

### 2.4 Personnel Monitoring

Personnel monitoring assesses the contamination contribution of operators working in classified areas. It is essential for gowning qualification and ongoing compliance.

**Glove Fingertip Sampling:**

- **Method:** After performing operations (but before degowning), the operator presses each of their 5 gloved fingertips onto a contact plate (or 2 contact plates — one per hand)
- **Incubation:** Standard dual-temperature
- **Result:** CFU per 5 fingertips (per hand)
- **Limits (EU GMP Annex 1):** Grade A: < 1 CFU; Grade B: < 5 CFU
- **Frequency:** After each critical intervention (Grade A); at exit from Grade B area; per gowning qualification schedule

**Gown Sampling:**

- **Method:** Contact plates are applied to defined locations on the cleanroom gown: forearm, chest, upper arm, hood (forehead area). Alternatively, swabs can be used
- **Locations:** Typically 3-5 sampling sites per operator, defined in the gowning qualification SOP
- **Result:** CFU per plate per sampling location
- **Use:** Part of initial gowning qualification (typically 3 consecutive successful qualifications required) and periodic re-qualification (typically quarterly or annually)

**Personnel Monitoring Programme:**

| Activity | Grade A/B Operators | Grade C/D Operators |
|----------|-------------------|-------------------|
| Glove fingertip monitoring | Every entry to Grade A; at exit from Grade B | Per campaign or weekly |
| Gown monitoring | Per gowning qualification schedule (initial + periodic) | Per gowning qualification schedule |
| Gowning qualification | Initial: 3 consecutive successful gownings; re-qualification: annually | Initial: demonstration of competence; re-qualification: per training schedule |
| Gowning failure consequences | Immediate removal from classified area; retraining + re-qualification required | Retraining required; reinvestigation if repeated |

---

## 3. Cleanroom Classifications — Complete Reference

### 3.1 EU GMP Classification System (Grades A/B/C/D)

The EU GMP system uses Grades A through D, with both "at rest" and "in operation" states defined for Grades A, B, and C. Grade D has only "at rest" limits defined in Annex 1 (in-operation limits are not specified but should be established per facility).

**At Rest:** The condition where the cleanroom installation is installed, the HVAC system is operating, and production equipment is installed, but no operators are present and no production is in progress.

**In Operation:** The condition where the cleanroom is functioning with all services and equipment, with the specified number of operators working in the manner designated for the intended operation.

**Complete Non-Viable Particle Limits:**

| Grade | State | Max >= 0.5 um/m3 | Max >= 5.0 um/m3 | ISO Equivalent |
|-------|-------|------------------|------------------|----------------|
| A | At rest | 3,520 | 20 | ISO 5 |
| A | In operation | 3,520 | 20 | ISO 5 |
| B | At rest | 3,520 | 29 | ISO 5 |
| B | In operation | 352,000 | 2,900 | ISO 7 |
| C | At rest | 352,000 | 2,900 | ISO 7 |
| C | In operation | 3,520,000 | 29,000 | ISO 8 |
| D | At rest | 3,520,000 | 29,000 | ISO 8 |
| D | In operation | Not defined (establish per facility) | Not defined | — |

**Key observations:**
- Grade A limits are identical at rest and in operation — the unidirectional airflow must maintain ISO 5 conditions regardless of operator activity
- Grade B is ISO 5 at rest but degrades to ISO 7 in operation — the presence of operators and activity generates particles
- Grade C degrades from ISO 7 to ISO 8 in operation
- The gap between "at rest" and "in operation" is a measure of the contamination contribution of personnel and the manufacturing process

**Complete Viable Monitoring Limits (In Operation):**

| Grade | Air Sample (CFU/m3) | Settle Plate 90mm (CFU/4hrs) | Contact Plate 55mm (CFU/plate) | Glove Print 5 fingers (CFU/glove) |
|-------|---------------------|------------------------------|-------------------------------|-----------------------------------|
| A | < 1 | < 1 | < 1 | < 1 |
| B | 10 | 5 | 5 | 5 |
| C | 100 | 50 | 25 | — |
| D | 200 | 100 | 50 | — |

Note: "< 1" for Grade A means zero CFU is expected. Any single CFU detected in Grade A is an action limit excursion requiring investigation and batch impact assessment.

### 3.2 Typical Alert and Action Limit Structure

Alert and action limits should be set per facility based on historical data and qualification results. The following represents typical industry practice:

**Non-Viable Particle Alert/Action Limits (In Operation):**

| Grade | Alert >= 0.5 um/m3 | Action >= 0.5 um/m3 | Alert >= 5.0 um/m3 | Action >= 5.0 um/m3 |
|-------|--------------------|--------------------|--------------------|--------------------|
| A | 1,760 (50% of limit) | 3,520 (limit) | 10 (50% of limit) | 20 (limit) |
| B | 176,000 | 352,000 | 1,450 | 2,900 |
| C | 1,760,000 | 3,520,000 | 14,500 | 29,000 |
| D | Per facility | Per facility | Per facility | Per facility |

**Viable Monitoring Alert/Action Limits (In Operation):**

| Grade | Alert (Air, CFU/m3) | Action (Air, CFU/m3) | Alert (Settle, CFU/4hr) | Action (Settle, CFU/4hr) | Alert (Contact, CFU/plate) | Action (Contact, CFU/plate) |
|-------|---------------------|---------------------|--------------------------|--------------------------|-----------------------------|------------------------------|
| A | 0 (any = action) | < 1 (any = excursion) | 0 | < 1 | 0 | < 1 |
| B | 5 | 10 | 3 | 5 | 3 | 5 |
| C | 50 | 100 | 25 | 50 | 15 | 25 |
| D | 100 | 200 | 50 | 100 | 25 | 50 |

**Vent implementation note:** Alert and action limits must be configurable per monitoring location. Some locations may have tighter limits than the grade default (e.g., a Grade B filling room that historically runs very clean might have an alert limit of 3 CFU/m3 rather than 5). The system should support a hierarchy: grade-level defaults, room-level overrides, and location-level overrides.

### 3.3 At-Rest vs In-Operation Monitoring Scenarios

| Scenario | Monitoring Type | Purpose |
|----------|----------------|---------|
| After cleaning, before operations | At-rest particle count | Verify room returns to classified state after cleaning |
| During batch processing | In-operation particle + viable | Verify conditions maintained during production |
| After maintenance / HVAC work | At-rest particle count + recovery test | Verify room re-qualifies after disruption |
| Annual re-qualification | Full ISO 14644 classification (at rest + in operation) | Regulatory requirement for continued classification |
| After significant facility change | Full re-qualification | Demonstrate change did not impact classification |

---

## 4. Monitoring Schedule and Sample Point Management

### 4.1 Sample Point Mapping

Every monitoring location must be uniquely identified and documented on a site map (floor plan). The following data should be captured per sample point:

| Field | Description | Example |
|---|---|---|
| Location code | Unique identifier | EM-CR01-A-001 |
| Room name | Cleanroom name / number | Cleanroom 01 — Filling Room |
| Zone | PDA TR13 zone (1-4) | Zone 1 |
| Grade / ISO class | EU GMP or ISO classification | Grade A / ISO 5 |
| At rest / in operation | Which state applies | In operation |
| Position description | Narrative of where the sample is taken | Adjacent to filling needle, left side, 15cm from fill point |
| X/Y coordinates | Position on floor plan (for mapping) | (3.2, 7.8) |
| Sample types | Which sample types are collected at this location | Continuous particles, active air, settle plate, contact plate |
| Frequency | Monitoring frequency for each sample type | Continuous (particles), per batch (active air), per batch (settle plate) |
| Justification | Why this location is monitored | Proximity to open product exposure; highest contamination risk zone |
| Qualification reference | Link to qualification protocol/report | PQ-CR01-2024-001 |
| Date established | When monitoring at this point began | 2025-01-15 |
| Status | Active / Inactive / Under Review | Active |

**Location Code Convention (recommended for Vent):**

Format: `EM-{ROOM}-{GRADE}-{SEQ}`

Examples:
- `EM-CR01-A-001` — Cleanroom 01, Grade A, location 001
- `EM-CR01-B-005` — Cleanroom 01, Grade B, location 005
- `EM-PREP-C-002` — Preparation room, Grade C, location 002
- `EM-LOCK-D-001` — Airlock, Grade D, location 001

### 4.2 Risk-Based Monitoring Frequency

Monitoring frequency should be determined by risk assessment considering:

1. **Criticality of the area:** Grade A (product exposure) is the highest risk; Grade D is the lowest
2. **Proximity to product:** Zone 1 locations require the most frequent monitoring
3. **Historical performance:** Locations with a history of excursions may require increased frequency
4. **Personnel traffic:** High-traffic areas generate more particles and require more monitoring
5. **Process type:** Open processing (highest risk) vs. closed processing (lower risk)
6. **HVAC performance:** Areas with known HVAC challenges may need more monitoring
7. **Regulatory expectation:** EU GMP Annex 1 mandates continuous particle monitoring for Grade A

**Recommended Monitoring Frequency Matrix:**

| Monitoring Type | Grade A | Grade B | Grade C | Grade D |
|----------------|---------|---------|---------|---------|
| Non-viable particles (continuous counter) | Continuous throughout operations | During operations (may be continuous or periodic per risk assessment) | Not typically continuous; daily or per shift during operations | Monthly or per campaign |
| Non-viable particles (portable counter) | Not applicable (use continuous) | Daily during operations | Weekly during operations | Monthly |
| Active air sampling (viable) | Per batch or per shift (minimum) | Daily during operations | Weekly during operations | Monthly |
| Settle plates | Continuous exposure during operations (change every 4 hours) | Daily during operations (4-hour exposure) | Weekly during operations | Monthly |
| Surface monitoring (contact plates / swabs) | After each batch or campaign | Daily or per shift during operations | Weekly | Monthly |
| Personnel monitoring (gloves) | After each critical intervention; at exit from Grade A/B | At exit from Grade B | Per campaign or weekly | Quarterly or per gowning qualification |
| Personnel monitoring (gown) | Per gowning qualification schedule | Per gowning qualification schedule | Per gowning qualification schedule | Per gowning qualification schedule |
| Recovery time test | After any excursion; annually | Annually | Annually | Annually |

### 4.3 Monitoring Schedule — Operational Workflow

A typical daily EM workflow for a cleanroom manufacturing suite:

```
06:00  Room preparation begins
       - HVAC pre-condition (if not 24/7)
       - At-rest particle count verification (15-30 minutes)

07:00  Gowning and room entry
       - Personnel gown and enter classified areas
       - Continuous particle monitors activated (Grade A)
       - Settle plates placed at designated locations
       - Active air samplers set up

07:30  Production begins
       - Continuous particle monitoring running (Grade A)
       - Active air sampling starts (1 m3 samples per designated locations)
       - Settle plates exposed (start 4-hour timer)

11:30  4-hour settle plate change (Grade A and B)
       - Remove exposed settle plates, label, send to microbiology
       - Place new settle plates

12:00  Mid-shift viable air sampling (if per-shift frequency)
       - Collect active air samples at designated Grade B locations

15:30  Second 4-hour settle plate change (if operations continue)
       - Remove and replace settle plates

16:00  End of production operations
       - Remove final settle plates
       - Perform surface monitoring (contact plates on equipment, floors, walls)
       - Perform personnel monitoring (glove fingertip sampling at degowning)
       - Retrieve continuous particle count data from Grade A monitors

16:30  Sample processing
       - Transport all viable samples to microbiology lab
       - Log samples into EM tracking system
       - Begin incubation (20-25 degrees C)

Day 3  First incubation read (after 48-72 hours at 20-25 degrees C)
       - Read plates for fungi and slow-growing bacteria
       - Transfer to 30-35 degrees C incubation

Day 5-7  Final incubation read (after 48-72 hours at 30-35 degrees C)
       - Final colony count on all plates
       - Enter results into EM system
       - Flag any alert or action limit excursions
       - Isolate and identify organisms (if required)

Day 7-10  Data review and trending
       - QA microbiologist reviews all EM data
       - Generate trend reports
       - Investigate any excursions
       - Approve/release EM data
```

---

## 5. Key Data Fields — Complete Data Model Reference

### 5.1 Core Entities

**em_samples (Primary monitoring sample record):**

| Field | Type | Description |
|---|---|---|
| sample_id | TEXT PK | Unique sample identifier (e.g., EMS-1000) |
| location_code | TEXT NOT NULL | Reference to monitoring location |
| room_name | TEXT NOT NULL | Room / area name |
| zone | TEXT NOT NULL | Zone classification (1/2/3/4 per PDA TR13) |
| grade | TEXT NOT NULL | EU GMP Grade (A/B/C/D) |
| iso_class | TEXT NOT NULL | ISO 14644 class (ISO 5/6/7/8) |
| sample_type | TEXT NOT NULL | viable_air / viable_settle / viable_surface_contact / viable_surface_swab / viable_personnel_glove / viable_personnel_gown / non_viable_particle |
| sample_date | TIMESTAMPTZ NOT NULL | Date and time of sample collection |
| sample_end_date | TIMESTAMPTZ | End time (for continuous monitoring / settle plates) |
| batch_number | TEXT | Associated production batch (if applicable) |
| operator_id | TEXT NOT NULL | Person who collected the sample |
| instrument_id | TEXT | Equipment ID (particle counter, air sampler) |
| media_lot | TEXT | Agar plate / media lot number (for viable samples) |
| media_type | TEXT | TSA / SDA / TSA+neutralisers / other |
| sample_volume_litres | NUMERIC | Volume of air sampled (for air samples) |
| exposure_time_minutes | INTEGER | Exposure duration (for settle plates) |
| surface_area_cm2 | NUMERIC | Surface area sampled (for contact plates / swabs) |
| incubation_temp_1 | NUMERIC | First incubation temperature (degrees C) |
| incubation_start_1 | TIMESTAMPTZ | Start of first incubation |
| incubation_end_1 | TIMESTAMPTZ | End of first incubation |
| incubation_temp_2 | NUMERIC | Second incubation temperature |
| incubation_start_2 | TIMESTAMPTZ | Start of second incubation |
| incubation_end_2 | TIMESTAMPTZ | End of second incubation |
| count_result | INTEGER | Colony count (CFU) for viable; particle count for non-viable |
| count_0_5um | INTEGER | Particle count >= 0.5 um (non-viable only) |
| count_5_0um | INTEGER | Particle count >= 5.0 um (non-viable only) |
| concentration_per_m3 | NUMERIC | Calculated concentration (count / volume in m3) |
| alert_limit | NUMERIC | Alert limit for this location + sample type |
| action_limit | NUMERIC | Action limit for this location + sample type |
| excursion_flag | BOOLEAN DEFAULT FALSE | Whether result exceeds alert or action limit |
| excursion_type | TEXT | none / alert / action |
| organism_detected | BOOLEAN DEFAULT FALSE | Whether colonies were detected (viable samples) |
| status | TEXT DEFAULT 'pending' | pending / incubating / reading / reviewed / approved |
| reviewed_by | TEXT | QA reviewer |
| reviewed_date | TIMESTAMPTZ | Date of QA review |
| approved_by | TEXT | Final approver (if separate from reviewer) |
| approved_date | TIMESTAMPTZ | Date of approval |
| comments | TEXT | Free-text observations |
| deviation_id | TEXT | Link to deviation record (if excursion triggers deviation) |
| created_at | TIMESTAMPTZ DEFAULT now() | Record creation timestamp |
| updated_at | TIMESTAMPTZ DEFAULT now() | Last modification timestamp |
| created_by | TEXT NOT NULL | User who created the record |

**em_locations (Monitoring location master data):**

| Field | Type | Description |
|---|---|---|
| location_code | TEXT PK | Unique location identifier |
| room_name | TEXT NOT NULL | Room name |
| zone | TEXT NOT NULL | PDA TR13 zone (1/2/3/4) |
| grade | TEXT NOT NULL | EU GMP Grade (A/B/C/D) |
| iso_class | TEXT NOT NULL | ISO classification |
| position_description | TEXT | Narrative description of the sample point |
| x_coordinate | NUMERIC | X position on floor plan |
| y_coordinate | NUMERIC | Y position on floor plan |
| floor_plan_id | TEXT | Reference to floor plan document |
| sample_types | JSONB | Array of sample types collected at this location |
| frequency | JSONB | Monitoring frequency per sample type |
| alert_limits | JSONB | Alert limits per sample type and particle size |
| action_limits | JSONB | Action limits per sample type and particle size |
| justification | TEXT | Why this location is monitored |
| qualification_ref | TEXT | Link to qualification protocol |
| date_established | DATE | When monitoring began |
| status | TEXT DEFAULT 'active' | active / inactive / under_review |
| created_at | TIMESTAMPTZ DEFAULT now() | |
| updated_at | TIMESTAMPTZ DEFAULT now() | |

**em_organisms (Environmental isolate library):**

| Field | Type | Description |
|---|---|---|
| organism_id | TEXT PK | Unique identifier (e.g., EORG-1000) |
| genus | TEXT NOT NULL | Genus (e.g., Staphylococcus) |
| species | TEXT | Species (e.g., epidermidis) |
| gram_stain | TEXT | gram_positive / gram_negative / not_applicable |
| morphology | TEXT | cocci / bacilli / rod / yeast / mold / other |
| identification_method | TEXT | MALDI-TOF / 16S_rRNA / API / Vitek / other |
| source_sample_id | TEXT | Sample from which organism was first isolated |
| first_detected_date | DATE NOT NULL | Date organism first appeared in the facility |
| last_detected_date | DATE | Most recent detection |
| detection_count | INTEGER DEFAULT 1 | Total number of times detected |
| locations_detected | JSONB | Array of location codes where detected |
| objectionable | BOOLEAN DEFAULT FALSE | Whether classified as objectionable organism |
| risk_assessment | TEXT | Risk level: low / medium / high / critical |
| typical_source | TEXT | Likely environmental source (human, water, soil, etc.) |
| notes | TEXT | Additional characterisation notes |
| created_at | TIMESTAMPTZ DEFAULT now() | |
| updated_at | TIMESTAMPTZ DEFAULT now() | |

**em_excursions (Excursion investigation records):**

| Field | Type | Description |
|---|---|---|
| excursion_id | TEXT PK | Unique identifier (e.g., EMEX-1000) |
| sample_id | TEXT NOT NULL | FK to em_samples |
| excursion_type | TEXT NOT NULL | alert / action |
| location_code | TEXT NOT NULL | Where the excursion occurred |
| grade | TEXT NOT NULL | Grade of the area |
| result_value | NUMERIC NOT NULL | The measured value |
| limit_value | NUMERIC NOT NULL | The limit that was exceeded |
| investigation_summary | TEXT | Root cause investigation narrative |
| root_cause | TEXT | Identified root cause category |
| organisms_identified | JSONB | Array of organism IDs identified in excursion |
| batch_impact_assessment | TEXT | Assessment of impact on associated batch(es) |
| batches_affected | JSONB | Array of batch numbers potentially affected |
| corrective_actions | TEXT | Immediate corrective actions taken |
| additional_monitoring | BOOLEAN DEFAULT FALSE | Whether additional monitoring was implemented |
| deviation_id | TEXT | FK to deviation record (if triggered) |
| capa_id | TEXT | FK to CAPA record (if triggered) |
| status | TEXT DEFAULT 'open' | open / investigating / pending_review / closed |
| investigated_by | TEXT | Person conducting investigation |
| reviewed_by | TEXT | QA reviewer |
| closed_date | TIMESTAMPTZ | Date investigation closed |
| created_at | TIMESTAMPTZ DEFAULT now() | |
| updated_at | TIMESTAMPTZ DEFAULT now() | |

**em_schedules (Monitoring schedule definitions):**

| Field | Type | Description |
|---|---|---|
| schedule_id | TEXT PK | Unique identifier |
| location_code | TEXT NOT NULL | FK to em_locations |
| sample_type | TEXT NOT NULL | Sample type to be collected |
| frequency | TEXT NOT NULL | continuous / per_batch / per_shift / daily / weekly / monthly / quarterly |
| day_of_week | INTEGER | For weekly schedules (0=Sunday, 6=Saturday) |
| time_of_day | TIME | Scheduled collection time |
| operator_group | TEXT | Which personnel group performs this monitoring |
| sop_reference | TEXT | Applicable SOP |
| effective_date | DATE | When schedule takes effect |
| status | TEXT DEFAULT 'active' | active / suspended / superseded |
| created_at | TIMESTAMPTZ DEFAULT now() | |

### 5.2 ID Generation Prefixes (for server/lib/ids.js)

| Prefix | Entity | Example |
|---|---|---|
| EMS- | EM Sample | EMS-1000 |
| EMLOC- | EM Location | EMLOC-1000 |
| EORG- | EM Organism | EORG-1000 |
| EMEX- | EM Excursion | EMEX-1000 |
| EMSC- | EM Schedule | EMSC-1000 |

---

## 6. Excursion Management

### 6.1 Excursion Classification and Response

Excursion management is the most critical operational aspect of environmental monitoring. Every excursion must be classified, investigated, and resolved with documented evidence.

**Alert Limit Breach:**

| Step | Action | Timeframe | Responsibility |
|------|--------|-----------|----------------|
| 1 | System flags alert limit exceedance | Immediate (automated) | EM System |
| 2 | Notification sent to EM team and area supervisor | Immediate (automated) | EM System |
| 3 | Review by QA microbiologist or EM specialist | Within 24 hours | QA Microbiology |
| 4 | Assessment: is this a single isolated event or part of a trend? | Within 24 hours | QA Microbiology |
| 5 | If isolated: document, trend, and monitor for recurrence | Within 48 hours | QA Microbiology |
| 6 | If trending: escalate to action limit investigation process | Immediately upon trend detection | QA Microbiology |
| 7 | No formal deviation required for single alert exceedance | — | — |
| 8 | Additional monitoring may be implemented at the discretion of QA | Per risk assessment | QA |

**Action Limit Breach:**

| Step | Action | Timeframe | Responsibility |
|------|--------|-----------|----------------|
| 1 | System flags action limit exceedance | Immediate (automated) | EM System |
| 2 | Notification sent to QA management, area supervisor, and production management | Immediate (automated) | EM System |
| 3 | Initiate formal deviation / investigation record | Within 24 hours | QA |
| 4 | Organism identification initiated (colonies subcultured) | Within 24 hours | QA Microbiology |
| 5 | Root cause investigation | Within 5 business days | QA / Production |
| 6 | Batch impact assessment (for batches produced during excursion period) | Within 5 business days | QA |
| 7 | Corrective actions implemented | Per investigation findings | Production / Facilities |
| 8 | Additional monitoring at affected location(s) | Immediately; continue for defined period | QA Microbiology |
| 9 | Deviation closure with evidence of remediation effectiveness | Within 30 days | QA |
| 10 | CAPA initiated if root cause is systemic | Per CAPA timeline | QA |

**Grade A Excursion (any viable count or particle limit breach):**

Grade A excursions are the most serious EM events and receive the highest level of scrutiny:

| Step | Action | Timeframe | Responsibility |
|------|--------|-----------|----------------|
| 1 | System flags Grade A excursion (any viable CFU or particle limit breach) | Immediate (automated) | EM System |
| 2 | Notification to QA Director, Production Director, facility management | Immediate (automated) | EM System |
| 3 | Initiate formal deviation with "critical" severity | Within 4 hours | QA |
| 4 | Suspend operations in affected Grade A zone (if ongoing) | Immediately upon detection | Production |
| 5 | Batch impact assessment — identify all batches with open product exposure during the excursion window | Within 24 hours | QA |
| 6 | Organism identification (all colonies from Grade A must be ID'd) | Initiated within 24 hours | QA Microbiology |
| 7 | Full root cause investigation (may include: HVAC review, airflow visualisation, personnel review, cleaning review, equipment review) | Initiated within 24 hours | Cross-functional team |
| 8 | Batch disposition decision: release, reject, or hold pending investigation | Based on investigation | QP / Head of QA |
| 9 | Recovery testing: demonstrate Grade A zone returns to compliant state before resuming operations | Before operations resume | QA / Facilities |
| 10 | Enhanced monitoring: increase monitoring frequency at affected and surrounding locations for a defined period (typically 2-4 weeks) | Immediately upon resumption | QA Microbiology |
| 11 | CAPA required for all Grade A excursions | Within CAPA timeline | QA |
| 12 | Deviation closure with full evidence package | Within 30 days | QA |

### 6.2 Root Cause Categories

Standard root cause categories for EM excursions (for standardised investigation and trending):

| Category | Examples |
|---|---|
| **Personnel** | Gowning breach, poor aseptic technique, excessive movement, insufficient training, operator illness |
| **HVAC / Facilities** | Air handling unit failure, filter leak, pressure differential loss, temperature/humidity excursion, door left open |
| **Cleaning / Disinfection** | Inadequate cleaning, expired disinfectant, missed surfaces, insufficient contact time, disinfectant rotation failure |
| **Equipment** | Equipment malfunction generating particles, unclean equipment surfaces, maintenance activity |
| **Materials** | Contaminated raw material, non-sterile component, inadequate decontamination of materials entering cleanroom |
| **Process** | Process step generating excessive particles or aerosols, prolonged open product exposure |
| **Media / Method** | EM media issue (false positive), sampling technique error, incubation conditions incorrect |
| **Unknown** | Root cause could not be determined (must document investigation efforts and extent of inquiry) |

### 6.3 Contamination Recovery Procedures

When an action limit excursion is confirmed:

1. **Immediate disinfection** of the affected area with the primary disinfectant
2. **Follow-up cleaning** with the secondary (sporicidal) disinfectant if fungi or spore-forming organisms are detected
3. **Recovery monitoring:** Perform additional sampling at the excursion location and surrounding locations
4. **Recovery acceptance criteria:** Two consecutive clean results at the excursion location
5. **Resume normal monitoring** once recovery is demonstrated
6. **Enhanced monitoring period:** Continue increased frequency for a defined period (typically 2-4 weeks) to confirm sustained recovery

---

## 7. Trending and Analytics

### 7.1 Statistical Process Control for EM Data

EM data trending is a regulatory expectation (EU GMP Annex 1 paragraph 9.25, FDA guidance, USP <1116>). The following statistical tools should be available in the Vent EM module:

**Control Charts:**

- **X-bar and R charts:** For continuous data (particle counts). Plot individual results or batch means with upper control limit (UCL), lower control limit (LCL), and centre line (CL). UCL = mean + 3 standard deviations.
- **c-charts (count charts):** For viable monitoring data (CFU counts follow a Poisson distribution). Appropriate when the sample size (volume, area, exposure time) is constant.
- **u-charts (rate charts):** For viable monitoring data when sample size varies. Plot CFU/m3 or CFU/plate with control limits calculated from Poisson distribution.
- **Moving average charts:** Smooth out short-term fluctuations and highlight longer-term trends. Useful for monthly or quarterly reviews. Recommended window: 10-20 data points.
- **CUSUM (Cumulative Sum) charts:** Highly sensitive to small, sustained shifts in the process mean. Excellent for detecting gradual environmental deterioration before it reaches alert levels.
- **EWMA (Exponentially Weighted Moving Average) charts:** Weighted moving average that gives more weight to recent data. Good for detecting both sudden shifts and gradual trends.

**Vent implementation note:** For the initial build, implement simple time-series line charts with alert/action limit lines, plus a moving average overlay. CUSUM and EWMA are enhancements for a later phase. The key value is visual trend display with automated alerts when the trend direction is adverse.

**Trend Review Cadence:**

| Review Type | Frequency | Scope | Audience |
|-------------|-----------|-------|----------|
| Daily review | Daily | All results from previous 24 hours; focus on excursions | EM team / QA microbiologist |
| Weekly summary | Weekly | All results from past week; highlight any excursions and investigation status | QA management |
| Monthly trend report | Monthly | Full trending analysis — all locations, all sample types; control charts; organism summary | Site QA, Production management |
| Quarterly review | Quarterly | Statistical analysis; seasonal comparison; limit review; programme effectiveness review | Site leadership, QP |
| Annual programme review | Annually | Comprehensive programme review; limit reassessment; location review; comparison to previous year | Site leadership, regulatory filing |

### 7.2 Location-Specific Trending

Each monitoring location should have its own trend history, enabling:

- Detection of location-specific deterioration (e.g., a specific Grade B location showing increasing counts while others remain stable — may indicate a local HVAC issue or equipment problem)
- Comparison between similar locations (e.g., two filling rooms with the same grade should show comparable EM profiles)
- Identification of "hot spots" — locations with consistently higher counts than peers
- Correlation with facility events (maintenance, personnel changes, seasonal effects)

**Vent implementation note:** The location-centric data model (em_locations + em_samples joined on location_code) supports this directly. The frontend should include a location detail view showing: time-series trend, histogram of results, summary statistics (mean, median, 95th percentile, max), and a comparison to the grade-level aggregate.

### 7.3 Organism Tracking and Environmental Isolate Library

The environmental isolate library is a regulatory expectation (EU GMP Annex 1 paragraph 9.27) and a powerful tool for contamination investigation:

**Isolate Library Functions:**

- **Catalogue all unique organisms** recovered from the facility environment
- **Track frequency** of detection per organism (how often is each organism found?)
- **Track distribution** — where in the facility is each organism found? (Grade A only? Widespread? Localised to one room?)
- **Temporal tracking** — is the organism seasonal? Recently emerged? Disappearing?
- **Source attribution** — is the organism human-associated (skin flora: Staphylococcus, Micrococcus, Corynebacterium), water-associated (Pseudomonas, Burkholderia, Ralstonia), environmental/soil (Bacillus, Aspergillus, Penicillium), or unknown?
- **Objectionable organism flagging** — organisms with known pathogenicity (e.g., S. aureus, P. aeruginosa, B. cepacia complex, moulds in Grade A) require enhanced investigation regardless of count

**Typical Facility Flora Profile:**

| Organism Group | Source | Expected Recovery Areas | Concern Level |
|---|---|---|---|
| Coagulase-negative Staphylococci (S. epidermidis, S. hominis) | Human skin | All grades; most common Grade A/B isolate | Low (unless persistent in Grade A) |
| Micrococcus spp. | Human skin | All grades | Low |
| Corynebacterium spp. | Human skin | Grade B/C/D | Low |
| Bacillus spp. (non-anthracis) | Soil, dust | Grade C/D primarily | Medium (spore-forming; difficult to eliminate) |
| Staphylococcus aureus | Human (nasal carriage) | Any grade (associated with personnel) | High (objectionable; potential pathogen) |
| Pseudomonas aeruginosa | Water, wet surfaces | Water systems, drains, wet areas | Critical (objectionable; product-spoilage organism) |
| Burkholderia cepacia complex | Water | Purified water systems | Critical (objectionable; FDA alert organism) |
| Aspergillus spp. | Air, soil, construction | Grade C/D; concerning in Grade A/B | High in Grade A/B (mould in aseptic area = major investigation) |
| Penicillium spp. | Air, soil | Grade C/D | Medium (common environmental mould) |
| Candida spp. | Human | Grade B/C (personnel-associated) | Medium |

### 7.4 Seasonal Pattern Analysis

Many facilities observe seasonal patterns in environmental monitoring data:

- **Summer/warm months:** Higher mould counts (Aspergillus, Penicillium, Cladosporium) due to higher outdoor spore loads, HVAC working harder
- **Winter/cold months:** Lower overall counts; personnel-associated organisms predominate
- **Construction season:** If nearby construction occurs, increased particulate and mould counts possible
- **HVAC maintenance windows:** Post-maintenance periods may show transient elevations

**Vent implementation note:** Seasonal trending requires at least 12-24 months of data. The module should include a year-over-year comparison view showing the same location/month across multiple years. AI can detect seasonal patterns automatically once sufficient historical data is available.

---

## 8. AI Opportunities

### 8.1 Predictive Contamination Risk Scoring

**What the AI should do:**
- Analyse historical EM data for each monitoring location and calculate a dynamic contamination risk score
- Inputs: recent trend direction (improving/stable/worsening), proximity to limits, frequency of excursions in the past 6-12 months, organism diversity (increasing diversity may indicate a new contamination source), correlation with facility events
- Output: Risk score per location (Green/Yellow/Red) with a narrative explanation

**Implementation approach:**
```
Input data:
  - All EM results for location over past 12 months
  - Current alert/action limits
  - Excursion history
  - Organism ID data
  - Recent facility events (cleaning, maintenance, personnel changes)

Scoring model (rule-based + AI enhancement):
  Base score = 0 (Green)
  + Recent trend upward: +10 per consecutive increase
  + Result > 70% of action limit: +15
  + Any action limit excursion in past 3 months: +25
  + Multiple excursions in past 6 months: +30
  + New organism detected at location: +10
  + Objectionable organism at location: +40
  + Post-maintenance period (< 7 days): +10
  + Seasonal risk factor (mould season + outdoor location proximity): +5

  Risk levels:
  0-20: Green (normal)
  21-50: Yellow (elevated awareness)
  51-75: Orange (heightened risk — consider additional monitoring)
  76+: Red (critical risk — investigate immediately)

AI enhancement:
  - Claude analyses the full context (not just numeric score) and provides a narrative:
    "Location EM-CR01-B-005 risk is elevated. Active air counts have shown a gradual upward trend over the past 6 weeks (mean shifted from 2.1 to 4.3 CFU/m3). Two alert excursions occurred in the past month. The predominant organism (Micrococcus luteus) is consistent with human skin flora, suggesting a personnel-related root cause. Recommend: review personnel practices at this station, verify gowning compliance, and consider additional air sampling at adjacent locations."
```

**Value to users:** Proactive risk identification before excursions occur. Transforms EM from a reactive programme (respond to excursions after they happen) to a predictive programme (identify areas at risk before limits are breached).

### 8.2 Anomaly Detection in Particle Counts

**What the AI should do:**
- Monitor continuous particle count data streams from Grade A/B zones in real time (or near real-time)
- Detect anomalous patterns that may indicate developing problems:
  - Sudden spike followed by gradual decay (particle generation event — door opening, intervention, equipment malfunction)
  - Gradual sustained increase (HVAC degradation, filter loading, seal deterioration)
  - Periodic spikes (correlated with specific activities, shift changes, or equipment cycles)
  - Unusual baseline elevation (overall increase without discrete events — may indicate HEPA filter issue)

**Implementation approach:**
```
Statistical anomaly detection:
  - Calculate rolling baseline (median of past 100 data points)
  - Calculate rolling standard deviation
  - Flag data points > baseline + 3*SD as anomalies
  - Detect trend changes using change-point detection (simple: compare mean of last 20 points vs. previous 20 points)

AI analysis:
  - When anomalies are detected, Claude analyses the pattern and suggests:
    1. Most likely cause (based on pattern shape and timing)
    2. Recommended response (investigate, increase monitoring, no action — transient event)
    3. Correlation with other data (was there a door opening? personnel entry? maintenance activity?)
```

**Value to users:** Continuous particle monitoring generates enormous volumes of data. AI can filter this data stream and surface only the events that require human attention, reducing review burden while improving detection sensitivity.

### 8.3 Investigation Scope Recommendation

**What the AI should do:**
- When an excursion occurs, automatically suggest the scope and focus of the investigation based on:
  - The type of excursion (viable vs. non-viable, Grade A vs. Grade C)
  - The organism(s) identified (if viable)
  - Historical patterns at this location
  - Concurrent events (other excursions nearby, facility events)
  - Similar past investigations and their outcomes

**Implementation approach:**
```
AI prompt template:
  "An environmental monitoring excursion has occurred:
   - Location: {location_code} ({room_name}, {grade})
   - Sample type: {sample_type}
   - Result: {result_value} (Action limit: {action_limit})
   - Organism identified: {genus} {species} (if applicable)
   - Historical context: [last 12 months of data for this location]
   - Previous excursions at this location: [list]
   - Previous excursions with this organism: [list]

   Based on this information:
   1. What are the most likely root causes? (rank by probability)
   2. What specific investigation steps should be taken?
   3. Are there any related locations or systems that should be checked?
   4. What corrective actions are most commonly effective for this type of excursion?
   5. Is there a batch impact concern? What batches should be evaluated?"
```

**Value to users:** Standardises and accelerates the investigation process. Newer QA personnel benefit from AI-guided investigation that draws on the facility's full EM history. Reduces investigation time and improves consistency.

### 8.4 Automated Trend Report Generation

**What the AI should do:**
- Generate comprehensive EM trend reports (monthly/quarterly/annual) automatically
- Sections: executive summary, excursion summary, location-by-location trends, organism library update, seasonal analysis, limit adequacy assessment, recommendations
- Highlight areas of concern and improvement
- Include automatically generated charts and statistical summaries

**Implementation approach:**
```
Report structure (AI-generated):

1. Executive Summary
   - Total samples collected: X
   - Excursion rate: X% (target: < Y%)
   - Grade A excursions: X (target: 0)
   - Trend direction: Stable / Improving / Deteriorating

2. Non-Viable Particle Summary
   - Grade A compliance: X% of monitoring time within limits
   - Grade B/C/D: summary of portable particle count results
   - Trending charts (auto-generated)

3. Viable Monitoring Summary
   - Results by grade and sample type
   - Excursion details and investigation status
   - Trending charts

4. Organism Summary
   - New organisms added to isolate library: X
   - Most frequently recovered organisms: [ranked list]
   - Any objectionable organisms detected: [details]
   - Distribution maps: [organisms by location]

5. Personnel Monitoring Summary
   - Gowning qualification status
   - Personnel-associated excursions

6. Recommendations
   - Locations requiring attention
   - Suggested limit adjustments (with statistical justification)
   - Programme improvements

7. Comparison to Previous Period
   - Key metrics compared to previous month/quarter/year
```

**Value to users:** Trend report generation is one of the most time-consuming EM activities — typically requires 2-4 days of microbiologist time per month. AI can generate a first draft in minutes, with the microbiologist reviewing and approving rather than creating from scratch.

### 8.5 Real-Time Cleanroom Status Dashboard

**What the AI should do:**
- Provide a facility-wide real-time view of cleanroom environmental status
- Each room/zone displayed with a traffic-light status (Green/Yellow/Red) based on current monitoring data
- Real-time particle count display for Grade A zones (from continuous monitors)
- Most recent viable monitoring results per location
- Excursion alerts with countdown timers for investigation deadlines
- AI-generated facility health narrative ("All cleanrooms are within specification. Note: Filling Room 2 particle counts have been trending upward over the past 3 days — monitoring closely.")

**Dashboard layout concept:**

```
+------------------------------------------------------------------+
|  FACILITY EM STATUS                    Last updated: 2026-03-07   |
+------------------------------------------------------------------+
|                                                                    |
|  [FLOOR PLAN / SITE MAP]                                          |
|                                                                    |
|  Filling Room 1 (Grade A/B)     [GREEN]                           |
|    - Particles 0.5um: 1,234/m3 (limit: 3,520)                    |
|    - Last viable air: 0 CFU (4 hrs ago)                           |
|    - Last surface: 0 CFU (8 hrs ago)                              |
|                                                                    |
|  Filling Room 2 (Grade A/B)     [YELLOW - TRENDING]               |
|    - Particles 0.5um: 2,890/m3 (limit: 3,520) !! 82% of limit   |
|    - Last viable air: 0 CFU (3 hrs ago)                           |
|    - Trend: Particle counts up 35% vs. 7-day average             |
|                                                                    |
|  Preparation Room (Grade C)     [GREEN]                           |
|    - Particles 0.5um: 156,000/m3 (limit: 3,520,000)              |
|    - Last viable air: 12 CFU/m3 (yesterday)                      |
|                                                                    |
|  Buffer Prep (Grade D)          [RED - EXCURSION]                 |
|    - Action limit excursion: Active air = 245 CFU/m3 (limit: 200) |
|    - Investigation: DEV-2345 (open, Day 3 of 30)                  |
|    - Enhanced monitoring in effect                                 |
|                                                                    |
+------------------------------------------------------------------+
|  OPEN EXCURSIONS: 1  |  ALERT TRENDS: 1  |  PENDING REVIEWS: 5  |
+------------------------------------------------------------------+
```

### 8.6 Optimal Monitoring Schedule Recommendation

**What the AI should do:**
- Analyse historical data to recommend adjustments to monitoring frequency and locations
- Identify locations that have been consistently clean for extended periods and may warrant reduced monitoring frequency (risk-based optimisation)
- Identify locations with elevated risk that may warrant increased monitoring
- Ensure any recommendations maintain regulatory compliance (cannot go below minimum frequencies)
- Output: recommended schedule changes with statistical justification

**Implementation approach:**
```
Analysis for each location:
  - Calculate excursion rate over past 12 months
  - Calculate trend (improving, stable, deteriorating)
  - Compare to grade-level aggregate

Recommendations:
  IF excursion_rate == 0 AND trend == stable AND monitoring_duration > 12 months
    THEN "Consider reducing frequency from {current} to {reduced}" (e.g., daily to 3x/week)
    UNLESS grade == A (Grade A monitoring frequency cannot be reduced)

  IF excursion_rate > 5% OR trend == deteriorating
    THEN "Consider increasing frequency from {current} to {increased}" (e.g., weekly to daily)

  IF location has never had a positive result in 24+ months AND is Zone 3/4
    THEN "Evaluate whether this monitoring point is still necessary per risk assessment"
```

**Value to users:** Optimises EM programme efficiency — reduces unnecessary sampling (cost and labour savings) while focusing resources on higher-risk areas. This is explicitly supported by EU GMP Annex 1's risk-based approach and ICH Q9.

### 8.7 Contamination Source Investigation Assistant

**What the AI should do:**
- When an unusual organism is detected or a cluster of excursions occurs, assist with contamination source investigation
- Cross-reference the organism with the environmental isolate library to find previous occurrences
- Analyse spatial patterns (are excursions clustered in adjacent locations? Moving along an airflow path?)
- Analyse temporal patterns (do excursions correlate with specific shifts, operators, activities, or times?)
- Suggest investigation hypotheses and testing strategies

**AI prompt template:**
```
"A contamination investigation is needed:
 - Organism: {genus} {species}
 - Location(s) affected: [list]
 - Date(s) detected: [list]
 - Previous facility history with this organism: [from isolate library]
 - Known sources of {genus} {species}: [from knowledge base]
 - Concurrent facility events: [from event log]
 - HVAC data for affected area: [pressure differentials, temperature, airflow]

 Provide:
 1. Most likely contamination source(s)
 2. Transmission pathway hypothesis
 3. Recommended sampling strategy to confirm source
 4. Interim containment measures
 5. References to similar investigations in pharmaceutical literature"
```

---

## 9. Integration Points

### 9.1 Deviation Management Module

**Integration type:** Bi-directional

| Trigger | Direction | Action |
|---------|-----------|--------|
| EM action limit excursion | EM -> Deviation | Auto-create deviation record with excursion details pre-populated |
| EM Grade A excursion | EM -> Deviation | Auto-create deviation with "critical" severity; notify QA director |
| Multiple alert excursions trending | EM -> Deviation | AI suggests deviation creation based on trending analysis |
| Deviation investigation requests additional EM | Deviation -> EM | Link additional sampling requests to the deviation record |
| Deviation root cause identified | Deviation -> EM | Update excursion record with root cause and corrective actions |

**Data shared:**
- Excursion details (sample ID, location, result, limit, organism)
- Batch numbers associated with the excursion
- Investigation findings and corrective actions

### 9.2 CAPA System

**Integration type:** EM -> CAPA

| Trigger | Action |
|---------|--------|
| Grade A excursion | Auto-generate CAPA request (all Grade A excursions require CAPA per best practice) |
| Recurring excursions at same location (e.g., > 3 in 6 months) | AI recommends CAPA for systemic issue |
| Objectionable organism detected | CAPA recommended for contamination control review |
| Adverse trend persisting after corrective action | CAPA recommended for effectiveness verification failure |

**Data shared:**
- Excursion history and trend data
- Root cause investigation findings
- Previous corrective actions and their effectiveness

### 9.3 Batch Records

**Integration type:** Bi-directional

| Direction | Data Flow |
|-----------|-----------|
| EM -> Batch Record | All EM results collected during the batch production window are linked to the batch record. Batch record includes EM status summary (all within limits / alert excursion / action excursion) |
| Batch Record -> EM | Batch production schedule provides the time windows during which EM must be performed. Batch number is recorded on each EM sample |
| EM excursion -> Batch Disposition | Grade A/B excursions during production trigger batch impact assessment. Batch may be held pending investigation outcome |

**Data shared:**
- Batch number, product, production date/time window
- All EM sample results during the batch window
- EM compliance status (pass/fail summary per grade)
- Excursion details and batch impact assessment (if any)

### 9.4 Cleaning Records

**Integration type:** Bi-directional

| Direction | Data Flow |
|-----------|-----------|
| Cleaning -> EM | Cleaning completion triggers at-rest EM sampling (verify room is clean). Cleaning record ID linked to subsequent EM samples |
| EM excursion -> Cleaning | EM excursion investigation may determine inadequate cleaning as root cause. Trigger additional cleaning and verification sampling |
| EM trend -> Cleaning | Adverse EM trends may trigger cleaning procedure review or disinfectant rotation assessment |

**Data shared:**
- Cleaning record ID, room, date, cleaning agent, operator
- EM results post-cleaning (verification sampling)
- Disinfectant rotation schedule and efficacy data

### 9.5 HVAC / BMS Systems

**Integration type:** BMS -> EM (data feed)

Building Management System (BMS) data is critical context for EM data interpretation:

| BMS Data Point | EM Relevance |
|---|---|
| Room pressure differential | Pressure differential loss correlates with particle count increases and contamination risk |
| Air changes per hour (ACH) | Reduced air changes extend particle clearance time and increase contamination risk |
| HEPA filter differential pressure | Increasing dP may indicate filter loading; sudden drop may indicate filter leak |
| Temperature | Out-of-range temperature may affect microbial growth and personnel comfort (sweating increases particle shedding) |
| Relative humidity | High humidity promotes microbial growth; low humidity increases static charge and particle generation |
| Door open events | Door openings between different grades cause transient pressure and particle disturbances |

**Integration approach for Vent:**
- BMS data can be ingested via API (if BMS has one) or via manual entry / CSV import
- Correlate BMS events with EM data on the same timeline
- AI can automatically flag EM excursions that coincide with BMS events ("Particle excursion at 14:32 coincides with pressure differential drop at 14:30 — likely door opening event")

**Vent implementation note:** Full BMS integration is complex and facility-specific. For the initial build, support manual recording of HVAC parameters (pressure differentials, temperature, humidity) as metadata on EM samples. AI correlation can work with manually recorded data initially, with automated BMS integration as a future enhancement.

### 9.6 Equipment Logbook / Equipment Status Module

**Integration type:** Bi-directional

| Direction | Data Flow |
|-----------|-----------|
| Equipment -> EM | Particle counter calibration status and ID linked to EM samples. Air sampler calibration and validation status linked to viable samples |
| EM -> Equipment | EM data can inform equipment maintenance needs (e.g., HEPA filter replacement triggers based on particle count trends) |
| Equipment Maintenance -> EM | Equipment maintenance events (especially HVAC maintenance, equipment cleaning, equipment relocation) should trigger enhanced EM |

### 9.7 Training Matrix

**Integration type:** EM -> Training

| Trigger | Action |
|---------|--------|
| Personnel monitoring excursion | Flag personnel for gowning retraining |
| Repeated gowning qualification failure | Restrict personnel access to classified area until retrained and re-qualified |
| New EM procedure or limit change | Trigger training requirement for all EM personnel |
| EM sampling technique concerns | Flag operator for technique retraining |

### 9.8 Shift Handover

**Integration type:** EM -> Shift Handover

- EM status summary included in shift handover report
- Open excursions and investigations flagged for incoming shift
- Enhanced monitoring requirements communicated to incoming shift
- AI-generated EM status summary for handover briefing

---

## 10. Key Metrics and KPIs

The EM module should track and display these operational metrics:

| Metric | Calculation | Target | Frequency |
|---|---|---|---|
| Schedule compliance | (Samples collected per plan / Samples planned) x 100 | > 98% | Monthly |
| Excursion rate (overall) | (Samples exceeding action limit / Total samples) x 100 | < 1% | Monthly |
| Excursion rate (Grade A) | Grade A action limit excursions per month | 0 | Monthly |
| Alert rate | (Samples exceeding alert limit / Total samples) x 100 | < 5% | Monthly |
| Investigation closure rate | (Investigations closed within 30 days / Total investigations) x 100 | > 90% | Monthly |
| Data review timeliness | (Results reviewed within 48 hours / Total results) x 100 | > 95% | Weekly |
| Organism identification turnaround | Mean time from colony isolation to identification | < 5 working days | Monthly |
| CAPA effectiveness | (Excursions not recurring within 6 months of CAPA closure / Total CAPAs) x 100 | > 90% | Quarterly |
| Trending compliance | Monthly trend reports generated on time | 100% | Monthly |
| Isolate library completeness | (Organisms identified / Total organisms isolated) x 100 | > 95% | Quarterly |

---

## 11. Competitor and Market Landscape

### 11.1 Dedicated EM Software

| System | Vendor | Key Features | Limitations |
|---|---|---|---|
| **MODA-EM** | Lonza (formerly Moda Health) | Purpose-built EM; particle counter integration; trending; FDA/EU compliance; isolate library | Standalone system; limited AI; dated UI; expensive implementation |
| **EM Track** | bioMerieux | Integrated with Vitek organism ID; sample tracking; trending | Primarily designed around bioMerieux sampling equipment; vendor lock-in risk |
| **Novatek LIMS** | Novatek International | EM module within LIMS; configurable limits; trending; regulatory reporting | LIMS-centric; EM is one module among many; generic interface |
| **LabWare LIMS** | LabWare | Configurable EM workflows; large install base in pharma; trending | Enterprise complexity; 6-12 month implementation; expensive |
| **STARLIMS** | Abbott (formerly Siemens) | EM module; particle counter integration; regulatory reporting | Enterprise platform; complex configuration; aging technology |

### 11.2 Building Management / Particle Counter Vendors with EM Software

| System | Vendor | Key Features |
|---|---|---|
| **Facility Monitoring System (FMS)** | Particle Measuring Systems (PMS, Spectris) | Real-time particle counting; annunciation panels; trend reports; GMP compliant |
| **Lighthouse FMS** | Lighthouse Worldwide Solutions | Particle counter fleet management; continuous monitoring; alarming |
| **Climet** | Climet Instruments | Portable and continuous particle counters; basic EM data management |
| **TSI FacilityPro** | TSI Incorporated | Continuous monitoring; multi-parameter (particles, pressure, temperature, humidity) |

### 11.3 Vent Differentiators

| Feature | MODA-EM | bioMerieux EM Track | LIMS (LabWare/STARLIMS) | PMS/Lighthouse FMS | Vent (Planned) |
|---|---|---|---|---|---|
| Particle counter integration | Yes | Partial | Partial | Yes (own hardware) | Via manual/API import |
| Viable sample tracking | Yes | Yes | Yes | No | **Yes** |
| Environmental isolate library | Yes | Yes (Vitek-linked) | Configurable | No | **Yes** |
| AI predictive risk scoring | No | No | No | No | **Yes** |
| AI anomaly detection | No | No | No | Basic alarms | **Yes (context-aware)** |
| AI investigation assistant | No | No | No | No | **Yes** |
| AI trend report generation | No | No | No | No | **Yes** |
| Integrated deviation management | Separate | Separate | Via integration | No | **Built-in** |
| Integrated CAPA | Separate | Separate | Via integration | No | **Built-in** |
| Integrated batch records | Via integration | No | Via integration | No | **Built-in** |
| Real-time cleanroom dashboard | Partial | No | No | Yes (particles only) | **Yes (unified)** |
| Modern web UI | No (dated) | Partial | No (enterprise) | Partial | **Yes** |
| Deployment time | 3-6 months | 2-4 months | 6-12 months | 1-3 months (hardware) | **Days-weeks** |

---

## 12. Recommendations for Module Spec

### 12.1 Phasing

Given the complexity of environmental monitoring, recommend building in phases:

**Phase 1 (Core EM — build with initial module):**
- Location management (CRUD, site map)
- Sample recording (all sample types — viable and non-viable)
- Alert/action limit management (configurable per location per sample type)
- Excursion flagging (automated on sample entry)
- Basic trending (time-series charts per location)
- Deviation integration (auto-create deviation from excursion)
- Dashboard (facility status overview)

**Phase 2 (Advanced EM — second iteration):**
- Environmental isolate library
- Organism tracking and distribution analysis
- Statistical process control charts (control charts, moving averages)
- Monitoring schedule management and compliance tracking
- Personnel monitoring and gowning qualification tracking
- AI: predictive risk scoring
- AI: automated trend report generation

**Phase 3 (Intelligence layer — future enhancement):**
- AI: anomaly detection in continuous particle data
- AI: investigation scope recommendation
- AI: optimal monitoring schedule recommendation
- BMS/HVAC data integration
- Continuous particle counter data stream ingestion
- Seasonal pattern analysis
- Regulatory compliance readiness AI
- Export/reporting for regulatory submissions

### 12.2 Database Schema Recommendations

**Tables to create:**
1. `em_locations` — monitoring location master data
2. `em_samples` — individual sample records (all types)
3. `em_organisms` — environmental isolate library
4. `em_excursions` — excursion investigation records
5. `em_schedules` — monitoring schedule definitions
6. `em_limits` — alert/action limit history (track limit changes over time for audit trail)

**ID prefixes to add to ids.js:**
- `EMS-` (samples), `EMLOC-` (locations), `EORG-` (organisms), `EMEX-` (excursions), `EMSC-` (schedules)

### 12.3 API Endpoints (Recommended)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /em/locations | List all monitoring locations |
| POST | /em/locations | Create a new monitoring location |
| GET | /em/locations/:code | Get location details with trend summary |
| PUT | /em/locations/:code | Update location details |
| GET | /em/samples | List samples (with filters: location, grade, date range, sample type, excursion status) |
| POST | /em/samples | Record a new sample |
| PUT | /em/samples/:id | Update sample (e.g., add colony count after incubation) |
| GET | /em/samples/:id | Get sample details |
| POST | /em/samples/:id/review | QA review and approve sample result |
| GET | /em/excursions | List excursions (with filters) |
| POST | /em/excursions | Create excursion investigation |
| PUT | /em/excursions/:id | Update investigation |
| GET | /em/excursions/:id | Get excursion details |
| GET | /em/organisms | List environmental isolate library |
| POST | /em/organisms | Add organism to library |
| GET | /em/organisms/:id | Get organism details with detection history |
| GET | /em/trends/:locationCode | Get trend data for a location |
| GET | /em/dashboard | Get facility-wide EM status summary |
| POST | /em/ai/risk-score | AI risk scoring for a location or facility-wide |
| POST | /em/ai/trend-report | AI-generated trend report |
| POST | /em/ai/investigate | AI investigation scope recommendation for an excursion |
| GET | /em/schedules | List monitoring schedules |
| POST | /em/schedules | Create/update monitoring schedule |
| GET | /em/compliance | Schedule compliance metrics |

### 12.4 Frontend Layout

Following the existing Vent split-panel pattern:

**Left panel:** Filterable list of samples, locations, or excursions (tab navigation)
**Right panel:** Detail view for selected item

**Additional views:**
- **Dashboard tab:** Facility-wide status (floor plan with traffic lights)
- **Trending tab:** Location-specific trend charts with limit lines
- **Isolate Library tab:** Organism catalogue with detection history
- **Schedules tab:** Monitoring schedule management
- **Reports tab:** AI-generated trend reports

---

## 13. Glossary

| Term | Definition |
|---|---|
| **EM** | Environmental Monitoring — the systematic sampling and testing of the manufacturing environment to detect contamination |
| **CFU** | Colony-Forming Unit — a measure of viable microbial count; each CFU represents one or more organisms that grew into a visible colony on agar media |
| **OPC** | Optical Particle Counter — instrument that detects and counts airborne particles by light scattering |
| **RODAC** | Replicate Organism Detection And Counting — a type of contact plate used for surface monitoring |
| **TSA** | Tryptic Soy Agar — standard growth medium for environmental monitoring (bacteria and yeasts) |
| **SDA** | Sabouraud Dextrose Agar — selective growth medium for fungi |
| **HEPA** | High Efficiency Particulate Air — filter with >= 99.97% efficiency at 0.3 um; used in cleanroom air supply |
| **UDAF / LAF** | Unidirectional Air Flow / Laminar Air Flow — controlled airflow pattern in Grade A zones providing ISO 5 conditions |
| **CCS** | Contamination Control Strategy — comprehensive documented strategy for preventing contamination (required by EU GMP Annex 1 2022) |
| **BMS** | Building Management System — automated system controlling HVAC, temperature, humidity, pressure |
| **MALDI-TOF** | Matrix-Assisted Laser Desorption/Ionization Time-Of-Flight — mass spectrometry method for rapid microbial identification |
| **16S rRNA** | Ribosomal RNA gene sequencing — molecular method for bacterial identification |
| **FMEA** | Failure Mode and Effects Analysis — risk assessment methodology |
| **SPC** | Statistical Process Control — use of statistical methods to monitor and control a process |
| **CUSUM** | Cumulative Sum — control chart method highly sensitive to small shifts in process mean |
| **EWMA** | Exponentially Weighted Moving Average — control chart method that weights recent data more heavily |
| **PQ** | Performance Qualification — final stage of equipment/facility qualification, demonstrating consistent performance |
| **ALCOA+** | Data integrity principles: Attributable, Legible, Contemporaneous, Original, Accurate, Complete, Consistent, Enduring, Available |
| **QP** | Qualified Person — individual responsible for batch release under EU regulations |

---

*Note: Web search and web fetch tools were unavailable during this research. This brief is compiled from domain knowledge of EU GMP Annex 1 (2022 revision), FDA Guidance for Sterile Drug Products (2004), ISO 14644 series, USP <1116>, PDA TR13, and industry best practices current through early 2025. Specific regulatory document version numbers and paragraph references should be verified against the latest published versions before finalising the implementation spec.*
