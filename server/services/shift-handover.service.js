'use strict';

const ids = require('../lib/ids');
const parseClaudeJson = require('../lib/parse-claude-json');

// ── AI Prompt Templates ─────────────────────────────────────────────────────

const SUMMARISE_PROMPT = (handover) => `You are a pharmaceutical manufacturing shift handover specialist at a GMP biologics facility operating under 21 CFR Part 11 and EU Annex 11.

Given the following structured shift handover data, generate a concise narrative summary suitable for the incoming shift team. Highlight anything safety-critical or time-sensitive first.

SHIFT HANDOVER DATA:
Date: ${handover.shift_date}
Shift: ${handover.shift_type}
Outgoing User: ${handover.outgoing_user}

Open Batches:
${JSON.stringify(handover.open_batches || [], null, 2)}

Pending Samples:
${JSON.stringify(handover.pending_samples || [], null, 2)}

Equipment Holds:
${JSON.stringify(handover.equipment_holds || [], null, 2)}

Safety Items:
${JSON.stringify(handover.safety_items || [], null, 2)}

General Notes:
${handover.notes || 'None'}

Write a clear, professional shift handover summary (2-3 paragraphs). Prioritise safety items and time-critical actions. Use GMP-appropriate language.

Return ONLY valid JSON (no markdown fences):
{
  "summary": "The shift summary text..."
}`;

const FLAG_UNRESOLVED_PROMPT = (recentHandovers) => `You are a pharmaceutical manufacturing quality assistant. Review the following recent shift handovers and identify any items that appear unresolved or require follow-up.

RECENT HANDOVERS (last 3 shifts):
${JSON.stringify(recentHandovers.map(h => ({
  handover_id: h.handover_id,
  shift_date: h.shift_date,
  shift_type: h.shift_type,
  open_batches: h.open_batches,
  pending_samples: h.pending_samples,
  equipment_holds: h.equipment_holds,
  safety_items: h.safety_items,
  notes: h.notes
})), null, 2)}

Identify items that appear in multiple handovers or seem unresolved. Flag anything safety-critical.

Return ONLY valid JSON (no markdown fences):
{
  "unresolved_items": [
    {
      "category": "open_batches|pending_samples|equipment_holds|safety_items",
      "description": "What the unresolved item is",
      "first_seen": "handover_id where it first appeared",
      "severity": "high|medium|low",
      "recommendation": "Suggested action"
    }
  ]
}`;

// ── Service Factory ─────────────────────────────────────────────────────────

function makeShiftHandoverService({ supabase, auditLog, anthropic }) {

  // ── CREATE ────────────────────────────────────────────────────────────────

  async function createHandover({
    shiftType, outgoingUser, outgoingRole, openBatches, pendingSamples,
    equipmentHolds, safetyItems, notes, req
  }) {
    if (!outgoingUser) throw Object.assign(new Error('outgoingUser is required'), { statusCode: 400 });

    const handoverId = ids.handoverId();

    const row = {
      handover_id: handoverId,
      shift_type: shiftType || 'day',
      shift_date: new Date().toISOString().slice(0, 10),
      outgoing_user: outgoingUser,
      outgoing_role: outgoingRole || '',
      status: 'draft',
      open_batches: openBatches || [],
      pending_samples: pendingSamples || [],
      equipment_holds: equipmentHolds || [],
      safety_items: safetyItems || [],
      notes: notes || '',
    };

    const { error } = await supabase.from('shift_handovers').insert(row);
    if (error) throw error;

    await auditLog({
      userId: outgoingUser,
      userRole: outgoingRole || 'operator',
      action: 'handover_created',
      entityType: 'handover',
      entityId: handoverId,
      after: { shiftType: row.shift_type, shiftDate: row.shift_date },
      reason: `Shift handover initiated for ${row.shift_type} shift on ${row.shift_date}`,
      req,
    });

    return { ok: true, handoverId };
  }

  // ── READ ──────────────────────────────────────────────────────────────────

  async function getHandover(handoverId) {
    const { data, error } = await supabase
      .from('shift_handovers').select('*').eq('handover_id', handoverId).single();
    if (error) {
      if (error.message.includes('does not exist')) throw Object.assign(new Error('Handover not found'), { statusCode: 404 });
      throw error;
    }
    if (!data) throw Object.assign(new Error('Handover not found'), { statusCode: 404 });
    return data;
  }

  async function listHandovers({ shiftDate, shiftType, status } = {}) {
    let query = supabase.from('shift_handovers').select('*').order('created_at', { ascending: false });
    if (shiftDate) query = query.eq('shift_date', shiftDate);
    if (shiftType) query = query.eq('shift_type', shiftType);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  async function getCurrentHandover() {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('shift_handovers')
      .select('*')
      .eq('shift_date', today)
      .in('status', ['draft', 'pending'])
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) {
      if (error.message.includes('does not exist')) return null;
      throw error;
    }
    return (data && data.length > 0) ? data[0] : null;
  }

  // ── UPDATE ────────────────────────────────────────────────────────────────

  async function updateHandover({
    handoverId, shiftType, openBatches, pendingSamples,
    equipmentHolds, safetyItems, notes, status, userId, userRole, reason, req
  }) {
    const current = await getHandover(handoverId);

    const updates = {};
    if (shiftType !== undefined)      updates.shift_type = shiftType;
    if (openBatches !== undefined)    updates.open_batches = openBatches;
    if (pendingSamples !== undefined)  updates.pending_samples = pendingSamples;
    if (equipmentHolds !== undefined)  updates.equipment_holds = equipmentHolds;
    if (safetyItems !== undefined)     updates.safety_items = safetyItems;
    if (notes !== undefined)           updates.notes = notes;
    if (status !== undefined)          updates.status = status;
    updates.updated_at = new Date().toISOString();

    const { error } = await supabase.from('shift_handovers').update(updates).eq('handover_id', handoverId);
    if (error) throw error;

    await auditLog({
      userId: userId || current.outgoing_user,
      userRole: userRole || current.outgoing_role || 'operator',
      action: 'handover_updated',
      entityType: 'handover',
      entityId: handoverId,
      before: current,
      after: updates,
      reason: reason || `Handover ${handoverId} updated`,
      req,
    });

    return { ok: true, handoverId, updates };
  }

  // ── ACKNOWLEDGE ───────────────────────────────────────────────────────────

  async function acknowledgeHandover({ handoverId, incomingUser, incomingRole, req }) {
    if (!incomingUser) throw Object.assign(new Error('incomingUser is required'), { statusCode: 400 });

    const current = await getHandover(handoverId);
    if (current.status === 'acknowledged') {
      throw Object.assign(new Error('Handover already acknowledged'), { statusCode: 400 });
    }

    const updates = {
      status: 'acknowledged',
      incoming_user: incomingUser,
      incoming_role: incomingRole || '',
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: incomingUser,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('shift_handovers').update(updates).eq('handover_id', handoverId);
    if (error) throw error;

    await auditLog({
      userId: incomingUser,
      userRole: incomingRole || 'operator',
      action: 'handover_acknowledged',
      entityType: 'handover',
      entityId: handoverId,
      before: { status: current.status },
      after: { status: 'acknowledged', acknowledgedBy: incomingUser },
      reason: `Handover ${handoverId} acknowledged by incoming shift`,
      req,
    });

    return { ok: true, handoverId, acknowledgedBy: incomingUser };
  }

  // ── AI: SUMMARISE ─────────────────────────────────────────────────────────

  async function summariseHandover({ handoverId, req }) {
    const handover = await getHandover(handoverId);

    let summary = '';
    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: SUMMARISE_PROMPT(handover) }],
      });
      const result = parseClaudeJson(message.content[0].text);
      summary = result.summary || '';
    } catch (e) {
      console.error('[HANDOVER] AI summarise error:', e.message);
      throw Object.assign(new Error('AI summarisation failed: ' + e.message), { statusCode: 500 });
    }

    const { error } = await supabase.from('shift_handovers').update({
      ai_summary: summary,
      updated_at: new Date().toISOString(),
    }).eq('handover_id', handoverId);
    if (error) throw error;

    await auditLog({
      userId: 'system',
      userRole: 'system',
      action: 'handover_ai_summarised',
      entityType: 'handover',
      entityId: handoverId,
      after: { summaryLength: summary.length },
      reason: `AI summary generated for handover ${handoverId}`,
      req,
    });

    return { ok: true, handoverId, summary };
  }

  // ── AI: FLAG UNRESOLVED ───────────────────────────────────────────────────

  async function flagUnresolved({ req } = {}) {
    // Get last 3 handovers
    const { data: recent, error: fetchErr } = await supabase
      .from('shift_handovers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);
    if (fetchErr) {
      if (fetchErr.message.includes('does not exist')) return { ok: true, unresolvedItems: [] };
      throw fetchErr;
    }
    if (!recent || recent.length === 0) return { ok: true, unresolvedItems: [] };

    let unresolvedItems = [];
    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: FLAG_UNRESOLVED_PROMPT(recent) }],
      });
      const result = parseClaudeJson(message.content[0].text);
      unresolvedItems = result.unresolved_items || [];
    } catch (e) {
      console.error('[HANDOVER] AI flag unresolved error:', e.message);
    }

    return { ok: true, unresolvedItems };
  }

  // ── STATS ─────────────────────────────────────────────────────────────────

  async function getStats() {
    const { data, error } = await supabase
      .from('shift_handovers').select('*').order('created_at', { ascending: false });
    if (error) {
      if (error.message.includes('does not exist')) return { total: 0, unacknowledged: 0, todayHandovers: 0 };
      throw error;
    }
    const all = data || [];
    const today = new Date().toISOString().slice(0, 10);

    const unacknowledged = all.filter(h => h.status === 'pending').length;
    const todayHandovers = all.filter(h => h.shift_date === today).length;

    // Count unresolved items across recent handovers
    let unresolvedCount = 0;
    const pending = all.filter(h => h.status !== 'acknowledged');
    pending.forEach(h => {
      unresolvedCount += (h.open_batches || []).length;
      unresolvedCount += (h.pending_samples || []).length;
      unresolvedCount += (h.equipment_holds || []).length;
      unresolvedCount += (h.safety_items || []).length;
    });

    return {
      total: all.length,
      unacknowledged,
      todayHandovers,
      unresolvedCount,
      recentHandovers: all.slice(0, 10),
    };
  }

  return {
    createHandover, getHandover, listHandovers, getCurrentHandover,
    updateHandover, acknowledgeHandover, summariseHandover,
    flagUnresolved, getStats,
  };
}

module.exports = { makeShiftHandoverService };
