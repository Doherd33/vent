'use strict';

/**
 * routes/supplier-quality.js — Thin HTTP layer for supplier quality management.
 *
 * All business logic lives in services/supplier-quality.service.js.
 */

module.exports = function(app, { auth, supplierQualityService }) {
  const { requireRole } = auth;

  // ── POST /suppliers — Create new supplier ─────────────────────
  app.post('/suppliers',
    requireRole('qa'),
    async (req, res) => {
      const { name, category, contactName, contactEmail, contactPhone,
              address, riskLevel, notes } = req.body;
      try {
        const result = await supplierQualityService.createSupplier({
          name, category, contactName, contactEmail, contactPhone,
          address, riskLevel, notes,
          createdBy: req.user.name || req.user.id,
          req,
        });
        res.json(result);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        if (err.message && err.message.includes('does not exist')) {
          return res.status(400).json({ error: 'suppliers table does not exist. Run the setup SQL.' });
        }
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /suppliers — List with optional filters ───────────────
  app.get('/suppliers',
    requireRole('qa'),
    async (req, res) => {
      try {
        const { status, risk_level, category } = req.query;
        const data = await supplierQualityService.listSuppliers({ status, risk_level, category });
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /suppliers/stats — Dashboard statistics ───────────────
  // NOTE: Must be before /:id to avoid matching "stats" as a supplier ID
  app.get('/suppliers/stats',
    requireRole('qa'),
    async (req, res) => {
      try {
        const data = await supplierQualityService.getStats();
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /suppliers/:id — Single supplier detail ───────────────
  app.get('/suppliers/:id',
    requireRole('qa'),
    async (req, res) => {
      try {
        const data = await supplierQualityService.getSupplier(req.params.id);
        res.json(data);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  // ── PUT /suppliers/:id — Update supplier ──────────────────────
  app.put('/suppliers/:id',
    requireRole('qa'),
    async (req, res) => {
      const { name, category, status, riskLevel, contactName, contactEmail,
              contactPhone, address, qualificationDate, nextAuditDate,
              qualityAgreementStatus, notes, reason } = req.body;
      try {
        const result = await supplierQualityService.updateSupplier(req.params.id, {
          name, category, status, riskLevel, contactName, contactEmail,
          contactPhone, address, qualificationDate, nextAuditDate,
          qualityAgreementStatus, notes,
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

  // ── GET /suppliers/:id/scorecard — Performance scorecard ──────
  app.get('/suppliers/:id/scorecard',
    requireRole('qa'),
    async (req, res) => {
      try {
        const data = await supplierQualityService.getScorecard(req.params.id);
        res.json(data);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  // ── POST /suppliers/:id/audits — Schedule/record audit ────────
  app.post('/suppliers/:id/audits',
    requireRole('qa'),
    async (req, res) => {
      const { auditType, auditDate, auditor, findings, score, notes } = req.body;
      try {
        const result = await supplierQualityService.createAudit(req.params.id, {
          auditType, auditDate, auditor, findings, score, notes,
          createdBy: req.user.name || req.user.id,
          req,
        });
        res.json(result);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /suppliers/:id/audits — Audit history ─────────────────
  app.get('/suppliers/:id/audits',
    requireRole('qa'),
    async (req, res) => {
      try {
        const data = await supplierQualityService.listAudits(req.params.id);
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── POST /suppliers/:id/agreements — Create quality agreement ─
  app.post('/suppliers/:id/agreements',
    requireRole('qa'),
    async (req, res) => {
      const { version, effectiveDate, expiryDate, reviewedBy, approvedBy, notes } = req.body;
      try {
        const result = await supplierQualityService.createAgreement(req.params.id, {
          version, effectiveDate, expiryDate, reviewedBy, approvedBy, notes,
          createdBy: req.user.name || req.user.id,
          req,
        });
        res.json(result);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  // ── GET /suppliers/:id/agreements — Agreement history ─────────
  app.get('/suppliers/:id/agreements',
    requireRole('qa'),
    async (req, res) => {
      try {
        const data = await supplierQualityService.listAgreements(req.params.id);
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── POST /suppliers/:id/analyse — AI analysis ────────────────
  app.post('/suppliers/:id/analyse',
    requireRole('qa'),
    async (req, res) => {
      const { mode } = req.body;
      try {
        const result = await supplierQualityService.aiAnalyse({
          supplierId: req.params.id,
          mode: mode || 'risk_score',
        });
        res.json(result);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });
};
