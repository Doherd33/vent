'use strict';

/**
 * routes/deviation-mgr.js — Thin HTTP layer for deviation management.
 *
 * All business logic lives in services/deviation-mgr.service.js.
 */

module.exports = function(app, { auth, deviationService }) {
  const { requireAuth, requireRole } = auth;

  // ── POST /deviations — Create new deviation ─────────────────
  app.post('/deviations',
    requireRole('qa', 'operator', 'msat', 'engineering'),
    async (req, res) => {
      const { title, description, source, sourceType, processArea,
              equipmentRef, owner, ownerRole, assignedTo, dueDate } = req.body;
      try {
        const result = await deviationService.createDeviation({
          title, description, source, sourceType, processArea, equipmentRef,
          reportedBy: req.user.name || req.user.id,
          owner, ownerRole, assignedTo, dueDate, req,
        });
        res.json(result);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        if (err.message && err.message.includes('does not exist')) {
          return res.status(400).json({ error: 'deviations table does not exist. Run the setup SQL.' });
        }
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /deviations — List with optional filters ────────────
  app.get('/deviations',
    requireRole('qa', 'operator', 'msat', 'engineering'),
    async (req, res) => {
      try {
        const { severity, status, owner, processArea } = req.query;
        const data = await deviationService.listDeviations({ severity, status, owner, processArea });
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /deviations/stats — Dashboard statistics ────────────
  // NOTE: Must be before /:devId to avoid matching "stats" as a devId
  app.get('/deviations/stats',
    requireRole('qa', 'operator', 'msat', 'engineering'),
    async (req, res) => {
      try {
        const data = await deviationService.getStats();
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /deviations/:devId — Single deviation detail ────────
  app.get('/deviations/:devId',
    requireRole('qa', 'operator', 'msat', 'engineering'),
    async (req, res) => {
      try {
        const data = await deviationService.getDeviation(req.params.devId);
        res.json(data);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  // ── PUT /deviations/:devId — Update deviation ──────────────
  app.put('/deviations/:devId',
    requireRole('qa', 'msat', 'engineering'),
    async (req, res) => {
      const { title, description, severity, status, source, sourceType,
              processArea, equipmentRef, rootCause, rootCauseCategory,
              capaId, owner, assignedTo, ownerRole, dueDate,
              fiveWhy, ishikawa, reason } = req.body;
      try {
        const result = await deviationService.updateDeviation({
          devId: req.params.devId,
          title, description, severity, status, source, sourceType,
          processArea, equipmentRef, rootCause, rootCauseCategory,
          capaId, owner, assignedTo, ownerRole, dueDate,
          fiveWhy, ishikawa,
          userId: req.user.name || req.user.id,
          reason, req,
        });
        res.json(result);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  // ── POST /deviations/:devId/escalate — Raise severity ──────
  app.post('/deviations/:devId/escalate',
    requireRole('qa', 'msat', 'engineering'),
    async (req, res) => {
      const { newSeverity, reason } = req.body;
      try {
        const result = await deviationService.escalateDeviation({
          devId: req.params.devId,
          newSeverity,
          reason,
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

  // ── POST /deviations/:devId/investigate — AI investigation ──
  app.post('/deviations/:devId/investigate',
    requireRole('qa', 'msat', 'engineering'),
    async (req, res) => {
      const { mode } = req.body;
      try {
        const result = await deviationService.aiInvestigate({
          devId: req.params.devId,
          mode: mode || 'full',
        });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
};
