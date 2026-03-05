'use strict';

/**
 * routes/us-media-prep.js — Thin HTTP layer for Media & Buffer Prep.
 *
 * All business logic lives in services/us-media-prep.service.js.
 * This file handles validation, HTTP status codes, and response shaping.
 */

module.exports = function(app, { auth, mediaPrepService }) {
  const { requireAuth, requireRole } = auth;

  // ── List records ──────────────────────────────────────────────────────────

  app.get('/media-prep', requireAuth, async (req, res) => {
    try {
      const data = await mediaPrepService.listRecords({
        status:     req.query.status,
        recipeType: req.query.type,
      });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Get single record ─────────────────────────────────────────────────────

  app.get('/media-prep/:id', requireAuth, async (req, res) => {
    try {
      const data = await mediaPrepService.getRecord(req.params.id);
      res.json(data);
    } catch (err) {
      const code = err.statusCode || 500;
      res.status(code).json({ error: err.message });
    }
  });

  // ── Create record ─────────────────────────────────────────────────────────

  app.post('/media-prep', requireRole('operator', 'qa', 'admin'), async (req, res) => {
    const {
      recipeName, recipeType, batchId, components, phTarget,
      filterType, filterLot, holdTimeHours, volumeLitres, temperatureC, notes,
    } = req.body;
    try {
      const result = await mediaPrepService.createRecord({
        recipeName, recipeType, batchId, components, phTarget,
        filterType, filterLot, holdTimeHours, volumeLitres, temperatureC, notes,
        userId:   req.user?.name || req.body.userId || 'unknown',
        userRole: req.user?.role || req.body.userRole || 'operator',
        req,
      });
      res.json(result);
    } catch (err) {
      const code = err.statusCode || 500;
      if (code < 500) return res.status(code).json({ error: err.message });
      if (err.message && err.message.includes('does not exist')) {
        return res.status(400).json({ error: 'media_buffer_records table does not exist. Run the setup SQL.' });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // ── Update record ─────────────────────────────────────────────────────────

  app.patch('/media-prep/:id', requireRole('operator', 'qa', 'admin'), async (req, res) => {
    const { updates, reason } = req.body;
    try {
      const result = await mediaPrepService.updateRecord({
        recordId: req.params.id,
        updates:  updates || {},
        userId:   req.user?.name || req.body.userId || 'unknown',
        userRole: req.user?.role || req.body.userRole || 'operator',
        reason,
        req,
      });
      res.json(result);
    } catch (err) {
      const code = err.statusCode || 500;
      if (code < 500) return res.status(code).json({ error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // ── AI compliance verification ────────────────────────────────────────────

  app.post('/media-prep/:id/verify', requireRole('operator', 'qa', 'admin'), async (req, res) => {
    try {
      const result = await mediaPrepService.verifyCompliance(req.params.id, {
        userId:   req.user?.name || req.body.userId || 'unknown',
        userRole: req.user?.role || req.body.userRole || 'operator',
        req,
      });
      res.json(result);
    } catch (err) {
      const code = err.statusCode || 500;
      if (code < 500) return res.status(code).json({ error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // ── Hold time alerts ──────────────────────────────────────────────────────

  app.get('/media-prep-hold-times', requireAuth, async (req, res) => {
    try {
      const data = await mediaPrepService.checkHoldTimes();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
};
