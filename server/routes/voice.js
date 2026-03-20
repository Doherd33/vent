'use strict';

/**
 * routes/voice.js — Thin HTTP layer for voice, translation, and Charlie routes.
 *
 * All business logic lives in services/voice.service.js.
 * This file handles validation, HTTP status codes, and response shaping.
 */

module.exports = function(app, { auth, voiceService }) {
  const { requireAuth } = auth;

  // ── Speech-to-Text ────────────────────────────────────────────────────────
  app.post('/stt', async (req, res) => {
    const { audio, mimeType, language_code } = req.body;
    if (!audio) return res.status(400).json({ error: 'Audio data is required' });

    try {
      const result = await voiceService.transcribe(audio, mimeType, language_code);
      res.json(result);
    } catch (err) {
      console.error('[STT] Error:', err.message);
      res.status(err.status || 500).json({ error: err.detail || 'Speech-to-text failed' });
    }
  });

  // ── Text-to-Speech ────────────────────────────────────────────────────────
  app.post('/tts', async (req, res) => {
    const { text, voiceId, modelId, stability, similarity_boost, style, use_speaker_boost } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });

    try {
      const audioBuffer = await voiceService.synthesise(text, {
        voiceId, modelId, stability, similarity_boost, style, use_speaker_boost,
      });
      res.set('Content-Type', 'audio/mpeg');
      res.send(audioBuffer);
    } catch (err) {
      console.error('[TTS] Error:', err.message);
      res.status(err.status || 500).json({ error: err.detail || 'TTS request failed' });
    }
  });

  // ── Translation ───────────────────────────────────────────────────────────
  app.post('/translate', requireAuth, async (req, res) => {
    const { text, targetLang, context } = req.body;
    if (!text || !targetLang) return res.status(400).json({ error: 'text and targetLang are required' });

    try {
      const result = await voiceService.translate(text, targetLang, context);
      res.json(result);
    } catch (err) {
      console.error('[TRANSLATE] Error:', err.message);
      res.status(400).json({ error: err.message });
    }
  });

  // ── Charlie Voice Assistant ───────────────────────────────────────────────
  app.post('/charlie/ask', requireAuth, async (req, res) => {
    const { question, context, lang, history, mode } = req.body;
    if (!question) return res.status(400).json({ error: 'question is required' });

    try {
      const result = await voiceService.askCharlie({ question, context, lang, history, mode });
      res.json(result);
    } catch (err) {
      console.error('[CHARLIE/ASK] Error:', err.message);
      res.status(500).json({ error: 'Could not answer question' });
    }
  });
};
