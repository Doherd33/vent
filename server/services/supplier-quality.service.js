'use strict';

const ids = require('../lib/ids');
const parseClaudeJson = require('../lib/parse-claude-json');

// ── AI Prompt Templates ─────────────────────────────────────────────────────

const RISK_SCORE_PROMPT = (supplier, scorecard) => `You are a pharmaceutical supplier quality risk assessor for a biologics manufacturing facility operating under 21 CFR Part 11 and EU Annex 11.

Given this supplier data, calculate a risk score from 1 to 10 (10 = highest risk) and classify as low, medium, high, or critical.

SUPPLIER DATA:
Name: ${supplier.name}
Category: ${supplier.category}
Status: ${supplier.status}
Current Risk Level: ${supplier.risk_level}
Audit Count: ${scorecard.auditCount}
Average Audit Score: ${scorecard.avgAuditScore !== null ? scorecard.avgAuditScore : 'No audits yet'}
Last Audit Date: ${scorecard.lastAuditDate || 'Never audited'}
Next Audit Due: ${supplier.next_audit_date || 'Not scheduled'}
Deviation Count: ${scorecard.deviationCount}
Quality Agreement: ${scorecard.agreementCompliant ? 'Active and compliant' : 'Non-compliant or missing'}

SCORING GUIDANCE:
- Raw material & excipient suppliers inherently higher risk than service/packaging
- No audits or overdue audits increase risk
- Declining audit scores increase risk
- Multiple deviations increase risk significantly
- Missing or expired quality agreements increase risk

Return ONLY valid JSON (no markdown fences):
{
  "score": 1-10,
  "level": "low|medium|high|critical",
  "reasoning": "Brief explanation of the risk assessment",
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}`;

const TREND_PROMPT = (supplier, audits, deviations) => `You are a pharmaceutical supplier performance analyst for a biologics manufacturing facility.

Analyze performance trends for this supplier and flag any concerning patterns.

SUPPLIER: ${supplier.name} (${supplier.category})

AUDIT HISTORY (newest first):
${audits.length > 0 ? audits.map(a => `- ${a.audit_date}: Type=${a.audit_type}, Score=${a.score || 'N/A'}, Status=${a.status}, Findings=${(a.findings || []).length}`).join('\n') : 'No audits recorded.'}

DEVIATION HISTORY:
${deviations.length > 0 ? deviations.map(d => `- ${d.created_at ? d.created_at.slice(0, 10) : 'N/A'}: ${d.dev_id} — Severity=${d.severity}, Status=${d.status}`).join('\n') : 'No deviations linked.'}

Return ONLY valid JSON (no markdown fences):
{
  "trend": "improving|stable|declining|insufficient_data",
  "analysis": "Detailed analysis of the performance trend",
  "alerts": ["Any urgent items requiring attention"],
  "recommendations": ["Suggested actions"]
}`;

const FINDING_SUMMARY_PROMPT = (supplier, audits) => `You are a pharmaceutical supplier audit specialist for a biologics manufacturing facility.

Summarize all audit findings for this supplier, identify open issues, and suggest follow-up priorities.

SUPPLIER: ${supplier.name} (${supplier.category})

AUDIT DATA:
${audits.map(a => `Audit ${a.audit_id} (${a.audit_date}, ${a.audit_type}):
  Score: ${a.score || 'N/A'}
  Status: ${a.status}
  Findings: ${JSON.stringify(a.findings || [])}`).join('\n\n')}

Return ONLY valid JSON (no markdown fences):
{
  "summary": "Overall summary of audit findings",
  "openFindings": ["Finding 1 still open", "Finding 2 still open"],
  "priorities": ["Highest priority follow-up action", "Second priority"],
  "overallAssessment": "Brief overall supplier audit assessment"
}`;

// ── Service Factory ─────────────────────────────────────────────────────────

function makeSupplierQualityService({ supabase, auditLog, anthropic }) {

  // ── SUPPLIERS CRUD ────────────────────────────────────────────────────

  async function createSupplier({ name, category, contactName, contactEmail, contactPhone, address, riskLevel, notes, createdBy, req }) {
    if (!name) throw Object.assign(new Error('name is required'), { statusCode: 400 });

    const supId = ids.supplierId();
    const row = {
      supplier_id: supId,
      name,
      category: category || 'raw_material',
      status: 'pending',
      risk_level: riskLevel || 'medium',
      contact_name: contactName || '',
      contact_email: contactEmail || '',
      contact_phone: contactPhone || '',
      address: address || '',
      notes: notes || '',
      created_by: createdBy || 'system',
    };

    const { error } = await supabase.from('suppliers').insert(row);
    if (error) {
      // Retry once on ID collision
      if (error.code === '23505' && error.message.includes('supplier_id')) {
        row.supplier_id = ids.supplierId();
        const retry = await supabase.from('suppliers').insert(row);
        if (retry.error) throw retry.error;
        await auditLog({ userId: createdBy || 'system', userRole: 'qa', action: 'supplier_created', entityType: 'supplier', entityId: row.supplier_id, after: row, reason: 'Supplier created: ' + name, req });
        return { ok: true, supplierId: row.supplier_id };
      }
      throw error;
    }

    await auditLog({ userId: createdBy || 'system', userRole: 'qa', action: 'supplier_created', entityType: 'supplier', entityId: supId, after: row, reason: 'Supplier created: ' + name, req });
    return { ok: true, supplierId: supId };
  }

  async function getSupplier(supplierId) {
    const { data, error } = await supabase.from('suppliers').select('*').eq('supplier_id', supplierId).single();
    if (error) {
      if (error.message.includes('does not exist')) throw Object.assign(new Error('Supplier not found'), { statusCode: 404 });
      throw error;
    }
    if (!data) throw Object.assign(new Error('Supplier not found'), { statusCode: 404 });
    return data;
  }

  async function listSuppliers({ status, risk_level, category } = {}) {
    let query = supabase.from('suppliers').select('*').order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    if (risk_level) query = query.eq('risk_level', risk_level);
    if (category) query = query.eq('category', category);

    const { data, error } = await query;
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  async function updateSupplier(supplierId, { name, category, status, riskLevel, contactName, contactEmail, contactPhone, address, qualificationDate, nextAuditDate, qualityAgreementStatus, notes, userId, reason, req }) {
    const current = await getSupplier(supplierId);

    const updates = {};
    if (name !== undefined)                    updates.name = name;
    if (category !== undefined)                updates.category = category;
    if (status !== undefined)                  updates.status = status;
    if (riskLevel !== undefined)               updates.risk_level = riskLevel;
    if (contactName !== undefined)             updates.contact_name = contactName;
    if (contactEmail !== undefined)            updates.contact_email = contactEmail;
    if (contactPhone !== undefined)            updates.contact_phone = contactPhone;
    if (address !== undefined)                 updates.address = address;
    if (qualificationDate !== undefined)       updates.qualification_date = qualificationDate;
    if (nextAuditDate !== undefined)           updates.next_audit_date = nextAuditDate;
    if (qualityAgreementStatus !== undefined)  updates.quality_agreement_status = qualityAgreementStatus;
    if (notes !== undefined)                   updates.notes = notes;
    updates.updated_at = new Date().toISOString();

    const { error } = await supabase.from('suppliers').update(updates).eq('supplier_id', supplierId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system',
      userRole: 'qa',
      action: 'supplier_updated',
      entityType: 'supplier',
      entityId: supplierId,
      before: current,
      after: updates,
      reason: reason || 'Supplier ' + supplierId + ' updated',
      req,
    });

    return { ok: true, supplierId, updates };
  }

  // ── SCORECARD ────────────────────────────────────────────────────────

  async function getScorecard(supplierId) {
    const supplier = await getSupplier(supplierId);

    // Audit data
    const { data: audits } = await supabase.from('supplier_audits').select('*').eq('supplier_id', supplierId).order('audit_date', { ascending: false });
    const auditList = audits || [];
    const scores = auditList.filter(a => a.score !== null && a.score !== undefined).map(a => a.score);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 : null;
    const scoreTrend = scores.slice(0, 5);

    // Deviation count — link via source field containing supplier_id
    let deviationCount = 0;
    let recentDeviations = [];
    try {
      const { data: devs } = await supabase.from('deviations').select('dev_id, severity, status, created_at').ilike('source', '%' + supplierId + '%');
      recentDeviations = (devs || []).slice(0, 5);
      deviationCount = (devs || []).length;
    } catch (e) {
      // deviations table might not link to suppliers — graceful fallback
    }

    // Latest quality agreement
    const { data: agreements } = await supabase.from('quality_agreements').select('*').eq('supplier_id', supplierId).order('created_at', { ascending: false }).limit(1);
    const latestAgreement = (agreements || [])[0] || null;
    const agreementCompliant = latestAgreement && latestAgreement.status === 'active' && latestAgreement.expiry_date && new Date(latestAgreement.expiry_date) > new Date();

    return {
      supplierId,
      supplierName: supplier.name,
      riskLevel: supplier.risk_level,
      status: supplier.status,
      auditCount: auditList.length,
      avgAuditScore: avgScore,
      scoreTrend,
      deviationCount,
      recentDeviations,
      latestAgreement,
      agreementCompliant: !!agreementCompliant,
      lastAuditDate: auditList[0] ? auditList[0].audit_date : null,
      nextAuditDate: supplier.next_audit_date,
    };
  }

  // ── STATS ────────────────────────────────────────────────────────────

  async function getStats() {
    const { data, error } = await supabase.from('suppliers').select('*');
    if (error) {
      if (error.message.includes('does not exist')) return { total: 0 };
      throw error;
    }
    const all = data || [];
    const now = new Date();

    const byStatus = {};
    const byRisk = {};
    let overdueAudits = 0;
    let overdueAgreements = 0;

    all.forEach(s => {
      byStatus[s.status] = (byStatus[s.status] || 0) + 1;
      byRisk[s.risk_level] = (byRisk[s.risk_level] || 0) + 1;
      if (s.next_audit_date && new Date(s.next_audit_date) < now) overdueAudits++;
      if (s.quality_agreement_status === 'expired') overdueAgreements++;
    });

    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const upcomingAudits = all.filter(s => s.next_audit_date && new Date(s.next_audit_date) >= now && new Date(s.next_audit_date) <= thirtyDays).length;

    return {
      total: all.length,
      byStatus,
      byRisk,
      overdueAudits,
      overdueAgreements,
      upcomingAudits,
      highRiskCount: (byRisk.high || 0) + (byRisk.critical || 0),
    };
  }

  // ── AUDITS ───────────────────────────────────────────────────────────

  async function createAudit(supplierId, { auditType, auditDate, auditor, findings, score, notes, createdBy, req }) {
    await getSupplier(supplierId); // Verify supplier exists
    if (!auditDate) throw Object.assign(new Error('audit_date is required'), { statusCode: 400 });
    if (!auditor) throw Object.assign(new Error('auditor is required'), { statusCode: 400 });

    const auditId = ids.supplierAuditId();
    const row = {
      audit_id: auditId,
      supplier_id: supplierId,
      audit_type: auditType || 'routine',
      audit_date: auditDate,
      auditor,
      status: 'scheduled',
      findings: findings || [],
      score: score || null,
      notes: notes || '',
      created_by: createdBy || 'system',
    };

    const { error } = await supabase.from('supplier_audits').insert(row);
    if (error) {
      if (error.code === '23505' && error.message.includes('audit_id')) {
        row.audit_id = ids.supplierAuditId();
        const retry = await supabase.from('supplier_audits').insert(row);
        if (retry.error) throw retry.error;
        await auditLog({ userId: createdBy || 'system', userRole: 'qa', action: 'supplier_audit_created', entityType: 'supplier_audit', entityId: row.audit_id, after: row, reason: 'Audit scheduled for supplier ' + supplierId, req });
        return { ok: true, auditId: row.audit_id };
      }
      throw error;
    }

    await auditLog({ userId: createdBy || 'system', userRole: 'qa', action: 'supplier_audit_created', entityType: 'supplier_audit', entityId: auditId, after: row, reason: 'Audit scheduled for supplier ' + supplierId, req });
    return { ok: true, auditId };
  }

  async function listAudits(supplierId) {
    const { data, error } = await supabase.from('supplier_audits').select('*').eq('supplier_id', supplierId).order('audit_date', { ascending: false });
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  // ── AGREEMENTS ───────────────────────────────────────────────────────

  async function createAgreement(supplierId, { version, effectiveDate, expiryDate, reviewedBy, approvedBy, notes, createdBy, req }) {
    await getSupplier(supplierId); // Verify supplier exists

    const agreementId = ids.qualityAgreementId();
    const row = {
      agreement_id: agreementId,
      supplier_id: supplierId,
      version: version || '1.0',
      status: 'draft',
      effective_date: effectiveDate || null,
      expiry_date: expiryDate || null,
      reviewed_by: reviewedBy || null,
      approved_by: approvedBy || null,
      notes: notes || '',
      created_by: createdBy || 'system',
    };

    const { error } = await supabase.from('quality_agreements').insert(row);
    if (error) {
      if (error.code === '23505' && error.message.includes('agreement_id')) {
        row.agreement_id = ids.qualityAgreementId();
        const retry = await supabase.from('quality_agreements').insert(row);
        if (retry.error) throw retry.error;
        await auditLog({ userId: createdBy || 'system', userRole: 'qa', action: 'quality_agreement_created', entityType: 'quality_agreement', entityId: row.agreement_id, after: row, reason: 'Quality agreement created for supplier ' + supplierId, req });
        return { ok: true, agreementId: row.agreement_id };
      }
      throw error;
    }

    await auditLog({ userId: createdBy || 'system', userRole: 'qa', action: 'quality_agreement_created', entityType: 'quality_agreement', entityId: agreementId, after: row, reason: 'Quality agreement created for supplier ' + supplierId, req });
    return { ok: true, agreementId };
  }

  async function listAgreements(supplierId) {
    const { data, error } = await supabase.from('quality_agreements').select('*').eq('supplier_id', supplierId).order('created_at', { ascending: false });
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  // ── AI ANALYSIS ──────────────────────────────────────────────────────

  async function aiAnalyse({ supplierId, mode }) {
    const supplier = await getSupplier(supplierId);
    let result = {};

    switch (mode) {
      case 'risk_score': {
        const scorecard = await getScorecard(supplierId);
        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: RISK_SCORE_PROMPT(supplier, scorecard) }],
        });
        result = parseClaudeJson(message.content[0].text);
        break;
      }

      case 'trend_analysis': {
        const { data: audits } = await supabase.from('supplier_audits').select('*').eq('supplier_id', supplierId).order('audit_date', { ascending: false });
        let devs = [];
        try {
          const { data } = await supabase.from('deviations').select('dev_id, severity, status, created_at').ilike('source', '%' + supplierId + '%');
          devs = data || [];
        } catch (e) { /* graceful fallback */ }

        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages: [{ role: 'user', content: TREND_PROMPT(supplier, audits || [], devs) }],
        });
        result = parseClaudeJson(message.content[0].text);
        break;
      }

      case 'finding_summary': {
        const { data: audits } = await supabase.from('supplier_audits').select('*').eq('supplier_id', supplierId).order('audit_date', { ascending: false });
        if (!audits || audits.length === 0) {
          return { ok: true, supplierId, mode, result: { summary: 'No audits recorded for this supplier.', openFindings: [], priorities: [] } };
        }
        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages: [{ role: 'user', content: FINDING_SUMMARY_PROMPT(supplier, audits) }],
        });
        result = parseClaudeJson(message.content[0].text);
        break;
      }

      default:
        throw Object.assign(new Error('Invalid analysis mode: ' + mode + '. Use risk_score, trend_analysis, or finding_summary.'), { statusCode: 400 });
    }

    await auditLog({
      userId: 'system',
      userRole: 'system',
      action: 'supplier_ai_analysed',
      entityType: 'supplier',
      entityId: supplierId,
      after: { mode, resultKeys: Object.keys(result) },
      reason: `AI analysis (${mode}) on supplier ${supplierId}`,
    });

    return { ok: true, supplierId, mode, result };
  }

  return {
    createSupplier, getSupplier, listSuppliers, updateSupplier,
    getScorecard, getStats,
    createAudit, listAudits,
    createAgreement, listAgreements,
    aiAnalyse,
  };
}

module.exports = { makeSupplierQualityService };
