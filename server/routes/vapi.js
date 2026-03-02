'use strict';

/**
 * routes/vapi.js — VAPI webhook handler
 *
 * VAPI sends server messages to this endpoint during a voice call.
 * Message types we handle:
 *
 *   • function-call    — VAPI's assistant wants to execute a tool
 *   • end-of-call-report — call ended, save transcript + metadata
 *   • transcript       — real-time partial/final transcripts (logged)
 *   • hang             — call was hung up
 *   • status-update    — call status changes
 *   • assistant-request — dynamic assistant config (optional)
 *
 * The existing ElevenLabs STT/TTS endpoints remain active as fallback
 * for browsers that don't support WebRTC or when VAPI is unavailable.
 */

module.exports = function(app, { auth, voiceService, supabase, auditLog }) {
  const { requireAuth } = auth;

  // ── VAPI Webhook (POST /vapi/webhook) ─────────────────────────────────────
  // VAPI sends all server messages here. No auth middleware — VAPI signs
  // requests with a secret we can validate if needed.
  app.post('/vapi/webhook', async (req, res) => {
    const message = req.body.message || req.body;

    if (!message || !message.type) {
      return res.status(400).json({ error: 'Invalid VAPI message — missing type' });
    }

    console.log(`[VAPI] ${message.type}${message.functionCall ? ' → ' + message.functionCall.name : ''}`);

    try {
      switch (message.type) {
        // ── Tool / function calls ─────────────────────────────────────────
        case 'function-call': {
          const result = await handleFunctionCall(message.functionCall, voiceService);
          return res.json({ result });
        }

        // ── End-of-call report — persist transcript ───────────────────────
        case 'end-of-call-report': {
          await handleEndOfCall(message, supabase, auditLog);
          return res.json({ ok: true });
        }

        // ── Real-time transcript (partial + final) ────────────────────────
        case 'transcript': {
          // Log for debugging; could emit via SSE in future
          if (message.transcriptType === 'final') {
            console.log(`[VAPI:transcript] ${message.role}: ${message.transcript}`);
          }
          return res.json({ ok: true });
        }

        // ── Status updates ────────────────────────────────────────────────
        case 'status-update': {
          console.log(`[VAPI:status] ${message.status}`);
          return res.json({ ok: true });
        }

        // ── Hang / speech-update / other — acknowledge ────────────────────
        default: {
          return res.json({ ok: true });
        }
      }
    } catch (err) {
      console.error(`[VAPI] Error handling ${message.type}:`, err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── VAPI config endpoint — returns assistant ID for client bootstrap ─────
  app.get('/vapi/config', requireAuth, (req, res) => {
    const config = require('../lib/config');
    if (!config.vapiApiKey || !config.vapiAssistantId) {
      return res.json({ enabled: false });
    }
    res.json({
      enabled: true,
      assistantId: config.vapiAssistantId,
      // Public key is safe to expose to client (not the private API key)
      publicKey: config.vapiApiKey,
    });
  });
};

// ── Function call dispatcher ──────────────────────────────────────────────────

/**
 * Maps VAPI function-call names to voice service / agent methods.
 *
 * The VAPI assistant is configured with tools that match these names.
 * Each tool call receives parameters from the voice conversation.
 */
async function handleFunctionCall(call, voiceService) {
  if (!call || !call.name) throw new Error('Missing function call name');

  const { name, parameters } = call;

  switch (name) {
    // ── SOP search — operator asks about a procedure ──────────────────────
    case 'search_sops': {
      const result = await voiceService.askCharlie({
        question: parameters.query || parameters.question || '',
        context: parameters.context,
        lang: parameters.lang || 'en',
        history: [],
      });
      return { answer: result.answer, action: result.action, params: result.params };
    }

    // ── Raise a concern — submit an observation ───────────────────────────
    case 'raise_concern': {
      return {
        answer: 'I\'ve opened the concern form for you. Go ahead and describe what you observed.',
        action: 'open_concern',
        params: parameters.observation ? { prefill: parameters.observation } : {},
      };
    }

    // ── Check submissions — view recent activity ──────────────────────────
    case 'check_submissions': {
      return {
        answer: 'Opening your recent submissions now.',
        action: 'open_activity',
        params: {},
      };
    }

    // ── Start guided tour ─────────────────────────────────────────────────
    case 'start_tour': {
      return {
        answer: 'Sure, I\'ll walk you through the system. Watch for the highlighted areas.',
        action: 'start_tour',
        params: {},
      };
    }

    // ── Translate ─────────────────────────────────────────────────────────
    case 'translate': {
      const result = await voiceService.translate(
        parameters.text || '',
        parameters.target_lang || 'es',
        parameters.context,
      );
      return { answer: result.translated, action: 'none', params: {} };
    }

    // ── General question — full Charlie pipeline ──────────────────────────
    case 'ask_charlie':
    default: {
      const result = await voiceService.askCharlie({
        question: parameters.query || parameters.question || parameters.text || '',
        context: parameters.context,
        lang: parameters.lang || 'en',
        history: parameters.history || [],
      });
      return { answer: result.answer, action: result.action, params: result.params };
    }
  }
}

// ── End-of-call persistence ───────────────────────────────────────────────────

async function handleEndOfCall(message, supabase, auditLog) {
  const callId     = message.call?.id || 'unknown';
  const duration   = message.call?.duration || 0;
  const transcript = message.artifact?.transcript || '';
  const messages   = message.artifact?.messages || [];

  // Save to Supabase for analytics
  try {
    await supabase.from('voice_calls').insert({
      call_id:    callId,
      duration,
      transcript,
      messages:   JSON.stringify(messages),
      ended_at:   new Date().toISOString(),
      model:      message.call?.model || 'claude-sonnet-4',
      cost:       message.call?.cost || null,
    });
    console.log(`[VAPI] Call ${callId} saved (${duration}s, ${messages.length} messages)`);
  } catch (err) {
    // Table might not exist yet — that's OK
    console.warn(`[VAPI] Could not save call ${callId}:`, err.message);
  }

  // Audit log
  try {
    await auditLog({
      userId:     'voice-operator',
      userRole:   'operator',
      action:     'voice_call_ended',
      entityType: 'voice_call',
      entityId:   callId,
      after:      { duration, messageCount: messages.length },
      reason:     'VAPI voice call completed',
    });
  } catch (err) {
    console.warn('[VAPI] Audit log failed:', err.message);
  }
}
