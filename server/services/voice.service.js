'use strict';

/**
 * services/voice.service.js
 *
 * Owns voice-related business logic:
 *   - ElevenLabs STT (speech-to-text) proxy
 *   - ElevenLabs TTS (text-to-speech) proxy
 *   - Claude-powered translation
 *   - Charlie voice assistant (delegates to agents/charlie.js)
 *
 * Routes should call these functions and handle only HTTP concerns.
 */

const makeCharlieAgent   = require('../agents/charlie');
const makeSopQueryAgent  = require('../agents/sop-query');

const LANG_NAMES = { en: 'English', zh: 'Simplified Chinese', es: 'Spanish' };
const VALID_STT_LANGS = ['eng', 'cmn', 'spa'];

function makeVoiceService({ anthropic, rag, elevenLabsApiKey }) {
  const charlie  = makeCharlieAgent(anthropic);
  const sopQuery = rag ? makeSopQueryAgent(anthropic, rag) : null;

  // ── ElevenLabs STT ──────────────────────────────────────────────────────

  /**
   * Transcribe audio via ElevenLabs Scribe.
   *
   * @param {string} audioBase64  Base64-encoded audio
   * @param {string} [mimeType]   Audio MIME type (default: audio/webm)
   * @param {string} [langCode]   Language code (eng, cmn, spa)
   * @returns {{ text: string }}
   */
  async function transcribe(audioBase64, mimeType = 'audio/webm', langCode) {
    if (!elevenLabsApiKey) throw new Error('ElevenLabs API key not configured');
    if (!audioBase64) throw new Error('Audio data is required');

    const audioBuffer = Buffer.from(audioBase64, 'base64');

    const boundary = 'vent-stt-' + Date.now();
    const parts = [
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="recording.webm"\r\nContent-Type: ${mimeType}\r\n\r\n`,
      audioBuffer,
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model_id"\r\n\r\nscribe_v1`,
      ...(langCode && VALID_STT_LANGS.includes(langCode)
        ? [`\r\n--${boundary}\r\nContent-Disposition: form-data; name="language_code"\r\n\r\n${langCode}`]
        : []),
      `\r\n--${boundary}--\r\n`,
    ];
    const body = Buffer.concat(parts.map(p => typeof p === 'string' ? Buffer.from(p) : p));

    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': elevenLabsApiKey,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[STT] ElevenLabs error:', err);
      const e = new Error('ElevenLabs STT failed');
      e.status = response.status;
      e.detail = err;
      throw e;
    }

    const data = await response.json();
    return { text: data.text || '' };
  }

  // ── ElevenLabs TTS ──────────────────────────────────────────────────────

  /**
   * Synthesise speech via ElevenLabs.
   *
   * @param {string} text           Text to speak
   * @param {object} [opts]         Voice settings overrides
   * @returns {Buffer}              MP3 audio buffer
   */
  async function synthesise(text, opts = {}) {
    if (!elevenLabsApiKey) throw new Error('ElevenLabs API key not configured');
    if (!text) throw new Error('Text is required');

    const voiceId = opts.voiceId || 'pNInz6obpgDQGcFmaJgB';
    const modelId = opts.modelId || 'eleven_multilingual_v2';

    const voice_settings = {
      stability:         opts.stability        ?? 0.5,
      similarity_boost:  opts.similarity_boost ?? 0.75,
      style:             opts.style            ?? 0.3,
      use_speaker_boost: opts.use_speaker_boost ?? true,
    };

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': elevenLabsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, model_id: modelId, voice_settings }),
    });

    if (!response.ok) {
      const err = await response.text();
      const e = new Error('ElevenLabs TTS failed');
      e.status = response.status;
      e.detail = err;
      throw e;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // ── Translation ─────────────────────────────────────────────────────────

  /**
   * Translate text using Claude, specialised in pharma terminology.
   *
   * @param {string} text        Text to translate
   * @param {string} targetLang  Target language code (en, zh, es)
   * @param {string} [context]   Optional context to improve translation
   * @returns {{ translated: string, lang: string }}
   */
  async function translate(text, targetLang, context) {
    const target = LANG_NAMES[targetLang];
    if (!target) throw new Error('Unsupported language. Use en, zh, or es.');

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `You are a translator specialising in pharmaceutical manufacturing and GMP terminology. Translate the given text into ${target}. Preserve any technical terms, SOP references, or batch record numbers exactly. Return ONLY the translated text, no explanations.`,
      messages: [{ role: 'user', content: context ? `Context: ${context}\n\nTranslate: ${text}` : text }],
    });

    return { translated: message.content[0].text, lang: targetLang };
  }

  // ── Charlie ─────────────────────────────────────────────────────────────

  /**
   * Ask Charlie a question. Optionally retrieves SOP context first.
   *
   * @param {object} params
   * @param {string} params.question
   * @param {string} [params.context]  Current UI context
   * @param {string} [params.lang]
   * @param {Array}  [params.history]
   * @returns {{ answer: string, action: string, params: object }}
   */
  async function askCharlie({ question, context, lang, history, mode }) {
    // Optionally enrich with SOP context for grounded answers
    let sopContext;
    if (sopQuery) {
      try {
        const sopResult = await sopQuery.invoke({ query: question, area: 'General' });
        if (sopResult.sources && sopResult.sources.length > 0) {
          sopContext = sopResult.sources
            .map(s => `[${s.docId}] ${s.section}: ${s.excerpt}`)
            .join('\n');
        }
      } catch (err) {
        console.warn('[CHARLIE] SOP context retrieval failed:', err.message);
      }
    }

    return charlie.invoke({ question, context, lang, history, sopContext, mode });
  }

  return { transcribe, synthesise, translate, askCharlie };
}

module.exports = makeVoiceService;
