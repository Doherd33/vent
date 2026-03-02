'use strict';

/**
 * tests/voice-pipeline.test.js — Integration tests for the full voice pipeline
 *
 * Tests the end-to-end flow: STT ↔ Charlie agent ↔ SOP query ↔ TTS
 * and VAPI webhook handling with realistic payloads.
 *
 * These use mocked external services (ElevenLabs, Anthropic) but exercise
 * the full service + agent chain.
 */

const { mockAnthropic, mockRag, mockAuditLog, mockSupabase } = require('./helpers');

describe('voice pipeline integration', () => {

  // ── Charlie + SOP Query agent chain ─────────────────────────────────────
  describe('Charlie with SOP grounding', () => {
    it('enriches Charlie answers with SOP context', async () => {
      // SOP query agent returns SOP context, then Charlie uses it
      let callCount = 0;
      const anthropic = {
        messages: {
          create: vi.fn(async (opts) => {
            callCount++;
            if (callCount === 1) {
              // First call: SOP query agent
              return {
                content: [{ type: 'text', text: JSON.stringify({
                  answer: 'Per SOP WX-SOP-1001-03 section 8.6.1.4, check viability every 4 hours.',
                  sources: [{ docId: 'WX-SOP-1001-03', title: 'Perfusion', section: '8.6.1.4', excerpt: 'Monitor viability q4h' }],
                })}],
              };
            } else {
              // Second call: Charlie agent (should have SOP context in system prompt)
              const system = opts.system || '';
              const hasSopContext = system.includes('WX-SOP-1001-03') || system.includes('8.6.1.4');
              return {
                content: [{ type: 'text', text: JSON.stringify({
                  answer: hasSopContext
                    ? 'Good question — per SOP section 8.6.1.4 you should check viability every four hours during perfusion.'
                    : 'You should check viability regularly.',
                  action: 'none',
                  params: {},
                })}],
              };
            }
          }),
        },
      };

      const rag = mockRag();
      const makeVoiceService = require('../services/voice.service');
      const service = makeVoiceService({ anthropic, rag, elevenLabsApiKey: 'test' });

      const result = await service.askCharlie({
        question: 'When should I check cell viability?',
        lang: 'en',
      });

      // Charlie should have received SOP-grounded context
      expect(result.answer).toContain('8.6.1.4');
      expect(anthropic.messages.create).toHaveBeenCalledTimes(2);
    });

    it('falls back gracefully when SOP query fails', async () => {
      const anthropic = {
        messages: {
          create: vi.fn(async (opts) => {
            // First call (SOP query) → throws
            if (!opts.system || !opts.system.includes('Charlie')) {
              throw new Error('Embedding service unavailable');
            }
            // Second call (Charlie) → answers without SOP context
            return {
              content: [{ type: 'text', text: JSON.stringify({
                answer: 'I don\'t have the specific SOP in front of me, but generally check every four hours.',
                action: 'none',
                params: {},
              })}],
            };
          }),
        },
      };

      const rag = mockRag();
      rag.getRelevantChunks.mockRejectedValue(new Error('Embedding service unavailable'));

      const makeVoiceService = require('../services/voice.service');
      const service = makeVoiceService({ anthropic, rag, elevenLabsApiKey: 'test' });

      const result = await service.askCharlie({
        question: 'When should I check cell viability?',
      });

      // Should still get a reasonable answer
      expect(result.answer).toBeTruthy();
      expect(result.action).toBe('none');
    });
  });

  // ── VAPI function-call round-trips ──────────────────────────────────────
  describe('VAPI function-call round-trips', () => {
    function buildVapiHandler() {
      const anthropic = mockAnthropic(JSON.stringify({
        answer: 'The bioreactor temperature should be maintained at 37°C per SOP 1003.',
        action: 'search_sops',
        params: { query: 'bioreactor temperature' },
      }));
      const rag = mockRag();
      const supabase = mockSupabase();
      const auditLog = mockAuditLog();

      const makeVoiceService = require('../services/voice.service');
      const voiceService = makeVoiceService({ anthropic, rag, elevenLabsApiKey: 'test' });

      const routes = {};
      const fakeApp = {
        post: vi.fn((path, ...handlers) => { routes[`POST ${path}`] = handlers[handlers.length - 1]; }),
        get:  vi.fn((path, ...handlers) => { routes[`GET ${path}`]  = handlers[handlers.length - 1]; }),
      };
      const auth = { requireAuth: (req, res, next) => next(), requireRole: () => (req, res, next) => next() };

      require('../routes/vapi')(fakeApp, { auth, voiceService, supabase, auditLog });

      return { routes, supabase, anthropic };
    }

    function mockRes() {
      const res = { statusCode: 200, body: null };
      res.status = vi.fn(code => { res.statusCode = code; return res; });
      res.json = vi.fn(data => { res.body = data; return res; });
      return res;
    }

    it('search_sops returns answer + action', async () => {
      const { routes } = buildVapiHandler();
      const res = mockRes();

      await routes['POST /vapi/webhook']({
        body: {
          message: {
            type: 'function-call',
            functionCall: {
              name: 'search_sops',
              parameters: { query: 'What temperature for the bioreactor?' },
            },
          },
        },
      }, res);

      expect(res.body.result.answer).toContain('37°C');
      expect(res.body.result.action).toBe('search_sops');
    });

    it('start_tour returns correct action', async () => {
      const { routes } = buildVapiHandler();
      const res = mockRes();

      await routes['POST /vapi/webhook']({
        body: {
          message: {
            type: 'function-call',
            functionCall: { name: 'start_tour', parameters: {} },
          },
        },
      }, res);

      expect(res.body.result.action).toBe('start_tour');
      expect(res.body.result.answer).toContain('walk you through');
    });

    it('check_submissions returns open_activity action', async () => {
      const { routes } = buildVapiHandler();
      const res = mockRes();

      await routes['POST /vapi/webhook']({
        body: {
          message: {
            type: 'function-call',
            functionCall: { name: 'check_submissions', parameters: {} },
          },
        },
      }, res);

      expect(res.body.result.action).toBe('open_activity');
    });

    it('end-of-call saves transcript and audits', async () => {
      const { routes, supabase } = buildVapiHandler();
      const res = mockRes();

      await routes['POST /vapi/webhook']({
        body: {
          message: {
            type: 'end-of-call-report',
            call: { id: 'call-456', duration: 120, model: 'claude-sonnet-4', cost: 0.05 },
            artifact: {
              transcript: 'User: What temp? Assistant: 37 degrees.',
              messages: [
                { role: 'user', content: 'What temp?' },
                { role: 'assistant', content: '37 degrees.' },
              ],
            },
          },
        },
      }, res);

      expect(res.body.ok).toBe(true);
      // Verify Supabase insert was called with correct table
      expect(supabase.from).toHaveBeenCalledWith('voice_calls');
    });
  });

  // ── Conversation history handling ───────────────────────────────────────
  describe('conversation continuity', () => {
    it('passes history to Charlie agent', async () => {
      const anthropic = {
        messages: {
          create: vi.fn(async (opts) => {
            // SOP query agent call
            if (!opts.system || !opts.system.includes('Charlie')) {
              return { content: [{ type: 'text', text: JSON.stringify({ answer: 'ok', sources: [] }) }] };
            }
            // Charlie call — check that history messages are in the messages array
            const hasHistory = opts.messages.length > 1;
            return {
              content: [{ type: 'text', text: JSON.stringify({
                answer: hasHistory ? 'Following up on your previous question about pH...' : 'What about pH?',
                action: 'none',
                params: {},
              })}],
            };
          }),
        },
      };

      const rag = mockRag();
      const makeVoiceService = require('../services/voice.service');
      const service = makeVoiceService({ anthropic, rag, elevenLabsApiKey: 'test' });

      const result = await service.askCharlie({
        question: 'What should I do about that?',
        history: [
          { q: 'pH is reading 6.8', a: 'That is below the 7.0 minimum per SOP 1001.' },
        ],
      });

      expect(result.answer).toContain('previous question');
      // Anthropic should have received history messages
      const charlieCall = anthropic.messages.create.mock.calls.find(
        c => c[0].system && c[0].system.includes('Charlie')
      );
      // history (2 msgs) + current question = 3 messages minimum
      expect(charlieCall[0].messages.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ── Multilingual support ────────────────────────────────────────────────
  describe('multilingual', () => {
    it('translation service returns correct language tag', async () => {
      const anthropic = mockAnthropic('La viabilidad celular bajó al 72%.');
      const rag = mockRag();
      const makeVoiceService = require('../services/voice.service');
      const service = makeVoiceService({ anthropic, rag, elevenLabsApiKey: 'test' });

      const result = await service.translate('Cell viability dropped to 72%.', 'es', 'Manufacturing floor');

      expect(result.translated).toContain('viabilidad');
      expect(result.lang).toBe('es');
    });

    it('Charlie respects language parameter', async () => {
      const anthropic = {
        messages: {
          create: vi.fn(async (opts) => {
            if (!opts.system || !opts.system.includes('Charlie')) {
              return { content: [{ type: 'text', text: JSON.stringify({ answer: 'ok', sources: [] }) }] };
            }
            const isSpanish = opts.system.includes('Spanish');
            return {
              content: [{ type: 'text', text: JSON.stringify({
                answer: isSpanish ? 'Claro, revisemos la viabilidad.' : 'Sure, let me check viability.',
                action: 'none',
                params: {},
              })}],
            };
          }),
        },
      };

      const rag = mockRag();
      const makeVoiceService = require('../services/voice.service');
      const service = makeVoiceService({ anthropic, rag, elevenLabsApiKey: 'test' });

      const result = await service.askCharlie({
        question: '¿Cuándo debo verificar la viabilidad?',
        lang: 'es',
      });

      expect(result.answer).toContain('viabilidad');
    });
  });
});
