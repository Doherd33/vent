'use strict';

/**
 * services/inoc-incubator.service.js
 *
 * CO2 Incubator Logbook — GMP-compliant environmental monitoring.
 * Manages incubator units, environmental logs, alarms, calibration,
 * and preventive maintenance with 21 CFR Part 11 audit trail.
 */

const ids = require('../lib/ids');

function makeIncubatorService({ supabase, auditLog, anthropic }) {

  // ── Incubator CRUD ──────────────────────────────────────────────────────

  async function listIncubators() {
    const { data, error } = await supabase
      .from('incubator_units')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  async function getIncubator(incubatorId) {
    const { data, error } = await supabase
      .from('incubator_units')
      .select('*')
      .eq('incubator_id', incubatorId)
      .single();
    if (error) {
      if (error.message.includes('does not exist')) return null;
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async function createIncubator({ name, model, serialNumber, location, co2Setpoint, tempSetpoint, humiditySetpoint, userId, userRole, req }) {
    if (!name) {
      throw Object.assign(new Error('Incubator name is required'), { statusCode: 400 });
    }

    const incubatorId = ids.inocId();

    const row = {
      incubator_id: incubatorId,
      name,
      model: model || '',
      serial_number: serialNumber || '',
      location: location || '',
      status: 'active',
      co2_setpoint: co2Setpoint || null,
      temp_setpoint: tempSetpoint || null,
      humidity_setpoint: humiditySetpoint || null,
      created_by: userId || 'system',
    };

    const { error } = await supabase.from('incubator_units').insert(row);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'incubator_created',
      entityType: 'incubator',
      entityId: incubatorId,
      after: row,
      reason: `Incubator registered: ${name}`,
      req,
    });

    return { ok: true, incubatorId };
  }

  async function updateIncubator({ incubatorId, name, model, serialNumber, location, status, co2Setpoint, tempSetpoint, humiditySetpoint, userId, userRole, reason, req }) {
    const current = await getIncubator(incubatorId);
    if (!current) {
      throw Object.assign(new Error('Incubator not found'), { statusCode: 404 });
    }

    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined)             updates.name = name;
    if (model !== undefined)            updates.model = model;
    if (serialNumber !== undefined)     updates.serial_number = serialNumber;
    if (location !== undefined)         updates.location = location;
    if (status !== undefined)           updates.status = status;
    if (co2Setpoint !== undefined)      updates.co2_setpoint = co2Setpoint;
    if (tempSetpoint !== undefined)     updates.temp_setpoint = tempSetpoint;
    if (humiditySetpoint !== undefined) updates.humidity_setpoint = humiditySetpoint;

    const { error } = await supabase
      .from('incubator_units')
      .update(updates)
      .eq('incubator_id', incubatorId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'unknown',
      userRole: userRole || 'unknown',
      action: 'incubator_updated',
      entityType: 'incubator',
      entityId: incubatorId,
      before: { name: current.name, status: current.status, location: current.location },
      after: updates,
      reason: reason || `Incubator updated: ${Object.keys(updates).join(', ')}`,
      req,
    });

    return { ok: true, incubatorId, updates };
  }

  // ── Environmental Logs ──────────────────────────────────────────────────

  async function addLog({ incubatorId, temperature, co2Level, humidity, doorOpenings, notes, recordedBy, recordedRole, req }) {
    if (!incubatorId) {
      throw Object.assign(new Error('incubatorId is required'), { statusCode: 400 });
    }

    const logId = ids.inocLogId();

    // Determine status by checking against setpoints
    let status = 'normal';
    const unit = await getIncubator(incubatorId);
    if (unit) {
      const tempDev = unit.temp_setpoint && temperature != null ? Math.abs(temperature - unit.temp_setpoint) : 0;
      const co2Dev = unit.co2_setpoint && co2Level != null ? Math.abs(co2Level - unit.co2_setpoint) : 0;
      const humDev = unit.humidity_setpoint && humidity != null ? Math.abs(humidity - unit.humidity_setpoint) : 0;

      if (tempDev > 2.0 || co2Dev > 1.0 || humDev > 10) {
        status = 'alarm';
      } else if (tempDev > 1.0 || co2Dev > 0.5 || humDev > 5) {
        status = 'warning';
      }
    }

    const row = {
      log_id: logId,
      incubator_id: incubatorId,
      recorded_by: recordedBy || 'unknown',
      recorded_role: recordedRole || 'operator',
      recorded_at: new Date().toISOString(),
      temperature: temperature != null ? temperature : null,
      co2_level: co2Level != null ? co2Level : null,
      humidity: humidity != null ? humidity : null,
      door_openings: doorOpenings != null ? doorOpenings : null,
      notes: notes || '',
      status,
    };

    const { error } = await supabase.from('incubator_logs').insert(row);
    if (error) throw error;

    await auditLog({
      userId: recordedBy || 'system',
      userRole: recordedRole || 'operator',
      action: 'incubator_log_created',
      entityType: 'incubator_log',
      entityId: logId,
      after: row,
      reason: `Environmental log for ${incubatorId}: T=${temperature} CO2=${co2Level} H=${humidity}`,
      req,
    });

    // Auto-create alarm if out of range
    if (status === 'alarm' || status === 'warning') {
      const alarmTypes = [];
      if (unit) {
        if (unit.temp_setpoint && temperature != null) {
          const d = temperature - unit.temp_setpoint;
          if (Math.abs(d) > 1.0) alarmTypes.push(d > 0 ? 'temp_high' : 'temp_low');
        }
        if (unit.co2_setpoint && co2Level != null) {
          const d = co2Level - unit.co2_setpoint;
          if (Math.abs(d) > 0.5) alarmTypes.push(d > 0 ? 'co2_high' : 'co2_low');
        }
        if (unit.humidity_setpoint && humidity != null) {
          const d = humidity - unit.humidity_setpoint;
          if (Math.abs(d) > 5) alarmTypes.push(d > 0 ? 'humidity_high' : 'humidity_low');
        }
      }
      for (const alarmType of alarmTypes) {
        await addAlarm({
          incubatorId,
          alarmType,
          severity: status === 'alarm' ? 'critical' : 'warning',
          notes: `Auto-generated from log ${logId}`,
          req,
        });
      }
    }

    return { ok: true, logId, status };
  }

  async function listLogs(incubatorId, { from, to, limit: lim } = {}) {
    let query = supabase
      .from('incubator_logs')
      .select('*')
      .eq('incubator_id', incubatorId)
      .order('recorded_at', { ascending: false });
    if (from) query = query.gte('recorded_at', from);
    if (to) query = query.lte('recorded_at', to);
    if (lim) query = query.limit(lim);

    const { data, error } = await query;
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  // ── Alarms ──────────────────────────────────────────────────────────────

  async function addAlarm({ incubatorId, alarmType, severity, notes, req }) {
    if (!incubatorId || !alarmType) {
      throw Object.assign(new Error('incubatorId and alarmType are required'), { statusCode: 400 });
    }

    const alarmId = ids.inocAlarmId();

    const row = {
      alarm_id: alarmId,
      incubator_id: incubatorId,
      alarm_type: alarmType,
      severity: severity || 'warning',
      triggered_at: new Date().toISOString(),
      notes: notes || '',
    };

    const { error } = await supabase.from('incubator_alarms').insert(row);
    if (error) throw error;

    await auditLog({
      userId: 'system',
      userRole: 'system',
      action: 'incubator_alarm_created',
      entityType: 'incubator_alarm',
      entityId: alarmId,
      after: row,
      reason: `Alarm ${alarmType} (${severity}) on ${incubatorId}`,
      req,
    });

    return { ok: true, alarmId };
  }

  async function acknowledgeAlarm({ alarmId, userId, userRole, notes, req }) {
    const { data: current, error: fetchErr } = await supabase
      .from('incubator_alarms')
      .select('*')
      .eq('alarm_id', alarmId)
      .single();
    if (fetchErr || !current) {
      throw Object.assign(new Error('Alarm not found'), { statusCode: 404 });
    }

    const updates = {
      acknowledged_by: userId,
      acknowledged_at: new Date().toISOString(),
    };
    if (notes) updates.notes = (current.notes ? current.notes + '\n' : '') + notes;

    const { error } = await supabase
      .from('incubator_alarms')
      .update(updates)
      .eq('alarm_id', alarmId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'unknown',
      userRole: userRole || 'unknown',
      action: 'incubator_alarm_acknowledged',
      entityType: 'incubator_alarm',
      entityId: alarmId,
      before: { acknowledged_by: current.acknowledged_by },
      after: updates,
      reason: `Alarm ${alarmId} acknowledged`,
      req,
    });

    return { ok: true, alarmId };
  }

  async function resolveAlarm({ alarmId, userId, userRole, notes, req }) {
    const { data: current, error: fetchErr } = await supabase
      .from('incubator_alarms')
      .select('*')
      .eq('alarm_id', alarmId)
      .single();
    if (fetchErr || !current) {
      throw Object.assign(new Error('Alarm not found'), { statusCode: 404 });
    }

    const updates = {
      resolved_at: new Date().toISOString(),
    };
    if (notes) updates.notes = (current.notes ? current.notes + '\n' : '') + notes;

    const { error } = await supabase
      .from('incubator_alarms')
      .update(updates)
      .eq('alarm_id', alarmId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'unknown',
      userRole: userRole || 'unknown',
      action: 'incubator_alarm_resolved',
      entityType: 'incubator_alarm',
      entityId: alarmId,
      before: { resolved_at: current.resolved_at },
      after: updates,
      reason: `Alarm ${alarmId} resolved`,
      req,
    });

    return { ok: true, alarmId };
  }

  async function listAlarms(incubatorId, { active } = {}) {
    let query = supabase
      .from('incubator_alarms')
      .select('*')
      .eq('incubator_id', incubatorId)
      .order('triggered_at', { ascending: false });
    if (active) query = query.is('resolved_at', null);

    const { data, error } = await query;
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  // ── Calibration ─────────────────────────────────────────────────────────

  async function addCalibration({ incubatorId, calibratedBy, calibratedRole, calibrationDate, nextDue, tempOffset, co2Offset, humidityOffset, result, certificateRef, notes, esigUser, esigReason, req }) {
    if (!incubatorId || !calibratedBy || !calibrationDate) {
      throw Object.assign(new Error('incubatorId, calibratedBy, and calibrationDate are required'), { statusCode: 400 });
    }

    const calibrationId = ids.inocCalId();

    const row = {
      calibration_id: calibrationId,
      incubator_id: incubatorId,
      calibrated_by: calibratedBy,
      calibrated_role: calibratedRole || 'engineering',
      calibration_date: calibrationDate,
      next_due: nextDue || null,
      temp_offset: tempOffset != null ? tempOffset : null,
      co2_offset: co2Offset != null ? co2Offset : null,
      humidity_offset: humidityOffset != null ? humidityOffset : null,
      result: result || 'pass',
      certificate_ref: certificateRef || '',
      notes: notes || '',
      esig_user: esigUser || null,
      esig_at: esigUser ? new Date().toISOString() : null,
      esig_reason: esigReason || null,
    };

    const { error } = await supabase.from('incubator_calibrations').insert(row);
    if (error) throw error;

    await auditLog({
      userId: calibratedBy,
      userRole: calibratedRole || 'engineering',
      action: 'incubator_calibration_created',
      entityType: 'incubator_calibration',
      entityId: calibrationId,
      after: row,
      reason: `Calibration for ${incubatorId}: result=${result || 'pass'}`,
      req,
    });

    return { ok: true, calibrationId };
  }

  async function listCalibrations(incubatorId) {
    const { data, error } = await supabase
      .from('incubator_calibrations')
      .select('*')
      .eq('incubator_id', incubatorId)
      .order('calibration_date', { ascending: false });
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  // ── Maintenance ─────────────────────────────────────────────────────────

  async function addMaintenance({ incubatorId, type, description, performedBy, performedRole, performedAt, nextDue, notes, esigUser, esigReason, req }) {
    if (!incubatorId || !type) {
      throw Object.assign(new Error('incubatorId and type are required'), { statusCode: 400 });
    }

    const maintenanceId = ids.inocMntId();

    const row = {
      maintenance_id: maintenanceId,
      incubator_id: incubatorId,
      type,
      description: description || '',
      performed_by: performedBy || 'unknown',
      performed_role: performedRole || 'engineering',
      performed_at: performedAt || new Date().toISOString(),
      next_due: nextDue || null,
      status: 'completed',
      notes: notes || '',
      esig_user: esigUser || null,
      esig_at: esigUser ? new Date().toISOString() : null,
      esig_reason: esigReason || null,
    };

    const { error } = await supabase.from('incubator_maintenance').insert(row);
    if (error) throw error;

    await auditLog({
      userId: performedBy || 'system',
      userRole: performedRole || 'engineering',
      action: 'incubator_maintenance_created',
      entityType: 'incubator_maintenance',
      entityId: maintenanceId,
      after: row,
      reason: `${type} maintenance for ${incubatorId}`,
      req,
    });

    return { ok: true, maintenanceId };
  }

  async function listMaintenance(incubatorId) {
    const { data, error } = await supabase
      .from('incubator_maintenance')
      .select('*')
      .eq('incubator_id', incubatorId)
      .order('performed_at', { ascending: false });
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  // ── AI: Parameter Trending ──────────────────────────────────────────────

  async function getTrending(incubatorId) {
    const unit = await getIncubator(incubatorId);
    if (!unit) {
      throw Object.assign(new Error('Incubator not found'), { statusCode: 404 });
    }

    const logs = await listLogs(incubatorId, { limit: 200 });

    const prompt = `You are a GMP environmental monitoring analyst. Analyse this CO2 incubator's logbook data and provide:
1. **Temperature Trends** — stability, drift, and deviation from setpoint
2. **CO2 Level Trends** — consistency and any drift patterns
3. **Humidity Trends** — stability analysis
4. **Door Opening Impact** — correlation with parameter excursions

Incubator: ${unit.name} (${unit.model || 'N/A'})
Location: ${unit.location || 'N/A'}
Setpoints: Temp=${unit.temp_setpoint}°C, CO2=${unit.co2_setpoint}%, Humidity=${unit.humidity_setpoint}%

Recent readings (${logs.length}):
${logs.slice(0, 100).map(l => `- ${l.recorded_at} | T=${l.temperature} CO2=${l.co2_level} H=${l.humidity} Doors=${l.door_openings} Status=${l.status}`).join('\n')}

Respond in JSON: { "trends": [{ "parameter": "...", "direction": "stable|rising|falling", "concern": "none|low|medium|high", "detail": "..." }], "drift_alerts": [...], "stability_score": "good|acceptable|poor", "summary": "..." }`;

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

  // ── AI: Alarm Pattern Analysis ──────────────────────────────────────────

  async function getAlarmPatterns(incubatorId) {
    const unit = await getIncubator(incubatorId);
    if (!unit) {
      throw Object.assign(new Error('Incubator not found'), { statusCode: 404 });
    }

    const alarms = await listAlarms(incubatorId);

    const prompt = `You are a GMP equipment reliability analyst. Analyse alarm history for this CO2 incubator:

Incubator: ${unit.name} (${unit.model || 'N/A'})
Location: ${unit.location || 'N/A'}

Alarm history (${alarms.length}):
${alarms.slice(0, 100).map(a => `- ${a.triggered_at} | Type=${a.alarm_type} Severity=${a.severity} Ack=${a.acknowledged_at || 'N/A'} Resolved=${a.resolved_at || 'N/A'}`).join('\n')}

Identify:
1. Recurring patterns (time-of-day, day-of-week correlations)
2. Alarm escalation trends
3. Root cause correlations
4. Recommendations for prevention

Respond in JSON: { "patterns": [{ "description": "...", "frequency": "...", "risk": "low|medium|high" }], "correlations": [...], "recommendations": [...], "risk_level": "low|medium|high" }`;

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

  // ── AI: Capacity Planning ───────────────────────────────────────────────

  async function getCapacityPlanning() {
    const units = await listIncubators();

    // Gather recent log counts per unit
    const summaries = [];
    for (const u of units) {
      const logs = await listLogs(u.incubator_id, { limit: 50 });
      const alarms = await listAlarms(u.incubator_id, { active: true });
      summaries.push({
        id: u.incubator_id,
        name: u.name,
        status: u.status,
        location: u.location,
        recentLogs: logs.length,
        activeAlarms: alarms.length,
        lastReading: logs[0] || null,
      });
    }

    const prompt = `You are a GMP capacity planning analyst. Analyse the CO2 incubator fleet:

Fleet (${units.length} units):
${summaries.map(s => `- ${s.id} "${s.name}" | Status=${s.status} Location=${s.location} | Logs(50d)=${s.recentLogs} ActiveAlarms=${s.activeAlarms} LastTemp=${s.lastReading ? s.lastReading.temperature : 'N/A'}`).join('\n')}

Provide:
1. Current utilisation per unit
2. Capacity projections
3. Optimal redistribution suggestions
4. Maintenance window recommendations

Respond in JSON: { "utilisation": [{ "id": "...", "name": "...", "usage_pct": 0, "status_note": "..." }], "projections": [...], "recommendations": [...], "summary": "..." }`;

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
    listIncubators, getIncubator, createIncubator, updateIncubator,
    addLog, listLogs,
    addAlarm, acknowledgeAlarm, resolveAlarm, listAlarms,
    addCalibration, listCalibrations,
    addMaintenance, listMaintenance,
    getTrending, getAlarmPatterns, getCapacityPlanning,
  };
}

module.exports = makeIncubatorService;
