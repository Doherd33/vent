'use strict';

module.exports = function(app, { anthropic, auth }) {
  const { requireAuth } = auth;

  // ─── ELEVENLABS SPEECH-TO-TEXT PROXY ──────────────────────────────────────────
  app.post('/stt', async (req, res) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'ElevenLabs API key not configured' });

    const { audio, mimeType = 'audio/webm', language_code } = req.body;
    if (!audio) return res.status(400).json({ error: 'Audio data is required' });

    try {
      const audioBuffer = Buffer.from(audio, 'base64');

      // Build multipart/form-data manually
      const boundary = 'vent-stt-' + Date.now();
      const validLangs = ['eng', 'cmn', 'spa'];
      const parts = [
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="recording.webm"\r\nContent-Type: ${mimeType}\r\n\r\n`,
        audioBuffer,
        `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model_id"\r\n\r\nscribe_v1`,
        ...(language_code && validLangs.includes(language_code) ? [`\r\n--${boundary}\r\nContent-Disposition: form-data; name="language_code"\r\n\r\n${language_code}`] : []),
        `\r\n--${boundary}--\r\n`,
      ];
      const body = Buffer.concat(parts.map(p => typeof p === 'string' ? Buffer.from(p) : p));

      const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body,
      });

      if (!response.ok) {
        const err = await response.text();
        console.error('[STT] ElevenLabs error:', err);
        return res.status(response.status).json({ error: err });
      }

      const data = await response.json();
      res.json({ text: data.text || '' });
    } catch (err) {
      console.error('[STT] Error:', err.message);
      res.status(500).json({ error: 'Speech-to-text failed' });
    }
  });

  // ─── ELEVENLABS TTS PROXY ────────────────────────────────────────────────────
  app.post('/tts', async (req, res) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'ElevenLabs API key not configured' });

    const { text, voiceId = 'pNInz6obpgDQGcFmaJgB', modelId = 'eleven_multilingual_v2',
            stability, similarity_boost, style, use_speaker_boost } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });

    try {
      const voice_settings = {
        stability:        (stability        !== undefined && stability        !== null) ? Number(stability)        : 0.5,
        similarity_boost: (similarity_boost !== undefined && similarity_boost !== null) ? Number(similarity_boost) : 0.75,
        style:            (style            !== undefined && style            !== null) ? Number(style)            : 0.3,
        use_speaker_boost: (use_speaker_boost !== undefined) ? Boolean(use_speaker_boost) : true,
      };

      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        return res.status(response.status).json({ error: err });
      }

      res.set('Content-Type', 'audio/mpeg');
      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (err) {
      console.error('[TTS] Error:', err.message);
      res.status(500).json({ error: 'TTS request failed' });
    }
  });

  // ─── TRANSLATION ENDPOINT (Claude-powered) ──────────────────────────────────
  app.post('/translate', requireAuth, async (req, res) => {
    const { text, targetLang, context } = req.body;
    if (!text || !targetLang) return res.status(400).json({ error: 'text and targetLang are required' });

    const langNames = { en: 'English', zh: 'Simplified Chinese', es: 'Spanish' };
    const target = langNames[targetLang];
    if (!target) return res.status(400).json({ error: 'Unsupported language. Use en, zh, or es.' });

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: `You are a translator specialising in pharmaceutical manufacturing and GMP terminology. Translate the given text into ${target}. Preserve any technical terms, SOP references, or batch record numbers exactly. Return ONLY the translated text, no explanations.`,
        messages: [{ role: 'user', content: context ? `Context: ${context}\n\nTranslate: ${text}` : text }],
      });
      const translated = message.content[0].text;
      res.json({ translated, lang: targetLang });
    } catch (err) {
      console.error('[TRANSLATE] Error:', err.message);
      res.status(500).json({ error: 'Translation failed' });
    }
  });

  // ── Charlie Voice Assistant ──────────────────────────────────────────────────
  app.post('/charlie/ask', requireAuth, async (req, res) => {
    const { question, context, lang, history } = req.body;
    if (!question) return res.status(400).json({ error: 'question is required' });

    const langNames = { en: 'English', zh: 'Chinese (Mandarin)', es: 'Spanish' };
    const targetLang = langNames[lang] || 'English';

    const messages = [];
    if (history && history.length) {
      history.slice(-8).forEach(h => {
        messages.push({ role: 'user', content: h.q });
        messages.push({ role: 'assistant', content: JSON.stringify({ answer: h.a, action: 'none', params: {} }) });
      });
    }
    messages.push({ role: 'user', content: question });

    const contextLine = context ? `\nThe user is currently viewing: ${context}\n` : '';

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 650,
        system: `You are Charlie — the resident expert voice assistant for Vent, a manufacturing intelligence platform used daily by operators, QA engineers, and management at a pharmaceutical biologics facility.
${contextLine}
Your personality and speech style:
- You speak the way a highly experienced senior manufacturing expert talks — confident, warm, occasionally dry-humoured, always clear
- You know this facility inside out. You know the SOPs, the equipment, the shifts, the common pain points, the regulatory expectations
- Your tone is collegial — you're a trusted colleague, not a helpdesk bot
- You never use bullet points, numbered lists, or headers in your spoken answers — you speak in flowing natural sentences
- Vary your sentence length. Short punchy sentences when landing a key point. Slightly longer when explaining something. Never monotonous
- Use natural connectors: "So what's happening here is...", "The short answer is...", "Honestly...", "What I'd do is...", "The tricky bit is..."
- Acknowledge the question before answering when it helps flow: "Good question — " or "Right, so — "
- Never be robotic or overly formal. Never say "Certainly!" or "Of course!" or "Absolutely!" — these sound synthetic
- If you don't know something specific to the facility, say so plainly: "I don't have that in front of me, but..."
- Aim for 2-4 natural spoken sentences per answer — enough to be genuinely helpful without rambling

You can execute these actions (return ONE if appropriate):
- new_chat: Start a fresh conversation
- open_history / close_history: Toggle chat history sidebar
- open_sops / close_sops: Toggle SOP library sidebar
- open_todos / close_todos: Toggle to-do list sidebar
- open_concern / close_concern: Toggle "Raise a Concern" panel
- open_gdp / close_gdp: Toggle GDP document check
- open_activity / close_activity: Toggle submissions/activity drawer
- start_tour / end_tour: Start/stop guided demo tour
- scroll_bottom: Scroll to latest message
- ask_query: Send a question to the AI chat (params: { "query": "..." })
- search_sops: Search SOP library (params: { "query": "..." })
- switch_lang: Change language (params: { "lang": "en"|"zh"|"es" })
- analyse_trends: Analyse chat history trends
- none: No action, just answer the question

Respond with valid JSON only: { "answer": "...", "action": "...", "params": {} }
The "answer" field must be natural spoken text — no markdown, no bullets, no headers. Respond in ${targetLang}.`,
        messages: messages,
      });

      const raw = response.content[0].text;
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        // If Claude didn't return JSON, wrap it
        parsed = { answer: raw, action: 'none', params: {} };
      }
      res.json({
        answer: parsed.answer || raw,
        action: parsed.action || 'none',
        params: parsed.params || {}
      });
    } catch (err) {
      console.error('[CHARLIE/ASK] Error:', err.message);
      res.status(500).json({ error: 'Could not answer question' });
    }
  });
};
