'use strict';

/**
 * routes/complaint-mgr.js — Thin HTTP layer for complaint & recall management.
 *
 * All business logic lives in services/complaint-mgr.service.js.
 */

module.exports = function(app, { auth, complaintService }) {
  const { requireAuth, requireRole } = auth;

  // ═══════════════════════════════════════════════════════════════
  // COMPLAINT CRUD
  // ═══════════════════════════════════════════════════════════════

  app.post('/complaints',
    requireRole('qa', 'director', 'admin'),
    async (req, res) => {
      const {
        title, description, complaintType, source, severity, priority,
        productName, productStrength, dosageForm, batchNumber, lotNumber,
        dateOfEvent, complainantName, complainantContact, complainantOrg, country,
        immediateAction, sampleAvailable
      } = req.body;
      try {
        const result = await complaintService.createComplaint({
          title, description, complaintType, source, severity, priority,
          productName, productStrength, dosageForm, batchNumber, lotNumber,
          dateOfEvent, complainantName, complainantContact, complainantOrg, country,
          immediateAction, sampleAvailable,
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

  app.get('/complaints',
    requireAuth,
    async (req, res) => {
      try {
        const data = await complaintService.listComplaints(req.query);
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ── Stats (before :compId to avoid matching) ───────────────
  app.get('/complaints/stats',
    requireAuth,
    async (req, res) => {
      try {
        const data = await complaintService.getComplaintStats();
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.get('/complaints/trends',
    requireAuth,
    async (req, res) => {
      try {
        const data = await complaintService.getComplaintTrends();
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.get('/complaints/sla-status',
    requireAuth,
    async (req, res) => {
      try {
        const data = await complaintService.getSlaStatus();
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.get('/complaints/regulatory-deadlines',
    requireAuth,
    async (req, res) => {
      try {
        const data = await complaintService.getRegulatoryDeadlines();
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.get('/complaints/:compId',
    requireAuth,
    async (req, res) => {
      try {
        const data = await complaintService.getComplaint(req.params.compId);
        res.json(data);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  app.put('/complaints/:compId',
    requireRole('qa', 'director', 'admin'),
    async (req, res) => {
      try {
        const result = await complaintService.updateComplaint({
          compId: req.params.compId,
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

  // ═══════════════════════════════════════════════════════════════
  // COMPLAINT WORKFLOW
  // ═══════════════════════════════════════════════════════════════

  app.post('/complaints/:compId/triage',
    requireRole('qa', 'director', 'admin'),
    async (req, res) => {
      const { priority, initialRiskAssessment, reportable } = req.body;
      try {
        const result = await complaintService.triageComplaint({
          compId: req.params.compId,
          priority, initialRiskAssessment, reportable,
          userId: req.user.name || req.user.id,
          userRole: req.user.role, req,
        });
        res.json(result);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/complaints/:compId/investigate',
    requireRole('qa', 'director', 'admin'),
    async (req, res) => {
      try {
        const result = await complaintService.investigateComplaint({
          compId: req.params.compId,
          userId: req.user.name || req.user.id,
          userRole: req.user.role, req,
        });
        res.json(result);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/complaints/:compId/decline-investigation',
    requireRole('qa', 'director', 'admin'),
    async (req, res) => {
      const { reason, responsiblePerson } = req.body;
      try {
        const result = await complaintService.declineInvestigation({
          compId: req.params.compId,
          reason, responsiblePerson,
          userId: req.user.name || req.user.id,
          userRole: req.user.role, req,
        });
        res.json(result);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/complaints/:compId/respond',
    requireRole('qa', 'director', 'admin'),
    async (req, res) => {
      const { reply_to_complainant, reply_date } = req.body;
      try {
        const result = await complaintService.respondToComplainant({
          compId: req.params.compId,
          replyToComplainant: reply_to_complainant,
          replyDate: reply_date,
          userId: req.user.name || req.user.id,
          userRole: req.user.role, req,
        });
        res.json(result);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/complaints/:compId/follow-up',
    requireRole('qa', 'director', 'admin'),
    async (req, res) => {
      const { follow_up_notes, follow_up_date } = req.body;
      try {
        const result = await complaintService.followUp({
          compId: req.params.compId,
          followUpNotes: follow_up_notes,
          followUpDate: follow_up_date,
          userId: req.user.name || req.user.id,
          userRole: req.user.role, req,
        });
        res.json(result);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/complaints/:compId/close',
    requireRole('qa', 'director', 'admin'),
    async (req, res) => {
      const { closureNotes } = req.body;
      try {
        const result = await complaintService.closeComplaint({
          compId: req.params.compId,
          closureNotes,
          userId: req.user.name || req.user.id,
          userRole: req.user.role, req,
        });
        res.json(result);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/complaints/:compId/void',
    requireRole('qa', 'director', 'admin'),
    async (req, res) => {
      const { reason } = req.body;
      try {
        const result = await complaintService.voidComplaint({
          compId: req.params.compId,
          reason,
          userId: req.user.name || req.user.id,
          userRole: req.user.role, req,
        });
        res.json(result);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/complaints/:compId/archive',
    requireRole('qa', 'director', 'admin'),
    async (req, res) => {
      try {
        const result = await complaintService.archiveComplaint({
          compId: req.params.compId,
          userId: req.user.name || req.user.id,
          userRole: req.user.role, req,
        });
        res.json(result);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  // ═══════════════════════════════════════════════════════════════
  // COMPLAINT AI
  // ═══════════════════════════════════════════════════════════════

  app.post('/complaints/:compId/ai/classify',
    requireRole('qa', 'director', 'admin'),
    async (req, res) => {
      try {
        const result = await complaintService.aiClassify({ compId: req.params.compId });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/complaints/:compId/ai/batch-impact',
    requireRole('qa', 'director', 'admin'),
    async (req, res) => {
      try {
        const result = await complaintService.aiBatchImpact({ compId: req.params.compId });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/complaints/:compId/ai/trends',
    requireRole('qa', 'director', 'admin'),
    async (req, res) => {
      try {
        const result = await complaintService.aiTrends({ compId: req.params.compId });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/complaints/ai/predict-recall-risk',
    requireRole('qa', 'director', 'admin'),
    async (req, res) => {
      try {
        const result = await complaintService.aiPredictRecallRisk();
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/complaints/:compId/ai/draft-report',
    requireRole('qa', 'director', 'admin'),
    async (req, res) => {
      try {
        const result = await complaintService.aiDraftReport({ compId: req.params.compId });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ═══════════════════════════════════════════════════════════════
  // RECALL CRUD
  // ═══════════════════════════════════════════════════════════════

  app.post('/recalls',
    requireRole('qa', 'director', 'admin'),
    async (req, res) => {
      const {
        title, description, recallClass, scope, reason, affectedBatches,
        affectedMarkets, distributionData, unitsDistributed, linkedComplaintId,
        recallDepth, publicNotificationMethod, effectivenessCheckLevel,
        targetCompletion
      } = req.body;
      try {
        const result = await complaintService.createRecall({
          title, description, recallClass, scope, reason, affectedBatches,
          affectedMarkets, distributionData, unitsDistributed, linkedComplaintId,
          recallDepth, publicNotificationMethod, effectivenessCheckLevel,
          targetCompletion,
          userId: req.user.name || req.user.id,
          userRole: req.user.role, req,
        });
        res.json(result);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  app.get('/recalls',
    requireAuth,
    async (req, res) => {
      try {
        const data = await complaintService.listRecalls(req.query);
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // Stats must be before :recallId
  app.get('/recalls/stats',
    requireAuth,
    async (req, res) => {
      try {
        const data = await complaintService.getRecallStats();
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.get('/recalls/:recallId',
    requireAuth,
    async (req, res) => {
      try {
        const data = await complaintService.getRecall(req.params.recallId);
        res.json(data);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  app.put('/recalls/:recallId',
    requireRole('qa', 'director', 'admin'),
    async (req, res) => {
      try {
        const result = await complaintService.updateRecall({
          recallId: req.params.recallId,
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

  // ═══════════════════════════════════════════════════════════════
  // RECALL WORKFLOW
  // ═══════════════════════════════════════════════════════════════

  app.post('/recalls/:recallId/approve-strategy',
    requireRole('director', 'admin'),
    async (req, res) => {
      try {
        const result = await complaintService.approveRecallStrategy({
          recallId: req.params.recallId,
          userId: req.user.name || req.user.id,
          userRole: req.user.role, req,
        });
        res.json(result);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/recalls/:recallId/send-notifications',
    requireRole('qa', 'director', 'admin'),
    async (req, res) => {
      const { notificationStatus } = req.body;
      try {
        const result = await complaintService.sendRecallNotifications({
          recallId: req.params.recallId,
          notificationStatus,
          userId: req.user.name || req.user.id,
          userRole: req.user.role, req,
        });
        res.json(result);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/recalls/:recallId/start-recovery',
    requireRole('qa', 'director', 'admin'),
    async (req, res) => {
      try {
        const result = await complaintService.startRecallRecovery({
          recallId: req.params.recallId,
          userId: req.user.name || req.user.id,
          userRole: req.user.role, req,
        });
        res.json(result);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/recalls/:recallId/effectiveness-check',
    requireRole('qa', 'director', 'admin'),
    async (req, res) => {
      const { results, level } = req.body;
      try {
        const result = await complaintService.recordEffectivenessCheck({
          recallId: req.params.recallId,
          results, level,
          userId: req.user.name || req.user.id,
          userRole: req.user.role, req,
        });
        res.json(result);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/recalls/:recallId/submit-termination',
    requireRole('qa', 'director', 'admin'),
    async (req, res) => {
      try {
        const result = await complaintService.submitTermination({
          recallId: req.params.recallId,
          userId: req.user.name || req.user.id,
          userRole: req.user.role, req,
        });
        res.json(result);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/recalls/:recallId/terminate',
    requireRole('director', 'admin'),
    async (req, res) => {
      const { closureNotes, lessonsLearned } = req.body;
      try {
        const result = await complaintService.terminateRecall({
          recallId: req.params.recallId,
          closureNotes, lessonsLearned,
          userId: req.user.name || req.user.id,
          userRole: req.user.role, req,
        });
        res.json(result);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/recalls/:recallId/status-report',
    requireRole('qa', 'director', 'admin'),
    async (req, res) => {
      const { reportDate } = req.body;
      try {
        const result = await complaintService.recordStatusReport({
          recallId: req.params.recallId,
          reportDate,
          userId: req.user.name || req.user.id,
          userRole: req.user.role, req,
        });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.put('/recalls/:recallId/consignees',
    requireRole('qa', 'director', 'admin'),
    async (req, res) => {
      const { consigneeTracking } = req.body;
      try {
        const result = await complaintService.updateConsignees({
          recallId: req.params.recallId,
          consigneeTracking,
          userId: req.user.name || req.user.id,
          userRole: req.user.role, req,
        });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ═══════════════════════════════════════════════════════════════
  // RECALL AI
  // ═══════════════════════════════════════════════════════════════

  app.post('/recalls/:recallId/ai/scope',
    requireRole('qa', 'director', 'admin'),
    async (req, res) => {
      try {
        const result = await complaintService.aiRecallScope({ recallId: req.params.recallId });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
};
