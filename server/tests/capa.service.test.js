'use strict';


const { mockSupabase, mockAuditLog } = require('./helpers');

describe('capa.service', () => {
  function buildService(overrides = {}) {
    const supabase = overrides.supabase || mockSupabase();
    const auditLog = overrides.auditLog || mockAuditLog();

    const makeService = require('../services/capa.service');
    return { service: makeService({ supabase, auditLog }), supabase, auditLog };
  }

  it('exports all expected methods', () => {
    const { service } = buildService();
    const expected = [
      'getNotifications', 'markNotificationRead', 'markAllNotificationsRead',
      'listCapas', 'createCapa', 'updateCapa', 'getAnalytics',
    ];
    expected.forEach(m => expect(typeof service[m]).toBe('function'));
  });

  it('createCapa rejects missing fields', async () => {
    const { service } = buildService();
    await expect(service.createCapa({ submissionRef: 'VNT-1234' }))
      .rejects.toThrow('submissionRef and title are required');
  });

  it('createCapa calls supabase and audit log', async () => {
    const { service, supabase, auditLog } = buildService();
    const result = await service.createCapa({
      submissionRef: 'VNT-1234',
      title: 'Fix pH probe calibration',
      owner: 'Dr Smith',
    });
    expect(result.ok).toBe(true);
    expect(result.capaId).toMatch(/^CAPA-\d{4}$/);
    expect(supabase.from).toHaveBeenCalledWith('capas');
    expect(auditLog).toHaveBeenCalledOnce();
  });
});
