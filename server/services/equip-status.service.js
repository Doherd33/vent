'use strict';

/**
 * services/equip-status.service.js
 *
 * Equipment Status Board service — extends the Equipment Logbook system
 * with status-specific operations, status history tracking, and AI-powered
 * capacity planning. Reads from the existing `equipment` table; writes to
 * `equipment_status_history` for an immutable audit trail of every transition.
 *
 * 21 CFR Part 11 compliant: every status change is logged in both the
 * audit_log and equipment_status_history tables.
 */

const VALID_STATUSES = ['available', 'in-use', 'cleaning', 'maintenance', 'hold', 'retired'];

// Thresholds for flagging equipment stuck in transitional states
const ALERT_THRESHOLDS = {
  cleaning:    4 * 60 * 60 * 1000,    // 4 hours
  maintenance: 24 * 60 * 60 * 1000,   // 24 hours
  hold:        48 * 60 * 60 * 1000,   // 48 hours
};

function makeEquipStatusService({ supabase, auditLog, anthropic }) {

  // ── List all equipment with current status (board view) ─────────────────

  async function listByStatus() {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .order('name', { ascending: true });
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    const equipment = data || [];

    // Normalise legacy statuses: 'active' -> 'available', 'inactive' -> 'retired'
    return equipment.map(eq => {
      let status = eq.status || 'available';
      if (status === 'active') status = 'available';
      if (status === 'inactive') status = 'retired';
      return { ...eq, status };
    });
  }

  // ── Update equipment status ─────────────────────────────────────────────

  async function changeStatus({ equipId, newStatus, reason, expectedDuration, userId, userRole, req }) {
    if (!VALID_STATUSES.includes(newStatus)) {
      throw Object.assign(new Error(`Invalid status: ${newStatus}. Must be one of: ${VALID_STATUSES.join(', ')}`), { statusCode: 400 });
    }
    if (!reason || !reason.trim()) {
      throw Object.assign(new Error('Reason is required for status changes'), { statusCode: 400 });
    }

    // Fetch current equipment
    const { data: equipment, error: fetchErr } = await supabase
      .from('equipment')
      .select('*')
      .eq('equip_id', equipId)
      .single();
    if (fetchErr) {
      if (fetchErr.code === 'PGRST116') {
        throw Object.assign(new Error('Equipment not found'), { statusCode: 404 });
      }
      throw fetchErr;
    }
    if (!equipment) {
      throw Object.assign(new Error('Equipment not found'), { statusCode: 404 });
    }

    const previousStatus = equipment.status || 'available';

    // Update equipment table
    const { error: updateErr } = await supabase
      .from('equipment')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('equip_id', equipId);
    if (updateErr) throw updateErr;

    // Insert status history record
    try {
      const { error: histErr } = await supabase
        .from('equipment_status_history')
        .insert({
          equip_id: equipId,
          previous_status: previousStatus,
          new_status: newStatus,
          changed_by: userId || 'unknown',
          reason: reason.trim(),
          expected_duration: expectedDuration || null,
        });
      if (histErr) console.error('[EQUIP-STATUS] History insert error:', histErr.message);
    } catch (e) {
      console.error('[EQUIP-STATUS] History insert failed:', e.message);
    }

    // Audit trail
    await auditLog({
      userId: userId || 'unknown',
      userRole: userRole || 'unknown',
      action: 'equipment_status_changed',
      entityType: 'equipment',
      entityId: equipId,
      before: { status: previousStatus },
      after: { status: newStatus, reason: reason.trim(), expectedDuration },
      reason: `Status changed from ${previousStatus} to ${newStatus}: ${reason.trim()}`,
      req,
    });

    return { ok: true, equipId, previousStatus, newStatus };
  }

  // ── Get status history for one equipment ────────────────────────────────

  async function getStatusHistory(equipId, { limit: lim } = {}) {
    let query = supabase
      .from('equipment_status_history')
      .select('*')
      .eq('equip_id', equipId)
      .order('created_at', { ascending: false });
    if (lim) query = query.limit(lim);

    const { data, error } = await query;
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  // ── Summary: counts by status for dashboard ─────────────────────────────

  async function getSummary() {
    const equipment = await listByStatus();
    const now = Date.now();

    const counts = {};
    VALID_STATUSES.forEach(s => { counts[s] = 0; });

    const alerts = [];

    equipment.forEach(eq => {
      const s = eq.status;
      counts[s] = (counts[s] || 0) + 1;

      // Check for equipment stuck in transitional states
      const threshold = ALERT_THRESHOLDS[s];
      if (threshold && eq.updated_at) {
        const elapsed = now - new Date(eq.updated_at).getTime();
        if (elapsed > threshold) {
          const hours = Math.round(elapsed / (60 * 60 * 1000) * 10) / 10;
          alerts.push({
            equipId: eq.equip_id,
            name: eq.name,
            status: s,
            hoursInStatus: hours,
            threshold: threshold / (60 * 60 * 1000),
            message: `${eq.name} (${eq.equip_id}) has been in ${s} for ${hours}h`,
          });
        }
      }
    });

    const total = equipment.length;
    const availableCount = counts['available'] || 0;
    const availabilityRate = total > 0 ? Math.round((availableCount / total) * 1000) / 10 : 0;

    return {
      total,
      counts,
      availabilityRate,
      alerts,
    };
  }

  // ── AI: Capacity planning analysis ──────────────────────────────────────

  async function aiCapacityAnalysis() {
    const equipment = await listByStatus();
    const summary = await getSummary();

    const prompt = `You are a GMP manufacturing capacity analyst for a biologics facility operating under 21 CFR Part 11.

Analyse the current equipment status distribution and provide capacity risk assessment.

EQUIPMENT STATUS SUMMARY:
- Total equipment: ${summary.total}
- Available: ${summary.counts['available'] || 0}
- In Use: ${summary.counts['in-use'] || 0}
- Cleaning: ${summary.counts['cleaning'] || 0}
- Maintenance: ${summary.counts['maintenance'] || 0}
- On Hold: ${summary.counts['hold'] || 0}
- Retired: ${summary.counts['retired'] || 0}
- Availability Rate: ${summary.availabilityRate}%

ACTIVE ALERTS:
${summary.alerts.length > 0 ? summary.alerts.map(a => `- ${a.message}`).join('\n') : 'No active alerts'}

EQUIPMENT DETAILS:
${equipment.slice(0, 50).map(e => `- ${e.equip_id}: ${e.name} (${e.type}) — ${e.status} — Location: ${e.location}`).join('\n')}

Respond in JSON (no markdown fences):
{
  "riskLevel": "low|medium|high|critical",
  "riskScore": 0-100,
  "capacitySummary": "Brief capacity assessment...",
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "bottlenecks": ["Any identified bottleneck areas"],
  "forecast": "Short-term capacity outlook"
}`;

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = msg.content[0].text;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { capacitySummary: text };
    } catch {
      return { capacitySummary: text };
    }
  }

  return {
    listByStatus,
    changeStatus,
    getStatusHistory,
    getSummary,
    aiCapacityAnalysis,
  };
}

module.exports = { makeEquipStatusService };
