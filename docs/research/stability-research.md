# Stability Program Module — Research Brief

**Date:** 2026-03-07
**Author:** Research Agent (Claude Code)
**Module:** Stability Program (QA / QC Department)
**Target Phase:** Phase 3 — QC Lab Extension

---

## 1. Regulatory Framework

### 1.1 ICH Q1A(R2) — Stability Testing of New Drug Substances and Products

ICH Q1A(R2) is the foundational guideline for pharmaceutical stability testing, adopted by FDA, EMA, and PMDA. It defines the core requirements that any stability software module must enforce.

**Storage Conditions (Climatic Zones I–II)**

| Study Type | Temperature | Humidity | Minimum Duration |
|------------|-------------|----------|-----------------|
| Long-term | 25 +/- 2 C | 60 +/- 5% RH | 12 months (submission), 36+ months ongoing |
| Intermediate | 30 +/- 2 C | 65 +/- 5% RH | 6 months (triggered if significant change at accelerated) |
| Accelerated | 40 +/- 2 C | 75 +/- 5% RH | 6 months |

For Climatic Zones III and IV (hot/humid regions):
- Long-term: 30 +/- 2 C / 65 +/- 5% RH or 30 +/- 2 C / 75 +/- 5% RH
- Accelerated: 40 +/- 2 C / 75 +/- 5% RH

**Testing Frequency:**
- Long-term: Every 3 months during the first year, every 6 months during the second year, then annually until the proposed shelf life is reached.
- Accelerated: 0, 3, and 6 months minimum.
- Intermediate: 0, 6, 9, and 12 months minimum.

**Key Requirements:**
- Testing must be conducted on at least three primary batches (pilot-scale or production-scale) of the drug substance or product.
- Batches manufactured by the same synthesis/process and packaged in the same container-closure system intended for marketing.
- Two of the three batches must be at least pilot-scale; the third can be smaller if justified.
- Container-closure system used in stability testing must be the same as or simulate the proposed market packaging.
- Stability protocol must define: batch selection rationale, test parameters and methods, acceptance criteria, time points, storage conditions, and container-closure systems.
- If "significant change" occurs during the 6-month accelerated study, intermediate condition testing is triggered.

**Significant Change Criteria (Drug Product):**
- 5% change in assay from initial value (or failure to meet biological/immunological acceptance criteria)
- Any degradation product exceeding its acceptance criterion
- Failure to meet appearance, physical attributes, or functionality test criteria (e.g. colour, phase separation, resuspendability, caking, hardness, delivery rate)
- Failure to meet pH acceptance criterion
- Failure to meet dissolution specification (12 dosage units) for gelatin-based dosage forms
- For biologics: loss of potency, changes in electrophoretic pattern, aggregation, or change in isoform profile

**Vent DB implications:**
- `stability_studies` table needs: `study_type` enum ('long_term', 'intermediate', 'accelerated', 'stress', 'photostability', 'in_use', 'post_approval'), `storage_condition` (composite of temp/humidity), `climatic_zone` enum ('I', 'II', 'III', 'IVa', 'IVb').
- `significant_change_detected` boolean per time point, with `significant_change_detail` JSONB to capture which parameter triggered.
- `intermediate_triggered` boolean on the study to track when accelerated failures force intermediate study initiation.

### 1.2 ICH Q1B — Photostability Testing of New Drug Substances and Products

ICH Q1B establishes the requirements for evaluating the photostability of drug substances and products exposed to light.

**Key Requirements:**
- Photostability testing is an integral part of the overall stability programme.
- Testing uses a systematic approach: forced degradation (stress) testing followed by confirmatory testing.
- Two standardised light source options:
  - **Option 1:** D65 fluorescent lamp (artificial daylight) conforming to ISO 10977 — overall illumination of not less than 1.2 million lux hours and integrated near-UV energy of not less than 200 watt hours/m2.
  - **Option 2:** Cool white fluorescent lamp plus near-UV lamp — same total exposure requirements.
- Sequential exposure: first to UV, then to visible light (or simultaneously if using Option 1).
- Dark controls must be included (wrapped samples exposed to the same conditions minus light).
- Direct testing: samples exposed without packaging first. If significant degradation occurs, test in immediate packaging, then in marketing packaging.
- Results determine whether the product needs light-protective packaging (amber containers, overwraps, cartons).

**Testing Parameters:**
- Appearance (colour change, clarity, precipitation for solutions)
- Assay/potency
- Degradation products/related substances
- Dissolution (solid dosage forms)
- For injectables: particulate matter, colour, clarity, pH

**Vent DB implications:**
- `study_type = 'photostability'` with additional fields: `light_source_option` ('option_1', 'option_2'), `total_lux_hours` (numeric, target >= 1200000), `total_uv_wh_m2` (numeric, target >= 200).
- `photostability_result` enum ('no_degradation', 'degradation_unpackaged', 'degradation_primary_pack', 'degradation_marketing_pack') to drive packaging decisions.
- Dark control sample linkage (`dark_control_sample_id`).

### 1.3 ICH Q1C — Stability Testing for New Dosage Forms

ICH Q1C addresses stability testing for new dosage forms of already-approved products (line extensions).

**Key Requirements:**
- Reduced stability data may be acceptable for a new dosage form of an already-approved drug substance/product, depending on the nature of the change.
- The new dosage form must be tested under the same conditions as defined in Q1A(R2).
- If the new dosage form is the same type as the original (e.g. immediate-release tablet to immediate-release tablet, different strength), a reduced design may be justified:
  - One batch instead of three for accelerated and intermediate.
  - Long-term data from one batch with a commitment to put additional batches on stability.
- If the new dosage form is a different type (e.g. tablet to capsule, injectable to lyophilised), full Q1A(R2) protocol required.
- Data from the original dosage form can be used as supportive evidence.

**Vent DB implications:**
- `study_reason` enum should include 'new_dosage_form', 'line_extension'.
- `reference_study_id` FK to link to the parent product's stability study.
- `reduced_design_justification` text field for regulatory documentation.

### 1.4 ICH Q1D — Bracketing and Matrixing Designs for Stability Testing

ICH Q1D provides guidance on reduced testing designs to lower the number of samples tested at each time point while maintaining statistical validity.

**Bracketing:**
- Testing only the extreme conditions of design factors (e.g., largest and smallest container sizes, highest and lowest strengths).
- Assumes the stability of intermediate conditions is represented by the extremes.
- Applicable when the drug product is identical or very closely related across the factors.
- Factors that can be bracketed: container size (same material), fill volume, strength (same formulation proportional).
- Factors that CANNOT be bracketed: different container materials, different formulation compositions, different manufacturing processes.

**Matrixing:**
- A statistical design where a subset of the total number of possible samples for all factor combinations is tested at each time point.
- All samples are tested at the initial and final time points.
- Intermediate time points use a fraction of samples, with all factors represented over the full study.
- Requires that the factors being matrixed do not affect stability.
- More complex to design and track than bracketing.
- One-half and one-third reduction designs are typical.

**Design Rules:**
- Each factor combination must be tested at least at 0 and end time points.
- The design must be pre-defined and documented in the stability protocol.
- Deviation from the matrixing design (pulling extra samples or skipping planned pulls) must be documented and justified.
- Statistical analysis should account for the reduced design.

**Vent DB implications:**
- `design_type` enum: 'full', 'bracketing', 'matrixing', 'bracketing_matrixing'.
- `matrixing_design` JSONB field to store the full matrixing/bracketing matrix (which factor combinations are tested at which time points).
- `matrixing_fraction` enum: 'full', 'one_half', 'one_third', 'two_thirds'.
- Each `stability_time_point` record needs `planned_by_matrix` boolean and `matrix_tested` boolean to track compliance with the reduced design.

### 1.5 ICH Q1E — Evaluation of Stability Data

ICH Q1E provides the statistical framework for evaluating stability data to determine shelf life and storage conditions.

**Key Requirements:**
- Data must be evaluated using appropriate statistical methods to determine whether a shelf-life claim can be supported.
- Regression analysis (typically linear) is the primary method. Shelf life is the time at which the 95% one-sided confidence limit for the mean curve intersects the acceptance criterion.
- **Poolability Assessment:** Before pooling data from multiple batches, a preliminary test (e.g., analysis of covariance — ANCOVA) must determine whether batches can be combined:
  - If slopes and intercepts are not significantly different (p > 0.25), data may be pooled.
  - If pooling is rejected, the worst-case batch determines shelf life.
  - The p-value threshold of 0.25 (not 0.05) is specified to provide a more conservative test.
- **Extrapolation Rules:**
  - For long-term data showing little or no change and variability, shelf life can be extrapolated beyond the observed data range — up to twice the period covered by long-term data, but not beyond the period covered by accelerated data.
  - For biologics, extrapolation is generally limited due to complex degradation profiles (see Q5C).
  - Extrapolation must be supported by accelerated and/or intermediate data showing no significant change.
- **Significant Change Assessment (Accelerated):**
  - The criteria for "significant change" are defined in Q1A(R2) (see above).
  - If significant change occurs during accelerated, intermediate data are required.
  - If significant change occurs during intermediate, "no shelf life beyond [observed long-term period]" without supporting data.

**Statistical Methods:**
- Linear regression with 95% confidence intervals is the standard.
- If degradation is non-linear, polynomial or other mathematical models may be used with justification.
- For zero-order, first-order, and second-order kinetic models, the appropriate transformation (log, reciprocal) must be applied.
- Analysis typically performed on the quantitative attribute most likely to approach the acceptance criterion (usually potency/assay or a specific degradation product).

**Vent DB implications:**
- `shelf_life_months` computed field derived from statistical analysis.
- `extrapolation_applied` boolean, `extrapolation_justification` text.
- `regression_model` enum: 'linear', 'quadratic', 'log_linear', 'reciprocal'.
- `regression_slope`, `regression_intercept`, `regression_r_squared` numeric fields.
- `poolability_test_result` enum: 'pooled', 'not_pooled', 'pending'.
- `poolability_p_value` numeric field.
- `confidence_interval_lower`, `confidence_interval_upper` at each time point.

### 1.6 ICH Q5C — Quality of Biotechnological Products: Stability Testing of Biotechnological/Biological Products

ICH Q5C is the biologics-specific stability guideline and **the single most important reference** for Vent's target customers. It supplements Q1A with requirements specific to the complexity of biological molecules.

**Scope:**
- Applies to well-characterised proteins and polypeptides (monoclonal antibodies, recombinant proteins, cytokines, growth factors, enzymes, blood/plasma derivatives).
- Does NOT apply to antibiotics, allergenic extracts, heparins, vitamins, whole blood, or cellular blood components.

**Key Differences from Q1A(R2) for Biologics:**

1. **Testing Parameters — Must include product-specific tests:**
   - **Potency** (biological/functional assay — the single most important stability-indicating parameter for biologics)
   - **Purity and molecular characterisation:**
     - Size exclusion chromatography (SEC/HPLC-SEC) for aggregation/fragmentation
     - Ion exchange chromatography (IEX) for charge variants
     - SDS-PAGE (reducing and non-reducing) for molecular weight and fragmentation
     - Isoelectric focusing (IEF) or capillary isoelectric focusing (cIEF) for charge heterogeneity
   - **Sterility** or container-closure integrity testing
   - **Appearance** (colour, clarity, visible particulates)
   - **pH**
   - **Moisture content** (lyophilised products)
   - **Reconstitution time** (lyophilised products)
   - **Subvisible particulate matter** (USP <787> / <788>)
   - **Extractable volume** (parenteral products)
   - **Osmolality**
   - **Endotoxin** (bacterial endotoxins test)

2. **Temperature Conditions — Biologics-specific:**
   - Most biologics are stored refrigerated: **5 +/- 3 C** (i.e. 2-8 C) is the primary long-term condition.
   - Accelerated: **25 +/- 2 C / 60 +/- 5% RH** (NOT 40 C — most biologics are destroyed at 40 C).
   - Stress studies at **40 C** may be included for informational purposes only (to understand degradation pathways), but are not required for shelf-life determination.
   - **Frozen products** (e.g., drug substance intermediates, cell therapy products): -20 +/- 5 C or below -60 C (ultra-low). Stress testing at 5 C or 25 C.
   - For products stored at room temperature (rare for biologics): standard Q1A conditions apply.

3. **Degradation Pathways Specific to Biologics:**
   - **Aggregation** (the most common and critical degradation pathway for mAbs and proteins)
   - **Fragmentation** (peptide bond hydrolysis)
   - **Deamidation** (asparagine to aspartate conversion — charge variant generation)
   - **Oxidation** (methionine, tryptophan oxidation)
   - **Disulfide bond scrambling**
   - **Glycosylation changes** (for glycoproteins)
   - **Loss of higher-order structure** (conformational changes)
   - **Adsorption** to container surfaces

4. **Container-Closure Considerations:**
   - Protein-to-container interactions (adsorption to glass, silicone oil from syringes)
   - Extractables and leachables from primary packaging (particularly rubber stoppers)
   - Light protection requirements (amber vials vs. clear with overwrap)
   - Headspace gas (nitrogen overlay for oxidation-sensitive products)

5. **Shelf-Life Estimation:**
   - Extrapolation beyond observed data is **more restricted** for biologics due to complex, non-linear degradation.
   - Potency assays typically have higher variability than chemical assays — wider confidence intervals must be accounted for.
   - Real-time, real-condition data is strongly preferred over extrapolation.

**Vent DB implications:**
- `product_type` enum must include 'small_molecule', 'monoclonal_antibody', 'recombinant_protein', 'peptide', 'vaccine', 'cell_therapy', 'gene_therapy', 'blood_product', 'biosimilar'.
- Storage condition presets for biologics: '2_8C', '25C_60RH', '-20C', '-60C', '-80C', '-196C'.
- `degradation_pathways` JSONB array to track which pathways are monitored per study.
- Biologics-specific test parameter enums: 'potency', 'sec_hplc', 'iex', 'sds_page_reduced', 'sds_page_non_reduced', 'cief', 'subvisible_particles', 'osmolality', 'reconstitution_time', 'moisture_content', 'extractable_volume', 'endotoxin', 'sterility', 'appearance', 'ph', 'colour_clarity'.

### 1.7 FDA 21 CFR 211.166 — Stability Testing

Section 211.166 of the US Code of Federal Regulations is the predicate rule that makes stability testing legally required for all FDA-regulated drug products.

**Requirements:**
- **(a)** There shall be a written testing programme designed to assess the stability characteristics of drug products. The results of such stability testing shall be used in determining appropriate storage conditions and expiration dates. The programme shall include:
  - **(1)** Sample size and test intervals based on statistical criteria for each attribute examined to assure valid estimates of stability.
  - **(2)** Storage conditions for samples retained for testing.
  - **(3)** Reliable, meaningful, and specific test methods.
  - **(4)** Testing of the drug product in the same container-closure system as that in which the drug product is marketed.
  - **(5)** Testing of drug products for reconstitution at the time of dispensing (as directed in the labelling) as well as after they are reconstituted.
- **(b)** An adequate number of batches of each drug product shall be tested to determine an appropriate expiration date, and a record of such data shall be maintained. Accelerated studies, combined with basic stability information on the components, drug products, and container-closure system, may be used to support tentative expiration dates provided full shelf-life studies are not available and are being conducted. Where data from accelerated studies are used to project a tentative expiration dating period that is beyond a date supported by actual shelf-life studies, there must be stability studies conducted, including drug product testing at appropriate intervals, until the tentative expiration date is verified or the appropriate expiration date determined.
- **(c)** For homeopathic drug products, the requirements are modified.
- **(d)** Allergenic extracts may follow reduced testing.

**FDA Inspection Focus Areas (common 483 observations):**
- Failure to include sufficient batches on stability.
- Failure to test at required time points (missed or late pulls).
- Failure to use the same container-closure system.
- Failure to investigate OOS stability results.
- Failure to have written stability protocols.
- Use of accelerated data alone to set expiration dating (without ongoing real-time study).
- Inadequate trending of stability data.
- Stability chamber excursions not documented or investigated.

**Vent DB implications:**
- `protocol_status` must track protocol lifecycle: 'draft', 'reviewed', 'approved', 'active', 'completed', 'cancelled'.
- `expiration_date` on product records must be linked to stability data justification.
- Missed pull tracking: `pull_status` enum ('scheduled', 'pulled', 'tested', 'missed', 'late') with `pull_deviation_id` FK.
- Written protocol enforcement: no samples can be pulled without an approved protocol.

### 1.8 FDA 21 CFR 211.170 — Reserve Samples

- Reserve samples from each batch must be retained under conditions consistent with product labeling.
- Retained for at least 1 year after the expiration date of the batch, or for 3 years after distribution (whichever is longer for OTC products).
- The number of units must be sufficient for at least two complete analyses.
- **Vent implication:** `reserve_sample_location`, `reserve_sample_quantity`, `reserve_sample_disposal_date` fields on stability sample records.

### 1.9 EU GMP Annex 15 — Qualification and Validation (Chamber Qualification Context)

Annex 15 governs the qualification of equipment, including stability chambers. While primarily a validation guideline, its requirements for IQ/OQ/PQ directly impact chamber management.

**Chamber Qualification Requirements:**
- **Design Qualification (DQ):** Documented verification that the proposed design of the chamber is suitable for the intended purpose.
- **Installation Qualification (IQ):** Verification that the chamber is installed according to manufacturer specifications and design criteria. Includes documentation of utilities, installation conditions, and calibration of sensors.
- **Operational Qualification (OQ):** Testing that the chamber operates within specified limits under all anticipated operating conditions. Must include:
  - Temperature mapping (minimum 15 points for walk-in chambers; 9 points for reach-in).
  - Humidity mapping at the same points.
  - Door-open recovery testing.
  - Power failure and recovery testing.
  - Alarm function testing at each set point.
- **Performance Qualification (PQ):** Demonstration that the chamber consistently performs under actual use conditions over an extended period (typically loaded with representative product containers).
- **Requalification:** Periodic (typically annual) requalification, and requalification after any maintenance, repair, relocation, or modification.

**Temperature Mapping Requirements:**
- Mapping sensors must be calibrated to traceable national standards (NIST/UKAS).
- Minimum duration: 24 hours for OQ; 7 days or more for PQ.
- Data must demonstrate uniformity within +/- 2 C (or tighter if required by the study protocol).
- Hot spots and cold spots must be identified and documented.
- Loading configurations must be tested (empty, partial load, full load).

**Vent DB implications:**
- `stability_chambers` table with `qualification_status` enum: 'pending_dq', 'dq_complete', 'pending_iq', 'iq_complete', 'pending_oq', 'oq_complete', 'pending_pq', 'pq_complete', 'qualified', 'requalification_due', 'out_of_service'.
- `temperature_mapping_records` table: `mapping_id`, `chamber_id`, `sensor_positions` JSONB, `mapping_start`, `mapping_end`, `max_temp`, `min_temp`, `mean_temp`, `uniformity_pass` boolean, `performed_by`, `approved_by`.
- `next_requalification_date` with alerting.

### 1.10 EU GMP Annex 2 — Biological Medicinal Products

EU GMP Annex 2 has specific provisions for stability of biological products:
- Stability programmes should describe the molecule-specific degradation-indicating analytical methods.
- Storage of reference standards and retention samples under validated conditions.
- For biosimilars, comparability of stability profiles with the reference product may be required.

### 1.11 WHO Technical Report Series 953 — Stability Testing (International Markets)

For products intended for WHO prequalification or emerging-market registration:
- Climatic Zone IVb (30 C / 75% RH) conditions are required for long-term storage.
- Additional stress testing at higher humidities may be needed.
- **Vent implication:** `climatic_zone` enum must include 'IVb' for WHO-prequalified products.

---

## 2. Study Types and Protocols

### 2.1 Study Type Definitions

| Study Type | Purpose | Conditions | Duration | Required By |
|-----------|---------|------------|----------|-------------|
| Long-term (primary) | Establish shelf life | Per product label (typically 2-8 C for biologics, 25 C/60% RH for small molecules) | Through proposed shelf life | ICH Q1A, Q5C |
| Intermediate | Triggered by accelerated failure | 30 C / 65% RH | 12 months minimum | ICH Q1A |
| Accelerated | Detect significant change, support extrapolation | 40 C / 75% RH (small molecule) or 25 C / 60% RH (biologics) | 6 months | ICH Q1A, Q5C |
| Stress / Forced degradation | Identify degradation pathways, validate methods | Heat, acid, base, oxidation, light, humidity extremes | Variable (typically 1-4 weeks) | ICH Q1A (recommended) |
| Photostability | Evaluate light sensitivity | Option 1 or 2 (>= 1.2M lux hrs, >= 200 Wh/m2 UV) | Until exposure target met | ICH Q1B |
| In-use | Evaluate stability after first opening | Per product use conditions | Through intended use period | EU GMP, product-specific |
| Post-approval commitment | Continue monitoring after registration | Same as registration study | Ongoing | FDA, EMA conditions of approval |
| Ongoing (annual) | Monitor consistency of commercial batches | Same as registration | Through shelf life | ICH Q1A 2.1.7, FDA 211.166 |

### 2.2 Study Type Enum Values

```
study_type: 'long_term' | 'intermediate' | 'accelerated' | 'stress' | 'photostability' | 'in_use' | 'post_approval' | 'ongoing' | 'forced_degradation' | 'freeze_thaw' | 'shipping' | 'hold_time'
```

Additional study subtypes relevant to biologics manufacturing:
- **Freeze-thaw cycling:** Evaluate impact of freeze-thaw cycles on drug substance held in intermediate storage.
- **Shipping/transport:** Simulate shipping conditions (vibration, temperature excursion profiles).
- **Hold-time studies:** Evaluate maximum acceptable hold times for in-process intermediates (e.g., unfilled bulk drug substance, partially processed intermediates).

### 2.3 Protocol Lifecycle and Workflow States

```
protocol_status: 'draft' -> 'in_review' -> 'approved' -> 'active' -> 'amended' -> 'completed' -> 'cancelled'
```

**Workflow:**
1. **Draft:** Author creates protocol with study parameters, time points, test methods, acceptance criteria. Can be edited freely.
2. **In Review:** Protocol submitted for QA review. Author can no longer edit. Reviewer can request changes (returns to draft) or approve.
3. **Approved:** QA-approved and locked. E-signature captured. No further edits without formal amendment (change control).
4. **Active:** First sample placed on stability. Pulls can now be scheduled and executed.
5. **Amended:** A formal amendment has been made to the protocol (via change control). Previous version archived. Amendment history tracked.
6. **Completed:** All time points have been tested, data evaluated, and stability report issued. Study is closed.
7. **Cancelled:** Study cancelled before completion. Requires documented justification and QA approval.

**Amendment Process:**
- Any change to an approved protocol requires a formal amendment with QA approval.
- Types of amendments: addition/removal of time points, change in test methods, addition of batches, change in acceptance criteria, extension of study duration.
- Each amendment creates a new protocol version. All versions must be retained.
- `protocol_version` integer, `amendment_reason` text, `amendment_approved_by`, `amendment_date`.

### 2.4 Study Reason / Justification

```
study_reason: 'registration' | 'post_approval_commitment' | 'annual_batch' | 'process_change' | 'formulation_change' | 'packaging_change' | 'site_transfer' | 'new_strength' | 'new_dosage_form' | 'scale_up' | 'reprocessed_batch' | 'supplier_change' | 'comparability' | 'biosimilar_comparability' | 'clinical' | 'investigational'
```

---

## 3. Testing Schedule and Time Points

### 3.1 ICH-Defined Standard Time Points

**Long-term studies:**
- Months: 0, 3, 6, 9, 12, 18, 24, 36, 48, 60
- Frequency: every 3 months through year 1, every 6 months through year 2, annually thereafter.
- For biologics with 24-month shelf life at 2-8 C: 0, 1, 2, 3, 6, 9, 12, 18, 24.
- Some protocols add early time points (1, 2 months) for products known to have early-onset degradation.

**Accelerated studies (small molecule):**
- Months: 0, 1, 2, 3, 6

**Accelerated studies (biologics — 25 C):**
- Months: 0, 1, 2, 3, 6

**Intermediate studies:**
- Months: 0, 6, 9, 12

**Stress studies:**
- Time points are study-specific: hours (0, 1, 2, 4, 8, 24, 48, 72) or days (0, 1, 3, 5, 7, 14, 28).

### 3.2 Pull Schedule Management

Each time point generates a "pull" — the scheduled withdrawal of samples from the stability chamber for testing.

**Pull record fields:**
```
stability_pull_id        PK     PULL-XXXX
study_id                 FK     -> stability_studies
time_point_months        numeric  (0, 3, 6, 9, 12, etc.)
time_point_label         text     "3M", "6M", "12M", etc.
planned_pull_date        date     calculated from study start + time_point
actual_pull_date         date     when samples were actually removed
pull_window_start        date     planned_pull_date - 7 days (typically)
pull_window_end          date     planned_pull_date + 7 days
pull_status              enum     'scheduled' | 'due' | 'overdue' | 'pulled' | 'in_testing' | 'completed' | 'missed' | 'skipped'
pulled_by                FK       -> users
sample_ids               JSONB    array of QC sample IDs generated for this pull
test_parameters          JSONB    array of tests to perform at this time point
matrix_included          boolean  whether this time point is included in the matrixing design
deviation_id             FK       -> deviations (if pull was missed or late)
notes                    text
created_at               timestamp
updated_at               timestamp
```

**Pull Window Rules (ICH):**
- The acceptable window for a pull is defined in the stability protocol.
- Industry standard: +/- 7 days for monthly time points; +/- 14 days for 3-month intervals; +/- 30 days for 6-month and annual intervals.
- A pull outside the window is a protocol deviation and must be documented.

**Vent implementation:** Auto-schedule pulls based on study start date and protocol-defined time points. Dashboard widget showing upcoming pulls (next 30/60/90 days). Overdue pulls generate alerts and auto-create deviation records.

### 3.3 Matrixing Schedule Example

For a full factorial design with 3 batches, 3 strengths, 2 pack sizes — 18 factor combinations at each time point. A one-half matrixing design tests 9 of 18 at each intermediate time point (but all 18 at 0 and final).

```
matrixing_schedule JSONB example:
{
  "0M":   ["all"],
  "3M":   ["A1-50ml", "A2-100ml", "B1-50ml", "B3-100ml", "C2-50ml", "C1-100ml", ...],
  "6M":   ["A2-50ml", "A1-100ml", "B2-50ml", "B1-100ml", "C1-50ml", "C3-100ml", ...],
  "12M":  ["all"],
  "24M":  ["all"],
  "36M":  ["all"]
}
```

---

## 4. Data Fields and Schema Design

### 4.1 Core Tables

#### `stability_protocols` — Study Protocol Definition

```
protocol_id              PK     STBP-XXXX
protocol_number          text   unique, human-readable (e.g., "SP-2026-001")
protocol_version         int    default 1, increments on amendment
title                    text   "Stability Protocol for Product X, 50mg/mL Vial"
product_name             text
product_code             text
product_type             enum   'monoclonal_antibody' | 'recombinant_protein' | 'peptide' | 'vaccine' | 'cell_therapy' | 'gene_therapy' | 'small_molecule' | 'biosimilar'
dosage_form              enum   'liquid_injection' | 'lyophilised_injection' | 'pre_filled_syringe' | 'tablet' | 'capsule' | 'oral_solution' | 'topical' | 'ophthalmic' | 'nasal' | 'inhalation'
strength                 text   "50 mg/mL"
container_closure        text   "Type I glass vial, 20mm bromobutyl stopper, aluminium flip-off seal"
study_type               enum   (see 2.2 above)
study_reason             enum   (see 2.4 above)
design_type              enum   'full' | 'bracketing' | 'matrixing' | 'bracketing_matrixing'
matrixing_design         JSONB  (see 3.3 above)
storage_conditions       JSONB  array of { condition_label, temp_c, temp_tolerance, humidity_pct, humidity_tolerance }
climatic_zone            enum   'I' | 'II' | 'III' | 'IVa' | 'IVb'
time_points              JSONB  array of { months: 0, label: "0M", tests: [...] }
test_parameters          JSONB  array of { test_name, method_id, specification_min, specification_max, unit, acceptance_criteria }
number_of_batches        int
orientation              enum   'upright' | 'inverted' | 'on_side' | 'upright_and_inverted'
light_protection         boolean
photostability_required  boolean
significant_change_criteria JSONB  per Q1A/Q5C criteria
status                   enum   'draft' | 'in_review' | 'approved' | 'active' | 'amended' | 'completed' | 'cancelled'
authored_by              FK     -> users
reviewed_by              FK     -> users
approved_by              FK     -> users
approved_at              timestamp
effective_date           date
amendment_history        JSONB  array of { version, date, changes, approved_by }
created_at               timestamp
updated_at               timestamp
```

#### `stability_studies` — Active Study Instances

```
study_id                 PK     STB-XXXX
protocol_id              FK     -> stability_protocols
batch_number             text
batch_id                 FK     -> batches (if batch record module exists)
manufacturing_date       date
expiration_date          date   (current labelled)
proposed_shelf_life_months int
study_start_date         date
study_end_date           date   (planned)
actual_end_date          date
chamber_id               FK     -> stability_chambers
shelf_position           text   "Shelf 3, Position B2"
storage_condition_label  text   "25C/60%RH" or "2-8C"
storage_temp_target      numeric
storage_humidity_target  numeric
sample_quantity          int    number of units placed on stability
sample_quantity_remaining int
orientation              enum   'upright' | 'inverted' | 'on_side'
container_closure_desc   text
intermediate_triggered   boolean default false
significant_change_detected boolean default false
status                   enum   'active' | 'on_hold' | 'completed' | 'terminated' | 'cancelled'
termination_reason       text
current_time_point       text   "12M"
next_pull_date           date   (computed from schedule)
shelf_life_conclusion    text   e.g., "24 months at 2-8C supported by data through 36M"
report_id                FK     -> stability_reports
created_by               FK     -> users
created_at               timestamp
updated_at               timestamp
```

#### `stability_pulls` — Sample Withdrawal Events

```
pull_id                  PK     PULL-XXXX
study_id                 FK     -> stability_studies
time_point_months        numeric
time_point_label         text   "6M"
planned_pull_date        date
actual_pull_date         date
pull_window_start        date
pull_window_end          date
pull_status              enum   'scheduled' | 'due' | 'overdue' | 'pulled' | 'in_testing' | 'results_pending_review' | 'completed' | 'missed' | 'skipped'
pulled_by                FK     -> users
verified_by              FK     -> users (second person verification)
samples_pulled           int
sample_ids               JSONB  array of QC sample IDs
matrix_included          boolean
tests_required           JSONB  array of test parameter names for this pull
deviation_id             FK     -> deviations
notes                    text
created_at               timestamp
updated_at               timestamp
```

#### `stability_results` — Test Results per Pull

```
result_id                PK     STBR-XXXX
pull_id                  FK     -> stability_pulls
study_id                 FK     -> stability_studies
qc_sample_id             FK     -> qc_samples (link to QC Lab module)
qc_result_id             FK     -> qc_results (link to QC Lab result)
test_parameter           text   "Potency (% of label claim)"
test_method              text   "USP <1034> Bioassay"
method_id                FK     -> qc_methods
result_value             numeric
result_text              text   (for qualitative results like appearance)
unit                     text   "%", "mg/mL", "EU/mL", etc.
specification_min        numeric
specification_max        numeric
acceptance_criteria      text   "90.0 - 110.0% of label claim"
result_status            enum   'conforming' | 'non_conforming' | 'oos' | 'oot' | 'pending'
significant_change       boolean
change_from_initial      numeric  (% change from time-0 result)
initial_value            numeric  (time-0 result for comparison)
trend_flag               enum   'none' | 'alert' | 'action' | 'oos'
trend_detail             text   "3 consecutive points trending downward"
tested_by                FK     -> users
tested_date              date
reviewed_by              FK     -> users
reviewed_date            date
approved_by              FK     -> users
approved_date            date
investigation_id         FK     -> oos_investigations
notes                    text
raw_data                 JSONB  (chromatograms, spectra references)
created_at               timestamp
updated_at               timestamp
```

#### `stability_chambers` — Chamber Equipment Registry

```
chamber_id               PK     SCHM-XXXX
chamber_name             text   "Chamber 01 — Walk-in, 25C/60%RH"
chamber_type             enum   'walk_in' | 'reach_in' | 'photostability' | 'refrigerator' | 'freezer' | 'ultra_low_freezer' | 'cryogenic'
manufacturer             text   "Weiss Technik"
model                    text   "WK3 1000/40-100"
serial_number            text
location                 text   "Building A, Room 210"
set_temp_c               numeric
temp_tolerance_c         numeric default 2.0
set_humidity_pct         numeric (nullable for freezers)
humidity_tolerance_pct   numeric default 5.0
temp_range_min           numeric
temp_range_max           numeric
humidity_range_min       numeric
humidity_range_max       numeric
capacity_description     text   "400 vials across 5 shelves"
total_positions          int
occupied_positions       int
qualification_status     enum   'pending_dq' | 'dq_complete' | 'pending_iq' | 'iq_complete' | 'pending_oq' | 'oq_complete' | 'pending_pq' | 'pq_complete' | 'qualified' | 'requalification_due' | 'out_of_service' | 'decommissioned'
last_qualification_date  date
next_qualification_date  date
qualification_document   text   reference to qualification report
calibration_due_date     date
monitoring_system        text   "Vaisala viewLinc" or "Ellab TrackSense"
monitoring_probe_ids     JSONB  array of sensor/probe identifiers
alarm_high_temp          numeric
alarm_low_temp           numeric
alarm_high_humidity      numeric
alarm_low_humidity       numeric
alarm_contact_list       JSONB  array of user IDs for alarm notification
power_backup             boolean
backup_type              text   "UPS + Generator"
equipment_id             FK     -> equipment (link to Equipment Logbook module)
status                   enum   'operational' | 'maintenance' | 'out_of_service' | 'decommissioned'
notes                    text
created_at               timestamp
updated_at               timestamp
```

#### `chamber_excursions` — Temperature/Humidity Excursion Events

```
excursion_id             PK     EXCR-XXXX
chamber_id               FK     -> stability_chambers
excursion_type           enum   'temperature_high' | 'temperature_low' | 'humidity_high' | 'humidity_low' | 'power_failure' | 'door_open' | 'equipment_failure'
detected_at              timestamp
resolved_at              timestamp
duration_minutes         numeric (computed)
max_deviation_value      numeric  (highest temp reached, etc.)
min_deviation_value      numeric
set_point                numeric
alarm_triggered          boolean
alarm_acknowledged_by    FK     -> users
alarm_acknowledged_at    timestamp
root_cause               text
impact_assessment        text   "No impact — duration < 15 min, products remained within spec"
impact_assessment_by     FK     -> users
affected_studies         JSONB  array of study_ids with samples in this chamber
samples_affected         int
disposition              enum   'no_impact' | 'investigation_required' | 'samples_moved' | 'samples_destroyed' | 'study_invalidated'
deviation_id             FK     -> deviations
capa_id                  FK     -> capas
corrective_action        text
preventive_action        text
status                   enum   'open' | 'under_investigation' | 'closed_no_impact' | 'closed_with_impact'
created_at               timestamp
updated_at               timestamp
```

#### `stability_reports` — Final Study Reports

```
report_id                PK     SRPT-XXXX
study_id                 FK     -> stability_studies
protocol_id              FK     -> stability_protocols
report_number            text   "SR-2026-001"
report_type              enum   'interim' | 'annual_update' | 'final' | 'summary' | 'trend_alert'
shelf_life_conclusion_months int
shelf_life_justification text
storage_condition_conclusion text  "Store at 2-8 C. Do not freeze."
regression_model         enum   'linear' | 'quadratic' | 'log_linear' | 'arrhenius'
regression_data          JSONB  { slope, intercept, r_squared, p_value, confidence_intervals }
poolability_result       enum   'pooled' | 'not_pooled' | 'not_applicable'
poolability_p_value      numeric
extrapolation_applied    boolean
extrapolation_months     int    (how many months beyond observed data)
extrapolation_justification text
significant_changes      JSONB  array of { time_point, parameter, detail }
oos_events               JSONB  array of { time_point, parameter, result, investigation_id }
conclusions              text
recommendations          text
authored_by              FK     -> users
reviewed_by              FK     -> users
approved_by              FK     -> users
approved_at              timestamp
status                   enum   'draft' | 'in_review' | 'approved' | 'superseded'
created_at               timestamp
updated_at               timestamp
```

### 4.2 ID Prefixes for ids.js

```
STBP-   stability_protocols (stability protocol ID)
STB-    stability_studies (stability study ID)
PULL-   stability_pulls (pull event ID)
STBR-   stability_results (stability result ID)
SCHM-   stability_chambers (chamber ID)
EXCR-   chamber_excursions (excursion ID)
SRPT-   stability_reports (report ID)
STBA-   stability_alerts (alert ID)
STMP-   chamber_temp_mappings (temperature mapping ID)
```

### 4.3 Enumeration Value Reference

**Test Parameters for Biologics (stability_test_params):**
```
'potency'                   - Biological activity / functional assay
'assay_protein_content'     - Total protein concentration (A280, BCA, etc.)
'purity_sec'                - Size exclusion chromatography (% monomer, % HMW, % LMW)
'purity_iex'                - Ion exchange chromatography (charge variants)
'purity_ce_sds_r'           - CE-SDS reducing (% main peak, fragments)
'purity_ce_sds_nr'          - CE-SDS non-reducing (% intact IgG)
'purity_cief'               - Capillary isoelectric focusing (isoform pattern)
'purity_rp_hplc'            - Reversed-phase HPLC
'appearance'                - Visual inspection (colour, clarity, visible particles)
'colour'                    - Instrumental colour measurement (BY scale)
'clarity_opalescence'       - Turbidity (NTU / Ph.Eur. reference)
'ph'                        - pH measurement
'osmolality'                - Osmolality (mOsm/kg)
'subvisible_particles'      - Light obscuration (USP <787>/<788>): >= 10um, >= 25um
'visible_particles'         - Manual or automated visual inspection
'extractable_volume'        - Deliverable volume per container
'reconstitution_time'       - Time to dissolve lyophilised cake
'moisture_content'          - Karl Fischer or LOD (lyophilised products)
'cake_appearance'           - Visual appearance of lyophilised cake
'sterility'                 - Sterility test (USP <71>)
'endotoxin'                 - Bacterial endotoxins (USP <85>) - EU/mL
'container_closure_integrity' - Dye ingress, vacuum decay, or HVLD
'particulate_matter'        - USP <788> subvisible particle count
'bioburden'                 - Microbial limits (for non-sterile in-process)
'specific_activity'         - Activity per mg protein
'glycan_profile'            - N-glycan analysis (for glycoproteins)
'disulfide_mapping'         - Peptide mapping for disulfide bond integrity
'host_cell_protein'         - Residual HCP by ELISA
'residual_dna'              - Residual host cell DNA by qPCR
'oxidation'                 - Met oxidation by peptide mapping or HIC
'deamidation'               - Asn deamidation by peptide mapping or IEX
```

**Test Parameters for Small Molecules:**
```
'assay'                     - Assay / content (% label claim)
'related_substances'        - Impurity profile (HPLC)
'specified_impurity'        - Named/specified impurity level
'unspecified_impurity'      - Unspecified individual impurity
'total_impurities'          - Total related substances
'dissolution'               - Dissolution rate/profile
'disintegration'            - Disintegration time
'hardness'                  - Tablet hardness
'friability'                - Tablet friability
'moisture_content'          - Water content (KF)
'appearance'                - Visual description
'colour'                    - Colour of solution/tablet
'odour'                     - Odour assessment
'ph'                        - pH of solution
'viscosity'                 - Viscosity measurement
'preservative_content'      - Antimicrobial preservative assay
'antioxidant_content'       - Antioxidant assay
'microbial_limits'          - TAMC/TYMC
'sterility'                 - Sterility (parenteral)
'endotoxin'                 - BET (parenteral)
'particulate_matter'        - Subvisible particles (parenteral)
```

---

## 5. Stability Chambers and Equipment

### 5.1 Chamber Types and Typical Conditions

| Chamber Type | Temp Range | Humidity Range | Typical Use |
|-------------|------------|----------------|-------------|
| Walk-in stability (25C/60%RH) | 15-40 C | 20-80% RH | Long-term small molecule |
| Walk-in stability (30C/65%RH) | 15-40 C | 20-80% RH | Intermediate / Zone III-IV |
| Walk-in stability (40C/75%RH) | 15-60 C | 20-90% RH | Accelerated |
| Reach-in chamber | 15-60 C | 20-90% RH | Smaller studies |
| Photostability chamber | 20-25 C | Controlled | ICH Q1B exposure |
| Pharmaceutical refrigerator | 2-8 C | N/A | Biologics long-term |
| Freezer (-20C) | -25 to -15 C | N/A | Frozen DS/DP |
| Ultra-low freezer (-80C) | -86 to -60 C | N/A | Frozen biologics |
| Cryogenic storage | -196 to -150 C | N/A | Cell therapy, gene therapy |

### 5.2 Temperature Mapping Protocol

**Minimum sensor placement (reach-in chamber, per WHO/PDA guidance):**
- 9 sensors: 3 planes (top, middle, bottom) x 3 positions per plane (front-left, centre, back-right).
- Plus 1 reference sensor (calibrated, traceable).

**Minimum sensor placement (walk-in chamber):**
- 15-20 sensors: 3-4 planes x 5 positions per plane.
- Door proximity sensors (to capture door-open effects).
- Plus 1-2 reference sensors.

**Mapping conditions to test:**
- Empty chamber
- Partially loaded (typical load)
- Fully loaded (worst case)
- Door-open recovery (measure time to return to set point after 30-second door opening)
- Power failure recovery (measure time to return to set point after power restoration)

**Acceptance criteria:**
- Temperature uniformity: all sensors within +/- 2.0 C of set point (or +/- 1.0 C for refrigerators).
- Humidity uniformity: all sensors within +/- 5% RH of set point.
- Door-open recovery: return to set point within 15 minutes.
- Power failure recovery: return to set point within specified time (typically 30-60 minutes).

### 5.3 Alarm Management

**Alarm levels:**
- **Alert limit:** Approaching the boundary of the acceptable range. Requires awareness but not immediate action. Typically set at 75% of the distance from set point to specification limit.
- **Action limit:** At or beyond the acceptable range. Requires immediate response and documented investigation.
- **Critical alarm:** Equipment failure, prolonged excursion, or power failure. Requires emergency response and potential sample relocation.

**Alarm response workflow:**
```
alarm_triggered -> acknowledged (who, when) -> investigated -> root_cause_identified -> impact_assessed -> corrective_action -> closed
```

**Response time requirements (industry standard):**
- Alert alarms: acknowledged within 1 hour during business hours; next business day off-hours.
- Action alarms: acknowledged within 30 minutes 24/7.
- Critical alarms: acknowledged within 15 minutes 24/7 (requires on-call rotation).

**Vent implementation:** Integrate with the existing Equipment Logbook module for chamber-as-equipment tracking. Alarm notifications should leverage the existing notification infrastructure. Consider a dedicated `chamber_alarms` table or extending `chamber_excursions`.

### 5.4 Calibration Requirements

- All temperature and humidity sensors must be calibrated against traceable standards (NIST, UKAS, DKD).
- Calibration frequency: every 6-12 months (defined in the calibration programme).
- Calibration tolerance: +/- 0.5 C for temperature; +/- 2% RH for humidity.
- Calibration certificates must be retained.
- Link to the existing Equipment Logbook module's calibration tracking.

---

## 6. Statistical Analysis

### 6.1 Shelf-Life Estimation Methods

**Linear Regression (Primary Method per Q1E):**
- Plot the stability-indicating parameter (typically potency or a critical impurity) versus time.
- Fit a linear regression line: Y = a + bX (where Y = measured value, X = time in months, a = intercept, b = slope).
- Calculate the 95% one-sided confidence interval for the mean response.
- The shelf life is the point where the lower (or upper, depending on the attribute) 95% confidence limit intersects the acceptance criterion.
- If degradation follows zero-order kinetics (constant rate), use untransformed data.
- If degradation follows first-order kinetics (rate proportional to amount remaining), use log-transformed data.

**Poolability Test (ANCOVA):**
- Before combining data from multiple batches, test whether batches can be pooled.
- Null hypothesis: slopes and intercepts are equal across batches.
- If p > 0.25 for both slopes and intercepts, data can be pooled.
- If pooling is rejected, the batch with the shortest estimated shelf life determines the overall shelf life.
- Three statistical models tested in sequence:
  1. Separate slopes, separate intercepts (full model)
  2. Common slope, separate intercepts (reduced model 1)
  3. Common slope, common intercept (pooled model)
- F-test comparisons between models at alpha = 0.25.

**Non-linear Models (when justified):**
- Quadratic: Y = a + bX + cX^2
- Log-linear: ln(Y) = a + bX (first-order degradation)
- Arrhenius: k = A * exp(-Ea/RT) — for temperature-dependent degradation rate estimation across conditions.
- The model with the best fit (highest R-squared, residual analysis) should be selected with scientific justification.

### 6.2 Significant Change Criteria

**For small molecules (per Q1A):**
- 5% change in assay from initial value.
- Any degradation product exceeding its acceptance criterion.
- Failure to meet dissolution (12 units), appearance, or pH criteria.

**For biologics (per Q5C):**
- Loss of potency below the acceptance criterion.
- Increase in aggregation (HMW species by SEC) above the acceptance criterion.
- Increase in fragmentation (LMW species) above the acceptance criterion.
- Change in charge variant profile (IEX/cIEF) beyond established ranges.
- Change in glycosylation pattern beyond acceptance criteria.
- Visible particles detected.
- Change in appearance (colour, clarity) outside acceptance criteria.
- pH change beyond acceptance criterion.
- For practical purposes, industry typically uses: >5% change in potency from initial, >1-2% absolute increase in HMW (aggregation), >1-2% absolute increase in fragments.

### 6.3 Out-of-Trend (OOT) Detection

OOT results are those that are within specification but deviate from the expected trend. Early detection of OOT results allows proactive investigation before an OOS occurs.

**Statistical methods for OOT detection:**
- **Control charts:** Track each parameter over time with mean, +/- 2 sigma (warning), +/- 3 sigma (action) limits.
- **Nelson rules (Western Electric rules):**
  - Rule 1: One point beyond 3 sigma.
  - Rule 2: Nine consecutive points on the same side of the mean.
  - Rule 3: Six consecutive points increasing or decreasing.
  - Rule 4: Fourteen consecutive points alternating up and down.
  - Rule 5: Two out of three consecutive points beyond 2 sigma (same side).
  - Rule 6: Four out of five consecutive points beyond 1 sigma (same side).
  - Rule 7: Fifteen consecutive points within 1 sigma (too little variation).
  - Rule 8: Eight consecutive points beyond 1 sigma (on either side).
- **CUSUM (Cumulative Sum):** Detects small persistent shifts in mean level.
- **Process capability indices:** Cpk, Ppk for stability parameter performance relative to specification.
- **Regression residual analysis:** Points with residuals > 2 standard deviations flagged for review.

**Vent implementation:**
- `trend_flag` enum on each result: 'none', 'alert', 'action', 'oos'.
- AI-powered trend analysis using Claude to evaluate multivariate trends across parameters.
- Automated Nelson rule checks on each new result entry.
- Dashboard visualisations: trend charts with confidence intervals, control chart overlays.

### 6.4 Extrapolation Rules

Per ICH Q1E:
- Extrapolation beyond observed data is acceptable if:
  - Long-term data show little or no change and variability.
  - Statistical analysis supports extrapolation.
  - Accelerated data support the extrapolation.
- Maximum extrapolation: up to twice the period covered by long-term data, but not more than the period covered by accelerated data supporting the conclusion.
- Example: 12 months of long-term data with no significant change and 6 months of accelerated data with no significant change could support up to 24 months shelf life.
- **For biologics (Q5C):** Extrapolation is generally more limited and requires stronger justification. Complex degradation kinetics (aggregation, deamidation) may not follow simple linear models. Regulatory agencies frequently challenge extrapolation of biologics stability data.

---

## 7. AI Opportunities

### 7.1 Trend Prediction and OOT Detection

**AI prompt pattern:**
```
Given stability data for [product] at [storage condition]:
- Time points: [array of {month, parameter, value}]
- Specification limits: [min, max]
- Historical batch data: [comparison data]

Assess:
1. Is the current trajectory on track to remain within specification through the proposed shelf life?
2. Are there any OOT signals (Nelson rules, CUSUM shifts)?
3. Predicted value at next time point with confidence interval.
4. Risk level: low/medium/high/critical.
```

**Use cases:**
- Real-time trend assessment as each new result is entered.
- Multi-parameter correlation analysis (e.g., if potency drops, does aggregation increase? Are they correlated?).
- Cross-batch comparison: is this batch trending differently from historical batches?
- Early warning system: predict potential OOS 6-12 months before it occurs.

### 7.2 Shelf-Life Extrapolation Support

**AI can assist with:**
- Selecting the appropriate regression model (linear vs. non-linear) based on data fit.
- Performing poolability assessment across batches.
- Generating narrative justification for regulatory submissions.
- Comparing extrapolated shelf life with actual observed data from completed studies.
- Flagging cases where extrapolation may not be scientifically justified (e.g., non-linear degradation curves).

### 7.3 Excursion Impact Assessment

**AI prompt pattern:**
```
A stability chamber excursion occurred:
- Chamber: [id], set point: [temp/humidity]
- Excursion: [max_temp reached], duration: [minutes]
- Products affected: [list of studies with product details]
- Product degradation profiles: [known Arrhenius parameters or accelerated data]

Assess the potential impact on product quality. Consider:
1. Cumulative thermal exposure (degree-hours above set point).
2. Known degradation kinetics at elevated temperature.
3. Whether the excursion exceeds the product's demonstrated stability range.
4. Recommended actions: no impact, additional testing, sample replacement, study invalidation.
```

### 7.4 Automated Scheduling and Resource Planning

- Predict upcoming pull volumes and testing workload for the QC lab.
- Auto-generate pull reminders and assign to trained analysts.
- Capacity planning: alert when chamber capacity is approaching limits.
- Cross-reference analyst qualifications (from Training Matrix) with required test methods.

### 7.5 Protocol Authoring Assistance

- AI-assisted protocol generation based on product type, dosage form, and regulatory target market.
- Automatic inclusion of required ICH time points and test parameters based on product type.
- Comparison with existing protocols for similar products.
- Regulatory gap check: flag missing tests or time points per applicable guidelines.

### 7.6 Annual Product Review (APR) Summaries

- Auto-generate stability summaries for annual product quality reviews.
- Aggregate trending data across all batches for a product.
- Highlight any atypical batches, OOS events, or stability failures.
- Generate comparison tables between batches.

### 7.7 Regulatory Submission Data Compilation

- Compile stability data into Module 3.2.P.8 (CTD format) tables and figures.
- Generate stability summary tables per ICH M4Q format.
- Auto-generate trend plots with regression lines and confidence intervals.

---

## 8. Integration Points

### 8.1 QC Lab Module (Primary Integration)

The Stability module is deeply coupled with the QC Lab module. When a stability pull occurs, it generates QC samples and test requests.

**Data flow:**
```
Stability Pull -> creates QC Samples (qc_samples) -> creates QC Tests (qc_tests) -> QC Results (qc_results) -> fed back to stability_results
```

**Specific integrations:**
- `stability_results.qc_sample_id` FK -> `qc_samples.sample_id`
- `stability_results.qc_result_id` FK -> `qc_results.result_id`
- `stability_results.method_id` FK -> `qc_methods.method_id`
- When a pull is executed, auto-create QC sample records with `sample_type = 'stability'`, linking back to the pull.
- QC Lab test completion triggers a webhook/event to update `stability_results` and re-evaluate trends.
- QC Lab OOS investigation results feed back to the stability module for impact assessment.

### 8.2 Batch Records Module

- `stability_studies.batch_id` FK -> batches table.
- Stability protocols define which batches go on stability (registration batches, annual batches, etc.).
- Batch release may be conditional on satisfactory initial stability results (T=0 data).
- Batch expiration dates are set and updated based on stability data conclusions.

### 8.3 Equipment Logbook Module

- `stability_chambers.equipment_id` FK -> `equipment` table.
- Chamber calibration, maintenance, and qualification events tracked in Equipment Logbook.
- Equipment status changes (out-of-service, maintenance) should alert stability programme managers.
- Sensor calibration records from Equipment Logbook validate monitoring data integrity.

### 8.4 Deviation Manager Module

- Missed/late stability pulls auto-create deviation records.
- Chamber excursions create deviation records.
- OOS stability results trigger deviation investigations.
- `stability_pulls.deviation_id` FK -> `deviations.deviation_id`
- `chamber_excursions.deviation_id` FK -> `deviations.deviation_id`

### 8.5 CAPA Module

- Recurring stability failures or trends may trigger CAPAs.
- Chamber-related CAPAs (e.g., recurring excursions) linked from excursion records.
- `chamber_excursions.capa_id` FK -> `capas.capa_id`

### 8.6 Change Control Module

- Stability protocol amendments require change controls.
- Process changes, formulation changes, packaging changes, and site transfers all trigger stability study requirements.
- Link: `change_controls` -> `stability_studies` (change control may mandate new stability study).

### 8.7 Environmental Monitoring Module

- Chamber environmental data (continuous monitoring) provides the compliance record for storage conditions.
- EM excursions in stability storage areas trigger chamber excursion records.
- Cross-reference: room-level EM data for the area containing stability chambers.

### 8.8 Training Matrix Module

- Analysts performing stability pulls and testing must be qualified.
- Pull execution should verify that the assigned analyst has current training for the specific test methods.
- `stability_pulls.pulled_by` should be validated against training records.

### 8.9 Document Control Module

- Stability protocols are controlled documents requiring version control and approval workflows.
- Stability reports are controlled documents.
- SOPs for stability programme management, chamber operation, and pull procedures.

### 8.10 Supplier Quality Module

- Stability chamber vendors — supplier qualification records.
- Calibration service providers — supplier qualification.
- Contract stability testing laboratories — supplier audits and quality agreements.

---

## 9. 21 CFR Part 11 Compliance Requirements

### 9.1 Electronic Records (Subpart B)

**Section 11.10 — Controls for Closed Systems:**
- **System validation:** The stability module must be validated (IQ/OQ/PQ) to ensure accuracy, reliability, consistent intended performance, and the ability to discern invalid or altered records.
- **Record generation:** The system must generate accurate and complete copies of records in both human-readable and electronic form (PDF export, CSV export).
- **Record protection:** Records must be protected throughout their retention period to ensure ready retrieval. Stability data retention: at least 1 year past product expiry, or per company policy (often 15+ years for biologics).
- **Access controls:** Limit system access to authorised individuals. Role-based access:
  - `stability_admin`: Create/edit protocols, manage chambers, configure system.
  - `stability_scientist`: Create draft protocols, execute pulls, enter results, generate reports.
  - `stability_analyst`: Execute pulls (physical action), enter results.
  - `qa_reviewer`: Review and approve protocols, review and approve reports, review excursion impact assessments.
  - `qa_manager`: All of the above plus system configuration and audit trail review.
  - `read_only`: View data and reports only.
- **Audit trail:** Secure, computer-generated, time-stamped audit trail to independently record the date and time of operator entries and actions that create, modify, or delete electronic records. Audit trail must:
  - Record who made each change.
  - Record when (timestamp with timezone).
  - Record what was changed (before and after values).
  - Record why (reason for change — required for any post-approval modification).
  - Be retained for at least as long as the subject electronic records.
  - Be available for regulatory inspection and copying.
- **Operational checks:** Enforce permitted sequencing of steps (e.g., protocol must be approved before pulls can be scheduled; pulls must be executed before results can be entered; results must be reviewed before reports are generated).
- **Authority checks:** Only authorised users can perform specific functions. E.g., only QA can approve protocols; only trained analysts can enter results.
- **Device checks:** N/A for web application (applies to hardware).
- **Training:** Personnel who use the system must be trained. Link to Training Matrix module.

### 9.2 Electronic Signatures (Subpart C)

**Section 11.50 — Signature Manifestations:**
- Each electronic signature must include:
  - Printed name of the signer.
  - Date and time of signing.
  - Meaning of the signature (e.g., "authored", "reviewed", "approved", "rejected").
- This information must be part of the human-readable form of the electronic record.

**Section 11.70 — Signature/Record Linking:**
- Electronic signatures must be linked to their respective electronic records such that signatures cannot be excised, copied, or otherwise transferred to falsify an electronic record.

**Section 11.100 — General Requirements:**
- Each electronic signature must be unique to one individual and not reused or reassigned.
- Identity verification before establishing, assigning, certifying, or otherwise sanctioning an individual's electronic signature.
- Before use, persons must certify to the agency that their electronic signature is the legally binding equivalent of their traditional handwritten signature.

**Section 11.200 — Electronic Signature Components:**
- Non-biometric signatures must employ at least two distinct identification components (e.g., user ID + password).
- When signing multiple records in a single continuous session, the first signing requires both components; subsequent signings may use only one component (e.g., password re-entry).
- Non-biometric signatures used in systems that are not continuously controlled must employ all components for each individual signing.

**Vent implementation:**
- All protocol approvals, result reviews, result approvals, report approvals, and excursion impact assessments require e-signatures.
- E-signature captured as: `{ signer_id, signer_name, meaning, timestamp, ip_address }`.
- Password re-entry required for all e-signature events (not just session authentication).
- Signature meaning enum: 'authored', 'reviewed', 'approved', 'rejected', 'verified', 'witnessed'.
- Audit trail must be append-only (no delete, no modify). Implement in Supabase using an immutable audit table with RLS preventing delete/update.

### 9.3 Data Integrity — ALCOA+ Principles

| Principle | Stability Module Implementation |
|-----------|-------------------------------|
| **Attributable** | Every record entry, modification, and approval linked to a specific user ID with timestamp. |
| **Legible** | Data stored in structured fields (not free text blobs). Reports generated in standardised formats. |
| **Contemporaneous** | Timestamps auto-generated at time of data entry. Backdating prevented by system controls. |
| **Original** | First-entry data preserved. Modifications create new versions with reason for change. Original value retained in audit trail. |
| **Accurate** | Validation rules on data entry (range checks, format checks). Dual verification for critical entries. |
| **Complete** | Mandatory fields enforced. No deletion of records — only logical voiding with reason. |
| **Consistent** | Standardised enums, units, and formats. Cross-field validation (e.g., result date cannot precede pull date). |
| **Enduring** | Data stored in durable database with backup. Retention policy enforced (no auto-purge within retention period). |
| **Available** | Data available for review at any time. Export capabilities for regulatory inspection. Read-only access for auditors. |

---

## 10. Competitor Analysis

### 10.1 LIMS Platforms

#### LabWare LIMS (LabWare Inc.)

**Stability module capabilities:**
- Dedicated stability study management within LIMS.
- Protocol definition with ICH-standard time points and conditions.
- Automated pull scheduling with notifications.
- Integration with lab testing workflows — samples auto-created from pulls.
- Trending and charting: built-in Shewhart control charts and trend plots.
- Statistical analysis: basic regression (linear), shelf-life estimation.
- Chamber monitoring integration via instrument interfaces (not built-in).
- Matrixing and bracketing support.
- Reporting: configurable stability summary reports.
- **Limitations:** Complex configuration requiring specialised LabWare administrators. Statistical capabilities are basic — most customers export to Minitab or SAS for advanced analysis. Chamber monitoring is typically a separate system (LabWare does not manage chambers directly). UI is dated (Java-based thick client, with a newer web interface in v8 that still has gaps).

#### STARLIMS (Abbott/Informatics)

**Stability module capabilities:**
- Stability study lifecycle management.
- Protocol templates with ICH time points.
- Sample scheduling and pull management.
- Result entry and review workflows.
- Basic trending with control charts.
- Integration with STARLIMS core LIMS functions (sample login, testing, results).
- Reporting via Crystal Reports or built-in report designer.
- **Limitations:** Similar to LabWare — statistical analysis is basic. Chamber management not included. Requires significant customisation for biologics-specific parameters. The platform is being sunsetted in favour of Abbott's cloud offering, creating migration uncertainty for existing customers.

#### Thermo Fisher SampleManager LIMS

**Stability module capabilities:**
- Study definition and management.
- Pull scheduling with GxP-compliant audit trail.
- Integration with SampleManager sample and result management.
- Environmental monitoring integration (via connected Thermo Fisher instruments).
- Statistical trending with basic SPC.
- **Limitations:** Primarily designed for chemical/small molecule stability. Biologics-specific parameters (SEC, IEX, charge variants) require custom configuration. High implementation cost and complexity.

### 10.2 QMS Platforms

#### Veeva Vault Quality (Veeva Systems)

**Stability-related capabilities:**
- Veeva Vault QMS does not have a dedicated stability study management module.
- Stability protocols and reports managed as controlled documents in Vault QualityDocs.
- Change controls and CAPAs related to stability managed in Vault QMS.
- Veeva Vault CDMS (Clinical Data Management Suite) has some stability data capabilities but is primarily clinical-focused.
- **Key gap:** No sample-level tracking, pull scheduling, chamber management, or result trending. Veeva relies on LIMS integration for actual stability data management.
- **Strength:** Excellent document lifecycle management and regulatory submission capabilities (Vault RIM for CTD compilation).

#### MasterControl Quality Excellence (MasterControl)

**Stability-related capabilities:**
- MasterControl does not have a purpose-built stability module.
- Stability protocols and reports managed via Document Control module.
- Stability-related deviations and CAPAs managed via CAPA module.
- Training on stability procedures tracked via Training module.
- **Key gap:** No laboratory data management capabilities. No sample tracking, no result entry, no trending, no chamber management.
- **Strength:** Strong deviation, CAPA, change control, and document management workflows.

#### TrackWise (Honeywell/Sparta Systems)

**Stability-related capabilities:**
- No dedicated stability module.
- Stability deviations, CAPAs, and change controls managed within TrackWise QMS.
- Some customers have built custom stability tracking using TrackWise's configurable data model, but this is not a standard offering.
- **Key gap:** Same as Veeva and MasterControl — no laboratory-level stability data management.

### 10.3 Dedicated Stability Software

#### Climatic Studies (CSC/Vaisala)

- Specialised stability study management software.
- Full ICH compliance for protocol, scheduling, and data management.
- Strong chamber integration (especially with Vaisala environmental monitoring systems).
- Statistical analysis including regression, shelf-life estimation, and significant change detection.
- **Limitations:** Narrow scope — only stability, no broader QMS or LIMS integration. Small vendor risk.

#### BIOVIA Discoverant (Dassault Systemes)

- Advanced statistical analysis platform used by large pharma for stability trending.
- Multivariate analysis, control charting, and shelf-life prediction.
- Integration with LIMS for data ingestion.
- **Limitations:** Expensive, complex to deploy, requires statistical expertise to configure. Not a study management system — purely an analytics layer.

#### Lonza MODA (Manufacturing Operations Data Aggregator)

- Paper-on-glass electronic batch record platform.
- Some stability protocol execution capabilities.
- **Limitations:** Primarily focused on batch execution, not stability programme management.

### 10.4 Competitive Opportunity for Vent

**Gaps in the market that Vent can exploit:**

1. **No single platform does it all.** Customers typically use LIMS (sample management) + QMS (document/deviation management) + dedicated stability software (statistics) + chamber monitoring system (environmental). Four systems, four vendors, four validation efforts, four sets of data silos. Vent can unify all four within one platform.

2. **Biologics-specific features are afterthoughts.** Most LIMS stability modules were designed for small molecule tablets (assay, dissolution, impurities). Biologics parameters (SEC, IEX, cIEF, potency bioassays, aggregation trending) require extensive customisation. Vent can be biologics-first.

3. **AI is absent.** No current stability platform uses AI for trend prediction, OOT detection, excursion impact assessment, or protocol authoring. This is a clear differentiator.

4. **Chamber management is typically separate.** Most facilities use a standalone environmental monitoring system (Vaisala viewLinc, Ellab, Rotronic) with no integration to the study data. Vent can integrate chamber management, alarm handling, and excursion documentation directly with study data.

5. **User experience is poor.** LabWare and STARLIMS have dated, complex UIs. Veeva and MasterControl are document-centric, not data-centric. A modern, clean, split-panel dark-themed UI with real-time dashboards would be a significant differentiator.

6. **Cost of ownership.** Traditional LIMS stability modules require $200K-$1M+ in implementation services. Vent's SaaS model with pre-configured biologics workflows can dramatically reduce time-to-value.

---

## 11. API Endpoints

### 11.1 Stability Protocols

```
POST   /stability/protocols                Create new protocol (draft)
GET    /stability/protocols                List protocols (with filters)
GET    /stability/protocols/:id            Get protocol by ID
PUT    /stability/protocols/:id            Update protocol (draft only)
POST   /stability/protocols/:id/submit     Submit for review
POST   /stability/protocols/:id/approve    QA approve (e-signature)
POST   /stability/protocols/:id/reject     QA reject with comments
POST   /stability/protocols/:id/amend      Create amendment (new version)
DELETE /stability/protocols/:id            Soft delete (draft only)
```

### 11.2 Stability Studies

```
POST   /stability/studies                  Create study (from approved protocol)
GET    /stability/studies                  List studies (with filters)
GET    /stability/studies/:id              Get study by ID with pulls and results
PUT    /stability/studies/:id              Update study metadata
POST   /stability/studies/:id/activate     Activate study (first sample placed)
POST   /stability/studies/:id/hold         Place study on hold
POST   /stability/studies/:id/terminate    Terminate study early
POST   /stability/studies/:id/complete     Complete study
```

### 11.3 Stability Pulls

```
GET    /stability/pulls                    List all pulls (with filters: due, overdue, etc.)
GET    /stability/pulls/upcoming           Get pulls due in next N days
GET    /stability/studies/:id/pulls        Get pulls for a specific study
POST   /stability/studies/:id/pulls        Schedule a pull
PUT    /stability/pulls/:id               Update pull
POST   /stability/pulls/:id/execute       Execute pull (create QC samples)
POST   /stability/pulls/:id/complete      Mark pull complete (all results in)
POST   /stability/pulls/:id/skip          Skip pull (with justification)
```

### 11.4 Stability Results

```
GET    /stability/studies/:id/results      Get all results for a study
GET    /stability/pulls/:id/results        Get results for a specific pull
POST   /stability/results                  Enter result (manual, or auto from QC Lab)
PUT    /stability/results/:id              Update result
POST   /stability/results/:id/review       Review result (e-signature)
POST   /stability/results/:id/approve      Approve result (e-signature)
```

### 11.5 Stability Chambers

```
POST   /stability/chambers                 Register new chamber
GET    /stability/chambers                 List chambers
GET    /stability/chambers/:id             Get chamber details
PUT    /stability/chambers/:id             Update chamber
GET    /stability/chambers/:id/studies     Get studies in this chamber
GET    /stability/chambers/:id/excursions  Get excursion history
POST   /stability/chambers/:id/excursions  Record excursion event
PUT    /stability/chambers/excursions/:id  Update excursion (investigation, disposition)
POST   /stability/chambers/:id/mapping     Record temperature mapping
GET    /stability/chambers/:id/mappings    Get mapping history
```

### 11.6 Stability Reports

```
POST   /stability/reports                  Create report
GET    /stability/reports                  List reports
GET    /stability/reports/:id              Get report
PUT    /stability/reports/:id              Update report (draft only)
POST   /stability/reports/:id/submit       Submit for review
POST   /stability/reports/:id/approve      QA approve (e-signature)
POST   /stability/reports/:id/reject       QA reject
```

### 11.7 AI Endpoints

```
POST   /stability/ai/trend-analysis       Analyse trends for a study/parameter
POST   /stability/ai/shelf-life           Estimate shelf life from data
POST   /stability/ai/excursion-impact     Assess excursion impact
POST   /stability/ai/protocol-assist      AI-assisted protocol generation
POST   /stability/ai/oot-check            Check for out-of-trend signals
POST   /stability/ai/apr-summary          Generate APR stability summary
```

### 11.8 Dashboard / Analytics

```
GET    /stability/dashboard                Overview metrics (active studies, upcoming pulls, overdue items, chamber status)
GET    /stability/dashboard/pulls-calendar Calendar view of upcoming pulls
GET    /stability/dashboard/chamber-status Chamber occupancy and status overview
GET    /stability/trending/:studyId        Get trending data for charts
GET    /stability/trending/:studyId/:param  Get trending data for a specific parameter
```

---

## 12. Role-Based Access Control

| Role | Create Protocol | Approve Protocol | Execute Pull | Enter Results | Review Results | Approve Results | Manage Chambers | View Reports | Approve Reports | AI Analysis |
|------|----------------|-----------------|-------------|--------------|---------------|----------------|----------------|-------------|----------------|------------|
| stability_admin | Yes | No | Yes | Yes | No | No | Yes | Yes | No | Yes |
| stability_scientist | Yes (draft) | No | Yes | Yes | No | No | No | Yes | No | Yes |
| stability_analyst | No | No | Yes | Yes | No | No | No | Yes (own) | No | No |
| qa_reviewer | No | Yes | No | No | Yes | Yes | No | Yes | Yes | Yes |
| qa_manager | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| production | No | No | No | No | No | No | No | Yes (own batches) | No | No |
| read_only | No | No | No | No | No | No | No | Yes | No | No |

**Key separation of duties:**
- The person who creates a protocol cannot approve it.
- The person who enters a result cannot review or approve it.
- The person who authors a report cannot approve it.
- Pull execution requires a different person for second-person verification (GMP requirement).

---

## 13. Frontend Layout

### 13.1 Page Structure (Split-Panel Pattern)

Following the Vent design system (`docs/shared/styles.css`), the stability module should use the established split-panel layout:

**Left Panel — Study List:**
- Filterable, searchable list of stability studies.
- Filters: status (active, completed, on_hold), study_type, product, chamber, storage_condition.
- Quick-view badges: status colour, next pull date, overdue count.
- Sort options: next pull date (default), study start date, product name, batch number.

**Right Panel — Study Detail:**
- Tabbed interface within the detail panel:
  - **Overview Tab:** Study metadata, protocol link, batch info, chamber assignment, current status.
  - **Schedule Tab:** Full pull schedule timeline with status indicators (completed, due, overdue, upcoming). Interactive Gantt-style view.
  - **Results Tab:** Tabular display of all results by time point. Sortable by parameter. Inline OOS/OOT highlighting.
  - **Trending Tab:** Interactive charts for each parameter over time. Regression line overlay. Specification limit lines. Trend alerts highlighted.
  - **Excursions Tab:** Chamber excursion history affecting this study.
  - **Documents Tab:** Linked protocol, reports, CoAs, investigation documents.
  - **Audit Tab:** Full audit trail for this study.

### 13.2 Additional Pages / Views

- **Protocol Manager:** List/create/review/approve stability protocols. Similar split-panel: protocol list (left) + protocol detail (right).
- **Pull Calendar:** Calendar view of all upcoming pulls across all active studies. Colour-coded by study type or product. Daily/weekly/monthly views.
- **Chamber Dashboard:** Visual representation of all stability chambers. Occupancy heat map. Live temperature/humidity readings (if monitoring integration available). Excursion alert indicators.
- **Trending Dashboard:** Cross-study trending for a selected product. Multi-batch overlay charts. Statistical analysis results.
- **Reports:** Generate, review, and approve stability reports. Template-based report generation with auto-populated data.

### 13.3 Dashboard Widgets (Main Stability Page)

- **Active Studies Count** with breakdown by study type.
- **Pulls Due This Week / This Month** with click-through to pull list.
- **Overdue Pulls** (highlighted in red/orange) with escalation indicator.
- **Chamber Status Summary** (all operational, any alarms, any out-of-service).
- **Recent OOS/OOT Events** (last 30 days).
- **Shelf-Life Summary** table: product, current data supports N months, labelled shelf life M months.
- **AI Trend Alerts** — any studies where AI has flagged a concerning trend.

---

## 14. Workflow Diagrams

### 14.1 Study Lifecycle

```
[Draft Protocol] -> [Protocol Review] -> [Protocol Approved]
                                              |
                                    [Create Study from Protocol]
                                              |
                                    [Place Samples in Chamber]
                                              |
                                    [Study Active] <-----------.
                                         |                      |
                                    [Pull Due]                  |
                                         |                      |
                                    [Execute Pull]              |
                                         |                      |
                                    [Submit to QC Lab]          |
                                         |                      |
                                    [QC Testing]                |
                                         |                      |
                                    [Results Entered]           |
                                         |                      |
                                    [Results Reviewed]          |
                                         |                      |
                                    [Results Approved]          |
                                         |                      |
                                    [Trend Analysis]            |
                                         |                      |
                                  [Next Pull Due] ------->------'
                                         |
                                  [All Pulls Complete]
                                         |
                                  [Generate Report]
                                         |
                                  [Report Review & Approval]
                                         |
                                  [Study Complete]
```

### 14.2 Excursion Response Workflow

```
[Chamber Alarm] -> [Alarm Acknowledged] -> [Excursion Logged]
                                               |
                                    [Impact Assessment]
                                      /              \
                            [No Impact]          [Impact Identified]
                                |                      |
                         [Close Excursion]    [Create Deviation]
                                                  |
                                            [Investigation]
                                                  |
                                            [Corrective Action]
                                                  |
                                            [CAPA if needed]
                                                  |
                                            [Close Excursion]
```

---

## 15. Testing Considerations for Development

### 15.1 Service Layer Tests (Vitest)

Key test scenarios:
- Protocol CRUD operations with status transitions.
- Protocol approval workflow (cannot approve own protocol, requires QA role).
- Study creation from approved protocol (fails if protocol not approved).
- Pull schedule auto-generation from protocol time points.
- Pull execution creates QC samples with correct parameters.
- Pull window validation (warn if outside window, flag deviation if beyond tolerance).
- Result entry with specification checking (auto-flag OOS).
- Trend calculation on result entry.
- Significant change detection logic.
- Chamber excursion creation and impact assessment.
- E-signature capture on approval actions.
- Audit trail completeness for all mutations.

### 15.2 API Integration Tests

- Auth guard enforcement on all endpoints.
- Role-based access validation (analyst cannot approve, etc.).
- Separation of duties enforcement.
- Protocol version incrementing on amendment.
- Cascading status updates (e.g., all pulls complete -> study can be completed).
- QC Lab integration: pull execution creates properly linked QC samples.

---

## 16. Data Retention and Archival

- **Stability data retention period:** Per FDA guidance, stability data must be retained for at least 1 year past the expiry date of the last batch manufactured under the protocol, or as defined by company policy (typically 15-25 years for biologics).
- **Protocol documents:** Retained for the life of the product plus applicable retention period.
- **Audit trails:** Retained for as long as the subject electronic records (i.e., same retention period as the data).
- **Chamber records:** Retained for the life of the equipment plus applicable post-decommissioning period.
- **Archived studies:** Must remain accessible (read-only) and searchable. Consider a `stability_archive` view or status.
- **Vent implementation:** Supabase row-level security (RLS) should prevent deletion. Archival flag rather than physical deletion. Export to PDF/CSV for regulatory submission packages.

---

## 17. Summary of New ID Prefixes for ids.js

| Prefix | Entity | Function Name |
|--------|--------|--------------|
| STBP- | Stability Protocol | `stabilityProtocolId()` |
| STB- | Stability Study | `stabilityStudyId()` |
| PULL- | Stability Pull | `stabilityPullId()` |
| STBR- | Stability Result | `stabilityResultId()` |
| SCHM- | Stability Chamber | `stabilityChamberI()` |
| EXCR- | Chamber Excursion | `chamberExcursionId()` |
| SRPT- | Stability Report | `stabilityReportId()` |
| STBA- | Stability Alert | `stabilityAlertId()` |
| STMP- | Temperature Mapping | `chamberMappingId()` |

---

## 18. Supabase RLS Policy Requirements

```sql
-- All stability tables: users can only read data for their facility
CREATE POLICY "stability_facility_read" ON stability_studies
  FOR SELECT USING (facility_id = auth.jwt()->>'facility_id');

-- Only stability_admin and qa_manager can insert protocols
CREATE POLICY "stability_protocol_insert" ON stability_protocols
  FOR INSERT WITH CHECK (
    auth.jwt()->>'role' IN ('stability_admin', 'stability_scientist', 'qa_manager')
  );

-- Results cannot be deleted (data integrity)
CREATE POLICY "stability_results_no_delete" ON stability_results
  FOR DELETE USING (false);

-- Audit trail is append-only
CREATE POLICY "audit_append_only" ON stability_audit_trail
  FOR INSERT WITH CHECK (true);
CREATE POLICY "audit_no_update" ON stability_audit_trail
  FOR UPDATE USING (false);
CREATE POLICY "audit_no_delete" ON stability_audit_trail
  FOR DELETE USING (false);
```

---

## 19. Key References

1. ICH Q1A(R2) — Stability Testing of New Drug Substances and Products (February 2003)
2. ICH Q1B — Stability Testing: Photostability Testing of New Drug Substances and Products (November 1996)
3. ICH Q1C — Stability Testing for New Dosage Forms (November 1996)
4. ICH Q1D — Bracketing and Matrixing Designs for Stability Testing of New Drug Substances and Products (February 2002)
5. ICH Q1E — Evaluation of Stability Data (February 2003)
6. ICH Q5C — Quality of Biotechnological Products: Stability Testing of Biotechnological/Biological Products (November 1995)
7. FDA 21 CFR 211.166 — Stability Testing
8. FDA 21 CFR 211.170 — Reserve Samples
9. FDA 21 CFR Part 11 — Electronic Records; Electronic Signatures
10. EU GMP Annex 15 — Qualification and Validation
11. EU GMP Annex 2 — Manufacture of Biological Active Substances and Medicinal Products
12. WHO Technical Report Series 953 — Stability Testing of Active Pharmaceutical Ingredients and Finished Pharmaceutical Products
13. PDA Technical Report 53 — Fundamentals of an Environmental Monitoring Program (chamber qualification context)
14. USP <1079> — Good Storage Practice
15. FDA Guidance for Industry: ANDAs — Stability Testing of Drug Substances and Products (2013)
16. FDA Guidance for Industry: Stability Testing of Drug Substances and Drug Products (Draft, 1998)
17. ICH M4Q(R1) — Common Technical Document for the Registration of Pharmaceuticals — Quality (Module 3.2.P.8 Stability)
