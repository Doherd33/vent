# Agent 1 — Document Control
# Branch: feature/doc-control
# Phase: 1 — Quality Core
# Complexity: L (6 days)

## What to build
Document control management system. Every GMP biologics facility requires a formal system to manage the lifecycle of controlled documents — SOPs, work instructions, forms, policies, specifications, protocols, reports, and master batch records — per 21 CFR 211.100(b), 21 CFR 211.186, 21 CFR Part 11, ICH Q10 Section 3.2.1, EU GMP Chapter 4, EU GMP Annex 11, ISO 13485 Section 4.2.4, and WHO TRS 961 Annex 5. This module manages the full six-stage document lifecycle: draft, review, approve, distribute/train, effective (active), and retire/supersede. Supports version control with major.minor versioning (draft iterations tracked as 0.x, first approval as 1.0, substantive revisions increment major version, editorial corrections increment minor version). Includes periodic review scheduling with configurable review cycles by document type (24 months for SOPs, 36 months for policies, 12 months for specifications), overdue review detection, and risk-based review prioritisation. Documents are classified by type (SOP, WI, form, policy, spec, protocol, report, master-batch-record) and regulatory classification (controlled, uncontrolled, reference-only). Each document carries a human-readable document number (e.g., SOP-QA-001) that persists across versions. Distribution tracking ensures all affected personnel acknowledge receipt and complete required training. Links to change controls (substantive revisions require a CC record), deviations (triggering revisions), and CAPAs (corrective action revisions). AI-native features provide cross-reference validation (detect orphaned references to superseded documents), change summary generation (diff between versions), periodic review prioritisation (risk-based scheduling factoring in linked deviations/CAPAs/change controls), document impact assessment (cascade effects when an SOP changes), and automated document classification — differentiating Vent from incumbents (MasterControl, Veeva, OpenText, Qualio) that lack built-in AI for document intelligence. All document approvals comply with 21 CFR Part 11 (e-signatures with printed name, timestamp, and signature meaning) and ALCOA+ data integrity principles (attributable, legible, contemporaneous, original, accurate).

## Files to create
- `docs/qa/documents.html` (frontend page)
- `server/services/doc-control.service.js` (service layer)
- `server/routes/doc-control.js` (API routes)

## Files to modify (additions only)
- `server/routes/admin.js` — add CREATE TABLE statements
- `server/index.js` — wire service + mount routes + add PAGE_MAP entry
- `server/lib/ids.js` — add ID generators

## Database Tables
Add to `server/routes/admin.js`:

### controlled_documents
```sql
CREATE TABLE IF NOT EXISTS controlled_documents (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  doc_id                TEXT UNIQUE NOT NULL,
  -- doc_id: system-generated unique ID (DOC-1000..9999)
  doc_number            TEXT UNIQUE NOT NULL,
  -- doc_number: human-readable document number in TYPE-DEPT-SEQ format (e.g., SOP-QA-001). Permanent — never reused, never changes across versions.
  title                 TEXT NOT NULL,
  description           TEXT NOT NULL DEFAULT '',
  doc_type              TEXT NOT NULL DEFAULT 'sop',
  -- doc_type values: sop, wi, form, policy, spec, protocol, report, master-batch-record
  -- sop = Standard Operating Procedure, wi = Work Instruction, form = Form/Template, policy = Organisational Policy,
  -- spec = Specification (product/material/equipment), protocol = Validation/Stability Protocol,
  -- report = Validation/Investigation Report, master-batch-record = Master Production Record (21 CFR 211.186)
  department            TEXT NOT NULL DEFAULT 'qa',
  -- department values: qa, qc, production, engineering, regulatory, validation, msat, facilities, supply-chain, ehs, it-automation, hr
  version_major         INTEGER NOT NULL DEFAULT 0,
  -- version_major: major version number. 0 = draft (never approved), 1 = first approved release, 2+ = substantive revisions requiring full approval + change control
  version_minor         INTEGER NOT NULL DEFAULT 1,
  -- version_minor: minor version number. Increments for editorial/typographical corrections not requiring full change control. Resets to 0 on major version increment.
  version_display       TEXT NOT NULL DEFAULT '0.1',
  -- version_display: human-readable version string (e.g., "2.0", "1.3"). Auto-computed from version_major.version_minor.
  status                TEXT NOT NULL DEFAULT 'draft',
  -- status workflow: draft --> in-review --> approved --> effective --> superseded | retired | archived
  -- draft: document is being authored, editable by author/owner
  -- in-review: submitted for formal technical review by SMEs, content locked
  -- approved: all required approvals obtained, pending effective date
  -- effective: current active controlled version, only one version per doc_number can be effective
  -- superseded: replaced by a newer effective version, retained for reference per 21 CFR 211.180
  -- retired: document no longer needed (product discontinued, process decommissioned), requires QA approval
  -- archived: long-term retention after retirement, read-only access
  classification        TEXT NOT NULL DEFAULT 'controlled',
  -- classification values: controlled (GMP-controlled document), uncontrolled (non-GMP reference), reference-only (external standards, customer specs)
  effective_date        DATE,
  -- effective_date: date document becomes the active controlled version. Must be >= approval date. May differ from approval date when training must complete first.
  next_review_date      DATE,
  -- next_review_date: computed as effective_date + review_period_months. System sends reminders at 90, 60, 30, 14 days before due.
  review_period_months  INTEGER NOT NULL DEFAULT 24,
  -- review_period_months: periodic review frequency. Defaults by doc_type: sop=24, wi=24, form=30, policy=36, spec=18, protocol=per-use, report=36, master-batch-record=18
  author                TEXT NOT NULL,
  -- author: user who created/drafted this version (may differ from owner)
  owner                 TEXT NOT NULL,
  -- owner: document owner responsible for content accuracy and periodic review. Typically department head or SME.
  change_control_id     TEXT DEFAULT '',
  -- change_control_id: linked CC-xxxx record for substantive revisions. Required for major version changes. Empty for editorial corrections or first version.
  linked_deviation_id   TEXT DEFAULT '',
  -- linked_deviation_id: DEV-xxxx that triggered this document revision
  linked_capa_id        TEXT DEFAULT '',
  -- linked_capa_id: CAPA-xxxx that required this document revision as a corrective/preventive action
  training_required     BOOLEAN NOT NULL DEFAULT true,
  -- training_required: whether personnel must complete read-and-understand or formal training before the document takes effect
  training_type         TEXT DEFAULT 'read-understand',
  -- training_type values: read-understand (acknowledgement only), facilitated (instructor-led with attendance), competency-assessment (training + test), none
  reason_for_change     TEXT DEFAULT '',
  -- reason_for_change: mandatory for version > 1.0 per EU GMP Annex 11 Section 9.2. Structured reason category + free text.
  reason_category       TEXT DEFAULT '',
  -- reason_category values: capa, deviation, change-control, periodic-review, regulatory-update, process-improvement, editorial-correction, new-document
  summary_of_changes    TEXT DEFAULT '',
  -- summary_of_changes: section-by-section description of what changed from previous version. Required for version > 1.0.
  supersedes_doc_id     TEXT DEFAULT '',
  -- supersedes_doc_id: DOC-xxxx of the previous version this document supersedes. Null/empty for first version.
  superseded_by_doc_id  TEXT DEFAULT '',
  -- superseded_by_doc_id: DOC-xxxx of the newer version that superseded this document. Populated when status transitions to superseded.
  retention_years       INTEGER NOT NULL DEFAULT 15,
  -- retention_years: minimum retention period from effective date. Per 21 CFR 211.180: at least 1 year after product expiry. Industry best practice for biologics: 15+ years.
  file_url              TEXT DEFAULT '',
  -- file_url: storage path/URL for the document file (PDF, Word, etc.)
  content_hash          TEXT DEFAULT '',
  -- content_hash: SHA-256 hash of document content for integrity verification per EU GMP Annex 11 Section 7
  tags                  JSONB DEFAULT '[]',
  -- tags: searchable keywords for discovery (e.g., ["deviation", "investigation", "root-cause"])
  regulatory_references JSONB DEFAULT '[]',
  -- regulatory_references: applicable regulations (e.g., ["21 CFR 211.192", "ICH Q10 3.2.2"])
  cross_references      JSONB DEFAULT '[]',
  -- cross_references: other documents referenced by this document (e.g., ["SOP-QA-002", "FRM-QA-001"]). Used for orphan reference detection.
  checked_out_by        TEXT DEFAULT '',
  -- checked_out_by: user who currently has the document locked for editing. Empty = not checked out. Only checked-out user or QA admin can check in.
  checked_out_at        TIMESTAMPTZ,
  -- checked_out_at: timestamp when document was checked out. Auto-release after 48h with notification.
  ai_classification     JSONB DEFAULT '{}',
  -- ai_classification: AI-suggested doc_type, department, tags, training_type with confidence scores
  ai_change_summary     TEXT DEFAULT '',
  -- ai_change_summary: AI-generated summary of changes between this version and the previous
  ai_impact_assessment  JSONB DEFAULT '{}',
  -- ai_impact_assessment: AI-generated cascade impact analysis (affected documents, training, batch records, equipment)
  ai_review_priority    JSONB DEFAULT '{}',
  -- ai_review_priority: AI-calculated periodic review priority score with reasoning (factors in linked deviations, CAPAs, cross-reference staleness)
  created_by            TEXT NOT NULL DEFAULT 'system',
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cd_status ON controlled_documents(status);
CREATE INDEX IF NOT EXISTS idx_cd_doc_type ON controlled_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_cd_department ON controlled_documents(department);
CREATE INDEX IF NOT EXISTS idx_cd_owner ON controlled_documents(owner);
CREATE INDEX IF NOT EXISTS idx_cd_classification ON controlled_documents(classification);
CREATE INDEX IF NOT EXISTS idx_cd_doc_number ON controlled_documents(doc_number);
CREATE INDEX IF NOT EXISTS idx_cd_next_review ON controlled_documents(next_review_date);
CREATE INDEX IF NOT EXISTS idx_cd_effective_date ON controlled_documents(effective_date);
CREATE INDEX IF NOT EXISTS idx_cd_change_control ON controlled_documents(change_control_id);
CREATE INDEX IF NOT EXISTS idx_cd_checked_out ON controlled_documents(checked_out_by);
ALTER TABLE controlled_documents ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'controlled_documents_all') THEN
    CREATE POLICY controlled_documents_all ON controlled_documents FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;
```

### document_versions
```sql
CREATE TABLE IF NOT EXISTS document_versions (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  version_id        TEXT UNIQUE NOT NULL,
  -- version_id: system-generated unique ID (DVER-1000..9999)
  doc_id            TEXT NOT NULL REFERENCES controlled_documents(doc_id),
  -- doc_id: parent document reference. Multiple versions per document.
  version_major     INTEGER NOT NULL DEFAULT 0,
  version_minor     INTEGER NOT NULL DEFAULT 1,
  version_display   TEXT NOT NULL DEFAULT '0.1',
  status            TEXT NOT NULL DEFAULT 'draft',
  -- status values: draft, in-review, approved, effective, superseded, retired
  change_summary    TEXT DEFAULT '',
  -- change_summary: what changed in this version vs. the previous version
  reason_for_change TEXT DEFAULT '',
  -- reason_for_change: why this version was created. Mandatory for versions > 1.0.
  file_url          TEXT DEFAULT '',
  -- file_url: storage path for this specific version's document file
  content_hash      TEXT DEFAULT '',
  -- content_hash: SHA-256 hash of this version's content for integrity verification
  previous_version_id TEXT DEFAULT '',
  -- previous_version_id: DVER-xxxx of the immediately preceding version. Null/empty for first version.
  effective_date    DATE,
  -- effective_date: date this version became the active controlled version
  superseded_date   DATE,
  -- superseded_date: date this version was replaced by a newer version
  created_by        TEXT NOT NULL DEFAULT 'system',
  -- created_by: author of this version (may differ from document owner)
  approved_by       TEXT DEFAULT '',
  -- approved_by: final approver who authorised this version (captures last approval in the chain)
  approved_at       TIMESTAMPTZ,
  -- approved_at: timestamp of final approval. Cannot be later than effective_date.
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dver_doc ON document_versions(doc_id);
CREATE INDEX IF NOT EXISTS idx_dver_status ON document_versions(status);
CREATE INDEX IF NOT EXISTS idx_dver_version ON document_versions(version_major, version_minor);
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'document_versions_all') THEN
    CREATE POLICY document_versions_all ON document_versions FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;
```

### document_reviews
```sql
CREATE TABLE IF NOT EXISTS document_reviews (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id         TEXT UNIQUE NOT NULL,
  -- review_id: system-generated unique ID (DREV-1000..9999)
  doc_id            TEXT NOT NULL REFERENCES controlled_documents(doc_id),
  -- doc_id: document being reviewed
  version_id        TEXT DEFAULT '',
  -- version_id: specific DVER-xxxx being reviewed (for version-specific reviews). Empty for periodic reviews of the current effective version.
  reviewer          TEXT NOT NULL,
  -- reviewer: user performing the review
  reviewer_role     TEXT DEFAULT '',
  -- reviewer_role: role in which the reviewer is acting (qa, qc, production, engineering, etc.)
  review_type       TEXT NOT NULL DEFAULT 'periodic',
  -- review_type values: periodic (scheduled periodic review), for-cause (triggered by deviation/CAPA/audit), regulatory (triggered by regulatory update), version-review (review of a new draft version), approval (formal approval with e-signature)
  status            TEXT NOT NULL DEFAULT 'pending',
  -- status values: pending (assigned, not started), in-progress (reviewer has opened), completed (reviewer submitted decision), overdue (past due date without completion)
  due_date          DATE,
  -- due_date: deadline for review completion. Auto-set based on review type SLAs.
  completed_at      TIMESTAMPTZ,
  -- completed_at: timestamp when review was completed
  outcome           TEXT DEFAULT '',
  -- outcome values for periodic reviews: current (no changes needed, document reaffirmed), needs-revision (substantive changes required, initiate change control), needs-minor-update (editorial corrections, expedited approval), retire (document no longer needed)
  -- outcome values for version reviews: approved, approved-with-comments, rejected, returned-for-revision
  decision          TEXT DEFAULT '',
  -- decision: for approval-type reviews — approved, rejected, request-info
  signature_meaning TEXT DEFAULT '',
  -- signature_meaning: per 21 CFR Part 11.10(k) and 11.50 — "review", "approval", "authorship". Required for all approval-type reviews.
  comments          TEXT DEFAULT '',
  -- comments: reviewer feedback, required when outcome = rejected or returned-for-revision
  signed_at         TIMESTAMPTZ,
  -- signed_at: e-signature timestamp. Must use server time, not client time, per ALCOA+ contemporaneous principle.
  created_by        TEXT NOT NULL DEFAULT 'system',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_drev_doc ON document_reviews(doc_id);
CREATE INDEX IF NOT EXISTS idx_drev_version ON document_reviews(version_id);
CREATE INDEX IF NOT EXISTS idx_drev_reviewer ON document_reviews(reviewer);
CREATE INDEX IF NOT EXISTS idx_drev_type ON document_reviews(review_type);
CREATE INDEX IF NOT EXISTS idx_drev_status ON document_reviews(status);
CREATE INDEX IF NOT EXISTS idx_drev_due ON document_reviews(due_date);
CREATE INDEX IF NOT EXISTS idx_drev_outcome ON document_reviews(outcome);
ALTER TABLE document_reviews ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'document_reviews_all') THEN
    CREATE POLICY document_reviews_all ON document_reviews FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;
```

### document_distribution
```sql
CREATE TABLE IF NOT EXISTS document_distribution (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  doc_id                TEXT NOT NULL REFERENCES controlled_documents(doc_id),
  -- doc_id: document being distributed
  version_id            TEXT DEFAULT '',
  -- version_id: specific DVER-xxxx being distributed
  user_id               TEXT NOT NULL,
  -- user_id: person who must acknowledge receipt and/or complete training
  user_name             TEXT DEFAULT '',
  -- user_name: printed name for audit trail
  department            TEXT DEFAULT '',
  -- department: recipient's department
  role                  TEXT DEFAULT '',
  -- role: recipient's role
  distribution_type     TEXT DEFAULT 'electronic',
  -- distribution_type values: electronic (standard EDMS access), controlled-copy (physical paper copy for clean rooms)
  acknowledged          BOOLEAN DEFAULT false,
  -- acknowledged: true when the user has confirmed receipt and understanding
  acknowledged_at       TIMESTAMPTZ,
  -- acknowledged_at: timestamp of acknowledgement (e-signature event per Part 11)
  training_required     BOOLEAN DEFAULT false,
  -- training_required: whether this user must complete training beyond simple acknowledgement
  training_completed    BOOLEAN DEFAULT false,
  -- training_completed: true when linked training record is marked complete
  training_completed_at TIMESTAMPTZ,
  -- training_completed_at: timestamp of training completion
  due_date              DATE,
  -- due_date: deadline for acknowledgement/training completion. Typically 14-30 days from effective date.
  created_by            TEXT NOT NULL DEFAULT 'system',
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ddist_doc ON document_distribution(doc_id);
CREATE INDEX IF NOT EXISTS idx_ddist_user ON document_distribution(user_id);
CREATE INDEX IF NOT EXISTS idx_ddist_ack ON document_distribution(acknowledged);
CREATE INDEX IF NOT EXISTS idx_ddist_training ON document_distribution(training_completed);
CREATE INDEX IF NOT EXISTS idx_ddist_due ON document_distribution(due_date);
ALTER TABLE document_distribution ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'document_distribution_all') THEN
    CREATE POLICY document_distribution_all ON document_distribution FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;
```

## ID Generators
Add to `server/lib/ids.js`:
- `docId()` --> `DOC-1000...9999`
- `docVersionId()` --> `DVER-1000...9999`
- `docReviewId()` --> `DREV-1000...9999`

## API Endpoints

### Core CRUD
- `POST /documents` — create a new controlled document (auto-generates DOC-ID, sets review_period_months based on doc_type, creates initial DVER record in document_versions). Requires doc_number, title, doc_type, department. If doc_type is master-batch-record, requires dual authorship (author + independent checker per 21 CFR 211.186).
- `GET /documents` — list all documents (filter by status, doc_type, department, owner, classification, overdue reviews, checked out, training_required). Default: only effective documents shown. Include `showAll=true` to see superseded/retired. Search by doc_id, doc_number, title, tags.
- `GET /documents/:docId` — single document with full detail: version history (from document_versions), review records (from document_reviews), distribution/training status (from document_distribution), cross-references, linked change controls/deviations/CAPAs, AI panels.
- `PUT /documents/:docId` — update document metadata (title, description, owner, tags, regulatory_references, cross_references, training_required, training_type, review_period_months). Only allowed when status = draft. Auto-recalculates next_review_date when review_period_months changes. Requires reason for change on GMP-relevant fields per EU GMP Annex 11 Section 9.2.

### Version Management
- `POST /documents/:docId/versions` — create a new draft version. Auto-increments version_major (for substantive changes) or version_minor (for editorial corrections, determined by `revisionType` param: 'major' or 'minor'). Creates a new DVER record. For major revisions, requires change_control_id. Copies metadata from current effective version as starting point.
- `GET /documents/:docId/versions` — list all versions for a document, ordered by version number descending. Shows version_display, status, effective_date, superseded_date, created_by, approved_by.
- `GET /documents/:docId/versions/:verId` — single version detail with its review/approval records.

### Workflow Transitions
- `POST /documents/:docId/submit` — submit draft for review (draft --> in-review). Validates all required fields are populated. Locks document content (checked_out_by cleared). Sets review SLA due dates for all assigned reviewers (default: 10 business days for periodic, 5 business days for version reviews). Blocked if checked_out_by is set (must check in first).
- `POST /documents/:docId/review` — submit a review decision (for assigned reviewers). Captures reviewer, decision (approved, approved-with-comments, rejected, returned-for-revision), comments, signature_meaning per 21 CFR Part 11.50. Creates immutable review record. When all required reviews are approved, auto-transitions status to approved.
- `POST /documents/:docId/approve` — formal QA approval (final gate). QA approval is always the last approval in the chain per 21 CFR 211.100(b). Captures e-signature: printed name, timestamp, signature meaning ("approval"). Creates immutable approval record linked to the specific version (per 21 CFR Part 11.70). Sets approved_by and approved_at on the DVER record. For master-batch-records, requires dual approval (QA Manager + Production Manager per 21 CFR 211.186).
- `POST /documents/:docId/make-effective` — set the effective date and transition to effective (approved --> effective). effective_date must be >= approval date. If training_required = true, may set a future effective_date to allow training completion. Auto-supersedes the previous effective version of the same doc_number (sets old version status to 'superseded', superseded_date, superseded_by_doc_id). Auto-calculates next_review_date = effective_date + review_period_months. Auto-creates document_distribution records for affected personnel based on department/role. Triggers training assignment generation.
- `POST /documents/:docId/retire` — initiate document retirement (effective --> retired). Requires QA approval and reason for retirement. Validates no other active documents have unresolved cross-references to this document (warns if found). Sets retention end date = now + retention_years.
- `POST /documents/:docId/checkout` — lock document for editing (only for draft status). Sets checked_out_by = current user, checked_out_at = now. Blocked if already checked out by another user. Auto-releases after 48 hours with notification.
- `POST /documents/:docId/checkin` — release edit lock. Only the checked-out user or QA admin can check in. Clears checked_out_by and checked_out_at.

### Periodic Review Endpoints
- `POST /documents/:docId/periodic-review` — initiate a periodic review. Creates a document_review record with review_type = 'periodic'. Assigns reviewer (document owner by default, can be overridden). Sets due_date per SLA (30 business days for periodic reviews).
- `POST /documents/:docId/periodic-review/complete` — complete a periodic review. Captures outcome (current, needs-revision, needs-minor-update, retire), comments. If outcome = current: resets next_review_date = now + review_period_months, no version change. If outcome = needs-revision: initiates change control workflow, creates draft version. If outcome = retire: initiates retirement workflow.
- `GET /documents/reviews/overdue` — list all documents with overdue periodic reviews (next_review_date < today and status = effective). Sorted by days overdue descending.
- `GET /documents/reviews/upcoming` — list all documents with periodic reviews due within the next N days (default 90). Grouped by month.

### Distribution & Training
- `POST /documents/:docId/distribute` — create distribution records for specified users/departments/roles. Auto-sets due_date (14 days for read-and-understand, 30 days for facilitated training).
- `POST /documents/:docId/acknowledge` — record user acknowledgement of document receipt. Captures e-signature (printed name, timestamp, acknowledgement statement per 21 CFR Part 11). Sets acknowledged = true, acknowledged_at.
- `GET /documents/:docId/distribution` — list all distribution/training records for a document. Shows completion percentage, overdue acknowledgements, training status per user.

### Dashboard & Analytics
- `GET /documents/stats` — dashboard stats: total documents by status (draft, in-review, approved, effective, superseded, retired), documents by type, documents by department, overdue periodic reviews count, overdue training acknowledgements count, average review cycle time (last 30 days), documents checked out count, periodic review on-time rate (% reviewed before due date), documents needing attention (overdue reviews + overdue training + stale cross-references).

### AI Endpoints
- `POST /documents/:docId/ai/classify` — AI: auto-classify document type, department, tags, training type, and regulatory references based on title and content. Returns suggestions with confidence scores. Flag low-confidence classifications (<70) for manual review.
- `POST /documents/:docId/ai/change-summary` — AI: generate a summary of changes between the current draft version and the previous effective version. Diffs content (if file_url is available) or compares metadata changes. Classifies each change as editorial vs. substantive. Auto-populates summary_of_changes field on the document.
- `POST /documents/:docId/ai/check-references` — AI: validate all cross-references in the document. For each referenced document, check if it is still effective or has been superseded/retired. Flag orphaned references with details: "SOP-QA-001 v2.0 references SOP-QA-002 v1.0, but SOP-QA-002 is now on v3.0." Return a cross-reference health report with actionable recommendations.
- `POST /documents/:docId/ai/impact` — AI: assess the cascade impact of revising this document. Identify: (1) documents that reference this document (incoming cross-references), (2) personnel requiring re-training, (3) batch records affected, (4) equipment SOPs affected, (5) semantic matches via RAG (documents discussing the same topics even without explicit cross-references). Return structured impact report with recommendations.
- `POST /documents/ai/review-priorities` — AI: generate a prioritised periodic review list for the next 90 days. Factor in: (1) days until/past review due date, (2) number of linked deviations/CAPAs since last review, (3) number of cross-referenced documents that have been updated, (4) document criticality (critical process SOPs > administrative documents), (5) training coverage (heavily-referenced documents score higher). Return ranked list with priority level (critical, high, routine) and reasoning.
- `POST /documents/:docId/ai/suggest-reviewers` — AI: suggest appropriate reviewers based on document type, department, scope, tags, and historical reviewer assignments. Cross-reference with qualification data to ensure suggested reviewers are qualified. Consider workload balancing. Return 3-5 reviewer suggestions with department, role, and rationale.

## Role Access
- qa (all operations — create, edit, approve, retire, distribute, AI endpoints, view audit trail, manage approval matrices)
- admin (all operations — same as qa)
- regulatory (read all, approve specifications and policy documents, periodic review for regulatory documents)
- production (read effective documents, acknowledge distribution, periodic review for production SOPs/WIs)
- engineering (read effective documents, acknowledge distribution, periodic review for engineering SOPs/WIs)
- msat (read effective documents, acknowledge distribution, periodic review for msat SOPs)
- qc (read effective documents, acknowledge distribution, periodic review for QC specifications and methods)
- validation (read effective documents, acknowledge distribution, periodic review for validation protocols)
- facilities (read effective documents, acknowledge distribution)
- ehs (read effective documents, acknowledge distribution)
- operator (read effective documents assigned to them, acknowledge distribution, complete training)

### Approval Matrix (by document type)
- **SOP (production):** Production Manager + QA Manager
- **SOP (QA):** QA Director (single approval sufficient — QA reviewing its own documents)
- **SOP (other departments):** Department Head + QA Manager
- **Specification:** QC Manager + QA Manager + Regulatory Affairs (if product spec)
- **Master Batch Record:** Production Manager + QA Manager + Validation Manager (per 21 CFR 211.186)
- **Policy:** QA Director + Site Director
- **Work Instruction:** Department Head + QA representative
- **Form/Template:** Department Head + QA representative (expedited — may use QA-only for minor templates)
- **Protocol:** Validation Manager + QA Manager
- **Report:** Author's Manager + QA Manager

## AI Features (use Anthropic Claude via service dependency)

### Build Now (Round 4)

- **Auto-classify document** — given the document title, description, and content (if available), automatically suggest the document type (sop, wi, form, policy, spec, protocol, report, master-batch-record), owning department, tags, training type, and regulatory references. Use few-shot examples from the existing document library to improve accuracy. Return confidence scores for each suggestion. Flag documents that appear to duplicate or overlap with existing documents. Example output: "Classified as SOP, Department: Production, Tags: ['bioreactor', 'harvest', 'downstream'], Training: read-understand, Confidence: 92%. Similar existing document: SOP-PROD-012 (87% similarity) — verify this is not a duplicate."

- **Generate change summary** — when a new version of a document is drafted, automatically compare it with the previous effective version and generate a human-readable summary of changes. Identify added, removed, and modified sections. Classify each change as editorial (formatting, typos, clarifications) vs. substantive (procedural changes, new requirements, changed acceptance criteria). For substantive changes, flag that a change control record may be required. Auto-populate the summary_of_changes and reason_for_change fields. Example output: "Section 5.3: Extended intermediate hold time from 24h to 48h [SUBSTANTIVE — change control recommended]. Section 7.1: Corrected typographical error 'centifuge' to 'centrifuge' [EDITORIAL]. Section 9: Added new reference to SOP-QC-015 [EDITORIAL]."

- **Validate cross-references** — scan the document's cross_references field and content to identify all references to other documents. For each reference, check: (1) does the referenced document exist in the system? (2) is it still effective or has it been superseded/retired? (3) if superseded, what is the current version? Build a cross-reference health report. Flag orphaned references (references to superseded or retired documents). This directly prevents a common FDA 483 observation. Example output: "Cross-reference health: 12 references found. 10 current, 1 superseded (SOP-QA-002 v1.0 referenced, current is v3.0 — update recommended), 1 retired (FRM-QC-003 — remove or replace reference)."

- **Assess document revision impact** — when a document is being revised, automatically identify all downstream effects. Query the cross_references graph in reverse to find all documents that reference the changing document. Cross-reference with training records to estimate personnel re-training impact. Use RAG/pgvector to find semantically related documents even without explicit cross-references. Return a structured impact report: affected documents (with specific sections), affected personnel count by department, estimated training hours, affected batch records, recommendations. Example output: "Revising SOP-PROD-012 will affect: 3 documents with direct references (SOP-PROD-015 Section 4.3, BPR-001 Step 12, PROT-VAL-008 Section 3.1), 2 semantic matches (SOP-PROD-018, SPEC-QC-003), 23 personnel requiring re-training across Production and QC (estimated 4.6 training hours total)."

- **Prioritise periodic reviews** — generate a risk-based prioritised list of documents due for periodic review in the next 90 days. Score each document using multiple factors: (1) days until/past review due date (overdue = critical), (2) number of deviations linked since last review (more deviations = higher priority), (3) number of CAPAs linked since last review, (4) number of change controls affecting referenced documents, (5) document criticality based on type and department (production SOPs > administrative forms), (6) cross-reference staleness (how many referenced documents have been updated since this document's last review). Return a ranked list with priority level, score breakdown, and specific recommendations for each document. This replaces the simple calendar-based approach used by all competitors.

- **Suggest reviewers** — when a document is submitted for review, suggest 3-5 appropriate reviewers based on: (1) document type and department, (2) historical reviewer assignments for similar documents, (3) reviewer qualifications (cross-reference with training matrix), (4) current workload (number of pending reviews per potential reviewer). Return reviewer suggestions with department, role, qualification status, current workload, and rationale. Supports workload balancing to prevent reviewer fatigue.

### Future Enhancements (not Round 4)
- **Readability scoring** — analyse document readability (Flesch-Kincaid, Gunning Fog) against target audience level and suggest simplifications
- **Regulatory gap analysis** — compare document library against regulatory requirements to identify missing or inadequate documentation
- **Template-based drafting** — AI-assisted document drafting using department-specific SOP templates
- **Automated training assessment generation** — create competency assessment questions from SOP content
- **Natural language querying** — "Show me all SOPs that reference the bioreactor harvest process" via the existing Vent query engine
- **Version comparison visualisation** — side-by-side diff view with highlighted changes between any two versions

## Dependencies
- Change Control (live R3) — substantive document revisions are linked to change control records (CC-xxxx). When a CC implementation task includes "document revision", document control auto-creates a draft.
- Training Matrix (live R1) — auto-generate training assignments when documents become effective. Training completion status surfaces in the document detail view.
- Deviation Manager (live R1) — deviations can trigger document revisions. Linked via linked_deviation_id.
- CAPA Tracker (live R2) — CAPAs can require document revisions as corrective/preventive actions. Linked via linked_capa_id.

## Wiring in server/index.js
```js
// Require at top
const docControlRoutes = require('./routes/doc-control');
const { makeDocControlService } = require('./services/doc-control.service');

// Instantiate service
const docControlService = makeDocControlService({ supabase, auditLog, anthropic });

// Add to PAGE_MAP
'documents.html': 'qa/documents.html',

// Mount routes
docControlRoutes(app, { auth: requireAuth, docControlService });
```

## Frontend Page: docs/qa/documents.html

### Layout
Split-panel: list (left) + detail (right), matching `docs/qa/deviations.html`.

### Features
1. **Document List** (left panel)
   - Filterable by status (draft, in-review, approved, effective, superseded, retired), document type (sop, wi, form, policy, spec, protocol, report, master-batch-record), department (qa, qc, production, engineering, regulatory, validation, msat, facilities, supply-chain, ehs, it-automation), classification (controlled, uncontrolled, reference-only), owner, training required, checked out
   - Search by doc_id, doc_number, title, tags
   - Default view: effective documents only. Toggle "Show All Versions" to include superseded/retired.
   - Status badges with lifecycle stage colors (draft=grey, in-review=blue, approved=amber, effective=green, superseded=orange, retired=red)
   - Document type icons or color-coded badges
   - Overdue periodic review indicator (red dot for overdue, amber for due within 30 days)
   - Checked-out indicator (lock icon with user name)
   - Training completion percentage badge (green >90%, amber 50-90%, red <50%)
   - Sort by: doc_number, title, effective date, next review date, created date, department

2. **Document Detail** (right panel)
   - Header: doc_id, doc_number, title, version_display badge, status badge, doc_type badge, department badge, classification badge
   - Document metadata: author, owner, effective_date, next_review_date (with countdown: "Due in 45 days" or "Overdue by 12 days" in red), review_period_months, retention_years
   - Description and content preview (if file_url available)
   - **Status workflow visualiser:** horizontal progress bar showing Draft --> In Review --> Approved --> Effective --> (Superseded | Retired). Current stage highlighted. Training progress shown between Approved and Effective when training_required = true.
   - **Version History section:** table of all versions from document_versions. Columns: version_display, status, created_by, approved_by, effective_date, superseded_date, change_summary. Current effective version highlighted. Click any version to view its detail.
   - **Review & Approval section:** list of all reviews from document_reviews for the current version. Grouped by review_type. Shows reviewer name, role, decision/outcome, signature_meaning, comments, timestamp. Approval records show e-signature details (printed name + timestamp + meaning per Part 11). For pending reviews: show countdown to due date.
   - **Cross-References section:** two-way display. "References" = documents this document references (from cross_references field). "Referenced By" = documents that reference this document (reverse lookup). Status indicator for each: green (current/effective), red (superseded/retired), grey (not found). AI "Validate References" button.
   - **Distribution & Training section:** table of distribution records. Columns: user name, department, role, acknowledged (yes/no with timestamp), training status (pending/completed/overdue with timestamp), due date. Training completion progress bar: "Training Progress: 45/52 personnel (87%)". Color-coded: green (>90% complete), amber (50-90%), red (<50%). AI auto-generates distribution lists based on department/role when the "Distribute" button is clicked.
   - **Linked Records section:** change control link (clickable to CC detail), deviation link (clickable to deviation detail), CAPA link (clickable to CAPA detail). Shows linked record status.
   - **Periodic Review section** (visible when status = effective): next_review_date with countdown, last review outcome, review history table. "Initiate Periodic Review" button. For overdue reviews: prominent red banner "PERIODIC REVIEW OVERDUE — Due [date], [N] days overdue."
   - **AI Results panels:**
     - Classification suggestions with confidence scores and "Apply" button
     - Change summary (for draft versions) with editorial vs. substantive classifications
     - Cross-reference health report with orphaned reference warnings
     - Impact assessment report with affected documents, training impact, recommendations
     - Suggested reviewers with workload and qualification details
   - **Audit trail timeline:** immutable log of all actions with timestamp, user, action description, and before/after values (21 CFR Part 11 compliant). Every state change, metadata edit, review, approval, distribution, and checkout/checkin logged.

3. **Create Document Modal**
   - Document number (TYPE-DEPT-SEQ format, auto-suggested based on selected type and department with next available sequence number)
   - Title (required)
   - Description
   - Document type dropdown (sop, wi, form, policy, spec, protocol, report, master-batch-record) — with tooltip describing each type
   - Department dropdown (qa, qc, production, engineering, regulatory, validation, msat, facilities, supply-chain, ehs, it-automation)
   - Classification dropdown (controlled, uncontrolled, reference-only) — default: controlled
   - Owner (defaults to current user, can be changed)
   - Review period (months) — auto-populated based on doc_type (sop=24, wi=24, form=30, policy=36, spec=18, protocol=0, report=36, master-batch-record=18)
   - Training required checkbox (default: checked for sop, wi, spec, master-batch-record)
   - Training type dropdown (read-understand, facilitated, competency-assessment, none) — visible when training required is checked
   - Tags (comma-separated, auto-suggested by AI)
   - Regulatory references (multi-select from common citations)
   - Linked change control (optional, autocomplete search for CC-xxxx)
   - Linked deviation (optional, autocomplete search for DEV-xxxx)
   - Linked CAPA (optional, autocomplete search for CAPA-xxxx)
   - File upload (PDF, Word, etc.)
   - AI: "Auto-Classify" button — fills doc_type, department, tags, training_type based on title/description/content

4. **New Version Modal**
   - Revision type radio: Major (substantive change) or Minor (editorial correction)
   - For Major: change control ID required (autocomplete search for CC-xxxx)
   - Reason for change (required) — dropdown for category (capa, deviation, change-control, periodic-review, regulatory-update, process-improvement, editorial-correction) + free text
   - Summary of changes (required for major, optional for minor — AI can auto-generate)
   - File upload for new version content
   - AI: "Generate Change Summary" button — diffs against previous version and auto-fills

5. **Review Modal**
   - Decision dropdown: approved, approved-with-comments, rejected, returned-for-revision
   - Signature meaning dropdown (review, approval) — per 21 CFR Part 11.50
   - Comments (required for rejected/returned-for-revision, optional for approved)
   - Displays: printed name (from user profile), timestamp (auto-captured), decision meaning — satisfying Part 11 e-signature requirements
   - Password re-entry field for e-signature authentication (per 21 CFR Part 11.200 — each signing is an independent event requiring full authentication)

6. **Periodic Review Modal**
   - Current version display (doc_number, version_display, effective_date, time since last review)
   - Outcome radio: Current (no changes needed), Needs Revision (initiate change control), Needs Minor Update (editorial corrections), Retire (document no longer needed)
   - Comments (required for all outcomes — reviewer must document their assessment)
   - For "Current" outcome: confirms next_review_date reset
   - For "Needs Revision" outcome: prompts for change control creation
   - For "Retire" outcome: prompts for retirement reason

7. **Distribution Modal**
   - Target: by department (multi-select), by role (multi-select), or by individual user (search/add)
   - Training required checkbox (inherits from document default, can be overridden per user)
   - Due date for acknowledgement/training (default: 14 days for read-understand, 30 days for facilitated)
   - Acknowledgement statement text (pre-populated: "I have read and understand the contents of this document and will perform my duties in accordance with it.")
   - AI: "Suggest Distribution List" button — suggests departments/roles based on document type and department

8. **Stats Dashboard** (top)
   - Total documents by status (clickable counts to filter list): effective, draft, in-review, superseded, retired
   - Documents by type (bar chart): SOP, WI, Form, Policy, Spec, Protocol, Report, MBR
   - Documents by department (bar chart)
   - Overdue periodic reviews count (red highlight, clickable)
   - Periodic review on-time rate (% of reviews completed before due date, target >95%)
   - Upcoming reviews: next 30 / 60 / 90 days count
   - Overdue training acknowledgements count (red highlight, clickable)
   - Documents currently checked out (count with user list)
   - Average review cycle time (submission to approval, last 30 days)
   - AI: "Review Priorities" button — opens AI-generated prioritised periodic review report

9. **Controlled Document Banner**
   - All document detail views display a notice: "This is a controlled electronic document. Printed copies are uncontrolled."
   - Superseded documents display a prominent banner: "SUPERSEDED — NOT FOR ACTIVE USE. Current version: [doc_number] v[version_display]" with link to the current version.
   - Retired documents display: "RETIRED — FOR REFERENCE ONLY. Retained per regulatory requirements."

### Required imports
```html
<link rel="stylesheet" href="/shared/styles.css">
<script src="/shared/nav.js"></script>
<script src="/shared/i18n.js"></script>
<script src="/shared/dev-progress.js"></script>
```

Use `authFetch()` for all API calls. Use CSS variables from shared/styles.css (dark theme).

## Architecture Rules
- Service factory pattern: `module.exports = { makeDocControlService }`
- Use `requireAuth` and `requireRole('qa')` middleware on write routes (create, update, approve, retire, distribute); `requireAuth` on read routes for cross-functional access
- Review routes: allow qa + the document's department role (e.g., production can review production SOPs)
- Approval routes: enforce approval matrix — only users with the required role for the document type can approve. QA approval is always last (gating function per 21 CFR 211.100(b)).
- Distribution acknowledgement routes: any authenticated user can acknowledge their own distribution
- Use `auditLog()` for all create/update/delete/approve/transition/checkout/checkin/distribute/acknowledge operations — every state change must be logged
- Audit trail entries must include: action, userId, timestamp, and the full before/after state diff for the changed record (21 CFR Part 11.10(e))
- E-signatures on approvals must capture: printed name (from user profile), timestamp, and signature meaning (review/approval) per 21 CFR Part 11.10(k) and 11.50
- Version number auto-management: auto-increment version_major for major revisions, version_minor for minor revisions. Auto-compute version_display. version_minor resets to 0 on major increment.
- Auto-compute next_review_date = effective_date + review_period_months when document transitions to effective
- Auto-set review_period_months defaults based on doc_type: sop=24, wi=24, form=30, policy=36, spec=18, protocol=0 (per-use), report=36, master-batch-record=18
- Auto-supersede previous effective version when a new version of the same doc_number becomes effective. Set old version: status='superseded', superseded_date=now, superseded_by_doc_id=new doc_id
- Only one version of a doc_number can have status='effective' at any time — enforce uniqueness
- Block submit (draft --> in-review) if checked_out_by is set (must check in first)
- Block approval if not all required reviews (per approval matrix) have decision = 'approved'
- Block make-effective if effective_date < approval date
- Block retirement if other effective documents have unresolved cross-references to this document (warn, allow override by QA)
- checked_out_by auto-releases after 48 hours — background check or on next access
- Reason for change is mandatory for any version > 1.0 per EU GMP Annex 11 Section 9.2
- Content hash (SHA-256) verified on file upload for integrity per EU GMP Annex 11 Section 7
- Frontend: `authFetch()` for all API calls
- Frontend: dark theme (--bg, --surface, --accent CSS vars)
- Frontend: split-panel layout (list left, detail right)
- No frameworks — vanilla HTML/CSS/JS only
- 21 CFR Part 11 compliant: immutable audit trail, e-signature on approvals with printed name + timestamp + meaning, record/signature linking (11.70), authority checks (11.10(g)), operational sequence checks (11.10(f))
- 21 CFR 211.100(b) compliant: dual approval (department + QA) for procedure changes
- 21 CFR 211.186 compliant: dual authorship and QA-gated changes for master production records
- 21 CFR 211.180 compliant: superseded documents retained, never deleted
- EU GMP Annex 11 compliant: audit trail with reason for change (Section 9), accuracy checks (Section 6), data storage/backup (Section 7), printout support (Section 8), electronic signatures (Section 14), archiving (Section 17)
- ICH Q10 compliant: knowledge management via document distribution and training linkage (Section 3.2.1), change management integration (Section 3.2.4)
- ISO 13485 Section 4.2.4 compliant: review/approve before issue, identify changes and revision status, point-of-use availability, prevent unintended use of obsolete documents
- ALCOA+ compliant: attributable (all actions linked to users), legible (electronic format), contemporaneous (server timestamps), original (EDMS is the official record), accurate (content hash verification)

## Reference files (copy patterns from)
- `docs/qa/deviations.html` — layout, styling, split-panel pattern
- `server/services/deviation-mgr.service.js` — service factory with AI features
- `server/services/capa.service.js` — service factory with AI prompts and audit logging pattern
- `server/routes/deviation-mgr.js` — route pattern with auth guards
- `server/routes/change-control.js` — route pattern with workflow transitions and approval tiers
- `server/lib/ids.js` — ID generator pattern
- `server/lib/audit.js` — audit logging
