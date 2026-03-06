'use strict';

/**
 * routes/qc-lab.js — Thin HTTP layer for QC Lab Dashboard.
 *
 * All business logic lives in services/qc-lab.service.js.
 */

module.exports = function(app, { auth, qcLabService }) {
  const { requireAuth, requireRole } = auth;

  // ══════════════════════════════════════════════════════════════════════
  // SAMPLES
  // ══════════════════════════════════════════════════════════════════════

  app.post('/qc/samples',
    requireRole('qc'),
    async (req, res) => {
      try {
        const result = await qcLabService.createSample({
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

  app.get('/qc/samples',
    requireAuth,
    async (req, res) => {
      try {
        const data = await qcLabService.listSamples(req.query);
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.get('/qc/samples/:sampleId',
    requireAuth,
    async (req, res) => {
      try {
        const data = await qcLabService.getSample(req.params.sampleId);
        res.json(data);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  app.put('/qc/samples/:sampleId',
    requireRole('qc'),
    async (req, res) => {
      try {
        const result = await qcLabService.updateSample({
          sampleId: req.params.sampleId,
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

  app.post('/qc/samples/:sampleId/complete',
    requireRole('qc'),
    async (req, res) => {
      try {
        const result = await qcLabService.completeSample({
          sampleId: req.params.sampleId,
          userId: req.user.name || req.user.id,
          userRole: req.user.role,
          req,
        });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ══════════════════════════════════════════════════════════════════════
  // TESTS
  // ══════════════════════════════════════════════════════════════════════

  app.post('/qc/tests',
    requireRole('qc'),
    async (req, res) => {
      try {
        const result = await qcLabService.createTest({
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

  app.get('/qc/tests',
    requireAuth,
    async (req, res) => {
      try {
        const data = await qcLabService.listTests(req.query);
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.get('/qc/tests/:testId',
    requireAuth,
    async (req, res) => {
      try {
        const data = await qcLabService.getTest(req.params.testId);
        res.json(data);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  app.put('/qc/tests/:testId',
    requireRole('qc'),
    async (req, res) => {
      try {
        const result = await qcLabService.updateTest({
          testId: req.params.testId,
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

  app.post('/qc/tests/:testId/start',
    requireRole('qc'),
    async (req, res) => {
      try {
        const result = await qcLabService.startTest({
          testId: req.params.testId,
          userId: req.user.name || req.user.id,
          userRole: req.user.role,
          req,
        });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/qc/tests/:testId/complete',
    requireRole('qc'),
    async (req, res) => {
      try {
        const result = await qcLabService.completeTest({
          testId: req.params.testId,
          userId: req.user.name || req.user.id,
          userRole: req.user.role,
          req,
        });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ══════════════════════════════════════════════════════════════════════
  // RESULTS
  // ══════════════════════════════════════════════════════════════════════

  app.post('/qc/results',
    requireRole('qc'),
    async (req, res) => {
      try {
        const result = await qcLabService.createResult({
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

  app.get('/qc/results',
    requireAuth,
    async (req, res) => {
      try {
        const data = await qcLabService.listResults(req.query);
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.get('/qc/results/:resultId',
    requireAuth,
    async (req, res) => {
      try {
        const data = await qcLabService.getResult(req.params.resultId);
        res.json(data);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  app.put('/qc/results/:resultId',
    requireRole('qc'),
    async (req, res) => {
      try {
        const result = await qcLabService.updateResult({
          resultId: req.params.resultId,
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

  app.post('/qc/results/:resultId/review',
    requireRole('qa', 'qc'),
    async (req, res) => {
      try {
        const result = await qcLabService.reviewResult({
          resultId: req.params.resultId,
          ...req.body,
          userId: req.user.name || req.user.id,
          userRole: req.user.role,
          req,
        });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/qc/results/:resultId/approve',
    requireRole('qa'),
    async (req, res) => {
      try {
        const result = await qcLabService.approveResult({
          resultId: req.params.resultId,
          ...req.body,
          userId: req.user.name || req.user.id,
          userRole: req.user.role,
          req,
        });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ══════════════════════════════════════════════════════════════════════
  // OOS INVESTIGATION
  // ══════════════════════════════════════════════════════════════════════

  app.post('/qc/results/:resultId/oos/initiate',
    requireRole('qc', 'qa'),
    async (req, res) => {
      try {
        const result = await qcLabService.initiateOos({
          resultId: req.params.resultId,
          ...req.body,
          userId: req.user.name || req.user.id,
          userRole: req.user.role,
          req,
        });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.put('/qc/results/:resultId/oos/update',
    requireRole('qc', 'qa'),
    async (req, res) => {
      try {
        const result = await qcLabService.updateOos({
          resultId: req.params.resultId,
          ...req.body,
          userId: req.user.name || req.user.id,
          userRole: req.user.role,
          req,
        });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/qc/results/:resultId/oos/escalate',
    requireRole('qc', 'qa'),
    async (req, res) => {
      try {
        const result = await qcLabService.escalateOos({
          resultId: req.params.resultId,
          userId: req.user.name || req.user.id,
          userRole: req.user.role,
          req,
        });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/qc/results/:resultId/oos/close',
    requireRole('qa'),
    async (req, res) => {
      try {
        const result = await qcLabService.closeOos({
          resultId: req.params.resultId,
          ...req.body,
          userId: req.user.name || req.user.id,
          userRole: req.user.role,
          req,
        });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ══════════════════════════════════════════════════════════════════════
  // INSTRUMENTS
  // ══════════════════════════════════════════════════════════════════════

  app.post('/qc/instruments',
    requireRole('qc'),
    async (req, res) => {
      try {
        const result = await qcLabService.createInstrument({
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

  app.get('/qc/instruments',
    requireAuth,
    async (req, res) => {
      try {
        const data = await qcLabService.listInstruments(req.query);
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.get('/qc/instruments/:instId',
    requireAuth,
    async (req, res) => {
      try {
        const data = await qcLabService.getInstrument(req.params.instId);
        res.json(data);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  app.put('/qc/instruments/:instId',
    requireRole('qc'),
    async (req, res) => {
      try {
        const result = await qcLabService.updateInstrument({
          instrumentId: req.params.instId,
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

  // ══════════════════════════════════════════════════════════════════════
  // ANALYST QUALIFICATIONS
  // ══════════════════════════════════════════════════════════════════════

  app.post('/qc/qualifications',
    requireRole('qc', 'qa'),
    async (req, res) => {
      try {
        const result = await qcLabService.createQualification({
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

  app.get('/qc/qualifications',
    requireAuth,
    async (req, res) => {
      try {
        const data = await qcLabService.listQualifications(req.query);
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // NOTE: /check/:analystId/:testMethod must be before /:qualId
  app.get('/qc/qualifications/check/:analystId/:testMethod',
    requireAuth,
    async (req, res) => {
      try {
        const data = await qcLabService.checkQualification(req.params.analystId, req.params.testMethod);
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.get('/qc/qualifications/:qualId',
    requireAuth,
    async (req, res) => {
      try {
        const data = await qcLabService.getQualification(req.params.qualId);
        res.json(data);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  app.put('/qc/qualifications/:qualId',
    requireRole('qc', 'qa'),
    async (req, res) => {
      try {
        const result = await qcLabService.updateQualification({
          qualId: req.params.qualId,
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

  // ══════════════════════════════════════════════════════════════════════
  // TEST METHODS
  // ══════════════════════════════════════════════════════════════════════

  app.post('/qc/methods',
    requireRole('qc', 'qa'),
    async (req, res) => {
      try {
        const result = await qcLabService.createMethod({
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

  app.get('/qc/methods',
    requireAuth,
    async (req, res) => {
      try {
        const data = await qcLabService.listMethods(req.query);
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.get('/qc/methods/:methodId',
    requireAuth,
    async (req, res) => {
      try {
        const data = await qcLabService.getMethod(req.params.methodId);
        res.json(data);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  app.put('/qc/methods/:methodId',
    requireRole('qc', 'qa'),
    async (req, res) => {
      try {
        const result = await qcLabService.updateMethod({
          methodId: req.params.methodId,
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

  // ══════════════════════════════════════════════════════════════════════
  // TEST TEMPLATES
  // ══════════════════════════════════════════════════════════════════════

  app.post('/qc/templates',
    requireRole('qc', 'qa'),
    async (req, res) => {
      try {
        const result = await qcLabService.createTemplate({
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

  app.get('/qc/templates',
    requireAuth,
    async (req, res) => {
      try {
        const data = await qcLabService.listTemplates(req.query);
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // NOTE: /for/:sampleType must be before /:templateId
  app.get('/qc/templates/for/:sampleType',
    requireAuth,
    async (req, res) => {
      try {
        const data = await qcLabService.getTemplatesForSampleType(req.params.sampleType);
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.get('/qc/templates/:templateId',
    requireAuth,
    async (req, res) => {
      try {
        const data = await qcLabService.getTemplate(req.params.templateId);
        res.json(data);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  app.put('/qc/templates/:templateId',
    requireRole('qc', 'qa'),
    async (req, res) => {
      try {
        const result = await qcLabService.updateTemplate({
          templateId: req.params.templateId,
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

  // ══════════════════════════════════════════════════════════════════════
  // COA
  // ══════════════════════════════════════════════════════════════════════

  app.get('/qc/samples/:sampleId/coa',
    requireAuth,
    async (req, res) => {
      try {
        const data = await qcLabService.generateCoa(req.params.sampleId);
        res.json(data);
      } catch (err) {
        const code = err.statusCode || 500;
        if (code < 500) return res.status(code).json({ error: err.message });
        res.status(500).json({ error: err.message });
      }
    });

  // ══════════════════════════════════════════════════════════════════════
  // STATS & WORKLOAD
  // ══════════════════════════════════════════════════════════════════════

  app.get('/qc/stats',
    requireAuth,
    async (req, res) => {
      try {
        const data = await qcLabService.getStats();
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.get('/qc/workload',
    requireAuth,
    async (req, res) => {
      try {
        const data = await qcLabService.getWorkload();
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // ══════════════════════════════════════════════════════════════════════
  // AI FEATURES
  // ══════════════════════════════════════════════════════════════════════

  app.post('/qc/ai/turnaround',
    requireRole('qc', 'qa'),
    async (req, res) => {
      try {
        const result = await qcLabService.aiTurnaround(req.body);
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/qc/ai/anomaly',
    requireRole('qc', 'qa'),
    async (req, res) => {
      try {
        const result = await qcLabService.aiAnomaly(req.body);
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/qc/ai/workload',
    requireRole('qc', 'qa'),
    async (req, res) => {
      try {
        const result = await qcLabService.aiWorkload();
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/qc/ai/priority',
    requireRole('qc', 'qa'),
    async (req, res) => {
      try {
        const result = await qcLabService.aiPriority();
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.post('/qc/ai/oos-rootcause',
    requireRole('qc', 'qa'),
    async (req, res) => {
      try {
        const result = await qcLabService.aiOosRootcause(req.body);
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
};
