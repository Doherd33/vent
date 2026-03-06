'use strict';

const ids = require('../lib/ids');
const parseClaudeJson = require('../lib/parse-claude-json');

// ── Default Checklist Template ──────────────────────────────────────────────

const DEFAULT_CHECKLIST = [
  { category: 'batch_record', description: 'Batch record completeness — all pages present, all fields completed, all signatures obtained', acceptance_criteria: 'All pages present, no blank fields, all required signatures obtained' },
  { category: 'deviations', description: 'All deviations closed or justified (per Annex 16 / 211.192)', acceptance_criteria: 'Zero open deviations, or justified with documented quality impact assessment' },
  { category: 'capas', description: 'All CAPAs addressed — effectiveness verified or approved timeline', acceptance_criteria: 'All linked CAPAs closed or have approved completion timeline' },
  { category: 'test_results', description: 'In-process test results within specification', acceptance_criteria: 'All IPC results within approved specification limits' },
  { category: 'test_results', description: 'Release test results within specification (identity, strength, quality, purity per 211.165)', acceptance_criteria: 'All release test results within approved specification limits' },
  { category: 'cleaning', description: 'Cleaning records complete — hold times not exceeded, cleaning agent residue within limits', acceptance_criteria: 'Cleaning records present, hold times within validated limits, residue tests pass' },
  { category: 'equipment', description: 'Equipment logs reviewed — qualified, calibrated, cleaned per 211.182', acceptance_criteria: 'All equipment qualified, calibration current at time of use, cleaning verified' },
  { category: 'environmental', description: 'Environmental monitoring data acceptable — viable and non-viable within limits', acceptance_criteria: 'All EM results within alert and action limits during batch manufacture' },
  { category: 'label', description: 'Label reconciliation complete — received, used, damaged, returned reconciled', acceptance_criteria: 'Label count reconciled: issued = used + damaged + returned' },
  { category: 'yield', description: 'Yield within acceptable range (per 211.192 — investigate unexplained discrepancies)', acceptance_criteria: 'Yield within +/- 10% of expected, or discrepancy investigated' },
  { category: 'raw_materials', description: 'Raw materials from approved suppliers — released by QC, within expiry (per Annex 16)', acceptance_criteria: 'All materials from approved suppliers, QC released, within expiry at time of use' },
  { category: 'change_controls', description: 'Change controls evaluated — all changes since last QP certification assessed (per Annex 16)', acceptance_criteria: 'All change controls since last certification reviewed and assessed for impact' },
  { category: 'process_params', description: 'Process parameters within validated ranges (CPPs, hold times)', acceptance_criteria: 'All CPPs within validated ranges, no hold time exceedances' },
  { category: 'oos', description: 'OOS investigations complete (if any — per ICH Q7 Section 11)', acceptance_criteria: 'All OOS investigations complete with root cause identified, or no OOS events' },
];

// ── AI Prompt Templates ─────────────────────────────────────────────────────

const PRESCREEN_PROMPT = (disposition, checklist) => `You are a pharmaceutical quality AI assistant performing batch record pre-screening for a biologics manufacturing facility operating under EU GMP Annex 16 and FDA 21 CFR 211.

BATCH DISPOSITION DATA:
Disposition ID: ${disposition.disposition_id}
Batch Number: ${disposition.batch_number}
Product: ${disposition.product_name}
Batch Size: ${disposition.batch_size || 'Not specified'}
Yield - Actual: ${disposition.yield_actual || 'Not specified'}
Yield - Expected: ${disposition.yield_expected || 'Not specified'}
Batch Dates: ${disposition.batch_start_date || '?'} to ${disposition.batch_end_date || '?'}
Open Deviations: ${JSON.stringify(disposition.open_deviations || [])}
Open CAPAs: ${JSON.stringify(disposition.open_capas || [])}
Open Change Controls: ${JSON.stringify(disposition.open_change_controls || [])}
Test Results Summary: ${JSON.stringify(disposition.test_results_summary || {})}
Missing Documents: ${JSON.stringify(disposition.missing_documents || [])}
Regulatory Framework: ${disposition.regulatory_framework || 'eu_gmp'}

CHECKLIST ITEMS:
${checklist.map((c, i) => `${i + 1}. [${c.checklist_id}] Category: ${c.item_category} | Description: ${c.item_description} | Acceptance Criteria: ${c.acceptance_criteria || 'N/A'} | Current Status: ${c.status} | Finding: ${c.finding || 'None'}`).join('\n')}

Analyse the batch data and classify each checklist item using the four-tier RBE classification:
- "cleared": Within all acceptance criteria, no human review required
- "informational": Notable but within limits, optional review
- "flagged": Outside criteria or anomalous, requires human review
- "critical": Blocking issue, must resolve before release

Also provide an overall risk score (0-100) and identify anomalies.

Return ONLY valid JSON (no markdown fences):
{
  "overall_risk_score": 0-100,
  "risk_level": "low|medium|high|critical",
  "classifications": [
    {
      "checklist_id": "DCHK-XXXX",
      "classification": "cleared|informational|flagged|critical",
      "reason": "Explanation of classification rationale",
      "auto_cleared": true/false
    }
  ],
  "anomalies": [
    {
      "category": "category_name",
      "severity": "low|medium|high|critical",
      "classification": "flagged|critical",
      "description": "What was found",
      "recommendation": "What to do about it"
    }
  ],
  "auto_cleared_count": 0,
  "informational_count": 0,
  "flagged_count": 0,
  "critical_count": 0,
  "confidence": 0.0-1.0
}`;

const SUMMARY_PROMPT = (disposition, checklist) => `You are a pharmaceutical quality documentation specialist generating a batch review summary for a biologics manufacturing facility.

BATCH DATA:
${JSON.stringify({
  disposition_id: disposition.disposition_id,
  batch_number: disposition.batch_number,
  product_name: disposition.product_name,
  batch_size: disposition.batch_size,
  batch_start_date: disposition.batch_start_date,
  batch_end_date: disposition.batch_end_date,
  expiry_date: disposition.expiry_date,
  yield_actual: disposition.yield_actual,
  yield_expected: disposition.yield_expected,
  open_deviations: disposition.open_deviations,
  open_capas: disposition.open_capas,
  open_change_controls: disposition.open_change_controls,
  test_results_summary: disposition.test_results_summary,
  missing_documents: disposition.missing_documents,
  ai_risk_score: disposition.ai_risk_score,
  ai_anomalies: disposition.ai_anomalies,
}, null, 2)}

CHECKLIST SUMMARY:
${checklist.map(c => `- [${c.ai_classification || 'pending'}] ${c.item_description}: ${c.finding || 'No finding'}`).join('\n')}

Generate a structured review summary following this format:
1. Batch Overview (product, batch number, size, dates, expiry)
2. Manufacturing Summary (key process parameters, any excursions)
3. Quality Assessment (IPC and release testing results, OOS investigations)
4. Deviations and CAPAs (summary, root causes, quality impact, CAPA status)
5. Yield Analysis (actual vs expected, historical comparison)
6. Environmental Monitoring (EM data summary, excursions)
7. Overall Assessment (cumulative risk, recommendation)
8. Confidence Level with explanation of uncertainties

This summary is ADVISORY — the QP/QCU retains full authority for release decisions.

Return ONLY valid JSON:
{
  "summary": "The full structured summary text...",
  "sections": {
    "batch_overview": "...",
    "manufacturing_summary": "...",
    "quality_assessment": "...",
    "deviations_capas": "...",
    "yield_analysis": "...",
    "environmental_monitoring": "...",
    "overall_assessment": "...",
    "confidence_level": "..."
  },
  "confidence": 0.0-1.0
}`;

const RECOMMEND_PROMPT = (disposition, checklist) => `You are a pharmaceutical quality advisory AI assisting a Qualified Person (QP) with batch release decisions for a biologics manufacturing facility.

BATCH DATA:
Disposition ID: ${disposition.disposition_id}
Batch: ${disposition.batch_number}
Product: ${disposition.product_name}
Risk Score: ${disposition.ai_risk_score || 'Not assessed'}
Open Deviations: ${JSON.stringify(disposition.open_deviations || [])}
Open CAPAs: ${JSON.stringify(disposition.open_capas || [])}
Test Results: ${JSON.stringify(disposition.test_results_summary || {})}
Yield: ${disposition.yield_actual || '?'} / ${disposition.yield_expected || '?'}

CHECKLIST STATUS:
${checklist.map(c => `- [${c.ai_classification || c.status}] ${c.item_description}: ${c.finding || 'No finding'}`).join('\n')}

Based on all available data, provide a RECOMMENDATION (not a decision — the QP retains full authority):
- "release": All criteria met, no blocking issues
- "conditional_release": Most criteria met but pending results (e.g., sterility)
- "reject": Blocking issues that cannot be resolved

Return ONLY valid JSON:
{
  "recommendation": "release|conditional_release|reject",
  "rationale": "Detailed explanation of reasoning...",
  "blocking_items": ["List of any blocking issues"],
  "conditions": "For conditional_release: specific conditions text",
  "confidence": 0.0-1.0,
  "advisory_note": "This is an AI-generated advisory recommendation. The Qualified Person retains full authority for the release decision."
}`;

const MISSING_DOCS_PROMPT = (disposition) => `You are a pharmaceutical quality document specialist for a biologics manufacturing facility.

BATCH DATA:
Product: ${disposition.product_name}
Batch: ${disposition.batch_number}
Open Deviations: ${JSON.stringify(disposition.open_deviations || [])}
Open CAPAs: ${JSON.stringify(disposition.open_capas || [])}
Missing Documents Already Identified: ${JSON.stringify(disposition.missing_documents || [])}
Regulatory Framework: ${disposition.regulatory_framework || 'eu_gmp'}

Cross-reference the expected documentation for a batch release against what may be missing. Expected documents include:
- Batch production record (BPR)
- Deviation reports (for each open deviation)
- CAPA records
- Release test certificates / Certificate of Analysis (CoA)
- In-process test results
- Cleaning records
- Equipment logbook entries
- Environmental monitoring reports
- Label reconciliation record
- Raw material release certificates
- Change control records

Return ONLY valid JSON:
{
  "missing_documents": [
    {
      "document_type": "type",
      "description": "What is missing",
      "severity": "critical|major|minor",
      "regulatory_reference": "e.g., 21 CFR 211.188"
    }
  ],
  "advisory_note": "AI-generated assessment — verify against actual batch file contents."
}`;

const TREND_PROMPT = (disposition, historicalBatches) => `You are a pharmaceutical quality trend analyst for a biologics manufacturing facility.

CURRENT BATCH:
Product: ${disposition.product_name}
Batch: ${disposition.batch_number}
Yield Actual: ${disposition.yield_actual || 'Not specified'}
Yield Expected: ${disposition.yield_expected || 'Not specified'}
Test Results: ${JSON.stringify(disposition.test_results_summary || {})}
Deviations: ${(disposition.open_deviations || []).length} open

HISTORICAL BATCHES (same product, most recent):
${JSON.stringify(historicalBatches, null, 2)}

Compare the current batch against historical batches. Identify:
1. Yield trends (drift toward limits, step changes)
2. Test result trends
3. Deviation frequency changes
4. Statistical outliers (>2 standard deviations from mean)
5. Process drift that may not trigger single-batch alerts

Return ONLY valid JSON:
{
  "trends": [
    {
      "parameter": "parameter name",
      "trend_type": "stable|improving|declining|drift|outlier",
      "description": "Description of trend",
      "severity": "info|warning|alert",
      "data": {}
    }
  ],
  "overall_trend_assessment": "Summary assessment",
  "confidence": 0.0-1.0,
  "advisory_note": "AI-generated trend analysis — statistical conclusions should be verified."
}`;

const INVESTIGATION_REVIEW_PROMPT = (disposition, deviations) => `You are a pharmaceutical quality investigation reviewer for a biologics manufacturing facility.

BATCH: ${disposition.batch_number} (${disposition.product_name})

LINKED DEVIATION INVESTIGATIONS:
${JSON.stringify(deviations, null, 2)}

For each deviation investigation linked to this batch, assess whether it is scientifically adequate:
1. Root cause properly identified (not just a symptom)?
2. Quality impact assessment thorough (considers all affected batches/products)?
3. Corrective actions proportionate to the issue?
4. Investigation complete or has justified timeline?

Return ONLY valid JSON:
{
  "assessments": [
    {
      "deviation_id": "DEV-XXXX",
      "title": "deviation title",
      "adequacy": "adequate|needs_improvement|inadequate",
      "findings": ["list of specific findings"],
      "recommendations": ["list of recommendations"]
    }
  ],
  "overall_adequacy": "adequate|needs_improvement|inadequate",
  "confidence": 0.0-1.0,
  "advisory_note": "AI-generated assessment — the QP/QCU retains authority over investigation adequacy determinations."
}`;

// ── Service Factory ─────────────────────────────────────────────────────────

function makeBatchDispositionService({ supabase, auditLog, anthropic }) {

  // ── CRUD ────────────────────────────────────────────────────────────────

  async function create({ batch_number, product_name, batch_start_date, batch_end_date, batch_size, yield_actual, yield_expected, priority, expiry_date, notes, regulatory_framework, userId, userRole, req }) {
    if (!batch_number) throw Object.assign(new Error('batch_number is required'), { statusCode: 400 });
    if (!product_name) throw Object.assign(new Error('product_name is required'), { statusCode: 400 });

    const dispositionId = ids.dispositionId();

    const row = {
      disposition_id: dispositionId,
      batch_number,
      product_name,
      status: 'pending_review',
      priority: priority || 'normal',
      batch_start_date: batch_start_date || null,
      batch_end_date: batch_end_date || null,
      batch_size: batch_size || '',
      yield_actual: yield_actual || '',
      yield_expected: yield_expected || '',
      expiry_date: expiry_date || null,
      notes: notes || '',
      regulatory_framework: regulatory_framework || 'eu_gmp',
      created_by: userId || 'system',
    };

    const { error } = await supabase.from('batch_dispositions').insert(row);
    if (error) throw error;

    // Auto-generate default checklist
    const checklistRows = DEFAULT_CHECKLIST.map((item, i) => ({
      checklist_id: ids.dispositionCheckId(),
      disposition_id: dispositionId,
      item_category: item.category,
      item_description: item.description,
      item_order: i,
      acceptance_criteria: item.acceptance_criteria,
      created_by: userId || 'system',
    }));

    const { error: clError } = await supabase.from('disposition_checklists').insert(checklistRows);
    if (clError) console.error('[BATCH-DISP] Checklist insert error:', clError.message);

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'disposition_created',
      entityType: 'batch_disposition',
      entityId: dispositionId,
      after: { batch_number, product_name, priority: row.priority },
      reason: `Batch disposition created for ${batch_number}`,
      req,
    });

    return { ok: true, dispositionId, checklistCount: checklistRows.length };
  }

  async function list(filters = {}) {
    let query = supabase.from('batch_dispositions').select('*').order('created_at', { ascending: false });
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.product_name) query = query.eq('product_name', filters.product_name);
    if (filters.batch_number) query = query.eq('batch_number', filters.batch_number);
    if (filters.priority) query = query.eq('priority', filters.priority);
    if (filters.reviewer) query = query.eq('reviewer', filters.reviewer);
    if (filters.qp_decision) query = query.eq('qp_decision', filters.qp_decision);

    const { data, error } = await query;
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  async function getById(dispId) {
    const { data, error } = await supabase
      .from('batch_dispositions').select('*').eq('disposition_id', dispId).single();
    if (error) {
      if (error.message.includes('does not exist') || error.code === 'PGRST116') throw Object.assign(new Error('Disposition not found'), { statusCode: 404 });
      throw error;
    }
    if (!data) throw Object.assign(new Error('Disposition not found'), { statusCode: 404 });

    // Fetch checklist items
    const { data: checklist } = await supabase
      .from('disposition_checklists').select('*').eq('disposition_id', dispId).order('item_order', { ascending: true });

    return { ...data, checklist: checklist || [] };
  }

  async function update({ dispId, updates, userId, userRole, reason, req }) {
    const current = await getById(dispId);

    const allowed = ['batch_number', 'product_name', 'priority', 'batch_start_date', 'batch_end_date',
      'batch_size', 'yield_actual', 'yield_expected', 'expiry_date', 'notes', 'reviewer', 'reviewer_role',
      'open_deviations', 'open_capas', 'open_change_controls', 'test_results_summary', 'missing_documents',
      'regulatory_framework'];
    const filtered = {};
    for (const k of allowed) {
      if (updates[k] !== undefined) filtered[k] = updates[k];
    }
    filtered.updated_at = new Date().toISOString();

    const { error } = await supabase.from('batch_dispositions').update(filtered).eq('disposition_id', dispId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'disposition_updated',
      entityType: 'batch_disposition',
      entityId: dispId,
      before: current,
      after: filtered,
      reason: reason || `Disposition ${dispId} updated`,
      req,
    });

    return { ok: true, dispId };
  }

  // ── Review Workflow ───────────────────────────────────────────────────

  async function startReview({ dispId, userId, userRole, req }) {
    const current = await getById(dispId);
    if (current.status !== 'pending_review') {
      throw Object.assign(new Error('Can only start review from pending_review status'), { statusCode: 400 });
    }

    const { error } = await supabase.from('batch_dispositions').update({
      status: 'in_review',
      reviewer: userId || '',
      reviewer_role: userRole || '',
      review_started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('disposition_id', dispId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'disposition_review_started',
      entityType: 'batch_disposition',
      entityId: dispId,
      before: { status: 'pending_review' },
      after: { status: 'in_review', reviewer: userId },
      reason: `QA review started on ${dispId}`,
      req,
    });

    return { ok: true, dispId, status: 'in_review' };
  }

  async function addChecklistItem({ dispId, item_category, item_description, acceptance_criteria, userId, req }) {
    await getById(dispId); // verify exists

    const checkId = ids.dispositionCheckId();
    const row = {
      checklist_id: checkId,
      disposition_id: dispId,
      item_category: item_category || 'general',
      item_description: item_description,
      acceptance_criteria: acceptance_criteria || '',
      created_by: userId || 'system',
    };

    const { error } = await supabase.from('disposition_checklists').insert(row);
    if (error) throw error;

    return { ok: true, checkId };
  }

  async function getChecklist(dispId) {
    const { data, error } = await supabase
      .from('disposition_checklists').select('*').eq('disposition_id', dispId).order('item_order', { ascending: true });
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  async function updateChecklistItem({ dispId, checkId, updates, userId, userRole, req }) {
    const { data: current, error: fetchErr } = await supabase
      .from('disposition_checklists').select('*').eq('checklist_id', checkId).eq('disposition_id', dispId).single();
    if (fetchErr || !current) throw Object.assign(new Error('Checklist item not found'), { statusCode: 404 });

    const allowed = ['status', 'finding', 'severity', 'checked_by', 'checked_at', 'notes',
      'reviewer_override', 'override_justification', 'ai_classification', 'ai_reason'];
    const filtered = {};
    for (const k of allowed) {
      if (updates[k] !== undefined) filtered[k] = updates[k];
    }

    if (updates.status === 'complete' && !current.checked_at) {
      filtered.checked_by = userId || '';
      filtered.checked_at = new Date().toISOString();
    }

    if (updates.reviewer_override) {
      filtered.reviewer_override = true;
      filtered.override_justification = updates.override_justification || '';
    }

    filtered.updated_at = new Date().toISOString();

    const { error } = await supabase.from('disposition_checklists').update(filtered).eq('checklist_id', checkId);
    if (error) throw error;

    // Log override to audit trail
    if (updates.reviewer_override) {
      await auditLog({
        userId: userId || 'system',
        userRole: userRole || 'system',
        action: 'disposition_checklist_override',
        entityType: 'batch_disposition',
        entityId: dispId,
        before: { checkId, ai_classification: current.ai_classification },
        after: { checkId, override_justification: updates.override_justification, new_classification: updates.ai_classification },
        reason: `Reviewer override on checklist item ${checkId}: ${updates.override_justification || 'No justification'}`,
        req,
      });
    }

    return { ok: true, checkId };
  }

  async function holdDisposition({ dispId, hold_reason, userId, userRole, req }) {
    const current = await getById(dispId);
    if (!['in_review', 'pending_review'].includes(current.status)) {
      throw Object.assign(new Error('Can only hold from in_review or pending_review status'), { statusCode: 400 });
    }

    const { error } = await supabase.from('batch_dispositions').update({
      status: 'on_hold',
      hold_reason: hold_reason || '',
      updated_at: new Date().toISOString(),
    }).eq('disposition_id', dispId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'disposition_on_hold',
      entityType: 'batch_disposition',
      entityId: dispId,
      before: { status: current.status },
      after: { status: 'on_hold', hold_reason },
      reason: `Batch placed on hold: ${hold_reason}`,
      req,
    });

    return { ok: true, dispId, status: 'on_hold' };
  }

  // ── QP Decision ─────────────────────────────────────────────────────

  async function release({ dispId, qp_name, qp_comments, signature_meaning, userId, userRole, req }) {
    const current = await getById(dispId);
    if (current.status !== 'in_review' && current.status !== 'on_hold') {
      throw Object.assign(new Error('Can only release from in_review or on_hold status'), { statusCode: 400 });
    }

    // Check for unresolved critical items
    const criticals = (current.checklist || []).filter(c => c.ai_classification === 'critical' && c.status === 'pending' && !c.reviewer_override);
    if (criticals.length > 0) {
      throw Object.assign(new Error(`Cannot release: ${criticals.length} critical checklist item(s) pending without override justification`), { statusCode: 400 });
    }

    const now = new Date().toISOString();
    const { error } = await supabase.from('batch_dispositions').update({
      status: 'released',
      qp_name: qp_name || userId || '',
      qp_decision: 'released',
      qp_decision_date: now,
      qp_comments: qp_comments || '',
      qp_signature_meaning: signature_meaning || 'batch certified for release',
      release_date: new Date().toISOString().split('T')[0],
      review_completed_at: now,
      updated_at: now,
    }).eq('disposition_id', dispId);
    if (error) throw error;

    // Create QP certification register entry
    const certId = ids.certRegisterId();
    await supabase.from('qp_certification_register').insert({
      cert_id: certId,
      disposition_id: dispId,
      batch_number: current.batch_number,
      product_name: current.product_name,
      batch_size: current.batch_size || '',
      qp_name: qp_name || userId || '',
      qp_role: userRole || 'qualified_person',
      decision: 'released',
      regulatory_framework: current.regulatory_framework || 'eu_gmp',
      signature_meaning: signature_meaning || 'batch certified for release',
      notes: qp_comments || '',
      created_by: userId || 'system',
    });

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'disposition_released',
      entityType: 'batch_disposition',
      entityId: dispId,
      before: { status: current.status },
      after: { status: 'released', qp_name, certId, signature_meaning },
      reason: `QP release decision: batch ${current.batch_number} certified for release`,
      req,
    });

    return { ok: true, dispId, status: 'released', certId };
  }

  async function reject({ dispId, qp_name, rejection_reason, rejection_disposition, qp_comments, signature_meaning, userId, userRole, req }) {
    const current = await getById(dispId);
    if (current.status !== 'in_review' && current.status !== 'on_hold') {
      throw Object.assign(new Error('Can only reject from in_review or on_hold status'), { statusCode: 400 });
    }
    if (!rejection_reason) throw Object.assign(new Error('rejection_reason is required'), { statusCode: 400 });
    if (!rejection_disposition) throw Object.assign(new Error('rejection_disposition is required (destroy/reprocess/rework/return_to_supplier)'), { statusCode: 400 });

    const now = new Date().toISOString();
    const { error } = await supabase.from('batch_dispositions').update({
      status: 'rejected',
      qp_name: qp_name || userId || '',
      qp_decision: 'rejected',
      qp_decision_date: now,
      qp_comments: qp_comments || '',
      qp_signature_meaning: signature_meaning || 'batch rejected',
      rejection_reason,
      rejection_disposition,
      review_completed_at: now,
      updated_at: now,
    }).eq('disposition_id', dispId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'disposition_rejected',
      entityType: 'batch_disposition',
      entityId: dispId,
      before: { status: current.status },
      after: { status: 'rejected', rejection_reason, rejection_disposition, qp_name, signature_meaning },
      reason: `QP reject decision: ${rejection_reason}`,
      req,
    });

    return { ok: true, dispId, status: 'rejected' };
  }

  async function conditionalRelease({ dispId, conditions, conditional_expiry, qp_name, qp_comments, signature_meaning, userId, userRole, req }) {
    const current = await getById(dispId);
    if (current.status !== 'in_review' && current.status !== 'on_hold') {
      throw Object.assign(new Error('Can only conditionally release from in_review or on_hold status'), { statusCode: 400 });
    }
    if (!conditions) throw Object.assign(new Error('conditions text is required'), { statusCode: 400 });

    const now = new Date().toISOString();
    const { error } = await supabase.from('batch_dispositions').update({
      status: 'conditional_release',
      qp_name: qp_name || userId || '',
      qp_decision: 'conditional_release',
      qp_decision_date: now,
      qp_comments: qp_comments || '',
      qp_signature_meaning: signature_meaning || 'batch certified for conditional release',
      conditional_release: true,
      conditional_conditions: conditions,
      conditional_expiry: conditional_expiry || null,
      review_completed_at: now,
      updated_at: now,
    }).eq('disposition_id', dispId);
    if (error) throw error;

    // Create QP certification register entry with conditions
    const certId = ids.certRegisterId();
    await supabase.from('qp_certification_register').insert({
      cert_id: certId,
      disposition_id: dispId,
      batch_number: current.batch_number,
      product_name: current.product_name,
      batch_size: current.batch_size || '',
      qp_name: qp_name || userId || '',
      qp_role: userRole || 'qualified_person',
      decision: 'conditional_release',
      conditions,
      regulatory_framework: current.regulatory_framework || 'eu_gmp',
      signature_meaning: signature_meaning || 'batch certified for conditional release',
      notes: qp_comments || '',
      created_by: userId || 'system',
    });

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'disposition_conditional_release',
      entityType: 'batch_disposition',
      entityId: dispId,
      before: { status: current.status },
      after: { status: 'conditional_release', conditions, conditional_expiry, qp_name, certId, signature_meaning },
      reason: `QP conditional release: ${conditions}`,
      req,
    });

    return { ok: true, dispId, status: 'conditional_release', certId };
  }

  async function resolveConditional({ dispId, final_disposition, reason, userId, userRole, req }) {
    const current = await getById(dispId);
    if (current.status !== 'conditional_release') {
      throw Object.assign(new Error('Can only resolve conditional release status'), { statusCode: 400 });
    }
    if (!['confirmed_release', 'withdrawn'].includes(final_disposition)) {
      throw Object.assign(new Error('final_disposition must be confirmed_release or withdrawn'), { statusCode: 400 });
    }

    const newStatus = final_disposition === 'confirmed_release' ? 'released' : 'rejected';
    const { error } = await supabase.from('batch_dispositions').update({
      status: newStatus,
      conditional_final_disposition: final_disposition,
      updated_at: new Date().toISOString(),
    }).eq('disposition_id', dispId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'disposition_conditional_resolved',
      entityType: 'batch_disposition',
      entityId: dispId,
      before: { status: 'conditional_release' },
      after: { status: newStatus, final_disposition, reason },
      reason: `Conditional release resolved: ${final_disposition} — ${reason || 'No reason'}`,
      req,
    });

    return { ok: true, dispId, status: newStatus, final_disposition };
  }

  // ── QP Certification Register ────────────────────────────────────────

  async function getCertRegister(filters = {}) {
    let query = supabase.from('qp_certification_register').select('*').order('certification_date', { ascending: false });
    if (filters.date_from) query = query.gte('certification_date', filters.date_from);
    if (filters.date_to) query = query.lte('certification_date', filters.date_to);
    if (filters.product_name) query = query.eq('product_name', filters.product_name);
    if (filters.qp_name) query = query.eq('qp_name', filters.qp_name);

    const { data, error } = await query;
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  async function getCertEntry(certId) {
    const { data, error } = await supabase
      .from('qp_certification_register').select('*').eq('cert_id', certId).single();
    if (error || !data) throw Object.assign(new Error('Certification entry not found'), { statusCode: 404 });
    return data;
  }

  // ── Exceptions ─────────────────────────────────────────────────────

  async function getExceptions() {
    // Get active dispositions
    const { data: dispositions } = await supabase
      .from('batch_dispositions').select('disposition_id, batch_number, product_name, status')
      .in('status', ['in_review', 'conditional_release']);

    if (!dispositions || dispositions.length === 0) return [];

    const dispIds = dispositions.map(d => d.disposition_id);
    const { data: items } = await supabase
      .from('disposition_checklists').select('*')
      .in('disposition_id', dispIds)
      .in('ai_classification', ['flagged', 'critical'])
      .order('ai_classification', { ascending: true });

    // Group by disposition
    const grouped = {};
    (items || []).forEach(item => {
      if (!grouped[item.disposition_id]) {
        const disp = dispositions.find(d => d.disposition_id === item.disposition_id);
        grouped[item.disposition_id] = { ...disp, items: [] };
      }
      grouped[item.disposition_id].items.push(item);
    });

    return Object.values(grouped);
  }

  // ── Timeline ─────────────────────────────────────────────────────

  async function getTimeline(dispId) {
    const { data, error } = await supabase
      .from('audit_log').select('*')
      .eq('entity_id', dispId)
      .order('timestamp', { ascending: true });
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  // ── Stats ────────────────────────────────────────────────────────

  async function getStats() {
    const { data, error } = await supabase
      .from('batch_dispositions').select('*').order('created_at', { ascending: false });
    if (error) {
      if (error.message.includes('does not exist')) return { total: 0 };
      throw error;
    }
    const all = data || [];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    let pendingCount = 0, inReviewCount = 0, conditionalCount = 0, onHoldCount = 0;
    let releasedThisMonth = 0, rejectedThisMonth = 0;
    let totalReviewDays = 0, reviewedCount = 0;
    let overdueConditional = 0;
    let rightFirstTime = 0, totalCompleted = 0;

    all.forEach(d => {
      if (d.status === 'pending_review') pendingCount++;
      if (d.status === 'in_review') inReviewCount++;
      if (d.status === 'conditional_release') {
        conditionalCount++;
        if (d.conditional_expiry && new Date(d.conditional_expiry) < now) overdueConditional++;
      }
      if (d.status === 'on_hold') onHoldCount++;

      if (d.status === 'released' && d.review_completed_at >= monthStart) releasedThisMonth++;
      if (d.status === 'rejected' && d.review_completed_at >= monthStart) rejectedThisMonth++;

      if (d.review_completed_at && d.review_started_at) {
        const days = (new Date(d.review_completed_at) - new Date(d.review_started_at)) / (1000 * 60 * 60 * 24);
        totalReviewDays += days;
        reviewedCount++;
      }

      if (['released', 'rejected'].includes(d.status)) {
        totalCompleted++;
        if (d.status === 'released' && !d.hold_reason) rightFirstTime++;
      }
    });

    return {
      total: all.length,
      pending: pendingCount,
      in_review: inReviewCount,
      conditional_release: conditionalCount,
      overdue_conditional: overdueConditional,
      released_this_month: releasedThisMonth,
      rejected_this_month: rejectedThisMonth,
      on_hold: onHoldCount,
      avg_review_days: reviewedCount > 0 ? Math.round(totalReviewDays / reviewedCount * 10) / 10 : null,
      right_first_time: totalCompleted > 0 ? Math.round(rightFirstTime / totalCompleted * 100) : null,
    };
  }

  // ── AI Features ──────────────────────────────────────────────────

  async function aiPrescreen({ dispId, userId, userRole, req }) {
    const disposition = await getById(dispId);
    const checklist = disposition.checklist || [];

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: PRESCREEN_PROMPT(disposition, checklist) }],
    });

    const result = parseClaudeJson(message.content[0].text);

    // Update each checklist item with AI classification
    if (result.classifications) {
      for (const cls of result.classifications) {
        await supabase.from('disposition_checklists').update({
          ai_classification: cls.classification,
          ai_reason: cls.reason,
          ai_flagged: ['flagged', 'critical'].includes(cls.classification),
          ai_auto_cleared: cls.auto_cleared || false,
          ai_cleared_basis: cls.auto_cleared ? cls.reason : '',
          updated_at: new Date().toISOString(),
        }).eq('checklist_id', cls.checklist_id);
      }
    }

    // Update disposition with AI results
    await supabase.from('batch_dispositions').update({
      ai_prescreen_result: result.risk_level || '',
      ai_risk_score: result.overall_risk_score || null,
      ai_anomalies: result.anomalies || [],
      ai_confidence: result.confidence || null,
      updated_at: new Date().toISOString(),
    }).eq('disposition_id', dispId);

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'disposition_ai_prescreen',
      entityType: 'batch_disposition',
      entityId: dispId,
      after: { risk_score: result.overall_risk_score, risk_level: result.risk_level, auto_cleared: result.auto_cleared_count, flagged: result.flagged_count, critical: result.critical_count, confidence: result.confidence },
      reason: `AI pre-screen completed: risk score ${result.overall_risk_score}, ${result.flagged_count} flagged, ${result.critical_count} critical`,
      req,
    });

    return { ok: true, dispId, ...result };
  }

  async function aiSummary({ dispId, userId, userRole, req }) {
    const disposition = await getById(dispId);
    const checklist = disposition.checklist || [];

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: SUMMARY_PROMPT(disposition, checklist) }],
    });

    const result = parseClaudeJson(message.content[0].text);

    await supabase.from('batch_dispositions').update({
      ai_review_summary: result.summary || '',
      updated_at: new Date().toISOString(),
    }).eq('disposition_id', dispId);

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'disposition_ai_summary',
      entityType: 'batch_disposition',
      entityId: dispId,
      after: { summaryGenerated: true, confidence: result.confidence },
      reason: `AI review summary generated for ${dispId}`,
      req,
    });

    return { ok: true, dispId, ...result };
  }

  async function aiRecommend({ dispId, userId, userRole, req }) {
    const disposition = await getById(dispId);
    const checklist = disposition.checklist || [];

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: RECOMMEND_PROMPT(disposition, checklist) }],
    });

    const result = parseClaudeJson(message.content[0].text);

    await supabase.from('batch_dispositions').update({
      ai_release_recommendation: result.recommendation || '',
      updated_at: new Date().toISOString(),
    }).eq('disposition_id', dispId);

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'disposition_ai_recommendation',
      entityType: 'batch_disposition',
      entityId: dispId,
      after: { recommendation: result.recommendation, confidence: result.confidence, blocking_items: result.blocking_items },
      reason: `AI release recommendation: ${result.recommendation} (confidence: ${result.confidence})`,
      req,
    });

    return { ok: true, dispId, ...result };
  }

  async function aiMissingDocs({ dispId, userId, userRole, req }) {
    const disposition = await getById(dispId);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: MISSING_DOCS_PROMPT(disposition) }],
    });

    const result = parseClaudeJson(message.content[0].text);

    await supabase.from('batch_dispositions').update({
      missing_documents: result.missing_documents || [],
      updated_at: new Date().toISOString(),
    }).eq('disposition_id', dispId);

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'disposition_ai_missing_docs',
      entityType: 'batch_disposition',
      entityId: dispId,
      after: { missing_count: (result.missing_documents || []).length },
      reason: `AI missing documents check: ${(result.missing_documents || []).length} items flagged`,
      req,
    });

    return { ok: true, dispId, ...result };
  }

  async function aiTrendAnalysis({ dispId, userId, userRole, req }) {
    const disposition = await getById(dispId);

    // Fetch historical batches of same product
    const { data: historical } = await supabase
      .from('batch_dispositions').select('*')
      .eq('product_name', disposition.product_name)
      .neq('disposition_id', dispId)
      .order('created_at', { ascending: false })
      .limit(10);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: TREND_PROMPT(disposition, historical || []) }],
    });

    const result = parseClaudeJson(message.content[0].text);

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'disposition_ai_trend_analysis',
      entityType: 'batch_disposition',
      entityId: dispId,
      after: { trends_count: (result.trends || []).length, confidence: result.confidence },
      reason: `AI trend analysis: ${(result.trends || []).length} trends identified`,
      req,
    });

    return { ok: true, dispId, ...result };
  }

  async function aiInvestigationReview({ dispId, userId, userRole, req }) {
    const disposition = await getById(dispId);
    const deviations = disposition.open_deviations || [];

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: INVESTIGATION_REVIEW_PROMPT(disposition, deviations) }],
    });

    const result = parseClaudeJson(message.content[0].text);

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'disposition_ai_investigation_review',
      entityType: 'batch_disposition',
      entityId: dispId,
      after: { overall_adequacy: result.overall_adequacy, confidence: result.confidence },
      reason: `AI investigation review: ${result.overall_adequacy}`,
      req,
    });

    return { ok: true, dispId, ...result };
  }

  return {
    create, list, getById, update,
    startReview, addChecklistItem, getChecklist, updateChecklistItem, holdDisposition,
    release, reject, conditionalRelease, resolveConditional,
    getCertRegister, getCertEntry,
    getExceptions, getTimeline, getStats,
    aiPrescreen, aiSummary, aiRecommend, aiMissingDocs, aiTrendAnalysis, aiInvestigationReview,
  };
}

module.exports = { makeBatchDispositionService };
