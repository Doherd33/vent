'use strict';

const ids = require('../lib/ids');
const parseClaudeJson = require('../lib/parse-claude-json');

// ── AI Prompt Templates ─────────────────────────────────────────────────────

const TURNAROUND_PROMPT = (sample, queueStats) => `You are a QC laboratory turnaround time prediction system for a biologics manufacturing facility.

Given the current sample and queue state, predict when this sample's testing will be completed.

SAMPLE:
- Sample ID: ${sample.sample_id}
- Sample Type: ${sample.sample_type}
- Required Tests: ${JSON.stringify(sample.required_tests || [])}
- Priority: ${sample.priority}
- Batch Critical: ${sample.batch_critical}
- Received: ${sample.received_date}

QUEUE STATE:
${JSON.stringify(queueStats, null, 2)}

Return ONLY valid JSON (no markdown fences):
{
  "estimated_completion": "ISO datetime string",
  "estimated_hours": 0,
  "confidence": "high|medium|low",
  "bottlenecks": ["list of potential bottlenecks"],
  "reasoning": "Brief explanation"
}`;

const ANOMALY_PROMPT = (results) => `You are a QC laboratory anomaly detection system for a biologics manufacturing facility. Analyse these recent test results for statistical outliers, unexpected trends, or deviations from expected patterns.

Detection patterns to apply:
- Statistical outliers (>2-3 sigma from mean for repeated tests)
- Nelson rules (7+ consecutive points on one side of mean, 6+ trending in one direction)
- Cross-test correlation anomalies (e.g., pH normal but potency shifted)
- Batch-to-batch comparison
- Instrument drift detection

RECENT RESULTS:
${JSON.stringify(results, null, 2)}

Return ONLY valid JSON (no markdown fences):
{
  "anomalies": [
    {
      "result_id": "the result ID",
      "test_name": "test name",
      "reason": "why it is unusual",
      "severity": "info|warning|critical",
      "recommended_action": "what to do"
    }
  ],
  "summary": "Overall assessment"
}`;

const WORKLOAD_PROMPT = (analysts, tests, qualifications) => `You are a QC laboratory workload optimisation system for a biologics manufacturing facility.

Analyse current test assignments, analyst skills/qualifications, and priority levels to suggest optimal workload distribution.

CURRENT ANALYST WORKLOADS:
${JSON.stringify(analysts, null, 2)}

PENDING/IN-PROGRESS TESTS:
${JSON.stringify(tests, null, 2)}

ANALYST QUALIFICATIONS:
${JSON.stringify(qualifications, null, 2)}

Return ONLY valid JSON (no markdown fences):
{
  "recommendations": [
    {
      "action": "reassign|prioritise|flag",
      "test_id": "test ID if applicable",
      "from_analyst": "current analyst",
      "to_analyst": "suggested analyst",
      "reason": "why this change"
    }
  ],
  "bottlenecks": ["identified bottlenecks"],
  "summary": "Overall assessment"
}`;

const PRIORITY_PROMPT = (samples) => `You are a QC sample priority scoring system for a biologics manufacturing facility.

Score and prioritise these samples using the following weights:
- Batch-critical flag (30%)
- Production schedule proximity (25%)
- Sample age since receipt (15%)
- Number of required tests (10%)
- Test complexity/TAT estimate (10%)
- Product tier (10%)

SAMPLES:
${JSON.stringify(samples, null, 2)}

Return ONLY valid JSON (no markdown fences):
{
  "priorities": [
    {
      "sample_id": "sample ID",
      "score": 0,
      "category": "critical|urgent|normal",
      "rationale": "brief justification"
    }
  ]
}`;

const OOS_ROOTCAUSE_PROMPT = (result, test, historicalOos) => `You are an OOS (Out of Specification) investigation assistant for a biologics QC laboratory.

An OOS result has been flagged. Analyse historical OOS investigations for similar test/product/instrument combinations and suggest likely root causes.

CURRENT OOS RESULT:
${JSON.stringify(result, null, 2)}

TEST DETAILS:
${JSON.stringify(test, null, 2)}

HISTORICAL OOS INVESTIGATIONS (similar tests):
${JSON.stringify(historicalOos, null, 2)}

Categorise root causes as: lab_error_calculation, lab_error_sample_prep, lab_error_equipment, lab_error_method, process_related, or inconclusive.

Return ONLY valid JSON (no markdown fences):
{
  "suggested_causes": [
    {
      "category": "root cause category",
      "description": "specific description",
      "likelihood": "high|medium|low",
      "referenced_investigations": ["previous investigation IDs if relevant"]
    }
  ],
  "recommended_actions": ["action 1", "action 2"],
  "summary": "Overall assessment"
}`;

// ── Service Factory ─────────────────────────────────────────────────────────

function makeQcLabService({ supabase, auditLog, anthropic }) {

  // ── Helper: 404 error ──────────────────────────────────────────────────
  function notFound(msg) {
    return Object.assign(new Error(msg), { statusCode: 404 });
  }
  function badReq(msg) {
    return Object.assign(new Error(msg), { statusCode: 400 });
  }

  // ══════════════════════════════════════════════════════════════════════
  // SAMPLES
  // ══════════════════════════════════════════════════════════════════════

  async function createSample({ batchNumber, productName, sampleType, samplePoint, description, priority, batchCritical, requiredTests, storageCondition, storageLocation, quantity, units, expiryDate, stabilityProtocolId, stabilityCondition, stabilityTimePoint, pullDate, isReserveSample, reserveDisposalDate, notes, userId, userRole, req }) {
    if (!batchNumber) throw badReq('batchNumber is required');

    const sampleId = ids.qcSampleId();
    const row = {
      sample_id: sampleId,
      batch_number: batchNumber,
      product_name: productName || '',
      sample_type: sampleType || 'in_process',
      sample_point: samplePoint || '',
      description: description || '',
      status: 'received',
      priority: priority || 'normal',
      batch_critical: batchCritical || false,
      received_by: userId || 'unknown',
      required_tests: requiredTests || [],
      storage_condition: storageCondition || 'room_temp',
      storage_location: storageLocation || '',
      quantity: quantity || '',
      units: units || '',
      expiry_date: expiryDate || null,
      stability_protocol_id: stabilityProtocolId || '',
      stability_condition: stabilityCondition || '',
      stability_time_point: stabilityTimePoint || '',
      pull_date: pullDate || null,
      is_reserve_sample: isReserveSample || false,
      reserve_disposal_date: reserveDisposalDate || null,
      notes: notes || '',
      created_by: userId || 'system',
    };

    const { error } = await supabase.from('qc_samples').insert(row);
    if (error) throw error;

    await auditLog({ userId: userId || 'system', userRole: userRole || 'system', action: 'qc_sample_created', entityType: 'qc_sample', entityId: sampleId, after: { sampleId, batchNumber, sampleType, priority }, reason: `QC sample registered: ${sampleId}`, req });

    return { ok: true, sampleId };
  }

  async function listSamples({ status, sampleType, batchNumber, priority, batchCritical, dateFrom, dateTo } = {}) {
    let q = supabase.from('qc_samples').select('*').order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);
    if (sampleType) q = q.eq('sample_type', sampleType);
    if (batchNumber) q = q.ilike('batch_number', `%${batchNumber}%`);
    if (priority) q = q.eq('priority', priority);
    if (batchCritical === 'true' || batchCritical === true) q = q.eq('batch_critical', true);
    if (dateFrom) q = q.gte('received_date', dateFrom);
    if (dateTo) q = q.lte('received_date', dateTo);
    const { data, error } = await q;
    if (error) { if (error.message.includes('does not exist')) return []; throw error; }
    return data || [];
  }

  async function getSample(sampleId) {
    const { data, error } = await supabase.from('qc_samples').select('*').eq('sample_id', sampleId).single();
    if (error || !data) throw notFound('Sample not found');

    // Also fetch tests and results
    const { data: tests } = await supabase.from('qc_tests').select('*').eq('sample_id', sampleId).order('created_at', { ascending: true });
    const testIds = (tests || []).map(t => t.test_id);
    let results = [];
    if (testIds.length > 0) {
      const { data: r } = await supabase.from('qc_results').select('*').in('test_id', testIds).order('created_at', { ascending: true });
      results = r || [];
    }
    return { ...data, tests: tests || [], results };
  }

  async function updateSample({ sampleId, updates, userId, userRole, req }) {
    const current = await getSample(sampleId);
    updates.updated_at = new Date().toISOString();
    const { error } = await supabase.from('qc_samples').update(updates).eq('sample_id', sampleId);
    if (error) throw error;
    await auditLog({ userId: userId || 'system', userRole: userRole || 'system', action: 'qc_sample_updated', entityType: 'qc_sample', entityId: sampleId, before: current, after: updates, reason: `QC sample updated: ${sampleId}`, req });
    return { ok: true, sampleId };
  }

  async function completeSample({ sampleId, userId, userRole, req }) {
    const { error } = await supabase.from('qc_samples').update({ status: 'completed', completed_date: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('sample_id', sampleId);
    if (error) throw error;
    await auditLog({ userId: userId || 'system', userRole: userRole || 'system', action: 'qc_sample_completed', entityType: 'qc_sample', entityId: sampleId, after: { status: 'completed' }, reason: `QC sample completed: ${sampleId}`, req });
    return { ok: true, sampleId };
  }

  // ══════════════════════════════════════════════════════════════════════
  // TESTS
  // ══════════════════════════════════════════════════════════════════════

  async function createTest({ sampleId, testName, testMethod, testMethodId, testCategory, specVersion, specEffectiveDate, assignedAnalyst, instrumentId, specificationMin, specificationMax, specificationUnit, specificationText, targetTatHours, dueDate, notes, userId, userRole, req }) {
    if (!sampleId || !testName) throw badReq('sampleId and testName are required');

    const testId = ids.qcTestId();
    let qualificationWarning = false;
    let methodValidationWarning = false;

    // Check analyst qualification if analyst assigned
    if (assignedAnalyst && testMethod) {
      const { data: quals } = await supabase.from('qc_analyst_qualifications').select('*').eq('analyst_id', assignedAnalyst).eq('test_method', testMethod).eq('qualification_status', 'qualified');
      if (!quals || quals.length === 0) qualificationWarning = true;
    }

    // Check method validation status
    if (testMethodId) {
      const { data: meth } = await supabase.from('qc_test_methods').select('validation_status').eq('method_id', testMethodId).single();
      if (meth && meth.validation_status === 'expired') methodValidationWarning = true;
    }

    const row = {
      test_id: testId,
      sample_id: sampleId,
      test_name: testName,
      test_method: testMethod || '',
      test_method_id: testMethodId || '',
      test_category: testCategory || 'chemical',
      spec_version: specVersion || '1.0',
      spec_effective_date: specEffectiveDate || null,
      status: assignedAnalyst ? 'assigned' : 'pending',
      assigned_analyst: assignedAnalyst || '',
      assigned_date: assignedAnalyst ? new Date().toISOString() : null,
      instrument_id: instrumentId || '',
      specification_min: specificationMin ?? null,
      specification_max: specificationMax ?? null,
      specification_unit: specificationUnit || '',
      specification_text: specificationText || '',
      target_tat_hours: targetTatHours || 48,
      due_date: dueDate || null,
      notes: notes || '',
      created_by: userId || 'system',
    };

    const { error } = await supabase.from('qc_tests').insert(row);
    if (error) throw error;

    // Update sample status to in_testing if it was received
    await supabase.from('qc_samples').update({ status: 'in_testing', updated_at: new Date().toISOString() }).eq('sample_id', sampleId).eq('status', 'received');

    await auditLog({ userId: userId || 'system', userRole: userRole || 'system', action: 'qc_test_created', entityType: 'qc_test', entityId: testId, after: { testId, sampleId, testName, assignedAnalyst }, reason: `QC test created: ${testId}`, req });

    return { ok: true, testId, qualificationWarning, methodValidationWarning };
  }

  async function listTests({ status, assignedAnalyst, instrumentId, dueDate, sampleId } = {}) {
    let q = supabase.from('qc_tests').select('*').order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);
    if (assignedAnalyst) q = q.eq('assigned_analyst', assignedAnalyst);
    if (instrumentId) q = q.eq('instrument_id', instrumentId);
    if (dueDate) q = q.lte('due_date', dueDate);
    if (sampleId) q = q.eq('sample_id', sampleId);
    const { data, error } = await q;
    if (error) { if (error.message.includes('does not exist')) return []; throw error; }
    return data || [];
  }

  async function getTest(testId) {
    const { data, error } = await supabase.from('qc_tests').select('*').eq('test_id', testId).single();
    if (error || !data) throw notFound('Test not found');
    return data;
  }

  async function updateTest({ testId, updates, userId, userRole, req }) {
    updates.updated_at = new Date().toISOString();
    const { error } = await supabase.from('qc_tests').update(updates).eq('test_id', testId);
    if (error) throw error;
    await auditLog({ userId: userId || 'system', userRole: userRole || 'system', action: 'qc_test_updated', entityType: 'qc_test', entityId: testId, after: updates, reason: `QC test updated: ${testId}`, req });
    return { ok: true, testId };
  }

  async function startTest({ testId, userId, userRole, req }) {
    const { error } = await supabase.from('qc_tests').update({ status: 'in_progress', started_date: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('test_id', testId);
    if (error) throw error;
    await auditLog({ userId: userId || 'system', userRole: userRole || 'system', action: 'qc_test_started', entityType: 'qc_test', entityId: testId, after: { status: 'in_progress' }, reason: `QC test started: ${testId}`, req });
    return { ok: true, testId };
  }

  async function completeTest({ testId, userId, userRole, req }) {
    const { error } = await supabase.from('qc_tests').update({ status: 'completed', completed_date: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('test_id', testId);
    if (error) throw error;
    await auditLog({ userId: userId || 'system', userRole: userRole || 'system', action: 'qc_test_completed', entityType: 'qc_test', entityId: testId, after: { status: 'completed' }, reason: `QC test completed: ${testId}`, req });
    return { ok: true, testId };
  }

  // ══════════════════════════════════════════════════════════════════════
  // RESULTS
  // ══════════════════════════════════════════════════════════════════════

  async function createResult({ testId, sampleId, resultValue, resultText, resultUnit, passFail, oosFlag, ootFlag, calculationNotes, rawData, retestReason, notes, userId, userRole, req }) {
    if (!testId) throw badReq('testId is required');

    const resultId = ids.qcResultId();

    // Fetch test to check spec limits
    const test = await getTest(testId);
    if (!sampleId) sampleId = test.sample_id;

    // Auto-calculate pass/fail and OOS flag
    let computedPassFail = passFail || '';
    let computedOos = oosFlag || false;
    if (resultValue !== undefined && resultValue !== null) {
      const val = Number(resultValue);
      if (test.specification_min !== null && test.specification_max !== null) {
        if (val < Number(test.specification_min) || val > Number(test.specification_max)) {
          computedPassFail = computedPassFail || 'fail';
          computedOos = true;
        } else {
          computedPassFail = computedPassFail || 'pass';
        }
      }
    }

    const row = {
      result_id: resultId,
      test_id: testId,
      sample_id: sampleId,
      result_value: resultValue ?? null,
      result_text: resultText || '',
      result_unit: resultUnit || '',
      pass_fail: computedPassFail,
      oos_flag: computedOos,
      oot_flag: ootFlag || false,
      review_status: 'pending_review',
      raw_data: rawData || {},
      calculation_notes: calculationNotes || '',
      retest: !!retestReason,
      retest_reason: retestReason || '',
      notes: notes || '',
      created_by: userId || 'system',
    };

    const { error } = await supabase.from('qc_results').insert(row);
    if (error) throw error;

    await auditLog({ userId: userId || 'system', userRole: userRole || 'system', action: 'qc_result_recorded', entityType: 'qc_result', entityId: resultId, after: { resultId, testId, resultValue, passFail: computedPassFail, oosFlag: computedOos }, reason: `QC result recorded: ${resultId}`, req });

    return { ok: true, resultId, passFail: computedPassFail, oosFlag: computedOos };
  }

  async function listResults({ sampleId, testId, oosFlag, reviewStatus } = {}) {
    let q = supabase.from('qc_results').select('*').order('created_at', { ascending: false });
    if (sampleId) q = q.eq('sample_id', sampleId);
    if (testId) q = q.eq('test_id', testId);
    if (oosFlag === 'true' || oosFlag === true) q = q.eq('oos_flag', true);
    if (reviewStatus) q = q.eq('review_status', reviewStatus);
    const { data, error } = await q;
    if (error) { if (error.message.includes('does not exist')) return []; throw error; }
    return data || [];
  }

  async function getResult(resultId) {
    const { data, error } = await supabase.from('qc_results').select('*').eq('result_id', resultId).single();
    if (error || !data) throw notFound('Result not found');
    return data;
  }

  async function updateResult({ resultId, updates, userId, userRole, req }) {
    const current = await getResult(resultId);
    updates.updated_at = new Date().toISOString();
    const { error } = await supabase.from('qc_results').update(updates).eq('result_id', resultId);
    if (error) throw error;
    await auditLog({ userId: userId || 'system', userRole: userRole || 'system', action: 'qc_result_updated', entityType: 'qc_result', entityId: resultId, before: current, after: updates, reason: `QC result updated: ${resultId}`, req });
    return { ok: true, resultId };
  }

  async function reviewResult({ resultId, reviewedBy, reviewStatus, notes, userId, userRole, req }) {
    const updates = {
      reviewed_by: reviewedBy || userId,
      reviewed_date: new Date().toISOString(),
      review_status: reviewStatus || 'reviewed',
      updated_at: new Date().toISOString(),
    };
    if (notes) updates.notes = notes;
    const { error } = await supabase.from('qc_results').update(updates).eq('result_id', resultId);
    if (error) throw error;
    await auditLog({ userId: userId || 'system', userRole: userRole || 'system', action: 'qc_result_reviewed', entityType: 'qc_result', entityId: resultId, after: updates, reason: `QC result reviewed: ${resultId} — ${reviewStatus}`, req });
    return { ok: true, resultId, reviewStatus };
  }

  async function approveResult({ resultId, approvedBy, notes, userId, userRole, req }) {
    const updates = {
      approved_by: approvedBy || userId,
      approved_date: new Date().toISOString(),
      review_status: 'approved',
      updated_at: new Date().toISOString(),
    };
    if (notes) updates.notes = notes;
    const { error } = await supabase.from('qc_results').update(updates).eq('result_id', resultId);
    if (error) throw error;
    await auditLog({ userId: userId || 'system', userRole: userRole || 'system', action: 'qc_result_approved', entityType: 'qc_result', entityId: resultId, after: updates, reason: `QC result approved: ${resultId}`, req });
    return { ok: true, resultId };
  }

  // ══════════════════════════════════════════════════════════════════════
  // OOS INVESTIGATION
  // ══════════════════════════════════════════════════════════════════════

  async function initiateOos({ resultId, assignee, userId, userRole, req }) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    const updates = {
      oos_investigation_phase: 'phase_1',
      oos_investigation_status: 'open',
      oos_investigation_due_date: dueDate.toISOString(),
      oos_assignee: assignee || userId || '',
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('qc_results').update(updates).eq('result_id', resultId);
    if (error) throw error;
    await auditLog({ userId: userId || 'system', userRole: userRole || 'system', action: 'qc_oos_initiated', entityType: 'qc_result', entityId: resultId, after: updates, reason: `OOS Phase I investigation initiated: ${resultId}`, req });
    return { ok: true, resultId, phase: 'phase_1', dueDate: dueDate.toISOString() };
  }

  async function updateOos({ resultId, rootCauseCategory, conclusion, status, notes, userId, userRole, req }) {
    const updates = { updated_at: new Date().toISOString() };
    if (rootCauseCategory) updates.oos_root_cause_category = rootCauseCategory;
    if (conclusion) updates.oos_conclusion = conclusion;
    if (status) updates.oos_investigation_status = status;
    if (notes) updates.notes = notes;
    const { error } = await supabase.from('qc_results').update(updates).eq('result_id', resultId);
    if (error) throw error;
    await auditLog({ userId: userId || 'system', userRole: userRole || 'system', action: 'qc_oos_updated', entityType: 'qc_result', entityId: resultId, after: updates, reason: `OOS investigation updated: ${resultId}`, req });
    return { ok: true, resultId };
  }

  async function escalateOos({ resultId, userId, userRole, req }) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const updates = {
      oos_investigation_phase: 'phase_2',
      oos_investigation_status: 'escalated',
      oos_investigation_due_date: dueDate.toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('qc_results').update(updates).eq('result_id', resultId);
    if (error) throw error;
    await auditLog({ userId: userId || 'system', userRole: userRole || 'system', action: 'qc_oos_escalated', entityType: 'qc_result', entityId: resultId, after: updates, reason: `OOS escalated to Phase II: ${resultId}`, req });
    return { ok: true, resultId, phase: 'phase_2', dueDate: dueDate.toISOString() };
  }

  async function closeOos({ resultId, conclusion, userId, userRole, req }) {
    const updates = {
      oos_investigation_status: 'closed',
      oos_conclusion: conclusion || '',
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('qc_results').update(updates).eq('result_id', resultId);
    if (error) throw error;
    await auditLog({ userId: userId || 'system', userRole: userRole || 'system', action: 'qc_oos_closed', entityType: 'qc_result', entityId: resultId, after: updates, reason: `OOS investigation closed: ${resultId} — ${conclusion}`, req });
    return { ok: true, resultId, conclusion };
  }

  // ══════════════════════════════════════════════════════════════════════
  // INSTRUMENTS
  // ══════════════════════════════════════════════════════════════════════

  async function createInstrument({ name, instrumentType, model, serialNumber, location, qualificationDate, nextQualification, calibrationDate, nextCalibration, maintenanceDate, nextMaintenance, responsiblePerson, sopReference, notes, userId, userRole, req }) {
    if (!name) throw badReq('name is required');
    const instrumentId = ids.qcInstrumentId();
    const row = {
      instrument_id: instrumentId, name, instrument_type: instrumentType || 'analytical',
      model: model || '', serial_number: serialNumber || '', location: location || '',
      status: 'qualified',
      qualification_date: qualificationDate || null, next_qualification: nextQualification || null,
      calibration_date: calibrationDate || null, next_calibration: nextCalibration || null,
      maintenance_date: maintenanceDate || null, next_maintenance: nextMaintenance || null,
      responsible_person: responsiblePerson || '', sop_reference: sopReference || '',
      notes: notes || '', created_by: userId || 'system',
    };
    const { error } = await supabase.from('qc_instruments').insert(row);
    if (error) throw error;
    await auditLog({ userId: userId || 'system', userRole: userRole || 'system', action: 'qc_instrument_created', entityType: 'qc_instrument', entityId: instrumentId, after: { instrumentId, name }, reason: `QC instrument registered: ${instrumentId}`, req });
    return { ok: true, instrumentId };
  }

  async function listInstruments({ status, instrumentType, overdueCal } = {}) {
    let q = supabase.from('qc_instruments').select('*').order('name', { ascending: true });
    if (status) q = q.eq('status', status);
    if (instrumentType) q = q.eq('instrument_type', instrumentType);
    if (overdueCal === 'true' || overdueCal === true) q = q.lt('next_calibration', new Date().toISOString().split('T')[0]);
    const { data, error } = await q;
    if (error) { if (error.message.includes('does not exist')) return []; throw error; }
    return data || [];
  }

  async function getInstrument(instrumentId) {
    const { data, error } = await supabase.from('qc_instruments').select('*').eq('instrument_id', instrumentId).single();
    if (error || !data) throw notFound('Instrument not found');
    return data;
  }

  async function updateInstrument({ instrumentId, updates, userId, userRole, req }) {
    updates.updated_at = new Date().toISOString();
    const { error } = await supabase.from('qc_instruments').update(updates).eq('instrument_id', instrumentId);
    if (error) throw error;
    await auditLog({ userId: userId || 'system', userRole: userRole || 'system', action: 'qc_instrument_updated', entityType: 'qc_instrument', entityId: instrumentId, after: updates, reason: `QC instrument updated: ${instrumentId}`, req });
    return { ok: true, instrumentId };
  }

  // ══════════════════════════════════════════════════════════════════════
  // ANALYST QUALIFICATIONS
  // ══════════════════════════════════════════════════════════════════════

  async function createQualification({ analystId, analystName, testMethod, testMethodId, qualifiedDate, requalificationDue, trainer, trainingRecordRef, notes, userId, userRole, req }) {
    if (!analystId || !testMethod) throw badReq('analystId and testMethod are required');
    const qualId = ids.qcQualificationId();
    const row = {
      qualification_id: qualId, analyst_id: analystId, analyst_name: analystName || '',
      test_method: testMethod, test_method_id: testMethodId || '',
      qualified_date: qualifiedDate || new Date().toISOString().split('T')[0],
      requalification_due: requalificationDue || null,
      qualification_status: 'qualified',
      trainer: trainer || '', training_record_ref: trainingRecordRef || '',
      notes: notes || '', created_by: userId || 'system',
    };
    const { error } = await supabase.from('qc_analyst_qualifications').insert(row);
    if (error) throw error;
    await auditLog({ userId: userId || 'system', userRole: userRole || 'system', action: 'qc_qualification_created', entityType: 'qc_qualification', entityId: qualId, after: { qualId, analystId, testMethod }, reason: `Analyst qualification recorded: ${qualId}`, req });
    return { ok: true, qualificationId: qualId };
  }

  async function listQualifications({ analystId, testMethod, qualificationStatus, overdueReqal } = {}) {
    let q = supabase.from('qc_analyst_qualifications').select('*').order('created_at', { ascending: false });
    if (analystId) q = q.eq('analyst_id', analystId);
    if (testMethod) q = q.eq('test_method', testMethod);
    if (qualificationStatus) q = q.eq('qualification_status', qualificationStatus);
    if (overdueReqal === 'true' || overdueReqal === true) q = q.lt('requalification_due', new Date().toISOString().split('T')[0]);
    const { data, error } = await q;
    if (error) { if (error.message.includes('does not exist')) return []; throw error; }
    return data || [];
  }

  async function getQualification(qualId) {
    const { data, error } = await supabase.from('qc_analyst_qualifications').select('*').eq('qualification_id', qualId).single();
    if (error || !data) throw notFound('Qualification not found');
    return data;
  }

  async function updateQualification({ qualId, updates, userId, userRole, req }) {
    updates.updated_at = new Date().toISOString();
    const { error } = await supabase.from('qc_analyst_qualifications').update(updates).eq('qualification_id', qualId);
    if (error) throw error;
    await auditLog({ userId: userId || 'system', userRole: userRole || 'system', action: 'qc_qualification_updated', entityType: 'qc_qualification', entityId: qualId, after: updates, reason: `Analyst qualification updated: ${qualId}`, req });
    return { ok: true, qualificationId: qualId };
  }

  async function checkQualification(analystId, testMethod) {
    const { data } = await supabase.from('qc_analyst_qualifications').select('*').eq('analyst_id', analystId).eq('test_method', testMethod);
    const qualified = (data || []).find(q => q.qualification_status === 'qualified');
    const expired = (data || []).find(q => q.qualification_status === 'expired');
    return { analystId, testMethod, qualified: !!qualified, expired: !!expired, qualifications: data || [] };
  }

  // ══════════════════════════════════════════════════════════════════════
  // TEST METHODS
  // ══════════════════════════════════════════════════════════════════════

  async function createMethod({ methodName, methodCategory, version, validationStatus, validatedDate, nextRevalidation, sopReference, applicableProducts, instrumentTypes, notes, userId, userRole, req }) {
    if (!methodName) throw badReq('methodName is required');
    const methodId = ids.qcMethodId();
    const row = {
      method_id: methodId, method_name: methodName,
      method_category: methodCategory || 'chemical', version: version || '1.0',
      validation_status: validationStatus || 'validated',
      validated_date: validatedDate || null, next_revalidation: nextRevalidation || null,
      sop_reference: sopReference || '',
      applicable_products: applicableProducts || [], instrument_types: instrumentTypes || [],
      notes: notes || '', created_by: userId || 'system',
    };
    const { error } = await supabase.from('qc_test_methods').insert(row);
    if (error) throw error;
    await auditLog({ userId: userId || 'system', userRole: userRole || 'system', action: 'qc_method_created', entityType: 'qc_method', entityId: methodId, after: { methodId, methodName }, reason: `QC test method registered: ${methodId}`, req });
    return { ok: true, methodId };
  }

  async function listMethods({ methodCategory, validationStatus, overdueReval } = {}) {
    let q = supabase.from('qc_test_methods').select('*').order('method_name', { ascending: true });
    if (methodCategory) q = q.eq('method_category', methodCategory);
    if (validationStatus) q = q.eq('validation_status', validationStatus);
    if (overdueReval === 'true' || overdueReval === true) q = q.lt('next_revalidation', new Date().toISOString().split('T')[0]);
    const { data, error } = await q;
    if (error) { if (error.message.includes('does not exist')) return []; throw error; }
    return data || [];
  }

  async function getMethod(methodId) {
    const { data, error } = await supabase.from('qc_test_methods').select('*').eq('method_id', methodId).single();
    if (error || !data) throw notFound('Method not found');
    return data;
  }

  async function updateMethod({ methodId, updates, userId, userRole, req }) {
    updates.updated_at = new Date().toISOString();
    const { error } = await supabase.from('qc_test_methods').update(updates).eq('method_id', methodId);
    if (error) throw error;
    await auditLog({ userId: userId || 'system', userRole: userRole || 'system', action: 'qc_method_updated', entityType: 'qc_method', entityId: methodId, after: updates, reason: `QC test method updated: ${methodId}`, req });
    return { ok: true, methodId };
  }

  // ══════════════════════════════════════════════════════════════════════
  // TEST TEMPLATES
  // ══════════════════════════════════════════════════════════════════════

  async function createTemplate({ templateName, sampleType, productName, tests, notes, userId, userRole, req }) {
    if (!templateName || !sampleType) throw badReq('templateName and sampleType are required');
    const templateId = ids.qcTemplateId();
    const row = {
      template_id: templateId, template_name: templateName,
      sample_type: sampleType, product_name: productName || '',
      tests: tests || [], notes: notes || '', created_by: userId || 'system',
    };
    const { error } = await supabase.from('qc_test_templates').insert(row);
    if (error) throw error;
    await auditLog({ userId: userId || 'system', userRole: userRole || 'system', action: 'qc_template_created', entityType: 'qc_template', entityId: templateId, after: { templateId, templateName }, reason: `QC test template created: ${templateId}`, req });
    return { ok: true, templateId };
  }

  async function listTemplates({ sampleType, productName } = {}) {
    let q = supabase.from('qc_test_templates').select('*').order('template_name', { ascending: true });
    if (sampleType) q = q.eq('sample_type', sampleType);
    if (productName) q = q.ilike('product_name', `%${productName}%`);
    const { data, error } = await q;
    if (error) { if (error.message.includes('does not exist')) return []; throw error; }
    return data || [];
  }

  async function getTemplate(templateId) {
    const { data, error } = await supabase.from('qc_test_templates').select('*').eq('template_id', templateId).single();
    if (error || !data) throw notFound('Template not found');
    return data;
  }

  async function updateTemplate({ templateId, updates, userId, userRole, req }) {
    updates.updated_at = new Date().toISOString();
    const { error } = await supabase.from('qc_test_templates').update(updates).eq('template_id', templateId);
    if (error) throw error;
    await auditLog({ userId: userId || 'system', userRole: userRole || 'system', action: 'qc_template_updated', entityType: 'qc_template', entityId: templateId, after: updates, reason: `QC test template updated: ${templateId}`, req });
    return { ok: true, templateId };
  }

  async function getTemplatesForSampleType(sampleType) {
    const { data, error } = await supabase.from('qc_test_templates').select('*').eq('sample_type', sampleType).order('template_name', { ascending: true });
    if (error) { if (error.message.includes('does not exist')) return []; throw error; }
    return data || [];
  }

  // ══════════════════════════════════════════════════════════════════════
  // COA (Certificate of Analysis)
  // ══════════════════════════════════════════════════════════════════════

  async function generateCoa(sampleId) {
    const sample = await getSample(sampleId);
    const approvedResults = sample.results.filter(r => r.review_status === 'approved');
    return {
      sampleId: sample.sample_id,
      batchNumber: sample.batch_number,
      productName: sample.product_name,
      sampleType: sample.sample_type,
      receivedDate: sample.received_date,
      completedDate: sample.completed_date,
      tests: sample.tests.map(t => {
        const result = approvedResults.find(r => r.test_id === t.test_id);
        return {
          testName: t.test_name, testMethod: t.test_method, specVersion: t.spec_version,
          specMin: t.specification_min, specMax: t.specification_max, specUnit: t.specification_unit, specText: t.specification_text,
          result: result ? { value: result.result_value, text: result.result_text, unit: result.result_unit, passFail: result.pass_fail, approvedBy: result.approved_by, approvedDate: result.approved_date } : null,
        };
      }),
      generatedAt: new Date().toISOString(),
    };
  }

  // ══════════════════════════════════════════════════════════════════════
  // STATS & WORKLOAD
  // ══════════════════════════════════════════════════════════════════════

  async function getStats() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(now - 30 * 86400000).toISOString();

    const [samplesRes, testsRes, resultsRes, instrumentsRes, methodsRes, qualsRes] = await Promise.all([
      supabase.from('qc_samples').select('*'),
      supabase.from('qc_tests').select('*'),
      supabase.from('qc_results').select('*'),
      supabase.from('qc_instruments').select('*'),
      supabase.from('qc_test_methods').select('*'),
      supabase.from('qc_analyst_qualifications').select('*'),
    ]);

    const samples = samplesRes.data || [];
    const tests = testsRes.data || [];
    const results = resultsRes.data || [];
    const instruments = instrumentsRes.data || [];
    const methods = methodsRes.data || [];
    const quals = qualsRes.data || [];

    const samplesByStatus = {};
    samples.forEach(s => { samplesByStatus[s.status] = (samplesByStatus[s.status] || 0) + 1; });

    const testsInProgress = tests.filter(t => t.status === 'in_progress').length;
    const overdueTests = tests.filter(t => t.due_date && t.status !== 'completed' && new Date(t.due_date) < now).length;
    const oosResults = results.filter(r => r.oos_flag && new Date(r.created_at) > new Date(thirtyDaysAgo));
    const openOosInvestigations = results.filter(r => r.oos_investigation_status === 'open' || r.oos_investigation_status === 'escalated').length;

    const instrumentsDueCal = instruments.filter(i => i.next_calibration && new Date(i.next_calibration) < now).length;
    const methodsDueReval = methods.filter(m => m.next_revalidation && new Date(m.next_revalidation) < now).length;
    const qualsDueReqal = quals.filter(q => q.requalification_due && new Date(q.requalification_due) < now).length;

    // Average TAT (last 30 days)
    const recentCompleted = samples.filter(s => s.completed_date && new Date(s.completed_date) > new Date(thirtyDaysAgo));
    let avgTatHours = null;
    if (recentCompleted.length > 0) {
      const totalHours = recentCompleted.reduce((sum, s) => sum + (new Date(s.completed_date) - new Date(s.received_date)) / 3600000, 0);
      avgTatHours = Math.round(totalHours / recentCompleted.length * 10) / 10;
    }

    // Analyst utilisation
    const analystWorkloads = {};
    tests.filter(t => t.assigned_analyst && t.status !== 'completed').forEach(t => {
      analystWorkloads[t.assigned_analyst] = (analystWorkloads[t.assigned_analyst] || 0) + 1;
    });

    return {
      samplesByStatus,
      samplesInQueue: samples.filter(s => s.status !== 'completed' && s.status !== 'cancelled').length,
      testsInProgress, overdueTests,
      oosThisMonth: oosResults.length, openOosInvestigations,
      avgTatHours,
      instrumentsDueCal, methodsDueReval, qualsDueReqal,
      analystWorkloads,
    };
  }

  async function getWorkload() {
    const [testsRes, qualsRes] = await Promise.all([
      supabase.from('qc_tests').select('*').neq('status', 'completed'),
      supabase.from('qc_analyst_qualifications').select('*'),
    ]);
    const tests = testsRes.data || [];
    const quals = qualsRes.data || [];

    const analysts = {};
    tests.forEach(t => {
      if (!t.assigned_analyst) return;
      if (!analysts[t.assigned_analyst]) analysts[t.assigned_analyst] = { assignedTests: 0, estimatedHours: 0, overdueTests: 0, tests: [] };
      analysts[t.assigned_analyst].assignedTests++;
      analysts[t.assigned_analyst].estimatedHours += (t.target_tat_hours || 48);
      if (t.due_date && new Date(t.due_date) < new Date()) analysts[t.assigned_analyst].overdueTests++;
      analysts[t.assigned_analyst].tests.push(t);
    });

    // Add qualification coverage
    Object.keys(analysts).forEach(analystId => {
      const analystQuals = quals.filter(q => q.analyst_id === analystId && q.qualification_status === 'qualified');
      const qualifiedMethods = new Set(analystQuals.map(q => q.test_method));
      const assignedMethods = new Set(analysts[analystId].tests.map(t => t.test_method).filter(Boolean));
      const qualified = [...assignedMethods].filter(m => qualifiedMethods.has(m)).length;
      analysts[analystId].qualificationCoverage = assignedMethods.size > 0 ? Math.round(qualified / assignedMethods.size * 100) : 100;
    });

    return { analysts };
  }

  // ══════════════════════════════════════════════════════════════════════
  // AI FEATURES
  // ══════════════════════════════════════════════════════════════════════

  async function aiTurnaround({ sampleId }) {
    const sample = await getSample(sampleId);
    const stats = await getStats();
    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514', max_tokens: 1000,
        messages: [{ role: 'user', content: TURNAROUND_PROMPT(sample, stats) }],
      });
      const result = parseClaudeJson(message.content[0].text);
      await supabase.from('qc_samples').update({ ai_turnaround_est: result.estimated_hours + 'h', ai_priority_score: result.estimated_hours, updated_at: new Date().toISOString() }).eq('sample_id', sampleId);
      return { ok: true, sampleId, prediction: result };
    } catch (e) {
      console.error('[QC-LAB] AI turnaround error:', e.message);
      return { ok: false, error: e.message };
    }
  }

  async function aiAnomaly({ limit } = {}) {
    const { data: results } = await supabase.from('qc_results').select('*').order('created_at', { ascending: false }).limit(limit || 100);
    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514', max_tokens: 2000,
        messages: [{ role: 'user', content: ANOMALY_PROMPT(results || []) }],
      });
      const result = parseClaudeJson(message.content[0].text);
      // Update anomaly flags on results
      for (const anomaly of (result.anomalies || [])) {
        if (anomaly.result_id) {
          await supabase.from('qc_results').update({ ai_anomaly_flag: true, ai_anomaly_reason: anomaly.reason, updated_at: new Date().toISOString() }).eq('result_id', anomaly.result_id);
        }
      }
      return { ok: true, result };
    } catch (e) {
      console.error('[QC-LAB] AI anomaly error:', e.message);
      return { ok: false, error: e.message };
    }
  }

  async function aiWorkload() {
    const workload = await getWorkload();
    const { data: quals } = await supabase.from('qc_analyst_qualifications').select('*');
    const { data: tests } = await supabase.from('qc_tests').select('*').neq('status', 'completed');
    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514', max_tokens: 1500,
        messages: [{ role: 'user', content: WORKLOAD_PROMPT(workload.analysts, tests || [], quals || []) }],
      });
      return { ok: true, result: parseClaudeJson(message.content[0].text) };
    } catch (e) {
      console.error('[QC-LAB] AI workload error:', e.message);
      return { ok: false, error: e.message };
    }
  }

  async function aiPriority() {
    const { data: samples } = await supabase.from('qc_samples').select('*').neq('status', 'completed').neq('status', 'cancelled');
    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514', max_tokens: 2000,
        messages: [{ role: 'user', content: PRIORITY_PROMPT(samples || []) }],
      });
      const result = parseClaudeJson(message.content[0].text);
      // Update priority scores
      for (const p of (result.priorities || [])) {
        if (p.sample_id) {
          await supabase.from('qc_samples').update({ ai_priority_score: p.score, updated_at: new Date().toISOString() }).eq('sample_id', p.sample_id);
        }
      }
      return { ok: true, result };
    } catch (e) {
      console.error('[QC-LAB] AI priority error:', e.message);
      return { ok: false, error: e.message };
    }
  }

  async function aiOosRootcause({ resultId }) {
    const result = await getResult(resultId);
    const test = await getTest(result.test_id);
    // Fetch historical OOS for similar tests
    const { data: historicalOos } = await supabase.from('qc_results').select('*').eq('oos_flag', true).neq('result_id', resultId).limit(20);
    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514', max_tokens: 1500,
        messages: [{ role: 'user', content: OOS_ROOTCAUSE_PROMPT(result, test, historicalOos || []) }],
      });
      return { ok: true, resultId, result: parseClaudeJson(message.content[0].text) };
    } catch (e) {
      console.error('[QC-LAB] AI OOS rootcause error:', e.message);
      return { ok: false, error: e.message };
    }
  }

  // ── Return public API ────────────────────────────────────────────────

  return {
    // Samples
    createSample, listSamples, getSample, updateSample, completeSample,
    // Tests
    createTest, listTests, getTest, updateTest, startTest, completeTest,
    // Results
    createResult, listResults, getResult, updateResult, reviewResult, approveResult,
    // OOS Investigation
    initiateOos, updateOos, escalateOos, closeOos,
    // Instruments
    createInstrument, listInstruments, getInstrument, updateInstrument,
    // Analyst Qualifications
    createQualification, listQualifications, getQualification, updateQualification, checkQualification,
    // Test Methods
    createMethod, listMethods, getMethod, updateMethod,
    // Test Templates
    createTemplate, listTemplates, getTemplate, updateTemplate, getTemplatesForSampleType,
    // COA
    generateCoa,
    // Stats & Workload
    getStats, getWorkload,
    // AI
    aiTurnaround, aiAnomaly, aiWorkload, aiPriority, aiOosRootcause,
  };
}

module.exports = { makeQcLabService };
