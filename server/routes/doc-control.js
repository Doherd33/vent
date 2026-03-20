'use strict';

/**
 * routes/doc-control.js — Thin HTTP layer for document control management.
 *
 * All business logic lives in services/doc-control.service.js.
 */

module.exports = function(app, { auth, docControlService }) {
  const { requireAuth, requireRole } = auth;

  // ── POST /documents — Create new controlled document ───────────
  app.post('/documents',
    requireRole('qa', 'regulatory', 'engineering', 'msat', 'production', 'admin'),
    async (req, res) => {
      try {
        const result = await docControlService.create({
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

  // ── GET /documents/stats — Dashboard statistics ────────────────
  app.get('/documents/stats',
    requireAuth,
    async (req, res) => {
      try {
        const data = await docControlService.getStats();
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /documents/reviews/overdue — Overdue periodic reviews ──
  app.get('/documents/reviews/overdue',
    requireAuth,
    async (req, res) => {
      try {
        const data = await docControlService.getOverdueReviews();
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /documents/reviews/upcoming — Upcoming periodic reviews ─
  app.get('/documents/reviews/upcoming',
    requireAuth,
    async (req, res) => {
      try {
        const days = parseInt(req.query.days) || 90;
        const data = await docControlService.getUpcomingReviews(days);
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── POST /documents/ai/review-priorities — AI review priorities ─
  app.post('/documents/ai/review-priorities',
    requireRole('qa', 'admin'),
    async (req, res) => {
      try {
        const result = await docControlService.aiReviewPriorities({
          userId: req.user.name || req.user.id,
          req,
        });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /documents — List with filters ─────────────────────────
  app.get('/documents',
    requireAuth,
    async (req, res) => {
      try {
        const data = await docControlService.list(req.query);
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /documents/:docId — Single document detail ─────────────
  app.get('/documents/:docId',
    requireAuth,
    async (req, res) => {
      try {
        const data = await docControlService.getById(req.params.docId);
        res.json(data);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  // ── PUT /documents/:docId — Update document metadata ───────────
  app.put('/documents/:docId',
    requireRole('qa', 'regulatory', 'engineering', 'msat', 'production', 'admin'),
    async (req, res) => {
      try {
        const result = await docControlService.update({
          docId: req.params.docId,
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

  // ── POST /documents/:docId/versions — Create new version ───────
  app.post('/documents/:docId/versions',
    requireRole('qa', 'regulatory', 'engineering', 'msat', 'production', 'admin'),
    async (req, res) => {
      try {
        const result = await docControlService.createVersion({
          docId: req.params.docId,
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

  // ── GET /documents/:docId/versions — List versions ─────────────
  app.get('/documents/:docId/versions',
    requireAuth,
    async (req, res) => {
      try {
        const data = await docControlService.listVersions(req.params.docId);
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /documents/:docId/versions/:verId — Single version ─────
  app.get('/documents/:docId/versions/:verId',
    requireAuth,
    async (req, res) => {
      try {
        const data = await docControlService.getVersion(req.params.docId, req.params.verId);
        res.json(data);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  // ── POST /documents/:docId/submit — Submit for review ──────────
  app.post('/documents/:docId/submit',
    requireRole('qa', 'regulatory', 'engineering', 'msat', 'production', 'admin'),
    async (req, res) => {
      try {
        const result = await docControlService.submit({
          docId: req.params.docId,
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

  // ── POST /documents/:docId/review — Submit review decision ─────
  app.post('/documents/:docId/review',
    requireRole('qa', 'regulatory', 'engineering', 'msat', 'production', 'qc', 'validation', 'admin'),
    async (req, res) => {
      try {
        const result = await docControlService.submitReview({
          docId: req.params.docId,
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

  // ── POST /documents/:docId/approve — QA formal approval ────────
  app.post('/documents/:docId/approve',
    requireRole('qa', 'regulatory', 'director', 'admin'),
    async (req, res) => {
      try {
        const { approver, approverRole, signatureMeaning, comments } = req.body;
        const result = await docControlService.approve({
          docId: req.params.docId,
          approver: approver || req.user.name || req.user.id,
          approverRole: approverRole || req.user.role,
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

  // ── POST /documents/:docId/make-effective — Make effective ──────
  app.post('/documents/:docId/make-effective',
    requireRole('qa', 'admin'),
    async (req, res) => {
      try {
        const result = await docControlService.makeEffective({
          docId: req.params.docId,
          effectiveDate: req.body.effectiveDate,
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

  // ── POST /documents/:docId/retire — Retire document ────────────
  app.post('/documents/:docId/retire',
    requireRole('qa', 'admin'),
    async (req, res) => {
      try {
        const result = await docControlService.retire({
          docId: req.params.docId,
          reason: req.body.reason,
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

  // ── POST /documents/:docId/checkout — Check out for editing ─────
  app.post('/documents/:docId/checkout',
    requireRole('qa', 'regulatory', 'engineering', 'msat', 'production', 'admin'),
    async (req, res) => {
      try {
        const result = await docControlService.checkout({
          docId: req.params.docId,
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

  // ── POST /documents/:docId/checkin — Check in ──────────────────
  app.post('/documents/:docId/checkin',
    requireRole('qa', 'regulatory', 'engineering', 'msat', 'production', 'admin'),
    async (req, res) => {
      try {
        const result = await docControlService.checkin({
          docId: req.params.docId,
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

  // ── POST /documents/:docId/periodic-review — Initiate review ───
  app.post('/documents/:docId/periodic-review',
    requireRole('qa', 'admin'),
    async (req, res) => {
      try {
        const result = await docControlService.initiatePeriodicReview({
          docId: req.params.docId,
          reviewer: req.body.reviewer,
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

  // ── POST /documents/:docId/periodic-review/complete — Complete ──
  app.post('/documents/:docId/periodic-review/complete',
    requireRole('qa', 'regulatory', 'engineering', 'msat', 'production', 'qc', 'validation', 'admin'),
    async (req, res) => {
      try {
        const result = await docControlService.completePeriodicReview({
          docId: req.params.docId,
          outcome: req.body.outcome,
          comments: req.body.comments,
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

  // ── POST /documents/:docId/distribute — Distribute document ─────
  app.post('/documents/:docId/distribute',
    requireRole('qa', 'admin'),
    async (req, res) => {
      try {
        const result = await docControlService.distribute({
          docId: req.params.docId,
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

  // ── POST /documents/:docId/acknowledge — Acknowledge receipt ────
  app.post('/documents/:docId/acknowledge',
    requireAuth,
    async (req, res) => {
      try {
        const result = await docControlService.acknowledge({
          docId: req.params.docId,
          userId: req.user.name || req.user.id,
          userName: req.user.name || '',
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

  // ── GET /documents/:docId/distribution — Distribution records ───
  app.get('/documents/:docId/distribution',
    requireAuth,
    async (req, res) => {
      try {
        const data = await docControlService.getDistribution(req.params.docId);
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── AI ENDPOINTS ──────────────────────────────────────────────

  // POST /documents/:docId/ai/classify
  app.post('/documents/:docId/ai/classify',
    requireRole('qa', 'admin'),
    async (req, res) => {
      try {
        const result = await docControlService.aiClassify({
          docId: req.params.docId,
          userId: req.user.name || req.user.id,
          req,
        });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // POST /documents/:docId/ai/change-summary
  app.post('/documents/:docId/ai/change-summary',
    requireRole('qa', 'admin'),
    async (req, res) => {
      try {
        const result = await docControlService.aiChangeSummary({
          docId: req.params.docId,
          userId: req.user.name || req.user.id,
          req,
        });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // POST /documents/:docId/ai/check-references
  app.post('/documents/:docId/ai/check-references',
    requireRole('qa', 'admin'),
    async (req, res) => {
      try {
        const result = await docControlService.aiCheckReferences({
          docId: req.params.docId,
          userId: req.user.name || req.user.id,
          req,
        });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // POST /documents/:docId/ai/impact
  app.post('/documents/:docId/ai/impact',
    requireRole('qa', 'admin'),
    async (req, res) => {
      try {
        const result = await docControlService.aiImpact({
          docId: req.params.docId,
          userId: req.user.name || req.user.id,
          req,
        });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // POST /documents/:docId/ai/suggest-reviewers
  app.post('/documents/:docId/ai/suggest-reviewers',
    requireRole('qa', 'admin'),
    async (req, res) => {
      try {
        const result = await docControlService.aiSuggestReviewers({
          docId: req.params.docId,
          userId: req.user.name || req.user.id,
          req,
        });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
};
