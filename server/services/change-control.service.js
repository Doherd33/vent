'use strict';

const ids = require('../lib/ids');
const parseClaudeJson = require('../lib/parse-claude-json');

// ── AI Prompt Templates ─────────────────────────────────────────────────────

const IMPACT_PROMPT = (title, description, changeType, subCategory, category, justification, proposedChange) => `You are a pharmaceutical change control specialist for a GMP biologics manufacturing facility operating under 21 CFR 211.100(b), EU GMP Annex 15, and ICH Q10.

Given the following change control request, identify which departments are affected and generate department-specific impact narratives. Detect cascade impacts (e.g. raw material change → spec update → SOP revision → training).

CHANGE CONTROL:
Title: ${title}
Description: ${description}
Change Type: ${changeType}
Sub-Category: ${subCategory || 'Not specified'}
Category: ${category}
Justification: ${justification || 'Not provided'}
Proposed Change: ${proposedChange || 'Not provided'}

DEPARTMENTS TO EVALUATE: qa, qc, regulatory, production, engineering, msat, validation, facilities, supply-chain, ehs, it-automation

For each affected department, provide:
- impact_level: none, low, medium, or high
- impact_details: specific, actionable narrative (not generic)
- mitigation: recommended mitigation steps
- validation_required: boolean
- validation_type: if validation needed, specify type (iq, oq, pq, process-validation, cleaning-validation, method-validation, csv)
- cascade_impacts: second-order effects

Return ONLY valid JSON (no markdown fences):
{
  "departments": [
    {
      "department": "qa",
      "impact_level": "high",
      "impact_details": "Specific impact description...",
      "mitigation": "Recommended steps...",
      "validation_required": false,
      "validation_type": "",
      "cascade_impacts": "Second-order effects..."
    }
  ],
  "summary": "Overall impact summary paragraph",
  "cascade_chain": ["Step 1 → Step 2 → Step 3"]
}`;

const CLASSIFY_PROMPT = (title, description, changeType, subCategory, proposedChange) => `You are a pharmaceutical regulatory affairs specialist for a biologics manufacturing facility.

Analyse the following change and classify it under BOTH:
1. EU Variations Regulation (EC 1234/2008) — Type IA, IAIN, IB, or II
2. FDA SUPAC guidance — Level 1, 2, or 3

CHANGE:
Title: ${title}
Description: ${description}
Change Type: ${changeType}
Sub-Category: ${subCategory || 'Not specified'}
Proposed Change: ${proposedChange || 'Not provided'}

Provide a confidence score (0-100). Flag low-confidence classifications (<70) for senior QA review. Cite specific regulatory criteria in your reasoning.

Return ONLY valid JSON (no markdown fences):
{
  "eu_classification": "type-ia|type-iain|type-ib|type-ii",
  "eu_reasoning": "Reasoning citing EC 1234/2008 criteria...",
  "fda_supac_level": "1|2|3",
  "fda_reasoning": "Reasoning citing SUPAC guidance...",
  "regulatory_filing_type": "annual-report|cbe-30|pas|type-ia|type-iain|type-ib|type-ii|extension",
  "confidence": 85,
  "requires_senior_review": false,
  "reasoning_summary": "Overall classification rationale"
}`;

const CHECKLIST_PROMPT = (title, description, changeType, subCategory, category, impactSummary, affectedDepts) => `You are a pharmaceutical change control implementation specialist for a GMP biologics facility.

Generate a dependency-ordered implementation checklist for this change control.

CHANGE:
Title: ${title}
Description: ${description}
Change Type: ${changeType}
Sub-Category: ${subCategory || 'Not specified'}
Category: ${category}
Impact Summary: ${impactSummary || 'Not yet assessed'}
Affected Departments: ${affectedDepts || 'Not yet assessed'}

Include tasks for: regulatory submissions (if Type IB/II), validation activities (IQ/OQ/PQ, process validation, cleaning validation, method validation as appropriate), training requirements, document updates, communication steps.

Each task must have a dependency order (lower numbers execute first). Tasks with the same order number can run in parallel.

Return ONLY valid JSON (no markdown fences):
{
  "tasks": [
    {
      "title": "Task title",
      "description": "Detailed description",
      "assigned_role": "qa|qc|regulatory|production|engineering|msat|validation|facilities",
      "effort_estimate": "2 hours|1 day|3 days",
      "task_order": 1,
      "verification_required": false,
      "dependencies": "Describe what must be completed first"
    }
  ]
}`;

const SOP_PROMPT = (title, description, changeType, proposedChange) => `You are a pharmaceutical documentation specialist for a GMP biologics facility.

Based on the following change control, identify SOPs that would likely need revision. Consider SOPs related to the change type, affected processes, equipment, materials, and quality systems.

CHANGE:
Title: ${title}
Description: ${description}
Change Type: ${changeType}
Proposed Change: ${proposedChange || 'Not provided'}

Return ONLY valid JSON (no markdown fences):
{
  "affected_sops": [
    {
      "sop_id": "SOP-XXX",
      "title": "SOP title",
      "relevance_score": 0.95,
      "reason": "Why this SOP is affected"
    }
  ]
}`;

const RISK_PROMPT = (title, description, changeType, subCategory, category, affectedAreas) => `You are a pharmaceutical risk assessment specialist applying ICH Q9 principles to a GMP biologics facility.

Perform an FMEA-style risk assessment for this change control. Score each dimension 1-5.

CHANGE:
Title: ${title}
Description: ${description}
Change Type: ${changeType}
Sub-Category: ${subCategory || 'Not specified'}
Category: ${category}
Affected Areas: ${affectedAreas || 'Not yet assessed'}

SCORING SCALES:
- Severity (1-5): 1=negligible, 2=minor quality impact, 3=moderate quality impact, 4=major product/patient impact, 5=catastrophic/patient safety
- Probability (1-5): 1=rare, 2=unlikely, 3=possible, 4=likely, 5=almost certain
- Detectability (1-5): 1=easily detected before release, 2=high detection capability, 3=moderate detection, 4=low detection capability, 5=undetectable until post-release

Consider biologics-specific risk factors (e.g. cell line changes score higher severity than documentation changes).

Return ONLY valid JSON (no markdown fences):
{
  "severity": 3,
  "severity_reasoning": "Reasoning referencing ICH Q9...",
  "probability": 2,
  "probability_reasoning": "Reasoning...",
  "detectability": 2,
  "detectability_reasoning": "Reasoning...",
  "rpn": 12,
  "overall_risk_level": "low|medium|high|critical",
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}`;

const EFFECTIVENESS_PROMPT = (title, description, changeType, category, implementationPlan) => `You are a pharmaceutical quality specialist defining effectiveness criteria for a change control in a GMP biologics facility per ICH Q10 Section 3.2.4(d).

Suggest objective, measurable effectiveness criteria to be evaluated post-implementation.

CHANGE:
Title: ${title}
Description: ${description}
Change Type: ${changeType}
Category: ${category}
Implementation Plan: ${implementationPlan || 'Not yet defined'}

Include: specific metrics/CQAs to monitor, target values, number of batches or time period for evaluation, responsible role.

Return ONLY valid JSON (no markdown fences):
{
  "criteria": [
    {
      "criterion": "Monitor potency over next 10 batches",
      "metric": "Potency (%)",
      "target": "95-105%",
      "evaluation_period": "10 batches or 90 days",
      "responsible_role": "qc"
    }
  ],
  "review_period_days": 90,
  "summary": "Overall effectiveness review approach"
}`;

// ── Helper: business day calculator ──────────────────────────────────────────

function addBusinessDays(date, days) {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

// ── Service Factory ─────────────────────────────────────────────────────────

function makeChangeControlService({ supabase, auditLog, anthropic }) {

  // ── CRUD ────────────────────────────────────────────────────────────────

  async function create({
    title, description, changeType, subCategory, category, priority, urgency,
    justification, proposedChange, riskAssessment,
    riskSeverity, riskProbability, riskDetectability,
    targetCompletion, linkedDeviationId, linkedCapaId, linkedAuditFinding,
    originatorDept, userId, userRole, req
  }) {
    if (!title) throw Object.assign(new Error('title is required'), { statusCode: 400 });

    const ccId = ids.changeControlId();
    const ccbRequired = (category === 'major' || category === 'critical');
    const rpn = (riskSeverity || 0) * (riskProbability || 0) * (riskDetectability || 0);

    const row = {
      cc_id: ccId,
      title,
      description: description || '',
      change_type: changeType || 'process',
      sub_category: subCategory || '',
      category: category || 'minor',
      status: 'draft',
      priority: priority || 'medium',
      urgency: urgency || 'planned',
      originator: userId || 'unknown',
      originator_dept: originatorDept || '',
      justification: justification || '',
      proposed_change: proposedChange || '',
      risk_assessment: riskAssessment || '',
      risk_severity: riskSeverity || 0,
      risk_probability: riskProbability || 0,
      risk_detectability: riskDetectability || 0,
      risk_rpn: rpn,
      ccb_required: ccbRequired,
      target_completion: targetCompletion || null,
      linked_deviation_id: linkedDeviationId || '',
      linked_capa_id: linkedCapaId || '',
      linked_audit_finding: linkedAuditFinding || '',
      created_by: userId || 'system',
    };

    const { error } = await supabase.from('change_controls').insert(row);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'change_control.created',
      entityType: 'change_control',
      entityId: ccId,
      after: row,
      reason: `Change control initiated: ${title}`,
      req,
    });

    return { ok: true, ccId };
  }

  async function getById(ccId) {
    const { data, error } = await supabase
      .from('change_controls').select('*').eq('cc_id', ccId).single();
    if (error || !data) throw Object.assign(new Error('Change control not found'), { statusCode: 404 });

    // Fetch related records
    const [impacts, approvals, tasks] = await Promise.all([
      supabase.from('cc_impact_assessments').select('*').eq('cc_id', ccId).order('created_at', { ascending: true }),
      supabase.from('cc_approvals').select('*').eq('cc_id', ccId).order('approval_tier', { ascending: true }),
      supabase.from('cc_implementation_tasks').select('*').eq('cc_id', ccId).order('task_order', { ascending: true }),
    ]);

    data.impacts = impacts.data || [];
    data.approvals = approvals.data || [];
    data.tasks = tasks.data || [];

    return data;
  }

  async function list(filters = {}) {
    let query = supabase.from('change_controls').select('*').order('created_at', { ascending: false });
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.change_type) query = query.eq('change_type', filters.change_type);
    if (filters.priority) query = query.eq('priority', filters.priority);
    if (filters.urgency) query = query.eq('urgency', filters.urgency);
    if (filters.regulatory_class) query = query.eq('regulatory_class', filters.regulatory_class);
    if (filters.originator) query = query.eq('originator', filters.originator);
    if (filters.category) query = query.eq('category', filters.category);
    if (filters.ccb_required !== undefined) query = query.eq('ccb_required', filters.ccb_required === 'true');

    const { data, error } = await query;
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }

    let results = data || [];

    // Filter overdue if requested
    if (filters.overdue === 'true') {
      const now = new Date();
      results = results.filter(cc =>
        cc.status !== 'closed' && cc.status !== 'rejected' && (
          (cc.target_completion && new Date(cc.target_completion) < now) ||
          (cc.sla_assessment_due && new Date(cc.sla_assessment_due) < now && cc.status === 'submitted') ||
          (cc.sla_approval_due && new Date(cc.sla_approval_due) < now && cc.status === 'under-review')
        )
      );
    }

    return results;
  }

  async function update({ ccId, updates, userId, userRole, reason, req }) {
    const current = await getById(ccId);

    const allowed = [
      'title', 'description', 'change_type', 'sub_category', 'category',
      'priority', 'urgency', 'justification', 'proposed_change',
      'risk_assessment', 'risk_severity', 'risk_probability', 'risk_detectability',
      'target_completion', 'linked_deviation_id', 'linked_capa_id', 'linked_audit_finding',
      'affected_departments', 'affected_sops', 'affected_equipment', 'affected_batches',
      'originator_dept', 'effectiveness_criteria', 'implementation_plan',
      'implementation_date', 'effectiveness_check', 'effectiveness_result',
      'effectiveness_date', 'effectiveness_due_date', 'closure_notes',
      'regulatory_class', 'regulatory_filing_type',
    ];

    const patch = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) patch[key] = updates[key];
    }

    // Auto-calculate RPN
    const sev = patch.risk_severity !== undefined ? patch.risk_severity : current.risk_severity;
    const prob = patch.risk_probability !== undefined ? patch.risk_probability : current.risk_probability;
    const det = patch.risk_detectability !== undefined ? patch.risk_detectability : current.risk_detectability;
    if (sev && prob && det) {
      patch.risk_rpn = sev * prob * det;
    }

    // Auto-set CCB required
    const cat = patch.category || current.category;
    if (cat === 'major' || cat === 'critical') {
      patch.ccb_required = true;
    }

    patch.updated_at = new Date().toISOString();

    const { error } = await supabase.from('change_controls').update(patch).eq('cc_id', ccId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'change_control.updated',
      entityType: 'change_control',
      entityId: ccId,
      before: current,
      after: patch,
      reason: reason || `Change control ${ccId} updated`,
      req,
    });

    return { ok: true, ccId, updates: patch };
  }

  // ── WORKFLOW TRANSITIONS ───────────────────────────────────────────────

  async function submit({ ccId, userId, userRole, req }) {
    const cc = await getById(ccId);
    if (cc.status !== 'draft') throw Object.assign(new Error('Can only submit from draft status'), { statusCode: 400 });

    const now = new Date();
    const patch = { status: 'submitted', updated_at: now.toISOString() };

    // Set SLA dates based on urgency
    if (cc.urgency === 'emergency') {
      patch.status = 'approved';
      patch.sla_assessment_due = now.toISOString().slice(0, 10);
      patch.sla_approval_due = now.toISOString().slice(0, 10);
    } else if (cc.urgency === 'urgent') {
      patch.sla_assessment_due = addBusinessDays(now, 2).toISOString().slice(0, 10);
    } else {
      patch.sla_assessment_due = addBusinessDays(now, 5).toISOString().slice(0, 10);
    }

    const { error } = await supabase.from('change_controls').update(patch).eq('cc_id', ccId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system', userRole: userRole || 'system',
      action: cc.urgency === 'emergency' ? 'change_control.emergency_submitted' : 'change_control.submitted',
      entityType: 'change_control', entityId: ccId,
      before: { status: cc.status }, after: patch,
      reason: cc.urgency === 'emergency'
        ? `Emergency change ${ccId} submitted — immediate implementation permitted, retrospective documentation required within 24h`
        : `Change control ${ccId} submitted for impact assessment`,
      req,
    });

    return { ok: true, ccId, newStatus: patch.status, urgency: cc.urgency };
  }

  async function moveToReview({ ccId, userId, userRole, req }) {
    const cc = await getById(ccId);
    if (cc.status !== 'submitted') throw Object.assign(new Error('Can only review from submitted status'), { statusCode: 400 });

    const patch = { status: 'under-review', updated_at: new Date().toISOString() };

    // Auto-set CCB for major/critical
    if (cc.category === 'major' || cc.category === 'critical') {
      patch.ccb_required = true;
    }

    // Set approval SLA
    if (cc.urgency === 'urgent') {
      patch.sla_approval_due = addBusinessDays(new Date(), 1).toISOString().slice(0, 10);
    } else {
      patch.sla_approval_due = addBusinessDays(new Date(), 3).toISOString().slice(0, 10);
    }

    const { error } = await supabase.from('change_controls').update(patch).eq('cc_id', ccId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system', userRole: userRole || 'system',
      action: 'change_control.under_review', entityType: 'change_control', entityId: ccId,
      before: { status: cc.status }, after: patch,
      reason: `Change control ${ccId} moved to under-review`,
      req,
    });

    return { ok: true, ccId, newStatus: 'under-review' };
  }

  async function approve({ ccId, approver, approverRole, approvalTier, decision, signatureMeaning, comments, userId, userRole, req }) {
    const cc = await getById(ccId);
    if (cc.status !== 'under-review' && cc.status !== 'submitted') {
      throw Object.assign(new Error('Change control must be under-review or submitted for approval'), { statusCode: 400 });
    }
    if (!decision || !['approved', 'rejected', 'request-info'].includes(decision)) {
      throw Object.assign(new Error('Decision must be approved, rejected, or request-info'), { statusCode: 400 });
    }
    if ((decision === 'rejected' || decision === 'request-info') && !comments) {
      throw Object.assign(new Error('Comments required for reject or request-info'), { statusCode: 400 });
    }

    // Record the approval
    const { error: aprError } = await supabase.from('cc_approvals').insert({
      approval_id: ids.ccApprovalId(),
      cc_id: ccId,
      approver: approver || userId,
      approver_role: approverRole || userRole,
      approval_tier: approvalTier || 1,
      decision,
      signature_meaning: signatureMeaning || 'approval',
      comments: comments || '',
      decided_at: new Date().toISOString(),
      created_by: userId || 'system',
    });
    if (aprError) throw aprError;

    // Determine if we should transition status
    const patch = { updated_at: new Date().toISOString() };
    if (decision === 'rejected') {
      patch.status = 'rejected';
    } else if (decision === 'approved') {
      // Check if all required tiers are approved
      const { data: allApprovals } = await supabase.from('cc_approvals')
        .select('*').eq('cc_id', ccId).eq('decision', 'approved');
      const approvedTiers = new Set((allApprovals || []).map(a => a.approval_tier));

      let requiredTiers = [1]; // minor
      if (cc.category === 'moderate') requiredTiers = [1, 2];
      if (cc.category === 'major') requiredTiers = [2, 3];
      if (cc.category === 'critical') requiredTiers = [3];

      const allTiersApproved = requiredTiers.every(t => approvedTiers.has(t));
      if (allTiersApproved) {
        patch.status = 'approved';
      }
    }

    if (patch.status) {
      const { error } = await supabase.from('change_controls').update(patch).eq('cc_id', ccId);
      if (error) throw error;
    }

    await auditLog({
      userId: userId || 'system', userRole: userRole || 'system',
      action: `change_control.approval_${decision}`, entityType: 'change_control', entityId: ccId,
      before: { status: cc.status },
      after: { decision, approver, approverRole, approvalTier, signatureMeaning, comments, newStatus: patch.status },
      reason: `Approval decision: ${decision} by ${approver || userId} (tier ${approvalTier})`,
      req,
    });

    return { ok: true, ccId, decision, newStatus: patch.status || cc.status };
  }

  async function startImplementation({ ccId, userId, userRole, req }) {
    const cc = await getById(ccId);
    if (cc.status !== 'approved') throw Object.assign(new Error('Can only implement from approved status'), { statusCode: 400 });

    // Block if regulatory filing requires pre-approval
    if (cc.regulatory_filing_type === 'pas' || cc.regulatory_filing_type === 'type-ii') {
      const regApproval = (cc.approvals || []).find(a =>
        a.approver_role === 'regulatory' && a.decision === 'approved'
      );
      if (!regApproval) {
        throw Object.assign(new Error('Regulatory approval required before implementation for PAS/Type II changes'), { statusCode: 400 });
      }
    }

    const now = new Date();
    const patch = {
      status: 'implementing',
      implementation_date: now.toISOString().slice(0, 10),
      updated_at: now.toISOString(),
    };

    // Auto-set effectiveness due date
    const daysMap = { minor: 30, moderate: 60, major: 90, critical: 90 };
    const effDays = daysMap[cc.category] || 60;
    const effDate = new Date(now);
    effDate.setDate(effDate.getDate() + effDays);
    patch.effectiveness_due_date = effDate.toISOString().slice(0, 10);
    patch.effectiveness_result = 'pending';

    const { error } = await supabase.from('change_controls').update(patch).eq('cc_id', ccId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system', userRole: userRole || 'system',
      action: 'change_control.implementing', entityType: 'change_control', entityId: ccId,
      before: { status: cc.status }, after: patch,
      reason: `Change control ${ccId} implementation started`,
      req,
    });

    return { ok: true, ccId, newStatus: 'implementing', effectivenessDueDate: patch.effectiveness_due_date };
  }

  async function close({ ccId, closureNotes, effectivenessResult, effectivenessCheck, userId, userRole, req }) {
    const cc = await getById(ccId);
    if (cc.status !== 'implementing') throw Object.assign(new Error('Can only close from implementing status'), { statusCode: 400 });

    // Block if tasks incomplete
    const incompleteTasks = (cc.tasks || []).filter(t => t.status !== 'completed');
    if (incompleteTasks.length > 0) {
      throw Object.assign(new Error(`Cannot close: ${incompleteTasks.length} implementation task(s) still incomplete`), { statusCode: 400 });
    }

    // Block if verification-required tasks lack verification
    const unverified = (cc.tasks || []).filter(t => t.verification_required && !t.verified_by);
    if (unverified.length > 0) {
      throw Object.assign(new Error(`Cannot close: ${unverified.length} task(s) require QA verification`), { statusCode: 400 });
    }

    if (!effectivenessResult) throw Object.assign(new Error('Effectiveness result is required to close'), { statusCode: 400 });

    const now = new Date();
    const patch = {
      status: 'closed',
      closure_notes: closureNotes || '',
      effectiveness_result: effectivenessResult,
      effectiveness_check: effectivenessCheck || '',
      effectiveness_date: now.toISOString().slice(0, 10),
      actual_completion: now.toISOString().slice(0, 10),
      updated_at: now.toISOString(),
    };

    const { error } = await supabase.from('change_controls').update(patch).eq('cc_id', ccId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system', userRole: userRole || 'system',
      action: 'change_control.closed', entityType: 'change_control', entityId: ccId,
      before: { status: cc.status }, after: patch,
      reason: `Change control ${ccId} closed — effectiveness: ${effectivenessResult}`,
      req,
    });

    return { ok: true, ccId, newStatus: 'closed', effectivenessResult };
  }

  // ── IMPACT ASSESSMENTS ─────────────────────────────────────────────────

  async function addImpact({ ccId, department, assessor, impactLevel, impactDetails, mitigation, validationRequired, validationType, regulatoryImpact, cascadeImpacts, dueDate, userId, userRole, req }) {
    const assessmentId = ids.ccImpactId();

    const row = {
      assessment_id: assessmentId,
      cc_id: ccId,
      department,
      assessor: assessor || userId,
      impact_level: impactLevel || 'none',
      impact_details: impactDetails || '',
      mitigation: mitigation || '',
      validation_required: validationRequired || false,
      validation_type: validationType || '',
      regulatory_impact: regulatoryImpact || false,
      cascade_impacts: cascadeImpacts || '',
      status: 'completed',
      due_date: dueDate || null,
      completed_at: new Date().toISOString(),
      created_by: userId || 'system',
    };

    const { error } = await supabase.from('cc_impact_assessments').insert(row);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system', userRole: userRole || 'system',
      action: 'change_control.impact_added', entityType: 'change_control', entityId: ccId,
      after: { assessmentId, department, impactLevel },
      reason: `Impact assessment added for ${department}: ${impactLevel}`,
      req,
    });

    return { ok: true, ccId, assessmentId };
  }

  async function listImpacts(ccId) {
    const { data, error } = await supabase.from('cc_impact_assessments')
      .select('*').eq('cc_id', ccId).order('created_at', { ascending: true });
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  // ── APPROVALS ──────────────────────────────────────────────────────────

  async function listApprovals(ccId) {
    const { data, error } = await supabase.from('cc_approvals')
      .select('*').eq('cc_id', ccId).order('approval_tier', { ascending: true });
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  // ── IMPLEMENTATION TASKS ───────────────────────────────────────────────

  async function addTask({ ccId, title, description, taskOrder, assignedTo, assignedRole, dueDate, verificationRequired, effortEstimate, userId, userRole, req }) {
    const taskId = ids.ccTaskId();
    const row = {
      task_id: taskId,
      cc_id: ccId,
      title,
      description: description || '',
      task_order: taskOrder || 0,
      assigned_to: assignedTo || '',
      assigned_role: assignedRole || '',
      status: 'pending',
      due_date: dueDate || null,
      verification_required: verificationRequired || false,
      effort_estimate: effortEstimate || '',
      created_by: userId || 'system',
    };

    const { error } = await supabase.from('cc_implementation_tasks').insert(row);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system', userRole: userRole || 'system',
      action: 'change_control.task_added', entityType: 'change_control', entityId: ccId,
      after: { taskId, title, assignedRole },
      reason: `Implementation task added: ${title}`,
      req,
    });

    return { ok: true, ccId, taskId };
  }

  async function listTasks(ccId) {
    const { data, error } = await supabase.from('cc_implementation_tasks')
      .select('*').eq('cc_id', ccId).order('task_order', { ascending: true });
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  async function updateTask({ ccId, taskId, updates, userId, userRole, req }) {
    const { data: current, error: fetchErr } = await supabase.from('cc_implementation_tasks')
      .select('*').eq('task_id', taskId).eq('cc_id', ccId).single();
    if (fetchErr || !current) throw Object.assign(new Error('Task not found'), { statusCode: 404 });

    const patch = {};
    const allowed = ['title', 'description', 'task_order', 'assigned_to', 'assigned_role', 'status', 'due_date', 'verification_required', 'effort_estimate', 'notes'];
    for (const key of allowed) {
      if (updates[key] !== undefined) patch[key] = updates[key];
    }

    if (patch.status === 'completed') {
      patch.completed_at = new Date().toISOString();
      patch.completed_by = userId || 'system';
    }

    patch.updated_at = new Date().toISOString();

    const { error } = await supabase.from('cc_implementation_tasks').update(patch).eq('task_id', taskId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system', userRole: userRole || 'system',
      action: 'change_control.task_updated', entityType: 'change_control', entityId: ccId,
      before: current, after: patch,
      reason: `Task ${taskId} updated`,
      req,
    });

    return { ok: true, taskId, updates: patch };
  }

  async function verifyTask({ ccId, taskId, userId, userRole, req }) {
    const { data: task, error: fetchErr } = await supabase.from('cc_implementation_tasks')
      .select('*').eq('task_id', taskId).eq('cc_id', ccId).single();
    if (fetchErr || !task) throw Object.assign(new Error('Task not found'), { statusCode: 404 });
    if (task.status !== 'completed') throw Object.assign(new Error('Task must be completed before verification'), { statusCode: 400 });

    const patch = {
      verified_by: userId || 'system',
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('cc_implementation_tasks').update(patch).eq('task_id', taskId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system', userRole: userRole || 'system',
      action: 'change_control.task_verified', entityType: 'change_control', entityId: ccId,
      after: { taskId, verifiedBy: userId },
      reason: `Task ${taskId} verified by ${userId}`,
      req,
    });

    return { ok: true, taskId, verifiedBy: userId };
  }

  // ── STATS ──────────────────────────────────────────────────────────────

  async function getStats() {
    const { data, error } = await supabase.from('change_controls').select('*');
    if (error) {
      if (error.message.includes('does not exist')) return { total: 0 };
      throw error;
    }
    const all = data || [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const byStatus = {};
    const byCategory = { minor: 0, moderate: 0, major: 0, critical: 0 };
    const byUrgency = { planned: 0, urgent: 0, emergency: 0 };
    const byRegClass = {};
    let overdue = 0;
    let overdueEffectiveness = 0;
    let totalCycleDays = 0;
    let closedCount = 0;
    let slaMetCount = 0;
    let slaTotal = 0;
    let emergencyRecent = 0;

    all.forEach(cc => {
      byStatus[cc.status] = (byStatus[cc.status] || 0) + 1;
      byCategory[cc.category] = (byCategory[cc.category] || 0) + 1;
      byUrgency[cc.urgency] = (byUrgency[cc.urgency] || 0) + 1;
      if (cc.regulatory_class && cc.regulatory_class !== 'none') {
        byRegClass[cc.regulatory_class] = (byRegClass[cc.regulatory_class] || 0) + 1;
      }

      if (cc.status !== 'closed' && cc.status !== 'rejected') {
        if (cc.target_completion && new Date(cc.target_completion) < now) overdue++;
        if (cc.sla_assessment_due && new Date(cc.sla_assessment_due) < now && cc.status === 'submitted') overdue++;
        if (cc.sla_approval_due && new Date(cc.sla_approval_due) < now && cc.status === 'under-review') overdue++;
      }

      if (cc.effectiveness_due_date && new Date(cc.effectiveness_due_date) < now && cc.effectiveness_result === 'pending') {
        overdueEffectiveness++;
      }

      if (cc.status === 'closed' && cc.actual_completion && cc.created_at) {
        const days = (new Date(cc.actual_completion) - new Date(cc.created_at)) / (1000 * 60 * 60 * 24);
        if (new Date(cc.actual_completion) >= thirtyDaysAgo) {
          totalCycleDays += days;
          closedCount++;
        }
      }

      // SLA compliance
      if (cc.sla_assessment_due && cc.status !== 'draft') {
        slaTotal++;
        if (cc.status !== 'submitted' || new Date(cc.sla_assessment_due) >= now) slaMetCount++;
      }

      if (cc.urgency === 'emergency' && new Date(cc.created_at) >= thirtyDaysAgo) {
        emergencyRecent++;
      }
    });

    const openCount = all.filter(cc => cc.status !== 'closed' && cc.status !== 'rejected').length;

    return {
      total: all.length,
      open: openCount,
      overdue,
      overdueEffectiveness,
      byStatus,
      byCategory,
      byUrgency,
      byRegClass,
      avgCycleTimeDays: closedCount > 0 ? Math.round(totalCycleDays / closedCount * 10) / 10 : null,
      slaComplianceRate: slaTotal > 0 ? Math.round((slaMetCount / slaTotal) * 100) : 100,
      emergencyRecent,
    };
  }

  async function getOverdue() {
    const all = await list({ overdue: 'true' });
    return all;
  }

  // ── AI FEATURES ────────────────────────────────────────────────────────

  async function aiImpact({ ccId, userId, req }) {
    const cc = await getById(ccId);
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: IMPACT_PROMPT(cc.title, cc.description, cc.change_type, cc.sub_category, cc.category, cc.justification, cc.proposed_change) }],
    });
    const result = parseClaudeJson(message.content[0].text);

    // Store AI summary
    await supabase.from('change_controls').update({
      ai_impact_summary: result.summary || '',
      affected_departments: (result.departments || []).filter(d => d.impact_level !== 'none').map(d => d.department),
      updated_at: new Date().toISOString(),
    }).eq('cc_id', ccId);

    // Auto-create impact assessment records for affected departments
    for (const dept of (result.departments || [])) {
      if (dept.impact_level === 'none') continue;
      const assessmentId = ids.ccImpactId();
      await supabase.from('cc_impact_assessments').insert({
        assessment_id: assessmentId,
        cc_id: ccId,
        department: dept.department,
        assessor: 'AI',
        impact_level: dept.impact_level,
        impact_details: dept.impact_details || '',
        mitigation: dept.mitigation || '',
        validation_required: dept.validation_required || false,
        validation_type: dept.validation_type || '',
        cascade_impacts: dept.cascade_impacts || '',
        status: 'pending',
        created_by: userId || 'system',
      });
    }

    await auditLog({
      userId: userId || 'system', userRole: 'system',
      action: 'change_control.ai_impact', entityType: 'change_control', entityId: ccId,
      after: { departmentsAssessed: (result.departments || []).length },
      reason: `AI impact assessment for ${ccId}`,
      req,
    });

    return { ok: true, ccId, result };
  }

  async function aiClassify({ ccId, userId, req }) {
    const cc = await getById(ccId);
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: CLASSIFY_PROMPT(cc.title, cc.description, cc.change_type, cc.sub_category, cc.proposed_change) }],
    });
    const result = parseClaudeJson(message.content[0].text);

    await supabase.from('change_controls').update({
      ai_reg_classification: JSON.stringify(result),
      regulatory_class: result.eu_classification || 'none',
      regulatory_filing_type: result.regulatory_filing_type || '',
      updated_at: new Date().toISOString(),
    }).eq('cc_id', ccId);

    await auditLog({
      userId: userId || 'system', userRole: 'system',
      action: 'change_control.ai_classify', entityType: 'change_control', entityId: ccId,
      after: { classification: result.eu_classification, confidence: result.confidence },
      reason: `AI regulatory classification for ${ccId}`,
      req,
    });

    return { ok: true, ccId, result };
  }

  async function aiChecklist({ ccId, userId, req }) {
    const cc = await getById(ccId);
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: CHECKLIST_PROMPT(cc.title, cc.description, cc.change_type, cc.sub_category, cc.category, cc.ai_impact_summary, JSON.stringify(cc.affected_departments)) }],
    });
    const result = parseClaudeJson(message.content[0].text);

    // Store AI checklist
    await supabase.from('change_controls').update({
      ai_checklist: result.tasks || [],
      updated_at: new Date().toISOString(),
    }).eq('cc_id', ccId);

    // Auto-create implementation tasks
    for (const task of (result.tasks || [])) {
      const taskId = ids.ccTaskId();
      await supabase.from('cc_implementation_tasks').insert({
        task_id: taskId,
        cc_id: ccId,
        title: task.title,
        description: task.description || '',
        task_order: task.task_order || 0,
        assigned_role: task.assigned_role || '',
        verification_required: task.verification_required || false,
        effort_estimate: task.effort_estimate || '',
        status: 'pending',
        created_by: userId || 'system',
      });
    }

    await auditLog({
      userId: userId || 'system', userRole: 'system',
      action: 'change_control.ai_checklist', entityType: 'change_control', entityId: ccId,
      after: { tasksGenerated: (result.tasks || []).length },
      reason: `AI implementation checklist for ${ccId}`,
      req,
    });

    return { ok: true, ccId, result };
  }

  async function aiSops({ ccId, userId, req }) {
    const cc = await getById(ccId);
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: SOP_PROMPT(cc.title, cc.description, cc.change_type, cc.proposed_change) }],
    });
    const result = parseClaudeJson(message.content[0].text);

    await supabase.from('change_controls').update({
      ai_affected_sops: result.affected_sops || [],
      affected_sops: (result.affected_sops || []).map(s => s.sop_id),
      updated_at: new Date().toISOString(),
    }).eq('cc_id', ccId);

    await auditLog({
      userId: userId || 'system', userRole: 'system',
      action: 'change_control.ai_sops', entityType: 'change_control', entityId: ccId,
      after: { sopsIdentified: (result.affected_sops || []).length },
      reason: `AI SOP identification for ${ccId}`,
      req,
    });

    return { ok: true, ccId, result };
  }

  async function aiRisk({ ccId, userId, req }) {
    const cc = await getById(ccId);
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: RISK_PROMPT(cc.title, cc.description, cc.change_type, cc.sub_category, cc.category, JSON.stringify(cc.affected_departments)) }],
    });
    const result = parseClaudeJson(message.content[0].text);

    await supabase.from('change_controls').update({
      ai_risk_score: result,
      updated_at: new Date().toISOString(),
    }).eq('cc_id', ccId);

    await auditLog({
      userId: userId || 'system', userRole: 'system',
      action: 'change_control.ai_risk', entityType: 'change_control', entityId: ccId,
      after: { rpn: result.rpn, riskLevel: result.overall_risk_level },
      reason: `AI risk assessment for ${ccId}`,
      req,
    });

    return { ok: true, ccId, result };
  }

  async function aiSimilar({ ccId, userId, req }) {
    const cc = await getById(ccId);

    // Fetch all other change controls for comparison
    const { data: allCCs } = await supabase.from('change_controls')
      .select('cc_id, title, description, change_type, category, status, regulatory_class, actual_completion, created_at, effectiveness_result')
      .neq('cc_id', ccId)
      .order('created_at', { ascending: false })
      .limit(50);

    const similarChanges = (allCCs || [])
      .map(other => {
        let score = 0;
        if (other.change_type === cc.change_type) score += 0.3;
        if (other.category === cc.category) score += 0.2;
        // Simple text similarity based on shared words
        const ccWords = new Set((cc.title + ' ' + cc.description).toLowerCase().split(/\s+/));
        const otherWords = (other.title + ' ' + other.description).toLowerCase().split(/\s+/);
        const shared = otherWords.filter(w => ccWords.has(w) && w.length > 3).length;
        score += Math.min(shared * 0.05, 0.5);
        return { ...other, similarity_score: Math.round(score * 100) / 100 };
      })
      .filter(c => c.similarity_score > 0.2)
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, 5);

    await supabase.from('change_controls').update({
      ai_similar_changes: similarChanges,
      updated_at: new Date().toISOString(),
    }).eq('cc_id', ccId);

    await auditLog({
      userId: userId || 'system', userRole: 'system',
      action: 'change_control.ai_similar', entityType: 'change_control', entityId: ccId,
      after: { similarFound: similarChanges.length },
      reason: `AI similar change search for ${ccId}`,
      req,
    });

    return { ok: true, ccId, result: { similar_changes: similarChanges } };
  }

  async function aiEffectiveness({ ccId, userId, req }) {
    const cc = await getById(ccId);
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: EFFECTIVENESS_PROMPT(cc.title, cc.description, cc.change_type, cc.category, cc.implementation_plan) }],
    });
    const result = parseClaudeJson(message.content[0].text);

    await supabase.from('change_controls').update({
      ai_effectiveness_criteria: result.summary || '',
      updated_at: new Date().toISOString(),
    }).eq('cc_id', ccId);

    await auditLog({
      userId: userId || 'system', userRole: 'system',
      action: 'change_control.ai_effectiveness', entityType: 'change_control', entityId: ccId,
      after: { criteriaCount: (result.criteria || []).length },
      reason: `AI effectiveness criteria for ${ccId}`,
      req,
    });

    return { ok: true, ccId, result };
  }

  return {
    create, getById, list, update,
    submit, moveToReview, approve, startImplementation, close,
    addImpact, listImpacts,
    listApprovals,
    addTask, listTasks, updateTask, verifyTask,
    getStats, getOverdue,
    aiImpact, aiClassify, aiChecklist, aiSops, aiRisk, aiSimilar, aiEffectiveness,
  };
}

module.exports = { makeChangeControlService };
