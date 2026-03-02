'use strict';

/**
 * services/capa.service.js
 *
 * Owns CAPA lifecycle and analytics:
 *   - Notification CRUD
 *   - CAPA tracking (create, update, list)
 *   - Director dashboard analytics aggregation
 *
 * Routes should call these functions and handle only HTTP concerns.
 */

const ids = require('../lib/ids');

function makeCapaService({ supabase, auditLog }) {

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

  async function listCapas(submissionRef) {
    const query = supabase.from('capas').select('*');
    if (submissionRef) {
      query.eq('submission_ref', submissionRef).order('created_at', { ascending: true });
    } else {
      query.order('created_at', { ascending: false });
    }
    const { data, error } = await query;
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  async function createCapa({ submissionRef, title, description, timing, timingLabel, owner, ownerRole, dueDate, req }) {
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
      after: { submissionRef, title, timing, owner, dueDate },
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
    listCapas, createCapa, updateCapa,
    getAnalytics,
  };
}

module.exports = makeCapaService;
