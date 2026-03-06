'use strict';

/**
 * routes/cell-bank.js — Thin HTTP layer for cell bank management.
 *
 * All business logic lives in services/cell-bank.service.js.
 */

module.exports = function(app, { auth, cellBankService }) {
  const { requireAuth, requireRole } = auth;

  // ── Cell Banks ─────────────────────────────────────────────────────────────

  // POST /cell-banks — create a new cell bank
  app.post('/cell-banks',
    requireRole('qa', 'msat'),
    async (req, res) => {
      try {
        const result = await cellBankService.createBank({
          ...req.body,
          userId: req.user.name || req.user.id,
          userRole: req.user.role,
          req,
        });
        res.json(result);
      } catch (e) {
        const code = e.statusCode || 500;
        res.status(code).json({ error: e.message });
      }
    });

  // GET /cell-banks/stats — dashboard stats (before /:bankId)
  app.get('/cell-banks/stats',
    requireRole('qa', 'operator', 'msat'),
    async (req, res) => {
      try {
        res.json(await cellBankService.getStats());
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

  // GET /cell-banks/compliance-check — AI compliance scan
  app.get('/cell-banks/compliance-check',
    requireRole('qa', 'msat'),
    async (req, res) => {
      try {
        res.json(await cellBankService.aiComplianceCheck());
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

  // GET /cell-banks/transactions/:txnId — single transaction
  app.get('/cell-banks/transactions/:txnId',
    requireRole('qa', 'operator', 'msat'),
    async (req, res) => {
      try {
        res.json(await cellBankService.getTransaction(req.params.txnId));
      } catch (e) {
        const code = e.statusCode || 500;
        res.status(code).json({ error: e.message });
      }
    });

  // PUT /cell-banks/transactions/:txnId — update transaction
  app.put('/cell-banks/transactions/:txnId',
    requireRole('qa', 'msat'),
    async (req, res) => {
      try {
        const result = await cellBankService.updateTransaction({
          txnId: req.params.txnId,
          updates: req.body,
          userId: req.user.name || req.user.id,
          userRole: req.user.role,
          req,
        });
        res.json(result);
      } catch (e) {
        const code = e.statusCode || 500;
        res.status(code).json({ error: e.message });
      }
    });

  // POST /cell-banks/transactions/:txnId/approve — approve withdrawal
  app.post('/cell-banks/transactions/:txnId/approve',
    requireRole('qa'),
    async (req, res) => {
      try {
        const result = await cellBankService.approveTransaction({
          txnId: req.params.txnId,
          eSig: req.body.eSig || req.body.e_signature,
          userId: req.user.name || req.user.id,
          userRole: req.user.role,
          req,
        });
        res.json(result);
      } catch (e) {
        const code = e.statusCode || 500;
        res.status(code).json({ error: e.message });
      }
    });

  // POST /cell-banks/transactions/:txnId/complete — complete transaction
  app.post('/cell-banks/transactions/:txnId/complete',
    requireRole('qa', 'operator', 'msat'),
    async (req, res) => {
      try {
        const result = await cellBankService.completeTransaction({
          txnId: req.params.txnId,
          ...req.body,
          userId: req.user.name || req.user.id,
          userRole: req.user.role,
          req,
        });
        res.json(result);
      } catch (e) {
        const code = e.statusCode || 500;
        res.status(code).json({ error: e.message });
      }
    });

  // AI endpoints (non-bank-specific)
  app.post('/cell-banks/ai/expiry-alerts',
    requireRole('qa', 'msat'),
    async (req, res) => {
      try {
        res.json(await cellBankService.aiExpiryAlerts());
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

  app.post('/cell-banks/ai/usage-optimization',
    requireRole('qa', 'msat'),
    async (req, res) => {
      try {
        res.json(await cellBankService.aiUsageOptimization());
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

  app.post('/cell-banks/ai/viability-trend',
    requireRole('qa', 'msat'),
    async (req, res) => {
      try {
        const { bankId } = req.body;
        if (!bankId) return res.status(400).json({ error: 'bankId required' });
        res.json(await cellBankService.aiViabilityTrend(bankId));
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

  // GET /cell-banks — list with filters
  app.get('/cell-banks',
    requireRole('qa', 'operator', 'msat'),
    async (req, res) => {
      try {
        const data = await cellBankService.listBanks(req.query);
        res.json(data);
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

  // GET /cell-banks/:bankId — single bank detail
  app.get('/cell-banks/:bankId',
    requireRole('qa', 'operator', 'msat'),
    async (req, res) => {
      try {
        res.json(await cellBankService.getBankDetail(req.params.bankId));
      } catch (e) {
        const code = e.statusCode || 500;
        res.status(code).json({ error: e.message });
      }
    });

  // PUT /cell-banks/:bankId — update bank
  app.put('/cell-banks/:bankId',
    requireRole('qa', 'msat'),
    async (req, res) => {
      try {
        const result = await cellBankService.updateBank({
          bankId: req.params.bankId,
          updates: req.body,
          userId: req.user.name || req.user.id,
          userRole: req.user.role,
          req,
        });
        res.json(result);
      } catch (e) {
        const code = e.statusCode || 500;
        res.status(code).json({ error: e.message });
      }
    });

  // GET /cell-banks/:bankId/inventory — vial inventory
  app.get('/cell-banks/:bankId/inventory',
    requireRole('qa', 'operator', 'msat'),
    async (req, res) => {
      try {
        res.json(await cellBankService.getInventory(req.params.bankId));
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

  // POST /cell-banks/:bankId/retire — retire bank
  app.post('/cell-banks/:bankId/retire',
    requireRole('qa'),
    async (req, res) => {
      try {
        const result = await cellBankService.retireBank({
          bankId: req.params.bankId,
          userId: req.user.name || req.user.id,
          userRole: req.user.role,
          req,
        });
        res.json(result);
      } catch (e) {
        const code = e.statusCode || 500;
        res.status(code).json({ error: e.message });
      }
    });

  // GET /cell-banks/:bankId/lineage — genealogy tree
  app.get('/cell-banks/:bankId/lineage',
    requireRole('qa', 'operator', 'msat'),
    async (req, res) => {
      try {
        res.json(await cellBankService.getLineage(req.params.bankId));
      } catch (e) {
        const code = e.statusCode || 500;
        res.status(code).json({ error: e.message });
      }
    });

  // POST /cell-banks/:bankId/qualify — QA qualification
  app.post('/cell-banks/:bankId/qualify',
    requireRole('qa'),
    async (req, res) => {
      try {
        const result = await cellBankService.qualifyBank({
          bankId: req.params.bankId,
          userId: req.user.name || req.user.id,
          userRole: req.user.role,
          eSig: req.body.eSig || req.body.e_signature,
          req,
        });
        res.json(result);
      } catch (e) {
        const code = e.statusCode || 500;
        res.status(code).json({ error: e.message });
      }
    });

  // ── Vials ──────────────────────────────────────────────────────────────────

  // POST /cell-banks/:bankId/vials — register vials (bulk)
  app.post('/cell-banks/:bankId/vials',
    requireRole('qa', 'msat'),
    async (req, res) => {
      try {
        const result = await cellBankService.registerVials({
          bankId: req.params.bankId,
          ...req.body,
          userId: req.user.name || req.user.id,
          userRole: req.user.role,
          req,
        });
        res.json(result);
      } catch (e) {
        const code = e.statusCode || 500;
        res.status(code).json({ error: e.message });
      }
    });

  // GET /cell-banks/:bankId/vials — list vials
  app.get('/cell-banks/:bankId/vials',
    requireRole('qa', 'operator', 'msat'),
    async (req, res) => {
      try {
        res.json(await cellBankService.getInventory(req.params.bankId));
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

  // PUT /cell-banks/:bankId/vials/:vialId — update vial
  app.put('/cell-banks/:bankId/vials/:vialId',
    requireRole('qa', 'msat'),
    async (req, res) => {
      try {
        const result = await cellBankService.updateVial({
          bankId: req.params.bankId,
          vialId: req.params.vialId,
          updates: req.body,
          userId: req.user.name || req.user.id,
          userRole: req.user.role,
          req,
        });
        res.json(result);
      } catch (e) {
        const code = e.statusCode || 500;
        res.status(code).json({ error: e.message });
      }
    });

  // POST /cell-banks/:bankId/vials/:vialId/destroy — destroy vial
  app.post('/cell-banks/:bankId/vials/:vialId/destroy',
    requireRole('qa', 'msat'),
    async (req, res) => {
      try {
        const result = await cellBankService.destroyVial({
          bankId: req.params.bankId,
          vialId: req.params.vialId,
          reason: req.body.reason,
          userId: req.user.name || req.user.id,
          userRole: req.user.role,
          req,
        });
        res.json(result);
      } catch (e) {
        const code = e.statusCode || 500;
        res.status(code).json({ error: e.message });
      }
    });

  // POST /cell-banks/:bankId/vials/:vialId/reserve — reserve vial
  app.post('/cell-banks/:bankId/vials/:vialId/reserve',
    requireRole('qa', 'operator', 'msat'),
    async (req, res) => {
      try {
        const result = await cellBankService.reserveVial({
          bankId: req.params.bankId,
          vialId: req.params.vialId,
          reservedFor: req.body.reservedFor || req.body.reserved_for,
          userId: req.user.name || req.user.id,
          userRole: req.user.role,
          req,
        });
        res.json(result);
      } catch (e) {
        const code = e.statusCode || 500;
        res.status(code).json({ error: e.message });
      }
    });

  // POST /cell-banks/:bankId/vials/:vialId/quarantine — quarantine vial
  app.post('/cell-banks/:bankId/vials/:vialId/quarantine',
    requireRole('qa', 'msat'),
    async (req, res) => {
      try {
        const result = await cellBankService.quarantineVial({
          bankId: req.params.bankId,
          vialId: req.params.vialId,
          reason: req.body.reason,
          deviationId: req.body.deviationId || req.body.deviation_id,
          userId: req.user.name || req.user.id,
          userRole: req.user.role,
          req,
        });
        res.json(result);
      } catch (e) {
        const code = e.statusCode || 500;
        res.status(code).json({ error: e.message });
      }
    });

  // POST /cell-banks/:bankId/vials/:vialId/release — release from reserved/quarantine
  app.post('/cell-banks/:bankId/vials/:vialId/release',
    requireRole('qa'),
    async (req, res) => {
      try {
        const result = await cellBankService.releaseVial({
          bankId: req.params.bankId,
          vialId: req.params.vialId,
          userId: req.user.name || req.user.id,
          userRole: req.user.role,
          req,
        });
        res.json(result);
      } catch (e) {
        const code = e.statusCode || 500;
        res.status(code).json({ error: e.message });
      }
    });

  // ── Testing ────────────────────────────────────────────────────────────────

  // GET /cell-banks/:bankId/tests — list tests
  app.get('/cell-banks/:bankId/tests',
    requireRole('qa', 'operator', 'msat'),
    async (req, res) => {
      try {
        res.json(await cellBankService.listTests(req.params.bankId));
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

  // PUT /cell-banks/:bankId/tests/:testId — update test record
  app.put('/cell-banks/:bankId/tests/:testId',
    requireRole('qa', 'msat'),
    async (req, res) => {
      try {
        const result = await cellBankService.updateTest({
          bankId: req.params.bankId,
          testId: req.params.testId,
          ...req.body,
          userId: req.user.name || req.user.id,
          userRole: req.user.role,
          req,
        });
        res.json(result);
      } catch (e) {
        const code = e.statusCode || 500;
        res.status(code).json({ error: e.message });
      }
    });

  // POST /cell-banks/:bankId/tests — add test record
  app.post('/cell-banks/:bankId/tests',
    requireRole('qa', 'msat'),
    async (req, res) => {
      try {
        const result = await cellBankService.addTest({
          bankId: req.params.bankId,
          ...req.body,
          userId: req.user.name || req.user.id,
          userRole: req.user.role,
          req,
        });
        res.json(result);
      } catch (e) {
        const code = e.statusCode || 500;
        res.status(code).json({ error: e.message });
      }
    });

  // ── Transactions ───────────────────────────────────────────────────────────

  // POST /cell-banks/:bankId/withdraw — request withdrawal
  app.post('/cell-banks/:bankId/withdraw',
    requireRole('qa', 'operator', 'msat'),
    async (req, res) => {
      try {
        const result = await cellBankService.withdrawVials({
          bankId: req.params.bankId,
          ...req.body,
          userId: req.user.name || req.user.id,
          userRole: req.user.role,
          req,
        });
        res.json(result);
      } catch (e) {
        const code = e.statusCode || 500;
        res.status(code).json({ error: e.message });
      }
    });

  // POST /cell-banks/:bankId/deposit — deposit vials
  app.post('/cell-banks/:bankId/deposit',
    requireRole('qa', 'msat'),
    async (req, res) => {
      try {
        const result = await cellBankService.depositVials({
          bankId: req.params.bankId,
          ...req.body,
          userId: req.user.name || req.user.id,
          userRole: req.user.role,
          req,
        });
        res.json(result);
      } catch (e) {
        const code = e.statusCode || 500;
        res.status(code).json({ error: e.message });
      }
    });

  // GET /cell-banks/:bankId/transactions — transaction history
  app.get('/cell-banks/:bankId/transactions',
    requireRole('qa', 'operator', 'msat'),
    async (req, res) => {
      try {
        res.json(await cellBankService.listTransactions(req.params.bankId));
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

  // ── AI (bank-specific) ────────────────────────────────────────────────────

  app.post('/cell-banks/:bankId/ai/depletion',
    requireRole('qa', 'msat'),
    async (req, res) => {
      try {
        res.json(await cellBankService.aiDepletion(req.params.bankId));
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

  app.post('/cell-banks/:bankId/ai/rebank',
    requireRole('qa', 'msat'),
    async (req, res) => {
      try {
        res.json(await cellBankService.aiRebank(req.params.bankId));
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
};
