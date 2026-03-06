'use strict';

/**
 * services/cleaning-records.service.js
 *
 * GMP-compliant cleaning record management service.
 * Tracks manual cleaning and CIP (Clean-In-Place) cycles for production
 * equipment. Captures cleaning agent lot traceability, rinse conductivity
 * readings, visual inspections, operator sign-off, and hold time tracking.
 *
 * 21 CFR Part 11 compliant — immutable audit trail, second-person verification.
 */

const ids = require('../lib/ids');
const parseClaudeJson = require('../lib/parse-claude-json');

// ── AI Prompt Templates ─────────────────────────────────────────────────────

const HOLD_TIME_ALERT_PROMPT = (records) => `You are a GMP pharmaceutical cleaning compliance analyst for a biologics manufacturing facility operating under 21 CFR Part 11 and EU Annex 11.

Analyse the following equipment cleaning records and their hold time status. Flag equipment where hold times are about to expire or have expired and need re-cleaning.

CLEANING RECORDS:
${records.map(r => `- Equipment: ${r.equip_id} | Cleaning ID: ${r.cleaning_id} | Status: ${r.status} | Completed: ${r.completed_at || 'N/A'} | Hold expires: ${r.hold_time_expires || 'N/A'} | Hold hours: ${r.hold_time_hours}h | Conductivity: ${r.rinse_conductivity || 'N/A'} vs limit ${r.rinse_conductivity_limit} | Visual: ${r.visual_inspection}`).join('\n')}

Categorise each record:
- "ok" — hold time valid, all readings in spec
- "expiring_soon" — less than 4 hours remaining on hold time
- "expired" — hold time has passed, equipment needs re-cleaning
- "out_of_spec" — conductivity or visual inspection failed

Return ONLY valid JSON (no markdown fences):
{
  "alerts": [
    {
      "cleaning_id": "CLN-XXXX",
      "equip_id": "EQ-XXXX",
      "category": "ok|expiring_soon|expired|out_of_spec",
      "message": "Brief description of the issue or status",
      "priority": "low|medium|high|critical"
    }
  ],
  "summary": "Overall cleaning compliance summary"
}`;

const COMPLIANCE_TREND_PROMPT = (records) => `You are a GMP pharmaceutical cleaning compliance analyst for a biologics manufacturing facility.

Analyse the following cleaning records for compliance trends, patterns of missed steps, out-of-spec conductivity readings, and potential systemic issues.

CLEANING RECORDS (last 50):
${records.map(r => `- ${r.cleaning_id} | Equip: ${r.equip_id} | Type: ${r.cleaning_type} | Agent: ${r.cleaning_agent} (Lot: ${r.agent_lot_number}) | Conductivity: ${r.rinse_conductivity || 'N/A'} vs ${r.rinse_conductivity_limit} | Visual: ${r.visual_inspection} | Status: ${r.status} | Operator: ${r.operator} | Created: ${r.created_at}`).join('\n')}

Return ONLY valid JSON (no markdown fences):
{
  "trends": [
    {"trend": "Description of observed trend", "severity": "low|medium|high", "recommendation": "Suggested action"}
  ],
  "out_of_spec_rate": 0.0,
  "most_common_issues": ["Issue 1", "Issue 2"],
  "equipment_risk_ranking": [
    {"equip_id": "EQ-XXXX", "risk": "low|medium|high", "reason": "Why"}
  ],
  "summary": "Overall compliance trend summary"
}`;

// ── Service Factory ─────────────────────────────────────────────────────────

function makeCleaningRecordsService({ supabase, auditLog, anthropic }) {

  // ── CREATE ──────────────────────────────────────────────────────────────

  async function createCleaningRecord({
    equipId, cleaningType, cleaningAgent, agentLotNumber,
    agentConcentration, holdTimeHours, operator, userId, userRole, req
  }) {
    if (!equipId) throw Object.assign(new Error('equipId is required'), { statusCode: 400 });
    if (!operator) throw Object.assign(new Error('operator is required'), { statusCode: 400 });

    const cleaningId = ids.cleaningId();

    const row = {
      cleaning_id: cleaningId,
      equip_id: equipId,
      cleaning_type: cleaningType || 'manual',
      cleaning_agent: cleaningAgent || '',
      agent_lot_number: agentLotNumber || '',
      agent_concentration: agentConcentration || '',
      rinse_conductivity: null,
      rinse_conductivity_limit: 1.0,
      visual_inspection: 'pending',
      operator,
      verifier: null,
      verified_at: null,
      status: 'in_progress',
      started_at: new Date().toISOString(),
      completed_at: null,
      hold_time_expires: null,
      hold_time_hours: holdTimeHours || 72,
      notes: '',
      created_by: userId || operator,
    };

    const { error } = await supabase.from('cleaning_records').insert(row);
    if (error) throw error;

    await auditLog({
      userId: userId || operator,
      userRole: userRole || 'operator',
      action: 'cleaning_record_created',
      entityType: 'cleaning_record',
      entityId: cleaningId,
      after: { equipId, cleaningType: row.cleaning_type, operator, cleaningAgent },
      reason: `Cleaning started on ${equipId}: ${row.cleaning_type}`,
      req,
    });

    return { ok: true, cleaningId };
  }

  // ── LIST ────────────────────────────────────────────────────────────────

  async function listCleaningRecords({ status, equipId, from, to } = {}) {
    let query = supabase
      .from('cleaning_records')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (equipId) query = query.eq('equip_id', equipId);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data, error } = await query;
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  // ── GET BY EQUIPMENT ───────────────────────────────────────────────────

  async function getCleaningByEquipment(equipId) {
    const { data, error } = await supabase
      .from('cleaning_records')
      .select('*')
      .eq('equip_id', equipId)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  // ── GET SINGLE ─────────────────────────────────────────────────────────

  async function getCleaningRecord(cleaningId) {
    const { data, error } = await supabase
      .from('cleaning_records')
      .select('*')
      .eq('cleaning_id', cleaningId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw Object.assign(new Error('Cleaning record not found'), { statusCode: 404 });
      }
      if (error.message.includes('does not exist')) {
        throw Object.assign(new Error('Cleaning record not found'), { statusCode: 404 });
      }
      throw error;
    }
    if (!data) throw Object.assign(new Error('Cleaning record not found'), { statusCode: 404 });
    return data;
  }

  // ── UPDATE ─────────────────────────────────────────────────────────────

  async function updateCleaningRecord({
    cleaningId, cleaningAgent, agentLotNumber, agentConcentration,
    rinseConductivity, rinseConductivityLimit, visualInspection,
    holdTimeHours, notes, userId, userRole, reason, req
  }) {
    const current = await getCleaningRecord(cleaningId);

    const updates = { updated_at: new Date().toISOString() };
    if (cleaningAgent !== undefined)         updates.cleaning_agent = cleaningAgent;
    if (agentLotNumber !== undefined)        updates.agent_lot_number = agentLotNumber;
    if (agentConcentration !== undefined)    updates.agent_concentration = agentConcentration;
    if (rinseConductivity !== undefined)     updates.rinse_conductivity = rinseConductivity;
    if (rinseConductivityLimit !== undefined) updates.rinse_conductivity_limit = rinseConductivityLimit;
    if (visualInspection !== undefined)      updates.visual_inspection = visualInspection;
    if (holdTimeHours !== undefined)         updates.hold_time_hours = holdTimeHours;
    if (notes !== undefined)                 updates.notes = notes;

    const { error } = await supabase
      .from('cleaning_records')
      .update(updates)
      .eq('cleaning_id', cleaningId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'operator',
      action: 'cleaning_record_updated',
      entityType: 'cleaning_record',
      entityId: cleaningId,
      before: current,
      after: updates,
      reason: reason || `Cleaning record ${cleaningId} updated`,
      req,
    });

    return { ok: true, cleaningId, updates };
  }

  // ── COMPLETE ───────────────────────────────────────────────────────────

  async function completeCleaningRecord({
    cleaningId, rinseConductivity, visualInspection, notes,
    userId, userRole, req
  }) {
    const current = await getCleaningRecord(cleaningId);

    if (current.status !== 'in_progress') {
      throw Object.assign(
        new Error(`Cannot complete cleaning in status "${current.status}". Must be "in_progress".`),
        { statusCode: 400 }
      );
    }

    const now = new Date();
    const holdHours = current.hold_time_hours || 72;
    const holdExpires = new Date(now.getTime() + holdHours * 60 * 60 * 1000);

    const updates = {
      status: 'completed',
      rinse_conductivity: rinseConductivity !== undefined ? rinseConductivity : current.rinse_conductivity,
      visual_inspection: visualInspection || current.visual_inspection || 'pass',
      notes: notes !== undefined ? notes : current.notes,
      completed_at: now.toISOString(),
      hold_time_expires: holdExpires.toISOString(),
      updated_at: now.toISOString(),
    };

    const { error } = await supabase
      .from('cleaning_records')
      .update(updates)
      .eq('cleaning_id', cleaningId);
    if (error) throw error;

    await auditLog({
      userId: userId || current.operator,
      userRole: userRole || 'operator',
      action: 'cleaning_record_completed',
      entityType: 'cleaning_record',
      entityId: cleaningId,
      before: { status: current.status },
      after: {
        status: 'completed',
        rinseConductivity: updates.rinse_conductivity,
        visualInspection: updates.visual_inspection,
        holdTimeExpires: updates.hold_time_expires,
      },
      reason: `Cleaning ${cleaningId} completed — hold time expires ${holdExpires.toISOString()}`,
      req,
    });

    return { ok: true, cleaningId, holdTimeExpires: holdExpires.toISOString() };
  }

  // ── VERIFY (second-person sign-off, 21 CFR Part 11) ───────────────────

  async function verifyCleaningRecord({ cleaningId, verifier, userId, userRole, req }) {
    const current = await getCleaningRecord(cleaningId);

    if (current.status !== 'completed') {
      throw Object.assign(
        new Error(`Cannot verify cleaning in status "${current.status}". Must be "completed".`),
        { statusCode: 400 }
      );
    }

    if (verifier === current.operator) {
      throw Object.assign(
        new Error('Verifier must be different from the operator (second-person verification required)'),
        { statusCode: 400 }
      );
    }

    const now = new Date().toISOString();
    const updates = {
      status: 'verified',
      verifier: verifier,
      verified_at: now,
      updated_at: now,
    };

    const { error } = await supabase
      .from('cleaning_records')
      .update(updates)
      .eq('cleaning_id', cleaningId);
    if (error) throw error;

    await auditLog({
      userId: userId || verifier,
      userRole: userRole || 'operator',
      action: 'cleaning_record_verified',
      entityType: 'cleaning_record',
      entityId: cleaningId,
      before: { status: current.status },
      after: { status: 'verified', verifier, verified_at: now },
      reason: `Cleaning ${cleaningId} verified by ${verifier}`,
      req,
    });

    return { ok: true, cleaningId, verifier, verifiedAt: now };
  }

  // ── HOLD TIMES ─────────────────────────────────────────────────────────

  async function getHoldTimes() {
    // Get all completed (not yet verified) records that have active hold times
    const { data, error } = await supabase
      .from('cleaning_records')
      .select('*')
      .in('status', ['completed', 'verified'])
      .not('hold_time_expires', 'is', null)
      .order('hold_time_expires', { ascending: true });

    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }

    const now = new Date();
    const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

    return (data || []).map(r => {
      const expires = new Date(r.hold_time_expires);
      const remaining = expires - now;
      let holdStatus = 'ok';
      if (remaining <= 0) holdStatus = 'expired';
      else if (remaining <= FOUR_HOURS_MS) holdStatus = 'expiring_soon';

      return {
        ...r,
        hold_status: holdStatus,
        remaining_ms: Math.max(0, remaining),
        remaining_hours: Math.max(0, remaining / (60 * 60 * 1000)),
      };
    });
  }

  // ── STATS (dashboard) ─────────────────────────────────────────────────

  async function getStats() {
    const { data, error } = await supabase
      .from('cleaning_records')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.message.includes('does not exist')) {
        return { total: 0, inProgress: 0, completed: 0, verified: 0, expiredHold: 0 };
      }
      throw error;
    }

    const all = data || [];
    const now = new Date();

    let inProgress = 0;
    let completed = 0;
    let verified = 0;
    let expiredHold = 0;

    all.forEach(r => {
      if (r.status === 'in_progress') inProgress++;
      if (r.status === 'completed') {
        completed++;
        if (r.hold_time_expires && new Date(r.hold_time_expires) < now) expiredHold++;
      }
      if (r.status === 'verified') verified++;
    });

    return {
      total: all.length,
      inProgress,
      completed,
      verified,
      expiredHold,
    };
  }

  // ── AI: Hold Time Alerts ──────────────────────────────────────────────

  async function aiHoldTimeAlerts() {
    const holdTimes = await getHoldTimes();
    if (holdTimes.length === 0) {
      return { alerts: [], summary: 'No active hold times to analyse.' };
    }

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: HOLD_TIME_ALERT_PROMPT(holdTimes) }],
      });
      const result = parseClaudeJson(message.content[0].text);
      return result;
    } catch (e) {
      console.error('[CLEANING] AI hold time alert error:', e.message);
      return { alerts: [], summary: 'AI analysis unavailable.', error: e.message };
    }
  }

  // ── AI: Compliance Trend Analysis ──────────────────────────────────────

  async function aiComplianceTrends() {
    const records = await listCleaningRecords();
    const recent = records.slice(0, 50);

    if (recent.length === 0) {
      return { trends: [], summary: 'No cleaning records to analyse.' };
    }

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: COMPLIANCE_TREND_PROMPT(recent) }],
      });
      const result = parseClaudeJson(message.content[0].text);
      return result;
    } catch (e) {
      console.error('[CLEANING] AI compliance trend error:', e.message);
      return { trends: [], summary: 'AI analysis unavailable.', error: e.message };
    }
  }

  return {
    createCleaningRecord,
    listCleaningRecords,
    getCleaningByEquipment,
    getCleaningRecord,
    updateCleaningRecord,
    completeCleaningRecord,
    verifyCleaningRecord,
    getHoldTimes,
    getStats,
    aiHoldTimeAlerts,
    aiComplianceTrends,
  };
}

module.exports = { makeCleaningRecordsService };
