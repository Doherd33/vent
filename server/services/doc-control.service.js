'use strict';

const ids = require('../lib/ids');
const parseClaudeJson = require('../lib/parse-claude-json');

// ── Review period defaults by doc_type ──────────────────────────────────────
const REVIEW_PERIOD_DEFAULTS = {
  sop: 24, wi: 24, form: 30, policy: 36, spec: 18,
  protocol: 0, report: 36, 'master-batch-record': 18,
};

// ── Training defaults by doc_type ───────────────────────────────────────────
const TRAINING_REQUIRED_DEFAULTS = {
  sop: true, wi: true, form: false, policy: false, spec: true,
  protocol: false, report: false, 'master-batch-record': true,
};

// ── AI Prompt Templates ────────────────────────────────────────────────────

const CLASSIFY_PROMPT = (title, description, docType) => `You are a pharmaceutical document control specialist for a GMP biologics manufacturing facility.

Given the following document information, classify the document:

DOCUMENT:
Title: ${title}
Description: ${description || 'Not provided'}
${docType ? `Current type: ${docType}` : ''}

Classify:
1. Document type: sop, wi, form, policy, spec, protocol, report, or master-batch-record
2. Owning department: qa, qc, production, engineering, regulatory, validation, msat, facilities, supply-chain, ehs, it-automation, hr
3. Suggested tags (3-6 keywords)
4. Training type: read-understand, facilitated, competency-assessment, or none
5. Regulatory references (applicable regulations)

Return ONLY valid JSON (no markdown fences):
{
  "doc_type": "sop",
  "department": "qa",
  "tags": ["keyword1", "keyword2"],
  "training_type": "read-understand",
  "training_required": true,
  "regulatory_references": ["21 CFR 211.100"],
  "confidence": 85,
  "reasoning": "Brief explanation"
}`;

const CHANGE_SUMMARY_PROMPT = (title, prevVersion, currentVersion) => `You are a pharmaceutical document change analyst for a GMP biologics facility.

Compare the previous and current versions of this controlled document and generate a summary of changes.

DOCUMENT: ${title}
PREVIOUS VERSION: ${prevVersion}
CURRENT VERSION: ${currentVersion}

For each change, classify as:
- EDITORIAL: formatting, typos, clarifications (no change control needed)
- SUBSTANTIVE: procedural changes, new requirements, changed acceptance criteria (change control recommended)

Return ONLY valid JSON (no markdown fences):
{
  "changes": [
    {"section": "Section X", "description": "What changed", "type": "editorial|substantive"}
  ],
  "summary": "Overall summary of changes",
  "substantive_count": 0,
  "editorial_count": 0,
  "change_control_recommended": false,
  "auto_reason_for_change": "Suggested reason for change field value"
}`;

const CHECK_REFERENCES_PROMPT = (title, crossRefs, referencedDocs) => `You are a pharmaceutical document control specialist validating cross-references in a GMP facility.

DOCUMENT: ${title}
CROSS-REFERENCES IN DOCUMENT: ${JSON.stringify(crossRefs)}
REFERENCED DOCUMENTS STATUS: ${JSON.stringify(referencedDocs)}

Validate each cross-reference:
1. Does the referenced document exist?
2. Is it still effective or has it been superseded/retired?
3. If superseded, what is the current version?

Return ONLY valid JSON (no markdown fences):
{
  "total_references": 0,
  "current": 0,
  "superseded": 0,
  "retired": 0,
  "not_found": 0,
  "details": [
    {"ref": "SOP-QA-001", "status": "current|superseded|retired|not-found", "message": "Description", "action": "none|update-reference|remove-reference"}
  ],
  "health_score": 100,
  "recommendations": ["Recommendation 1"]
}`;

const IMPACT_PROMPT = (title, docNumber, referencingDocs, department) => `You are a pharmaceutical document impact analyst for a GMP biologics facility.

DOCUMENT BEING REVISED: ${docNumber} - ${title}
DEPARTMENT: ${department}
DOCUMENTS THAT REFERENCE THIS DOCUMENT: ${JSON.stringify(referencingDocs)}

Assess the cascade impact of revising this document:
1. Documents with direct references that need updating
2. Personnel requiring re-training (estimate by department)
3. Batch records affected
4. Equipment SOPs affected
5. Recommendations

Return ONLY valid JSON (no markdown fences):
{
  "affected_documents": [{"doc_number": "SOP-XX-001", "section": "Section 4.3", "impact": "Description"}],
  "training_impact": {"total_personnel": 0, "by_department": {}, "estimated_hours": 0},
  "batch_records_affected": [],
  "equipment_sops_affected": [],
  "risk_level": "low|medium|high",
  "recommendations": ["Recommendation 1"]
}`;

const REVIEW_PRIORITIES_PROMPT = (documents) => `You are a pharmaceutical quality analyst generating a risk-based periodic review priority list for a GMP biologics facility.

DOCUMENTS DUE FOR REVIEW (next 90 days):
${JSON.stringify(documents)}

Score each document using:
1. Days until/past review due date (overdue = critical)
2. Number of linked deviations/CAPAs since last review
3. Document criticality (production SOPs > administrative forms)
4. Cross-reference staleness

Return ONLY valid JSON (no markdown fences):
{
  "priorities": [
    {
      "doc_id": "DOC-xxxx",
      "doc_number": "SOP-QA-001",
      "title": "Document title",
      "priority": "critical|high|routine",
      "score": 95,
      "days_until_due": -5,
      "factors": ["Factor 1", "Factor 2"],
      "recommendation": "Specific recommendation"
    }
  ],
  "summary": {"critical": 0, "high": 0, "routine": 0, "total": 0}
}`;

const SUGGEST_REVIEWERS_PROMPT = (title, docType, department, tags) => `You are a pharmaceutical document control specialist suggesting reviewers for a GMP biologics facility.

DOCUMENT: ${title}
TYPE: ${docType}
DEPARTMENT: ${department}
TAGS: ${JSON.stringify(tags)}

Based on the document type and department, suggest 3-5 appropriate reviewers with roles.

Return ONLY valid JSON (no markdown fences):
{
  "reviewers": [
    {"role": "QA Manager", "department": "qa", "rationale": "Required approver for all controlled documents"},
    {"role": "Production Manager", "department": "production", "rationale": "SME for production procedures"}
  ]
}`;

// ── Service Factory ────────────────────────────────────────────────────────

function makeDocControlService({ supabase, auditLog, anthropic }) {

  // ── Helpers ──────────────────────────────────────────────────────────────

  function err(msg, code) {
    return Object.assign(new Error(msg), { statusCode: code });
  }

  function addMonths(date, months) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split('T')[0];
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────

  async function create({
    docNumber, title, description, docType, department, classification,
    owner, reviewPeriodMonths, trainingRequired, trainingType,
    tags, regulatoryReferences, crossReferences,
    changeControlId, linkedDeviationId, linkedCapaId,
    fileUrl, contentHash, userId, userRole, req
  }) {
    if (!title) throw err('title is required', 400);
    if (!docNumber) throw err('doc_number is required', 400);

    const docId = ids.docId();
    const type = docType || 'sop';
    const reviewMonths = reviewPeriodMonths !== undefined
      ? reviewPeriodMonths
      : (REVIEW_PERIOD_DEFAULTS[type] || 24);
    const needsTraining = trainingRequired !== undefined
      ? trainingRequired
      : (TRAINING_REQUIRED_DEFAULTS[type] !== undefined ? TRAINING_REQUIRED_DEFAULTS[type] : true);

    const row = {
      doc_id: docId,
      doc_number: docNumber,
      title,
      description: description || '',
      doc_type: type,
      department: department || 'qa',
      version_major: 0,
      version_minor: 1,
      version_display: '0.1',
      status: 'draft',
      classification: classification || 'controlled',
      review_period_months: reviewMonths,
      author: userId || 'system',
      owner: owner || userId || 'system',
      change_control_id: changeControlId || '',
      linked_deviation_id: linkedDeviationId || '',
      linked_capa_id: linkedCapaId || '',
      training_required: needsTraining,
      training_type: trainingType || (needsTraining ? 'read-understand' : 'none'),
      reason_category: 'new-document',
      tags: tags || [],
      regulatory_references: regulatoryReferences || [],
      cross_references: crossReferences || [],
      file_url: fileUrl || '',
      content_hash: contentHash || '',
      created_by: userId || 'system',
    };

    const { error: docErr } = await supabase.from('controlled_documents').insert(row);
    if (docErr) throw docErr;

    // Create initial version record
    const verId = ids.docVersionId();
    const verRow = {
      version_id: verId,
      doc_id: docId,
      version_major: 0,
      version_minor: 1,
      version_display: '0.1',
      status: 'draft',
      file_url: fileUrl || '',
      content_hash: contentHash || '',
      created_by: userId || 'system',
    };
    const { error: verErr } = await supabase.from('document_versions').insert(verRow);
    if (verErr) throw verErr;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'document_created',
      entityType: 'controlled_document',
      entityId: docId,
      after: { docId, docNumber, title, docType: type, department: department || 'qa', verId },
      reason: `Document created: ${docNumber} - ${title}`,
      req,
    });

    return { ok: true, docId, versionId: verId, docNumber };
  }

  async function getById(docId) {
    const { data, error } = await supabase
      .from('controlled_documents').select('*').eq('doc_id', docId).single();
    if (error || !data) throw err('Document not found', 404);

    // Fetch related data
    const [versions, reviews, distribution] = await Promise.all([
      supabase.from('document_versions').select('*').eq('doc_id', docId).order('version_major', { ascending: false }).order('version_minor', { ascending: false }),
      supabase.from('document_reviews').select('*').eq('doc_id', docId).order('created_at', { ascending: false }),
      supabase.from('document_distribution').select('*').eq('doc_id', docId).order('created_at', { ascending: false }),
    ]);

    return {
      ...data,
      versions: versions.data || [],
      reviews: reviews.data || [],
      distribution: distribution.data || [],
    };
  }

  async function list(filters = {}) {
    let query = supabase.from('controlled_documents').select('*').order('created_at', { ascending: false });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.doc_type) query = query.eq('doc_type', filters.doc_type);
    if (filters.department) query = query.eq('department', filters.department);
    if (filters.owner) query = query.eq('owner', filters.owner);
    if (filters.classification) query = query.eq('classification', filters.classification);
    if (filters.search) {
      query = query.or(`doc_id.ilike.%${filters.search}%,doc_number.ilike.%${filters.search}%,title.ilike.%${filters.search}%`);
    }
    if (!filters.showAll) {
      query = query.not('status', 'in', '("superseded","retired","archived")');
    }

    const { data, error } = await query;
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  async function update({ docId, updates, userId, userRole, reason, req }) {
    const current = await getById(docId);
    if (current.status !== 'draft') throw err('Can only update documents in draft status', 400);

    const allowed = [
      'title', 'description', 'owner', 'tags', 'regulatory_references',
      'cross_references', 'training_required', 'training_type',
      'review_period_months', 'file_url', 'content_hash',
      'change_control_id', 'linked_deviation_id', 'linked_capa_id',
    ];
    const patch = {};
    for (const k of allowed) {
      if (updates[k] !== undefined) patch[k] = updates[k];
    }
    patch.updated_at = new Date().toISOString();

    const { error: updErr } = await supabase.from('controlled_documents').update(patch).eq('doc_id', docId);
    if (updErr) throw updErr;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'document_updated',
      entityType: 'controlled_document',
      entityId: docId,
      before: current,
      after: patch,
      reason: reason || `Document ${docId} updated`,
      req,
    });

    return { ok: true, docId };
  }

  // ── Version Management ───────────────────────────────────────────────────

  async function createVersion({ docId, revisionType, changeControlId, reasonForChange, reasonCategory, summaryOfChanges, fileUrl, contentHash, userId, userRole, req }) {
    const doc = await getById(docId);
    const isMajor = revisionType === 'major';

    if (isMajor && !changeControlId) throw err('Change control ID required for major revisions', 400);

    const newMajor = isMajor ? doc.version_major + 1 : doc.version_major;
    const newMinor = isMajor ? 0 : doc.version_minor + 1;
    const display = `${newMajor}.${newMinor}`;

    const verId = ids.docVersionId();
    const currentVersions = doc.versions || [];
    const prevVer = currentVersions.length > 0 ? currentVersions[0] : null;

    const verRow = {
      version_id: verId,
      doc_id: docId,
      version_major: newMajor,
      version_minor: newMinor,
      version_display: display,
      status: 'draft',
      change_summary: summaryOfChanges || '',
      reason_for_change: reasonForChange || '',
      file_url: fileUrl || '',
      content_hash: contentHash || '',
      previous_version_id: prevVer ? prevVer.version_id : '',
      created_by: userId || 'system',
    };
    const { error: verErr } = await supabase.from('document_versions').insert(verRow);
    if (verErr) throw verErr;

    // Update main document record
    const docPatch = {
      version_major: newMajor,
      version_minor: newMinor,
      version_display: display,
      status: 'draft',
      change_control_id: changeControlId || doc.change_control_id,
      reason_for_change: reasonForChange || '',
      reason_category: reasonCategory || '',
      summary_of_changes: summaryOfChanges || '',
      file_url: fileUrl || doc.file_url,
      content_hash: contentHash || doc.content_hash,
      updated_at: new Date().toISOString(),
    };
    const { error: docErr } = await supabase.from('controlled_documents').update(docPatch).eq('doc_id', docId);
    if (docErr) throw docErr;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'document_version_created',
      entityType: 'controlled_document',
      entityId: docId,
      after: { verId, display, revisionType, changeControlId },
      reason: `New ${revisionType} version ${display} created`,
      req,
    });

    return { ok: true, docId, versionId: verId, versionDisplay: display };
  }

  async function listVersions(docId) {
    const { data, error } = await supabase
      .from('document_versions').select('*').eq('doc_id', docId)
      .order('version_major', { ascending: false })
      .order('version_minor', { ascending: false });
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  async function getVersion(docId, verId) {
    const { data, error } = await supabase
      .from('document_versions').select('*').eq('doc_id', docId).eq('version_id', verId).single();
    if (error || !data) throw err('Version not found', 404);

    const { data: reviews } = await supabase
      .from('document_reviews').select('*').eq('version_id', verId).order('created_at', { ascending: false });
    return { ...data, reviews: reviews || [] };
  }

  // ── Workflow Transitions ─────────────────────────────────────────────────

  async function submit({ docId, userId, userRole, req }) {
    const doc = await getById(docId);
    if (doc.status !== 'draft') throw err('Can only submit documents in draft status', 400);
    if (doc.checked_out_by) throw err('Document is checked out — must check in before submitting', 400);

    const patch = { status: 'in-review', updated_at: new Date().toISOString() };
    const { error: updErr } = await supabase.from('controlled_documents').update(patch).eq('doc_id', docId);
    if (updErr) throw updErr;

    // Update the current version status too
    await supabase.from('document_versions').update({ status: 'in-review', updated_at: new Date().toISOString() })
      .eq('doc_id', docId).eq('version_major', doc.version_major).eq('version_minor', doc.version_minor);

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'document_submitted',
      entityType: 'controlled_document',
      entityId: docId,
      before: { status: 'draft' },
      after: { status: 'in-review' },
      reason: `Document ${doc.doc_number} submitted for review`,
      req,
    });

    return { ok: true, docId, status: 'in-review' };
  }

  async function submitReview({ docId, reviewer, reviewerRole, reviewType, decision, signatureMeaning, comments, userId, userRole, req }) {
    const doc = await getById(docId);
    if (doc.status !== 'in-review') throw err('Document must be in-review to submit a review', 400);

    const reviewId = ids.docReviewId();
    const reviewRow = {
      review_id: reviewId,
      doc_id: docId,
      version_id: '',
      reviewer: reviewer || userId || 'system',
      reviewer_role: reviewerRole || userRole || '',
      review_type: reviewType || 'version-review',
      status: 'completed',
      decision: decision || '',
      signature_meaning: signatureMeaning || 'review',
      comments: comments || '',
      completed_at: new Date().toISOString(),
      signed_at: new Date().toISOString(),
      created_by: userId || 'system',
    };

    const { error: revErr } = await supabase.from('document_reviews').insert(reviewRow);
    if (revErr) throw revErr;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'document_reviewed',
      entityType: 'controlled_document',
      entityId: docId,
      after: { reviewId, decision, signatureMeaning, reviewer: reviewRow.reviewer },
      reason: `Review submitted: ${decision} by ${reviewRow.reviewer}`,
      req,
    });

    return { ok: true, docId, reviewId, decision };
  }

  async function approve({ docId, approver, approverRole, signatureMeaning, comments, userId, userRole, req }) {
    const doc = await getById(docId);
    if (doc.status !== 'in-review') throw err('Document must be in-review to approve', 400);

    const reviewId = ids.docReviewId();
    const now = new Date().toISOString();
    const reviewRow = {
      review_id: reviewId,
      doc_id: docId,
      version_id: '',
      reviewer: approver || userId || 'system',
      reviewer_role: approverRole || userRole || 'qa',
      review_type: 'approval',
      status: 'completed',
      decision: 'approved',
      signature_meaning: signatureMeaning || 'approval',
      comments: comments || '',
      completed_at: now,
      signed_at: now,
      created_by: userId || 'system',
    };

    const { error: revErr } = await supabase.from('document_reviews').insert(reviewRow);
    if (revErr) throw revErr;

    // Transition to approved
    const patch = { status: 'approved', updated_at: now };
    const { error: updErr } = await supabase.from('controlled_documents').update(patch).eq('doc_id', docId);
    if (updErr) throw updErr;

    // Update version record
    await supabase.from('document_versions').update({
      status: 'approved',
      approved_by: approver || userId || 'system',
      approved_at: now,
      updated_at: now,
    }).eq('doc_id', docId).eq('version_major', doc.version_major).eq('version_minor', doc.version_minor);

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'document_approved',
      entityType: 'controlled_document',
      entityId: docId,
      before: { status: 'in-review' },
      after: { status: 'approved', approver: reviewRow.reviewer, signatureMeaning },
      reason: `Document ${doc.doc_number} approved by ${reviewRow.reviewer}`,
      req,
    });

    return { ok: true, docId, reviewId, status: 'approved' };
  }

  async function makeEffective({ docId, effectiveDate, userId, userRole, req }) {
    const doc = await getById(docId);
    if (doc.status !== 'approved') throw err('Document must be approved before making effective', 400);

    const effDate = effectiveDate || new Date().toISOString().split('T')[0];
    const nextReview = doc.review_period_months > 0
      ? addMonths(effDate, doc.review_period_months)
      : null;

    // Supersede previous effective version of same doc_number
    const { data: prevEffective } = await supabase
      .from('controlled_documents').select('doc_id')
      .eq('doc_number', doc.doc_number).eq('status', 'effective').neq('doc_id', docId);
    if (prevEffective && prevEffective.length > 0) {
      for (const prev of prevEffective) {
        await supabase.from('controlled_documents').update({
          status: 'superseded',
          superseded_by_doc_id: docId,
          updated_at: new Date().toISOString(),
        }).eq('doc_id', prev.doc_id);

        await auditLog({
          userId: userId || 'system',
          userRole: userRole || 'system',
          action: 'document_superseded',
          entityType: 'controlled_document',
          entityId: prev.doc_id,
          after: { superseded_by: docId },
          reason: `Superseded by ${doc.doc_number} v${doc.version_display}`,
          req,
        });
      }
    }

    const patch = {
      status: 'effective',
      effective_date: effDate,
      next_review_date: nextReview,
      supersedes_doc_id: (prevEffective && prevEffective.length > 0) ? prevEffective[0].doc_id : '',
      updated_at: new Date().toISOString(),
    };
    const { error: updErr } = await supabase.from('controlled_documents').update(patch).eq('doc_id', docId);
    if (updErr) throw updErr;

    // Update version record
    await supabase.from('document_versions').update({
      status: 'effective',
      effective_date: effDate,
      updated_at: new Date().toISOString(),
    }).eq('doc_id', docId).eq('version_major', doc.version_major).eq('version_minor', doc.version_minor);

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'document_effective',
      entityType: 'controlled_document',
      entityId: docId,
      before: { status: 'approved' },
      after: { status: 'effective', effectiveDate: effDate, nextReview },
      reason: `Document ${doc.doc_number} v${doc.version_display} made effective`,
      req,
    });

    return { ok: true, docId, status: 'effective', effectiveDate: effDate, nextReviewDate: nextReview };
  }

  async function retire({ docId, reason, userId, userRole, req }) {
    const doc = await getById(docId);
    if (doc.status !== 'effective') throw err('Only effective documents can be retired', 400);

    const patch = {
      status: 'retired',
      updated_at: new Date().toISOString(),
    };
    const { error: updErr } = await supabase.from('controlled_documents').update(patch).eq('doc_id', docId);
    if (updErr) throw updErr;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'document_retired',
      entityType: 'controlled_document',
      entityId: docId,
      before: { status: 'effective' },
      after: { status: 'retired' },
      reason: reason || `Document ${doc.doc_number} retired`,
      req,
    });

    return { ok: true, docId, status: 'retired' };
  }

  async function checkout({ docId, userId, userRole, req }) {
    const doc = await getById(docId);
    if (doc.status !== 'draft') throw err('Only draft documents can be checked out', 400);
    if (doc.checked_out_by && doc.checked_out_by !== userId) {
      // Check 48h auto-release
      const checkedOutAt = new Date(doc.checked_out_at);
      const hoursSince = (Date.now() - checkedOutAt.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 48) {
        throw err(`Document is checked out by ${doc.checked_out_by}`, 400);
      }
    }

    const now = new Date().toISOString();
    const { error: updErr } = await supabase.from('controlled_documents').update({
      checked_out_by: userId,
      checked_out_at: now,
      updated_at: now,
    }).eq('doc_id', docId);
    if (updErr) throw updErr;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'document_checked_out',
      entityType: 'controlled_document',
      entityId: docId,
      after: { checked_out_by: userId },
      reason: `Document ${doc.doc_number} checked out`,
      req,
    });

    return { ok: true, docId, checkedOutBy: userId };
  }

  async function checkin({ docId, userId, userRole, req }) {
    const doc = await getById(docId);
    if (!doc.checked_out_by) throw err('Document is not checked out', 400);
    if (doc.checked_out_by !== userId && userRole !== 'qa' && userRole !== 'admin') {
      throw err('Only the checked-out user or QA admin can check in', 403);
    }

    const { error: updErr } = await supabase.from('controlled_documents').update({
      checked_out_by: '',
      checked_out_at: null,
      updated_at: new Date().toISOString(),
    }).eq('doc_id', docId);
    if (updErr) throw updErr;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'document_checked_in',
      entityType: 'controlled_document',
      entityId: docId,
      after: { checked_out_by: '' },
      reason: `Document ${doc.doc_number} checked in`,
      req,
    });

    return { ok: true, docId };
  }

  // ── Periodic Review ──────────────────────────────────────────────────────

  async function initiatePeriodicReview({ docId, reviewer, userId, userRole, req }) {
    const doc = await getById(docId);
    if (doc.status !== 'effective') throw err('Only effective documents can have periodic reviews', 400);

    const reviewId = ids.docReviewId();
    const dueDate = addMonths(new Date().toISOString(), 1); // 30 days
    const reviewRow = {
      review_id: reviewId,
      doc_id: docId,
      reviewer: reviewer || doc.owner,
      reviewer_role: '',
      review_type: 'periodic',
      status: 'pending',
      due_date: dueDate,
      created_by: userId || 'system',
    };

    const { error: revErr } = await supabase.from('document_reviews').insert(reviewRow);
    if (revErr) throw revErr;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'periodic_review_initiated',
      entityType: 'controlled_document',
      entityId: docId,
      after: { reviewId, reviewer: reviewRow.reviewer, dueDate },
      reason: `Periodic review initiated for ${doc.doc_number}`,
      req,
    });

    return { ok: true, docId, reviewId, dueDate };
  }

  async function completePeriodicReview({ docId, outcome, comments, userId, userRole, req }) {
    const doc = await getById(docId);

    // Find the pending periodic review
    const { data: pendingReviews } = await supabase
      .from('document_reviews').select('*')
      .eq('doc_id', docId).eq('review_type', 'periodic').eq('status', 'pending')
      .order('created_at', { ascending: false }).limit(1);

    const review = pendingReviews && pendingReviews.length > 0 ? pendingReviews[0] : null;
    if (!review) throw err('No pending periodic review found', 404);

    const now = new Date().toISOString();
    await supabase.from('document_reviews').update({
      status: 'completed',
      outcome,
      comments: comments || '',
      completed_at: now,
      signed_at: now,
      updated_at: now,
    }).eq('review_id', review.review_id);

    // If outcome is 'current', reset next_review_date
    if (outcome === 'current') {
      const nextReview = doc.review_period_months > 0
        ? addMonths(now, doc.review_period_months)
        : null;
      await supabase.from('controlled_documents').update({
        next_review_date: nextReview,
        updated_at: now,
      }).eq('doc_id', docId);
    }

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'periodic_review_completed',
      entityType: 'controlled_document',
      entityId: docId,
      after: { reviewId: review.review_id, outcome, comments },
      reason: `Periodic review completed: ${outcome}`,
      req,
    });

    return { ok: true, docId, reviewId: review.review_id, outcome };
  }

  async function getOverdueReviews() {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('controlled_documents').select('*')
      .eq('status', 'effective')
      .lt('next_review_date', today)
      .order('next_review_date', { ascending: true });
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  async function getUpcomingReviews(days = 90) {
    const today = new Date();
    const future = new Date(today);
    future.setDate(future.getDate() + days);
    const { data, error } = await supabase
      .from('controlled_documents').select('*')
      .eq('status', 'effective')
      .gte('next_review_date', today.toISOString().split('T')[0])
      .lte('next_review_date', future.toISOString().split('T')[0])
      .order('next_review_date', { ascending: true });
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  // ── Distribution & Training ──────────────────────────────────────────────

  async function distribute({ docId, users, trainingRequired, dueDate, userId, userRole, req }) {
    const doc = await getById(docId);
    if (!users || users.length === 0) throw err('At least one user is required', 400);

    const defaultDue = trainingRequired
      ? addMonths(new Date().toISOString(), 1) // 30 days for facilitated
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 14 days

    const rows = users.map(u => ({
      doc_id: docId,
      version_id: '',
      user_id: u.userId || u.user_id || u.id,
      user_name: u.name || u.userName || '',
      department: u.department || '',
      role: u.role || '',
      distribution_type: 'electronic',
      training_required: trainingRequired !== undefined ? trainingRequired : doc.training_required,
      due_date: dueDate || defaultDue,
      created_by: userId || 'system',
    }));

    const { error: distErr } = await supabase.from('document_distribution').insert(rows);
    if (distErr) throw distErr;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'document_distributed',
      entityType: 'controlled_document',
      entityId: docId,
      after: { userCount: users.length, trainingRequired },
      reason: `Document ${doc.doc_number} distributed to ${users.length} users`,
      req,
    });

    return { ok: true, docId, distributedTo: users.length };
  }

  async function acknowledge({ docId, userId, userName, userRole, req }) {
    const { data: dist, error: distErr } = await supabase
      .from('document_distribution').select('*')
      .eq('doc_id', docId).eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(1);
    if (distErr) throw distErr;
    if (!dist || dist.length === 0) throw err('No distribution record found for this user', 404);

    const now = new Date().toISOString();
    const { error: updErr } = await supabase.from('document_distribution').update({
      acknowledged: true,
      acknowledged_at: now,
      updated_at: now,
    }).eq('id', dist[0].id);
    if (updErr) throw updErr;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'document_acknowledged',
      entityType: 'controlled_document',
      entityId: docId,
      after: { userId, userName, acknowledgedAt: now },
      reason: `Document acknowledged by ${userName || userId}`,
      req,
    });

    return { ok: true, docId, userId, acknowledgedAt: now };
  }

  async function getDistribution(docId) {
    const { data, error } = await supabase
      .from('document_distribution').select('*').eq('doc_id', docId)
      .order('created_at', { ascending: false });
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    const dist = data || [];
    const total = dist.length;
    const acked = dist.filter(d => d.acknowledged).length;
    const trained = dist.filter(d => d.training_completed).length;
    const trainingRequired = dist.filter(d => d.training_required).length;
    return {
      records: dist,
      total,
      acknowledged: acked,
      acknowledgeRate: total > 0 ? Math.round(acked / total * 100) : 0,
      trainingCompleted: trained,
      trainingRequired,
      trainingRate: trainingRequired > 0 ? Math.round(trained / trainingRequired * 100) : 0,
    };
  }

  // ── Stats ────────────────────────────────────────────────────────────────

  async function getStats() {
    const { data, error } = await supabase
      .from('controlled_documents').select('*').order('created_at', { ascending: false });
    if (error) {
      if (error.message.includes('does not exist')) return { total: 0 };
      throw error;
    }
    const all = data || [];
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const byStatus = {};
    const byType = {};
    const byDept = {};
    let overdueReviews = 0;
    let overdueTraining = 0;
    let checkedOut = 0;

    all.forEach(d => {
      byStatus[d.status] = (byStatus[d.status] || 0) + 1;
      byType[d.doc_type] = (byType[d.doc_type] || 0) + 1;
      byDept[d.department] = (byDept[d.department] || 0) + 1;
      if (d.next_review_date && d.status === 'effective' && d.next_review_date < today) overdueReviews++;
      if (d.checked_out_by) checkedOut++;
    });

    return {
      total: all.length,
      byStatus,
      byType,
      byDepartment: byDept,
      overdueReviews,
      overdueTraining,
      checkedOut,
    };
  }

  // ── AI Features ──────────────────────────────────────────────────────────

  async function aiClassify({ docId, userId, req }) {
    const doc = await getById(docId);
    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        messages: [{ role: 'user', content: CLASSIFY_PROMPT(doc.title, doc.description, doc.doc_type) }],
      });
      const result = parseClaudeJson(message.content[0].text);

      await supabase.from('controlled_documents').update({
        ai_classification: result,
        updated_at: new Date().toISOString(),
      }).eq('doc_id', docId);

      await auditLog({
        userId: userId || 'system',
        userRole: 'system',
        action: 'document_ai_classified',
        entityType: 'controlled_document',
        entityId: docId,
        after: { confidence: result.confidence },
        reason: `AI classification: ${result.doc_type} (${result.confidence}% confidence)`,
        req,
      });

      return { ok: true, docId, classification: result };
    } catch (e) {
      console.error('[DOC-CONTROL] AI classify error:', e.message);
      return { ok: false, error: e.message };
    }
  }

  async function aiChangeSummary({ docId, userId, req }) {
    const doc = await getById(docId);
    const versions = doc.versions || [];
    const prevVersion = versions.find(v => v.status === 'effective' || v.status === 'superseded');
    const currentVersion = versions.find(v => v.status === 'draft' || v.version_display === doc.version_display);

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: CHANGE_SUMMARY_PROMPT(
          doc.title,
          prevVersion ? JSON.stringify({ version: prevVersion.version_display, summary: prevVersion.change_summary }) : 'First version',
          currentVersion ? JSON.stringify({ version: currentVersion.version_display, summary: doc.summary_of_changes }) : 'Current draft'
        )}],
      });
      const result = parseClaudeJson(message.content[0].text);

      await supabase.from('controlled_documents').update({
        ai_change_summary: result.summary || '',
        summary_of_changes: result.summary || doc.summary_of_changes,
        updated_at: new Date().toISOString(),
      }).eq('doc_id', docId);

      await auditLog({
        userId: userId || 'system',
        userRole: 'system',
        action: 'document_ai_change_summary',
        entityType: 'controlled_document',
        entityId: docId,
        after: { substantive_count: result.substantive_count, editorial_count: result.editorial_count },
        reason: 'AI change summary generated',
        req,
      });

      return { ok: true, docId, changeSummary: result };
    } catch (e) {
      console.error('[DOC-CONTROL] AI change summary error:', e.message);
      return { ok: false, error: e.message };
    }
  }

  async function aiCheckReferences({ docId, userId, req }) {
    const doc = await getById(docId);
    const crossRefs = doc.cross_references || [];

    // Look up status of each referenced document
    const referencedDocs = [];
    for (const ref of crossRefs) {
      const { data } = await supabase
        .from('controlled_documents').select('doc_id, doc_number, title, status, version_display')
        .eq('doc_number', ref).limit(1);
      referencedDocs.push({
        ref,
        found: data && data.length > 0,
        doc: data && data.length > 0 ? data[0] : null,
      });
    }

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: CHECK_REFERENCES_PROMPT(doc.title, crossRefs, referencedDocs) }],
      });
      const result = parseClaudeJson(message.content[0].text);

      await supabase.from('controlled_documents').update({
        ai_review_priority: { ...doc.ai_review_priority, cross_ref_health: result },
        updated_at: new Date().toISOString(),
      }).eq('doc_id', docId);

      await auditLog({
        userId: userId || 'system',
        userRole: 'system',
        action: 'document_ai_references_checked',
        entityType: 'controlled_document',
        entityId: docId,
        after: { health_score: result.health_score, total_references: result.total_references },
        reason: 'AI cross-reference validation completed',
        req,
      });

      return { ok: true, docId, referenceReport: result };
    } catch (e) {
      console.error('[DOC-CONTROL] AI check references error:', e.message);
      return { ok: false, error: e.message };
    }
  }

  async function aiImpact({ docId, userId, req }) {
    const doc = await getById(docId);

    // Find documents that reference this document
    const { data: referencingDocs } = await supabase
      .from('controlled_documents').select('doc_id, doc_number, title, department, cross_references')
      .filter('cross_references', 'cs', `{"${doc.doc_number}"}`);

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: IMPACT_PROMPT(doc.title, doc.doc_number, referencingDocs || [], doc.department) }],
      });
      const result = parseClaudeJson(message.content[0].text);

      await supabase.from('controlled_documents').update({
        ai_impact_assessment: result,
        updated_at: new Date().toISOString(),
      }).eq('doc_id', docId);

      await auditLog({
        userId: userId || 'system',
        userRole: 'system',
        action: 'document_ai_impact_assessed',
        entityType: 'controlled_document',
        entityId: docId,
        after: { risk_level: result.risk_level, affected_docs: (result.affected_documents || []).length },
        reason: 'AI impact assessment completed',
        req,
      });

      return { ok: true, docId, impactReport: result };
    } catch (e) {
      console.error('[DOC-CONTROL] AI impact error:', e.message);
      return { ok: false, error: e.message };
    }
  }

  async function aiReviewPriorities({ userId, req }) {
    const today = new Date();
    const future = new Date(today);
    future.setDate(future.getDate() + 90);

    const { data } = await supabase
      .from('controlled_documents').select('*')
      .eq('status', 'effective')
      .lte('next_review_date', future.toISOString().split('T')[0])
      .order('next_review_date', { ascending: true });

    const docs = data || [];
    if (docs.length === 0) return { ok: true, priorities: [], summary: { critical: 0, high: 0, routine: 0, total: 0 } };

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: REVIEW_PRIORITIES_PROMPT(docs.map(d => ({
          doc_id: d.doc_id, doc_number: d.doc_number, title: d.title,
          doc_type: d.doc_type, department: d.department,
          next_review_date: d.next_review_date,
          linked_deviation_id: d.linked_deviation_id,
          linked_capa_id: d.linked_capa_id,
        })))}],
      });
      const result = parseClaudeJson(message.content[0].text);
      return { ok: true, ...result };
    } catch (e) {
      console.error('[DOC-CONTROL] AI review priorities error:', e.message);
      return { ok: false, error: e.message };
    }
  }

  async function aiSuggestReviewers({ docId, userId, req }) {
    const doc = await getById(docId);
    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        messages: [{ role: 'user', content: SUGGEST_REVIEWERS_PROMPT(doc.title, doc.doc_type, doc.department, doc.tags || []) }],
      });
      const result = parseClaudeJson(message.content[0].text);
      return { ok: true, docId, reviewers: result.reviewers || [] };
    } catch (e) {
      console.error('[DOC-CONTROL] AI suggest reviewers error:', e.message);
      return { ok: false, error: e.message };
    }
  }

  return {
    create, getById, list, update,
    createVersion, listVersions, getVersion,
    submit, submitReview, approve, makeEffective, retire,
    checkout, checkin,
    initiatePeriodicReview, completePeriodicReview,
    getOverdueReviews, getUpcomingReviews,
    distribute, acknowledge, getDistribution,
    getStats,
    aiClassify, aiChangeSummary, aiCheckReferences, aiImpact,
    aiReviewPriorities, aiSuggestReviewers,
  };
}

module.exports = { makeDocControlService };
