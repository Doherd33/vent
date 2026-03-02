'use strict';

const { mockAnthropic, mockRag } = require('./helpers');

// ── Agent test suite ────────────────────────────────────────────────────────
// Tests each agent in isolation with a mock Anthropic client.
// Validates that the factory returns { invoke }, the method calls Claude with
// the right model, and the returned object has expected keys.

describe('agents', () => {
  const state = {
    observation: 'Cell viability dropped to 72 % after media exchange',
    area: 'Upstream',
    shift: 'Day',
    sopContext: 'SOP section 8.6.1.4 — monitor viability post-exchange',
    patternContext: 'No similar submissions found.',
    contactsContext: 'Dr Alice — QA Lead\nBob Smith — Shift Lead',
    classification: {
      priority: 'High',
      riskLevel: 'High',
      regulatoryFlag: 'No',
      regulatoryNote: '',
      category: 'process-deviation',
      reasoning: 'Viability below threshold per SOP 8.6.1.4',
    },
    analysis: {
      sciEval: { summary: 'Test', rootCauseHypothesis: 'Media pH drift', riskLevel: 'High', affectedParameter: 'Viability', regulatoryFlag: 'No', regulatoryNote: '' },
      sopRefs: [{ code: 'WX-SOP-1001-03', title: 'Perfusion', step: '8.6.1.4', relevance: 'Viability monitoring', flag: 'gap' }],
      bprRefs: [],
      correctiveActions: [{ title: 'Recalibrate pH probe', description: 'Per SOP 8.6.1.4', timing: 'immediate', timingLabel: 'Within 24 hours' }],
      timeline: [],
      pattern: { summary: 'No pattern', currentCount: 1, threshold: 3 },
    },
    routing: {
      contacts: [{ name: 'Dr Alice', role: 'QA Lead', dept: 'QA', deptLabel: 'Quality', avatarClass: 'qa', initials: 'DA', workflowPhase: 1, why: 'QA oversight needed' }],
    },
  };

  // ── Classifier ──────────────────────────────────────────────────────────

  describe('ClassifierAgent', () => {
    const classifierResponse = JSON.stringify({
      priority: 'High',
      riskLevel: 'High',
      regulatoryFlag: 'No',
      regulatoryNote: '',
      category: 'process-deviation',
      reasoning: 'Viability is below threshold per SOP section 8.6.1.4.',
    });

    it('invoke returns classification keys', async () => {
      const anthropic = mockAnthropic(classifierResponse);
      const agent = require('../agents/classifier')(anthropic);
      const result = await agent.invoke(state);

      expect(result.priority).toBe('High');
      expect(result.category).toBe('process-deviation');
      expect(anthropic.messages.create).toHaveBeenCalledOnce();
      expect(anthropic.messages.create.mock.calls[0][0].model).toBe('claude-sonnet-4-20250514');
    });
  });

  // ── Analyst ─────────────────────────────────────────────────────────────

  describe('AnalystAgent', () => {
    const analystResponse = JSON.stringify({
      sciEval: { summary: 'Viability drop linked to media pH drift', rootCauseHypothesis: 'pH drift', riskLevel: 'High', affectedParameter: 'Viability', regulatoryFlag: 'No', regulatoryNote: '' },
      sopRefs: [{ code: 'WX-SOP-1001-03', title: 'Perfusion', step: '8.6.1.4', relevance: 'Monitoring', flag: 'gap' }],
      bprRefs: [],
      correctiveActions: [{ title: 'Recalibrate', description: 'pH probe', timing: 'immediate', timingLabel: '24h' }],
      timeline: [{ state: 'now', when: 'Today', event: 'Investigate', detail: 'Check pH probe' }],
      pattern: { summary: 'First occurrence', currentCount: 1, threshold: 3 },
    });

    it('invoke returns analysis keys', async () => {
      const anthropic = mockAnthropic(analystResponse);
      const agent = require('../agents/analyst')(anthropic);
      const result = await agent.invoke({ ...state, classification: state.classification });

      expect(result.sciEval).toBeDefined();
      expect(result.sopRefs).toHaveLength(1);
      expect(result.correctiveActions).toHaveLength(1);
      expect(anthropic.messages.create).toHaveBeenCalledOnce();
    });
  });

  // ── Router ──────────────────────────────────────────────────────────────

  describe('RouterAgent', () => {
    const routerResponse = JSON.stringify({
      contacts: [
        { name: 'Dr Alice', role: 'QA Lead', dept: 'QA', deptLabel: 'Quality', avatarClass: 'qa', initials: 'DA', workflowPhase: 1, why: 'QA oversight needed' },
      ],
    });

    it('invoke returns contacts array', async () => {
      const anthropic = mockAnthropic(routerResponse);
      const agent = require('../agents/router')(anthropic);
      const result = await agent.invoke({ ...state, classification: state.classification, analysis: state.analysis });

      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].workflowPhase).toBe(1);
      expect(anthropic.messages.create).toHaveBeenCalledOnce();
    });
  });

  // ── CAPA Writer ─────────────────────────────────────────────────────────

  describe('CAPAWriterAgent', () => {
    const capaResponse = JSON.stringify({
      capas: [
        { title: 'Recalibrate pH probe', description: 'Immediate recalibration per SOP 8.6.1.4', timing: 'immediate', timingLabel: 'Within 24 hours', owner: 'Bob Smith', ownerRole: 'Shift Lead', dueDate: '2025-07-01' },
      ],
    });

    it('invoke returns capas array', async () => {
      const anthropic = mockAnthropic(capaResponse);
      const agent = require('../agents/capa-writer')(anthropic);
      const result = await agent.invoke({ ...state, classification: state.classification, analysis: state.analysis, routing: state.routing });

      expect(result.capas).toHaveLength(1);
      expect(result.capas[0].owner).toBe('Bob Smith');
      expect(anthropic.messages.create).toHaveBeenCalledOnce();
    });
  });

  // ── SOP Query ───────────────────────────────────────────────────────────

  describe('SOPQueryAgent', () => {
    const queryResponse = JSON.stringify({
      answer: 'Per SOP WX-SOP-1001-03 section 8.6.1.4, cell viability should be monitored after each media exchange.',
      sources: [{ docId: 'WX-SOP-1001-03', title: 'Perfusion SOP', section: '8.6.1.4', excerpt: 'Monitor viability post-exchange' }],
    });

    it('invoke returns answer and sources', async () => {
      const anthropic = mockAnthropic(queryResponse);
      const rag = mockRag();
      const agent = require('../agents/sop-query')(anthropic, rag);
      const result = await agent.invoke({ query: 'When should I check viability?', area: 'Upstream' });

      expect(result.answer).toContain('WX-SOP-1001-03');
      expect(result.sources).toHaveLength(1);
      expect(rag.getRelevantChunks).toHaveBeenCalledWith('When should I check viability?', 'Upstream');
      expect(anthropic.messages.create).toHaveBeenCalledOnce();
    });
  });

  // ── Builder ─────────────────────────────────────────────────────────────

  describe('BuilderAgent', () => {
    const assistResponse = JSON.stringify({
      title: 'Media Exchange Verification',
      content: 'Verify pH and osmolality of fresh media before initiating exchange.',
      note: 'CAUTION: Do not proceed if pH is outside 7.0-7.4 range.',
    });

    it('assistStep returns improved step', async () => {
      const anthropic = mockAnthropic(assistResponse);
      const agent = require('../agents/builder')(anthropic);
      const result = await agent.assistStep({
        action: 'rewrite',
        stepTitle: 'Check media',
        stepContent: 'Make sure the media looks ok before using it.',
      });

      expect(result.title).toBe('Media Exchange Verification');
      expect(result.note).toContain('CAUTION');
      expect(anthropic.messages.create).toHaveBeenCalledOnce();
    });

    it('assistStep rejects invalid action', async () => {
      const anthropic = mockAnthropic('{}');
      const agent = require('../agents/builder')(anthropic);

      await expect(agent.assistStep({ action: 'nope', stepTitle: 'x', stepContent: 'x' }))
        .rejects.toThrow('Invalid action');
    });

    const draftResponse = JSON.stringify({
      sections: [
        { title: '1. Purpose', content: 'Define media exchange procedure.', note: '' },
        { title: '2. Scope', content: 'Applies to all perfusion bioreactors.', note: '' },
      ],
    });

    it('generateDraft returns sections', async () => {
      const anthropic = mockAnthropic(draftResponse);
      const agent = require('../agents/builder')(anthropic);
      const result = await agent.generateDraft({ description: 'Media exchange for perfusion', area: 'Upstream' });

      expect(result.sections).toHaveLength(2);
      expect(result.sections[0].title).toContain('Purpose');
      expect(anthropic.messages.create).toHaveBeenCalledOnce();
    });
  });
});
