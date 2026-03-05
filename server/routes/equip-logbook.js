'use strict';

/**
 * routes/equip-logbook.js — Thin HTTP layer for equipment logbook.
 *
 * All business logic lives in services/equip-logbook.service.js.
 * This file handles validation, HTTP status codes, and response shaping.
 */

module.exports = function (app, { auth, equipLogbookService }) {
  const { requireAuth, requireRole } = auth;

  // ── Equipment CRUD ────────────────────────────────────────────────────

  app.get('/equipment', requireAuth, async (req, res) => {
    try {
      const data = await equipLogbookService.listEquipment();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/equipment/:id', requireAuth, async (req, res) => {
    try {
      const data = await equipLogbookService.getEquipment(req.params.id);
      if (!data) return res.status(404).json({ error: 'Equipment not found' });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/equipment', requireRole('operator', 'engineering', 'admin'), async (req, res) => {
    const { name, type, location, serialNumber, model, manufacturer, commissionedAt } = req.body;
    const userId = req.user ? req.user.name : 'unknown';
    const userRole = req.user ? req.user.role : 'unknown';
    try {
      const result = await equipLogbookService.createEquipment({
        name, type, location, serialNumber, model, manufacturer, commissionedAt,
        userId, userRole, req,
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

  app.patch('/equipment/:id', requireRole('operator', 'engineering', 'admin'), async (req, res) => {
    const { name, type, location, serialNumber, model, manufacturer, status, commissionedAt, reason } = req.body;
    const userId = req.user ? req.user.name : 'unknown';
    const userRole = req.user ? req.user.role : 'unknown';
    try {
      const result = await equipLogbookService.updateEquipment({
        equipId: req.params.id, name, type, location, serialNumber, model, manufacturer,
        status, commissionedAt, userId, userRole, reason, req,
      });
      res.json(result);
    } catch (err) {
      const code = err.statusCode || 500;
      if (code < 500) return res.status(code).json({ error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // ── Log Entries ───────────────────────────────────────────────────────

  app.post('/equipment/:id/log', requireRole('operator', 'engineering', 'admin'), async (req, res) => {
    const { entryType, title, description, performedAt, durationMin, status, alarmSeverity, esigUser, esigReason } = req.body;
    const performedBy = req.user ? req.user.name : 'unknown';
    const performedRole = req.user ? req.user.role : 'operator';
    try {
      const result = await equipLogbookService.createLogEntry({
        equipId: req.params.id, entryType, title, description,
        performedBy, performedRole, performedAt, durationMin, status,
        alarmSeverity, esigUser, esigReason, req,
      });
      res.json(result);
    } catch (err) {
      const code = err.statusCode || 500;
      if (code < 500) return res.status(code).json({ error: err.message });
      if (err.message && err.message.includes('does not exist')) {
        return res.status(400).json({ error: 'equipment_log_entries table does not exist. Run the setup SQL.' });
      }
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/equipment/:id/logs', requireAuth, async (req, res) => {
    try {
      const data = await equipLogbookService.listLogEntries(req.params.id, {
        entryType: req.query.type,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
      });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── AI Analysis ───────────────────────────────────────────────────────

  app.get('/equipment/:id/analyse', requireRole('operator', 'engineering', 'admin'), async (req, res) => {
    try {
      const data = await equipLogbookService.analyseEquipment(req.params.id);
      res.json(data);
    } catch (err) {
      const code = err.statusCode || 500;
      if (code < 500) return res.status(code).json({ error: err.message });
      res.status(500).json({ error: err.message });
    }
  });
};
