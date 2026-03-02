'use strict';


const { mockSupabase, mockAnthropic, mockAuditLog, mockRag, mockGetVoyageClient } = require('./helpers');

describe('sop.service', () => {
  function buildService(overrides = {}) {
    const supabase = overrides.supabase || mockSupabase();
    const anthropic = overrides.anthropic || mockAnthropic('Test answer text');
    const auditLog = overrides.auditLog || mockAuditLog();
    const rag = overrides.rag || mockRag();
    const getVoyageClient = overrides.getVoyageClient || mockGetVoyageClient();

    const makeService = require('../services/sop.service');
    return { service: makeService({ supabase, anthropic, auditLog, rag, getVoyageClient }), supabase, anthropic, auditLog, rag };
  }

  it('exports all expected methods', () => {
    const { service } = buildService();
    const expected = [
      'discoverSops', 'searchSops', 'fetchDocument', 'fetchChunk',
      'fetchRationale', 'askDocumentQuestion', 'queryKnowledge', 'ingestSops',
      'listSubmissions', 'getSubmission', 'updateSubmissionStatus',
      'getNotes', 'saveNotes',
      'getSopChanges', 'upsertSopChange', 'getSopAnnotations', 'addSopAnnotation',
    ];
    expected.forEach(m => expect(typeof service[m]).toBe('function'));
  });

  it('discoverSops returns empty results when no chunks found', async () => {
    const { service } = buildService();
    const result = await service.discoverSops('something obscure');
    expect(result.results).toEqual([]);
    expect(result.message).toContain('No matching SOPs');
  });

  it('discoverSops calls Claude when chunks exist', async () => {
    const rag = mockRag();
    rag.getRelevantChunks.mockResolvedValue([
      { doc_id: 'WX-SOP-1001-03', doc_title: 'Cell Culture', section_title: '8.6', content: 'Inoculation procedure...', similarity: 0.9 },
    ]);
    const anthropic = mockAnthropic('WX-SOP-1001-03 covers the inoculation procedure.');
    const { service } = buildService({ rag, anthropic });

    const result = await service.discoverSops('inoculation');
    expect(anthropic.messages.create).toHaveBeenCalledOnce();
    expect(result.results).toHaveLength(1);
    expect(result.results[0].doc_id).toBe('WX-SOP-1001-03');
  });

  it('searchSops filters by query text', async () => {
    const supabase = mockSupabase([{ section_title: 'Cell Culture', content: 'inoculation steps' }]);
    const { service } = buildService({ supabase });
    // searchSops iterates known docs — each .from() call returns our stub
    const results = await service.searchSops('inoculation');
    expect(supabase.from).toHaveBeenCalled();
  });

  it('updateSubmissionStatus rejects invalid status', async () => {
    const { service } = buildService();
    await expect(service.updateSubmissionStatus({ refCode: 'VNT-1234', status: 'banana' }))
      .rejects.toThrow('Invalid status');
  });

  it('updateSubmissionStatus requires signature for approval transitions', async () => {
    const { service } = buildService();
    await expect(service.updateSubmissionStatus({ refCode: 'VNT-1234', status: 'qa_approved' }))
      .rejects.toThrow('Electronic signature required');
  });
});
