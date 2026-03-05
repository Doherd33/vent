'use strict';

const ids = require('../lib/ids');
const parseClaudeJson = require('../lib/parse-claude-json');

// ── AI Prompt Templates ─────────────────────────────────────────────────────

const CLASSIFY_PROMPT = (title, description) => `You are a pharmaceutical quality deviation classifier for a biologics manufacturing facility operating under 21 CFR Part 11 and EU Annex 11.

Given the following deviation report, classify its severity as "critical", "major", or "minor".

DEFINITIONS:
- Critical: Direct impact on patient safety, product quality, or data integrity. Requires immediate containment. Examples: cross-contamination, sterility breach, out-of-spec API results, falsified records.
- Major: Significant departure from GMP, SOPs, or validated processes that could indirectly affect product quality. Requires investigation within 5 business days. Examples: equipment malfunction during production, repeated procedural deviations, environmental excursion outside action limits.
- Minor: Administrative or procedural lapses with no direct quality impact. Examples: documentation errors caught before release, minor labelling issues, single missed log entry with backup data available.

DEVIATION REPORT:
Title: ${title}
Description: ${description}

Return ONLY valid JSON (no markdown fences):
{
  "severity": "critical" | "major" | "minor",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of classification rationale"
}`;

const FIVE_WHY_PROMPT = (title, description, currentWhys) => `You are a pharmaceutical quality investigation assistant specialising in 5-Why root cause analysis for a biologics manufacturing facility.

DEVIATION:
Title: ${title}
Description: ${description}

${currentWhys.length > 0 ? `EXISTING WHY CHAIN:\n${currentWhys.map((w, i) => `Why ${i + 1}: ${w.question}\nAnswer: ${w.answer}`).join('\n')}` : 'No existing analysis yet.'}

Generate a complete 5-Why chain for this deviation. Each level should dig deeper into the root cause. Be specific to pharmaceutical/biologics manufacturing context.

Return ONLY valid JSON (no markdown fences):
{
  "whys": [
    {"level": 1, "question": "Why did [the deviation] occur?", "answer": "Because...", "ai_suggested": true},
    {"level": 2, "question": "Why did [answer 1] happen?", "answer": "Because...", "ai_suggested": true},
    {"level": 3, "question": "Why did [answer 2] happen?", "answer": "Because...", "ai_suggested": true},
    {"level": 4, "question": "Why did [answer 3] happen?", "answer": "Because...", "ai_suggested": true},
    {"level": 5, "question": "Why did [answer 4] happen?", "answer": "Because...", "ai_suggested": true}
  ]
}`;

const ISHIKAWA_PROMPT = (title, description, processArea, equipmentRef) => `You are a pharmaceutical quality investigation assistant creating an Ishikawa (fishbone) cause-and-effect analysis for a biologics manufacturing facility.

DEVIATION:
Title: ${title}
Description: ${description}
Process Area: ${processArea || 'Not specified'}
Equipment: ${equipmentRef || 'Not specified'}

Generate potential causes across all 6 Ishikawa categories (6M). Provide 2-4 specific, actionable causes per category relevant to this deviation in a pharmaceutical/biologics context.

Return ONLY valid JSON (no markdown fences):
{
  "man": ["Cause 1", "Cause 2"],
  "machine": ["Cause 1", "Cause 2"],
  "method": ["Cause 1", "Cause 2"],
  "material": ["Cause 1", "Cause 2"],
  "measurement": ["Cause 1", "Cause 2"],
  "environment": ["Cause 1", "Cause 2"]
}`;

const ROOT_CAUSE_PROMPT = (title, description, fiveWhy, ishikawa) => `You are a pharmaceutical quality investigation assistant identifying the root cause of a deviation in a biologics manufacturing facility.

DEVIATION:
Title: ${title}
Description: ${description}

5-WHY ANALYSIS:
${(fiveWhy || []).map((w, i) => `Why ${i + 1}: ${w.question} -> ${w.answer}`).join('\n')}

ISHIKAWA ANALYSIS:
${Object.entries(ishikawa || {}).map(([cat, causes]) => `${cat.toUpperCase()}: ${(causes || []).join('; ')}`).join('\n')}

Based on the investigation data above, identify the most likely root cause. Categorise it as one of: human_error, equipment_failure, process_gap, material_defect, measurement_error, environmental.

Return ONLY valid JSON (no markdown fences):
{
  "rootCause": "Clear statement of the root cause",
  "category": "human_error|equipment_failure|process_gap|material_defect|measurement_error|environmental",
  "confidence": 0.0-1.0,
  "reasoning": "Explanation of how the investigation data led to this conclusion",
  "recommendedCapaActions": ["Action 1", "Action 2"]
}`;

const SUMMARY_PROMPT = (deviation) => `You are a pharmaceutical quality documentation specialist. Generate a concise investigation summary for the following deviation in a biologics manufacturing facility.

DEVIATION: ${deviation.dev_id}
Title: ${deviation.title}
Description: ${deviation.description}
Severity: ${deviation.severity}
Status: ${deviation.status}
Process Area: ${deviation.process_area}
Root Cause: ${deviation.root_cause || 'Not yet identified'}

5-Why Analysis: ${JSON.stringify(deviation.five_why || [])}
Ishikawa Causes: ${JSON.stringify(deviation.ishikawa || {})}

Write a professional investigation summary suitable for a quality record (2-3 paragraphs). Include: what happened, investigation findings, root cause, and recommended corrective actions. Use GMP-appropriate language.

Return ONLY valid JSON:
{
  "summary": "The investigation summary text..."
}`;

// ── Severity ordering for escalation validation ─────────────────────────────
const SEVERITY_RANK = { minor: 0, major: 1, critical: 2 };

// ── Service Factory ─────────────────────────────────────────────────────────

function makeDeviationService({ supabase, auditLog, anthropic }) {

  // ── CRUD ────────────────────────────────────────────────────────────────

  async function createDeviation({
    title, description, source, sourceType, processArea, equipmentRef,
    reportedBy, owner, ownerRole, assignedTo, dueDate, req
  }) {
    if (!title) throw Object.assign(new Error('title is required'), { statusCode: 400 });

    const devId = ids.deviationId();

    // AI auto-classify severity
    let aiSeverity = 'minor';
    let classification = {};
    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: CLASSIFY_PROMPT(title, description || '') }],
      });
      classification = parseClaudeJson(message.content[0].text);
      aiSeverity = classification.severity || 'minor';
    } catch (e) {
      console.error('[DEVIATION] AI classify error:', e.message);
    }

    const row = {
      dev_id: devId,
      title,
      description: description || '',
      severity: aiSeverity,
      status: 'draft',
      source: source || '',
      source_type: sourceType || 'observation',
      process_area: processArea || '',
      equipment_ref: equipmentRef || '',
      classification,
      reported_by: reportedBy || 'unknown',
      owner: owner || 'Unassigned',
      owner_role: ownerRole || '',
      assigned_to: assignedTo || '',
      due_date: dueDate || null,
      ai_severity: aiSeverity,
    };

    const { error } = await supabase.from('deviations').insert(row);
    if (error) throw error;

    await auditLog({
      userId: reportedBy || 'system',
      userRole: ownerRole || 'system',
      action: 'deviation_created',
      entityType: 'deviation',
      entityId: devId,
      after: { title, severity: aiSeverity, processArea, source },
      reason: `Deviation initiated: ${title}`,
      req,
    });

    return { ok: true, devId, aiSeverity, classification };
  }

  async function getDeviation(devId) {
    const { data, error } = await supabase
      .from('deviations').select('*').eq('dev_id', devId).single();
    if (error) {
      if (error.message.includes('does not exist')) throw Object.assign(new Error('Deviation not found'), { statusCode: 404 });
      throw error;
    }
    if (!data) throw Object.assign(new Error('Deviation not found'), { statusCode: 404 });
    return data;
  }

  async function listDeviations({ severity, status, owner, processArea } = {}) {
    let query = supabase.from('deviations').select('*').order('created_at', { ascending: false });
    if (severity) query = query.eq('severity', severity);
    if (status) query = query.eq('status', status);
    if (owner) query = query.eq('owner', owner);
    if (processArea) query = query.eq('process_area', processArea);

    const { data, error } = await query;
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  async function updateDeviation({
    devId, title, description, severity, status, source, sourceType,
    processArea, equipmentRef, rootCause, rootCauseCategory,
    capaId, owner, assignedTo, ownerRole, dueDate,
    fiveWhy, ishikawa, userId, reason, req
  }) {
    const current = await getDeviation(devId);

    const updates = {};
    if (title !== undefined)             updates.title = title;
    if (description !== undefined)       updates.description = description;
    if (severity !== undefined)          updates.severity = severity;
    if (status !== undefined)            updates.status = status;
    if (source !== undefined)            updates.source = source;
    if (sourceType !== undefined)        updates.source_type = sourceType;
    if (processArea !== undefined)       updates.process_area = processArea;
    if (equipmentRef !== undefined)      updates.equipment_ref = equipmentRef;
    if (rootCause !== undefined)         updates.root_cause = rootCause;
    if (rootCauseCategory !== undefined) updates.root_cause_category = rootCauseCategory;
    if (capaId !== undefined)            updates.capa_id = capaId;
    if (owner !== undefined)             updates.owner = owner;
    if (assignedTo !== undefined)        updates.assigned_to = assignedTo;
    if (ownerRole !== undefined)         updates.owner_role = ownerRole;
    if (dueDate !== undefined)           updates.due_date = dueDate;
    if (fiveWhy !== undefined)           updates.five_why = fiveWhy;
    if (ishikawa !== undefined)          updates.ishikawa = ishikawa;

    if (status === 'closed') {
      updates.closed_at = new Date().toISOString();
      updates.closed_by = userId || 'system';
    }

    updates.updated_at = new Date().toISOString();

    const { error } = await supabase.from('deviations').update(updates).eq('dev_id', devId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system',
      userRole: ownerRole || current.owner_role || 'system',
      action: 'deviation_updated',
      entityType: 'deviation',
      entityId: devId,
      before: current,
      after: updates,
      reason: reason || `Deviation ${devId} updated`,
      req,
    });

    return { ok: true, devId, updates };
  }

  // ── ESCALATE ──────────────────────────────────────────────────────────

  async function escalateDeviation({ devId, newSeverity, reason, userId, userRole, req }) {
    const current = await getDeviation(devId);

    if (!SEVERITY_RANK.hasOwnProperty(newSeverity)) {
      throw Object.assign(new Error('Invalid severity: ' + newSeverity), { statusCode: 400 });
    }
    if (SEVERITY_RANK[newSeverity] <= SEVERITY_RANK[current.severity]) {
      throw Object.assign(new Error(`Cannot escalate from ${current.severity} to ${newSeverity}`), { statusCode: 400 });
    }

    const escalationEntry = {
      from: current.severity,
      to: newSeverity,
      by: userId,
      at: new Date().toISOString(),
      reason: reason || '',
    };
    const history = [...(current.escalation_history || []), escalationEntry];

    const { error } = await supabase.from('deviations').update({
      severity: newSeverity,
      escalation_history: history,
      updated_at: new Date().toISOString(),
    }).eq('dev_id', devId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'deviation_escalated',
      entityType: 'deviation',
      entityId: devId,
      before: { severity: current.severity },
      after: { severity: newSeverity, escalationEntry },
      reason: reason || `Escalated from ${current.severity} to ${newSeverity}`,
      req,
    });

    return { ok: true, devId, from: current.severity, to: newSeverity };
  }

  // ── AI INVESTIGATION ──────────────────────────────────────────────────

  async function aiInvestigate({ devId, mode }) {
    const dev = await getDeviation(devId);
    let result = {};

    switch (mode) {
      case 'five_why': {
        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages: [{ role: 'user', content: FIVE_WHY_PROMPT(dev.title, dev.description, dev.five_why || []) }],
        });
        result = parseClaudeJson(message.content[0].text);
        await supabase.from('deviations').update({
          five_why: result.whys || [],
          ai_investigation: { ...(dev.ai_investigation || {}), five_why: result },
          updated_at: new Date().toISOString(),
        }).eq('dev_id', devId);
        break;
      }

      case 'ishikawa': {
        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages: [{ role: 'user', content: ISHIKAWA_PROMPT(dev.title, dev.description, dev.process_area, dev.equipment_ref) }],
        });
        result = parseClaudeJson(message.content[0].text);
        await supabase.from('deviations').update({
          ishikawa: result,
          ai_investigation: { ...(dev.ai_investigation || {}), ishikawa: result },
          updated_at: new Date().toISOString(),
        }).eq('dev_id', devId);
        break;
      }

      case 'root_cause': {
        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: ROOT_CAUSE_PROMPT(dev.title, dev.description, dev.five_why, dev.ishikawa) }],
        });
        result = parseClaudeJson(message.content[0].text);
        await supabase.from('deviations').update({
          root_cause: result.rootCause || '',
          root_cause_category: result.category || '',
          ai_investigation: { ...(dev.ai_investigation || {}), root_cause: result },
          updated_at: new Date().toISOString(),
        }).eq('dev_id', devId);
        break;
      }

      case 'summary': {
        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages: [{ role: 'user', content: SUMMARY_PROMPT(dev) }],
        });
        result = parseClaudeJson(message.content[0].text);
        await supabase.from('deviations').update({
          ai_summary: result.summary || '',
          ai_investigation: { ...(dev.ai_investigation || {}), summary: result },
          updated_at: new Date().toISOString(),
        }).eq('dev_id', devId);
        break;
      }

      case 'full':
      default: {
        // Run all investigation modes sequentially
        const fwResult = await aiInvestigate({ devId, mode: 'five_why' });
        const ishResult = await aiInvestigate({ devId, mode: 'ishikawa' });
        const rcResult = await aiInvestigate({ devId, mode: 'root_cause' });
        const sumResult = await aiInvestigate({ devId, mode: 'summary' });
        result = { five_why: fwResult, ishikawa: ishResult, root_cause: rcResult, summary: sumResult };
        break;
      }
    }

    await auditLog({
      userId: 'system',
      userRole: 'system',
      action: 'deviation_ai_investigated',
      entityType: 'deviation',
      entityId: devId,
      after: { mode, resultKeys: Object.keys(result) },
      reason: `AI investigation (${mode}) on ${devId}`,
    });

    return { ok: true, devId, mode, result };
  }

  // ── STATS ─────────────────────────────────────────────────────────────

  async function getStats() {
    const { data, error } = await supabase
      .from('deviations').select('*').order('created_at', { ascending: false });
    if (error) {
      if (error.message.includes('does not exist')) return { total: 0 };
      throw error;
    }
    const all = data || [];
    const now = new Date();

    const bySeverity = { critical: 0, major: 0, minor: 0 };
    const byStatus = {};
    let overdue = 0;
    let totalResolutionDays = 0;
    let closedCount = 0;

    all.forEach(d => {
      bySeverity[d.severity] = (bySeverity[d.severity] || 0) + 1;
      byStatus[d.status] = (byStatus[d.status] || 0) + 1;

      if (d.due_date && d.status !== 'closed' && new Date(d.due_date) < now) overdue++;

      if (d.status === 'closed' && d.closed_at) {
        const days = (new Date(d.closed_at) - new Date(d.created_at)) / (1000 * 60 * 60 * 24);
        totalResolutionDays += days;
        closedCount++;
      }
    });

    return {
      total: all.length,
      bySeverity,
      byStatus,
      overdue,
      avgResolutionDays: closedCount > 0 ? Math.round(totalResolutionDays / closedCount * 10) / 10 : null,
      recentDeviations: all.slice(0, 10),
    };
  }

  return {
    createDeviation, getDeviation, listDeviations, updateDeviation,
    escalateDeviation, aiInvestigate, getStats,
  };
}

module.exports = makeDeviationService;
