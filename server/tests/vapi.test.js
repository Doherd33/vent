'use strict';

const { mockSupabase, mockAuditLog, mockAnthropic, mockRag } = require('./helpers');

describe('vapi webhook', () => {
  // Simulate the VAPI route handler directly (no HTTP server needed)
  function buildHandler() {
    const supabase = mockSupabase();
    const auditLog = mockAuditLog();
    const anthropic = mockAnthropic(JSON.stringify({
      answer: 'Check viability every four hours.',
      action: 'none',
      params: {},
    }));
    const rag = mockRag();
    const makeVoiceService = require('../services/voice.service');
    const voiceService = makeVoiceService({ anthropic, rag, elevenLabsApiKey: 'test' });

    // Collect registered routes
    const routes = {};
    const fakeApp = {
      post: vi.fn((path, ...handlers) => { routes[`POST ${path}`] = handlers[handlers.length - 1]; }),
      get:  vi.fn((path, ...handlers) => { routes[`GET ${path}`]  = handlers[handlers.length - 1]; }),
    };
    const auth = { requireAuth: (req, res, next) => next(), requireRole: () => (req, res, next) => next() };

    require('../routes/vapi')(fakeApp, { auth, voiceService, supabase, auditLog });

    return { routes, supabase, auditLog, voiceService };
  }

  function mockRes() {
    const res = {
      statusCode: 200,
      body: null,
      status: vi.fn(function(code) { res.statusCode = code; return res; }),
      json: vi.fn(function(data) { res.body = data; return res; }),
    };
    return res;
  }

  it('registers POST /vapi/webhook and GET /vapi/config', () => {
    const { routes } = buildHandler();
    expect(routes['POST /vapi/webhook']).toBeDefined();
    expect(routes['GET /vapi/config']).toBeDefined();
  });

  it('returns 400 for missing message type', async () => {
    const { routes } = buildHandler();
    const res = mockRes();
    await routes['POST /vapi/webhook']({ body: {} }, res);
    expect(res.statusCode).toBe(400);
  });

  it('handles function-call with ask_charlie', async () => {
    const { routes } = buildHandler();
    const res = mockRes();
    await routes['POST /vapi/webhook']({
      body: {
        message: {
          type: 'function-call',
          functionCall: {
            name: 'ask_charlie',
            parameters: { question: 'When do I check viability?', lang: 'en' },
          },
        },
      },
    }, res);

    expect(res.body.result).toBeDefined();
    expect(res.body.result.answer).toContain('viability');
  });

  it('handles function-call with raise_concern', async () => {
    const { routes } = buildHandler();
    const res = mockRes();
    await routes['POST /vapi/webhook']({
      body: {
        message: {
          type: 'function-call',
          functionCall: {
            name: 'raise_concern',
            parameters: { observation: 'pH is off' },
          },
        },
      },
    }, res);

    expect(res.body.result.action).toBe('open_concern');
  });

  it('handles end-of-call-report', async () => {
    const { routes, supabase } = buildHandler();
    const res = mockRes();
    await routes['POST /vapi/webhook']({
      body: {
        message: {
          type: 'end-of-call-report',
          call: { id: 'call-123', duration: 45 },
          artifact: { transcript: 'test transcript', messages: [{ role: 'user', content: 'hi' }] },
        },
      },
    }, res);

    expect(res.body.ok).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('voice_calls');
  });

  it('handles transcript message', async () => {
    const { routes } = buildHandler();
    const res = mockRes();
    await routes['POST /vapi/webhook']({
      body: {
        message: { type: 'transcript', transcriptType: 'final', role: 'user', transcript: 'hello' },
      },
    }, res);

    expect(res.body.ok).toBe(true);
  });

  it('handles unknown message type gracefully', async () => {
    const { routes } = buildHandler();
    const res = mockRes();
    await routes['POST /vapi/webhook']({
      body: { message: { type: 'some-future-event' } },
    }, res);

    expect(res.body.ok).toBe(true);
  });
});
