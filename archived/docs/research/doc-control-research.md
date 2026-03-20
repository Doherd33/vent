# GMP Document Control Systems — Research Brief

**Date:** 2026-03-07
**Module:** Document Control (planned)
**Researcher:** Claude Code (research agent)
**Purpose:** Inform the design and build of Vent's document control module with regulatory grounding, SOP lifecycle best practices, electronic records compliance, AI opportunity mapping, and industry benchmarking.

---

## 1. Regulatory Requirements

### 1.1 ICH Q10 — Pharmaceutical Quality System

**Section 3 — Pharmaceutical Quality System Elements**

ICH Q10 establishes the pharmaceutical quality system (PQS) framework within which document control operates. Document management is not a standalone compliance exercise — it is a foundational enabler of the entire quality system.

**Section 3.2.1 — Knowledge Management:**
- "The pharmaceutical quality system should include processes for acquiring and managing knowledge about products, processes, and components."
- Knowledge management includes "capture, analysis, storage, and dissemination of product and process knowledge."
- SOPs, work instructions, and controlled documents are the primary vehicles for codifying and transmitting operational knowledge.
- **Key implication for Vent:** Document control is not just about version management — it is the formal mechanism for knowledge capture and dissemination. The module should track not just document versions but whether knowledge has been effectively transferred (via training records linkage).

**Section 1.6 — Quality Manual:**
- The quality manual should describe the quality management system including "the responsibilities of management."
- A hierarchy of documents is implied: Quality Manual > Quality Policy > SOPs > Work Instructions > Forms/Records.
- **Key implication:** The document classification system must support a hierarchical document taxonomy.

**Section 3.1 — Process Performance and Product Quality Monitoring:**
- Monitoring data should be used to evaluate the need to update or revise procedures (SOPs).
- Changes to procedures triggered by monitoring data must go through change control.
- **Key implication:** Document revisions should be linkable to triggering events (deviations, CAPAs, change controls, audit findings, regulatory updates).

**Section 3.2.4 — Change Management:**
- "Written procedures should be in place to describe the actions to be taken if a planned change is proposed."
- Changes to controlled documents (SOPs, specifications, protocols) are a subset of the broader change management system.
- **Key implication:** Every document revision should either be linked to a change control record or have a documented justification for why a change control is not required (e.g., editorial/typographical corrections).

### 1.2 FDA — 21 CFR Part 211 (cGMP for Finished Pharmaceuticals)

**21 CFR 211.186 — Master Production and Control Records:**
- Section 211.186(a): "To assure uniformity from batch to batch, master production and control records for each drug product, including each batch size thereof, shall be prepared, dated, and signed (full signature, handwritten) by one person and independently checked, dated, and signed by a second person."
- These records must include: name and strength of product, complete list of components, accurate statement of each component quantity, complete manufacturing and control instructions, in-process controls, specifications, sampling and testing procedures.
- Section 211.186(b): Master production and control records "shall not be changed without review and approval by the quality control unit."
- **Key implication for Vent:** Master production records are a specific document type requiring dual-signature creation (author + independent checker) and QA-gated change control. The document control module must support configurable approval workflows where certain document types require multiple independent reviewers/approvers.

**21 CFR 211.100 — Written Procedures; Deviations:**
- Section 211.100(a): "There shall be written procedures for production and process control designed to assure that the drug products have the identity, strength, quality, and purity they purport or are represented to possess."
- Section 211.100(b): Written production and process control procedures "shall not be changed without the written approval of the appropriate organizational unit and the review and approval of the quality control unit."
- **Key implication:** Dual approval requirement — (1) the owning department/organizational unit and (2) QA must both approve any SOP revision. This is non-negotiable.

**21 CFR 211.180 — General Requirements for Records and Reports:**
- Section 211.180(a): "Any production, control, or distribution record that is required to be maintained... shall be retained for at least 1 year after the expiration date of the drug product."
- Section 211.180(e): "Written records required by this part shall be maintained so that data therein can be used for evaluating, at least annually, the quality standards of each drug product."
- **Key implication:** Superseded document versions must be retained (never deleted), and the retention period is tied to product lifecycle, not document lifecycle.

**21 CFR 211.68 — Automatic, Mechanical, and Electronic Equipment:**
- Section 211.68(b): "Appropriate controls shall be exercised over computer or related systems to assure that changes in master production and control records or other records are instituted only by authorized personnel."
- **Key implication:** Role-based access control on document creation, editing, and approval. Audit trail of all changes.

### 1.3 FDA — 21 CFR Part 11 (Electronic Records; Electronic Signatures)

Part 11 is the cornerstone regulation for electronic document management systems in GMP environments. Every requirement here directly applies to the document control module.

**Section 11.10 — Controls for Closed Systems:**

| Requirement | Section | Implication for Document Control |
|---|---|---|
| Validation | 11.10(a) | The document control system itself must be validated (IQ/OQ/PQ). |
| Readable copies | 11.10(b) | Must be able to generate accurate, complete copies of records in human-readable form. |
| Record protection | 11.10(c) | Records must be protected to enable retrieval throughout the retention period. |
| Limited system access | 11.10(d) | Access must be limited to authorised individuals. Role-based permissions. |
| Audit trail | 11.10(e) | Must use "secure, computer-generated, time-stamped audit trails to independently record the date and time of operator entries and actions that create, modify, or delete electronic records." Audit trails must be retained for at least as long as the subject records and must be available for FDA review. |
| Operational checks | 11.10(f) | System must enforce permitted event sequencing (e.g., cannot approve before review, cannot distribute before approval). |
| Authority checks | 11.10(g) | System must verify that only authorised individuals can use the system, sign records, access operations, or alter records. |
| Device checks | 11.10(h) | Checks to determine validity of data input source or operational instruction (less applicable to web-based DMS). |
| Training | 11.10(i) | Persons who develop, maintain, or use electronic record systems must have the education, training, and experience to perform their assigned tasks. |
| Written policies | 11.10(j) | Written policies that hold individuals accountable for actions taken under their e-signatures. |
| Document controls | 11.10(k) | Adequate controls over the distribution, access to, and use of documentation for system operation and maintenance. |

**Section 11.50 — Signature Manifestations:**
- Electronic signatures must include the printed name of the signer, the date and time of signing, and the meaning associated with the signature (e.g., "reviewed", "approved", "authored").
- **Key implication:** The approval workflow must capture: `signer_name`, `signed_at` (timestamp), `signature_meaning` (review/approve/reject). This maps to the existing Vent pattern for e-signatures.

**Section 11.70 — Signature/Record Linking:**
- Electronic signatures must be linked to their respective electronic records so that signatures cannot be excised, copied, or otherwise transferred to falsify an electronic record.
- **Key implication:** Approval records must have immutable foreign key linkage to the specific document version they approved. Approvals cannot be reassigned or reused.

**Section 11.100 — General Requirements for Electronic Signatures:**
- Each electronic signature must be unique to one individual and must not be reused by, or reassigned to, anyone else.
- Before an organisation establishes, assigns, certifies, or otherwise sanctions an individual's electronic signature, it shall verify the identity of the individual.

**Section 11.200 — Electronic Signature Components:**
- Must employ at least two distinct identification components (e.g., user ID + password).
- For non-biometric signatures during a single continuous period of controlled system access, the first signing must use all components; subsequent signings may use at least one component (e.g., re-enter password only).
- When non-continuous signings (each signing is an independent act), each signing must use all identification components.
- **Key implication:** Document approvals are discrete, independent signing events. Each approval in the workflow must require full authentication (user ID + password re-entry), not just a "click to approve" button. This is a common compliance gap in homegrown systems.

### 1.4 EU GMP Annex 11 — Computerised Systems

Annex 11 is the EU equivalent of 21 CFR Part 11 and applies to all computerised systems used in GMP operations, including document management systems.

**Section 1 — Risk Management:**
- Risk management should be applied throughout the lifecycle of the computerised system, taking into account patient safety, data integrity, and product quality.
- The level of validation should be commensurate with the risk.

**Section 4 — Validation:**
- 4.1: "The computerised system should be validated. The depth and scope of validation depends on the type, complexity and criticality of the computerised system."
- 4.2: Evidence of suitable test methods and scenarios should be available.
- 4.3: "Inventory of all relevant systems should be available, including inter-system interfaces."
- 4.8: "Reports on quality, measures in place for training, and data integrity should be available."

**Section 5 — Data:**
- 5.1: "Computerised systems exchanging data electronically with other systems should include appropriate built-in checks for the correct and secure entry and processing of data."

**Section 6 — Accuracy Checks:**
- 6.1: "For critical data entered manually, there should be an additional check on the accuracy of the data. This check may be done by a second operator or by validated electronic means."
- **Key implication:** Document metadata (effective dates, review dates, classification) entered manually should have verification checks or dual-entry confirmation for critical fields.

**Section 7 — Data Storage:**
- 7.1: "Data should be secured by both physical and electronic means against damage. Stored data should be checked for accessibility, readability and accuracy. Access to data should be ensured throughout the retention period."
- 7.2: "Regular back-ups of all relevant data should be done. Integrity and accuracy of backup data and the ability to restore the data should be checked during validation and monitored periodically."

**Section 8 — Printouts:**
- 8.1: "It should be possible to obtain clear printed copies of electronically stored data."
- **Key implication:** The system must support PDF generation or printing of controlled documents with watermarks (e.g., "CONTROLLED COPY" or "UNCONTROLLED WHEN PRINTED").

**Section 9 — Audit Trails:**
- 9.1: "Consideration should be given, based on a risk assessment, to building into the system the creation of a record of all GMP-relevant changes and deletions (a system generated 'audit trail')."
- 9.2: "Changes to and deletions of GMP-relevant data should be documented. The reason for the change should be documented."
- **Key implication:** Every document revision must capture a reason for change. The audit trail must be immutable and system-generated (not user-editable).

**Section 10 — Change and Configuration Management:**
- 10.1: "Any changes to a computerised system including system configurations should only be made in a controlled manner in accordance with a defined procedure."

**Section 12 — Security:**
- 12.1: "Physical and/or logical controls should be in place to restrict access to computerised system to authorised persons."
- 12.3: "Creation, change, and cancellation of access authorisations should be recorded."
- 12.4: "Management systems for data and for documents should be designed to record the identity of operators entering, changing, confirming or deleting data including date and time."

**Section 14 — Electronic Signature:**
- 14.1: "Electronic records may be signed electronically. Electronic signatures are expected to: (a) have the same impact as hand-written signatures within the boundaries of the company, (b) be permanently linked to their respective record, (c) include the time and date that they were applied."

**Section 17 — Archiving:**
- 17.1: "Data may be archived. This data should be checked for accessibility, readability and integrity. If relevant changes are to be made to the system (e.g., computer equipment or programs), then the ability to retrieve the data should be ensured and tested."

### 1.5 WHO Technical Report Series No. 961 (2011) — Annex 5: WHO Good Practices for Pharmaceutical Quality Control Laboratories

While primarily focused on QC laboratories, WHO TRS 961 Annex 5 contains document control requirements applicable to any GMP document management system:

**Section 3 — Documentation:**
- 3.1: "Good documentation constitutes an essential part of the quality assurance system."
- 3.2: Documents should be "designed, prepared, reviewed and distributed with care."
- 3.3: Documents containing instructions should be "approved, signed and dated by appropriate authorized persons."
- 3.4: Documents should have unambiguous contents, be "uniquely identified" with a document number.
- 3.5: Documents should be regularly reviewed and kept up to date.
- 3.6: Documents should not be handwritten (except for data entries that should be made at the time of the activity).
- 3.7: "Any alteration made to a document should be signed and dated; the alteration should permit the reading of the original information."
- 3.8: Records should be made or completed at the time each action is taken.

**Section 3.2 — Specifications:**
- All specifications must be authorised and dated.
- Must include document number, title, version, and effective date.

**Section 3.3 — General Requirements for Documents:**
- Each document must have a unique identification number.
- Reproduction of working documents from master documents must not introduce errors.
- The effective date must be defined.
- "Superseded documents should be retained for a defined period."

**Key implication for Vent:** WHO guidelines reinforce that all controlled documents need: unique ID, version number, effective date, author, reviewer, approver (with dates and signatures), and a defined retention/archival policy for superseded versions.

### 1.6 ISO 13485:2016 — Medical Devices Quality Management Systems (Section 4.2 — Documentation Requirements)

While ISO 13485 is a medical device standard, its document control requirements (Section 4.2.4 and 4.2.5) are considered best-in-class and are widely adopted as a benchmark across regulated industries including biologics.

**Section 4.2.4 — Control of Documents:**

A documented procedure must be established to define controls needed to:

| Requirement | Detail |
|---|---|
| (a) Review and approve documents for adequacy prior to issue | Documents must be reviewed for technical accuracy and approved for release before they become effective. |
| (b) Review, update, and re-approve documents | Periodic review process with re-approval. |
| (c) Ensure changes and revision status are identified | Clear version numbering, revision history, and change marks or tracked changes. |
| (d) Ensure relevant versions available at point of use | Controlled distribution to ensure only current versions are used on the shop floor. |
| (e) Ensure documents remain legible and readily identifiable | Formatting standards, document numbering, headers/footers. |
| (f) Ensure external documents are identified and controlled | External standards, regulatory documents, customer specifications. |
| (g) Prevent unintended use of obsolete documents | Superseded documents must be removed from active use or clearly marked as obsolete. Retention must be ensured for reference. |

**Section 4.2.5 — Control of Records:**
- Records must be established and maintained to provide evidence of conformity to requirements.
- Records must remain legible, readily identifiable, and retrievable.
- Retention times must be defined and documented.
- Records must be protected against unintended alteration.

**Key implication for Vent:** ISO 13485 Section 4.2.4 is essentially a specification for a document control system. Requirements (a) through (g) map directly to module features: approval workflow, periodic review scheduling, version tracking, controlled distribution, document numbering, external document management, and obsolete document handling.

### 1.7 ALCOA+ Principles and Data Integrity

Document control must comply with ALCOA+ data integrity principles (per FDA, MHRA, WHO, and PIC/S guidance):

| Principle | Application to Document Control |
|---|---|
| **A**ttributable | Every document action (create, edit, review, approve, distribute, retire) must be attributable to a specific identified individual. |
| **L**egible | Documents must be readable, permanent, and reproducible. Electronic formats must support long-term readability. |
| **C**ontemporaneous | Timestamps on all actions must reflect when the action actually occurred. No backdating of approvals or effective dates. |
| **O**riginal | The electronic record in the DMS is the original. Paper copies are uncontrolled unless specifically designated as controlled copies. |
| **A**ccurate | Document content must be correct, and metadata (dates, versions, classifications) must be accurate. |
| **+C**omplete | All required fields must be populated. Audit trails must be complete (no gaps). |
| **+C**onsistent | Document numbering, formatting, and processes must be consistent across the organisation. |
| **+E**nduring | Documents and their audit trails must be retained for the required retention period in a durable, accessible format. |
| **+A**vailable | Documents must be available for review and inspection throughout the retention period. |

---

## 2. SOP Lifecycle

### 2.1 Standard Document Lifecycle Workflow

The industry-standard GMP document lifecycle follows six core stages:

```
Draft --> Review --> Approve --> Distribute/Train --> Effective (Active) --> Retire/Supersede
```

**Stage 1: Draft**
- Document author creates the initial draft or revises an existing document.
- Author may be any authorised individual from the owning department.
- Draft must be linked to a triggering event where applicable (change control, CAPA, audit finding, regulatory update, periodic review, new process).
- Drafting may go through multiple internal iterations before formal submission for review.
- System should support collaborative drafting with version tracking of draft iterations.
- **Status:** `draft`
- **Best practice:** Auto-save draft revisions. Allow author to designate when the draft is "ready for review." Prevent accidental submission of incomplete drafts.

**Stage 2: Review**
- Formal technical review by subject matter experts (SMEs) from relevant departments.
- Reviewers are assigned based on document type, department, and scope.
- Each reviewer must provide feedback (comments, redlines) or confirm "no changes needed."
- Reviews may be conducted in parallel (all reviewers simultaneously) or in sequence (department by department).
- Author incorporates review comments and resubmits if significant changes are made.
- **Status:** `in_review`
- **SLA:** Typically 5-10 business days for review completion.
- **Best practice:** Allow parallel reviews with automated reminders for overdue reviews. Track which reviewers have completed review and which are pending. Enable comment resolution tracking.

**Stage 3: Approve**
- Formal approval by authorised approver(s).
- Minimum approvers per 21 CFR 211.100(b): (1) owning department head and (2) QA representative.
- For certain document types, additional approvers are required (e.g., Regulatory Affairs for specifications, Engineering for equipment SOPs).
- Approval must comply with 21 CFR Part 11 / EU GMP Annex 11: electronic signature with printed name, date/time, and meaning ("approved").
- Approval may be conditional ("approved with minor edits") — any conditional approval must require verification of edits before the document becomes effective.
- **Status:** `approved` (or `pending_approval` during the approval cycle)
- **Best practice:** Define approval matrices by document type. QA approval is always last (gating function). Enable parallel approval where regulatory allows.

**Stage 4: Distribute and Train**
- Approved document is made effective and distributed to all relevant personnel.
- Controlled distribution tracks exactly who has access to the document and which copy they hold.
- In electronic systems, distribution is typically automated — the document becomes visible/accessible to designated roles or departments.
- Training requirements are assessed: does this document require read-and-understand acknowledgement? Does it require facilitated training with competency assessment?
- Training records are generated and linked to the specific document version.
- Personnel cannot perform activities governed by the document until training is complete.
- **Status:** `effective` (document status), training records tracked separately per individual.
- **Best practice:** Auto-generate training assignments based on document type and department. Set training completion deadlines. Block access to "perform activities" until training is acknowledged (where systems allow). Track training completion percentage in real-time.

**Stage 5: Effective (Active)**
- Document is the current, active, controlled version.
- Only one version of a document can be effective at any time.
- The effective date may differ from the approval date (common when training must be completed before the document takes effect, or when an implementation date is set in the future).
- Periodic review is scheduled from the effective date (typically every 2-3 years, configurable by document type).
- The document remains effective until it is superseded by a new version or retired.
- **Status:** `effective`
- **Best practice:** Display clear "effective" status on the document. Show days until next periodic review. Alert document owner when periodic review is approaching (60, 30, 14 days before due date).

**Stage 6: Retire / Supersede**
- When a new version is approved and made effective, the previous version is automatically superseded.
- Superseded documents must be removed from active distribution (in electronic systems: marked as superseded, removed from active search results, but retained for reference).
- Superseded documents must be retained for the full regulatory retention period.
- Documents that are no longer needed (e.g., product discontinued, process decommissioned) are retired.
- Retirement requires formal approval (typically by QA and the owning department).
- Retired documents must be retained for the defined retention period.
- **Status:** `superseded` or `retired`
- **Best practice:** Automatically supersede old versions when new versions become effective. Clearly watermark superseded/retired documents as "SUPERSEDED" or "OBSOLETE — FOR REFERENCE ONLY." Prevent accidental use of superseded documents.

### 2.2 Version Control Conventions

**Major.Minor Versioning (Recommended):**

| Version | Meaning | Example | Approval Required |
|---|---|---|---|
| 0.1, 0.2, 0.3... | Draft iterations | Initial drafts before first approval | No (internal tracking only) |
| 1.0 | First approved release | First effective version | Yes — full approval cycle |
| 1.1, 1.2... | Minor revisions | Typographical corrections, formatting changes, clarifications that do not change the intent or procedure steps | Yes — may use expedited approval (QA only) |
| 2.0 | Major revision | Substantive changes to procedure steps, scope, responsibilities, or acceptance criteria | Yes — full approval cycle with change control |
| 3.0, 4.0... | Subsequent major revisions | Each significant content change increments the major version | Yes — full approval cycle with change control |

**Alternative: Integer-Only Versioning:**
- Some organisations use simple integer versioning (Rev 01, Rev 02, Rev 03...) where every change increments by one.
- Simpler but provides less granularity for distinguishing editorial vs. substantive changes.
- FDA does not mandate a specific versioning scheme — consistency is what matters.

**Draft Versioning:**
- Drafts should be tracked but not treated as formal versions.
- Common pattern: Draft A, Draft B, Draft C... or 0.1, 0.2, 0.3...
- Draft versions are internal working documents and should not be distributed.

**Key rules:**
1. Version numbers must be monotonically increasing (never reuse a version number).
2. Only one version can be "effective" at any time.
3. The full version history must be retained and accessible.
4. Each version must have a documented reason for change.

### 2.3 Periodic Review Scheduling

**Regulatory Basis:**
- ICH Q10 and EU GMP both require periodic review of documents to ensure continued suitability.
- FDA does not mandate a specific review cycle but expects documents to be "current" during inspections.
- Industry standard: 2-year review cycle for SOPs, 3-year for policies, annual for specifications and critical process documents.

**Review Cycle by Document Type:**

| Document Type | Typical Review Cycle | Rationale |
|---|---|---|
| Quality Policy | 3 years | High-level, infrequently changing |
| Quality Manual | 3 years | Framework document |
| SOPs | 2 years | Balance between currency and administrative burden |
| Work Instructions | 2 years | Operational detail, may change more frequently |
| Specifications (product) | 1-2 years | Must reflect current validated ranges |
| Specifications (raw material) | 2 years | Supplier-dependent, may change with qualifications |
| Batch Records (master) | 1-2 years | Must reflect current validated process |
| Validation Protocols | Review after each use | Updated per validation lifecycle |
| Forms/Templates | 2-3 years | Typically change only when parent SOP changes |
| Training Materials | Aligned with parent SOP | Updated when the governing SOP is revised |
| External Documents | Annual verification | Check for updated editions |

**Periodic Review Outcomes:**
1. **No changes needed:** Document is reaffirmed as current. Review date is reset. Approver signs off that the document has been reviewed and remains adequate. The version number does NOT change.
2. **Minor changes needed:** Typographical/editorial corrections are made. Minor version increment. Expedited approval (QA only).
3. **Major changes needed:** Substantive revision required. Change control is initiated. Document enters the revision lifecycle. Major version increment. Full approval cycle.
4. **Document retirement:** Document is no longer needed. Retirement workflow initiated.

**Scheduling Mechanics:**
- Review due date = effective date + review cycle period.
- System sends automated reminders at configurable intervals (e.g., 90, 60, 30, 14 days before due date).
- Overdue reviews are escalated to the document owner's manager and QA.
- KPI: percentage of documents reviewed on time (target: >95%).
- Regulatory risk: overdue periodic reviews are a common FDA observation (483 finding).

### 2.4 Change Control Integration

Every substantive document revision should be linked to a change control record:

```
Trigger Event
     |
     v
Change Control (CC-xxxx) ──> Document Revision ──> Training Update
     |                             |                      |
     v                             v                      v
Impact Assessment         New Version Created       Training Assigned
     |                             |                      |
     v                             v                      v
CC Approval               Doc Approval Workflow     Read & Understand
     |                             |                      |
     v                             v                      v
Implementation            Effective Date Set        Personnel Qualified
     |                             |
     v                             v
Effectiveness Check       Old Version Superseded
```

**Exceptions (no change control required):**
- Typographical corrections that do not affect meaning.
- Formatting changes (headers, footers, page layout).
- Editorial clarifications that do not change procedural steps.
- These should still go through an expedited review/approval but do not need a full change control record.

---

## 3. Key Data Fields

### 3.1 Document Record Schema

**Core Document Fields:**

| Field | Type | Description | Required | Example |
|---|---|---|---|---|
| `doc_id` | TEXT (PK) | System-generated unique identifier | Yes | `DOC-1234` |
| `doc_number` | TEXT (unique) | Human-readable document number | Yes | `SOP-QA-001` |
| `title` | TEXT | Full document title | Yes | `Deviation Investigation and CAPA Procedure` |
| `doc_type` | TEXT | Document classification | Yes | `sop`, `wi`, `form`, `policy`, `spec`, `protocol`, `manual`, `record` |
| `department` | TEXT | Owning department | Yes | `qa`, `qc`, `production`, `engineering`, `regulatory`, `validation` |
| `version_major` | INTEGER | Major version number | Yes | `2` |
| `version_minor` | INTEGER | Minor version number | Yes | `0` |
| `version_display` | TEXT | Display version string | Yes (computed) | `2.0` or `Rev 02` |
| `status` | TEXT | Current lifecycle status | Yes | `draft`, `in_review`, `pending_approval`, `approved`, `effective`, `superseded`, `retired` |
| `classification` | TEXT | Regulatory classification | Yes | `gmp_controlled`, `non_gmp`, `external`, `reference_only` |
| `effective_date` | DATE | Date document becomes active | Null until effective | `2026-04-01` |
| `review_due_date` | DATE | Next periodic review due date | Computed | `2028-04-01` |
| `review_cycle_months` | INTEGER | Periodic review frequency | Yes (default 24) | `24` |
| `expiry_date` | DATE | Optional hard expiry (for time-limited documents) | No | `2027-12-31` |
| `author_id` | UUID (FK) | Document author/creator | Yes | FK to users |
| `owner_id` | UUID (FK) | Document owner (may differ from author) | Yes | FK to users |
| `supersedes_doc_id` | TEXT (FK) | Previous version's doc_id | Null for v1.0 | `DOC-1198` |
| `superseded_by_doc_id` | TEXT (FK) | Newer version's doc_id | Null if current | `DOC-1301` |
| `change_control_id` | TEXT (FK) | Linked change control record | Null for editorial changes | `CC-2345` |
| `training_required` | BOOLEAN | Whether read-and-understand or formal training is needed | Yes | `true` |
| `training_type` | TEXT | Type of training required | If training_required | `read_understand`, `facilitated`, `competency_assessment`, `none` |
| `reason_for_change` | TEXT | Documented reason for this version | Required for v > 1.0 | `Updated hold times per CC-2345 to reflect validated process changes` |
| `summary_of_changes` | TEXT | Brief description of what changed | Required for v > 1.0 | `Section 5.3: Extended intermediate hold time from 24h to 48h` |
| `content_hash` | TEXT | SHA-256 hash of document content | Yes | For integrity verification |
| `file_path` | TEXT | Storage location of document file | Yes | `/documents/qa/SOP-QA-001-v2.0.pdf` |
| `file_size_bytes` | INTEGER | File size | Yes | `245780` |
| `file_type` | TEXT | MIME type | Yes | `application/pdf` |
| `tags` | TEXT[] | Searchable tags | No | `['deviation', 'investigation', 'capa', 'root-cause']` |
| `regulatory_references` | TEXT[] | Applicable regulations | No | `['21 CFR 211.192', 'ICH Q10 3.2.2']` |
| `cross_references` | TEXT[] | Other documents referenced | No | `['SOP-QA-002', 'SOP-QA-010', 'FRM-QA-001']` |
| `created_at` | TIMESTAMPTZ | Record creation timestamp | Yes | Auto-generated |
| `updated_at` | TIMESTAMPTZ | Last modification timestamp | Yes | Auto-generated |
| `created_by` | UUID (FK) | Creator user ID | Yes | FK to users |

### 3.2 Document Number Format

**Recommended Format:** `{TYPE}-{DEPT}-{SEQ}`

| Component | Values | Example |
|---|---|---|
| TYPE | `SOP`, `WI`, `FRM`, `POL`, `SPEC`, `PROT`, `MAN`, `REC`, `EXT` | `SOP` |
| DEPT | `QA`, `QC`, `PROD`, `ENG`, `REG`, `VAL`, `IT`, `EHS`, `SC`, `HR` | `QA` |
| SEQ | `001` through `999` (zero-padded) | `001` |

**Examples:**
- `SOP-QA-001` — First QA SOP
- `WI-PROD-023` — 23rd Production Work Instruction
- `FRM-QC-015` — 15th QC Form
- `POL-QA-003` — 3rd QA Policy
- `SPEC-QC-001` — First QC Specification
- `PROT-VAL-012` — 12th Validation Protocol
- `EXT-REG-001` — First external Regulatory document

**Document Number Rules:**
1. Document numbers are permanent and never reused, even after retirement.
2. The number does not change when a new version is created — the version number changes instead.
3. Sequential numbering within each TYPE-DEPT combination.
4. External documents retain their original numbering but are assigned an internal reference number for tracking.

### 3.3 Document Version Record Schema

**Separate version tracking table (one row per document version):**

| Field | Type | Description |
|---|---|---|
| `version_id` | TEXT (PK) | System-generated unique ID |
| `doc_id` | TEXT (FK) | Parent document reference |
| `version_major` | INTEGER | Major version |
| `version_minor` | INTEGER | Minor version |
| `status` | TEXT | Version-specific status |
| `authored_by` | UUID (FK) | Author of this version |
| `authored_at` | TIMESTAMPTZ | Authoring timestamp |
| `reviewed_by` | JSONB | Array of reviewer records |
| `approved_by` | JSONB | Array of approver records |
| `effective_date` | DATE | When this version became effective |
| `superseded_date` | DATE | When this version was superseded |
| `reason_for_change` | TEXT | Why this version was created |
| `summary_of_changes` | TEXT | What changed in this version |
| `content_hash` | TEXT | SHA-256 of the document content |
| `file_path` | TEXT | File storage path for this version |

### 3.4 Approval Record Schema

**One row per approval action:**

| Field | Type | Description |
|---|---|---|
| `approval_id` | TEXT (PK) | System-generated (e.g., `DAPP-1234`) |
| `doc_id` | TEXT (FK) | Document being approved |
| `version_id` | TEXT (FK) | Specific version being approved |
| `approver_id` | UUID (FK) | The approving user |
| `approver_name` | TEXT | Printed name (Part 11 requirement) |
| `role` | TEXT | Role in which they are approving |
| `approval_type` | TEXT | `review`, `approve`, `reject` |
| `signature_meaning` | TEXT | Part 11: meaning of signature |
| `decision` | TEXT | `approved`, `approved_with_comments`, `rejected`, `returned_for_revision` |
| `comments` | TEXT | Reviewer/approver comments |
| `signed_at` | TIMESTAMPTZ | Timestamp of signature |
| `ip_address` | TEXT | For audit purposes |

### 3.5 Document Type Classification

| Code | Name | Description | Typical Review Cycle | Training Default |
|---|---|---|---|---|
| `sop` | Standard Operating Procedure | Step-by-step procedure for a specific activity | 24 months | Read & Understand |
| `wi` | Work Instruction | Detailed task-level instruction (sub-SOP) | 24 months | Read & Understand |
| `form` | Form / Template | Blank form for data capture | 24-36 months | None (trained via parent SOP) |
| `policy` | Policy | High-level organisational directive | 36 months | Read & Understand |
| `spec` | Specification | Product, material, or equipment specifications | 12-24 months | Facilitated |
| `protocol` | Protocol | Validation, stability, or qualification protocol | Per use | Facilitated |
| `manual` | Manual | Quality manual, equipment manual | 36 months | None |
| `record` | Master Record | Master batch record, master production record | 12-24 months | Facilitated |
| `external` | External Document | External standards, regulations, customer specs | Annual check | None |

---

## 4. Distribution and Training

### 4.1 Controlled Copy Management

**In Electronic Document Management Systems (EDMS):**

The concept of "controlled copies" in electronic systems differs from paper-based systems:

- The electronic version in the EDMS is the master/original controlled copy.
- All users access the same electronic copy, which is always the current effective version.
- Paper printouts from the EDMS are considered **uncontrolled copies** unless specifically designated otherwise.
- All printed documents should carry a watermark or footer: "UNCONTROLLED WHEN PRINTED — Verify current version in Document Management System."
- For areas where electronic access is not available (e.g., clean rooms, gowning areas), controlled paper copies may be issued. These must be:
  - Stamped or marked as "CONTROLLED COPY" with a copy number.
  - Listed in a controlled copy register.
  - Physically retrieved and destroyed when the document is superseded.
  - Subject to periodic verification that the controlled copy matches the current electronic version.

**Controlled Copy Register Fields:**
- Copy number
- Document number and version
- Issued to (person or location)
- Issue date
- Retrieved date
- Retrieved by
- Destruction confirmed

**Best practice for Vent:** Since Vent is an electronic system, the primary distribution mechanism is electronic access. Implement a "who has access" view per document (based on department/role assignments). Support printing with automatic "UNCONTROLLED WHEN PRINTED" watermark. Optionally support a controlled paper copy register for clean room documents.

### 4.2 Read-and-Understand Acknowledgement

**Workflow:**
1. New or revised document becomes effective.
2. System identifies all personnel who require training on this document (based on department, role, or explicit assignment).
3. Training assignments are auto-generated with a deadline (typically 14-30 days from effective date).
4. Each assignee must open the document, read it, and acknowledge understanding.
5. Acknowledgement is recorded as a training record with:
   - User ID and printed name
   - Document number and version
   - Timestamp of acknowledgement
   - Electronic signature (Part 11 compliant)
   - Statement: "I have read and understand the contents of this document and will perform my duties in accordance with it."
6. Training completion is tracked as a percentage and reported to management.
7. Personnel who do not complete training by the deadline are flagged and may be restricted from performing the governed activity.

**Training Record Fields:**

| Field | Type | Description |
|---|---|---|
| `training_record_id` | TEXT (PK) | System-generated ID |
| `doc_id` | TEXT (FK) | Document trained on |
| `version_id` | TEXT (FK) | Specific version trained on |
| `trainee_id` | UUID (FK) | Person being trained |
| `training_type` | TEXT | `read_understand`, `facilitated`, `competency_assessment` |
| `assigned_date` | DATE | When training was assigned |
| `due_date` | DATE | Training deadline |
| `completed_date` | TIMESTAMPTZ | When training was completed |
| `status` | TEXT | `assigned`, `in_progress`, `completed`, `overdue`, `waived` |
| `acknowledgement_text` | TEXT | Statement acknowledged |
| `signed_at` | TIMESTAMPTZ | E-signature timestamp |
| `facilitator_id` | UUID (FK) | For facilitated training |
| `assessment_score` | NUMERIC | For competency assessments |
| `assessment_passed` | BOOLEAN | Pass/fail |

### 4.3 Training Records Linkage

**Cross-module dependencies with Vent's existing Training Matrix module:**

The document control module and the training matrix module are tightly coupled:

1. **Document control drives training:** When a new or revised document becomes effective, training assignments are auto-generated in the training module.
2. **Training status gates document effectiveness:** Optionally, a document's effective date can be deferred until a minimum percentage of affected personnel have completed training.
3. **Training records reference specific document versions:** Each training record must link to the exact version of the document (not just the document number). When a document is revised, new training assignments are generated for the new version.
4. **Personnel qualification depends on training currency:** If a document is revised and an individual has not completed training on the new version, they are technically unqualified to perform the governed activity.
5. **Periodic re-training:** Some documents require periodic re-training (e.g., annually). This is managed by the training module but triggered by document metadata (`training_required`, `training_type`, re-training frequency).

**Integration pattern for Vent:**
- When a document transitions to `effective` status, the document control service calls the training service to auto-generate training assignments.
- The training module exposes an API endpoint that accepts: `doc_id`, `version_id`, `training_type`, `assignee_list` (or `department`/`role` for bulk assignment), `due_date`.
- Training completion events from the training module can be surfaced in the document control detail view: "Training Progress: 45/52 personnel trained (87%)."

### 4.4 Superseded Document Handling

**Requirements:**
1. Superseded documents must be immediately removed from active distribution.
2. In electronic systems: superseded documents should no longer appear in default search results or document lists (only the current effective version is shown).
3. Superseded documents must be retained and accessible for historical reference (via "show all versions" or "version history" view).
4. Superseded documents should be clearly marked with a watermark or banner: "SUPERSEDED — NOT FOR ACTIVE USE."
5. For paper controlled copies: physical retrieval and destruction is required (tracked in the controlled copy register).
6. Personnel who were trained on the superseded version and have not yet completed training on the new version should be flagged.

**Retention Rules:**
- Superseded SOPs: Retain for the life of the product plus the regulatory retention period (typically 1 year after product expiry for drugs, longer for biologics).
- Industry best practice: Retain all superseded versions indefinitely in electronic systems (storage cost is negligible).
- At minimum: retain N-1 (the immediately preceding version) plus any versions that were effective during the manufacturing of currently marketed batches.

---

## 5. Electronic Document Management — 21 CFR Part 11 Compliance

### 5.1 E-Signature Requirements for Document Approvals

Every approval action (review, approve, reject) in the document control workflow is an electronic signature event under 21 CFR Part 11 and EU GMP Annex 11.

**Required signature components:**

```
┌─────────────────────────────────────────────────────┐
│  ELECTRONIC SIGNATURE RECORD                         │
│                                                      │
│  Signer:     Dr. Sarah Walsh                        │
│  User ID:    swalsh@facility.com                    │
│  Role:       QA Manager                             │
│  Action:     APPROVED                               │
│  Meaning:    "I have reviewed this document and     │
│               approve it for release."              │
│  Document:   SOP-QA-001 v2.0                        │
│  Timestamp:  2026-03-07T14:32:18Z                   │
│  IP Address: 10.0.1.45                              │
│                                                      │
│  Authentication: Password re-entered at time of     │
│                  signing (21 CFR 11.200)             │
└─────────────────────────────────────────────────────┘
```

**Implementation requirements:**
1. **Full authentication at each signing:** Each approval requires the user to re-enter their password (or provide biometric authentication). A simple "click to approve" button is NOT Part 11 compliant.
2. **Signature meaning:** The system must capture the meaning of the signature (review, approve, author, reject). This is not optional.
3. **Immutable record:** Once a signature is applied, it cannot be modified or deleted. The signature record is permanently linked to the specific document version.
4. **Non-repudiation:** The signer cannot later deny having signed. Achieved through unique credentials, audit trail, and signature record.

### 5.2 Audit Trail Requirements

**What must be audit-logged:**

| Event | Required Fields | 21 CFR Part 11 Reference |
|---|---|---|
| Document created | User, timestamp, doc_id, doc_number | 11.10(e) |
| Document edited (any field) | User, timestamp, field changed, old value, new value | 11.10(e) |
| Document content uploaded/replaced | User, timestamp, file hash (old and new) | 11.10(e) |
| Status changed | User, timestamp, old status, new status | 11.10(e) |
| Review submitted | User, timestamp, decision, comments | 11.10(e), 11.50 |
| Approval/rejection | User, timestamp, decision, signature meaning | 11.10(e), 11.50 |
| Document distributed | User, timestamp, distribution list | 11.10(e) |
| Training assigned | User, timestamp, assignee list | 11.10(e) |
| Training completed | User, timestamp, acknowledgement | 11.10(e) |
| Document superseded | User, timestamp, superseding doc_id | 11.10(e) |
| Document retired | User, timestamp, reason | 11.10(e) |
| Access permission changed | User, timestamp, permission details | 11.10(e) |
| Document viewed/downloaded | User, timestamp (optional, for sensitive docs) | Best practice |

**Audit trail rules:**
1. Audit trails are system-generated — users cannot create, modify, or delete audit entries.
2. Audit trails must be retained for at least as long as the records they describe.
3. Audit trails must be readily available for regulatory review.
4. The audit trail must capture the reason for any change (prompted at the time of the change).
5. Timestamps must use a reliable, synchronised time source (server time, not client time).

### 5.3 Reason-for-Change Requirements

Per EU GMP Annex 11 Section 9.2: "The reason for the change should be documented."

**Implementation:**
- When any GMP-relevant field is modified on a document record, the system must prompt the user to enter a reason for the change.
- The reason is captured in the audit trail along with the before/after values.
- For document revisions (new versions), the "reason for change" is a mandatory field at the document level.
- For editorial corrections within the same version, a brief reason is captured (e.g., "Corrected typographical error in Section 3.2").
- Reason-for-change entries must not be editable after submission.

### 5.4 Access Control Requirements

**Role-Based Access Control (RBAC) for Document Control:**

| Permission | Author | Reviewer | Approver | QA Admin | Read-Only |
|---|---|---|---|---|---|
| Create new document | Yes | No | No | Yes | No |
| Edit draft documents (own) | Yes | No | No | Yes | No |
| Edit draft documents (any) | No | No | No | Yes | No |
| Submit for review | Yes | No | No | Yes | No |
| Perform review | No | Yes | No | Yes | No |
| Approve/reject | No | No | Yes | Yes | No |
| Set effective date | No | No | No | Yes | No |
| Retire document | No | No | No | Yes | No |
| View effective documents | Yes | Yes | Yes | Yes | Yes |
| View superseded documents | Yes | Yes | Yes | Yes | Yes |
| View audit trail | No | No | No | Yes | No |
| Manage approval matrices | No | No | No | Yes | No |
| Assign training | No | No | No | Yes | No |

---

## 6. AI Opportunities

### 6.1 Auto-Suggest Reviewers Based on Department and Document Type

**Concept:** When an author submits a document for review, the AI suggests appropriate reviewers based on the document's department, type, scope, and content.

**Implementation approach:**
- Maintain reviewer assignment history: who has reviewed which types of documents.
- Use document metadata (department, type, tags, regulatory references) to identify relevant SMEs.
- Cross-reference with the training module to ensure suggested reviewers are qualified.
- Consider workload balancing: distribute review assignments evenly among qualified reviewers.
- Provide confidence scores for suggestions and allow the author to accept, modify, or add reviewers.

**AI prompt strategy:**
```
Given document metadata:
- Type: SOP
- Department: QA
- Title: "Deviation Investigation and CAPA Procedure"
- Tags: deviation, investigation, capa, root-cause
- Regulatory references: 21 CFR 211.192, ICH Q10 3.2.2

Historical reviewer assignments for similar documents: [...]
Current reviewer workloads: [...]

Suggest 3-5 reviewers with department, role, and rationale for each.
```

**Value:** Reduces time to assign reviewers from hours to seconds. Ensures appropriate cross-functional review coverage. Reduces risk of missing a key department.

### 6.2 Detect Outdated Cross-References Between SOPs

**Concept:** When a document references other documents (e.g., "Refer to SOP-QA-002 for detailed procedure"), the AI detects if any referenced documents have been updated, superseded, or retired since the referencing document was last revised.

**Implementation approach:**
1. Parse document content and metadata to extract cross-references (document numbers mentioned in text, explicit cross-reference fields).
2. Build a document dependency graph: Document A references Documents B, C, D.
3. When Document B is revised, automatically flag Document A as having a potentially outdated reference.
4. Generate a report: "SOP-QA-001 v2.0 references SOP-QA-002 v1.0, but SOP-QA-002 is now on v3.0. The following sections may need updating: Section 5.2 (reference to investigation procedure)."
5. Optionally, AI can read both documents and assess whether the reference is likely still valid or needs updating.

**AI prompt strategy:**
```
Document SOP-QA-001 v2.0 references SOP-QA-002 in Section 5.2:
"For detailed investigation methodology, refer to SOP-QA-002 Section 4."

SOP-QA-002 has been revised from v1.0 (effective when SOP-QA-001 was written)
to v3.0. Changes in v2.0 and v3.0 include: [summary of changes].

Assess: Is the cross-reference in SOP-QA-001 still valid? Does Section 4
still exist in v3.0? Has the referenced content changed substantively?
```

**Value:** Prevents orphaned references — a common FDA 483 observation. Proactively identifies documents that need revision when referenced documents change.

### 6.3 Periodic Review Reminders and Prioritisation

**Concept:** Beyond simple date-based reminders, AI prioritises periodic reviews based on risk and context.

**Implementation approach:**
- **Risk-based prioritisation:** Documents governing critical processes (sterile manufacturing, cell bank management) are prioritised over administrative documents.
- **Change-driven urgency:** If multiple change controls or deviations reference a document since its last review, it should be prioritised for earlier review.
- **Regulatory change detection:** If new regulations or guidance documents are issued that affect a document's scope, AI flags it for early review.
- **Usage-based signals:** Documents that are frequently accessed or referenced by training records are more critical and should be reviewed more promptly.

**AI output:**
```
Periodic Review Priority Report — Next 90 Days

1. SOP-PROD-012 "Bioreactor Harvest Procedure" [CRITICAL]
   Due: 2026-04-15 | Last reviewed: 2024-04-15
   Priority boost: 3 deviations linked since last review (DEV-2341, DEV-2567, DEV-2890)
   Recommendation: Review immediately. Consider incorporating lessons learned from linked deviations.

2. SOP-QA-001 "Deviation Investigation Procedure" [HIGH]
   Due: 2026-05-01 | Last reviewed: 2024-05-01
   Priority boost: Referenced by 12 other SOPs. 2 referenced documents have been updated.
   Recommendation: Review cross-references. Update Section 5 to reflect new CAPA module.

3. FRM-QC-003 "Raw Material Certificate of Analysis" [ROUTINE]
   Due: 2026-06-15 | Last reviewed: 2024-06-15
   No priority signals detected.
   Recommendation: Standard periodic review.
```

### 6.4 Impact Assessment When One SOP Changes

**Concept:** When an SOP is revised, AI automatically identifies all other documents, training records, batch records, and processes that may be affected.

**Implementation approach:**
1. **Document dependency graph:** Query the cross-reference data to find all documents that reference the changed document.
2. **Training impact:** Identify all personnel currently trained on the document and flag them for re-training.
3. **Batch record impact:** If the SOP governs a manufacturing step, identify any master batch records that reference it.
4. **Equipment and validation impact:** Cross-reference with equipment logbook and validation protocol databases.
5. **RAG-powered content analysis:** Use semantic search (via the existing Vent RAG infrastructure) to find documents that discuss the same topics as the changed SOP, even if they don't explicitly cross-reference it.

**AI output:**
```json
{
  "changed_document": "SOP-PROD-012 v2.0 → v3.0",
  "change_summary": "Updated bioreactor harvest temperature from 25±2°C to 20±3°C",
  "direct_references": [
    { "doc": "SOP-PROD-015", "section": "4.3", "reference_type": "explicit" },
    { "doc": "BPR-001", "section": "Step 12", "reference_type": "explicit" },
    { "doc": "PROT-VAL-008", "section": "3.1", "reference_type": "explicit" }
  ],
  "semantic_matches": [
    { "doc": "SOP-PROD-018", "relevance": 0.89, "topic": "harvest procedure downstream" },
    { "doc": "SPEC-QC-003", "relevance": 0.82, "topic": "in-process temperature specifications" }
  ],
  "training_impact": {
    "personnel_affected": 23,
    "departments": ["production", "qc"],
    "estimated_training_hours": 4.6
  },
  "recommendation": "Update BPR-001 Step 12 to reflect new temperature range. Re-validate harvest process per PROT-VAL-008. Retrain 23 production and QC personnel."
}
```

### 6.5 Readability Scoring

**Concept:** AI evaluates document readability to ensure SOPs are comprehensible to their intended audience.

**Implementation approach:**
- Apply readability metrics: Flesch-Kincaid Grade Level, Gunning Fog Index, SMOG Index.
- Target readability level depends on the intended audience:
  - Operator-level SOPs: Grade 8-10
  - Technical SOPs: Grade 10-12
  - Policies and management documents: Grade 12-14
- Flag documents that exceed the target readability level.
- Identify specific sentences or paragraphs that are overly complex.
- Suggest simplified alternatives.

**AI prompt strategy:**
```
Analyze the following SOP for readability. The intended audience is production
operators with high school education and GMP training.

Target: Flesch-Kincaid Grade Level 8-10.

For any sections exceeding Grade 12, suggest simplified alternatives that
maintain technical accuracy and regulatory compliance.

Flag any ambiguous instructions that could lead to different interpretations
by different operators.
```

**Value:** SOPs that are too complex lead to training failures, deviations, and compliance gaps. Readability scoring is a proactive quality measure. This is an area where no competitor offers AI-driven assistance.

### 6.6 Gap Analysis Against Regulatory Requirements

**Concept:** AI compares the organisation's document library against regulatory requirements to identify missing or inadequate documentation.

**Implementation approach:**
1. **Regulatory requirements database:** Maintain a structured list of required documents per regulation (21 CFR 211 requires X SOPs, EU GMP requires Y procedures, etc.).
2. **Coverage mapping:** Map existing documents to regulatory requirements. Identify gaps where no document covers a required procedure.
3. **Content adequacy assessment:** For existing documents, AI evaluates whether the content adequately addresses the regulatory requirement (e.g., "21 CFR 211.192 requires investigation of any unexplained discrepancy. SOP-QA-001 covers investigation but does not explicitly address 'unexplained discrepancy' — consider adding a definition and escalation criteria.")
4. **New regulation scanning:** When new regulatory guidance is issued, AI identifies which existing documents may need updating and which new documents may need to be created.

**AI output:**
```
Regulatory Coverage Analysis — 21 CFR Part 211

✓ 211.22  Quality control unit responsibilities — Covered by POL-QA-001
✓ 211.100 Written production procedures — Covered by SOP-PROD-001 through SOP-PROD-045
✗ 211.113 Penicillin contamination control — NO DOCUMENT FOUND
  Recommendation: Create SOP for penicillin cross-contamination prevention
  (if applicable to facility; mark as N/A if no beta-lactam products)
⚠ 211.192 Production record review — Partially covered by SOP-QA-005
  Gap: SOP does not explicitly address "unexplained discrepancy" investigation
  Recommendation: Add section defining unexplained discrepancies and escalation path
✓ 211.198 Complaint handling — Covered by SOP-QA-010
```

### 6.7 Automated Document Classification

**Concept:** When a new document is uploaded or created, AI automatically suggests the document type, department, classification, required reviewers, and training requirements based on the content.

**Implementation:**
- Analyze document title and content.
- Match against existing document taxonomy.
- Suggest metadata fields: type, department, classification, tags, regulatory references.
- Flag if the document appears to duplicate or overlap with an existing document.
- Confidence scoring on all suggestions.

### 6.8 Change Summary Generation

**Concept:** When a new version of a document is uploaded, AI compares it with the previous version and automatically generates a summary of changes.

**Implementation:**
- Diff the content of the new version against the previous version.
- Identify added, removed, and modified sections.
- Generate a human-readable summary of changes suitable for the "summary of changes" field.
- Classify changes as editorial (formatting, typos) vs. substantive (procedural changes, new requirements).
- Flag changes that may require additional change control, validation, or training.

---

## 7. Industry Best Practices

### 7.1 Document Numbering Conventions

**Convention 1: TYPE-DEPT-SEQ (Most Common)**
```
SOP-QA-001    Standard Operating Procedure, Quality Assurance, #001
WI-PROD-023   Work Instruction, Production, #023
FRM-QC-015    Form, Quality Control, #015
```
- **Pros:** Immediately identifies type and department. Easy to sort and filter. Intuitive.
- **Cons:** Reorganising departments requires renumbering or maintaining legacy numbers.
- **Recommendation for Vent:** Use this convention.

**Convention 2: SITE-TYPE-SEQ (Multi-Site)**
```
DUB-SOP-001   Dublin site, SOP #001
BOS-SOP-001   Boston site, SOP #001
```
- Used by multi-site organisations to distinguish site-level from corporate-level documents.
- **Vent consideration:** Not needed for V1 (single-site), but reserve the prefix slot for future multi-site expansion.

**Convention 3: Functional Area Numbering (Hierarchical)**
```
QMS-100-001   Quality Management System, 100-series (Document Control), #001
QMS-200-001   Quality Management System, 200-series (Deviations), #001
PRD-100-001   Production, 100-series (Upstream), #001
PRD-200-001   Production, 200-series (Downstream), #001
```
- Used by larger organisations with hierarchical document structures.
- **Pros:** Supports deep categorisation. Scalable.
- **Cons:** Complex. Harder to remember. Requires a numbering scheme guide.

### 7.2 Change Request Workflow Before SOP Revision

**Best practice:** No substantive SOP revision should begin without an approved change request.

**Workflow:**
1. **Trigger identified:** Deviation, CAPA, audit finding, regulatory update, process improvement, or periodic review identifies the need for a document change.
2. **Change request submitted:** The requester submits a change request (may be a full change control or a simplified document change request, depending on the significance).
3. **Impact assessment:** QA and relevant departments assess the impact of the proposed change.
4. **Change request approved:** Approval to proceed with the revision.
5. **Document revision begins:** Author creates a new draft version of the document.
6. **Revision reviewed and approved:** Standard document approval workflow.
7. **Change control closed:** After the revised document is effective and training is complete, the change request is closed.

**Exception — Administrative/Editorial Changes:**
- Typographical corrections, formatting changes, and editorial clarifications that do not affect procedural intent may use an abbreviated workflow.
- Typically: author makes the change, QA reviews and approves, minor version increment.
- No full change control required, but the reason for change must still be documented.

**Integration with Vent Change Control Module:**
- The document control module should support linking to change control records (CC-xxxx).
- When a change control includes "document revision" as an implementation task, the document control module should auto-create a draft revision linked to that CC record.
- Closing a change control should verify that all linked document revisions have been completed and approved.

### 7.3 Effective Date vs. Approval Date Separation

**Why they must be separate:**

| Date | Definition | Purpose |
|---|---|---|
| Approval Date | The date the last required approver signs the document. | Records when the document was formally approved. Cannot be changed. |
| Effective Date | The date the document becomes the active, controlled version for use. | Determines when personnel must begin following the new procedure. |

**Scenarios where they differ:**

1. **Training required before effectiveness:** Document is approved on March 1, but 50 operators need training. Effective date is set to April 1, giving 30 days for training completion.
2. **Process alignment:** Document is approved on March 1, but the process change it supports is scheduled for implementation on June 1. Effective date matches the implementation date.
3. **Regulatory filing:** Document revision supports a regulatory variation. Effective date is deferred until regulatory approval is received.
4. **Batch transition:** New batch record version is approved, but current batches in progress continue to use the old version. Effective date is set for the next batch start.

**Implementation rules:**
- Effective date must be on or after the approval date (never before).
- If effective date is in the future, the document status is `approved` (not yet `effective`).
- On the effective date, the system automatically transitions the status to `effective` and supersedes the previous version.
- Personnel are notified of the upcoming effective date.
- Training deadline should be on or before the effective date.

### 7.4 Concurrent Review and Parallel Approval Workflows

**Review Phase — Parallel by Default:**
- All designated reviewers receive the document simultaneously.
- Each reviewer independently reviews and provides feedback.
- Reviews are not sequential unless the document requires iterative refinement between specific reviewers.
- The review phase is complete when all designated reviewers have submitted their feedback (or the review period has expired).
- Author addresses all comments and resubmits if significant changes were made (triggering a second review cycle if needed).

**Approval Phase — Parallel with Sequential Gating:**
- Most approvers can approve in parallel (Production, Engineering, Regulatory).
- QA approval is always last (gating function) — QA confirms that all other approvals are in place and all review comments have been addressed.
- Some organisations require sequential approval for specific document types (e.g., author's department head approves first, then QA).

**Configurable Approval Matrices:**

| Document Type | Department | Required Approvers |
|---|---|---|
| SOP (production) | Production | Production Manager, QA Manager |
| SOP (QA) | QA | QA Director |
| Specification | QC | QC Manager, QA Manager, Regulatory Affairs |
| Master Batch Record | Production | Production Manager, QA Manager, Validation Manager |
| Validation Protocol | Validation | Validation Manager, QA Manager |
| Policy | QA | QA Director, Site Director |

**Best practice:** Store approval matrices as configurable data (not hardcoded logic). Allow QA administrators to define approval requirements by document type and department. Vent should support this as a configuration table.

### 7.5 Document Template Management

**Best practice:** Provide standardised templates for each document type.

**Template components:**
- Standard header with document number, title, version, effective date, classification.
- Standard sections appropriate to the document type (Purpose, Scope, Responsibilities, Procedure, References, Revision History for SOPs).
- Standard footer with page numbering and controlled copy notice.
- Consistent formatting (fonts, heading styles, numbering).

**Benefits:**
- Ensures consistency across the document library.
- Reduces authoring time.
- Ensures all required sections are included.
- Simplifies review (reviewers know where to find specific information).

---

## 8. Common Pitfalls

### 8.1 Version Control Conflicts

**Problem:** Multiple people editing the same document simultaneously, resulting in conflicting changes or lost edits.

**Root causes:**
- No check-out/check-in mechanism in the EDMS.
- Authors working on local copies rather than the controlled system.
- Unclear ownership of who is responsible for the current revision.

**Mitigation strategies:**
1. **Check-out/check-in:** When an author begins editing, the document is "checked out" (locked). Other users can view the document but cannot edit it. The lock is released when the author checks the document back in.
2. **Single author rule:** Only one author per document revision. If multiple contributors are needed, one person is the designated author who consolidates inputs.
3. **Audit trail detection:** If conflicting edits are somehow made, the audit trail detects and flags the conflict.
4. **Draft version tracking:** All draft iterations are saved, allowing rollback to any previous draft.
5. **Status-based editing controls:** Only documents in `draft` status can be edited. Once submitted for review, the content is locked.

**Vent implementation:**
- Add a `checked_out_by` field on the document record. When non-null, the document is locked for editing by that user.
- Only the user who checked out the document (or QA admin) can check it back in.
- Auto-release locks after a configurable timeout (e.g., 48 hours) with notification to the user.

### 8.2 Orphaned References

**Problem:** Documents reference other documents that have been superseded, retired, or never existed, creating broken links and incorrect procedural guidance.

**Root causes:**
- No systematic cross-reference tracking.
- Documents revised independently without checking references.
- Document retirement without impact assessment.

**Mitigation strategies:**
1. **Cross-reference registry:** Maintain a database of all document cross-references (which document references which). Update when documents are revised.
2. **Automated reference checking:** When a document is superseded or retired, automatically flag all documents that reference it.
3. **Periodic reference validation:** During periodic review, verify all cross-references are current.
4. **AI-powered detection:** Use NLP to parse document content and identify cross-references, even informal ones (e.g., "as described in the deviation procedure" without a specific document number).

**Vent implementation:**
- Add a `cross_references` field (TEXT array) to the document schema.
- Build a reference graph: for each document, track both "references" (outgoing) and "referenced by" (incoming).
- When a document is revised or retired, run an impact query: "Which documents reference SOP-QA-001?" and generate notifications.
- AI agent periodically scans for orphaned references (references to non-existent or superseded documents).

### 8.3 Training Gaps After Document Updates

**Problem:** Documents are revised and made effective, but affected personnel are not retrained on the new version. Operators continue following outdated procedures, leading to deviations and compliance risk.

**Root causes:**
- Training assignment is manual and someone forgets to create assignments.
- Training is assigned but not tracked to completion.
- No mechanism to block activities until training is complete.
- Unclear which personnel need training on which documents.

**Mitigation strategies:**
1. **Automated training assignment:** When a document becomes effective, the system automatically generates training assignments for all affected personnel (based on department, role, or explicit assignment lists).
2. **Training completion tracking:** Real-time dashboard showing training completion percentage per document.
3. **Overdue training escalation:** Automatic escalation to managers when training deadlines are missed.
4. **Activity blocking (optional):** Integration with operational systems to prevent personnel from performing activities governed by documents they haven't been trained on.
5. **Training matrix integration:** Cross-reference with the training matrix to ensure assignment lists are accurate and current.
6. **Version-specific training:** Training records reference specific document versions. When a document is revised, personnel trained on the old version are flagged as needing re-training.

**Vent implementation:**
- The document control module emits a `document.effective` event.
- The training module subscribes to this event and auto-generates training assignments.
- The document control detail view includes a "Training Status" panel showing completion metrics.
- Personnel list shows training currency: green (trained on current version), amber (trained on previous version, new training assigned), red (never trained or training overdue).

### 8.4 Uncontrolled Copies

**Problem:** Personnel use outdated printed copies, email attachments, or locally saved files instead of the current controlled version from the EDMS.

**Root causes:**
- Electronic system is difficult to access (especially in production areas, clean rooms).
- Habit of printing and filing paper copies.
- Documents shared via email instead of system links.
- Lack of awareness that printed copies are uncontrolled.

**Mitigation strategies:**
1. **"Uncontrolled when printed" watermark:** All documents printed from the system include a prominent watermark or footer.
2. **Print timestamp:** Printed copies include the print date so users can verify currency.
3. **Clean room tablets/kiosks:** Provide electronic access in areas where paper has traditionally been used.
4. **Eliminate email distribution:** Documents are never attached to emails. Only system links are shared.
5. **Periodic walk-throughs:** QA periodically checks for unauthorized paper copies in production areas.
6. **User training:** Annual training on document control procedures and the risks of uncontrolled copies.
7. **Controlled copy register:** For areas where paper is unavoidable, maintain a formal controlled copy register with issuance, retrieval, and destruction tracking.

**Vent implementation:**
- All document views include a prominent notice: "This is a controlled electronic document. Printed copies are uncontrolled."
- PDF export includes an automatic watermark: "UNCONTROLLED WHEN PRINTED — Printed [date] — Verify current version in Vent Document Control."
- Document sharing generates a system link, never an attachment.
- Controlled copy register functionality (optional, for clean room use cases).

### 8.5 Periodic Review Backlogs

**Problem:** Organisations fall behind on periodic reviews, accumulating a backlog of overdue documents. This is one of the most common FDA 483 observations related to document control.

**Root causes:**
- Too many documents with identical review cycles (everything set to 2 years, all due at the same time).
- No proactive review scheduling or workload planning.
- Review owners overloaded with other responsibilities.
- No escalation mechanism for overdue reviews.

**Mitigation strategies:**
1. **Stagger review dates:** Distribute review due dates evenly across the year (e.g., 1/12 of documents due each month).
2. **Risk-based review cycles:** Critical documents reviewed more frequently, administrative documents less frequently.
3. **90-day look-ahead:** Monthly report showing documents coming due for review in the next 90 days, with responsible owners.
4. **Automatic reassignment:** If a document owner leaves the organisation, reviews are automatically reassigned to their successor.
5. **Review simplification:** For documents with no changes since last review, allow a streamlined "reaffirmation" process (QA confirms document is still current without full re-review).
6. **KPI tracking:** Track "percentage of documents reviewed on time" as a quality KPI. Target: >95%.

### 8.6 Inadequate Reason-for-Change Documentation

**Problem:** Document revisions are made without adequate documentation of why the change was made, who requested it, and what triggered it. This undermines the audit trail and makes it difficult to understand the document's evolution.

**Root causes:**
- "Reason for change" field is optional or accepts minimal entries (e.g., "Updated").
- No linkage to triggering events (CAPAs, deviations, change controls).
- Authors treat document revision as a clerical task rather than a quality event.

**Mitigation strategies:**
1. **Mandatory reason-for-change:** The system must not allow a new version to be submitted without a substantive reason for change.
2. **Structured reason categories:** Provide a dropdown for reason category (CAPA, deviation, change control, periodic review, regulatory update, process improvement, editorial correction) plus a free-text explanation.
3. **Triggering event linkage:** Require a linked record (CAPA, CC, DEV) for substantive changes.
4. **Summary of changes:** Require a section-by-section description of what changed.
5. **AI assistance:** AI can diff the old and new versions and auto-generate a draft summary of changes for author review.

---

## 9. Competitor Features

### 9.1 MasterControl Document Control

**Core capabilities:**
- Complete document lifecycle management (draft, review, approve, distribute, retire)
- Configurable approval routing with parallel and sequential paths
- Automated training assignment when documents are revised
- Controlled copy management with issuance and retrieval tracking
- Version control with full revision history
- Electronic signatures (21 CFR Part 11 compliant)
- Change control integration (auto-creates revision tasks from change orders)
- Periodic review scheduling with automated reminders
- Cross-reference tracking between documents
- Full audit trail on all document actions
- PDF watermarking and rendering
- Integration with Microsoft Word for authoring

**Strengths:**
- Most mature document control solution in the GMP market (20+ year history)
- Very tight integration with training, change control, and CAPA modules
- Highly configurable approval workflows
- Strong regulatory inspection track record
- Good template management

**Weaknesses:**
- UI is dated — feels like early 2000s enterprise software
- Complex to configure and administer (requires dedicated MasterControl administrators)
- Expensive ($50K+ annual for document control alone)
- Limited AI/ML capabilities (rules-based only)
- Word-based authoring creates formatting inconsistencies

### 9.2 Veeva Vault QualityDocs

**Core capabilities:**
- Cloud-native document management built for life sciences
- Binder/section structure for organising related documents
- Configurable lifecycle workflows with state transitions
- Role-based access control with fine-grained permissions
- Automated periodic review scheduling
- Integrated training management
- Rendition management (source file + PDF rendition)
- Full audit trail and electronic signatures
- Cross-document linking and impact analysis
- Content search across the document library
- Vault Connections for multi-site document sharing
- API-first architecture

**Strengths:**
- Cloud-native, modern architecture with regular updates
- Purpose-built for life sciences
- Strong content management capabilities (Veeva's heritage is in document management)
- Good multi-site and multi-product support
- Growing AI capabilities through Veeva Vault AI Partner Program
- Fast implementation compared to legacy EDMS

**Weaknesses:**
- Part of a large, complex platform — can be expensive and overwhelming for smaller organisations
- Pricing favours large enterprises ($100K+ annually)
- Limited native AI for document analysis or smart suggestions
- Requires Veeva-specific expertise for configuration

### 9.3 OpenText Documentum (Life Sciences Edition)

**Core capabilities:**
- Enterprise content management with life sciences overlays
- Comprehensive document lifecycle management
- Complex workflow engine with branching and conditional logic
- Integration with Microsoft Office for in-place editing
- Records management with retention scheduling
- Multi-language and multi-site support
- Full audit trail and regulatory compliance features
- Advanced search and classification

**Strengths:**
- Extremely powerful and flexible content management engine
- Handles very large document libraries (millions of documents)
- Strong in heavily regulated environments
- Good records management and archival capabilities

**Weaknesses:**
- Extremely complex to implement and maintain
- Very expensive (enterprise pricing, long implementation cycles of 12-24 months)
- UI is dated
- Overkill for most pharma/biotech companies
- Declining market share to cloud-native alternatives

### 9.4 Qualio Document Control

**Core capabilities:**
- Cloud-based document management designed for life sciences SMBs
- Simple, clean interface for document creation and management
- Approval workflows with electronic signatures
- Training integration with read-and-understand tracking
- Change control integration
- Periodic review reminders
- Templates for common document types
- Audit trail

**Strengths:**
- Clean, modern interface (best UI in the space)
- Fast implementation (weeks, not months)
- Affordable pricing (accessible for startups and SMBs)
- Good for smaller companies getting started with GMP

**Weaknesses:**
- Less configurable than enterprise tools
- Limited scalability for large organisations
- Fewer integration options
- No AI capabilities
- Less proven at large-scale biologics manufacturing

### 9.5 Feature Comparison Matrix

| Feature | MasterControl | Veeva QualityDocs | OpenText | Qualio | Vent (Planned) |
|---|---|---|---|---|---|
| Document lifecycle management | Yes | Yes | Yes | Yes | Yes |
| Version control | Yes | Yes | Yes | Yes | Yes |
| Configurable approval workflows | Yes | Yes | Yes | Basic | Yes |
| Parallel approvals | Yes | Yes | Yes | No | Yes |
| Electronic signatures (Part 11) | Yes | Yes | Yes | Yes | Yes |
| Periodic review scheduling | Yes | Yes | Yes | Yes | Yes |
| Training integration | Yes (native) | Yes (native) | Partial | Yes (native) | Yes (native) |
| Cross-reference tracking | Yes | Yes | Yes | No | Yes + AI |
| Controlled copy management | Yes | Partial | Yes | No | Basic |
| Full audit trail | Yes | Yes | Yes | Yes | Yes |
| Document templates | Yes | Yes | Yes | Yes | Yes |
| PDF watermarking | Yes | Yes | Yes | Yes | Yes |
| Multi-site support | Yes | Yes | Yes | No | No (V1) |
| AI reviewer suggestions | No | No | No | No | **Yes** |
| AI cross-reference validation | No | No | No | No | **Yes** |
| AI readability scoring | No | No | No | No | **Yes** |
| AI regulatory gap analysis | No | No | No | No | **Yes** |
| AI change summary generation | No | No | No | No | **Yes** |
| AI impact assessment | No | No | No | No | **Yes** |
| Smart periodic review priority | No | No | No | No | **Yes** |
| Modern dark-theme UI | No | Partial | No | Yes | **Yes** |
| Biologics-specific intelligence | No | No | No | No | **Yes** |
| Affordable pricing | No | No | No | Yes | **Yes** |

---

## 10. Recommendations for the Vent Document Control Module

### 10.1 Schema Design

**Recommended ID Prefix:** `DOC-` for documents, `DVER-` for document versions, `DAPP-` for document approvals, `DCOPY-` for controlled copies.

**Core Tables:**
1. `documents` — Master document record (one row per document, updated with current version info)
2. `document_versions` — Version history (one row per version of each document)
3. `document_approvals` — Approval records (one row per approval action)
4. `document_training` — Training assignments and completions (links to training module)
5. `document_references` — Cross-reference tracking (many-to-many: document-references-document)
6. `approval_matrices` — Configurable approval requirements by document type and department
7. `document_templates` — Templates for each document type
8. `controlled_copies` — Paper controlled copy register (optional)
9. `periodic_reviews` — Periodic review tracking and scheduling

### 10.2 API Endpoints

**CRUD:**
- `POST /documents` — Create new document
- `GET /documents` — List documents (with filters: status, type, department, owner, overdue)
- `GET /documents/:docId` — Get document detail with version history
- `PUT /documents/:docId` — Update document metadata
- `POST /documents/:docId/versions` — Create new version (draft)
- `PUT /documents/:docId/versions/:verId` — Update draft version
- `POST /documents/:docId/versions/:verId/submit` — Submit for review
- `POST /documents/:docId/versions/:verId/review` — Submit review
- `POST /documents/:docId/versions/:verId/approve` — Approve (with e-signature)
- `POST /documents/:docId/versions/:verId/reject` — Reject
- `POST /documents/:docId/versions/:verId/make-effective` — Set effective date
- `POST /documents/:docId/retire` — Retire document
- `POST /documents/:docId/checkout` — Check out for editing
- `POST /documents/:docId/checkin` — Check in after editing

**AI Endpoints:**
- `POST /documents/ai/suggest-reviewers` — Suggest reviewers for a document
- `POST /documents/ai/check-references` — Validate cross-references
- `POST /documents/ai/readability` — Score document readability
- `POST /documents/ai/gap-analysis` — Regulatory gap analysis
- `POST /documents/ai/change-summary` — Generate summary of changes between versions
- `POST /documents/ai/impact-assessment` — Assess impact of document revision
- `GET /documents/ai/review-priorities` — Prioritised periodic review list

### 10.3 Cross-Module Integration Points

| Module | Integration | Direction |
|---|---|---|
| Change Control | Document revisions linked to CC records | Bidirectional |
| Training Matrix | Auto-generate training when documents become effective | Doc Control → Training |
| Deviations | Deviations can trigger document revisions | Deviations → Doc Control |
| CAPA | CAPAs can require document revisions as corrective actions | CAPA → Doc Control |
| Supplier Quality | Quality agreements are controlled documents | Doc Control manages |
| QC Lab | Test methods and specifications are controlled documents | Doc Control manages |
| Batch Disposition | Master batch records are controlled documents | Doc Control manages |
| Cell Banks | Cell bank SOPs are controlled documents | Doc Control manages |
| Equipment | Equipment SOPs and maintenance procedures | Doc Control manages |
| Charlie AI (RAG) | SOPs ingested for RAG-based querying | Doc Control → RAG |

### 10.4 AI Feature Priorities

| Priority | Feature | Value | Effort |
|---|---|---|---|
| **P0 (build now)** | Cross-reference validation | Prevents orphaned references (common 483 finding) | Medium |
| **P0 (build now)** | Change summary generation | Saves author time, improves audit trail quality | Low |
| **P0 (build now)** | Reviewer suggestion | Reduces workflow friction, ensures appropriate review coverage | Medium |
| **P1 (build now)** | Impact assessment on revision | Identifies downstream effects, prevents training gaps | Medium |
| **P1 (build now)** | Smart periodic review prioritisation | Risk-based review scheduling, reduces 483 risk | Medium |
| **P2 (future)** | Readability scoring | Quality improvement, reduces deviations | Low |
| **P2 (future)** | Regulatory gap analysis | Proactive compliance, inspection readiness | High |
| **P3 (future)** | Automated classification | Convenience feature, reduces metadata entry errors | Low |

### 10.5 Competitive Positioning

Vent's key differentiators vs. incumbents for document control:

1. **AI-native document intelligence:** Cross-reference validation, impact assessment, readability scoring, and regulatory gap analysis are built-in — not available from any competitor.
2. **Biologics-specific context:** AI prompts and templates are tailored for biologics manufacturing SOPs, specifications, and batch records.
3. **Modern UX:** Dark theme, split-panel layout, fast and intuitive — a stark contrast to legacy EDMS interfaces.
4. **Integrated quality suite:** Document control is not a standalone system — it is deeply integrated with change control, training, deviations, CAPAs, and the RAG-powered Charlie AI assistant.
5. **Rapid deployment:** No 6-18 month implementation. Works out of the box with sensible defaults for GMP biologics.
6. **Accessible pricing:** Targets mid-market biologics companies underserved by enterprise EDMS vendors.

---

## 11. Key Regulatory Citations Reference

| Citation | Topic | Relevance to Document Control |
|---|---|---|
| ICH Q10 Section 3.2.1 | Knowledge management | Documents as vehicles for knowledge codification and transfer |
| ICH Q10 Section 3.2.4 | Change management | Document revisions must go through change control |
| 21 CFR 211.100(b) | Written procedures, approval | Dual approval requirement (department + QA) for procedure changes |
| 21 CFR 211.186 | Master production records | Dual-signature creation, QA-gated changes |
| 21 CFR 211.180 | Records retention | Retention for 1 year after product expiry (minimum) |
| 21 CFR 211.68(b) | Electronic equipment controls | Authorized personnel only, documented changes |
| 21 CFR Part 11.10(e) | Audit trails | Secure, timestamped, complete audit trail |
| 21 CFR Part 11.10(f) | Operational checks | Enforce permitted event sequencing |
| 21 CFR Part 11.10(g) | Authority checks | Role-based access to system functions |
| 21 CFR Part 11.50 | Signature manifestations | Printed name, date/time, meaning |
| 21 CFR Part 11.70 | Signature/record linking | Immutable linkage between signature and record |
| 21 CFR Part 11.200 | Signature components | Full re-authentication at each signing event |
| EU GMP Annex 11 Section 4 | Validation | System must be validated (IQ/OQ/PQ) |
| EU GMP Annex 11 Section 6 | Accuracy checks | Verification of critical manual data entry |
| EU GMP Annex 11 Section 7 | Data storage | Secure storage, backup, accessibility throughout retention |
| EU GMP Annex 11 Section 8 | Printouts | Clear printed copies of electronic records |
| EU GMP Annex 11 Section 9 | Audit trails | Reason for change documented for GMP-relevant changes |
| EU GMP Annex 11 Section 12 | Security | Physical/logical access controls, access log |
| EU GMP Annex 11 Section 14 | Electronic signatures | Same impact as handwritten, permanently linked, timestamped |
| EU GMP Annex 11 Section 17 | Archiving | Accessibility, readability, integrity of archived data |
| WHO TRS 961 Annex 5 | QC lab documentation | Unique document IDs, authorization, dating, superseded retention |
| ISO 13485 Section 4.2.4 | Control of documents | Review/approve, version tracking, point-of-use availability, obsolete prevention |
| ISO 13485 Section 4.2.5 | Control of records | Legible, identifiable, retrievable, protected |
| ALCOA+ | Data integrity | Attributable, legible, contemporaneous, original, accurate |

---

*Research compiled 2026-03-07 for the Vent document control module build. Web search tools were unavailable during compilation; content is based on established regulatory knowledge and industry best practices current through training data. Specific regulatory text should be verified against the latest published versions of cited documents before use in production AI prompts.*
