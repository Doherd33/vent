'use strict';


const { mockSupabase, mockAnthropic, mockAuditLog, mockRag, mockBuildContactsContext } = require('./helpers');

describe('submission.service', () => {
  function buildService(overrides = {}) {
    const supabase = overrides.supabase || mockSupabase();
    const anthropic = overrides.anthropic || mockAnthropic(JSON.stringify({
      priority: 'High',
      sopRefs: [],
      bprRefs: [],
      sciEval: { summary: 'Test', rootCauseHypothesis: 'Test', riskLevel: 'High', affectedParameter: 'pH', regulatoryFlag: 'No', regulatoryNote: '' },
      correctiveActions: [],
      contacts: [],
      timeline: [],
      pattern: { summary: 'No pattern', currentCount: 1, threshold: 3 },
    }));
    const auditLog = overrides.auditLog || mockAuditLog();
    const rag = overrides.rag || mockRag();
    const buildContactsContext = overrides.buildContactsContext || mockBuildContactsContext();

    const makeService = require('../services/submission.service');
    return { service: makeService({ supabase, anthropic, auditLog, rag, buildContactsContext }), supabase, anthropic, auditLog, rag };
  }

  it('exports processSubmission and findPatterns', () => {
    const { service } = buildService();
    expect(typeof service.processSubmission).toBe('function');
    expect(typeof service.findPatterns).toBe('function');
  });

  it('findPatterns delegates to rag.findSimilarSubmissions', async () => {
    const { service, rag } = buildService();
    rag.findSimilarSubmissions.mockResolvedValue({ count: 2, matches: ['a', 'b'] });

    const result = await service.findPatterns('test observation', 'Upstream');
    expect(rag.findSimilarSubmissions).toHaveBeenCalledWith('test observation', 'Upstream');
    expect(result.count).toBe(2);
  });

  it('processSubmission calls Claude and returns refCode + feedback', async () => {
    const { service, anthropic } = buildService();

    const result = await service.processSubmission({
      observation: 'Cell viability dropped below threshold after media exchange',
      area: 'Upstream',
      shift: 'Day',
    });

    expect(result.refCode).toMatch(/^VNT-\d{4}$/);
    expect(result.feedback.priority).toBe('High');
    expect(anthropic.messages.create).toHaveBeenCalledOnce();
  });
});
