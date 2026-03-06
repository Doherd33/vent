'use strict';

const ids = require('../lib/ids');
const parseClaudeJson = require('../lib/parse-claude-json');

// ── AI Prompt Templates ─────────────────────────────────────────────────────

const CLASSIFY_PROMPT = (title, description, productName, batchNumber) => `You are a pharmaceutical quality complaint classifier for a biologics manufacturing facility operating under 21 CFR 211.198, EU GMP Chapter 8, and ICH Q10.

Given the following product complaint, classify it using the expanded taxonomy.

COMPLAINT TYPES:
- product_quality: General product quality defect
- adverse_event: Patient injury or health consequence reported
- adverse_reaction: Unexpected pharmacological response
- packaging_integrity: Container closure or packaging defect
- labelling_error: Incorrect or missing label information
- potency_failure: Sub-potent or super-potent product
- sterility_failure: Sterility breach or contamination
- particulate_matter: Visible or sub-visible particles
- delivery_logistics: Shipping/storage condition failure
- counterfeit_suspect: Suspected counterfeit or tampered product
- device_malfunction: Combination product device failure
- stability_failure: Out-of-spec during shelf life

SEVERITY:
- critical: Direct patient safety impact, potential life-threatening. Includes adverse events, sterility failures in injectables, potency failures.
- major: Significant quality impact, could indirectly affect patients. Includes packaging integrity, labelling errors affecting dosing.
- minor: Administrative or cosmetic, no direct quality impact. Includes minor labelling issues, cosmetic packaging defects.

REPORTABILITY (21 CFR 600.80 for biologics):
- Any adverse event with a biologic product is potentially reportable (15-day MedWatch)
- Sterility failures in injectable biologics require field alert evaluation (3-day deadline)
- Potency failures may require field alert
- Counterfeit suspects require immediate notification

COMPLAINT:
Title: ${title}
Description: ${description}
Product: ${productName || 'Not specified'}
Batch: ${batchNumber || 'Not specified'}

Return ONLY valid JSON (no markdown fences):
{
  "type": "one of the complaint types above",
  "severity": "critical|major|minor",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of classification rationale",
  "reportable_assessment": "Assessment of whether this complaint is likely reportable and under which regulation",
  "recommended_investigation_scope": "single_batch|multiple_batches|product_wide|none",
  "adverse_event_flag": true/false,
  "counterfeit_flag": true/false
}`;

const BATCH_IMPACT_PROMPT = (complaint, sameBatchComplaints, relatedComplaints) => `You are a pharmaceutical quality analyst assessing batch impact for a biologics manufacturing facility.

COMPLAINT UNDER ANALYSIS:
ID: ${complaint.complaint_id}
Title: ${complaint.title}
Description: ${complaint.description}
Product: ${complaint.product_name}
Batch: ${complaint.batch_number}
Type: ${complaint.complaint_type}
Severity: ${complaint.severity}

SAME BATCH COMPLAINTS (${sameBatchComplaints.length}):
${sameBatchComplaints.map(c => `- ${c.complaint_id}: ${c.title} (${c.complaint_type}, ${c.severity})`).join('\n') || 'None'}

RELATED COMPLAINTS (same product, last 90 days) (${relatedComplaints.length}):
${relatedComplaints.map(c => `- ${c.complaint_id}: ${c.title} (batch: ${c.batch_number}, ${c.complaint_type})`).join('\n') || 'None'}

Assess the batch impact. Consider: same-batch patterns, related-batch signals, risk of widespread issue.

Return ONLY valid JSON (no markdown fences):
{
  "same_batch_complaints": [list of complaint IDs],
  "related_batch_complaints": [list of complaint IDs],
  "shared_equipment_issues": [],
  "risk_assessment": "high|medium|low",
  "recommended_scope": "single_batch|multiple_batches|product_wide",
  "recall_recommendation": "recall|quarantine|monitor|none",
  "affected_batch_list": [list of batch numbers],
  "estimated_units_at_risk": number,
  "reasoning": "detailed explanation"
}`;

const TREND_PROMPT = (recentComplaints, statsContext) => `You are a pharmaceutical quality trend analyst for a biologics manufacturing facility implementing ICH Q10 knowledge management.

COMPLAINT DATA (last 90 days, ${recentComplaints.length} complaints):
${recentComplaints.map(c => `- ${c.complaint_id}: ${c.title} | type: ${c.complaint_type} | severity: ${c.severity} | product: ${c.product_name} | batch: ${c.batch_number} | date: ${c.date_received} | country: ${c.country}`).join('\n') || 'No recent complaints'}

STATISTICAL CONTEXT:
${statsContext}

Analyse for trends using:
1. Moving average analysis of complaint rates per product
2. Control chart logic (flag if rate exceeds mean + 2 sigma)
3. Pareto analysis (20% of types causing 80% of volume)
4. Geographic clustering
5. Temporal clustering around manufacturing dates
6. Recurrence detection (same root cause appearing again)

Alert tiers:
- signal: early pattern, worth monitoring
- trend: confirmed pattern requiring investigation
- alarm: urgent pattern requiring immediate action

Return ONLY valid JSON (no markdown fences):
{
  "alert_tier": "signal|trend|alarm|none",
  "patterns": [
    {"type": "description of pattern", "severity": "high|medium|low", "affected_products": [], "affected_batches": []}
  ],
  "pareto_analysis": {"top_types": [], "top_products": []},
  "geographic_clusters": [],
  "temporal_clusters": [],
  "recurrence_alerts": [],
  "statistical_summary": "summary text",
  "recommended_actions": ["action 1", "action 2"]
}`;

const RECALL_SCOPE_PROMPT = (recall, linkedComplaint, relatedComplaints) => `You are a pharmaceutical quality recall specialist assessing recall scope per FDA 21 CFR Part 7 and EU GMP Chapter 8.

RECALL EVENT:
ID: ${recall.recall_id}
Title: ${recall.title}
Reason: ${recall.reason}
Affected Batches: ${JSON.stringify(recall.affected_batches)}
Distribution Data: ${recall.distribution_data}
Units Distributed: ${recall.units_distributed}

LINKED COMPLAINT:
${linkedComplaint ? `${linkedComplaint.complaint_id}: ${linkedComplaint.title} (${linkedComplaint.complaint_type}, ${linkedComplaint.severity})` : 'None'}

RELATED COMPLAINTS:
${relatedComplaints.map(c => `- ${c.complaint_id}: ${c.title} (batch: ${c.batch_number}, ${c.complaint_type})`).join('\n') || 'None'}

Assess the recall scope. Provide:
1. Recommended FDA recall classification (Class I/II/III per 21 CFR 7.41)
2. Health hazard evaluation (per 21 CFR 7.41(a))
3. Recommended recall depth (wholesale/retail/consumer_user per 21 CFR 7.42)
4. Effectiveness check level recommendation (A/B/C/D/E)
5. Priority markets for notification
6. Draft notification language

Return ONLY valid JSON (no markdown fences):
{
  "recommended_class": "class_i|class_ii|class_iii",
  "recommended_depth": "wholesale|retail|consumer_user",
  "health_hazard_evaluation": {
    "disease_injuries_occurred": true/false,
    "vulnerable_populations": "description",
    "seriousness": "high|medium|low",
    "likelihood_of_occurrence": "high|medium|low",
    "consequences_assessment": "description",
    "overall_risk": "high|medium|low"
  },
  "recommended_effectiveness_level": "A|B|C|D|E",
  "estimated_affected_units": number,
  "priority_markets": ["market1", "market2"],
  "notification_draft": "Draft notification text...",
  "reasoning": "detailed explanation"
}`;

const PREDICT_RECALL_PROMPT = (complaints, deviations) => `You are a pharmaceutical quality predictive analytics specialist. Analyse complaint patterns to predict recall risk BEFORE a formal recall is triggered.

RECENT COMPLAINTS (last 90 days):
${complaints.map(c => `- ${c.complaint_id}: ${c.title} | type: ${c.complaint_type} | severity: ${c.severity} | product: ${c.product_name} | batch: ${c.batch_number} | date: ${c.date_received}`).join('\n') || 'No recent complaints'}

RELATED DEVIATIONS:
${deviations.map(d => `- ${d.dev_id}: ${d.title} | severity: ${d.severity} | status: ${d.status}`).join('\n') || 'No related deviations'}

INPUT SIGNALS to evaluate:
- Rising complaint rate on specific batch or product
- Multiple complaints of same type (especially sterility, potency, particulate)
- Adverse event reports
- Cross-module data (deviations linked to production batches)

Score the recall risk from 0.0 to 1.0 where:
- 0.0-0.3: Low risk
- 0.3-0.6: Medium risk (monitor closely)
- 0.6-0.8: High risk (prepare contingency)
- 0.8-1.0: Critical risk (immediate action needed)

Return ONLY valid JSON (no markdown fences):
{
  "recall_risk_score": 0.0-1.0,
  "risk_level": "low|medium|high|critical",
  "contributing_factors": ["factor 1", "factor 2"],
  "recommended_actions": ["action 1", "action 2"],
  "similar_historical_cases": [{"case": "ID", "outcome": "description"}],
  "products_at_risk": [{"product": "name", "batches": [], "risk_score": 0.0}]
}`;

const DRAFT_REPORT_PROMPT = (complaint) => `You are a pharmaceutical regulatory affairs specialist drafting regulatory reports from complaint data.

COMPLAINT DATA:
ID: ${complaint.complaint_id}
Title: ${complaint.title}
Description: ${complaint.description}
Type: ${complaint.complaint_type}
Severity: ${complaint.severity}
Product: ${complaint.product_name}
Strength: ${complaint.product_strength}
Dosage Form: ${complaint.dosage_form}
Batch: ${complaint.batch_number}
Lot: ${complaint.lot_number}
Date of Event: ${complaint.date_of_event}
Complainant: ${complaint.complainant_name}
Country: ${complaint.country}
Investigation: ${complaint.investigation}
Root Cause: ${complaint.root_cause}
Immediate Action: ${complaint.immediate_action}
Sample Available: ${complaint.sample_available}
Sample Tested: ${complaint.sample_tested}

Determine the appropriate report type and generate a draft.

For adverse events with biologics: MedWatch 3500A format
For product quality issues: Field Alert Report format

Return ONLY valid JSON (no markdown fences):
{
  "report_type": "medwatch_3500a|field_alert",
  "report_sections": {
    "patient_information": "...",
    "product_information": "...",
    "event_description": "...",
    "reporter_information": "...",
    "manufacturer_narrative": "..."
  },
  "narrative_summary": "Full narrative text suitable for regulatory submission",
  "recommended_report_deadline": "15_day|3_day",
  "submission_notes": "Any additional notes for the QA reviewer"
}`;

// ── SLA Targets (days) ────────────────────────────────────────────────────
const SLA_TARGETS = {
  triage_hours: 24,
  reportable_determination_days: 3,
  investigation_start: { critical: 1, major: 5, minor: 10 },
  investigation_completion: { critical: 30, major: 60, minor: 90 },
  closure_after_capa_days: 30,
};

// ── Service Factory ─────────────────────────────────────────────────────────

function makeComplaintService({ supabase, auditLog, anthropic }) {

  // ── COMPLAINT CRUD ─────────────────────────────────────────────────────

  async function createComplaint({
    title, description, complaintType, source, severity, priority,
    productName, productStrength, dosageForm, batchNumber, lotNumber,
    dateOfEvent, complainantName, complainantContact, complainantOrg, country,
    immediateAction, sampleAvailable, userId, userRole, req
  }) {
    if (!title) throw Object.assign(new Error('title is required'), { statusCode: 400 });

    const complaintId = ids.complaintId();

    const row = {
      complaint_id: complaintId,
      title,
      description: description || '',
      complaint_type: complaintType || 'product_quality',
      source: source || 'customer',
      severity: severity || 'minor',
      priority: priority || 'medium',
      status: 'received',
      product_name: productName || '',
      product_strength: productStrength || '',
      dosage_form: dosageForm || '',
      batch_number: batchNumber || '',
      lot_number: lotNumber || '',
      date_received: new Date().toISOString().split('T')[0],
      date_of_event: dateOfEvent || null,
      complainant_name: complainantName || '',
      complainant_contact: complainantContact || '',
      complainant_org: complainantOrg || '',
      country: country || '',
      immediate_action: immediateAction || '',
      sample_available: sampleAvailable || false,
      created_by: userId || 'system',
    };

    const { error } = await supabase.from('complaints').insert(row);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'complaint.created',
      entityType: 'complaint',
      entityId: complaintId,
      after: { title, complaintType: row.complaint_type, severity: row.severity, source: row.source, batchNumber: row.batch_number },
      reason: `Complaint created: ${title}`,
      req,
    });

    return { ok: true, complaintId };
  }

  async function getComplaint(compId) {
    const { data, error } = await supabase
      .from('complaints').select('*').eq('complaint_id', compId).single();
    if (error) {
      if (error.code === 'PGRST116') throw Object.assign(new Error('Complaint not found'), { statusCode: 404 });
      throw error;
    }
    if (!data) throw Object.assign(new Error('Complaint not found'), { statusCode: 404 });
    return data;
  }

  async function listComplaints(filters = {}) {
    let query = supabase.from('complaints').select('*')
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.complaint_type) query = query.eq('complaint_type', filters.complaint_type);
    if (filters.severity) query = query.eq('severity', filters.severity);
    if (filters.source) query = query.eq('source', filters.source);
    if (filters.product_name) query = query.ilike('product_name', `%${filters.product_name}%`);
    if (filters.batch_number) query = query.eq('batch_number', filters.batch_number);
    if (filters.reportable !== undefined) query = query.eq('reportable', filters.reportable === 'true');
    if (filters.country) query = query.eq('country', filters.country);
    if (filters.date_from) query = query.gte('date_received', filters.date_from);
    if (filters.date_to) query = query.lte('date_received', filters.date_to);
    if (filters.search) {
      query = query.or(`complaint_id.ilike.%${filters.search}%,title.ilike.%${filters.search}%,batch_number.ilike.%${filters.search}%,product_name.ilike.%${filters.search}%,complainant_name.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) {
      if (error.message && error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  async function updateComplaint({ compId, updates, userId, userRole, reason, req }) {
    const current = await getComplaint(compId);

    const allowed = [
      'title', 'description', 'complaint_type', 'source', 'severity', 'priority',
      'product_name', 'product_strength', 'dosage_form', 'batch_number', 'lot_number',
      'date_of_event', 'complainant_name', 'complainant_contact', 'complainant_org', 'country',
      'investigation', 'root_cause', 'investigation_declined_reason', 'initial_risk_assessment',
      'immediate_action', 'linked_deviation_id', 'linked_capa_id', 'linked_recall_id',
      'affected_batches', 'reportable', 'reported_to', 'reported_date',
      'regulatory_report_type', 'regulatory_report_number', 'report_deadline',
      'report_submitted_date', 'reported_within_deadline',
      'counterfeit_assessed', 'counterfeit_notes', 'rapid_alert_issued',
      'other_batches_checked', 'related_batch_findings',
      'competent_authority_notified', 'competent_authority_notified_date',
      'sample_available', 'sample_tested', 'temperature_excursion',
    ];

    const safeUpdates = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) safeUpdates[key] = updates[key];
    }

    if (safeUpdates.report_submitted_date && current.report_deadline) {
      safeUpdates.reported_within_deadline = new Date(safeUpdates.report_submitted_date) <= new Date(current.report_deadline);
    }

    safeUpdates.updated_at = new Date().toISOString();

    const { error } = await supabase.from('complaints').update(safeUpdates).eq('complaint_id', compId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'complaint.updated',
      entityType: 'complaint',
      entityId: compId,
      before: current,
      after: safeUpdates,
      reason: reason || `Complaint ${compId} updated`,
      req,
    });

    return { ok: true, compId, updates: safeUpdates };
  }

  // ── COMPLAINT WORKFLOW ──────────────────────────────────────────────────

  const VALID_TRANSITIONS = {
    received: ['triaging', 'void'],
    triaging: ['investigating', 'void'],
    investigating: ['pending_capa', 'pending_response', 'void'],
    pending_capa: ['pending_response', 'closed', 'void'],
    pending_response: ['closed', 'void'],
  };

  async function transitionStatus({ compId, newStatus, userId, userRole, reason, extraUpdates, req }) {
    const current = await getComplaint(compId);
    const allowed = VALID_TRANSITIONS[current.status];
    if (!allowed || !allowed.includes(newStatus)) {
      throw Object.assign(new Error(`Cannot transition from ${current.status} to ${newStatus}`), { statusCode: 400 });
    }

    const updates = { status: newStatus, updated_at: new Date().toISOString(), ...extraUpdates };

    if (newStatus === 'closed') {
      updates.closed_at = new Date().toISOString();
      updates.closed_by = userId || 'system';
    }

    const { error } = await supabase.from('complaints').update(updates).eq('complaint_id', compId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: `complaint.status_${newStatus}`,
      entityType: 'complaint',
      entityId: compId,
      before: { status: current.status },
      after: { status: newStatus, ...extraUpdates },
      reason: reason || `Status changed to ${newStatus}`,
      req,
    });

    return { ok: true, compId, from: current.status, to: newStatus };
  }

  async function triageComplaint({ compId, priority, initialRiskAssessment, reportable, userId, userRole, req }) {
    return transitionStatus({
      compId, newStatus: 'triaging', userId, userRole, req,
      reason: 'Complaint triaged',
      extraUpdates: {
        priority: priority || undefined,
        initial_risk_assessment: initialRiskAssessment || '',
        reportable: reportable || false,
      },
    });
  }

  async function investigateComplaint({ compId, userId, userRole, req }) {
    return transitionStatus({
      compId, newStatus: 'investigating', userId, userRole, req,
      reason: 'Investigation started',
    });
  }

  async function declineInvestigation({ compId, reason, responsiblePerson, userId, userRole, req }) {
    if (!reason) throw Object.assign(new Error('Justification is required when declining investigation (FDA 211.198)'), { statusCode: 400 });

    const current = await getComplaint(compId);
    const updates = {
      investigation_declined_reason: `${reason} (Responsible: ${responsiblePerson || userId || 'unknown'})`,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('complaints').update(updates).eq('complaint_id', compId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'complaint.investigation_declined',
      entityType: 'complaint',
      entityId: compId,
      before: { investigation_declined_reason: current.investigation_declined_reason },
      after: updates,
      reason: `Investigation declined: ${reason}`,
      req,
    });

    return { ok: true, compId };
  }

  async function respondToComplainant({ compId, replyToComplainant, replyDate, userId, userRole, req }) {
    if (!replyToComplainant) throw Object.assign(new Error('Reply text is required (FDA 211.198(b) field 5)'), { statusCode: 400 });

    const current = await getComplaint(compId);
    const updates = {
      reply_to_complainant: replyToComplainant,
      reply_date: replyDate || new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('complaints').update(updates).eq('complaint_id', compId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'complaint.responded',
      entityType: 'complaint',
      entityId: compId,
      after: updates,
      reason: 'Reply to complainant recorded',
      req,
    });

    return { ok: true, compId };
  }

  async function followUp({ compId, followUpNotes, followUpDate, userId, userRole, req }) {
    const current = await getComplaint(compId);
    const updates = {
      follow_up_notes: followUpNotes || '',
      follow_up_date: followUpDate || new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('complaints').update(updates).eq('complaint_id', compId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'complaint.follow_up',
      entityType: 'complaint',
      entityId: compId,
      after: updates,
      reason: 'Follow-up recorded',
      req,
    });

    return { ok: true, compId };
  }

  async function closeComplaint({ compId, closureNotes, userId, userRole, req }) {
    if (!closureNotes) throw Object.assign(new Error('Closure notes are required'), { statusCode: 400 });

    return transitionStatus({
      compId, newStatus: 'closed', userId, userRole, req,
      reason: 'Complaint closed',
      extraUpdates: { closure_notes: closureNotes },
    });
  }

  async function voidComplaint({ compId, reason, userId, userRole, req }) {
    if (!reason) throw Object.assign(new Error('Justification is required to void a complaint'), { statusCode: 400 });

    const current = await getComplaint(compId);
    if (current.status === 'closed' || current.status === 'void') {
      throw Object.assign(new Error('Cannot void a closed or already voided complaint'), { statusCode: 400 });
    }

    const updates = {
      status: 'void',
      closure_notes: `VOIDED: ${reason}`,
      closed_at: new Date().toISOString(),
      closed_by: userId || 'system',
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('complaints').update(updates).eq('complaint_id', compId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'complaint.voided',
      entityType: 'complaint',
      entityId: compId,
      before: { status: current.status },
      after: updates,
      reason: `Complaint voided: ${reason}`,
      req,
    });

    return { ok: true, compId };
  }

  async function archiveComplaint({ compId, userId, userRole, req }) {
    const current = await getComplaint(compId);
    if (current.status !== 'closed' && current.status !== 'void') {
      throw Object.assign(new Error('Only closed or voided complaints can be archived'), { statusCode: 400 });
    }

    const updates = {
      archived_at: new Date().toISOString(),
      archived_by: userId || 'system',
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('complaints').update(updates).eq('complaint_id', compId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'complaint.archived',
      entityType: 'complaint',
      entityId: compId,
      after: updates,
      reason: 'Complaint archived (soft-delete)',
      req,
    });

    return { ok: true, compId };
  }

  // ── COMPLAINT STATS & REPORTING ─────────────────────────────────────────

  async function getComplaintStats() {
    const { data, error } = await supabase
      .from('complaints').select('*').is('archived_at', null).order('created_at', { ascending: false });
    if (error) {
      if (error.message && error.message.includes('does not exist')) return { total: 0 };
      throw error;
    }
    const all = data || [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 86400000);
    const sixtyDaysAgo = new Date(now - 60 * 86400000);

    const open = all.filter(c => !['closed', 'void'].includes(c.status));
    const bySeverity = { critical: 0, major: 0, minor: 0 };
    const byType = {};
    const byStatus = {};
    let reportableCount = 0;
    let approachingDeadlines = 0;
    let totalCloseDays = 0;
    let closedCount = 0;

    const thisMonth = all.filter(c => new Date(c.date_received) >= thirtyDaysAgo);
    const lastMonth = all.filter(c => {
      const d = new Date(c.date_received);
      return d >= sixtyDaysAgo && d < thirtyDaysAgo;
    });

    all.forEach(c => {
      if (open.includes(c)) bySeverity[c.severity] = (bySeverity[c.severity] || 0) + 1;
      byType[c.complaint_type] = (byType[c.complaint_type] || 0) + 1;
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      if (c.reportable) reportableCount++;
      if (c.report_deadline && !c.report_submitted_date) {
        const deadline = new Date(c.report_deadline);
        const daysUntil = (deadline - now) / 86400000;
        if (daysUntil <= 3) approachingDeadlines++;
      }
      if (c.status === 'closed' && c.closed_at) {
        const days = (new Date(c.closed_at) - new Date(c.created_at)) / 86400000;
        totalCloseDays += days;
        closedCount++;
      }
    });

    // SLA adherence
    const triagedWithin24h = all.filter(c => {
      if (c.status === 'received') return false;
      // rough check: if triaged within 24h of creation
      return true; // simplified - would need status change timestamps
    }).length;

    return {
      total: all.length,
      openCount: open.length,
      bySeverity,
      byType,
      byStatus,
      reportableCount,
      approachingDeadlines,
      thisMonthCount: thisMonth.length,
      lastMonthCount: lastMonth.length,
      avgCloseDays: closedCount > 0 ? Math.round(totalCloseDays / closedCount * 10) / 10 : null,
      recentComplaints: all.slice(0, 10),
    };
  }

  async function getComplaintTrends() {
    const { data, error } = await supabase
      .from('complaints').select('complaint_id,date_received,complaint_type,severity,status,product_name')
      .is('archived_at', null)
      .order('date_received', { ascending: true });
    if (error) {
      if (error.message && error.message.includes('does not exist')) return { months: [] };
      throw error;
    }
    const all = data || [];

    // Group by month
    const months = {};
    all.forEach(c => {
      const month = (c.date_received || '').slice(0, 7);
      if (!month) return;
      if (!months[month]) months[month] = { month, count: 0, bySeverity: { critical: 0, major: 0, minor: 0 } };
      months[month].count++;
      months[month].bySeverity[c.severity] = (months[month].bySeverity[c.severity] || 0) + 1;
    });

    return { months: Object.values(months) };
  }

  async function getSlaStatus() {
    const { data, error } = await supabase
      .from('complaints').select('*')
      .is('archived_at', null)
      .not('status', 'in', '("closed","void")')
      .order('created_at', { ascending: false });
    if (error) {
      if (error.message && error.message.includes('does not exist')) return { complaints: [] };
      throw error;
    }
    const open = data || [];
    const now = new Date();

    return {
      complaints: open.map(c => {
        const daysOpen = Math.floor((now - new Date(c.created_at)) / 86400000);
        const slaTarget = SLA_TARGETS.investigation_completion[c.severity] || 90;
        return {
          complaint_id: c.complaint_id,
          title: c.title,
          severity: c.severity,
          status: c.status,
          days_open: daysOpen,
          sla_target_days: slaTarget,
          sla_status: daysOpen > slaTarget ? 'overdue' : daysOpen > slaTarget * 0.8 ? 'warning' : 'on_track',
        };
      }),
    };
  }

  async function getRegulatoryDeadlines() {
    const { data, error } = await supabase
      .from('complaints').select('*')
      .eq('reportable', true)
      .is('report_submitted_date', null)
      .not('report_deadline', 'is', null)
      .order('report_deadline', { ascending: true });
    if (error) {
      if (error.message && error.message.includes('does not exist')) return { deadlines: [] };
      throw error;
    }
    const now = new Date();
    return {
      deadlines: (data || []).map(c => {
        const deadline = new Date(c.report_deadline);
        const daysRemaining = Math.ceil((deadline - now) / 86400000);
        return {
          complaint_id: c.complaint_id,
          title: c.title,
          report_deadline: c.report_deadline,
          regulatory_report_type: c.regulatory_report_type,
          days_remaining: daysRemaining,
          status: daysRemaining < 0 ? 'overdue' : daysRemaining <= 3 ? 'urgent' : 'upcoming',
        };
      }),
    };
  }

  // ── AI FEATURES ─────────────────────────────────────────────────────────

  async function aiClassify({ compId }) {
    const comp = await getComplaint(compId);
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: CLASSIFY_PROMPT(comp.title, comp.description, comp.product_name, comp.batch_number) }],
    });
    const result = parseClaudeJson(message.content[0].text);

    await supabase.from('complaints').update({
      ai_classification: result,
      updated_at: new Date().toISOString(),
    }).eq('complaint_id', compId);

    await auditLog({
      userId: 'system', userRole: 'system',
      action: 'complaint.ai_classified',
      entityType: 'complaint', entityId: compId,
      after: { classification: result },
      reason: `AI classification: ${result.type} (${result.severity}, confidence: ${result.confidence})`,
    });

    return { ok: true, compId, classification: result };
  }

  async function aiBatchImpact({ compId }) {
    const comp = await getComplaint(compId);

    // Fetch same-batch complaints
    let sameBatch = [];
    if (comp.batch_number) {
      const { data } = await supabase.from('complaints').select('*')
        .eq('batch_number', comp.batch_number)
        .neq('complaint_id', compId)
        .is('archived_at', null);
      sameBatch = data || [];
    }

    // Fetch related complaints (same product, last 90 days)
    let related = [];
    if (comp.product_name) {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
      const { data } = await supabase.from('complaints').select('*')
        .eq('product_name', comp.product_name)
        .neq('complaint_id', compId)
        .gte('date_received', ninetyDaysAgo)
        .is('archived_at', null);
      related = data || [];
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: BATCH_IMPACT_PROMPT(comp, sameBatch, related) }],
    });
    const result = parseClaudeJson(message.content[0].text);

    await supabase.from('complaints').update({
      ai_batch_impact: result,
      updated_at: new Date().toISOString(),
    }).eq('complaint_id', compId);

    await auditLog({
      userId: 'system', userRole: 'system',
      action: 'complaint.ai_batch_impact',
      entityType: 'complaint', entityId: compId,
      after: { risk_assessment: result.risk_assessment, recommended_scope: result.recommended_scope },
      reason: `AI batch impact: ${result.risk_assessment} risk`,
    });

    return { ok: true, compId, batchImpact: result };
  }

  async function aiTrends({ compId }) {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
    const { data } = await supabase.from('complaints').select('*')
      .gte('date_received', ninetyDaysAgo)
      .is('archived_at', null)
      .order('date_received', { ascending: false });
    const recent = data || [];

    // Build stats context
    const byType = {};
    const byProduct = {};
    recent.forEach(c => {
      byType[c.complaint_type] = (byType[c.complaint_type] || 0) + 1;
      if (c.product_name) byProduct[c.product_name] = (byProduct[c.product_name] || 0) + 1;
    });

    const statsContext = `Total complaints (90 days): ${recent.length}\nBy type: ${JSON.stringify(byType)}\nBy product: ${JSON.stringify(byProduct)}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: TREND_PROMPT(recent, statsContext) }],
    });
    const result = parseClaudeJson(message.content[0].text);

    if (compId) {
      await supabase.from('complaints').update({
        ai_trend_summary: result.statistical_summary || JSON.stringify(result),
        updated_at: new Date().toISOString(),
      }).eq('complaint_id', compId);
    }

    await auditLog({
      userId: 'system', userRole: 'system',
      action: 'complaint.ai_trends',
      entityType: 'complaint', entityId: compId || 'global',
      after: { alert_tier: result.alert_tier, pattern_count: (result.patterns || []).length },
      reason: `AI trend analysis: ${result.alert_tier}`,
    });

    return { ok: true, trends: result };
  }

  async function aiPredictRecallRisk() {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
    const { data: complaints } = await supabase.from('complaints').select('*')
      .gte('date_received', ninetyDaysAgo)
      .is('archived_at', null)
      .order('date_received', { ascending: false });

    // Try to fetch related deviations
    let deviations = [];
    try {
      const { data } = await supabase.from('deviations').select('*')
        .order('created_at', { ascending: false }).limit(50);
      deviations = data || [];
    } catch (_) { /* deviations table may not exist */ }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: PREDICT_RECALL_PROMPT(complaints || [], deviations) }],
    });
    const result = parseClaudeJson(message.content[0].text);

    await auditLog({
      userId: 'system', userRole: 'system',
      action: 'complaint.ai_predict_recall',
      entityType: 'complaint', entityId: 'global',
      after: { recall_risk_score: result.recall_risk_score, risk_level: result.risk_level },
      reason: `AI recall risk prediction: ${result.risk_level} (${result.recall_risk_score})`,
    });

    return { ok: true, prediction: result };
  }

  async function aiDraftReport({ compId }) {
    const comp = await getComplaint(compId);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: DRAFT_REPORT_PROMPT(comp) }],
    });
    const result = parseClaudeJson(message.content[0].text);

    await auditLog({
      userId: 'system', userRole: 'system',
      action: 'complaint.ai_draft_report',
      entityType: 'complaint', entityId: compId,
      after: { report_type: result.report_type },
      reason: `AI draft ${result.report_type} report generated`,
    });

    return { ok: true, compId, report: result };
  }

  // ── RECALL CRUD ─────────────────────────────────────────────────────────

  async function createRecall({
    title, description, recallClass, scope, reason, affectedBatches,
    affectedMarkets, distributionData, unitsDistributed, linkedComplaintId,
    recallDepth, publicNotificationMethod, effectivenessCheckLevel,
    targetCompletion, userId, userRole, req
  }) {
    if (!title) throw Object.assign(new Error('title is required'), { statusCode: 400 });

    const recallId = ids.recallId();

    const row = {
      recall_id: recallId,
      title,
      description: description || '',
      recall_class: recallClass || 'class_ii',
      status: 'initiated',
      scope: scope || '',
      reason: reason || '',
      affected_batches: affectedBatches || [],
      affected_markets: affectedMarkets || [],
      distribution_data: distributionData || '',
      units_distributed: unitsDistributed || 0,
      linked_complaint_id: linkedComplaintId || '',
      recall_depth: recallDepth || 'wholesale',
      public_notification_method: publicNotificationMethod || 'none',
      effectiveness_check_level: effectivenessCheckLevel || 'C',
      target_completion: targetCompletion || null,
      initiated_by: userId || 'system',
      initiated_date: new Date().toISOString().split('T')[0],
      created_by: userId || 'system',
    };

    const { error } = await supabase.from('recall_events').insert(row);
    if (error) throw error;

    // Link recall back to complaint if applicable
    if (linkedComplaintId) {
      try {
        await supabase.from('complaints').update({
          linked_recall_id: recallId,
          updated_at: new Date().toISOString(),
        }).eq('complaint_id', linkedComplaintId);
      } catch (_) { /* complaint may not exist */ }
    }

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'recall.created',
      entityType: 'recall',
      entityId: recallId,
      after: { title, recallClass: row.recall_class, linkedComplaintId },
      reason: `Recall initiated: ${title}`,
      req,
    });

    return { ok: true, recallId };
  }

  async function getRecall(recallId) {
    const { data, error } = await supabase
      .from('recall_events').select('*').eq('recall_id', recallId).single();
    if (error) {
      if (error.code === 'PGRST116') throw Object.assign(new Error('Recall not found'), { statusCode: 404 });
      throw error;
    }
    if (!data) throw Object.assign(new Error('Recall not found'), { statusCode: 404 });
    return data;
  }

  async function listRecalls(filters = {}) {
    let query = supabase.from('recall_events').select('*')
      .order('created_at', { ascending: false });
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.recall_class) query = query.eq('recall_class', filters.recall_class);
    if (filters.recall_depth) query = query.eq('recall_depth', filters.recall_depth);

    const { data, error } = await query;
    if (error) {
      if (error.message && error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  async function updateRecall({ recallId, updates, userId, userRole, reason, req }) {
    const current = await getRecall(recallId);

    const allowed = [
      'title', 'description', 'recall_class', 'scope', 'reason',
      'affected_batches', 'affected_markets', 'distribution_data',
      'units_distributed', 'units_recovered', 'recovery_rate',
      'linked_complaint_id', 'notification_status', 'regulatory_body', 'regulatory_ref',
      'recall_depth', 'public_notification_method', 'health_hazard_evaluation',
      'fda_recall_number', 'effectiveness_check_level', 'effectiveness_check_results',
      'status_report_dates', 'competent_authority_notified', 'competent_authority_notified_date',
      'rapid_alert_issued', 'recalled_product_disposition', 'target_completion',
      'effectiveness_check', 'closure_notes', 'lessons_learned',
    ];

    const safeUpdates = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) safeUpdates[key] = updates[key];
    }

    // Auto-compute recovery rate
    if (safeUpdates.units_recovered !== undefined) {
      const distributed = safeUpdates.units_distributed || current.units_distributed || 0;
      if (distributed > 0) {
        safeUpdates.recovery_rate = Math.round((safeUpdates.units_recovered / distributed) * 10000) / 100;
      }
    }

    safeUpdates.updated_at = new Date().toISOString();

    const { error } = await supabase.from('recall_events').update(safeUpdates).eq('recall_id', recallId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'recall.updated',
      entityType: 'recall',
      entityId: recallId,
      before: current,
      after: safeUpdates,
      reason: reason || `Recall ${recallId} updated`,
      req,
    });

    return { ok: true, recallId, updates: safeUpdates };
  }

  // ── RECALL WORKFLOW ─────────────────────────────────────────────────────

  const RECALL_TRANSITIONS = {
    initiated: ['strategy_approved'],
    strategy_approved: ['notifications_sent'],
    notifications_sent: ['in_progress'],
    in_progress: ['effectiveness_checking'],
    effectiveness_checking: ['pending_termination'],
    pending_termination: ['terminated'],
  };

  async function transitionRecallStatus({ recallId, newStatus, userId, userRole, reason, extraUpdates, req }) {
    const current = await getRecall(recallId);
    const allowed = RECALL_TRANSITIONS[current.status];
    if (!allowed || !allowed.includes(newStatus)) {
      throw Object.assign(new Error(`Cannot transition recall from ${current.status} to ${newStatus}`), { statusCode: 400 });
    }

    const updates = { status: newStatus, updated_at: new Date().toISOString(), ...extraUpdates };

    if (newStatus === 'terminated') {
      updates.actual_completion = new Date().toISOString().split('T')[0];
    }

    const { error } = await supabase.from('recall_events').update(updates).eq('recall_id', recallId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: `recall.status_${newStatus}`,
      entityType: 'recall',
      entityId: recallId,
      before: { status: current.status },
      after: { status: newStatus, ...extraUpdates },
      reason: reason || `Recall status changed to ${newStatus}`,
      req,
    });

    return { ok: true, recallId, from: current.status, to: newStatus };
  }

  async function approveRecallStrategy({ recallId, userId, userRole, req }) {
    return transitionRecallStatus({ recallId, newStatus: 'strategy_approved', userId, userRole, req, reason: 'Recall strategy approved' });
  }

  async function sendRecallNotifications({ recallId, notificationStatus, userId, userRole, req }) {
    return transitionRecallStatus({
      recallId, newStatus: 'notifications_sent', userId, userRole, req,
      reason: 'Recall notifications sent',
      extraUpdates: notificationStatus ? { notification_status: notificationStatus } : {},
    });
  }

  async function startRecallRecovery({ recallId, userId, userRole, req }) {
    return transitionRecallStatus({ recallId, newStatus: 'in_progress', userId, userRole, req, reason: 'Recall recovery started' });
  }

  async function recordEffectivenessCheck({ recallId, results, level, userId, userRole, req }) {
    return transitionRecallStatus({
      recallId, newStatus: 'effectiveness_checking', userId, userRole, req,
      reason: 'Effectiveness check recorded',
      extraUpdates: {
        effectiveness_check_results: results || {},
        effectiveness_check_level: level || undefined,
      },
    });
  }

  async function submitTermination({ recallId, userId, userRole, req }) {
    return transitionRecallStatus({ recallId, newStatus: 'pending_termination', userId, userRole, req, reason: 'Recall submitted for termination' });
  }

  async function terminateRecall({ recallId, closureNotes, lessonsLearned, userId, userRole, req }) {
    return transitionRecallStatus({
      recallId, newStatus: 'terminated', userId, userRole, req,
      reason: 'Recall terminated',
      extraUpdates: {
        closure_notes: closureNotes || '',
        lessons_learned: lessonsLearned || '',
      },
    });
  }

  async function recordStatusReport({ recallId, reportDate, userId, userRole, req }) {
    const current = await getRecall(recallId);
    const dates = [...(current.status_report_dates || []), reportDate || new Date().toISOString().split('T')[0]];

    const { error } = await supabase.from('recall_events').update({
      status_report_dates: dates,
      updated_at: new Date().toISOString(),
    }).eq('recall_id', recallId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'recall.status_report',
      entityType: 'recall',
      entityId: recallId,
      after: { status_report_dates: dates },
      reason: 'Periodic status report recorded',
      req,
    });

    return { ok: true, recallId, statusReportDates: dates };
  }

  async function updateConsignees({ recallId, consigneeTracking, userId, userRole, req }) {
    const current = await getRecall(recallId);

    const { error } = await supabase.from('recall_events').update({
      consignee_tracking: consigneeTracking,
      updated_at: new Date().toISOString(),
    }).eq('recall_id', recallId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'recall.consignees_updated',
      entityType: 'recall',
      entityId: recallId,
      after: { consignee_count: (consigneeTracking || []).length },
      reason: 'Consignee tracking updated',
      req,
    });

    return { ok: true, recallId };
  }

  // ── RECALL STATS ────────────────────────────────────────────────────────

  async function getRecallStats() {
    const { data, error } = await supabase
      .from('recall_events').select('*').order('created_at', { ascending: false });
    if (error) {
      if (error.message && error.message.includes('does not exist')) return { total: 0 };
      throw error;
    }
    const all = data || [];
    const active = all.filter(r => r.status !== 'terminated');
    const byClass = { class_i: 0, class_ii: 0, class_iii: 0 };
    let totalRecoveryRate = 0;
    let recoveryCount = 0;

    active.forEach(r => {
      byClass[r.recall_class] = (byClass[r.recall_class] || 0) + 1;
      if (r.recovery_rate > 0) {
        totalRecoveryRate += parseFloat(r.recovery_rate);
        recoveryCount++;
      }
    });

    return {
      total: all.length,
      activeCount: active.length,
      byClass,
      avgRecoveryRate: recoveryCount > 0 ? Math.round(totalRecoveryRate / recoveryCount * 10) / 10 : null,
      recentRecalls: all.slice(0, 10),
    };
  }

  // ── RECALL AI ───────────────────────────────────────────────────────────

  async function aiRecallScope({ recallId }) {
    const recall = await getRecall(recallId);

    let linkedComplaint = null;
    if (recall.linked_complaint_id) {
      try { linkedComplaint = await getComplaint(recall.linked_complaint_id); } catch (_) {}
    }

    // Get related complaints for affected batches
    let relatedComplaints = [];
    if (recall.affected_batches && recall.affected_batches.length > 0) {
      for (const batch of recall.affected_batches.slice(0, 5)) {
        const { data } = await supabase.from('complaints').select('*')
          .eq('batch_number', batch).is('archived_at', null);
        if (data) relatedComplaints.push(...data);
      }
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: RECALL_SCOPE_PROMPT(recall, linkedComplaint, relatedComplaints) }],
    });
    const result = parseClaudeJson(message.content[0].text);

    await supabase.from('recall_events').update({
      ai_scope_assessment: result,
      updated_at: new Date().toISOString(),
    }).eq('recall_id', recallId);

    await auditLog({
      userId: 'system', userRole: 'system',
      action: 'recall.ai_scope',
      entityType: 'recall', entityId: recallId,
      after: { recommended_class: result.recommended_class, recommended_depth: result.recommended_depth },
      reason: `AI scope assessment: ${result.recommended_class}`,
    });

    return { ok: true, recallId, scopeAssessment: result };
  }

  return {
    // Complaint CRUD
    createComplaint, getComplaint, listComplaints, updateComplaint,
    // Complaint workflow
    triageComplaint, investigateComplaint, declineInvestigation,
    respondToComplainant, followUp, closeComplaint, voidComplaint, archiveComplaint,
    // Complaint stats/reporting
    getComplaintStats, getComplaintTrends, getSlaStatus, getRegulatoryDeadlines,
    // Complaint AI
    aiClassify, aiBatchImpact, aiTrends, aiPredictRecallRisk, aiDraftReport,
    // Recall CRUD
    createRecall, getRecall, listRecalls, updateRecall,
    // Recall workflow
    approveRecallStrategy, sendRecallNotifications, startRecallRecovery,
    recordEffectivenessCheck, submitTermination, terminateRecall,
    recordStatusReport, updateConsignees,
    // Recall stats/AI
    getRecallStats, aiRecallScope,
  };
}

module.exports = { makeComplaintService };
