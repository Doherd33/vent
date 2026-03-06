'use strict';

/**
 * routes/batch-disposition.js — Thin HTTP layer for batch disposition / QP release.
 *
 * All business logic lives in services/batch-disposition.service.js.
 */

module.exports = function(app, { auth, batchDispositionService }) {
  const { requireAuth, requireRole } = auth;
  const svc = batchDispositionService;

  // ── POST /dispositions — Create new batch disposition ──────────
  app.post('/dispositions',
    requireRole('qa', 'director'),
    async (req, res) => {
      try {
        const result = await svc.create({
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

  // ── GET /dispositions/stats — Dashboard statistics ─────────────
  // Must be before /:dispId
  app.get('/dispositions/stats',
    requireRole('qa', 'director'),
    async (req, res) => {
      try {
        const data = await svc.getStats();
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /dispositions/register — QP certification register ─────
  app.get('/dispositions/register',
    requireRole('qa', 'director'),
    async (req, res) => {
      try {
        const { date_from, date_to, product_name, qp_name, format } = req.query;
        const data = await svc.getCertRegister({ date_from, date_to, product_name, qp_name });

        if (format === 'csv') {
          const headers = ['cert_id', 'disposition_id', 'batch_number', 'product_name', 'batch_size', 'qp_name', 'qp_role', 'certification_date', 'decision', 'conditions', 'regulatory_framework', 'signature_meaning'];
          const csv = [headers.join(',')]
            .concat(data.map(r => headers.map(h => '"' + String(r[h] || '').replace(/"/g, '""') + '"').join(',')))
            .join('\n');
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', 'attachment; filename=qp_certification_register.csv');
          return res.send(csv);
        }

        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /dispositions/register/:certId — Single cert entry ─────
  app.get('/dispositions/register/:certId',
    requireRole('qa', 'director'),
    async (req, res) => {
      try {
        const data = await svc.getCertEntry(req.params.certId);
        res.json(data);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /dispositions/exceptions — Exception dashboard ─────────
  app.get('/dispositions/exceptions',
    requireRole('qa', 'director'),
    async (req, res) => {
      try {
        const data = await svc.getExceptions();
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /dispositions — List with filters ──────────────────────
  app.get('/dispositions',
    requireRole('qa', 'director'),
    async (req, res) => {
      try {
        const data = await svc.list(req.query);
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /dispositions/:dispId — Single disposition detail ──────
  app.get('/dispositions/:dispId',
    requireRole('qa', 'director'),
    async (req, res) => {
      try {
        const data = await svc.getById(req.params.dispId);
        res.json(data);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  // ── PUT /dispositions/:dispId — Update disposition ─────────────
  app.put('/dispositions/:dispId',
    requireRole('qa', 'director'),
    async (req, res) => {
      try {
        const result = await svc.update({
          dispId: req.params.dispId,
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

  // ── POST /dispositions/:dispId/start-review ────────────────────
  app.post('/dispositions/:dispId/start-review',
    requireRole('qa', 'director'),
    async (req, res) => {
      try {
        const result = await svc.startReview({
          dispId: req.params.dispId,
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

  // ── POST /dispositions/:dispId/checklist — Add checklist item ──
  app.post('/dispositions/:dispId/checklist',
    requireRole('qa', 'director'),
    async (req, res) => {
      try {
        const result = await svc.addChecklistItem({
          dispId: req.params.dispId,
          ...req.body,
          userId: req.user.name || req.user.id,
          req,
        });
        res.json(result);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /dispositions/:dispId/checklist — Get checklist ────────
  app.get('/dispositions/:dispId/checklist',
    requireRole('qa', 'director'),
    async (req, res) => {
      try {
        const data = await svc.getChecklist(req.params.dispId);
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── PUT /dispositions/:dispId/checklist/:checkId — Update item ─
  app.put('/dispositions/:dispId/checklist/:checkId',
    requireRole('qa', 'director'),
    async (req, res) => {
      try {
        const result = await svc.updateChecklistItem({
          dispId: req.params.dispId,
          checkId: req.params.checkId,
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

  // ── POST /dispositions/:dispId/hold — Place on hold ────────────
  app.post('/dispositions/:dispId/hold',
    requireRole('qa', 'director'),
    async (req, res) => {
      try {
        const result = await svc.holdDisposition({
          dispId: req.params.dispId,
          hold_reason: req.body.hold_reason,
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

  // ── POST /dispositions/:dispId/release — QP release (director) ─
  app.post('/dispositions/:dispId/release',
    requireRole('director'),
    async (req, res) => {
      try {
        const result = await svc.release({
          dispId: req.params.dispId,
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

  // ── POST /dispositions/:dispId/reject — QP reject (director) ──
  app.post('/dispositions/:dispId/reject',
    requireRole('director'),
    async (req, res) => {
      try {
        const result = await svc.reject({
          dispId: req.params.dispId,
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

  // ── POST /dispositions/:dispId/conditional-release (director) ──
  app.post('/dispositions/:dispId/conditional-release',
    requireRole('director'),
    async (req, res) => {
      try {
        const result = await svc.conditionalRelease({
          dispId: req.params.dispId,
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

  // ── PUT /dispositions/:dispId/conditional-release/resolve ──────
  app.put('/dispositions/:dispId/conditional-release/resolve',
    requireRole('director'),
    async (req, res) => {
      try {
        const result = await svc.resolveConditional({
          dispId: req.params.dispId,
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

  // ── GET /dispositions/:dispId/timeline — Audit trail timeline ──
  app.get('/dispositions/:dispId/timeline',
    requireRole('qa', 'director'),
    async (req, res) => {
      try {
        const data = await svc.getTimeline(req.params.dispId);
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── AI Endpoints ───────────────────────────────────────────────

  app.post('/dispositions/:dispId/ai/prescreen',
    requireRole('qa', 'director'),
    async (req, res) => {
      try {
        const result = await svc.aiPrescreen({
          dispId: req.params.dispId,
          userId: req.user.name || req.user.id,
          userRole: req.user.role,
          req,
        });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/dispositions/:dispId/ai/summary',
    requireRole('qa', 'director'),
    async (req, res) => {
      try {
        const result = await svc.aiSummary({
          dispId: req.params.dispId,
          userId: req.user.name || req.user.id,
          userRole: req.user.role,
          req,
        });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/dispositions/:dispId/ai/recommend',
    requireRole('qa', 'director'),
    async (req, res) => {
      try {
        const result = await svc.aiRecommend({
          dispId: req.params.dispId,
          userId: req.user.name || req.user.id,
          userRole: req.user.role,
          req,
        });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/dispositions/:dispId/ai/missing-docs',
    requireRole('qa', 'director'),
    async (req, res) => {
      try {
        const result = await svc.aiMissingDocs({
          dispId: req.params.dispId,
          userId: req.user.name || req.user.id,
          userRole: req.user.role,
          req,
        });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/dispositions/:dispId/ai/trend-analysis',
    requireRole('qa', 'director'),
    async (req, res) => {
      try {
        const result = await svc.aiTrendAnalysis({
          dispId: req.params.dispId,
          userId: req.user.name || req.user.id,
          userRole: req.user.role,
          req,
        });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/dispositions/:dispId/ai/investigation-review',
    requireRole('qa', 'director'),
    async (req, res) => {
      try {
        const result = await svc.aiInvestigationReview({
          dispId: req.params.dispId,
          userId: req.user.name || req.user.id,
          userRole: req.user.role,
          req,
        });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
};
