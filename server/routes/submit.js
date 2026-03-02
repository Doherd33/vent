'use strict';

/**
 * routes/submit.js — Thin HTTP layer for the submission pipeline.
 *
 * All business logic lives in services/submission.service.js.
 * This file handles only validation, HTTP status codes, and response shaping.
 */

module.exports = function(app, { auth, submissionService }) {
  const { requireAuth } = auth;

  // GET /patterns?observation=...&area=... — standalone pattern search endpoint
  app.get('/patterns', requireAuth, async (req, res) => {
    const { observation, area } = req.query;
    if (!observation) return res.status(400).json({ error: 'observation query param required' });

    try {
      const patterns = await submissionService.findPatterns(observation, area);
      res.json(patterns);
    } catch (err) {
      console.error('[PATTERNS] Error:', err.message);
      res.status(500).json({ error: 'Pattern search failed' });
    }
  });

  // POST /submit — full submission pipeline
  app.post('/submit', requireAuth, async (req, res) => {
    const { observation, area, shift, willingToConsult } = req.body;

    if (!observation || observation.length < 10) {
      return res.status(400).json({ error: 'Observation too short' });
    }

    try {
      const { refCode, feedback } = await submissionService.processSubmission({
        observation, area, shift, willingToConsult, req,
      });
      res.json({ ...feedback, refCode });
    } catch (err) {
      console.error('[SUBMIT] Error:', err.message);
      res.status(500).json({ error: 'Something went wrong' });
    }
  });
};
