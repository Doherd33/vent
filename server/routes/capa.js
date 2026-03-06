'use strict';

/**
 * routes/capa.js — Thin HTTP layer for notifications, CAPAs, and analytics.
 *
 * All business logic lives in services/capa.service.js.
 * This file handles validation, HTTP status codes, and response shaping.
 */

module.exports = function(app, { auth, capaService }) {
  const { requireAuth, requireRole } = auth;

  // ── Notifications ───────────────────────────────────────────────────────

  app.get('/notifications/:userId', requireAuth, async (req, res) => {
    try {
      const data = await capaService.getNotifications(req.params.userId);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch('/notifications/:id/read', requireAuth, async (req, res) => {
    try {
      const result = await capaService.markNotificationRead(req.params.id);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/notifications/read-all', requireAuth, async (req, res) => {
    const { userId } = req.body;
    try {
      const result = await capaService.markAllNotificationsRead(userId);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── CAPA Tracking ──────────────────────────────────────────────────────

  // List CAPAs (with optional query filters)
  app.get('/capas', requireAuth, async (req, res) => {
    try {
      const { submissionRef, status, owner, type, overdue } = req.query;
      const data = await capaService.listCapas({ submissionRef, status, owner, capaType: type, overdue });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Dashboard stats (static path — must be before :capaId)
  app.get('/capas/stats', requireRole('qa', 'director', 'admin'), async (req, res) => {
    try {
      const data = await capaService.getDashboardStats();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // AI: suggest similar CAPAs (static path — must be before :capaId)
  app.post('/capas/suggest-similar', requireRole('qa', 'director', 'admin'), async (req, res) => {
    const { title, description } = req.body;
    try {
      const result = await capaService.suggestSimilarCapas({ title, description });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get single CAPA by ID
  app.get('/capas/:capaId', requireAuth, async (req, res) => {
    try {
      const data = await capaService.getCapaById(req.params.capaId);
      res.json(data);
    } catch (err) {
      const code = err.statusCode || 500;
      if (code < 500) return res.status(code).json({ error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // Create CAPA
  app.post('/capas', requireRole('qa', 'director', 'admin'), async (req, res) => {
    const { submissionRef, title, description, timing, timingLabel,
            owner, ownerRole, dueDate, capaType, rootCauseCategory } = req.body;
    try {
      const result = await capaService.createCapa({
        submissionRef, title, description, timing, timingLabel,
        owner, ownerRole, dueDate, capaType, rootCauseCategory, req,
      });
      res.json(result);
    } catch (err) {
      const code = err.statusCode || 500;
      if (code < 500) return res.status(code).json({ error: err.message });
      if (err.message && err.message.includes('does not exist')) {
        return res.status(400).json({ error: 'capas table does not exist. Run the setup SQL.' });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // Update CAPA
  app.patch('/capas/:capaId', requireRole('qa', 'director', 'admin'), async (req, res) => {
    const { status, owner, ownerRole, evidence, dueDate, userId, reason } = req.body;
    try {
      const result = await capaService.updateCapa({
        capaId: req.params.capaId, status, owner, ownerRole, evidence, dueDate, userId, reason, req,
      });
      res.json(result);
    } catch (err) {
      const code = err.statusCode || 500;
      if (code < 500) return res.status(code).json({ error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // Verify effectiveness
  app.post('/capas/:capaId/verify-effectiveness', requireRole('qa', 'director', 'admin'), async (req, res) => {
    const { status, notes } = req.body;
    try {
      const result = await capaService.verifyEffectiveness({
        capaId: req.params.capaId,
        status, notes,
        userId: req.user.name || req.user.id,
        userRole: req.user.role,
        req,
      });
      res.json(result);
    } catch (err) {
      const code = err.statusCode || 500;
      if (code < 500) return res.status(code).json({ error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // AI: suggest preventive actions
  app.post('/capas/:capaId/suggest-preventive', requireRole('qa', 'director', 'admin'), async (req, res) => {
    const { rootCause, description } = req.body;
    try {
      const result = await capaService.suggestPreventiveActions({ rootCause, description });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // AI: predict effectiveness
  app.post('/capas/:capaId/predict-effectiveness', requireRole('qa', 'director', 'admin'), async (req, res) => {
    try {
      const result = await capaService.predictEffectiveness(req.params.capaId);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Analytics ───────────────────────────────────────────────────────────

  app.get('/analytics', requireRole('qa', 'director', 'admin'), async (req, res) => {
    try {
      const data = await capaService.getAnalytics();
      res.json(data);
    } catch (err) {
      console.error('Analytics error:', err);
      res.status(500).json({ error: err.message });
    }
  });
};
