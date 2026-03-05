'use strict';

/**
 * services/equip-logbook.service.js
 *
 * GMP-compliant equipment logbook service.
 * Manages equipment registration and log entries (usage, cleaning,
 * maintenance, alarms) with 21 CFR Part 11 audit trail.
 */

const ids = require('../lib/ids');

function makeEquipLogbookService({ supabase, auditLog, anthropic }) {

  // ── Equipment CRUD ────────────────────────────────────────────────────

  async function listEquipment() {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  async function getEquipment(equipId) {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('equip_id', equipId)
      .single();
    if (error) {
      if (error.message.includes('does not exist')) return null;
      if (error.code === 'PGRST116') return null; // not found
      throw error;
    }
    return data;
  }

  async function createEquipment({ name, type, location, serialNumber, model, manufacturer, commissionedAt, userId, userRole, req }) {
    if (!name) {
      throw Object.assign(new Error('Equipment name is required'), { statusCode: 400 });
    }

    const equipId = ids.equipId();

    const row = {
      equip_id: equipId,
      name,
      type: type || 'general',
      location: location || '',
      serial_number: serialNumber || '',
      model: model || '',
      manufacturer: manufacturer || '',
      status: 'active',
      commissioned_at: commissionedAt || null,
      created_by: userId || 'system',
    };

    const { error } = await supabase.from('equipment').insert(row);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'equipment_created',
      entityType: 'equipment',
      entityId: equipId,
      after: row,
      reason: `Equipment registered: ${name}`,
      req,
    });

    return { ok: true, equipId };
  }

  async function updateEquipment({ equipId, name, type, location, serialNumber, model, manufacturer, status, commissionedAt, userId, userRole, reason, req }) {
    const current = await getEquipment(equipId);
    if (!current) {
      throw Object.assign(new Error('Equipment not found'), { statusCode: 404 });
    }

    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined)           updates.name = name;
    if (type !== undefined)           updates.type = type;
    if (location !== undefined)       updates.location = location;
    if (serialNumber !== undefined)   updates.serial_number = serialNumber;
    if (model !== undefined)          updates.model = model;
    if (manufacturer !== undefined)   updates.manufacturer = manufacturer;
    if (status !== undefined)         updates.status = status;
    if (commissionedAt !== undefined) updates.commissioned_at = commissionedAt;

    const { error } = await supabase
      .from('equipment')
      .update(updates)
      .eq('equip_id', equipId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'unknown',
      userRole: userRole || 'unknown',
      action: 'equipment_updated',
      entityType: 'equipment',
      entityId: equipId,
      before: { name: current.name, status: current.status, location: current.location },
      after: updates,
      reason: reason || `Equipment updated: ${Object.keys(updates).join(', ')}`,
      req,
    });

    return { ok: true, equipId, updates };
  }

  // ── Log Entries ───────────────────────────────────────────────────────

  async function createLogEntry({ equipId, entryType, title, description, performedBy, performedRole, performedAt, durationMin, status, alarmSeverity, esigUser, esigReason, req }) {
    if (!equipId || !entryType) {
      throw Object.assign(new Error('equipId and entryType are required'), { statusCode: 400 });
    }

    const logId = ids.equipLogId();

    const row = {
      log_id: logId,
      equip_id: equipId,
      entry_type: entryType,
      title: title || '',
      description: description || '',
      performed_by: performedBy || 'unknown',
      performed_role: performedRole || 'operator',
      performed_at: performedAt || new Date().toISOString(),
      duration_min: durationMin || null,
      status: status || 'complete',
      alarm_severity: alarmSeverity || null,
      esig_user: esigUser || null,
      esig_at: esigUser ? new Date().toISOString() : null,
      esig_reason: esigReason || null,
    };

    const { error } = await supabase.from('equipment_log_entries').insert(row);
    if (error) throw error;

    await auditLog({
      userId: performedBy || 'system',
      userRole: performedRole || 'operator',
      action: 'equipment_log_created',
      entityType: 'equipment_log',
      entityId: logId,
      after: row,
      reason: `${entryType} entry for ${equipId}: ${title}`,
      req,
    });

    return { ok: true, logId };
  }

  async function listLogEntries(equipId, { entryType, limit: lim } = {}) {
    let query = supabase
      .from('equipment_log_entries')
      .select('*')
      .eq('equip_id', equipId)
      .order('performed_at', { ascending: false });
    if (entryType) query = query.eq('entry_type', entryType);
    if (lim) query = query.limit(lim);

    const { data, error } = await query;
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  // ── AI: Predictive Maintenance ────────────────────────────────────────

  async function analyseEquipment(equipId) {
    const equipment = await getEquipment(equipId);
    if (!equipment) {
      throw Object.assign(new Error('Equipment not found'), { statusCode: 404 });
    }

    const logs = await listLogEntries(equipId, { limit: 100 });

    const prompt = `You are a GMP equipment reliability analyst. Analyse this equipment's logbook data and provide:
1. **Predictive Maintenance Alerts** — upcoming maintenance needs based on usage patterns
2. **Usage Pattern Analysis** — trends in usage frequency, cleaning cycles, idle periods
3. **Anomaly Detection** — any unusual alarm patterns or deviations

Equipment: ${equipment.name} (${equipment.type})
Location: ${equipment.location}
Status: ${equipment.status}
Commissioned: ${equipment.commissioned_at || 'Unknown'}

Recent log entries (${logs.length}):
${logs.map(l => `- [${l.entry_type}] ${l.title} | ${l.performed_at} | Duration: ${l.duration_min || 'N/A'} min | Alarm: ${l.alarm_severity || 'none'}`).join('\n')}

Respond in JSON: { "maintenance_alerts": [...], "usage_patterns": [...], "anomalies": [...], "risk_score": "low|medium|high", "summary": "..." }`;

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = msg.content[0].text;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: text };
    } catch {
      return { summary: text };
    }
  }

  return {
    listEquipment,
    getEquipment,
    createEquipment,
    updateEquipment,
    createLogEntry,
    listLogEntries,
    analyseEquipment,
  };
}

module.exports = makeEquipLogbookService;
