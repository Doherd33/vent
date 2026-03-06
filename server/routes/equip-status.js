'use strict';

/**
 * routes/equip-status.js — Thin HTTP layer for the Equipment Status Board.
 *
 * All business logic lives in services/equip-status.service.js.
 * This file handles validation, HTTP status codes, and response shaping.
 */

module.exports = function (app, { auth, equipStatusService }) {
  const { requireAuth, requireRole } = auth;

  // ── GET /equipment/status — all equipment with current status (board view) ──
  app.get('/equipment/status',
    requireAuth,
    async (req, res) => {
      try {
        const data = await equipStatusService.listByStatus();
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /equipment/status/summary — counts by status for dashboard ──────────
  // NOTE: Must be before /:id/status-history to avoid matching "summary" as an id
  app.get('/equipment/status/summary',
    requireAuth,
    async (req, res) => {
      try {
        const data = await equipStatusService.getSummary();
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── POST /equipment/status/ai-analysis — AI capacity planning ───────────────
  app.post('/equipment/status/ai-analysis',
    requireRole('operator', 'engineering', 'qa', 'admin'),
    async (req, res) => {
      try {
        const data = await equipStatusService.aiCapacityAnalysis();
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── PUT /equipment/:id/status — update equipment status ─────────────────────
  app.put('/equipment/:id/status',
    requireRole('operator', 'engineering', 'qa', 'admin'),
    async (req, res) => {
      const { status, reason, expectedDuration } = req.body;
      const userId = req.user ? req.user.name : 'unknown';
      const userRole = req.user ? req.user.role : 'unknown';
      try {
        const result = await equipStatusService.changeStatus({
          equipId: req.params.id,
          newStatus: status,
          reason,
          expectedDuration,
          userId,
          userRole,
          req,
        });
        res.json(result);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        if (err.message && err.message.includes('does not exist')) {
          return res.status(400).json({ error: 'equipment table does not exist. Run the setup SQL.' });
        }
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /equipment/:id/status-history — status change history ───────────────
  app.get('/equipment/:id/status-history',
    requireAuth,
    async (req, res) => {
      try {
        const data = await equipStatusService.getStatusHistory(req.params.id, {
          limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
        });
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
};
