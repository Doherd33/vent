'use strict';

/**
 * routes/inoc-incubator.js — Thin HTTP layer for incubator logbook.
 *
 * All business logic lives in services/inoc-incubator.service.js.
 * This file handles validation, HTTP status codes, and response shaping.
 */

module.exports = function (app, { auth, incubatorService }) {
  const { requireAuth, requireRole } = auth;

  // ── Incubator CRUD ──────────────────────────────────────────────────────

  app.get('/inoc/incubators', requireRole('operator', 'engineering', 'admin'), async (req, res) => {
    try {
      const data = await incubatorService.listIncubators();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/inoc/incubators', requireRole('engineering', 'admin'), async (req, res) => {
    const { name, model, serialNumber, location, co2Setpoint, tempSetpoint, humiditySetpoint } = req.body;
    const userId = req.user ? req.user.name : 'unknown';
    const userRole = req.user ? req.user.role : 'unknown';
    try {
      const result = await incubatorService.createIncubator({
        name, model, serialNumber, location, co2Setpoint, tempSetpoint, humiditySetpoint,
        userId, userRole, req,
      });
      res.json(result);
    } catch (err) {
      const code = err.statusCode || 500;
      if (code < 500) return res.status(code).json({ error: err.message });
      if (err.message && err.message.includes('does not exist')) {
        return res.status(400).json({ error: 'incubator_units table does not exist. Run the setup SQL.' });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // NOTE: /capacity must come before /:id to avoid Express matching "capacity" as an ID
  app.get('/inoc/incubators/capacity', requireRole('engineering', 'admin'), async (req, res) => {
    try {
      const data = await incubatorService.getCapacityPlanning();
      res.json(data);
    } catch (err) {
      const code = err.statusCode || 500;
      if (code < 500) return res.status(code).json({ error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/inoc/incubators/:id', requireRole('operator', 'engineering', 'admin'), async (req, res) => {
    try {
      const data = await incubatorService.getIncubator(req.params.id);
      if (!data) return res.status(404).json({ error: 'Incubator not found' });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch('/inoc/incubators/:id', requireRole('engineering', 'admin'), async (req, res) => {
    const { name, model, serialNumber, location, status, co2Setpoint, tempSetpoint, humiditySetpoint, reason } = req.body;
    const userId = req.user ? req.user.name : 'unknown';
    const userRole = req.user ? req.user.role : 'unknown';
    try {
      const result = await incubatorService.updateIncubator({
        incubatorId: req.params.id, name, model, serialNumber, location, status,
        co2Setpoint, tempSetpoint, humiditySetpoint, userId, userRole, reason, req,
      });
      res.json(result);
    } catch (err) {
      const code = err.statusCode || 500;
      if (code < 500) return res.status(code).json({ error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // ── Environmental Logs ──────────────────────────────────────────────────

  app.post('/inoc/incubators/:id/log', requireRole('operator', 'engineering', 'admin'), async (req, res) => {
    const { temperature, co2Level, humidity, doorOpenings, notes } = req.body;
    const recordedBy = req.user ? req.user.name : 'unknown';
    const recordedRole = req.user ? req.user.role : 'operator';
    try {
      const result = await incubatorService.addLog({
        incubatorId: req.params.id, temperature, co2Level, humidity, doorOpenings, notes,
        recordedBy, recordedRole, req,
      });
      res.json(result);
    } catch (err) {
      const code = err.statusCode || 500;
      if (code < 500) return res.status(code).json({ error: err.message });
      if (err.message && err.message.includes('does not exist')) {
        return res.status(400).json({ error: 'incubator_logs table does not exist. Run the setup SQL.' });
      }
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/inoc/incubators/:id/logs', requireRole('operator', 'engineering', 'admin'), async (req, res) => {
    try {
      const data = await incubatorService.listLogs(req.params.id, {
        from: req.query.from,
        to: req.query.to,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
      });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Alarms ──────────────────────────────────────────────────────────────

  app.post('/inoc/incubators/:id/alarm', requireRole('operator', 'engineering', 'admin'), async (req, res) => {
    const { alarmType, severity, notes } = req.body;
    try {
      const result = await incubatorService.addAlarm({
        incubatorId: req.params.id, alarmType, severity, notes, req,
      });
      res.json(result);
    } catch (err) {
      const code = err.statusCode || 500;
      if (code < 500) return res.status(code).json({ error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  app.patch('/inoc/incubators/:id/alarm/:alarmId/ack', requireRole('operator', 'engineering', 'admin'), async (req, res) => {
    const userId = req.user ? req.user.name : 'unknown';
    const userRole = req.user ? req.user.role : 'unknown';
    const { notes } = req.body;
    try {
      const result = await incubatorService.acknowledgeAlarm({
        alarmId: req.params.alarmId, userId, userRole, notes, req,
      });
      res.json(result);
    } catch (err) {
      const code = err.statusCode || 500;
      if (code < 500) return res.status(code).json({ error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  app.patch('/inoc/incubators/:id/alarm/:alarmId/resolve', requireRole('engineering', 'admin'), async (req, res) => {
    const userId = req.user ? req.user.name : 'unknown';
    const userRole = req.user ? req.user.role : 'unknown';
    const { notes } = req.body;
    try {
      const result = await incubatorService.resolveAlarm({
        alarmId: req.params.alarmId, userId, userRole, notes, req,
      });
      res.json(result);
    } catch (err) {
      const code = err.statusCode || 500;
      if (code < 500) return res.status(code).json({ error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/inoc/incubators/:id/alarms', requireRole('operator', 'engineering', 'admin'), async (req, res) => {
    try {
      const data = await incubatorService.listAlarms(req.params.id, {
        active: req.query.active === 'true',
      });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Calibration ─────────────────────────────────────────────────────────

  app.post('/inoc/incubators/:id/calibration', requireRole('engineering', 'admin'), async (req, res) => {
    const { calibrationDate, nextDue, tempOffset, co2Offset, humidityOffset, result, certificateRef, notes, esigUser, esigReason } = req.body;
    const calibratedBy = req.user ? req.user.name : 'unknown';
    const calibratedRole = req.user ? req.user.role : 'engineering';
    try {
      const r = await incubatorService.addCalibration({
        incubatorId: req.params.id, calibratedBy, calibratedRole,
        calibrationDate, nextDue, tempOffset, co2Offset, humidityOffset,
        result, certificateRef, notes, esigUser, esigReason, req,
      });
      res.json(r);
    } catch (err) {
      const code = err.statusCode || 500;
      if (code < 500) return res.status(code).json({ error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/inoc/incubators/:id/calibrations', requireRole('operator', 'engineering', 'admin'), async (req, res) => {
    try {
      const data = await incubatorService.listCalibrations(req.params.id);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Maintenance ─────────────────────────────────────────────────────────

  app.post('/inoc/incubators/:id/maintenance', requireRole('engineering', 'admin'), async (req, res) => {
    const { type, description, performedAt, nextDue, notes, esigUser, esigReason } = req.body;
    const performedBy = req.user ? req.user.name : 'unknown';
    const performedRole = req.user ? req.user.role : 'engineering';
    try {
      const r = await incubatorService.addMaintenance({
        incubatorId: req.params.id, type, description,
        performedBy, performedRole, performedAt, nextDue, notes,
        esigUser, esigReason, req,
      });
      res.json(r);
    } catch (err) {
      const code = err.statusCode || 500;
      if (code < 500) return res.status(code).json({ error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/inoc/incubators/:id/maintenance', requireRole('operator', 'engineering', 'admin'), async (req, res) => {
    try {
      const data = await incubatorService.listMaintenance(req.params.id);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── AI Analysis ─────────────────────────────────────────────────────────

  app.get('/inoc/incubators/:id/trending', requireRole('operator', 'engineering', 'admin'), async (req, res) => {
    try {
      const data = await incubatorService.getTrending(req.params.id);
      res.json(data);
    } catch (err) {
      const code = err.statusCode || 500;
      if (code < 500) return res.status(code).json({ error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/inoc/incubators/:id/alarm-patterns', requireRole('engineering', 'admin'), async (req, res) => {
    try {
      const data = await incubatorService.getAlarmPatterns(req.params.id);
      res.json(data);
    } catch (err) {
      const code = err.statusCode || 500;
      if (code < 500) return res.status(code).json({ error: err.message });
      res.status(500).json({ error: err.message });
    }
  });
};
