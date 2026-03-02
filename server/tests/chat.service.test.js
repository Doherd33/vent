'use strict';


const { mockSupabase, mockAnthropic } = require('./helpers');

describe('chat.service', () => {
  function buildService(overrides = {}) {
    const supabase = overrides.supabase || mockSupabase();
    const anthropic = overrides.anthropic || mockAnthropic('{}');

    const makeService = require('../services/chat.service');
    return { service: makeService({ supabase, anthropic }), supabase, anthropic };
  }

  it('exports all expected methods', () => {
    const { service } = buildService();
    const expected = [
      'listSessions', 'createSession', 'getSession', 'updateSession',
      'deleteSession', 'deleteAllSessions',
      'analyseSessions', 'searchSessions', 'exportToDoc',
      'listTodos', 'createTodo', 'updateTodo', 'deleteTodo',
    ];
    expected.forEach(m => expect(typeof service[m]).toBe('function'));
  });

  it('listSessions calls supabase with user_id', async () => {
    const { service, supabase } = buildService();
    await service.listSessions('user@test.com');
    expect(supabase.from).toHaveBeenCalledWith('chat_sessions');
  });

  it('exportToDoc calls Claude and parses response', async () => {
    const anthropic = mockAnthropic(JSON.stringify({
      title: 'pH Troubleshooting',
      area: 'Upstream',
      description: 'Steps to troubleshoot pH issues',
      steps: [{ title: 'Check probe', content: 'Inspect the probe', note: '' }],
    }));
    const { service } = buildService({ anthropic });

    const result = await service.exportToDoc(
      [{ role: 'user', content: 'How do I fix pH?' }],
      'pH Help'
    );
    expect(result.title).toBe('pH Troubleshooting');
    expect(result.steps).toHaveLength(1);
    expect(anthropic.messages.create).toHaveBeenCalledOnce();
  });
});
