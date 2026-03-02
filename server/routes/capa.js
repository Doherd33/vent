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

  app.get('/capas', requireAuth, async (req, res) => {
    try {
      const data = await capaService.listCapas();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/capas/:submissionRef', requireAuth, async (req, res) => {
    try {
      const data = await capaService.listCapas(req.params.submissionRef);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/capas', requireRole('qa', 'director', 'admin'), async (req, res) => {
    const { submissionRef, title, description, timing, timingLabel, owner, ownerRole, dueDate } = req.body;
    try {
      const result = await capaService.createCapa({
        submissionRef, title, description, timing, timingLabel, owner, ownerRole, dueDate, req,
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
