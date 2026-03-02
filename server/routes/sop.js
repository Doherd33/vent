'use strict';

/**
 * routes/sop.js — Thin HTTP layer for SOP, submission, query, and notes routes.
 *
 * All business logic lives in services/sop.service.js.
 * This file handles validation, HTTP status codes, and response shaping.
 */

module.exports = function(app, { auth, sopService }) {
  const { requireAuth, requireRole } = auth;

  // ── SOP Discovery & Search ──────────────────────────────────────────────

  app.post('/sop/discover', requireAuth, async (req, res) => {
    const { description } = req.body;
    if (!description || description.length < 5) {
      return res.status(400).json({ error: 'Description too short' });
    }
    try {
      const result = await sopService.discoverSops(description);
      res.json(result);
    } catch (err) {
      console.error('SOP discover error:', err);
      res.status(500).json({ error: 'Failed to find SOPs' });
    }
  });

  app.get('/sop/search', requireAuth, async (req, res) => {
    try {
      const results = await sopService.searchSops(req.query.q);
      res.json(results);
    } catch (err) {
      console.error('SOP search error:', err);
      res.status(500).json({ error: 'Failed to search SOPs' });
    }
  });

  // ── SOP Document Access ─────────────────────────────────────────────────

  app.get('/sop/:docId', requireAuth, async (req, res) => {
    try {
      const data = await sopService.fetchDocument(req.params.docId);
      res.json(data);
    } catch (err) {
      console.error('SOP fetch error:', err);
      res.status(500).json({ error: 'Failed to fetch SOP' });
    }
  });

  app.get('/sop/:docId/chunk', requireAuth, async (req, res) => {
    try {
      const chunk = await sopService.fetchChunk(req.params.docId, (req.query.section || '').trim());
      res.json(chunk);
    } catch (err) {
      console.error('SOP chunk error:', err);
      res.status(500).json({ error: 'Failed to fetch SOP chunk' });
    }
  });

  app.get('/sop/:docId/rationale', requireAuth, (req, res) => {
    try {
      const data = sopService.fetchRationale(req.params.docId);
      res.json(data);
    } catch (err) {
      console.error('Rationale fetch error:', err);
      res.status(500).json({ error: 'Failed to load rationale' });
    }
  });

  // ── SOP Q&A ─────────────────────────────────────────────────────────────

  app.post('/sop/:docId/ask', requireAuth, async (req, res) => {
    const { question } = req.body;
    if (!question || question.length < 3) {
      return res.status(400).json({ error: 'Question too short' });
    }
    try {
      const answer = await sopService.askDocumentQuestion(req.params.docId, question);
      if (answer === null) return res.status(404).json({ error: 'No content found for this document' });
      res.json({ answer });
    } catch (err) {
      console.error('SOP ask error:', err);
      res.status(500).json({ error: 'Failed to answer question' });
    }
  });

  // ── Submissions ─────────────────────────────────────────────────────────

  app.get('/submissions', requireAuth, async (req, res) => {
    try {
      const data = await sopService.listSubmissions();
      res.json(data);
    } catch (err) {
      console.error('Supabase fetch error:', err);
      res.status(500).json({ error: 'Failed to fetch submissions' });
    }
  });

  app.get('/submissions/:refCode', requireAuth, async (req, res) => {
    try {
      const data = await sopService.getSubmission(req.params.refCode);
      if (!data) return res.status(404).json({ error: 'Submission not found' });
      res.json(data);
    } catch (err) {
      console.error('Submission fetch error:', err);
      res.status(500).json({ error: 'Failed to fetch submission' });
    }
  });

  app.patch('/submissions/:refCode/status', requireRole('qa', 'director', 'admin'), async (req, res) => {
    const { status, userId, userRole, reason, meaning } = req.body;
    try {
      const result = await sopService.updateSubmissionStatus({
        refCode: req.params.refCode, status, userId, userRole, reason, meaning, req,
      });
      res.json({ ok: true, ...result });
    } catch (err) {
      const code = err.statusCode || 500;
      if (code < 500) return res.status(code).json({ error: err.message });
      console.error('Status update error:', err);
      res.status(500).json({ error: 'Failed to update status' });
    }
  });

  // ── Operator knowledge query ────────────────────────────────────────────

  app.post('/query', requireAuth, async (req, res) => {
    const { question, area, history } = req.body;
    if (!question || question.length < 5) {
      return res.status(400).json({ error: 'Question too short' });
    }
    try {
      const answer = await sopService.queryKnowledge({ question, area, history });
      res.json(answer);
    } catch (err) {
      console.error('Query error:', err);
      res.status(500).json({ error: 'Query failed' });
    }
  });

  // ── SOP Ingest ──────────────────────────────────────────────────────────

  app.post('/ingest', requireRole('admin'), async (req, res) => {
    try {
      const result = await sopService.ingestSops();
      res.json(result);
    } catch (err) {
      console.error('Ingest error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Notes ───────────────────────────────────────────────────────────────

  app.get('/notes', requireAuth, async (req, res) => {
    try {
      const data = await sopService.getNotes();
      res.json(data);
    } catch (err) {
      if (err.message && err.message.includes('does not exist')) return res.json([]);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/notes', requireAuth, async (req, res) => {
    const { content, userId } = req.body;
    try {
      const result = await sopService.saveNotes(content, userId);
      res.json(result);
    } catch (err) {
      if (err.message && err.message.includes('does not exist')) {
        return res.status(400).json({ error: 'qa_notes table does not exist. Run the setup SQL.' });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // ── SOP Change Management ──────────────────────────────────────────────

  app.get('/sop-changes/:submissionRef', requireAuth, async (req, res) => {
    try {
      const data = await sopService.getSopChanges(req.params.submissionRef);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/sop-changes', requireRole('qa', 'director', 'admin'), async (req, res) => {
    const { submissionRef, sopCode, section, action, draft, reason, userId, userRole } = req.body;
    if (!submissionRef || !sopCode || !action) {
      return res.status(400).json({ error: 'submissionRef, sopCode, and action are required' });
    }
    try {
      const result = await sopService.upsertSopChange({
        submissionRef, sopCode, section, action, draft, reason, userId, userRole, req,
      });
      res.json(result);
    } catch (err) {
      if (err.message && err.message.includes('does not exist')) {
        return res.status(400).json({ error: 'sop_changes table does not exist. Run the setup SQL.' });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // ── SOP Annotations ────────────────────────────────────────────────────

  app.get('/sop-annotations/:submissionRef', requireAuth, async (req, res) => {
    try {
      const data = await sopService.getSopAnnotations(req.params.submissionRef);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/sop-annotations', requireAuth, async (req, res) => {
    const { submissionRef, sopCode, section, text, userId, userRole } = req.body;
    if (!submissionRef || !sopCode || !text) {
      return res.status(400).json({ error: 'submissionRef, sopCode, and text are required' });
    }
    try {
      const result = await sopService.addSopAnnotation({
        submissionRef, sopCode, section, text, userId, userRole, req,
      });
      res.json(result);
    } catch (err) {
      if (err.message && err.message.includes('does not exist')) {
        return res.status(400).json({ error: 'sop_annotations table does not exist. Run the setup SQL.' });
      }
      res.status(500).json({ error: err.message });
    }
  });
};
