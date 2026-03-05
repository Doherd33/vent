'use strict';

/**
 * services/us-media-prep.service.js
 *
 * Media & Buffer Prep — recipe execution for media, feeds, buffers.
 *   - Record CRUD (create, update, list, get)
 *   - AI recipe compliance verification
 *   - Component verification
 *   - Hold time monitoring
 *
 * Routes should call these functions and handle only HTTP concerns.
 */

const ids = require('../lib/ids');

function makeMediaPrepService({ supabase, auditLog, anthropic }) {

  const TABLE = 'media_buffer_records';

  // ── List records ──────────────────────────────────────────────────────────

  async function listRecords({ status, recipeType } = {}) {
    let query = supabase.from(TABLE).select('*');
    if (status)     query = query.eq('status', status);
    if (recipeType) query = query.eq('recipe_type', recipeType);
    query = query.order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  // ── Get single record ─────────────────────────────────────────────────────

  async function getRecord(recordId) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('record_id', recordId)
      .single();
    if (error) {
      if (error.code === 'PGRST116') {
        throw Object.assign(new Error('Record not found'), { statusCode: 404 });
      }
      throw error;
    }
    return data;
  }

  // ── Create record ─────────────────────────────────────────────────────────

  async function createRecord({ recipeName, recipeType, batchId, components, phTarget,
    filterType, filterLot, holdTimeHours, volumeLitres, temperatureC, notes, userId, userRole, req }) {
    if (!recipeName) {
      throw Object.assign(new Error('recipeName is required'), { statusCode: 400 });
    }

    const recordId = ids.mediaPrepId();

    // Calculate hold expiry if hold time specified
    let holdStart = null;
    let holdExpiry = null;
    if (holdTimeHours) {
      holdStart = new Date().toISOString();
      holdExpiry = new Date(Date.now() + holdTimeHours * 3600000).toISOString();
    }

    const row = {
      record_id:       recordId,
      recipe_name:     recipeName,
      recipe_type:     recipeType || 'media',
      batch_id:        batchId || null,
      status:          'draft',
      components:      components || [],
      ph_target:       phTarget || null,
      filter_type:     filterType || null,
      filter_lot:      filterLot || null,
      filter_integrity: 'pending',
      hold_time_hours: holdTimeHours || null,
      hold_start:      holdStart,
      hold_expiry:     holdExpiry,
      volume_litres:   volumeLitres || null,
      temperature_c:   temperatureC || null,
      prepared_by:     userId || 'unknown',
      prepared_role:   userRole || 'operator',
      notes:           notes || '',
    };

    const { error } = await supabase.from(TABLE).insert(row);
    if (error) throw error;

    await auditLog({
      userId:     userId || 'unknown',
      userRole:   userRole || 'operator',
      action:     'media_prep_created',
      entityType: 'media_prep',
      entityId:   recordId,
      after:      { recipeName, recipeType: row.recipe_type, batchId: row.batch_id },
      reason:     `Media/buffer prep record created: ${recipeName}`,
      req,
    });

    return { ok: true, recordId };
  }

  // ── Update record ─────────────────────────────────────────────────────────

  async function updateRecord({ recordId, updates, userId, userRole, reason, req }) {
    const current = await getRecord(recordId);

    const allowed = [
      'status', 'components', 'ph_actual', 'ph_adjusted', 'ph_adjusted_by', 'ph_adjusted_at',
      'filter_integrity', 'filter_tested_by', 'filter_tested_at',
      'verified_by', 'verified_at', 'esig_user', 'esig_at', 'esig_reason',
      'notes', 'ai_analysis', 'hold_start', 'hold_expiry',
    ];

    const patch = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (updates[key] !== undefined) patch[key] = updates[key];
    }

    const { error } = await supabase
      .from(TABLE)
      .update(patch)
      .eq('record_id', recordId);
    if (error) throw error;

    await auditLog({
      userId:     userId || 'unknown',
      userRole:   userRole || 'operator',
      action:     'media_prep_updated',
      entityType: 'media_prep',
      entityId:   recordId,
      before:     { status: current.status },
      after:      patch,
      reason:     reason || `Media prep updated: ${Object.keys(patch).join(', ')}`,
      req,
    });

    return { ok: true, recordId, updates: patch };
  }

  // ── AI: Recipe compliance verification ────────────────────────────────────

  async function verifyCompliance(recordId, { userId, userRole, req } = {}) {
    const record = await getRecord(recordId);

    const prompt = `You are a pharmaceutical manufacturing compliance expert.
Analyse this media/buffer preparation record and check for recipe compliance.

Record:
- Recipe: ${record.recipe_name}
- Type: ${record.recipe_type}
- Components: ${JSON.stringify(record.components)}
- pH Target: ${record.ph_target || 'N/A'}
- pH Actual: ${record.ph_actual || 'Not measured'}
- Filter Type: ${record.filter_type || 'N/A'}
- Filter Integrity: ${record.filter_integrity}
- Hold Time (hours): ${record.hold_time_hours || 'N/A'}
- Hold Start: ${record.hold_start || 'N/A'}
- Hold Expiry: ${record.hold_expiry || 'N/A'}
- Volume: ${record.volume_litres || 'N/A'} L
- Temperature: ${record.temperature_c || 'N/A'} °C
- Notes: ${record.notes || 'None'}

Respond in JSON with these fields:
{
  "compliant": true/false,
  "riskLevel": "low"/"medium"/"high",
  "findings": [{ "category": "...", "issue": "...", "severity": "info/warning/critical", "recommendation": "..." }],
  "holdTimeStatus": "ok"/"warning"/"expired",
  "phStatus": "ok"/"out_of_range"/"not_measured",
  "componentStatus": "all_verified"/"missing_verification"/"discrepancy",
  "summary": "Brief overall compliance summary"
}`;

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    let analysis;
    try {
      const text = msg.content[0].text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: text, compliant: false, findings: [] };
    } catch {
      analysis = { summary: msg.content[0].text, compliant: false, findings: [] };
    }

    // Persist the AI analysis
    await updateRecord({
      recordId,
      updates: { ai_analysis: analysis },
      userId, userRole,
      reason: 'AI compliance verification completed',
      req,
    });

    return { ok: true, recordId, analysis };
  }

  // ── Hold time check ───────────────────────────────────────────────────────

  async function checkHoldTimes() {
    const now = new Date();
    const { data, error } = await supabase
      .from(TABLE)
      .select('record_id, recipe_name, hold_expiry, status')
      .not('hold_expiry', 'is', null)
      .in('status', ['draft', 'in_progress', 'review']);
    if (error) {
      if (error.message.includes('does not exist')) return { expired: [], warning: [] };
      throw error;
    }

    const expired = [];
    const warning = [];
    const ONE_HOUR = 3600000;

    for (const r of (data || [])) {
      const expiry = new Date(r.hold_expiry);
      const remaining = expiry - now;
      if (remaining <= 0) {
        expired.push({ recordId: r.record_id, recipeName: r.recipe_name, expiredAt: r.hold_expiry });
      } else if (remaining <= ONE_HOUR) {
        warning.push({ recordId: r.record_id, recipeName: r.recipe_name, expiresAt: r.hold_expiry, minutesRemaining: Math.round(remaining / 60000) });
      }
    }

    return { expired, warning };
  }

  return {
    listRecords,
    getRecord,
    createRecord,
    updateRecord,
    verifyCompliance,
    checkHoldTimes,
  };
}

module.exports = makeMediaPrepService;
