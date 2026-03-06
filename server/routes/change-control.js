'use strict';

/**
 * routes/change-control.js — Thin HTTP layer for change control management.
 *
 * All business logic lives in services/change-control.service.js.
 */

module.exports = function(app, { auth, changeControlService }) {
  const { requireAuth, requireRole } = auth;

  // ── POST /change-controls — Create new change control ─────────
  app.post('/change-controls',
    requireRole('qa', 'regulatory', 'engineering', 'msat', 'production', 'admin'),
    async (req, res) => {
      try {
        const result = await changeControlService.create({
          ...req.body,
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

  // ── GET /change-controls/stats — Dashboard statistics ─────────
  app.get('/change-controls/stats',
    requireAuth,
    async (req, res) => {
      try {
        const data = await changeControlService.getStats();
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /change-controls/overdue — Overdue changes ────────────
  app.get('/change-controls/overdue',
    requireAuth,
    async (req, res) => {
      try {
        const data = await changeControlService.getOverdue();
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /change-controls — List with filters ──────────────────
  app.get('/change-controls',
    requireAuth,
    async (req, res) => {
      try {
        const data = await changeControlService.list(req.query);
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /change-controls/:ccId — Single change control detail ─
  app.get('/change-controls/:ccId',
    requireAuth,
    async (req, res) => {
      try {
        const data = await changeControlService.getById(req.params.ccId);
        res.json(data);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  // ── PUT /change-controls/:ccId — Update change control ────────
  app.put('/change-controls/:ccId',
    requireRole('qa', 'regulatory', 'engineering', 'msat', 'production', 'admin'),
    async (req, res) => {
      try {
        const result = await changeControlService.update({
          ccId: req.params.ccId,
          updates: req.body,
          userId: req.user.name || req.user.id,
          userRole: req.user.role,
          reason: req.body.reason,
          req,
        });
        res.json(result);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  // ── POST /change-controls/:ccId/submit — Submit for assessment ─
  app.post('/change-controls/:ccId/submit',
    requireRole('qa', 'regulatory', 'engineering', 'msat', 'production', 'admin'),
    async (req, res) => {
      try {
        const result = await changeControlService.submit({
          ccId: req.params.ccId,
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

  // ── POST /change-controls/:ccId/review — Move to under-review ─
  app.post('/change-controls/:ccId/review',
    requireRole('qa', 'admin'),
    async (req, res) => {
      try {
        const result = await changeControlService.moveToReview({
          ccId: req.params.ccId,
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

  // ── POST /change-controls/:ccId/approve — Record approval ─────
  app.post('/change-controls/:ccId/approve',
    requireRole('qa', 'regulatory', 'director', 'admin'),
    async (req, res) => {
      try {
        const { approver, approverRole, approvalTier, decision, signatureMeaning, comments } = req.body;
        const result = await changeControlService.approve({
          ccId: req.params.ccId,
          approver: approver || req.user.name || req.user.id,
          approverRole: approverRole || req.user.role,
          approvalTier: approvalTier || 1,
          decision,
          signatureMeaning,
          comments,
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

  // ── POST /change-controls/:ccId/implement — Start implementation
  app.post('/change-controls/:ccId/implement',
    requireRole('qa', 'admin'),
    async (req, res) => {
      try {
        const result = await changeControlService.startImplementation({
          ccId: req.params.ccId,
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

  // ── POST /change-controls/:ccId/close — Close with effectiveness
  app.post('/change-controls/:ccId/close',
    requireRole('qa', 'director', 'admin'),
    async (req, res) => {
      try {
        const { closureNotes, effectivenessResult, effectivenessCheck } = req.body;
        const result = await changeControlService.close({
          ccId: req.params.ccId,
          closureNotes,
          effectivenessResult,
          effectivenessCheck,
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

  // ── POST /change-controls/:ccId/impact — Add impact assessment ─
  app.post('/change-controls/:ccId/impact',
    requireRole('qa', 'qc', 'regulatory', 'engineering', 'msat', 'production', 'validation', 'facilities', 'ehs', 'admin'),
    async (req, res) => {
      try {
        const result = await changeControlService.addImpact({
          ccId: req.params.ccId,
          ...req.body,
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

  // ── GET /change-controls/:ccId/impacts — List impact assessments
  app.get('/change-controls/:ccId/impacts',
    requireAuth,
    async (req, res) => {
      try {
        const data = await changeControlService.listImpacts(req.params.ccId);
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /change-controls/:ccId/approvals — List approvals ──────
  app.get('/change-controls/:ccId/approvals',
    requireAuth,
    async (req, res) => {
      try {
        const data = await changeControlService.listApprovals(req.params.ccId);
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── POST /change-controls/:ccId/tasks — Add implementation task ─
  app.post('/change-controls/:ccId/tasks',
    requireRole('qa', 'engineering', 'msat', 'production', 'admin'),
    async (req, res) => {
      try {
        const result = await changeControlService.addTask({
          ccId: req.params.ccId,
          ...req.body,
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

  // ── GET /change-controls/:ccId/tasks — List tasks ──────────────
  app.get('/change-controls/:ccId/tasks',
    requireAuth,
    async (req, res) => {
      try {
        const data = await changeControlService.listTasks(req.params.ccId);
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── PUT /change-controls/:ccId/tasks/:taskId — Update task ─────
  app.put('/change-controls/:ccId/tasks/:taskId',
    requireRole('qa', 'engineering', 'msat', 'production', 'admin'),
    async (req, res) => {
      try {
        const result = await changeControlService.updateTask({
          ccId: req.params.ccId,
          taskId: req.params.taskId,
          updates: req.body,
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

  // ── POST /change-controls/:ccId/tasks/:taskId/verify — QA verify
  app.post('/change-controls/:ccId/tasks/:taskId/verify',
    requireRole('qa', 'admin'),
    async (req, res) => {
      try {
        const result = await changeControlService.verifyTask({
          ccId: req.params.ccId,
          taskId: req.params.taskId,
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

  // ── AI ENDPOINTS ───────────────────────────────────────────────

  app.post('/change-controls/:ccId/ai/impact',
    requireRole('qa', 'admin'),
    async (req, res) => {
      try {
        const result = await changeControlService.aiImpact({
          ccId: req.params.ccId,
          userId: req.user.name || req.user.id,
          req,
        });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/change-controls/:ccId/ai/classify',
    requireRole('qa', 'regulatory', 'admin'),
    async (req, res) => {
      try {
        const result = await changeControlService.aiClassify({
          ccId: req.params.ccId,
          userId: req.user.name || req.user.id,
          req,
        });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/change-controls/:ccId/ai/checklist',
    requireRole('qa', 'admin'),
    async (req, res) => {
      try {
        const result = await changeControlService.aiChecklist({
          ccId: req.params.ccId,
          userId: req.user.name || req.user.id,
          req,
        });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/change-controls/:ccId/ai/sops',
    requireRole('qa', 'admin'),
    async (req, res) => {
      try {
        const result = await changeControlService.aiSops({
          ccId: req.params.ccId,
          userId: req.user.name || req.user.id,
          req,
        });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/change-controls/:ccId/ai/risk',
    requireRole('qa', 'admin'),
    async (req, res) => {
      try {
        const result = await changeControlService.aiRisk({
          ccId: req.params.ccId,
          userId: req.user.name || req.user.id,
          req,
        });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/change-controls/:ccId/ai/similar',
    requireRole('qa', 'admin'),
    async (req, res) => {
      try {
        const result = await changeControlService.aiSimilar({
          ccId: req.params.ccId,
          userId: req.user.name || req.user.id,
          req,
        });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/change-controls/:ccId/ai/effectiveness',
    requireRole('qa', 'admin'),
    async (req, res) => {
      try {
        const result = await changeControlService.aiEffectiveness({
          ccId: req.params.ccId,
          userId: req.user.name || req.user.id,
          req,
        });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
};
