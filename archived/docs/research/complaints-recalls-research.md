# Complaints & Recalls Management — Research Brief

**Module:** Complaint Manager (Agent 2, Round 3)
**Date:** 2026-03-06
**Spec reference:** `round-3-specs/agent-2-complaint-mgr.md`

---

## 1. Regulatory Requirements

### 1.1 FDA 21 CFR 211.198 — Complaint Files

This is the primary US regulation governing pharmaceutical complaint handling. Key requirements:

**Written Procedures Required (211.198(a))**
- Manufacturers must have written procedures describing the handling of all written and oral complaints regarding a drug product.
- A quality control unit must review and approve these procedures.
- Written procedures must include provisions for review by the QC unit of any complaint involving the possible failure of a drug product to meet any specification, and a determination of the need for investigation.

**Review and Investigation (211.198(a))**
- All complaints must be reviewed by the QC unit.
- If the complaint involves a possible product quality failure, an investigation must be conducted.
- If investigation is not conducted, the written record must include the reason and the name of the responsible person deciding no investigation is needed.
- Any complaint involving a "possible failure of a drug product to meet any of its specifications" must be investigated — there is no threshold below which investigation can be skipped.

**Records Must Include (211.198(b))**
1. Name and strength of the drug product
2. Lot number
3. Name of the complainant
4. Nature of the complaint
5. Reply to the complainant
6. Results of the investigation (if conducted)
7. Any corrective action taken
8. Follow-up, if any

**Retention and Accessibility**
- Complaint records must be maintained at the manufacturing site or another reasonably accessible location.
- Records for OTC drugs: 1 year after expiry date of the batch.
- Records for prescription drugs: 1 year after expiry date of the batch.
- However, best practice (and expectation during inspections) is a minimum of 6 years for biologics, aligning with 21 CFR 211.180 general retention requirements.

**Reportable Events**
- Complaints involving adverse events must be separately evaluated for MedWatch/FDA reporting under 21 CFR 314.81 (drugs) or 21 CFR 600.80 (biologics — 15-day alert reports and periodic safety reports).
- Biologics complaints involving serious adverse events: 15 calendar days from awareness.
- Field alert reports (21 CFR 314.81(b)(1)): within 3 working days for product quality issues that may affect safety/efficacy.

**Vent spec alignment:** The existing spec covers most 211.198 requirements. Recommendations:
- Add a `reply_to_complainant` field (FDA mandates recording the reply).
- Add `investigation_justification` for cases where investigation is declined.
- Add `reported_within_deadline` boolean and `report_deadline_date` for tracking 15-day/3-day regulatory reporting deadlines.
- Consider separating `adverse_event` complaints into a dedicated sub-workflow with MedWatch-specific fields.

---

### 1.2 FDA 21 CFR Part 7 — Enforcement Policy (Recalls)

This covers recall classification and voluntary recall procedures.

**Recall Classifications (21 CFR 7.41)**
- **Class I:** Reasonable probability that use of or exposure to the product will cause serious adverse health consequences or death. (e.g., contaminated sterile injectables, wrong active ingredient, potency failure in life-saving biologics)
- **Class II:** Use of or exposure may cause temporary or medically reversible adverse health consequences, or the probability of serious consequences is remote. (e.g., labelling errors with therapeutic consequences, particulate matter in non-injectable products)
- **Class III:** Use of or exposure is not likely to cause adverse health consequences. (e.g., minor labelling discrepancies, cosmetic defects on packaging)

**Health Hazard Evaluation (21 CFR 7.41(a))**
FDA evaluates based on:
1. Whether any disease or injuries have already occurred
2. Assessment of hazard to various population segments (children, elderly, immunocompromised)
3. Assessment of the degree of seriousness of the health hazard
4. Assessment of the likelihood of occurrence of the hazard
5. Assessment of the consequences (immediate vs. long-range)

**Recall Strategy Requirements (21 CFR 7.42)**
A recall strategy must address:
1. **Depth of recall** — wholesale, retail, or consumer/user level
2. **Public notification** — press releases, direct notification
3. **Effectiveness checks** — verification that all consignees have been reached and have taken appropriate action

**Recall Status Reports (21 CFR 7.53)**
The firm must submit periodic status reports including:
- Number of consignees notified and date/method of notification
- Number of consignees responding and quantity of product accounted for
- Number and results of effectiveness checks completed
- Estimated time frame for completion

**Recall Termination (21 CFR 7.55)**
FDA terminates a recall when all reasonable efforts have been made to remove or correct the product, considering the health hazard.

**Vent spec alignment:** The existing spec has good recall_events schema. Recommendations:
- Add `recall_depth` field (wholesale/retail/consumer_user).
- Add `health_hazard_evaluation` JSONB field for structured hazard assessment.
- Add `public_notification_method` (press_release, direct_notification, both, none).
- Add `effectiveness_check_results` JSONB for tracking effectiveness check data.
- Add `status_report_dates` JSONB to track periodic report submissions to FDA.
- Add `fda_recall_number` for tracking FDA-assigned recall event numbers.

---

### 1.3 EU GMP Chapter 8 — Complaints and Product Recalls

EU GMP Annex/Chapter 8 applies to all EU-marketed products and is enforced by EMA and national competent authorities (HPRA in Ireland).

**Principles**
- A system must be in place for recording, reviewing, and investigating all complaints including quality defects.
- A system must be in place for recalling products from the distribution network promptly and effectively.
- All quality defects that could result in a recall or abnormal restriction in supply must be reported to competent authorities.

**Personnel Requirements**
- An authorised person must be designated as responsible for handling complaints and deciding measures.
- If this person is not the Qualified Person (QP), the QP must be made aware of all complaints, investigations, and recalls.
- Sufficient trained staff and resources must be available.

**Written Procedures Must Cover**
1. All complaints must be recorded with all original details.
2. If a product defect is discovered or suspected, consideration should be given to checking other batches and in some cases other products.
3. All decisions and measures taken as a result of a complaint should be recorded and referenced to the corresponding batch records.
4. Complaint records should be reviewed regularly for any indication of specific or recurring problems requiring attention and possibly recall.
5. Special attention should be given to establishing whether a complaint was caused by counterfeiting.

**Investigation Requirements**
- Investigation must extend to other potentially affected batches.
- All decisions must be documented with rationale.
- Investigation should be thorough and timely.
- Complaints should be classified by type/nature to enable trend analysis.

**Recall System Requirements**
- A system for rapid and effective recall at any time, inside and outside working hours.
- The operation must be capable of being initiated promptly and at any time.
- Recalled products must be segregated and stored securely pending a decision.
- All relevant competent authorities must be notified in advance of any intended recall.
- Distribution records must be readily available.
- Progress of recall must be recorded and a final report issued.

**Key Difference from FDA:** EU GMP explicitly requires:
- Counterfeiting assessment on every complaint.
- Notification to competent authorities of quality defects even without recall.
- Consideration of "Rapid Alert" system for serious quality defects.

**Vent spec alignment:** Recommendations:
- Add `counterfeit_assessed` boolean and `counterfeit_notes` field.
- Add `rapid_alert_issued` boolean for EU rapid alert system.
- Add `other_batches_checked` boolean and `related_batch_findings` text field.
- Add `competent_authority_notified` boolean and date.

---

### 1.4 ICH Q10 — Pharmaceutical Quality System

ICH Q10 Section 3.2.2 covers Corrective Action and Preventive Action (CAPA) System, and Section 3.2.4 covers Product Quality Review. The complaint/recall touchpoints are:

**Section 1.7 — Complaint Handling as a PQS Element**
- Complaints, along with recalls, deviations, and audit findings, are among the key inputs to the pharmaceutical quality system.
- Data from these should drive continual improvement.

**Section 3.2.1 — Knowledge Management**
- Knowledge gained from complaints should be captured and shared across the organisation.
- Trend data from complaints should inform process improvements, technology transfer decisions, and product lifecycle management.

**Section 3.2.3 — Change Management**
- Complaint trends may trigger change controls for process, equipment, or specification changes.

**Section 3.2.4 — Management Review**
- Complaint and recall data must be included in periodic management review.
- Senior management must review complaint trends and take action.

**Key ICH Q10 Principles for Vent:**
- Complaints are not just a compliance obligation but a data source for continual improvement.
- Trend analysis across complaints, deviations, and CAPAs is essential.
- Cross-module linkage (complaints to deviations to CAPAs) is a regulatory expectation, not a nice-to-have.
- AI-driven trend detection directly supports ICH Q10's knowledge management mandate.

---

## 2. Best Practice Workflows

### 2.1 Complaint Lifecycle Workflow

```
INTAKE                    TRIAGE                  INVESTIGATION
Customer/internal    -->  QA reviews within      -->  Root cause analysis
submits complaint         24h of receipt              Batch record review
Capture all details       Classify type/severity      Lab testing if needed
Assign unique ID          Determine reportability     Cross-batch assessment
Acknowledge receipt       Assign investigator         Distribution check
                          Set priority/deadline       Impact assessment

     |                                                      |
     v                                                      v

REGULATORY REPORTING      CAPA                        CLOSURE
If adverse event:    <--  Corrective actions     <--  Investigation complete
15-day MedWatch          implemented                  Root cause confirmed
If field alert:          Preventive actions           CAPA verified effective
3-day report             identified                   Complaint response sent
Track deadlines          Link to CAPA system          Closure approved by QA
                         Track effectiveness          Retain records
                                                      Feed into trending
```

**Recommended Statuses (enhanced from spec):**
1. `received` — complaint logged, awaiting triage
2. `triaging` — QA reviewing for classification and reportability
3. `investigating` — active investigation underway
4. `pending_capa` — investigation complete, awaiting CAPA implementation
5. `pending_response` — CAPA done, awaiting response to complainant
6. `closed` — fully resolved and approved
7. `void` — duplicate or invalid complaint

**SLA Targets (industry benchmarks):**
- Triage: within 24 hours of receipt
- Reportable determination: within 3 calendar days
- Critical complaints investigation start: within 24 hours
- Major complaints investigation start: within 5 business days
- Minor complaints investigation start: within 10 business days
- Investigation completion: 30 calendar days (critical), 60 days (major), 90 days (minor)
- Closure: within 30 days of CAPA completion

### 2.2 Recall Workflow

```
DECISION                  STRATEGY                EXECUTION
Health hazard        -->  Determine recall    --> Notify consignees
evaluation                class (I/II/III)        Issue press release
FDA/competent auth        Set recall depth         (if needed)
notification              Draft notifications      Track responses
Internal escalation       Define effectiveness     Quarantine returned
Management approval       check plan               product
                          Set timeline             Physical reconciliation

     |                                                      |
     v                                                      v

MONITORING                CLOSURE
Periodic status      --> All consignees responded
reports to FDA           Effectiveness checks passed
Effectiveness checks     Recovery rate acceptable
Track recovery rate      Final report issued
Update distribution      FDA terminates recall
reconciliation           Lessons learned captured
```

**Recall Status Workflow:**
1. `initiated` — recall decision made, strategy being developed
2. `strategy_approved` — recall strategy finalised and approved
3. `notifications_sent` — consignees notified
4. `in_progress` — actively tracking responses and recovery
5. `effectiveness_checking` — verifying consignee actions
6. `pending_termination` — submitted for FDA/authority termination
7. `terminated` — officially closed by regulatory authority

### 2.3 Complaint Trending Best Practices

**Dimensions to Track:**
- By product/product family
- By complaint type (quality, adverse event, packaging, labelling, etc.)
- By batch/lot number
- By manufacturing site/line
- By geography/market
- By time period (monthly, quarterly, annual)
- By source (customer, distributor, regulatory, internal)
- Rate per units sold/distributed (normalised complaint rate)

**Trigger Thresholds:**
- More than 3 complaints on same batch: automatic investigation trigger
- Complaint rate exceeding historical average by 2 standard deviations: management notification
- Any adverse event: immediate regulatory assessment
- Cluster of same complaint type within 30 days: trend alert

---

## 3. Data Requirements

### 3.1 FDA-Mandated Complaint Record Fields

Per 21 CFR 211.198(b), the following are legally required:

| # | Field | Current Spec Coverage | Notes |
|---|-------|----------------------|-------|
| 1 | Drug product name and strength | `product_name` | Consider adding `product_strength` separately |
| 2 | Lot number | `lot_number` | Covered |
| 3 | Complainant name | `complainant_name` | Covered |
| 4 | Nature of complaint | `complaint_type` + `description` | Covered |
| 5 | Reply to complainant | Not in spec | **Add `reply_to_complainant` and `reply_date`** |
| 6 | Investigation findings | `investigation` + `root_cause` | Covered |
| 7 | Corrective action | `immediate_action` + `linked_capa_id` | Covered |
| 8 | Follow-up | Not explicitly tracked | **Add `follow_up_notes` and `follow_up_date`** |

### 3.2 Additional Fields Recommended by FDA Guidance and Industry Practice

| Field | Rationale | Priority |
|-------|-----------|----------|
| `product_strength` | FDA requires name AND strength separately | High |
| `dosage_form` | Helps classification and trending | Medium |
| `reply_to_complainant` | FDA 211.198(b) explicit requirement | High |
| `reply_date` | Track reply timeline | High |
| `investigation_declined_reason` | FDA requires justification if no investigation | High |
| `initial_risk_assessment` | Triage documentation | Medium |
| `regulatory_report_type` | MedWatch, Field Alert, CIOMS, etc. | High |
| `regulatory_report_number` | Track submitted report IDs | High |
| `report_deadline` | 15-day or 3-day deadline date | High |
| `report_submitted_date` | Prove timely reporting | High |
| `sample_available` | Whether retained sample exists for testing | Medium |
| `sample_tested` | Whether lab testing was performed | Medium |
| `counterfeit_assessed` | EU GMP requirement | Medium |
| `temperature_excursion` | Common for biologics complaints | Medium |
| `follow_up_notes` | FDA mandated | High |
| `follow_up_date` | Track follow-up timeline | High |

### 3.3 Retention Periods

| Regulation | Record Type | Retention Period |
|------------|-------------|-----------------|
| 21 CFR 211.180 | All drug manufacturing records | 1 year after batch expiry |
| 21 CFR 600.12 | Biologics records | Records as long as product is marketed + additional periods |
| EU GMP Ch. 4 | All GMP records | 1 year after batch expiry (minimum 5 years) |
| ICH Q10 | Quality system records | Throughout product lifecycle |
| **Industry best practice** | **Complaint files** | **Product lifecycle + 6 years minimum** |
| **Industry best practice** | **Recall records** | **Indefinite / permanent** |

**Recommendation for Vent:** Implement soft-delete only (never hard-delete complaint or recall records). Add `archived_at` and `archived_by` fields. Recall records should never be archivable.

### 3.4 Recall-Specific Data Requirements

| Field | FDA Requirement | Current Spec |
|-------|----------------|--------------|
| Recall event number | FDA assigns | Add `fda_recall_number` |
| Product description | Required | `title` + `description` covers |
| Reason for recall | Required | `reason` covers |
| Volume of product in distribution | Required | `units_distributed` covers |
| Distribution pattern | Required | `distribution_data` covers |
| Recall depth level | 21 CFR 7.42 | **Add `recall_depth`** |
| Effectiveness check level | 21 CFR 7.42 | **Add `effectiveness_check_level`** (A/B/C/D/E) |
| Health hazard evaluation | 21 CFR 7.41 | **Add `health_hazard_evaluation` JSONB** |
| Public notification method | 21 CFR 7.42 | **Add `public_notification_method`** |
| Consignee list and responses | 21 CFR 7.49 | **Add `consignee_tracking` JSONB** |

**FDA Effectiveness Check Levels:**
- Level A: 100% of consignees checked
- Level B: Some percentage >10% checked
- Level C: 10% of consignees checked
- Level D: 2% of consignees checked
- Level E: No effectiveness checks

---

## 4. AI Opportunities

### 4.1 Auto-Classification of Complaint Types (Already in Spec)

**Current spec approach is sound.** Enhancements to consider:

**Classification Taxonomy (expanded):**
- `product_quality` — general quality failure
- `adverse_event` — patient harm or clinical impact
- `adverse_reaction` — suspected side effect (distinct from product quality)
- `packaging_integrity` — damaged, leaking, breached containers
- `labelling_error` — wrong label, missing info, illegible
- `potency_failure` — sub-potent or super-potent
- `sterility_failure` — contamination of sterile product
- `particulate_matter` — visible or sub-visible particles
- `delivery_logistics` — shipping damage, temperature excursion
- `counterfeit_suspect` — suspected counterfeit product
- `device_malfunction` — for combination products
- `stability_failure` — out-of-spec before expiry date

**AI Model Prompt Strategy:**
- Use structured few-shot prompting with real-world complaint examples.
- Output structured JSON: `{ type, severity, confidence, reasoning, reportable_assessment, recommended_investigation_scope }`.
- Include regulatory context in the system prompt (what makes something reportable, when adverse events must be escalated).
- Flag potential MedWatch-reportable events with high confidence threshold (err on the side of flagging for human review).

**Accuracy Targets:**
- Type classification: >90% agreement with QA manual classification
- Severity classification: >85% agreement
- Reportability flag: >95% sensitivity (minimize false negatives — better to over-flag than miss a reportable event)

### 4.2 Batch Impact Analysis (Already in Spec)

**Enhanced approach:**

The AI should query across multiple data sources:
1. **Same batch complaints** — other complaints against the same lot/batch number
2. **Same product, same period** — complaints for the same product within +/- 30 days of manufacturing
3. **Same equipment** — if batch records link to equipment, check for equipment-related complaints
4. **Same raw materials** — if raw material lots are tracked, check for material-linked issues
5. **Same operator/shift** — if personnel data is available
6. **Distribution overlap** — which markets/customers received the affected batch

**Output structure:**
```json
{
  "same_batch_complaints": [...],
  "related_batch_complaints": [...],
  "shared_equipment_issues": [...],
  "risk_assessment": "high/medium/low",
  "recommended_scope": "single_batch / multiple_batches / product_wide",
  "recall_recommendation": "none / monitor / voluntary_recall",
  "affected_batch_list": ["LOT-001", "LOT-002"],
  "estimated_units_at_risk": 15000,
  "reasoning": "..."
}
```

### 4.3 Trend Detection (Already in Spec — Enhance)

**Statistical Methods the AI Should Apply:**
- **Moving average analysis** — 3-month rolling average of complaint rates per product
- **Control chart logic** — flag when complaint rate exceeds Upper Control Limit (mean + 2 or 3 sigma)
- **Pareto analysis** — identify the 20% of complaint types causing 80% of volume
- **Geographic clustering** — detect if complaints are concentrated in specific markets
- **Temporal clustering** — detect if complaints spike around specific manufacturing dates
- **Recurrence detection** — identify complaints with same root cause that have appeared before

**Alert Tiers:**
1. **Signal** — early pattern, worth monitoring (e.g., 2 similar complaints in 30 days)
2. **Trend** — confirmed pattern requiring investigation (e.g., statistically significant increase)
3. **Alarm** — urgent pattern requiring immediate action (e.g., multiple adverse events)

**AI Prompt Strategy:**
- Provide the AI with the last 90 days of complaint data in structured form.
- Ask for pattern identification across all dimensions (type, product, batch, geography, time).
- Request actionable recommendations, not just observations.
- Include comparison to historical baseline.

### 4.4 Predictive Recall Risk (New — Not in Current Spec)

**Concept:** Use complaint patterns to predict when a recall may become necessary before it is formally triggered.

**Input signals:**
- Rising complaint rate on a specific batch or product
- Multiple complaints of the same type (especially sterility, potency, particulate)
- Adverse event reports
- Environmental monitoring excursions (if integrated with other modules)
- Equipment qualification failures linked to production batches

**AI Output:**
```json
{
  "recall_risk_score": 0.78,
  "risk_level": "high",
  "contributing_factors": [
    "3 sterility complaints on batch LOT-2026-0042 in 14 days",
    "Environmental monitoring excursion in filling area on manufacturing date"
  ],
  "recommended_actions": [
    "Immediate quarantine of remaining LOT-2026-0042 inventory",
    "Initiate expanded investigation",
    "Prepare recall strategy as contingency"
  ],
  "similar_historical_cases": [
    { "case": "COMP-3421", "outcome": "Class II recall" }
  ]
}
```

**Recommendation:** Add `POST /complaints/ai/predict-recall-risk` endpoint. This would be a significant differentiator vs. competitors.

### 4.5 Regulatory Report Drafting (New — Not in Current Spec)

**Concept:** AI generates draft MedWatch reports or Field Alert Reports from complaint data.

**Approach:**
- Extract structured data from the complaint record.
- Map fields to MedWatch 3500A form fields.
- Generate narrative sections.
- Output a pre-filled draft for QA review and submission.

**Recommendation:** Add `POST /complaints/:compId/ai/draft-report` endpoint. Medium priority — useful but not essential for MVP.

### 4.6 Natural Language Complaint Search (New)

**Concept:** Allow users to search complaints using natural language queries.

Examples:
- "Show me all potency complaints for Product X in the last 6 months"
- "Which batches have had more than 2 complaints?"
- "Are there any sterility complaints linked to Line 3?"

**Implementation:** Use RAG with the existing `server/lib/rag.js` infrastructure. Embed complaint descriptions and investigation notes. Enable semantic search across the complaint corpus.

---

## 5. Competitor Features

### 5.1 MasterControl Complaints Management

**Core Features:**
- Integrated complaint intake forms with configurable workflows
- Automatic regulatory reporting assessment (MedWatch, CIOMS, Vigilance)
- Adverse event tracking and management with separate sub-module
- Complaint-to-CAPA escalation with automated linking
- Investigation templates with guided root cause analysis (Ishikawa, 5 Whys)
- Risk-based prioritisation matrix
- Complaint trending dashboards with drill-down
- Distribution record integration for recall scope assessment
- Electronic signatures (21 CFR Part 11)
- Built-in regulatory reporting forms (MedWatch 3500A, CIOMS I)

**Differentiators:**
- Very mature workflow engine with configurable stages and approvals
- Strong document management integration (complaint-linked documents)
- Extensive reporting library with pre-built regulatory reports
- Training management integration (auto-assign training from complaint CAPAs)

**Where Vent Can Compete:**
- MasterControl's UI is dated and complex. Vent's modern dark-theme split-panel is cleaner.
- MasterControl lacks AI-powered classification and trend detection.
- MasterControl's pricing is enterprise-only ($50K+ annual). Vent can target mid-market.

### 5.2 Veeva Vault Quality (QMS)

**Core Features:**
- Unified quality event management (complaints, deviations, CAPAs, changes all in one platform)
- Complaint intake with multi-channel capture (email, phone, web portal, EDI)
- Automatic adverse event detection using keyword scanning
- Safety-quality integration (links to Veeva Vault Safety for pharmacovigilance)
- Product hierarchy management (product family > product > SKU > batch)
- Global complaint coordination across multiple sites
- Regulatory intelligence for reporting requirements by market
- Rolling review and trending with configurable periods
- Mobile-friendly complaint intake for field reps
- API-first architecture for integration

**Differentiators:**
- Strongest safety-quality integration in the market (Vault Safety + Vault QMS)
- Multi-site/multi-product architecture designed for large global pharma
- Regulatory intelligence database (knows reporting requirements per country)
- Veeva's data model is purpose-built for life sciences

**Where Vent Can Compete:**
- Veeva is extremely expensive ($200K+ annual for full platform).
- Veeva requires significant implementation effort (6-12 months).
- Veeva lacks AI-driven insights (relies on rules-based automation).
- Vent's AI-first approach to classification and trend detection is a genuine differentiator.

### 5.3 Honeywell TrackWise (now Honeywell Forge)

**Core Features:**
- Highly configurable complaint workflow engine
- Complaint classification using configurable taxonomies
- Investigation management with task assignment and tracking
- Health hazard assessment module with scoring matrix
- Recall management module with consignee tracking
- Regulatory reporting module (MedWatch, MedDRA coding, CIOMS)
- Complaint trending with statistical process control (SPC) charts
- Integration with ERP/SAP for distribution and batch data
- Multi-language support for global deployment
- Document management for investigation evidence

**Differentiators:**
- Most configurable system on the market (almost everything is user-configurable)
- Strong regulatory reporting capabilities including MedDRA coding
- SPC-based trending (statistically rigorous)
- Longest market presence (20+ years)

**Where Vent Can Compete:**
- TrackWise is notoriously difficult to configure and maintain (needs dedicated admin).
- The UI is functional but not modern.
- No AI capabilities — all classification and trending is manual or rules-based.
- Very expensive ($100K+ annual) with high implementation costs.

### 5.4 Feature Comparison Matrix

| Feature | MasterControl | Veeva Vault | TrackWise | Vent (Planned) |
|---------|:---:|:---:|:---:|:---:|
| Complaint intake and tracking | Yes | Yes | Yes | Yes |
| Investigation management | Yes | Yes | Yes | Yes |
| CAPA linkage | Yes | Yes | Yes | Yes |
| Deviation linkage | Yes | Yes | Yes | Yes |
| Recall management | Yes | Yes | Yes | Yes |
| Recall consignee tracking | Yes | Yes | Yes | Partial (add) |
| Adverse event management | Yes | Yes (Vault Safety) | Yes | Basic |
| MedWatch form generation | Yes | Yes | Yes | AI-drafted (new) |
| AI auto-classification | No | No | No | **Yes** |
| AI batch impact analysis | No | No | No | **Yes** |
| AI trend detection | No | No | No | **Yes** |
| AI predictive recall risk | No | No | No | **Yes** (new) |
| NLP complaint search | No | No | No | **Yes** (new) |
| SPC trending charts | No | Partial | Yes | Add |
| Multi-site coordination | Yes | Yes | Yes | No (single-site V1) |
| Regulatory intelligence | No | Yes | Partial | No (V2) |
| MedDRA coding | No | Yes | Yes | No (V2) |
| Mobile intake | No | Yes | No | No (V2) |
| 21 CFR Part 11 | Yes | Yes | Yes | Yes |
| Modern UI | No | Partial | No | **Yes** |
| AI-powered insights | No | No | No | **Yes** |
| Affordable pricing | No | No | No | **Yes** |

---

## 6. Recommendations for Vent Spec

### 6.1 High-Priority Additions (Before Build)

1. **Add missing FDA-mandated fields:**
   - `reply_to_complainant` (TEXT)
   - `reply_date` (DATE)
   - `follow_up_notes` (TEXT)
   - `follow_up_date` (DATE)
   - `investigation_declined_reason` (TEXT)
   - `product_strength` (TEXT)

2. **Add regulatory reporting fields:**
   - `regulatory_report_type` (TEXT — medwatch, field_alert, cioms, vigilance)
   - `regulatory_report_number` (TEXT)
   - `report_deadline` (DATE)
   - `report_submitted_date` (DATE)

3. **Add recall depth and effectiveness check fields:**
   - `recall_depth` (TEXT — wholesale, retail, consumer_user)
   - `effectiveness_check_level` (TEXT — A, B, C, D, E)
   - `health_hazard_evaluation` (JSONB)
   - `fda_recall_number` (TEXT)

4. **Add `triaging` status** to complaint workflow between `received` and `investigating`.

5. **Add AI predictive recall risk endpoint** — genuine competitive differentiator.

### 6.2 Medium-Priority Additions (Post-MVP)

1. **Consignee tracking table** for recalls (separate from recall_events).
2. **MedWatch draft generation** via AI.
3. **EU-specific fields** (counterfeit_assessed, rapid_alert_issued, competent_authority_notified).
4. **SPC-based trending** with control chart visualisation.
5. **Natural language complaint search** using RAG.

### 6.3 Architectural Notes

- **Soft-delete only:** Never physically delete complaint or recall records. Add `archived_at` / `archived_by` fields. This is non-negotiable for 21 CFR Part 11 compliance.
- **Immutable audit trail:** Every status change, field update, and AI-generated classification must be audit-logged. The existing `auditLog` pattern is correct.
- **SLA tracking:** Add computed fields or service-layer logic for days-open, days-to-triage, days-to-close. Display SLA adherence on dashboards.
- **Cross-module queries:** The complaint service should be able to query the deviation and CAPA tables for linkage validation and cross-reference reporting. Consider adding helper methods for this.

### 6.4 What Makes Vent's Approach Unique

The key differentiator is **AI-native complaint management**. Every competitor offers workflow automation but none offer:
- Automatic complaint classification with confidence scoring
- Proactive batch impact analysis that searches across the complaint corpus
- Statistical trend detection that generates actionable insights
- Predictive recall risk scoring that warns QA before problems escalate

This is precisely the value proposition ICH Q10 envisions for knowledge management and continual improvement, but no commercial QMS currently delivers it with AI. Vent can be first to market with this capability.

---

## 7. Source References

- FDA 21 CFR 211.198 — Complaint files (Title 21, Chapter I, Subchapter C, Part 211, Subpart J)
- FDA 21 CFR Part 7 — Enforcement Policy (Subpart C — Recalls)
- FDA 21 CFR 314.81(b)(1) — Field Alert Reports
- FDA 21 CFR 600.80 — Postmarketing reporting of adverse experiences (Biologics)
- EU GMP Chapter 8 — Complaints and Product Recalls (EudraLex Volume 4)
- ICH Q10 — Pharmaceutical Quality System (Sections 1.7, 3.2.1-3.2.4)
- FDA Guidance: "Handling and Reporting of Quality Defects" (draft guidance)
- FDA Regulatory Procedures Manual, Chapter 7 — Recall Procedures
- PIC/S GMP Guide, Part I, Chapter 8 — Complaints and Product Recalls
