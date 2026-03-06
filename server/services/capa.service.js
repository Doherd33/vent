'use strict';

/**
 * services/capa.service.js
 *
 * Owns CAPA lifecycle and analytics:
 *   - Notification CRUD
 *   - CAPA tracking (create, update, list, get by ID)
 *   - Effectiveness verification
 *   - Dashboard stats
 *   - AI: similar CAPAs, preventive action suggestions, effectiveness prediction
 *   - Director dashboard analytics aggregation
 *
 * Routes should call these functions and handle only HTTP concerns.
 */

const ids = require('../lib/ids');
const parseClaudeJson = require('../lib/parse-claude-json');

// ── AI Prompt Templates ─────────────────────────────────────────────────────

const SIMILAR_CAPAS_PROMPT = (title, description, existingCapas) =>
`You are a pharmaceutical quality specialist reviewing CAPAs in a GMP biologics facility.

Given this new CAPA:
Title: ${title}
Description: ${description}

And these existing CAPAs:
${existingCapas}

Find the 3 most similar existing CAPAs. Consider root cause similarity, process area overlap, and corrective action similarity.

Return ONLY valid JSON (no markdown fences):
{
  "matches": [
    { "capa_id": "CAPA-XXXX", "title": "...", "similarity": "high|medium|low", "reasoning": "..." }
  ]
}`;

const PREVENTIVE_ACTIONS_PROMPT = (rootCause, description) =>
`You are a pharmaceutical quality specialist in a GMP biologics facility.

Given this root cause and CAPA description:
Root Cause Category: ${rootCause}
Description: ${description}

Suggest 3-5 preventive actions that would prevent recurrence. Each action should be specific, measurable, and implementable within a GMP environment. Consider 21 CFR Part 211 and EU GMP Annex 15 requirements.

Return ONLY valid JSON (no markdown fences):
{
  "actions": [
    { "action": "...", "category": "process|training|equipment|documentation|monitoring", "priority": "high|medium|low", "timeline": "immediate|short-term|long-term" }
  ]
}`;

const EFFECTIVENESS_PREDICTION_PROMPT = (capa) =>
`You are a pharmaceutical quality analyst evaluating CAPA effectiveness in a GMP biologics facility.

CAPA Details:
ID: ${capa.capa_id}
Title: ${capa.title}
Description: ${capa.description}
Type: ${capa.capa_type || 'corrective'}
Root Cause Category: ${capa.root_cause_category || 'not specified'}
Owner: ${capa.owner}
Evidence: ${capa.evidence || 'none provided'}
Days Open: ${Math.ceil((new Date(capa.closed_at || Date.now()) - new Date(capa.created_at)) / (1000 * 60 * 60 * 24))}

Based on the CAPA details, predict the likelihood that this CAPA will be effective in preventing recurrence.

Return ONLY valid JSON (no markdown fences):
{
  "prediction": "likely_effective|uncertain|likely_ineffective",
  "confidence": 0.85,
  "reasoning": "...",
  "recommendations": ["...", "..."]
}`;

function makeCapaService({ supabase, auditLog, anthropic }) {

  // ── Notifications ───────────────────────────────────────────────────────

  async function getNotifications(userId) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  async function markNotificationRead(id) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    if (error) throw error;
    return { ok: true };
  }

  async function markAllNotificationsRead(userId) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
    if (error) throw error;
    return { ok: true };
  }

  // ── CAPAs ───────────────────────────────────────────────────────────────

  async function getCapaById(capaId) {
    const { data, error } = await supabase
      .from('capas')
      .select('*')
      .eq('capa_id', capaId)
      .single();
    if (error) {
      if (error.message.includes('does not exist'))
        throw Object.assign(new Error('CAPA not found'), { statusCode: 404 });
      throw error;
    }
    if (!data) throw Object.assign(new Error('CAPA not found'), { statusCode: 404 });
    return data;
  }

  async function listCapas({ submissionRef, status, owner, capaType, overdue } = {}) {
    let query = supabase.from('capas').select('*');
    if (submissionRef) query = query.eq('submission_ref', submissionRef);
    if (status)        query = query.eq('status', status);
    if (owner)         query = query.eq('owner', owner);
    if (capaType)      query = query.eq('capa_type', capaType);
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    let results = data || [];

    if (overdue === 'true' || overdue === true) {
      const now = new Date();
      results = results.filter(c => c.status !== 'closed' && c.due_date && new Date(c.due_date) < now);
    }

    return results;
  }

  async function createCapa({ submissionRef, title, description, timing, timingLabel,
                              owner, ownerRole, dueDate, capaType, rootCauseCategory, req }) {
    if (!submissionRef || !title) {
      throw Object.assign(new Error('submissionRef and title are required'), { statusCode: 400 });
    }

    const capaId = ids.capaId();

    const { error } = await supabase.from('capas').insert({
      capa_id: capaId,
      submission_ref: submissionRef,
      title,
      description: description || '',
      timing: timing || 'short',
      timing_label: timingLabel || '',
      owner: owner || 'Unassigned',
      owner_role: ownerRole || '',
      due_date: dueDate || null,
      status: 'open',
      capa_type: capaType || 'corrective',
      root_cause_category: rootCauseCategory || null,
      effectiveness_status: 'pending',
      evidence: null,
      closed_by: null,
      closed_at: null,
    });
    if (error) throw error;

    await auditLog({
      userId: owner || 'system',
      userRole: ownerRole || 'system',
      action: 'capa_created',
      entityType: 'capa',
      entityId: capaId,
      after: { submissionRef, title, timing, owner, dueDate, capaType, rootCauseCategory },
      reason: `CAPA created from submission ${submissionRef}`,
      req,
    });

    return { ok: true, capaId };
  }

  async function updateCapa({ capaId, status, owner, ownerRole, evidence, dueDate, userId, reason, req }) {
    const { data: current, error: fetchErr } = await supabase
      .from('capas')
      .select('*')
      .eq('capa_id', capaId)
      .single();
    if (fetchErr || !current) {
      throw Object.assign(new Error('CAPA not found'), { statusCode: 404 });
    }

    const updates = { updated_at: new Date().toISOString() };
    if (status)   updates.status = status;
    if (owner)    updates.owner = owner;
    if (ownerRole) updates.owner_role = ownerRole;
    if (evidence) updates.evidence = evidence;
    if (dueDate)  updates.due_date = dueDate;
    if (status === 'closed') {
      updates.closed_by = userId || 'unknown';
      updates.closed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('capas')
      .update(updates)
      .eq('capa_id', capaId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'unknown',
      userRole: ownerRole || current.owner_role || 'unknown',
      action: 'capa_updated',
      entityType: 'capa',
      entityId: capaId,
      before: { status: current.status, owner: current.owner },
      after: updates,
      reason: reason || `CAPA updated: ${Object.keys(updates).join(', ')}`,
      req,
    });

    return { ok: true, capaId, updates };
  }

  // ── Effectiveness Verification ─────────────────────────────────────────

  async function verifyEffectiveness({ capaId, status, notes, userId, userRole, req }) {
    const current = await getCapaById(capaId);

    if (current.status !== 'closed') {
      throw Object.assign(new Error('CAPA must be closed before effectiveness verification'), { statusCode: 400 });
    }

    const validStatuses = ['verified_effective', 'verified_ineffective', 'not_applicable'];
    if (!validStatuses.includes(status)) {
      throw Object.assign(new Error('Invalid effectiveness status: ' + status), { statusCode: 400 });
    }

    const updates = {
      effectiveness_status: status,
      effectiveness_notes: notes || '',
      effectiveness_check_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('capas').update(updates).eq('capa_id', capaId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'unknown',
      userRole: userRole || 'unknown',
      action: 'capa_effectiveness_verified',
      entityType: 'capa',
      entityId: capaId,
      before: { effectiveness_status: current.effectiveness_status },
      after: updates,
      reason: `Effectiveness verified as ${status}`,
      req,
    });

    return { ok: true, capaId, effectivenessStatus: status };
  }

  // ── Dashboard Stats ────────────────────────────────────────────────────

  async function getDashboardStats() {
    const { data, error } = await supabase
      .from('capas').select('*').order('created_at', { ascending: false });
    if (error) {
      if (error.message.includes('does not exist')) return { total: 0 };
      throw error;
    }
    const all = data || [];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const open = all.filter(c => c.status === 'open').length;
    const inProgress = all.filter(c => c.status === 'in_progress').length;
    const pendingVerification = all.filter(c => c.status === 'pending_verification').length;
    const overdue = all.filter(c => c.status !== 'closed' && c.due_date && new Date(c.due_date) < now).length;
    const closedThisMonth = all.filter(c => c.status === 'closed' && c.closed_at && new Date(c.closed_at) >= monthStart).length;

    const verified = all.filter(c => c.effectiveness_status && c.effectiveness_status !== 'pending');
    const effective = verified.filter(c => c.effectiveness_status === 'verified_effective').length;
    const effectivenessRate = verified.length > 0 ? Math.round((effective / verified.length) * 100) : null;

    let totalDays = 0, closedCount = 0;
    all.forEach(c => {
      if (c.status === 'closed' && c.closed_at) {
        totalDays += (new Date(c.closed_at) - new Date(c.created_at)) / (1000 * 60 * 60 * 24);
        closedCount++;
      }
    });
    const avgDaysToClose = closedCount > 0 ? Math.round(totalDays / closedCount * 10) / 10 : null;

    return {
      total: all.length, open, inProgress, pendingVerification, overdue,
      closedThisMonth, effectivenessRate, avgDaysToClose,
      byType: {
        corrective: all.filter(c => c.capa_type === 'corrective').length,
        preventive: all.filter(c => c.capa_type === 'preventive').length,
      },
    };
  }

  // ── AI Features ────────────────────────────────────────────────────────

  async function suggestSimilarCapas({ title, description }) {
    const existing = await listCapas({});
    const capaContext = existing.slice(0, 20).map(c =>
      `${c.capa_id}: ${c.title} (${c.status}, ${c.capa_type || 'corrective'})`
    ).join('\n');

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: SIMILAR_CAPAS_PROMPT(title, description, capaContext) }],
    });
    return parseClaudeJson(message.content[0].text);
  }

  async function suggestPreventiveActions({ rootCause, description }) {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: PREVENTIVE_ACTIONS_PROMPT(rootCause, description) }],
    });
    return parseClaudeJson(message.content[0].text);
  }

  async function predictEffectiveness(capaId) {
    const capa = await getCapaById(capaId);
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{ role: 'user', content: EFFECTIVENESS_PREDICTION_PROMPT(capa) }],
    });
    return parseClaudeJson(message.content[0].text);
  }

  // ── Analytics ───────────────────────────────────────────────────────────

  async function getAnalytics() {
    // Fetch submissions
    const { data: subs, error: subErr } = await supabase
      .from('submissions')
      .select('ref_code, process_area, priority, status, created_at, structured')
      .order('created_at', { ascending: false });
    if (subErr) throw subErr;

    // Fetch CAPAs
    let capas = [];
    const { data: capaData, error: capaErr } = await supabase
      .from('capas')
      .select('*')
      .order('created_at', { ascending: false });
    if (!capaErr && capaData) capas = capaData;

    const now         = new Date();
    const submissions = subs || [];

    const total      = submissions.length;
    const byPriority = { High: 0, Medium: 0, Low: 0 };
    const byStatus   = {};
    const byArea     = {};
    const byMonth    = {};

    submissions.forEach(s => {
      byPriority[s.priority] = (byPriority[s.priority] || 0) + 1;
      const st = s.status || 'new';
      byStatus[st] = (byStatus[st] || 0) + 1;
      byArea[s.process_area] = (byArea[s.process_area] || 0) + 1;
      const month = s.created_at.slice(0, 7);
      byMonth[month] = (byMonth[month] || 0) + 1;
    });

    const openStatuses = ['new', 'acknowledged', 'under_review', 'corrective_action'];
    const openCount  = submissions.filter(s => openStatuses.includes(s.status || 'new')).length;
    const closedCount = submissions.filter(s => ['closed', 'rejected'].includes(s.status)).length;
    const inReview   = submissions.filter(s => ['qa_approved', 'director_signoff'].includes(s.status)).length;

    const openCapas    = capas.filter(c => c.status === 'open' || c.status === 'in_progress').length;
    const overdueCapas = capas.filter(c => c.status !== 'closed' && c.due_date && new Date(c.due_date) < now).length;
    const closedCapas  = capas.filter(c => c.status === 'closed').length;

    const weekAgo     = new Date(now - 7 * 86400000);
    const twoWeeksAgo = new Date(now - 14 * 86400000);
    const thisWeek    = submissions.filter(s => new Date(s.created_at) >= weekAgo).length;
    const lastWeek    = submissions.filter(s => { const d = new Date(s.created_at); return d >= twoWeeksAgo && d < weekAgo; }).length;
    const trend       = lastWeek ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : 0;

    return {
      total, byPriority, byStatus, byArea, byMonth,
      openCount, closedCount, inReview,
      capas: { total: capas.length, open: openCapas, overdue: overdueCapas, closed: closedCapas },
      trend: { thisWeek, lastWeek, percentChange: trend },
      recentSubmissions: submissions.slice(0, 10).map(s => ({
        ref: s.ref_code, area: s.process_area, priority: s.priority,
        status: s.status || 'new', date: s.created_at,
      })),
      recentCapas: capas.slice(0, 10),
    };
  }

  return {
    getNotifications, markNotificationRead, markAllNotificationsRead,
    listCapas, createCapa, updateCapa, getCapaById,
    verifyEffectiveness, getDashboardStats,
    suggestSimilarCapas, suggestPreventiveActions, predictEffectiveness,
    getAnalytics,
  };
}

module.exports = makeCapaService;
