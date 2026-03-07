# OOS Investigation Module — Research Brief

**Date:** 2026-03-07
**Module:** OOS Investigation (Planned — QC Quality subsystem)
**Author:** Research Agent (Claude Code)

---

## Table of Contents

1. [Regulatory Framework](#1-regulatory-framework)
2. [Two-Phase Investigation Model](#2-two-phase-investigation-model)
3. [Key Data Fields & Schema Design](#3-key-data-fields--schema-design)
4. [Decision Trees](#4-decision-trees)
5. [Trending & Metrics](#5-trending--metrics)
6. [Out-of-Trend (OOT) Detection](#6-out-of-trend-oot-detection)
7. [AI Opportunities](#7-ai-opportunities)
8. [21 CFR Part 11 Compliance](#8-21-cfr-part-11-compliance)
9. [Current Vent State & Gap Analysis](#9-current-vent-state--gap-analysis)
10. [Competitor Landscape](#10-competitor-landscape)
11. [Implications for the Vent Spec](#11-implications-for-the-vent-spec)

---

## 1. Regulatory Framework

### 1.1 FDA Guidance for Industry: "Investigating Out-of-Specification (OOS) Test Results for Pharmaceutical Production" (October 2006)

This is the single most important regulatory document governing OOS investigations. Issued as final guidance in October 2006, it supersedes the 1998 draft and codifies the principles established in the landmark *United States v. Barr Laboratories* (812 F. Supp. 458, D.N.J. 1993) court decision. Every pharmaceutical/biopharmaceutical manufacturer operating under FDA jurisdiction must follow this guidance.

**Core Principles:**

- **An OOS result is a laboratory result that falls outside the specifications or acceptance criteria established in drug applications, drug master files, official compendia, or by the manufacturer.** The definition encompasses chemical, microbiological, and biological testing.
- **The first OOS result is the most important data point.** It cannot be discarded, ignored, or averaged away without a scientifically justified, documented assignable cause.
- **Investigation is mandatory.** Every OOS result must trigger a formal investigation. Failure to investigate is a cGMP violation under 21 CFR 211.192.
- **The investigation must be timely, thorough, unbiased, well-documented, and scientifically sound.** The guidance explicitly warns against "testing into compliance" — the practice of performing repeated retests until a passing result is obtained and then using only the passing result.
- **Two-phase investigation model.** Phase I (laboratory investigation) must be completed rapidly. If Phase I does not identify a root cause, Phase II (full-scale investigation) is required.
- **Retesting is not a substitute for investigation.** Retesting is permitted only within the framework of a pre-approved retesting protocol and only after the Phase I investigation has been completed without finding an assignable laboratory error.
- **Averaging is generally inappropriate.** OOS results should not be averaged with passing results. If averaging is used, it must be scientifically justified and all individual values — including OOS values — must be reported.
- **The quality unit (QA/QC) has final authority** over the disposition of the batch, not production management.
- **Investigation timelines must be documented and adhered to.** While the guidance does not prescribe a specific timeline for Phase I (it says "expeditiously"), industry standard is 1-3 business days. Phase II must be completed within 30 calendar days of initiation.
- **All data generated during the investigation — including failing results — must be retained and reported.** Discarding or failing to report OOS data is a data integrity violation.

**Vent Implication:** The OOS investigation module must enforce mandatory investigation for every OOS-flagged result. The system must not allow a batch to proceed to disposition while an OOS investigation is open. All investigation data must be immutable once submitted, with full audit trail.

### 1.2 21 CFR 211.160 — General Requirements for Laboratory Controls

- Laboratory controls must include scientifically sound and appropriate specifications, standards, sampling plans, and test procedures.
- Any deviation from written specifications must be recorded and justified.
- Laboratory records must include complete data derived from all tests, examinations, and assays.
- **Critical provision:** "Laboratory records shall include complete data derived from all tests, examinations, and assays, including those that are unsatisfactory." This means OOS results cannot be deleted or hidden.

**Vent Implication:** The system must retain all OOS results permanently. The `qc_results` record for an OOS result must never be deleted — only its investigation status can be updated. The original result value must be immutable.

### 1.3 21 CFR 211.165 — Testing and Release for Distribution

- Each batch must be tested for conformance to final specifications before release.
- Sampling must be statistically valid and representative.
- Any batch that does not conform to specifications must be rejected unless the deviation is investigated and justified.
- **Key language:** "Any unexplained discrepancy [...] or the failure of a batch or any of its components to meet any of its specifications shall be thoroughly investigated."

**Vent Implication:** The link between OOS investigation and batch disposition is critical. The batch disposition module (already live as `batch-disposition`) must check for open OOS investigations before allowing release. The `linked_oos_id` field in `qc_results` should cross-reference to the deviation manager or a dedicated OOS investigation table.

### 1.4 21 CFR 211.192 — Production Record Review

This is the most frequently cited regulation in FDA OOS warning letters. It requires:

- **All drug product production and control records** (including laboratory records) must be reviewed and approved by the quality control unit before batch release.
- **Any unexplained discrepancy** (including a percentage of theoretical yield exceeding the maximum or minimum established in master production records) **or the failure of a batch or any of its components to meet any of its specifications** must be **thoroughly investigated**, whether or not the batch has already been distributed.
- **The investigation must extend to other batches** of the same drug product and other drug products that may have been associated with the specific failure or discrepancy.
- Written records of investigations must include **conclusions and follow-up**.

**This section is the legal basis for the entire OOS investigation requirement.** FDA auditors routinely issue 483 observations and warning letters citing 211.192 when:
- OOS results are not investigated at all
- Investigations are superficial (e.g., "analyst error" without evidence)
- Investigations do not extend to potentially affected batches
- Conclusions lack scientific justification
- Follow-up actions (CAPAs) are not implemented

**Vent Implication:** The OOS module must enforce cross-batch impact assessment. When an OOS is confirmed (not attributable to lab error), the system must flag other batches tested by the same analyst, on the same equipment, using the same method, and during the same time period. The CAPA linkage must be mandatory for Phase II closures.

### 1.5 EU GMP Chapter 6 — Quality Control (Sections 6.30-6.35)

The EU GMP Annex provides complementary requirements that are slightly more prescriptive than FDA guidance in some areas:

**6.32:** A procedure should describe the actions required when a test result is found to be out of specification. The procedure should include:
- Data analysis and assessment of the significance of the OOS result
- Assessment of whether the OOS result relates to other batches or products
- Where appropriate, a statistical evaluation

**6.33:** An OOS investigation should determine whether:
- A laboratory error has occurred
- The OOS result is attributable to a manufacturing/process issue
- The result is inconclusive (cannot be assigned to either)

**6.34:** Retesting — only permitted when:
- Phase I investigation has been completed
- A pre-approved retest protocol exists specifying the number of retests
- The retest plan is scientifically justified
- Retesting is performed by a different analyst (ideally)
- All retest results are reported (including failures)

**6.35:** The original OOS result is not invalidated by passing retest results unless an assignable laboratory cause has been documented. Specifically, EU GMP states: "The original result should not be invalidated by subsequent retesting unless it is demonstrated by a documented investigation that the original result was affected by an assignable error."

**Vent Implication:** The retest protocol must be a structured workflow, not a free-text field. The system should enforce that retesting cannot be initiated until Phase I is completed. Retest assignments should default to a different analyst than the original.

### 1.6 ICH Q7 Section 11 — Laboratory Controls (APIs)

ICH Q7 applies specifically to active pharmaceutical ingredients (APIs) and drug substances, which is directly relevant for biologics manufacturers producing drug substance.

**Section 11.15 — OOS Investigations:**
- Any OOS result obtained must be investigated and documented per written procedure.
- The investigation must determine root cause.
- If no root cause is identified, the result must be reported in the Certificate of Analysis.
- Retesting according to a predetermined procedure is acceptable, but averaging of OOS and passing results is not.

**Section 11.16:** Laboratory controls must be followed and departures documented and explained.

**Section 11.17:** Complete records of all testing must be maintained to allow "reconstruction" of the study — i.e., the audit trail must be sufficient to reproduce the investigation timeline.

**ICH Q7 vs. FDA Guidance differences:**
- ICH Q7 explicitly requires that if the root cause of an OOS cannot be determined, the OOS result must appear on the Certificate of Analysis — even if retests pass. FDA guidance is less explicit on this point but reaches a similar conclusion.
- ICH Q7 does not prescribe the two-phase model explicitly but requires all the same investigation elements.

**Vent Implication:** For API/drug substance batches, the OOS investigation outcome must flow through to Certificate of Analysis generation. If conclusion is "inconclusive" or "confirmed OOS," the original OOS result must appear on the CoA.

### 1.7 WHO TRS 1010 (2018) Annex 1 — WHO GMP for Pharmaceutical Products

For facilities supplying WHO-prequalified markets (common in biologics/vaccine manufacturing):

- Requires written OOS investigation SOP
- Phase I must include: analyst interview, equipment review, reagent/reference standard check, sample integrity check, re-calculation, method review
- Phase II must include: supervisory review, extended investigation, impact assessment, CAPA
- Timeline: 30 calendar days for investigation completion, with documented extensions only for justified cause
- Trend monitoring: OOS rates must be tracked and reviewed as part of annual product quality review (APQR)

**Vent Implication:** The trending dashboard is a regulatory requirement, not a nice-to-have. OOS rates by product, test, analyst, and laboratory must be calculable and reportable for APQR/Annual Product Review purposes.

### 1.8 PIC/S PI 006-3 (2007) — Recommendations on Validation Master Plans, Installation and Operational Qualification, Non-Sterile Process Validation, Cleaning Validation

While not directly about OOS, PIC/S guidance reinforces that validated analytical methods underpin the OOS investigation process. If a method is not properly validated, any OOS result against that method specification has a different investigation context.

**Vent Implication:** The OOS investigation should link to the method validation status (from `qc_methods` table). If the method's validation is expired or overdue for revalidation, this should be flagged as a contributing factor in the Phase I investigation.

---

## 2. Two-Phase Investigation Model

### 2.1 Phase I — Laboratory Investigation

Phase I is the immediate laboratory-level investigation conducted by the QC laboratory supervisor or designated investigator. Its sole purpose is to determine whether the OOS result can be attributed to an assignable laboratory error.

**Timeline:** Must complete within **1 business day** per FDA guidance ("expeditiously, normally within a few days"). Industry best practice is 1 business day for the initial assessment, with up to 3 business days for completion of all Phase I checklist items.

**Who conducts Phase I:** The laboratory supervisor or a designated QC investigator — never the original analyst alone. The analyst must be interviewed, but the investigation must be led by an independent party.

**Phase I Checklist — Mandatory Items:**

| Step | Description | Evidence Required |
|------|-------------|-------------------|
| 1. Analyst Interview | Interview the analyst who performed the test. Determine: Did they follow the SOP? Any unusual observations? Any equipment issues noticed? Any deviations from normal procedure? Were calculations performed correctly? | Documented interview summary, signed by both interviewer and analyst, timestamped |
| 2. Calculation Verification | Re-perform all calculations from raw data. Check dilution factors, unit conversions, standard curve interpolation, system suitability evaluation. | Documented recalculation with before/after comparison |
| 3. Equipment Check | Verify that all instruments used were: calibrated and within calibration period, qualified (IQ/OQ/PQ current), functioning properly on the day of testing, and that system suitability tests (SST) passed. Review equipment logbooks for the relevant period. | Equipment status verification form, SST results, logbook excerpts |
| 4. Reagent/Standard Review | Verify that all reagents and reference standards used were: within expiry date, properly stored, correctly prepared, from qualified lots. Check preparation logbooks. | Reagent/standard verification with lot numbers and expiry dates |
| 5. Sample Integrity | Assess whether the test sample was: properly stored before testing, within its hold time, not degraded or contaminated, representative of the batch, correctly identified and labeled. | Sample chain-of-custody review, storage condition verification |
| 6. Method Review | Verify that the correct analytical method version was used, that all method parameters were followed, and that the method is within its validated range for the analyte concentration in question. | Method version verification, parameter compliance check |
| 7. Glassware/Consumables Check | Verify that volumetric glassware was calibrated, columns were within use limits (for chromatography), filters were compatible, pipettes were calibrated. | Calibration records, use-count logs |
| 8. Environmental Conditions | Verify that laboratory temperature, humidity, and other environmental conditions were within specified limits during testing. | Environmental monitoring records for the testing period |
| 9. Re-preparation (if applicable) | If the Phase I investigation suggests a possible sample preparation error, a re-preparation from the original sample may be performed. This is NOT a retest — it uses the same sample aliquot and the same analyst, attempting to reproduce the original result. | Re-preparation results with side-by-side comparison |
| 10. Re-injection (if applicable) | For chromatographic methods, re-injection of the same prepared sample can rule out injection variability. This is NOT a retest. | Re-injection results, system suitability data |

**Phase I Conclusions (mutually exclusive):**

1. **Assignable laboratory error found:** The OOS result is invalidated. The specific error must be documented with objective evidence. The test must be repeated from scratch, and the retest result stands as the reportable result. Common assignable causes include:
   - Calculation error (mathematically demonstrable)
   - Incorrect standard or reagent used (documented via lot number mismatch)
   - Equipment malfunction (confirmed by calibration check or SST failure)
   - Sample preparation error (e.g., wrong dilution, documented via logbook review)
   - Method deviation (documented departure from SOP, confirmed by analyst interview)

2. **No assignable laboratory error found:** The Phase I investigation is inconclusive at the laboratory level. **The OOS result stands as a valid data point.** The investigation must escalate to Phase II.

3. **Inconclusive at Phase I level:** There are suspicions of a possible laboratory error but insufficient evidence to confirm an assignable cause. **The OOS result cannot be invalidated.** Escalation to Phase II is required.

**Critical rules for Phase I:**
- The analyst cannot self-investigate — an independent person must lead
- "Analyst error" without specific, documented evidence is NOT an assignable cause
- Retesting is NOT part of Phase I (re-preparation and re-injection from the same sample are permitted as diagnostic tools, but formal retesting requires a separate protocol)
- The Phase I investigation cannot be used to "fish" for a laboratory error to invalidate the OOS

**Vent Implication:** The Phase I investigation must be a structured form with mandatory checklist items, not a free-text narrative. Each checklist item must be individually completed and signed. The system must enforce that Phase I cannot be closed as "lab error" without at least one assignable cause selected and documented with evidence. The original analyst must be recorded, and the investigator must be a different person.

### 2.2 Phase II — Full-Scale Investigation

Phase II is initiated when Phase I does not identify an assignable laboratory error. It expands the investigation beyond the laboratory to include production, process, and cross-functional assessment.

**Timeline:** Must be completed within **30 calendar days** of initiation. Extensions must be documented and justified, with an interim report filed at the 30-day mark if the investigation is still open.

**Who conducts Phase II:** A cross-functional investigation team typically including:
- QC laboratory supervisor (continues from Phase I)
- QA representative (investigation lead)
- Production representative
- Engineering/maintenance representative (if equipment is implicated)
- Regulatory affairs (if the OOS may affect filed specifications)
- Subject matter expert (method developer, process scientist)

**Phase II Components:**

#### 2.2.1 Production/Process Investigation
- Review of the batch production record for the affected batch
- Review of in-process control data and process parameter trends
- Interview of production operators who manufactured the batch
- Assessment of equipment performance during manufacturing (CIP/SIP records, bioreactor parameter logs, column chromatography profiles)
- Review of raw material/component lot records
- Environmental monitoring data for the production area during manufacturing

#### 2.2.2 Retesting Protocol (if applicable)
Retesting is only permitted during Phase II and must follow a pre-approved protocol:
- **Number of retests must be predetermined** — not open-ended
- Industry standard: retest in duplicate or triplicate from the original sample (6 determinations total per USP <621> statistical framework)
- Retesting should ideally be performed by a **different qualified analyst**
- All retest results — passing and failing — must be reported
- **Outlier testing** (e.g., Dixon's Q-test, Grubbs' test) may be applied to the combined original + retest dataset, but only if the retest protocol specifies this in advance
- If retests also fail: the OOS is confirmed. No further retesting is permitted.
- If retests pass: statistical evaluation of the combined dataset is required. The passing retests do not automatically invalidate the original OOS.

#### 2.2.3 Resampling Protocol (if applicable)
Resampling (collecting a new sample from the batch) is permitted only under specific conditions:
- The investigation provides documented evidence that the original sample was not representative (e.g., sampling error, contamination, homogeneity issue)
- Resampling is performed per an approved resampling protocol
- The original OOS result is still retained and reported — it is not replaced by the resample result
- For homogeneity-dependent tests, additional sampling locations may be justified

#### 2.2.4 Root Cause Analysis
The Phase II investigation must identify a root cause from the following categories:

| Category | Description | Examples |
|----------|-------------|----------|
| Lab Error — Confirmed | Definitive assignable cause in the laboratory (should have been caught in Phase I, but sometimes additional evidence emerges) | Post-Phase I discovery of reagent contamination, analyst qualification lapse |
| Process-Related | Root cause is in the manufacturing process | Raw material variability, process parameter excursion, equipment malfunction during production, environmental excursion |
| Method-Related | The analytical method itself has an issue | Method robustness failure, matrix interference, method transfer issue |
| Sampling Error | The OOS result reflects a sampling issue rather than true batch quality | Non-representative sample, sampling technique error, sample degradation during storage/transport |
| Confirmed OOS | The batch genuinely does not meet specifications | True batch failure, process capability issue, specification set too tightly for the process |
| Inconclusive | Root cause cannot be determined despite thorough investigation | No assignable cause found after exhaustive investigation |

#### 2.2.5 Batch Impact Assessment
- Identify all batches that could be affected by the same root cause
- For production-related root causes: all batches manufactured during the same campaign, on the same equipment, using the same raw material lots
- For laboratory-related root causes: all batches tested by the same analyst, on the same instrument, during the same calibration period, using the same reagent/standard lots
- For method-related root causes: all batches tested using the same method version
- Each potentially affected batch must be individually assessed and either cleared or flagged for additional testing/investigation

#### 2.2.6 CAPA Linkage
Phase II closure requires:
- At least one CAPA (Corrective and Preventive Action) linked to the investigation, unless the root cause is "confirmed OOS" with batch rejection (in which case a preventive action addressing the process capability issue is still expected)
- CAPAs must address both the immediate cause and the systemic/root cause
- CAPA effectiveness must be verified at a later date

#### 2.2.7 Final Disposition
The Phase II investigation must conclude with a formal disposition of the original OOS result and the affected batch:

| Disposition | Meaning | Batch Action |
|-------------|---------|--------------|
| Lab Error — Invalidated | The OOS was caused by a confirmed, documented laboratory error. The original result is invalidated and the retest/resample result is the reportable value. | Batch may proceed to release (subject to all other release criteria) |
| Confirmed OOS | The batch genuinely fails its specification. The OOS result is valid and reportable. | Batch must be rejected, reprocessed (if permitted), or subjected to alternative disposition (e.g., rework per approved procedure) |
| Inconclusive — OOS Stands | Root cause was not determined. Per regulatory guidance, the original OOS result must be treated as a valid result. | Batch disposition determined by QA based on cumulative data, risk assessment, and product criticality. Typically rejected unless comprehensive justification exists. |

**Vent Implication:** Phase II must be a separate workflow layer (not just additional fields on the qc_results record). It needs its own assignees, due dates, checklist items, root cause taxonomy, batch impact matrix, and CAPA linkage. The current `qc_results` table's OOS fields are insufficient for a full Phase II workflow. A dedicated `oos_investigations` table is recommended.

### 2.3 Investigation Hierarchy and Relationships

```
OOS Result (qc_results.oos_flag = true)
└── OOS Investigation (oos_investigations)
    ├── Phase I (oos_phase1_checklist)
    │   ├── Analyst Interview Record
    │   ├── Calculation Verification
    │   ├── Equipment Check
    │   ├── Reagent/Standard Review
    │   ├── Sample Integrity Check
    │   ├── Method Review
    │   ├── Environmental Review
    │   ├── Re-preparation Results (optional)
    │   └── Re-injection Results (optional)
    ├── Phase II (oos_phase2)
    │   ├── Production Investigation
    │   ├── Retest Protocol & Results
    │   ├── Root Cause Analysis
    │   ├── Batch Impact Assessment (oos_batch_impact)
    │   ├── Cross-batch Review Matrix
    │   └── Statistical Evaluation
    ├── CAPA Linkage (linked to capa_actions)
    └── Final Disposition & Closure
```

---

## 3. Key Data Fields & Schema Design

### 3.1 OOS Investigation Master Record

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| oos_id | TEXT (OOS-XXXX) | Yes | Unique OOS investigation identifier |
| result_id | TEXT (QCR-XXXX) | Yes | FK to the originating qc_results record |
| sample_id | TEXT (QCS-XXXX) | Yes | FK to the sample |
| test_id | TEXT (QCT-XXXX) | Yes | FK to the test |
| batch_id | TEXT | Yes | Batch/lot number of the affected product |
| product_name | TEXT | Yes | Product name |
| test_method | TEXT | Yes | Reference to the analytical method used |
| test_method_version | TEXT | No | Specific version of the method |
| specification_min | NUMERIC | No | Lower specification limit |
| specification_max | NUMERIC | No | Upper specification limit |
| specification_text | TEXT | No | Text-based specification (for pass/fail tests) |
| actual_result | NUMERIC | No | The OOS result value |
| actual_result_text | TEXT | No | Text result (for non-numeric tests) |
| result_unit | TEXT | No | Unit of measurement |
| original_analyst | TEXT | Yes | The analyst who performed the original test |
| equipment_ids | JSONB | No | Array of equipment IDs used in testing |
| phase | TEXT | Yes | Current phase: 'phase_1', 'phase_2', 'closed' |
| status | TEXT | Yes | 'open', 'in_progress', 'escalated', 'pending_capa', 'pending_approval', 'closed' |
| priority | TEXT | No | 'critical', 'high', 'medium', 'low' |
| due_date | TIMESTAMPTZ | Yes | Investigation due date (3 days for Phase I, 30 days for Phase II) |
| phase1_started_at | TIMESTAMPTZ | Yes | When Phase I investigation began |
| phase1_completed_at | TIMESTAMPTZ | No | When Phase I was completed |
| phase1_investigator | TEXT | Yes | Person conducting Phase I (must differ from original_analyst) |
| phase1_conclusion | TEXT | No | 'lab_error_found', 'no_lab_error', 'inconclusive' |
| phase1_assignable_cause | TEXT | No | Specific cause identified in Phase I |
| phase1_evidence | TEXT | No | Documentation of evidence supporting Phase I conclusion |
| phase2_started_at | TIMESTAMPTZ | No | When Phase II investigation began |
| phase2_completed_at | TIMESTAMPTZ | No | When Phase II was completed |
| phase2_lead | TEXT | No | QA person leading Phase II |
| phase2_team | JSONB | No | Array of team members involved |
| root_cause_category | TEXT | No | Taxonomy category (see Section 2.2.4) |
| root_cause_detail | TEXT | No | Detailed root cause description |
| retest_protocol_id | TEXT | No | Reference to approved retest protocol |
| retest_performed | BOOLEAN | No | Whether retesting was performed |
| retest_results | JSONB | No | Array of retest result values |
| retest_analyst | TEXT | No | Analyst who performed retests |
| resample_performed | BOOLEAN | No | Whether resampling was performed |
| resample_justification | TEXT | No | Justification for resampling |
| statistical_evaluation | JSONB | No | Statistical test results (outlier tests, confidence intervals) |
| final_disposition | TEXT | No | 'lab_error_invalidated', 'confirmed_oos', 'inconclusive_oos_stands' |
| batch_impact_assessment | JSONB | No | Structured impact assessment (see 3.3) |
| linked_capa_ids | JSONB | No | Array of CAPA IDs linked to this investigation |
| linked_deviation_id | TEXT | No | FK to deviation if one was raised |
| linked_change_control_id | TEXT | No | FK to change control if method/process change results |
| closure_summary | TEXT | No | Final investigation summary narrative |
| closed_by | TEXT | No | QA approver who closed the investigation |
| closed_at | TIMESTAMPTZ | No | Closure timestamp |
| extension_requested | BOOLEAN | No | Whether a timeline extension was requested |
| extension_justification | TEXT | No | Reason for extension |
| extension_approved_by | TEXT | No | Who approved the extension |
| extension_new_due_date | TIMESTAMPTZ | No | Extended due date |
| created_by | TEXT | Yes | User who initiated the investigation |
| created_at | TIMESTAMPTZ | Yes | Record creation timestamp |
| updated_at | TIMESTAMPTZ | Yes | Last modification timestamp |

### 3.2 Phase I Checklist Record

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| checklist_id | TEXT (OSCHK-XXXX) | Yes | Unique checklist item ID |
| oos_id | TEXT (OOS-XXXX) | Yes | FK to parent investigation |
| check_type | TEXT | Yes | One of: 'analyst_interview', 'calculation_verification', 'equipment_check', 'reagent_review', 'sample_integrity', 'method_review', 'glassware_check', 'environmental_review', 'repreparation', 'reinjection' |
| status | TEXT | Yes | 'pending', 'pass', 'fail', 'not_applicable' |
| findings | TEXT | No | Detailed findings for this check |
| evidence_refs | JSONB | No | References to supporting documents/records |
| completed_by | TEXT | No | Person who performed this check |
| completed_at | TIMESTAMPTZ | No | When this check was completed |
| e_signature | JSONB | No | E-signature record (user, meaning, timestamp) |

### 3.3 Batch Impact Assessment Record

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| impact_id | TEXT (OSBI-XXXX) | Yes | Unique impact record ID |
| oos_id | TEXT (OOS-XXXX) | Yes | FK to parent investigation |
| batch_id | TEXT | Yes | Potentially affected batch |
| product_name | TEXT | Yes | Product name |
| relationship | TEXT | Yes | Why this batch is potentially affected: 'same_analyst', 'same_equipment', 'same_method', 'same_reagent_lot', 'same_campaign', 'same_raw_material' |
| assessment | TEXT | No | 'cleared', 'additional_testing_required', 'quarantined', 'rejected' |
| assessment_detail | TEXT | No | Justification for assessment |
| assessed_by | TEXT | No | Person who assessed |
| assessed_at | TIMESTAMPTZ | No | Assessment timestamp |

### 3.4 ID Prefix Recommendations

| Entity | Prefix | Pattern |
|--------|--------|---------|
| OOS Investigation | OOS- | OOS-1000..9999 |
| Phase I Checklist Item | OSCHK- | OSCHK-1000..9999 |
| Batch Impact Record | OSBI- | OSBI-1000..9999 |
| OOT Alert | OOT- | OOT-1000..9999 |

---

## 4. Decision Trees

### 4.1 OOS Result Detection → Phase I Initiation

```
QC Result Entered
│
├── Result within specification limits?
│   ├── YES → Check OOT (trending) limits
│   │         ├── Within OOT limits → PASS (routine)
│   │         └── Outside OOT limits → Generate OOT Alert (see Section 6)
│   │
│   └── NO → OOS FLAGGED
│            │
│            ├── Auto-notify QC Supervisor
│            ├── Auto-quarantine batch (if not already quarantined)
│            ├── Create OOS Investigation record (OOS-XXXX)
│            ├── Assign Phase I Investigator (≠ original analyst)
│            ├── Set Phase I due date (current date + 1 business day)
│            ├── Generate Phase I Checklist (10 items)
│            └── Block batch disposition until investigation closes
```

### 4.2 Phase I Completion → Escalation Decision

```
Phase I Checklist Complete
│
├── Assignable laboratory error identified?
│   │
│   ├── YES — Documented with objective evidence?
│   │   │
│   │   ├── YES → Phase I Conclusion: LAB ERROR FOUND
│   │   │         ├── Original OOS result INVALIDATED
│   │   │         ├── Retest required (new sample prep, ideally different analyst)
│   │   │         ├── Retest result = reportable result
│   │   │         ├── QA review and approval of invalidation required
│   │   │         ├── CAPA for lab error (if systemic)
│   │   │         └── Investigation CLOSED at Phase I
│   │   │
│   │   └── NO → Cannot invalidate without documented evidence
│   │             └── ESCALATE to Phase II
│   │
│   └── NO — No assignable laboratory error found
│       │
│       └── ESCALATE to Phase II
│           ├── Set Phase II due date (Phase I completion + 30 calendar days)
│           ├── Assign Phase II Lead (QA)
│           ├── Form cross-functional team
│           ├── Initiate production investigation
│           └── Determine if retesting is warranted
```

### 4.3 Retesting Decision Tree

```
Phase II — Retesting Decision
│
├── Is retesting scientifically justified?
│   │
│   ├── NO → Proceed with investigation using original data only
│   │
│   └── YES → Pre-approved retest protocol exists?
│       │
│       ├── NO → Create and approve retest protocol BEFORE retesting
│       │         (number of retests, statistical evaluation method,
│       │          acceptance criteria must be pre-specified)
│       │
│       └── YES → Execute retest protocol
│                 │
│                 ├── Assign different qualified analyst (preferred)
│                 ├── Use same (or equivalent) method and equipment
│                 ├── Record ALL retest results
│                 │
│                 ├── Retest results also OOS?
│                 │   └── YES → OOS CONFIRMED
│                 │             ├── No further retesting permitted
│                 │             ├── Batch rejection or reprocessing decision
│                 │             └── Root cause investigation continues
│                 │
│                 └── Retest results within specification?
│                     └── YES → Statistical evaluation required
│                               ├── Apply outlier test (Dixon Q, Grubbs)
│                               ├── Evaluate total dataset (original + retests)
│                               ├── Can original be identified as statistical outlier?
│                               │   ├── YES → Document statistical basis
│                               │   │         └── Additional investigation of root cause still required
│                               │   └── NO → Original OOS cannot be excluded
│                               │             └── Report all results, assess batch holistically
│                               └── Final disposition by QA based on totality of data
```

### 4.4 Phase II Closure Decision Tree

```
Phase II Investigation Complete
│
├── Root cause identified?
│   │
│   ├── YES — Lab Error (late discovery)
│   │   ├── Document evidence (must be more compelling than Phase I evidence)
│   │   ├── QA review of evidence
│   │   ├── If approved: original result invalidated, retest = reportable
│   │   ├── CAPA required (why was this missed in Phase I?)
│   │   └── Close investigation
│   │
│   ├── YES — Process/Manufacturing Related
│   │   ├── Document manufacturing root cause
│   │   ├── Batch impact assessment (all related batches)
│   │   ├── OOS result CONFIRMED (valid, reportable)
│   │   ├── Batch rejection or reprocessing per approved procedure
│   │   ├── CAPA required (corrective + preventive)
│   │   ├── Assess need for Change Control
│   │   └── Close investigation
│   │
│   ├── YES — Sampling Error
│   │   ├── Document sampling root cause
│   │   ├── If resampled: evaluate resample data
│   │   ├── CAPA for sampling procedure
│   │   └── Close investigation
│   │
│   └── NO — Root cause not determined
│       ├── Conclusion: INCONCLUSIVE
│       ├── Original OOS result STANDS (valid, reportable)
│       ├── Batch disposition: typically reject (QA decision)
│       ├── CAPA required (preventive measures)
│       ├── Enhanced monitoring for future batches
│       └── Close investigation with documented justification
│
├── CAPA linked?
│   ├── NO → Cannot close Phase II without CAPA linkage
│   └── YES → Proceed to closure
│
├── Batch impact assessment complete?
│   ├── NO → Cannot close without impact assessment
│   └── YES → Proceed to closure
│
└── QA Head approval
    ├── Approved → Investigation CLOSED
    └── Returned → Address QA comments, resubmit
```

---

## 5. Trending & Metrics

### 5.1 Required KPIs

Regulatory guidance (FDA, EU GMP, WHO) and industry best practices require the following OOS metrics to be tracked and reported, typically as part of the Annual Product Quality Review (APQR) or Product Quality Review (PQR):

| Metric | Description | Calculation | Regulatory Basis |
|--------|-------------|-------------|-----------------|
| **OOS Rate (Overall)** | Percentage of all test results that are OOS | (OOS results / Total results) x 100 | FDA Guidance, EU GMP 6.35, ICH Q10 |
| **OOS Rate by Product** | OOS rate broken down by product/drug substance | Per product: (OOS / Total tests for product) x 100 | 21 CFR 211.180(e) APQR |
| **OOS Rate by Test** | OOS rate by analytical test type | Per test: (OOS / Total runs of test) x 100 | Trend identification |
| **OOS Rate by Analyst** | OOS rate per analyst | Per analyst: (OOS / Total results by analyst) x 100 | Analyst competency assessment |
| **OOS Rate by Laboratory** | OOS rate by lab location (for multi-site) | Per lab: (OOS / Total results from lab) x 100 | Multi-site comparison |
| **OOS Rate by Equipment** | OOS rate by instrument/equipment | Per instrument: (OOS / Total results on instrument) x 100 | Equipment qualification |
| **Phase I Resolution Rate** | Percentage of OOS investigations resolved at Phase I | (Phase I closures / Total OOS investigations) x 100 | Investigation effectiveness |
| **Phase II Resolution Rate** | Percentage resolved at Phase II (vs. inconclusive) | (Phase II with root cause / Total Phase II) x 100 | Investigation quality |
| **Confirmed OOS Rate** | Percentage of all OOS that are confirmed (true OOS) | (Confirmed OOS / Total OOS) x 100 | Process capability |
| **Lab Error Rate** | Percentage of OOS attributed to lab error | (Lab error closures / Total OOS) x 100 | Lab competency indicator; abnormally high rate is a red flag |
| **Inconclusive Rate** | Percentage of OOS where root cause was not found | (Inconclusive / Total OOS) x 100 | Investigation quality; high rate is a red flag |
| **Average Time-to-Close (Phase I)** | Mean days from OOS detection to Phase I completion | Average(phase1_completed_at - phase1_started_at) | Timeliness |
| **Average Time-to-Close (Phase II)** | Mean days from Phase II start to closure | Average(closed_at - phase2_started_at) | Compliance with 30-day requirement |
| **Overdue Investigation Rate** | Percentage of investigations exceeding due date | (Overdue / Total open or closed) x 100 | FDA audit focus area |
| **Recurring OOS Patterns** | Tests/products/analysts with OOS in 3+ consecutive or recent batches | Pattern detection algorithm | Systemic issue identification |
| **CAPA Effectiveness** | Rate of OOS recurrence after CAPA implementation | (Recurrences post-CAPA / Total CAPAs) x 100 | CAPA adequacy |

### 5.2 Dashboard Visualizations

| Visualization | Purpose | Update Frequency |
|---------------|---------|-----------------|
| OOS trend line (12-month rolling) | Show OOS rate trajectory over time | Real-time |
| OOS by root cause category (pie/donut) | Distribution of root causes | Real-time |
| Phase I vs. Phase II resolution (stacked bar) | Investigation depth required | Real-time |
| Heat map: product x test | Identify high-OOS combinations | Weekly |
| Analyst OOS comparison (bar chart) | Identify analysts needing retraining | Monthly |
| Time-to-close histogram | Distribution of investigation durations | Real-time |
| Overdue investigations table | Action list for QA management | Real-time |
| OOS rate vs. industry benchmark | Contextual comparison (typical pharma OOS rate: 1-3%) | Quarterly |

### 5.3 Alert Thresholds

| Alert | Condition | Action |
|-------|-----------|--------|
| Individual OOS | Any single OOS result | Auto-initiate Phase I investigation |
| Analyst OOS spike | Analyst OOS rate > 2x lab average in rolling 30-day window | Notify QC supervisor, trigger competency review |
| Product OOS trend | Product OOS rate exceeds 3% (or 2x historical average) in rolling quarter | Notify QA head, trigger product review |
| Test method OOS trend | Specific test OOS rate exceeds 5% (or 3x historical average) | Notify method owner, consider method revalidation |
| Equipment OOS cluster | 3+ OOS results on same instrument within 30 days | Trigger instrument re-qualification |
| Overdue investigation | Investigation exceeds due date | Daily escalation emails to QA head |
| Phase II 30-day warning | Phase II investigation at 25 days without closure | Alert to QA head and investigation lead |

---

## 6. Out-of-Trend (OOT) Detection

### 6.1 OOT vs. OOS — Regulatory Distinction

| Aspect | OOS | OOT |
|--------|-----|-----|
| **Definition** | Result falls outside the registered specification limits | Result is within specification but shows an atypical trend or deviation from historical pattern |
| **Regulatory status** | Mandatory investigation per FDA/EU GMP | Not explicitly mandated by FDA guidance, but expected per ICH Q10 and EU GMP as part of PQR. WHO TRS 1006 explicitly requires OOT monitoring |
| **Trigger** | Hard specification breach | Statistical deviation from historical mean/trend |
| **Investigation requirement** | Full two-phase investigation | Risk-based assessment; may or may not require formal investigation |
| **Batch impact** | Batch quarantined; cannot release until investigation closes | Batch may proceed (result is technically in-spec) but trend must be evaluated |
| **Preventive value** | Reactive — the failure has already occurred | **Proactive — can detect process drift before OOS occurs** |

### 6.2 OOT Detection Methods

#### 6.2.1 Warning Limits and Action Limits

A two-tier alert system based on statistical process control (SPC) principles:

- **Warning Limits (Alert Limits):** Typically set at Mean +/- 2 standard deviations (2-sigma) of historical results for the same test/product combination. An OOT at the warning level triggers enhanced monitoring but not necessarily investigation.
- **Action Limits:** Typically set at Mean +/- 3 standard deviations (3-sigma), or at a pre-defined percentage of the specification limit (e.g., 80% or 90% of the spec range). An OOT at the action level triggers a formal assessment and potentially an investigation.

| Limit Type | Statistical Basis | Expected False Positive Rate | Response |
|------------|-------------------|------------------------------|----------|
| Warning (2-sigma) | Mean +/- 2 SD | ~5% (1 in 20) | Log, monitor, assess at next result |
| Action (3-sigma) | Mean +/- 3 SD | ~0.3% (1 in 370) | Formal OOT assessment, consider investigation |
| Specification | Registered limit | 0% (by definition, it's a specification) | OOS investigation (Phase I/II) |

#### 6.2.2 Trend Rules (Nelson/Western Electric Rules)

Beyond individual data point alerts, OOT detection should include pattern rules that identify trends even when individual points are within limits:

| Rule | Description | Interpretation |
|------|-------------|----------------|
| **Rule 1** | 1 point beyond 3-sigma | Likely special cause |
| **Rule 2** | 9 consecutive points on the same side of the mean | Process shift |
| **Rule 3** | 6 consecutive points steadily increasing or decreasing | Systematic drift |
| **Rule 4** | 14 consecutive points alternating up and down | Non-random pattern (possible over-adjustment) |
| **Rule 5** | 2 out of 3 points beyond 2-sigma (same side) | Early warning of shift |
| **Rule 6** | 4 out of 5 points beyond 1-sigma (same side) | Subtle shift |
| **Rule 7** | 15 consecutive points within 1-sigma | Reduced variability (not always bad, but investigate) |
| **Rule 8** | 8 consecutive points beyond 1-sigma (either side) | Mixture of populations |

**Vent Implication:** The OOT detection engine should evaluate each new result against Rules 1-6 at minimum. Rule detection should use a rolling window of the last 20-30 results for the same test/product/method combination. Results from failed investigations (confirmed lab errors) should be excluded from the trend dataset.

#### 6.2.3 Regression-Based Trend Analysis

For stability testing and time-dependent trending:
- Linear regression of results against time
- Slope significance testing (is the trend statistically significant?)
- Shelf-life prediction based on regression extrapolation
- Confidence interval approach per ICH Q1E

#### 6.2.4 CUSUM (Cumulative Sum) Charts

More sensitive to small, sustained shifts than Shewhart charts:
- Calculate cumulative sum of deviations from target value
- V-mask or tabular CUSUM decision rules
- Particularly useful for stability and in-process control monitoring

### 6.3 OOT Investigation Workflow

```
OOT Detected (result within spec but outside statistical limits)
│
├── Warning Level (2-sigma)
│   ├── Auto-log OOT alert (OOT-XXXX)
│   ├── Flag result on dashboard
│   ├── Enhanced monitoring: next 3 results for same test/product watched closely
│   └── No formal investigation required unless pattern persists
│
└── Action Level (3-sigma or trend rule triggered)
    ├── Auto-log OOT alert (OOT-XXXX)
    ├── Notify QC supervisor
    ├── QC supervisor assessment required within 2 business days
    ├── Assessment options:
    │   ├── No concern — document rationale, close alert
    │   ├── Enhanced monitoring — extend watch to next 5 results
    │   ├── Investigate — initiate OOT investigation (lighter than OOS)
    │   └── Escalate to OOS investigation — if assessment suggests specification breach is imminent
    └── All assessments documented with e-signature
```

### 6.4 OOT Data Fields

| Field | Type | Description |
|-------|------|-------------|
| oot_id | TEXT (OOT-XXXX) | Unique OOT alert identifier |
| result_id | TEXT | FK to the triggering result |
| sample_id | TEXT | FK to the sample |
| test_id | TEXT | FK to the test |
| alert_level | TEXT | 'warning' or 'action' |
| trigger_type | TEXT | 'two_sigma', 'three_sigma', 'trend_rule', 'regression' |
| trigger_rule | TEXT | Specific rule triggered (e.g., 'nelson_rule_2', 'cusum_shift') |
| historical_mean | NUMERIC | Mean of the historical dataset used for evaluation |
| historical_sd | NUMERIC | Standard deviation of the historical dataset |
| historical_n | INTEGER | Number of data points in the historical dataset |
| deviation_magnitude | NUMERIC | How far the result deviates from the mean (in SD units) |
| assessment_status | TEXT | 'pending', 'no_concern', 'monitoring', 'investigating', 'escalated_to_oos' |
| assessment_notes | TEXT | Assessor's documented rationale |
| assessed_by | TEXT | Person who assessed the OOT |
| assessed_at | TIMESTAMPTZ | Assessment timestamp |
| linked_oos_id | TEXT | FK to OOS investigation if escalated |

---

## 7. AI Opportunities

### 7.1 Proactive OOT Detection — "Predict Before It Fails"

**The single highest-value AI opportunity in the OOS domain.** Rather than waiting for a specification breach, AI can detect trends that predict an upcoming OOS, giving the lab time to investigate and intervene before a batch fails.

**Implementation:**
- Train a time-series model on historical results for each test/product combination
- Use rolling window analysis (last 20-50 results) to detect:
  - Gradual drift toward a specification limit
  - Increasing variability (widening standard deviation)
  - Change-point detection (CUSUM-based or Bayesian)
  - Seasonality or periodicity in results
- Generate proactive alerts with estimated time-to-breach

**Prompt engineering approach (using Claude):**
```
Given the following time-series of {test_name} results for {product_name}:
[array of {date, value, analyst, equipment} objects]

Specification limits: {min} to {max} {unit}

Analyze this series for:
1. Statistical trend (is there a drift toward either spec limit?)
2. Variability change (is the spread increasing?)
3. Pattern detection (Nelson rules, seasonal patterns, analyst-dependent patterns)
4. Predicted time to potential OOS breach (if trend continues)
5. Risk level: low / medium / high / critical
6. Recommended actions
```

**Value proposition:** An OOS investigation costs 40-120 hours of staff time and can cost $50,000-$500,000+ in batch delays. Preventing even one OOS per quarter through proactive OOT detection could save $200K-$2M annually for a mid-size biologics facility.

**Vent implementation:** Extend the existing `aiAnomaly` function in `qc-lab.service.js` to include time-series trend analysis. The current anomaly detection is per-result; the trend analysis should evaluate the last N results as a series.

### 7.2 Root Cause Suggestion from Historical Data

**Current state:** The `aiOosRootcause` function in `qc-lab.service.js` already queries historical OOS investigations and provides root cause suggestions. This is a strong foundation.

**Enhancement opportunities:**
- Cluster historical OOS investigations by root cause category and extract feature patterns (which tests, products, analysts, equipment, environmental conditions correlate with which root causes)
- When a new OOS occurs, compare its feature vector against historical clusters to suggest the most likely root cause categories with confidence levels
- Include successful Phase I investigations (where lab error was found) as training data, not just Phase II closures
- Factor in temporal context: recent changes (method updates, new reagent lots, equipment maintenance, new analysts) that correlate with the OOS timing

**Enhanced prompt:**
```
An OOS result has been flagged. Based on historical data, suggest likely root causes.

CURRENT OOS CONTEXT:
- Test: {test_name}, Method: {method_version}
- Product: {product_name}, Batch: {batch_id}
- Result: {value} {unit} (Spec: {min}-{max})
- Analyst: {analyst_name} (OOS rate: {analyst_oos_rate}%)
- Equipment: {equipment_id} (last calibration: {cal_date}, OOS rate on this instrument: {equip_oos_rate}%)
- Reagent lots in use: {reagent_info}
- Recent changes: {recent_changes}  (method updates, new analysts, equipment maintenance in last 30 days)

HISTORICAL OOS PATTERN SUMMARY:
- Total OOS for this test/product: {n} in last 12 months
- Root cause distribution: {breakdown by category}
- Most common contributing factors: {list}

RECENT OOS FOR SAME TEST/PRODUCT:
{last 5 OOS investigations with root causes}

Provide:
1. Top 3 most likely root cause categories with confidence %
2. Specific factors to investigate first (prioritized)
3. Similar historical investigations and their outcomes
4. Recommended Phase I focus areas based on the pattern
```

### 7.3 Phase I Checklist Auto-Population

When an OOS investigation is initiated, AI can pre-populate the Phase I checklist with relevant context:

- **Analyst interview:** Pre-populate with analyst's recent activity, training status, and previous OOS involvement
- **Equipment check:** Auto-pull the instrument's calibration status, last maintenance date, recent SST results, and OOS history on this instrument
- **Reagent review:** Auto-pull current reagent lot information, expiry dates, and any other OOS results obtained using the same lots
- **Sample integrity:** Auto-pull chain-of-custody data from the QC sample record, storage temperature logs
- **Method review:** Auto-pull method validation status, version history, and any recent method changes

**Vent implementation:** When `initiateOos()` is called, the service should query related tables and pre-fill the Phase I checklist with contextual data, reducing the investigator's manual data collection time from hours to minutes.

### 7.4 Cross-Batch Impact Analysis

When a Phase II investigation identifies a root cause, AI can automatically identify potentially affected batches:

- Query all batches sharing the identified root cause factor (same analyst, equipment, reagent lot, etc.)
- Rank affected batches by risk level based on temporal proximity, degree of shared factors, and whether their test results were near specification limits
- Generate a structured impact assessment matrix

**Implementation:**
```
A Phase II OOS investigation has identified the following root cause:
Category: {root_cause_category}
Detail: {root_cause_detail}
Contributing factors: {factors}

Identify all potentially affected batches from the following data:
{batch_list with test results, analysts, equipment, dates}

For each potentially affected batch, assess:
1. Risk level (high/medium/low) based on factor overlap
2. Recommended action (additional testing, review existing data, no action needed)
3. Justification for the assessment
```

### 7.5 Investigation Summary Report Generation

At investigation closure, AI can generate a comprehensive investigation report suitable for regulatory review:

- Compile all Phase I and Phase II findings into a structured narrative
- Include timeline of events, evidence summary, root cause analysis
- Reference relevant regulatory guidance
- Format for printing or PDF export
- Include all data tables, statistical evaluations, and decision justifications

This is particularly valuable because investigation reports are among the most scrutinized documents during FDA inspections. A well-structured, comprehensive report reduces inspection risk significantly.

### 7.6 Predictive Risk Scoring

Assign a risk score to each pending test based on:
- Historical OOS rate for the test/product combination
- Current analyst's OOS rate
- Equipment's OOS history
- Reagent lot age and history
- Environmental conditions
- Stability time-point (later time points have higher OOS risk)

High-risk tests can be flagged for additional attention (e.g., supervisor observation, duplicate testing) before they are run, not after.

### 7.7 Natural Language Querying for OOS Data

Extend Charlie AI (the existing Vent chatbot) to answer OOS-related queries:
- "Show me all OOS investigations for Product X in the last 6 months"
- "What is the most common root cause for assay failures?"
- "Which analyst has the highest OOS rate this quarter?"
- "Are there any overdue OOS investigations?"
- "What is the OOS trend for endotoxin testing?"

---

## 8. 21 CFR Part 11 Compliance

### 8.1 Electronic Records Requirements

Every OOS investigation record constitutes an "electronic record" under Part 11. Requirements:

| Requirement | Part 11 Section | Implementation |
|-------------|-----------------|----------------|
| **Audit trail** | 11.10(e) | Every field change on the OOS investigation record must be logged with: who changed it, when, what the old value was, what the new value is, and why. The audit trail must be computer-generated, timestamped, and append-only (cannot be modified or deleted). |
| **Record integrity** | 11.10(a) | OOS records must be validated to ensure accuracy, reliability, consistent intended performance, and the ability to discern invalid or altered records. |
| **Record retention** | 11.10(c) | OOS records must be retained for the legally required period (typically 1 year past batch expiry or 3 years post-distribution for FDA; varies by jurisdiction). Records must be retrievable and readable throughout the retention period. |
| **Limited system access** | 11.10(d) | Only authorized personnel can create, modify, or close OOS investigations. Role-based access control must enforce: analysts can view but not modify investigations; QC investigators can update Phase I; QA can update Phase II and close; admins can manage system configuration. |
| **Operational system checks** | 11.10(f) | The system must enforce allowed steps/sequencing (e.g., Phase I must be completed before Phase II can begin; investigation cannot be closed without CAPA linkage). |
| **Authority checks** | 11.10(g) | The system must verify that only authorized individuals can perform specific actions (e.g., only QA Head can close a Phase II investigation, only investigators can sign off on Phase I checklist items). |
| **Device checks** | 11.10(h) | The system must verify the source of data input at each access point (session authentication, token-based access). |
| **Training** | 11.10(i) | Users must be trained on the system before being granted access. Link to training matrix module. |

### 8.2 Electronic Signature Requirements

OOS investigations require e-signatures at multiple critical points. Each e-signature under Part 11 must include:

| E-Signature Point | Who Signs | Meaning of Signature | Part 11 Requirement |
|-------|-----------|---------------------|---------------------|
| Phase I Analyst Interview | Interviewer + Analyst | "I conducted/participated in this interview and the recorded content is accurate" | 11.50 — Signature manifestation: printed name, date/time, meaning |
| Phase I Checklist Item Completion | Investigator | "I have completed this check and the findings are accurately recorded" | 11.100 — Electronic signatures must be unique to one individual |
| Phase I Conclusion | QC Supervisor | "I have reviewed all Phase I findings and concur with the conclusion" | 11.70 — Signatures not reusable, administered only by genuine owner |
| Phase II Initiation Approval | QA Representative | "I have reviewed Phase I findings and approve escalation to Phase II" | 11.10(g) — Authority check |
| Phase II Root Cause Approval | Investigation Lead | "I endorse this root cause determination based on the evidence presented" | 11.50 — Meaning of signature |
| Batch Impact Assessment Sign-off | QA Representative | "I have reviewed and approve the batch impact assessment" | 11.100 — Cannot reuse/reassign |
| OOS Result Invalidation (if applicable) | QA Head | "I approve the invalidation of the original OOS result based on documented assignable cause" | Highest-authority signature |
| Investigation Closure | QA Head | "I approve the closure of this OOS investigation and its conclusions" | 11.50 — Tied to electronic record |
| CAPA Linkage Verification | QA Representative | "I have verified that appropriate CAPAs are linked and initiated" | 11.10(f) — Sequencing |

### 8.3 Audit Trail Specifics for OOS

The audit trail for an OOS investigation must capture (at minimum):

```json
{
  "audit_id": "auto-generated",
  "entity_type": "oos_investigation",
  "entity_id": "OOS-1234",
  "action": "phase1_checklist_updated",
  "field_changed": "equipment_check.status",
  "old_value": "pending",
  "new_value": "pass",
  "changed_by": "user_id",
  "changed_at": "2026-03-07T14:32:00Z",
  "ip_address": "10.0.1.42",
  "reason": "Verified HPLC-003 calibration current, SST passing",
  "session_id": "jwt_session_id"
}
```

**Critical audit trail events (must be captured):**
- Investigation creation
- Phase I checklist item completion (each item individually)
- Phase I conclusion submitted
- Escalation to Phase II
- Phase II team assignment changes
- Root cause category selection/change
- Retest protocol approval
- Retest result recording
- Batch impact assessment changes
- CAPA linkage
- Investigation closure
- Any timeline extension request/approval
- Any data modification (with before/after values)
- Any attachment upload/deletion
- Failed access attempts (e.g., analyst trying to close their own investigation)

**Vent implementation:** The existing `auditLog()` infrastructure in `server/lib/audit.js` provides the foundation. For OOS investigations, ensure that:
1. Every mutation to the OOS record calls `auditLog()` with before/after state
2. The `detail` object captures field-level changes, not just the entity-level action
3. The audit log table has an immutable policy (no UPDATE/DELETE allowed, enforced by RLS)
4. Timestamps are server-generated (not client-supplied) to prevent tampering

---

## 9. Current Vent State & Gap Analysis

### 9.1 What Already Exists

The QC Lab module (live, Round 3) includes basic OOS investigation fields embedded in the `qc_results` table:

| Feature | Current Implementation | Location |
|---------|----------------------|----------|
| OOS auto-detection | `createResult()` auto-calculates `oos_flag` by comparing result to specification limits | `qc-lab.service.js` line 350-358 |
| OOS investigation initiation | `initiateOos()` sets phase, status, due date, assignee on the `qc_results` record | `qc-lab.service.js` line 450-464 |
| OOS update | `updateOos()` updates root cause category, conclusion, status, notes | `qc-lab.service.js` line 466-476 |
| OOS escalation to Phase II | `escalateOos()` changes phase to `phase_2`, extends due date to 30 days | `qc-lab.service.js` line 478-491 |
| OOS closure | `closeOos()` sets status to `closed` and records conclusion | `qc-lab.service.js` line 493-503 |
| AI root cause suggestion | `aiOosRootcause()` queries historical OOS and uses Claude to suggest root causes | `qc-lab.service.js` line 896-911 |
| OOS dashboard metrics | `getStats()` counts OOS results and open investigations | `qc-lab.service.js` line 755-756 |
| OOS-related DB fields | `oos_flag`, `oos_investigation_phase`, `oos_investigation_status`, `oos_investigation_due_date`, `oos_assignee`, `oos_root_cause_category`, `oos_conclusion`, `linked_oos_id` | `admin.js` lines 1386-1392 |

### 9.2 Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| **No Phase I structured checklist** | Critical | Phase I is currently a single-step process (initiate → update → close). There is no structured 10-item checklist with individual completion tracking. The FDA expects documented evidence for each investigation step. |
| **No analyst interview record** | Critical | The Phase I analyst interview — the most important step — has no dedicated data structure. It should be a timestamped record with both interviewer and analyst signatures. |
| **No retest protocol enforcement** | High | The `retest` and `retest_reason` fields exist on `qc_results`, but there is no retest protocol workflow: no pre-defined number of retests, no enforcement that retesting only occurs after Phase I, no statistical evaluation of combined results. |
| **No batch impact assessment** | Critical | 21 CFR 211.192 requires cross-batch review. There is no data structure or workflow for identifying and assessing potentially affected batches. |
| **No CAPA linkage enforcement** | High | Phase II investigations should not be closable without linked CAPAs. Currently, `closeOos()` does not check for CAPA linkage. |
| **No timeline extension workflow** | Medium | When investigations cannot be completed within the due date, there is no mechanism to request and approve an extension (with documented justification). |
| **No OOT detection** | High | There is an `oot_flag` field on `qc_results` but no statistical engine to auto-calculate it. OOT alerts are not generated. Trend rules (Nelson, Western Electric) are not implemented. |
| **No investigation report generation** | Medium | No functionality to compile the investigation into a formal report suitable for regulatory review. |
| **OOS fields embedded in qc_results** | Medium | The OOS investigation data is stored as additional columns on the `qc_results` table rather than in a dedicated `oos_investigations` table. This limits the richness of the investigation record and makes it difficult to model the full Phase I/II workflow with proper sub-records. |
| **No e-signature on Phase I/II milestones** | High | The `reviewed_by`/`approved_by` pattern exists for QC results but is not applied to OOS investigation milestones (Phase I completion, Phase II closure, result invalidation). |
| **Deviation module linkage is weak** | Medium | The `linked_oos_id` field exists but the bidirectional relationship between OOS investigations and the Deviation Manager is not enforced or automated. |

### 9.3 Recommendation

**Option A (Recommended): Dedicated OOS Investigation Module**
Build a standalone `oos-investigation` module with its own:
- Database tables (`oos_investigations`, `oos_phase1_checklist`, `oos_batch_impact`, `oos_oot_alerts`)
- Service layer (`oos-investigation.service.js`)
- Route layer (`oos-investigation.js`)
- Frontend page (`docs/qc/oos-investigation.html`)
- Integration points with QC Lab, Deviation Manager, CAPA Tracker, Batch Disposition

This approach provides the richest data model and the cleanest separation of concerns. The QC Lab module's existing `initiateOos()` function becomes a thin wrapper that creates the OOS investigation record and links it back to the `qc_results` record.

**Option B (Lighter touch): Extend QC Lab Module**
Add the missing tables and extend the existing QC Lab service with additional OOS functions. This keeps everything in one module but makes the service layer more complex.

**Recommendation: Option A.** OOS investigation is a complex enough regulatory workflow that it warrants its own module. The QC Lab module is already large (940 lines of service code). FDA auditors expect to see OOS investigations as a distinct, traceable process — not a sub-feature of a results management system.

---

## 10. Competitor Landscape

### 10.1 Enterprise LIMS/QMS Solutions

| System | OOS Handling | Strengths | Weaknesses |
|--------|-------------|-----------|------------|
| **Veeva Vault QMS** | Dedicated OOS Investigation workflow within their Quality suite. Structured Phase I/II with configurable checklists. Audit trail, e-signatures, CAPA integration. | Deep regulatory expertise, pre-validated, configurable workflow engine | Expensive ($100K+/year), complex implementation (6-12 months), requires Veeva ecosystem |
| **MasterControl QMS** | OOS module with deviation/CAPA integration. Structured investigation forms, timeline management, batch impact tracking. | Strong document management, good FDA track record, training management integration | Monolithic architecture, limited AI capabilities, dated UI |
| **TrackWise (Honeywell)** | Mature OOS investigation workflows with configurable forms, escalation rules, and impact assessment. | Deep pharma heritage, highly configurable, strong regulatory pedigree | Legacy technology, expensive, complex administration |
| **Dot Compliance** | Cloud-based QMS with OOS investigation module. Structured workflows, e-signatures, CAPA tracking. | Modern cloud architecture, faster implementation, lower cost than legacy systems | Less mature than enterprise solutions, limited customization |
| **ComplianceQuest** | Salesforce-based QMS with OOS handling within their deviation/investigation module. | Modern platform, mobile-friendly, good integration capabilities | Salesforce dependency, can be expensive, less specialized for pharma |

### 10.2 LIMS-Specific OOS Handling

| System | Approach | Notes |
|--------|----------|-------|
| **LabWare LIMS** | OOS detection at result entry; triggers configurable investigation workflow with Phase I/II stages | Industry standard for large labs; OOS is deeply integrated into the result lifecycle |
| **STARLIMS** | OOS flagging with investigation forms; links to document management for evidence | Abbott/Siemens ecosystem; strong in diagnostics/clinical labs |
| **LabVantage** | Configurable OOS workflow with rules engine for auto-escalation | Web-based architecture; good API for integration |
| **Benchling** | Biotech-focused; OOS detection with limited investigation workflow | Strong for R&D/early-phase; less mature for commercial GMP manufacturing |

### 10.3 Vent Competitive Differentiation Opportunities

1. **AI-first OOT prediction:** No competitor offers proactive OOT prediction using AI/ML. This is the single biggest differentiator Vent can deliver. Catching a trend before it becomes an OOS saves $50K-$500K per prevented failure.

2. **AI root cause suggestion:** While some competitors offer knowledge base lookup, none use LLM-based root cause analysis that can reason across unstructured investigation narratives. Vent's existing `aiOosRootcause()` is already ahead of the market.

3. **Speed of investigation:** Enterprise QMS implementations take 6-12 months and cost $100K+. Vent can deliver a fully functional OOS investigation module as part of the integrated platform with near-instant deployment.

4. **Integrated cross-module intelligence:** Vent's advantage is that OOS investigations, deviations, CAPAs, equipment records, training records, and batch records are all in the same system. Competitors typically require integration between separate systems (LIMS for results, QMS for investigations, ERP for batch records). Vent can auto-pull contextual data from all these sources instantly.

5. **Natural language investigation querying:** Charlie AI can answer regulatory questions about OOS investigations in natural language — a capability no competitor offers.

---

## 11. Implications for the Vent Spec

### 11.1 Database Tables Required

1. **`oos_investigations`** — Master investigation record (see Section 3.1)
2. **`oos_phase1_checklist`** — Individual Phase I checklist items with completion tracking (see Section 3.2)
3. **`oos_batch_impact`** — Batch impact assessment records (see Section 3.3)
4. **`oos_oot_alerts`** — OOT alert records (see Section 6.4)
5. **`oos_retest_protocols`** — Pre-approved retest protocols (number of retests, statistical method, acceptance criteria)

### 11.2 Service Functions Required

```
// Investigation lifecycle
createInvestigation({ resultId, ... })     — Auto-create from OOS-flagged result
getInvestigation(oosId)                     — Fetch full investigation with sub-records
listInvestigations({ status, phase, ... })  — Filtered listing
updateInvestigation(oosId, updates)         — Update fields with audit trail

// Phase I
completePhase1Checklist({ oosId, checkType, status, findings, ... })
submitPhase1Conclusion({ oosId, conclusion, evidence, ... })
approvePhase1({ oosId, approvedBy, ... })

// Phase II
escalateToPhase2({ oosId, team, ... })
addRetestResults({ oosId, results, analyst, ... })
submitRootCause({ oosId, category, detail, ... })
addBatchImpact({ oosId, batchId, relationship, ... })
assessBatchImpact({ impactId, assessment, detail, ... })
linkCapa({ oosId, capaId })
submitPhase2Conclusion({ oosId, disposition, summary, ... })
approvePhase2Closure({ oosId, approvedBy, ... })

// Timeline
requestExtension({ oosId, justification, newDueDate })
approveExtension({ oosId, approvedBy })

// OOT
evaluateOOT({ resultId })                  — Statistical evaluation against historical data
createOotAlert({ resultId, alertLevel, triggerType, ... })
assessOotAlert({ ootId, assessment, notes, ... })

// AI
aiSuggestRootCause({ oosId })              — Enhanced version of existing function
aiPredictOOT({ testId, productName })      — Time-series trend prediction
aiGenerateReport({ oosId })                — Generate investigation report
aiCrossBatchImpact({ oosId })              — Identify affected batches
aiAutoPopulatePhase1({ oosId })            — Pre-fill checklist with context

// Metrics
getOosMetrics({ dateRange, product, test, analyst, ... })
getOosTrends({ period, groupBy, ... })
getOverdueInvestigations()
```

### 11.3 API Routes Required

```
POST   /oos-investigation                    — Create investigation
GET    /oos-investigation                    — List investigations (with filters)
GET    /oos-investigation/:oosId             — Get single investigation
PATCH  /oos-investigation/:oosId             — Update investigation
POST   /oos-investigation/:oosId/phase1/:checkType  — Complete Phase I checklist item
POST   /oos-investigation/:oosId/phase1/conclude     — Submit Phase I conclusion
POST   /oos-investigation/:oosId/phase1/approve      — Approve Phase I
POST   /oos-investigation/:oosId/escalate             — Escalate to Phase II
POST   /oos-investigation/:oosId/retest               — Add retest results
POST   /oos-investigation/:oosId/root-cause           — Submit root cause
POST   /oos-investigation/:oosId/batch-impact         — Add batch to impact assessment
PATCH  /oos-investigation/:oosId/batch-impact/:impactId — Assess batch impact
POST   /oos-investigation/:oosId/capa                 — Link CAPA
POST   /oos-investigation/:oosId/phase2/conclude      — Submit Phase II conclusion
POST   /oos-investigation/:oosId/phase2/approve       — Approve Phase II closure
POST   /oos-investigation/:oosId/extension             — Request timeline extension
POST   /oos-investigation/:oosId/extension/approve     — Approve extension
POST   /oos-investigation/:oosId/ai/root-cause        — AI root cause suggestion
POST   /oos-investigation/:oosId/ai/report            — AI investigation report
POST   /oos-investigation/ai/predict-oot              — AI OOT prediction
GET    /oos-investigation/metrics                      — OOS metrics dashboard data
GET    /oos-investigation/overdue                      — Overdue investigations
GET    /oot-alerts                                     — List OOT alerts
PATCH  /oot-alerts/:ootId                              — Assess OOT alert
```

### 11.4 Frontend Page Structure

The OOS Investigation module should follow the standard Vent split-panel layout:

**Left panel — Investigation list:**
- Filterable by: status (open/escalated/pending/closed), phase (phase_1/phase_2), priority, product, assignee, overdue
- Color-coded status badges (red: overdue, orange: approaching deadline, green: on track, grey: closed)
- Quick stats at top: open investigations count, overdue count, average age

**Right panel — Investigation detail (tabbed):**
- Tab 1: **Overview** — Investigation summary, timeline, status, key dates, linked result details
- Tab 2: **Phase I Checklist** — 10-item checklist with individual completion status, findings, evidence attachments
- Tab 3: **Phase II Investigation** — Root cause analysis, retest results, production investigation notes
- Tab 4: **Batch Impact** — Matrix of potentially affected batches with assessment status
- Tab 5: **CAPAs** — Linked CAPAs with status
- Tab 6: **Timeline/Audit** — Full chronological audit trail of the investigation
- Tab 7: **AI Insights** — AI-suggested root causes, OOT predictions, risk scoring

**Separate OOT Dashboard:**
- Trend charts for monitored test/product combinations
- Active OOT alerts with assessment status
- Control charts (Shewhart, CUSUM) for key test parameters

### 11.5 Integration Points

| Integration | Direction | Description |
|-------------|-----------|-------------|
| QC Lab → OOS Investigation | Trigger | When `qc_results.oos_flag` is set to true, auto-create OOS investigation |
| OOS Investigation → Batch Disposition | Block | Open OOS investigation prevents batch release in disposition module |
| OOS Investigation → CAPA Tracker | Link | Phase II closure requires linked CAPA; CAPA effectiveness tracked |
| OOS Investigation → Deviation Manager | Link | OOS may generate a deviation; deviation may trigger OOS investigation |
| OOS Investigation → Change Control | Link | Method/process changes resulting from OOS investigation |
| OOS Investigation → Training Matrix | Query | Verify analyst qualification status during Phase I |
| OOS Investigation → Equipment Logbook | Query | Pull equipment calibration/maintenance history during Phase I |
| OOS Investigation → Charlie AI | Query | Natural language querying of OOS investigation data |

### 11.6 ID Prefixes to Add to `server/lib/ids.js`

```js
/** OOS-1000 … OOS-9999  (OOS investigations) */
function oosInvestigationId() {
  return 'OOS-' + Math.floor(1000 + Math.random() * 8999);
}

/** OSCHK-1000 … OSCHK-9999  (OOS Phase I checklist items) */
function oosChecklistId() {
  return 'OSCHK-' + Math.floor(1000 + Math.random() * 8999);
}

/** OSBI-1000 … OSBI-9999  (OOS batch impact records) */
function oosBatchImpactId() {
  return 'OSBI-' + Math.floor(1000 + Math.random() * 8999);
}

/** OOT-1000 … OOT-9999  (OOT alerts) */
function ootAlertId() {
  return 'OOT-' + Math.floor(1000 + Math.random() * 8999);
}
```

### 11.7 Suggested PAGE_MAP Entry

```js
'oos-investigation.html': 'qc/oos-investigation.html',
```

### 11.8 Dependencies

This module depends on (must be built after):
- QC Lab (live) — provides `qc_results`, `qc_tests`, `qc_samples`, `qc_instruments`, `qc_methods`
- CAPA Tracker (live) — provides `capa_actions` for CAPA linkage
- Deviation Manager (live) — provides `deviations` for cross-reference
- Batch Disposition (live) — provides `batch_dispositions` for release blocking
- Equipment Logbook (live) — provides equipment history for Phase I investigation
- Training Matrix (live) — provides analyst qualification data

All dependencies are satisfied (all are live as of Round 3).

---

*This research brief provides the regulatory, workflow, data model, and AI foundation for writing the OOS Investigation module agent spec. The module represents a high-value regulatory compliance feature with significant AI differentiation opportunities, particularly in proactive OOT prediction and AI-assisted root cause analysis.*
