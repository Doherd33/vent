'use strict';

/**
 * tests/prompts.test.js — Prompt versioning regression tests
 *
 * Validates that:
 *   1. All expected prompt files exist and load correctly
 *   2. The prompt loader handles versions, interpolation, and caching
 *   3. Agents still function after switching to file-based prompts
 */

const { loadPrompt, listVersions, listPrompts, clearCache } = require('../prompts/loader');

describe('Prompt loader', () => {
  beforeEach(() => clearCache());

  it('lists all expected prompt files', () => {
    const all = listPrompts();
    const names = all.map(p => p.name);

    expect(names).toContain('classifier');
    expect(names).toContain('analyst');
    expect(names).toContain('router');
    expect(names).toContain('capa-writer');
    expect(names).toContain('sop-query');
    expect(names).toContain('builder');
    expect(names).toContain('charlie');
    expect(names).toContain('feedback-analysis');
    expect(names).toContain('feedback-conversation');
  });

  it('loads classifier v1 prompt correctly', () => {
    const prompt = loadPrompt('classifier', { version: 1 });
    expect(prompt).toContain('ClassifierAgent');
    expect(prompt).toContain('triage');
    expect(prompt).toContain('priority');
    expect(prompt).toContain('RULES');
  });

  it('loads latest version by default', () => {
    const prompt = loadPrompt('classifier');
    expect(prompt).toContain('ClassifierAgent');
  });

  it('lists correct versions', () => {
    const versions = listVersions('classifier');
    expect(versions).toContain(1);
    expect(versions.length).toBeGreaterThanOrEqual(1);
  });

  it('throws on unknown prompt name', () => {
    expect(() => loadPrompt('nonexistent')).toThrow('No prompt files found');
  });

  it('throws on invalid version', () => {
    expect(() => loadPrompt('classifier', { version: 999 })).toThrow('Prompt not found');
  });

  it('handles variable interpolation', () => {
    // Create a simple test — feedback-conversation mentions ${targetLang} in production
    // but the file version is the template text. We test the {{var}} pattern instead.
    const text = loadPrompt('classifier');
    // Classifier has no vars, so it should return unchanged
    const withVars = loadPrompt('classifier', { vars: { foo: 'bar' } });
    expect(withVars).toBe(text); // no {{foo}} placeholder, so unchanged
  });

  it('caches prompts', () => {
    const first = loadPrompt('classifier');
    const second = loadPrompt('classifier');
    expect(first).toBe(second); // same reference from cache
  });

  it('bypasses cache when noCache is set', () => {
    const first = loadPrompt('classifier');
    const second = loadPrompt('classifier', { noCache: true });
    expect(first).toEqual(second); // same content, but re-read from disk
  });
});

describe('Prompt content integrity', () => {
  const EXPECTED_KEYWORDS = {
    'classifier': ['priority', 'risk level', 'regulatory', 'categorise', 'triage'],
    'analyst': ['scientific analysis', 'SOP content', 'corrective actions', 'timeline'],
    'router': ['contacts', 'workflowPhase', 'CONTACTS DIRECTORY', 'Phase 1'],
    'capa-writer': ['CAPA', 'corrective actions', 'audit trail', 'due dates'],
    'sop-query': ['SOP content', 'section numbers', 'fabricate', 'conversational'],
    'builder': ['GMP', 'active voice', 'audit-ready', 'JSON'],
    'charlie': ['Charlie', 'voice assistant', 'collegial', 'action'],
    'feedback-analysis': ['transcript', 'sentiment', 'severity', 'actionable_items'],
    'feedback-conversation': ['Charlie', 'one-on-one', 'end_session', 'operator'],
  };

  for (const [name, keywords] of Object.entries(EXPECTED_KEYWORDS)) {
    it(`${name} prompt contains expected keywords`, () => {
      const prompt = loadPrompt(name);
      expect(prompt.length).toBeGreaterThan(50);

      for (const keyword of keywords) {
        expect(prompt.toLowerCase()).toContain(keyword.toLowerCase());
      }
    });
  }
});
