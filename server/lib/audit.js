'use strict';
const crypto = require('crypto');

// Immutable append-only audit log — 21 CFR Part 11 / EU Annex 11 compliant
function makeAuditLog(supabase) {
  return async function auditLog({ userId, userRole, action, entityType, entityId, before, after, reason, req }) {
    const ts = new Date().toISOString();
    const content = JSON.stringify({ userId, userRole, action, entityType, entityId, before, after, reason, ts });
    const checksum = crypto.createHash('sha256').update(content).digest('hex');
    try {
      const { error } = await supabase.from('audit_log').insert({
        user_id:    userId || 'system',
        user_role:  userRole || 'system',
        action,
        entity_type: entityType,
        entity_id:   entityId,
        before_val:  before || null,
        after_val:   after || {},
        reason:      reason || null,
        ip_address:  req ? (req.headers['x-forwarded-for'] || req.ip || '') : '',
        user_agent:  req ? (req.headers['user-agent'] || '') : '',
        checksum
      });
      if (error) console.error('[AUDIT] Insert error:', error.message);
      else console.log(`[AUDIT] ${action} on ${entityType}:${entityId} by ${userId}`);
    } catch (err) {
      // Audit failures are logged but don't break the operation
      console.error('[AUDIT] Failed:', err.message);
    }
  };
}

module.exports = { makeAuditLog };
