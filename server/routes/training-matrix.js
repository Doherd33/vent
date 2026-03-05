'use strict';

/**
 * routes/training-matrix.js — Thin HTTP layer for training matrix.
 *
 * All business logic lives in services/training-matrix.service.js.
 * This file handles validation, HTTP status codes, and response shaping.
 */

module.exports = function (app, { auth, trainingMatrixService }) {
  const { requireAuth, requireRole } = auth;

  // ── POST /training/assign — create a training assignment ──────────────
  app.post('/training/assign', requireRole('training', 'qa', 'admin'), async (req, res) => {
    const { title, description, sopCode, sopChangeKey, assignedTo, assignedRole, dueDate, priority, trainingType } = req.body;
    try {
      const result = await trainingMatrixService.createAssignment({
        title, description, sopCode, sopChangeKey,
        assignedTo, assignedRole,
        assignedBy: req.user ? req.user.name : 'unknown',
        dueDate, priority, trainingType, req,
      });
      res.json(result);
    } catch (err) {
      const code = err.statusCode || 500;
      if (code < 500) return res.status(code).json({ error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // ── GET /training/matrix — full matrix view ───────────────────────────
  app.get('/training/matrix', requireRole('training', 'qa', 'admin'), async (req, res) => {
    try {
      const data = await trainingMatrixService.getMatrix();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── GET /training/compliance — compliance dashboard data ──────────────
  app.get('/training/compliance', requireRole('training', 'qa', 'admin'), async (req, res) => {
    try {
      const data = await trainingMatrixService.getCompliance();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── PUT /training/:id/complete — record training completion ───────────
  app.put('/training/:id/complete', requireAuth, async (req, res) => {
    const { score, passed, evidence, assessor, assessorRole, notes, eSignature } = req.body;
    try {
      const result = await trainingMatrixService.completeTraining({
        trainingId:  req.params.id,
        completedBy: req.user ? req.user.name : 'unknown',
        score, passed, evidence, assessor, assessorRole, notes, eSignature, req,
      });
      res.json(result);
    } catch (err) {
      const code = err.statusCode || 500;
      if (code < 500) return res.status(code).json({ error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // ── GET /training/assignments — list with optional filters ────────────
  app.get('/training/assignments', requireAuth, async (req, res) => {
    try {
      const data = await trainingMatrixService.listAssignments({
        assignedTo: req.query.assignedTo,
        status:     req.query.status,
        sopCode:    req.query.sopCode,
      });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── POST /training/ai/requirements — auto-generate from SOP change ───
  app.post('/training/ai/requirements', requireRole('training', 'qa', 'admin'), async (req, res) => {
    const { sopCode, changeDescription } = req.body;
    if (!sopCode || !changeDescription) {
      return res.status(400).json({ error: 'sopCode and changeDescription are required' });
    }
    try {
      const data = await trainingMatrixService.generateRequirementsFromSopChange({ sopCode, changeDescription });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── GET /training/ai/gaps — identify training gaps ────────────────────
  app.get('/training/ai/gaps', requireRole('training', 'qa', 'admin'), async (req, res) => {
    try {
      const data = await trainingMatrixService.identifyGaps();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
};
