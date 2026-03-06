'use strict';

/**
 * routes/cleaning-records.js — Thin HTTP layer for cleaning record management.
 *
 * All business logic lives in services/cleaning-records.service.js.
 * This file handles validation, HTTP status codes, and response shaping.
 */

module.exports = function (app, { auth, cleaningRecordsService }) {
  const { requireAuth, requireRole } = auth;

  // ── POST /cleaning — Create new cleaning record (start cleaning) ────
  app.post('/cleaning',
    requireRole('operator', 'engineering', 'admin'),
    async (req, res) => {
      const { equipId, cleaningType, cleaningAgent, agentLotNumber,
              agentConcentration, holdTimeHours } = req.body;
      const operator = req.user ? req.user.name : 'unknown';
      const userId = req.user ? req.user.name : 'unknown';
      const userRole = req.user ? req.user.role : 'operator';
      try {
        const result = await cleaningRecordsService.createCleaningRecord({
          equipId, cleaningType, cleaningAgent, agentLotNumber,
          agentConcentration, holdTimeHours, operator, userId, userRole, req,
        });
        res.json(result);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        if (err.message && err.message.includes('does not exist')) {
          return res.status(400).json({ error: 'cleaning_records table does not exist. Run the setup SQL.' });
        }
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /cleaning — List all cleaning records ────────────────────────
  app.get('/cleaning',
    requireAuth,
    async (req, res) => {
      try {
        const { status, equipId, from, to } = req.query;
        const data = await cleaningRecordsService.listCleaningRecords({ status, equipId, from, to });
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /cleaning/hold-times — Active hold times (must be before /:id routes) ──
  app.get('/cleaning/hold-times',
    requireAuth,
    async (req, res) => {
      try {
        const data = await cleaningRecordsService.getHoldTimes();
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /cleaning/stats — Dashboard statistics ───────────────────────
  app.get('/cleaning/stats',
    requireAuth,
    async (req, res) => {
      try {
        const data = await cleaningRecordsService.getStats();
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /cleaning/ai/hold-alerts — AI hold time alerts ───────────────
  app.get('/cleaning/ai/hold-alerts',
    requireRole('operator', 'engineering', 'qa', 'admin'),
    async (req, res) => {
      try {
        const data = await cleaningRecordsService.aiHoldTimeAlerts();
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /cleaning/ai/compliance — AI compliance trend analysis ───────
  app.get('/cleaning/ai/compliance',
    requireRole('operator', 'engineering', 'qa', 'admin'),
    async (req, res) => {
      try {
        const data = await cleaningRecordsService.aiComplianceTrends();
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /cleaning/equip/:equipId — Cleaning history for equipment ────
  app.get('/cleaning/equip/:equipId',
    requireAuth,
    async (req, res) => {
      try {
        const data = await cleaningRecordsService.getCleaningByEquipment(req.params.equipId);
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /cleaning/:id/detail — Single cleaning record detail ─────────
  app.get('/cleaning/:id/detail',
    requireAuth,
    async (req, res) => {
      try {
        const data = await cleaningRecordsService.getCleaningRecord(req.params.id);
        res.json(data);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  // ── PUT /cleaning/:id — Update cleaning record ──────────────────────
  app.put('/cleaning/:id',
    requireRole('operator', 'engineering', 'admin'),
    async (req, res) => {
      const { cleaningAgent, agentLotNumber, agentConcentration,
              rinseConductivity, rinseConductivityLimit, visualInspection,
              holdTimeHours, notes, reason } = req.body;
      const userId = req.user ? req.user.name : 'unknown';
      const userRole = req.user ? req.user.role : 'operator';
      try {
        const result = await cleaningRecordsService.updateCleaningRecord({
          cleaningId: req.params.id,
          cleaningAgent, agentLotNumber, agentConcentration,
          rinseConductivity, rinseConductivityLimit, visualInspection,
          holdTimeHours, notes, userId, userRole, reason, req,
        });
        res.json(result);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  // ── POST /cleaning/:id/complete — Mark cleaning complete, start hold time ──
  app.post('/cleaning/:id/complete',
    requireRole('operator', 'engineering', 'admin'),
    async (req, res) => {
      const { rinseConductivity, visualInspection, notes } = req.body;
      const userId = req.user ? req.user.name : 'unknown';
      const userRole = req.user ? req.user.role : 'operator';
      try {
        const result = await cleaningRecordsService.completeCleaningRecord({
          cleaningId: req.params.id,
          rinseConductivity, visualInspection, notes,
          userId, userRole, req,
        });
        res.json(result);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  // ── POST /cleaning/:id/verify — Second-person verification ──────────
  app.post('/cleaning/:id/verify',
    requireRole('operator', 'engineering', 'qa', 'admin'),
    async (req, res) => {
      const verifier = req.user ? req.user.name : 'unknown';
      const userId = req.user ? req.user.name : 'unknown';
      const userRole = req.user ? req.user.role : 'operator';
      try {
        const result = await cleaningRecordsService.verifyCleaningRecord({
          cleaningId: req.params.id,
          verifier, userId, userRole, req,
        });
        res.json(result);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });
};
