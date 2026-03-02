'use strict';

const { mockAnthropic, mockRag } = require('./helpers');

describe('voice.service', () => {
  function buildService(overrides = {}) {
    const anthropic = overrides.anthropic || mockAnthropic(JSON.stringify({
      answer: 'Check viability every four hours.',
      action: 'none',
      params: {},
    }));
    const rag = overrides.rag || mockRag();

    const makeService = require('../services/voice.service');
    return {
      service: makeService({ anthropic, rag, elevenLabsApiKey: 'test-key' }),
      anthropic,
      rag,
    };
  }

  it('exports transcribe, synthesise, translate, askCharlie', () => {
    const { service } = buildService();
    expect(typeof service.transcribe).toBe('function');
    expect(typeof service.synthesise).toBe('function');
    expect(typeof service.translate).toBe('function');
    expect(typeof service.askCharlie).toBe('function');
  });

  it('askCharlie delegates to Charlie agent and returns answer', async () => {
    const { service, anthropic } = buildService();

    const result = await service.askCharlie({ question: 'When do I check viability?', lang: 'en' });

    expect(result.answer).toContain('viability');
    expect(result.action).toBe('none');
    // Should have called anthropic twice: once for SOP query, once for Charlie
    expect(anthropic.messages.create).toHaveBeenCalledTimes(2);
  });

  it('translate rejects unsupported language', async () => {
    const { service } = buildService();
    await expect(service.translate('hello', 'fr'))
      .rejects.toThrow('Unsupported language');
  });

  it('translate calls Claude with correct system prompt', async () => {
    const anthropic = mockAnthropic('Hola');
    const { service } = buildService({ anthropic });

    const result = await service.translate('Hello', 'es', 'GMP context');

    expect(result.translated).toBe('Hola');
    expect(result.lang).toBe('es');
  });

  it('transcribe throws when no API key', async () => {
    const makeService = require('../services/voice.service');
    const service = makeService({ anthropic: mockAnthropic(), rag: mockRag(), elevenLabsApiKey: '' });

    await expect(service.transcribe('base64data'))
      .rejects.toThrow('ElevenLabs API key not configured');
  });
});
