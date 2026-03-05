'use strict';

/**
 * services/training-matrix.service.js
 *
 * Role-based training assignments, SOP revision retraining cascades,
 * compliance status, and effectiveness tracking.
 *
 * Routes should call these functions and handle only HTTP concerns.
 */

const ids = require('../lib/ids');

function makeTrainingMatrixService({ supabase, auditLog, anthropic }) {

  // ── Assignments ─────────────────────────────────────────────────────────

  async function listAssignments({ assignedTo, status, sopCode } = {}) {
    let query = supabase.from('training_assignments').select('*');
    if (assignedTo) query = query.eq('assigned_to', assignedTo);
    if (status)     query = query.eq('status', status);
    if (sopCode)    query = query.eq('sop_code', sopCode);
    query = query.order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  async function createAssignment({ title, description, sopCode, sopChangeKey, assignedTo, assignedRole, assignedBy, dueDate, priority, trainingType, req }) {
    if (!title || !assignedTo || !assignedRole) {
      throw Object.assign(new Error('title, assignedTo, and assignedRole are required'), { statusCode: 400 });
    }

    const trainingId = ids.trainingId();

    const row = {
      training_id:    trainingId,
      title,
      description:    description || '',
      sop_code:       sopCode || null,
      sop_change_key: sopChangeKey || null,
      assigned_to:    assignedTo,
      assigned_role:  assignedRole,
      assigned_by:    assignedBy || 'system',
      due_date:       dueDate || null,
      priority:       priority || 'normal',
      status:         'assigned',
      training_type:  trainingType || 'initial',
    };

    const { error } = await supabase.from('training_assignments').insert(row);
    if (error) throw error;

    await auditLog({
      userId:     assignedBy || 'system',
      userRole:   'training',
      action:     'training_assigned',
      entityType: 'training',
      entityId:   trainingId,
      after:      { title, assignedTo, assignedRole, sopCode, dueDate },
      reason:     `Training assigned: ${title} → ${assignedTo}`,
      req,
    });

    return { ok: true, trainingId };
  }

  // ── Completions ─────────────────────────────────────────────────────────

  async function completeTraining({ trainingId, completedBy, score, passed, evidence, assessor, assessorRole, notes, eSignature, req }) {
    // Look up the assignment
    const { data: assignment, error: fetchErr } = await supabase
      .from('training_assignments')
      .select('*')
      .eq('training_id', trainingId)
      .single();
    if (fetchErr || !assignment) {
      throw Object.assign(new Error('Training assignment not found'), { statusCode: 404 });
    }

    // Insert completion record
    const { error: insertErr } = await supabase.from('training_completions').insert({
      assignment_id: assignment.id,
      training_id:   trainingId,
      completed_by:  completedBy,
      score:         score != null ? score : null,
      passed:        passed !== false,
      evidence:      evidence || null,
      assessor:      assessor || null,
      assessor_role: assessorRole || null,
      notes:         notes || '',
      e_signature:   eSignature || null,
    });
    if (insertErr) throw insertErr;

    // Update assignment status
    const newStatus = passed !== false ? 'completed' : 'failed';
    const { error: updateErr } = await supabase
      .from('training_assignments')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('training_id', trainingId);
    if (updateErr) throw updateErr;

    await auditLog({
      userId:     completedBy,
      userRole:   assignment.assigned_role,
      action:     'training_completed',
      entityType: 'training',
      entityId:   trainingId,
      before:     { status: assignment.status },
      after:      { status: newStatus, score, passed: passed !== false },
      reason:     `Training completed: ${assignment.title}`,
      req,
    });

    return { ok: true, trainingId, status: newStatus };
  }

  // ── Matrix view ─────────────────────────────────────────────────────────

  async function getMatrix() {
    const { data: assignments, error: aErr } = await supabase
      .from('training_assignments')
      .select('*')
      .order('created_at', { ascending: false });
    if (aErr) {
      if (aErr.message.includes('does not exist')) return { assignments: [], completions: [], matrix: {} };
      throw aErr;
    }

    const { data: completions, error: cErr } = await supabase
      .from('training_completions')
      .select('*')
      .order('completed_at', { ascending: false });
    if (cErr && !cErr.message.includes('does not exist')) throw cErr;

    // Build matrix: user → training_id → status
    const matrix = {};
    (assignments || []).forEach(a => {
      if (!matrix[a.assigned_to]) matrix[a.assigned_to] = {};
      matrix[a.assigned_to][a.training_id] = {
        trainingId: a.training_id,
        title:      a.title,
        status:     a.status,
        dueDate:    a.due_date,
        sopCode:    a.sop_code,
        priority:   a.priority,
      };
    });

    return {
      assignments: assignments || [],
      completions: completions || [],
      matrix,
    };
  }

  // ── Compliance status ───────────────────────────────────────────────────

  async function getCompliance() {
    const { assignments } = await getMatrix();
    const now = new Date();

    const total     = assignments.length;
    const completed = assignments.filter(a => a.status === 'completed').length;
    const overdue   = assignments.filter(a => a.status !== 'completed' && a.due_date && new Date(a.due_date) < now).length;
    const pending   = assignments.filter(a => a.status === 'assigned').length;
    const failed    = assignments.filter(a => a.status === 'failed').length;

    // Per-user compliance
    const byUser = {};
    assignments.forEach(a => {
      if (!byUser[a.assigned_to]) byUser[a.assigned_to] = { total: 0, completed: 0, overdue: 0, role: a.assigned_role };
      byUser[a.assigned_to].total++;
      if (a.status === 'completed') byUser[a.assigned_to].completed++;
      if (a.status !== 'completed' && a.due_date && new Date(a.due_date) < now) byUser[a.assigned_to].overdue++;
    });

    // Per-SOP compliance
    const bySop = {};
    assignments.filter(a => a.sop_code).forEach(a => {
      if (!bySop[a.sop_code]) bySop[a.sop_code] = { total: 0, completed: 0 };
      bySop[a.sop_code].total++;
      if (a.status === 'completed') bySop[a.sop_code].completed++;
    });

    const complianceRate = total > 0 ? Math.round((completed / total) * 100) : 100;

    return { total, completed, pending, overdue, failed, complianceRate, byUser, bySop };
  }

  // ── AI: auto-generate requirements from SOP change ──────────────────────

  async function generateRequirementsFromSopChange({ sopCode, changeDescription }) {
    if (!anthropic) return { requirements: [] };

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are a pharma training compliance expert. An SOP has been revised.

SOP Code: ${sopCode}
Change Description: ${changeDescription}

Generate a JSON array of training requirements that should be created as a result of this SOP change. Each item should have:
- title: concise training title
- description: what the trainee needs to learn
- roles: array of roles that need this training (from: operator, qa, msat, engineering, director)
- priority: "high", "normal", or "low"
- trainingType: "retraining" or "new"

Return ONLY valid JSON array, no markdown.`,
      }],
    });

    try {
      const text = msg.content[0].text.trim();
      const requirements = JSON.parse(text);
      return { requirements };
    } catch {
      return { requirements: [], raw: msg.content[0].text };
    }
  }

  // ── AI: training gap identification ─────────────────────────────────────

  async function identifyGaps() {
    const compliance = await getCompliance();
    if (!anthropic) return { gaps: [], compliance };

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are a pharma training compliance expert. Analyse this compliance data and identify training gaps.

Compliance Data:
${JSON.stringify(compliance, null, 2)}

Return a JSON array of gap objects, each with:
- area: the area/role with the gap
- description: what the gap is
- risk: "high", "medium", or "low"
- recommendation: suggested action

Return ONLY valid JSON array, no markdown.`,
      }],
    });

    try {
      const text = msg.content[0].text.trim();
      const gaps = JSON.parse(text);
      return { gaps, compliance };
    } catch {
      return { gaps: [], compliance, raw: msg.content[0].text };
    }
  }

  return {
    listAssignments,
    createAssignment,
    completeTraining,
    getMatrix,
    getCompliance,
    generateRequirementsFromSopChange,
    identifyGaps,
  };
}

module.exports = makeTrainingMatrixService;
