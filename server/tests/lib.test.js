'use strict';


const ids = require('../lib/ids');
const parseClaudeJson = require('../lib/parse-claude-json');

describe('lib/ids', () => {
  it('submissionRef returns VNT-XXXX format', () => {
    const ref = ids.submissionRef();
    expect(ref).toMatch(/^VNT-\d{4}$/);
  });

  it('capaId returns CAPA-XXXX format', () => {
    const id = ids.capaId();
    expect(id).toMatch(/^CAPA-\d{4}$/);
  });

  it('signoffId returns timestamp-based id', () => {
    const id = ids.signoffId();
    expect(id).toMatch(/^signoff-\d+-[a-z0-9]+$/);
  });

  it('generates unique ids on successive calls', () => {
    const refs = new Set(Array.from({ length: 50 }, () => ids.submissionRef()));
    // With 4-digit random, 50 calls should almost certainly be unique
    expect(refs.size).toBeGreaterThan(40);
  });
});

describe('lib/parse-claude-json', () => {
  it('parses clean JSON', () => {
    const result = parseClaudeJson('{"priority":"High"}');
    expect(result.priority).toBe('High');
  });

  it('strips markdown fences', () => {
    const result = parseClaudeJson('```json\n{"priority":"Low"}\n```');
    expect(result.priority).toBe('Low');
  });

  it('handles text before JSON', () => {
    const result = parseClaudeJson('Here is the analysis:\n{"priority":"Medium"}');
    expect(result.priority).toBe('Medium');
  });
});
