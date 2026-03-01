'use strict';

module.exports = function(app, { supabase, auditLog, auth }) {
  const { requireAuth, requireRole } = auth;

  // ─── NOTIFICATIONS ──────────────────────────────────────────────────────────

  // GET /notifications/:userId — get notifications for a user
  app.get('/notifications/:userId', requireAuth, async (req, res) => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.params.userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      if (error.message.includes('does not exist')) return res.json([]);
      return res.status(500).json({ error: error.message });
    }
    res.json(data || []);
  });

  // PATCH /notifications/:id/read — mark a notification as read
  app.patch('/notifications/:id/read', requireAuth, async (req, res) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
  });

  // POST /notifications/read-all — mark all as read for a user
  app.post('/notifications/read-all', requireAuth, async (req, res) => {
    const { userId } = req.body;
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
  });

  // ─── CAPA TRACKING ──────────────────────────────────────────────────────────

  // GET /capas — list all CAPAs
  app.get('/capas', requireAuth, async (req, res) => {
    const { data, error } = await supabase
      .from('capas')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      if (error.message.includes('does not exist')) return res.json([]);
      return res.status(500).json({ error: error.message });
    }
    res.json(data || []);
  });

  // GET /capas/:submissionRef — list CAPAs for a specific submission
  app.get('/capas/:submissionRef', requireAuth, async (req, res) => {
    const { data, error } = await supabase
      .from('capas')
      .select('*')
      .eq('submission_ref', req.params.submissionRef)
      .order('created_at', { ascending: true });
    if (error) {
      if (error.message.includes('does not exist')) return res.json([]);
      return res.status(500).json({ error: error.message });
    }
    res.json(data || []);
  });

  // POST /capas — create a CAPA from a corrective action
  app.post('/capas', requireRole('qa', 'director', 'admin'), async (req, res) => {
    const { submissionRef, title, description, timing, timingLabel, owner, ownerRole, dueDate } = req.body;
    if (!submissionRef || !title) {
      return res.status(400).json({ error: 'submissionRef and title are required' });
    }

    const capaId = 'CAPA-' + Math.floor(1000 + Math.random() * 8999);

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
      closed_at: null
    });

    if (error) {
      if (error.message.includes('does not exist')) {
        return res.status(400).json({ error: 'capas table does not exist. Run the setup SQL.' });
      }
      return res.status(500).json({ error: error.message });
    }

    await auditLog({
      userId: owner || 'system',
      userRole: ownerRole || 'system',
      action: 'capa_created',
      entityType: 'capa',
      entityId: capaId,
      after: { submissionRef, title, timing, owner, dueDate },
      reason: `CAPA created from submission ${submissionRef}`,
      req
    });

    res.json({ ok: true, capaId });
  });

  // PATCH /capas/:capaId — update a CAPA (status, owner, evidence, etc.)
  app.patch('/capas/:capaId', requireRole('qa', 'director', 'admin'), async (req, res) => {
    const { status, owner, ownerRole, evidence, dueDate, userId, reason } = req.body;

    const { data: current, error: fetchErr } = await supabase
      .from('capas')
      .select('*')
      .eq('capa_id', req.params.capaId)
      .single();
    if (fetchErr || !current) return res.status(404).json({ error: 'CAPA not found' });

    const updates = {};
    if (status) updates.status = status;
    if (owner) updates.owner = owner;
    if (ownerRole) updates.owner_role = ownerRole;
    if (evidence) updates.evidence = evidence;
    if (dueDate) updates.due_date = dueDate;
    if (status === 'closed') {
      updates.closed_by = userId || 'unknown';
      updates.closed_at = new Date().toISOString();
    }
    updates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('capas')
      .update(updates)
      .eq('capa_id', req.params.capaId);
    if (error) return res.status(500).json({ error: error.message });

    await auditLog({
      userId: userId || 'unknown',
      userRole: ownerRole || current.owner_role || 'unknown',
      action: 'capa_updated',
      entityType: 'capa',
      entityId: req.params.capaId,
      before: { status: current.status, owner: current.owner },
      after: updates,
      reason: reason || `CAPA updated: ${Object.keys(updates).join(', ')}`,
      req
    });

    res.json({ ok: true, capaId: req.params.capaId, updates });
  });

  // ─── ANALYTICS / DASHBOARD ──────────────────────────────────────────────────

  // GET /analytics — aggregate stats for the director dashboard
  app.get('/analytics', requireRole('qa', 'director', 'admin'), async (req, res) => {
    try {
      // Fetch all submissions
      const { data: subs, error: subErr } = await supabase
        .from('submissions')
        .select('ref_code, process_area, priority, status, created_at, structured')
        .order('created_at', { ascending: false });

      if (subErr) return res.status(500).json({ error: subErr.message });

      // Fetch CAPAs
      let capas = [];
      const { data: capaData, error: capaErr } = await supabase
        .from('capas')
        .select('*')
        .order('created_at', { ascending: false });
      if (!capaErr && capaData) capas = capaData;

      const now = new Date();
      const submissions = subs || [];

      // Summary stats
      const total = submissions.length;
      const byPriority = { High: 0, Medium: 0, Low: 0 };
      const byStatus = {};
      const byArea = {};
      const byMonth = {};

      submissions.forEach(s => {
        byPriority[s.priority] = (byPriority[s.priority] || 0) + 1;
        const st = s.status || 'new';
        byStatus[st] = (byStatus[st] || 0) + 1;
        byArea[s.process_area] = (byArea[s.process_area] || 0) + 1;
        const month = s.created_at.slice(0, 7); // YYYY-MM
        byMonth[month] = (byMonth[month] || 0) + 1;
      });

      // Open vs closed
      const openStatuses = ['new', 'acknowledged', 'under_review', 'corrective_action'];
      const openCount = submissions.filter(s => openStatuses.includes(s.status || 'new')).length;
      const closedCount = submissions.filter(s => ['closed', 'rejected'].includes(s.status)).length;
      const inReview = submissions.filter(s => ['qa_approved', 'director_signoff'].includes(s.status)).length;

      // CAPA stats
      const openCapas = capas.filter(c => c.status === 'open' || c.status === 'in_progress').length;
      const overdueCapas = capas.filter(c => {
        if (c.status === 'closed') return false;
        return c.due_date && new Date(c.due_date) < now;
      }).length;
      const closedCapas = capas.filter(c => c.status === 'closed').length;

      // Recent trends (last 7 days vs previous 7 days)
      const weekAgo = new Date(now - 7 * 86400000);
      const twoWeeksAgo = new Date(now - 14 * 86400000);
      const thisWeek = submissions.filter(s => new Date(s.created_at) >= weekAgo).length;
      const lastWeek = submissions.filter(s => { const d = new Date(s.created_at); return d >= twoWeeksAgo && d < weekAgo; }).length;
      const trend = lastWeek ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : 0;

      res.json({
        total, byPriority, byStatus, byArea, byMonth,
        openCount, closedCount, inReview,
        capas: { total: capas.length, open: openCapas, overdue: overdueCapas, closed: closedCapas },
        trend: { thisWeek, lastWeek, percentChange: trend },
        recentSubmissions: submissions.slice(0, 10).map(s => ({
          ref: s.ref_code, area: s.process_area, priority: s.priority,
          status: s.status || 'new', date: s.created_at
        })),
        recentCapas: capas.slice(0, 10)
      });
    } catch (err) {
      console.error('Analytics error:', err);
      res.status(500).json({ error: err.message });
    }
  });
};
