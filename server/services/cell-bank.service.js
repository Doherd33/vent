'use strict';

const ids = require('../lib/ids');
const parseClaudeJson = require('../lib/parse-claude-json');

// ── Testing Matrix (ICH Q5A/Q5B/Q5D) ────────────────────────────────────────
const TESTING_MATRIX = {
  mcb: [
    { test_type: 'sterility', required: true },
    { test_type: 'mycoplasma', required: true },
    { test_type: 'identity', required: true },
    { test_type: 'karyology', required: true },
    { test_type: 'adventitious_virus_in_vitro', required: true },
    { test_type: 'adventitious_virus_in_vivo', required: true },
    { test_type: 'retrovirus_em', required: true },
    { test_type: 'retrovirus_infectivity', required: true },
    { test_type: 'reverse_transcriptase', required: true },
    { test_type: 'genetic_stability', required: true },
  ],
  wcb: [
    { test_type: 'sterility', required: true },
    { test_type: 'mycoplasma', required: true },
    { test_type: 'identity', required: true },
    { test_type: 'karyology', required: false },
    { test_type: 'adventitious_virus_in_vitro', required: true },
    { test_type: 'reverse_transcriptase', required: false },
    { test_type: 'genetic_stability', required: false },
  ],
  epc: [
    { test_type: 'sterility', required: true },
    { test_type: 'mycoplasma', required: true },
    { test_type: 'identity', required: false },
    { test_type: 'karyology', required: true },
    { test_type: 'adventitious_virus_in_vitro', required: true },
    { test_type: 'retrovirus_em', required: true },
    { test_type: 'retrovirus_infectivity', required: true },
    { test_type: 'reverse_transcriptase', required: true },
    { test_type: 'genetic_stability', required: true },
  ],
};

// ── Vial status transitions ──────────────────────────────────────────────────
const VIAL_TRANSITIONS = {
  available:  ['reserved', 'withdrawn', 'quarantine', 'destroyed'],
  reserved:   ['withdrawn', 'available'],
  withdrawn:  ['used', 'available'],
  used:       [],
  destroyed:  [],
  quarantine: ['available', 'destroyed'],
};

// ── AI Prompts ───────────────────────────────────────────────────────────────

const DEPLETION_PROMPT = (bank, transactions) => `You are a biologics manufacturing inventory analyst specialising in cell bank management.

CELL BANK:
- Bank ID: ${bank.bank_id}
- Name: ${bank.name}
- Type: ${bank.bank_type.toUpperCase()}
- Cell Line: ${bank.cell_line}
- Total Vials at Banking: ${bank.total_vials}
- Currently Available: ${bank.available_vials}
- Reserved: ${bank.reserved_vials}
- Withdrawn: ${bank.withdrawn_vials}
- Destroyed: ${bank.destroyed_vials}
- Quarantine: ${bank.quarantine_vials}
- Date Banked: ${bank.date_banked || 'Unknown'}
- Expiry Date: ${bank.expiry_date || 'Not set'}

WITHDRAWAL HISTORY (last 24 months):
${transactions.length > 0 ? transactions.map(t => `${t.performed_date || t.created_at}: ${t.quantity} vial(s) for ${t.purpose} (batch: ${t.batch_number || 'N/A'})`).join('\n') : 'No withdrawals recorded.'}

Analyse the withdrawal rate and predict when this cell bank will be depleted. Calculate:
1. Rolling average withdrawal rate (3-month and 6-month windows)
2. Projected depletion date at current rate
3. Safety stock threshold (max of 10% original count or 10 vials)
4. Recommended rebanking trigger date (depletion date minus 6-month qualification lead time)
5. Confidence range (optimistic and pessimistic scenarios)

Return ONLY valid JSON (no markdown fences):
{
  "monthlyRate3m": 0,
  "monthlyRate6m": 0,
  "projectedDepletionDate": "YYYY-MM-DD",
  "safetyStock": 0,
  "rebankTriggerDate": "YYYY-MM-DD",
  "confidenceRange": { "optimistic": "YYYY-MM-DD", "pessimistic": "YYYY-MM-DD" },
  "summary": "Human-readable summary of the analysis",
  "urgency": "normal|warning|urgent|critical"
}`;

const REBANK_PROMPT = (bank, depletionData, transactions) => `You are a biologics manufacturing planning specialist for cell bank rebanking.

CELL BANK:
- Bank ID: ${bank.bank_id}
- Name: ${bank.name}
- Type: ${bank.bank_type.toUpperCase()}
- Cell Line: ${bank.cell_line}
- Passage Number: ${bank.passage_number}
- Max Passage Limit: ${bank.max_passage_limit}
- Available Vials: ${bank.available_vials}
- Total Vials: ${bank.total_vials}
- Date Banked: ${bank.date_banked || 'Unknown'}
- Expiry Date: ${bank.expiry_date || 'Not set'}

DEPLETION DATA: ${JSON.stringify(depletionData || {})}

RECENT TRANSACTIONS: ${transactions.length} withdrawals recorded.

Recommend a rebanking timeline considering:
- MCB-to-WCB expansion: 4-8 weeks
- Banking event: 1 week
- Qualification testing: 3-6 months
- QA review: 2-4 weeks
- Total lead time: 4-8 months

Return ONLY valid JSON (no markdown fences):
{
  "recommendedStartDate": "YYYY-MM-DD",
  "estimatedCompletionDate": "YYYY-MM-DD",
  "urgency": "normal|planning|warning|urgent",
  "milestones": [
    { "phase": "Phase name", "startDate": "YYYY-MM-DD", "duration": "X weeks", "description": "..." }
  ],
  "summary": "Human-readable rebanking recommendation",
  "risks": ["Risk 1", "Risk 2"]
}`;

const EXPIRY_PROMPT = (banks) => `You are a biologics manufacturing quality specialist managing cell bank expiry.

CELL BANKS:
${banks.map(b => `- ${b.bank_id} (${b.name}): Type=${b.bank_type}, Available=${b.available_vials}/${b.total_vials}, Expiry=${b.expiry_date || 'Not set'}, Status=${b.status}, Qualification=${b.qualification_status}`).join('\n')}

Today's date: ${new Date().toISOString().split('T')[0]}

Scan all banks for expiry concerns. Categorise by urgency:
- expired: past expiry date
- critical: < 3 months to expiry
- warning: < 6 months to expiry
- planning: < 12 months to expiry

For each flagged bank, recommend actions (extend with stability data, accelerate usage, re-qualify, or destroy).

Return ONLY valid JSON (no markdown fences):
{
  "alerts": [
    {
      "bankId": "CB-XXXX",
      "name": "...",
      "expiryDate": "YYYY-MM-DD",
      "urgency": "expired|critical|warning|planning",
      "daysRemaining": 0,
      "availableVials": 0,
      "recommendedAction": "...",
      "reasoning": "..."
    }
  ],
  "summary": "Overall expiry status summary"
}`;

const USAGE_OPTIMIZATION_PROMPT = (banks, transactions) => `You are a biologics manufacturing efficiency analyst.

CELL BANKS:
${banks.map(b => `- ${b.bank_id} (${b.name}): Type=${b.bank_type}, Available=${b.available_vials}/${b.total_vials}, Line=${b.cell_line}, Product=${b.product}`).join('\n')}

RECENT TRANSACTIONS:
${transactions.map(t => `- ${t.transaction_id}: Bank=${t.bank_id}, Type=${t.transaction_type}, Qty=${t.quantity}, Purpose=${t.purpose}, Date=${t.performed_date || t.created_at}, PostThawViability=${t.post_thaw_viability || 'N/A'}%`).join('\n')}

Analyse vial usage patterns and identify:
1. Drawing from multiple WCB lots when one is nearly depleted (should finish one first)
2. FIFO violations (using newer vials before older ones)
3. Inconsistent post-thaw viability suggesting operator technique issues
4. Suboptimal storage organisation
5. Banks with low viability trends

Return ONLY valid JSON (no markdown fences):
{
  "findings": [
    { "type": "fifo_violation|lot_switching|viability_concern|storage_issue|technique_issue", "severity": "low|medium|high", "description": "...", "recommendation": "...", "affectedBanks": ["CB-XXXX"] }
  ],
  "summary": "Overall usage optimization summary",
  "recommendations": ["Top recommendation 1", "Top recommendation 2"]
}`;

const VIABILITY_TREND_PROMPT = (bank, transactions) => `You are a biologics manufacturing quality analyst specialising in cell viability assessment.

CELL BANK:
- Bank ID: ${bank.bank_id}
- Name: ${bank.name}
- Viability at Banking: ${bank.viability_at_bank || 'Unknown'}%
- VCD at Banking: ${bank.vcd_at_bank || 'Unknown'}

POST-THAW DATA (from completed withdrawals):
${transactions.filter(t => t.post_thaw_viability != null).map(t => `- Date: ${t.performed_date || t.created_at}, Viability: ${t.post_thaw_viability}%, VCD: ${t.post_thaw_vcd || 'N/A'}, TimeOutOfStorage: ${t.time_out_of_storage_minutes || 'N/A'} min`).join('\n') || 'No post-thaw data recorded.'}

Analyse post-thaw viability trends:
1. Flag if any viability falls below 70%
2. Flag if viability drops > 10% below banking viability
3. Detect downward trends over successive withdrawals
4. Assess if storage conditions may be degrading

Return ONLY valid JSON (no markdown fences):
{
  "dataPoints": [{ "date": "YYYY-MM-DD", "viability": 0, "flag": "" }],
  "trend": "stable|declining|improving|insufficient_data",
  "alerts": [{ "type": "below_threshold|significant_drop|declining_trend", "message": "..." }],
  "bankingViability": 0,
  "averagePostThaw": 0,
  "summary": "Human-readable viability trend summary",
  "investigationRecommended": false
}`;

const COMPLIANCE_PROMPT = (banks, testingData) => `You are a GMP regulatory compliance auditor for biologics cell bank management.

Regulatory framework: ICH Q5A(R2), ICH Q5B, ICH Q5D, FDA Cell Substrate Guidance 2010, EU GMP Annex 2.

CELL BANKS:
${banks.map(b => `- ${b.bank_id} (${b.name}): Type=${b.bank_type}, Status=${b.status}, Qualification=${b.qualification_status}, SplitStorage=${b.backup_storage_location ? 'Yes' : 'NO'}, Passage=${b.passage_number}/${b.max_passage_limit}, CoA=${b.coa_reference ? 'Yes' : 'No'}, Expiry=${b.expiry_date || 'Not set'}`).join('\n')}

TESTING STATUS:
${testingData.map(t => `- ${t.bank_id}: ${t.test_type}=${t.result} (${t.status})`).join('\n') || 'No testing data.'}

Check compliance for each bank:
1. Testing completeness per bank_type and ICH requirements
2. Split storage (backup location required by ICH Q5D)
3. Qualification status (banks in active use must be qualified)
4. Passage number limits
5. CoA availability
6. Expiry management
7. Expired banks still marked active

Return ONLY valid JSON (no markdown fences):
{
  "bankResults": [
    {
      "bankId": "CB-XXXX",
      "name": "...",
      "status": "green|amber|red",
      "issues": [{ "category": "testing|storage|qualification|passage|coa|expiry", "severity": "info|warning|critical", "description": "...", "action": "..." }]
    }
  ],
  "overallStatus": "green|amber|red",
  "summary": "Overall compliance readiness summary",
  "criticalCount": 0,
  "warningCount": 0
}`;

// ── Service Factory ──────────────────────────────────────────────────────────

function makeCellBankService({ supabase, auditLog, anthropic }) {

  // ── Helpers ────────────────────────────────────────────────────────────────

  function err(msg, code) {
    return Object.assign(new Error(msg), { statusCode: code });
  }

  async function getBank(bankId) {
    const { data, error } = await supabase
      .from('cell_banks').select('*').eq('bank_id', bankId).single();
    if (error || !data) throw err('Cell bank not found', 404);
    return data;
  }

  function getRequiredTests(bankType) {
    const matrix = TESTING_MATRIX[bankType] || TESTING_MATRIX.wcb;
    return matrix.filter(t => t.required).map(t => t.test_type);
  }

  // ── Cell Banks CRUD ────────────────────────────────────────────────────────

  async function createBank({ name, bankType, cellLine, cloneId, product, passageNumber, maxPassageLimit,
    parentBankId, dateBanked, expiryDate, storageTemp, storageLocation, backupStorageLocation,
    freezerId, totalVials, viabilityAtBank, vcdAtBank, volumePerVial, cellCountPerVial,
    bankingSopReference, freezingProtocol, stabilityProtocol, coaReference, notes,
    userId, userRole, req }) {

    if (!name) throw err('name is required', 400);
    if (!bankType || !['mcb', 'wcb', 'epc'].includes(bankType)) throw err('bankType must be mcb, wcb, or epc', 400);

    if (bankType === 'wcb' && !parentBankId) {
      throw err('parent_bank_id is required for WCB banks', 400);
    }

    if (parentBankId) {
      const parent = await getBank(parentBankId);
      if (parent.status === 'retired') throw err('Parent bank is retired', 400);
    }

    const bankId = ids.cellBankId();
    const vialCount = totalVials || 0;

    const row = {
      bank_id: bankId,
      name,
      bank_type: bankType,
      cell_line: cellLine || '',
      clone_id: cloneId || '',
      product: product || '',
      status: 'active',
      passage_number: passageNumber || 0,
      max_passage_limit: maxPassageLimit || 60,
      parent_bank_id: parentBankId || '',
      total_vials: vialCount,
      available_vials: vialCount,
      withdrawn_vials: 0,
      destroyed_vials: 0,
      reserved_vials: 0,
      quarantine_vials: 0,
      storage_temp: storageTemp || '-196C_LN2',
      storage_location: storageLocation || '',
      backup_storage_location: backupStorageLocation || '',
      freezer_id: freezerId || '',
      date_banked: dateBanked || null,
      expiry_date: expiryDate || null,
      viability_at_bank: viabilityAtBank || null,
      vcd_at_bank: vcdAtBank || null,
      coa_reference: coaReference || '',
      banking_sop_reference: bankingSopReference || '',
      freezing_protocol: freezingProtocol || '',
      stability_protocol: stabilityProtocol || '',
      notes: notes || '',
      created_by: userId || 'system',
    };

    const { error: insertErr } = await supabase.from('cell_banks').insert(row);
    if (insertErr) throw insertErr;

    // Auto-generate vials
    if (vialCount > 0) {
      const vials = [];
      for (let i = 1; i <= vialCount; i++) {
        vials.push({
          vial_id: ids.cellBankVialId(),
          bank_id: bankId,
          vial_number: i,
          status: 'available',
          freezer_id: freezerId || '',
          volume_ml: volumePerVial || 1.0,
          cell_count: cellCountPerVial || null,
          viability: viabilityAtBank || null,
          passage_number: passageNumber || 0,
          freeze_date: dateBanked || null,
          created_by: userId || 'system',
        });
      }
      const { error: vialErr } = await supabase.from('cell_bank_vials').insert(vials);
      if (vialErr) throw vialErr;
    }

    // Auto-generate test records per testing matrix
    const matrix = TESTING_MATRIX[bankType] || TESTING_MATRIX.wcb;
    const testRows = matrix.map(t => ({
      test_id: ids.cellBankTestId(),
      bank_id: bankId,
      test_type: t.test_type,
      result: 'pending',
      status: 'scheduled',
      created_by: userId || 'system',
    }));
    if (testRows.length > 0) {
      const { error: testErr } = await supabase.from('cell_bank_testing').insert(testRows);
      if (testErr) throw testErr;
    }

    const warnings = [];
    if (!backupStorageLocation) warnings.push('ICH Q5D requires split storage across 2+ locations. No backup storage location specified.');

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'cell_bank_created',
      entityType: 'cell_bank',
      entityId: bankId,
      after: { name, bankType, cellLine, totalVials: vialCount, testsGenerated: testRows.length },
      reason: `Cell bank created: ${name} (${bankType.toUpperCase()})`,
      req,
    });

    return { ok: true, bankId, vialsCreated: vialCount, testsGenerated: testRows.length, warnings };
  }

  async function listBanks({ bankType, status, cellLine, product, qualificationStatus, expiryFrom, expiryTo } = {}) {
    let query = supabase.from('cell_banks').select('*').order('created_at', { ascending: false });
    if (bankType) query = query.eq('bank_type', bankType);
    if (status) query = query.eq('status', status);
    if (cellLine) query = query.eq('cell_line', cellLine);
    if (product) query = query.eq('product', product);
    if (qualificationStatus) query = query.eq('qualification_status', qualificationStatus);
    if (expiryFrom) query = query.gte('expiry_date', expiryFrom);
    if (expiryTo) query = query.lte('expiry_date', expiryTo);

    const { data, error } = await query;
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  }

  async function getBankDetail(bankId) {
    const bank = await getBank(bankId);
    const [vialsRes, txnRes, testRes] = await Promise.all([
      supabase.from('cell_bank_vials').select('*').eq('bank_id', bankId).order('vial_number', { ascending: true }),
      supabase.from('cell_bank_transactions').select('*').eq('bank_id', bankId).order('created_at', { ascending: false }),
      supabase.from('cell_bank_testing').select('*').eq('bank_id', bankId).order('test_type', { ascending: true }),
    ]);
    return {
      ...bank,
      vials: vialsRes.data || [],
      transactions: txnRes.data || [],
      tests: testRes.data || [],
    };
  }

  async function updateBank({ bankId, updates, userId, userRole, req }) {
    const current = await getBank(bankId);
    updates.updated_at = new Date().toISOString();
    const { error } = await supabase.from('cell_banks').update(updates).eq('bank_id', bankId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'cell_bank_updated',
      entityType: 'cell_bank',
      entityId: bankId,
      before: current,
      after: updates,
      reason: `Cell bank ${bankId} updated`,
      req,
    });
    return { ok: true, bankId };
  }

  async function retireBank({ bankId, userId, userRole, req }) {
    const bank = await getBank(bankId);
    if (bank.status === 'retired') throw err('Bank is already retired', 400);

    const { error } = await supabase.from('cell_banks').update({
      status: 'retired',
      updated_at: new Date().toISOString(),
    }).eq('bank_id', bankId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'cell_bank_retired',
      entityType: 'cell_bank',
      entityId: bankId,
      before: { status: bank.status },
      after: { status: 'retired' },
      reason: `Cell bank ${bankId} retired`,
      req,
    });
    return { ok: true, bankId, status: 'retired' };
  }

  async function getLineage(bankId) {
    const bank = await getBank(bankId);
    const lineage = { current: bank, parent: null, siblings: [], children: [] };

    if (bank.parent_bank_id) {
      try {
        lineage.parent = await getBank(bank.parent_bank_id);
        // Get siblings (other WCBs from same parent)
        const { data: siblings } = await supabase.from('cell_banks').select('*')
          .eq('parent_bank_id', bank.parent_bank_id).neq('bank_id', bankId);
        lineage.siblings = siblings || [];
      } catch (_e) { /* parent may not exist */ }
    }

    // Get children (WCBs derived from this bank)
    const { data: children } = await supabase.from('cell_banks').select('*')
      .eq('parent_bank_id', bankId);
    lineage.children = children || [];

    return lineage;
  }

  async function qualifyBank({ bankId, userId, userRole, eSig, req }) {
    const bank = await getBank(bankId);

    // Check all required tests pass
    const { data: tests } = await supabase.from('cell_bank_testing').select('*').eq('bank_id', bankId);
    const requiredTypes = getRequiredTests(bank.bank_type);
    const failedOrPending = (tests || []).filter(t =>
      requiredTypes.includes(t.test_type) && t.result !== 'pass'
    );
    if (failedOrPending.length > 0) {
      throw err(`Cannot qualify: ${failedOrPending.length} required test(s) not passed: ${failedOrPending.map(t => t.test_type).join(', ')}`, 400);
    }

    const updates = {
      qualification_status: 'qualified',
      qualification_approved_by: userId,
      qualification_approved_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('cell_banks').update(updates).eq('bank_id', bankId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'cell_bank_qualified',
      entityType: 'cell_bank',
      entityId: bankId,
      before: { qualification_status: bank.qualification_status },
      after: { ...updates, e_signature: eSig || {} },
      reason: `Cell bank ${bankId} qualified by ${userId}`,
      req,
    });
    return { ok: true, bankId, qualification_status: 'qualified' };
  }

  // ── Vial inventory ─────────────────────────────────────────────────────────

  async function getInventory(bankId) {
    await getBank(bankId);
    const { data, error } = await supabase.from('cell_bank_vials').select('*')
      .eq('bank_id', bankId).order('vial_number', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function registerVials({ bankId, count, freezerId, rack, box, startPosition, volumeMl, cellCount, viability, passageNumber, freezeDate, userId, userRole, req }) {
    const bank = await getBank(bankId);
    const lastVialNum = bank.total_vials || 0;
    const vials = [];
    for (let i = 1; i <= count; i++) {
      vials.push({
        vial_id: ids.cellBankVialId(),
        bank_id: bankId,
        vial_number: lastVialNum + i,
        status: 'available',
        freezer_id: freezerId || '',
        rack: rack || '',
        box: box || '',
        position: startPosition ? String(parseInt(startPosition) + i - 1) : '',
        volume_ml: volumeMl || 1.0,
        cell_count: cellCount || null,
        viability: viability || null,
        passage_number: passageNumber || bank.passage_number || 0,
        freeze_date: freezeDate || null,
        created_by: userId || 'system',
      });
    }
    const { error: vialErr } = await supabase.from('cell_bank_vials').insert(vials);
    if (vialErr) throw vialErr;

    // Update bank counts
    const { error: upErr } = await supabase.from('cell_banks').update({
      total_vials: bank.total_vials + count,
      available_vials: bank.available_vials + count,
      updated_at: new Date().toISOString(),
    }).eq('bank_id', bankId);
    if (upErr) throw upErr;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'vials_registered',
      entityType: 'cell_bank',
      entityId: bankId,
      after: { count, vialIds: vials.map(v => v.vial_id) },
      reason: `${count} vials registered to ${bankId}`,
      req,
    });
    return { ok: true, bankId, vialsCreated: count };
  }

  async function updateVial({ bankId, vialId, updates, userId, userRole, req }) {
    const { data: vial, error: vErr } = await supabase.from('cell_bank_vials').select('*')
      .eq('vial_id', vialId).eq('bank_id', bankId).single();
    if (vErr || !vial) throw err('Vial not found', 404);

    updates.updated_at = new Date().toISOString();
    const { error } = await supabase.from('cell_bank_vials').update(updates).eq('vial_id', vialId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'vial_updated',
      entityType: 'cell_bank_vial',
      entityId: vialId,
      before: vial,
      after: updates,
      reason: `Vial ${vialId} updated`,
      req,
    });
    return { ok: true, vialId };
  }

  async function destroyVial({ bankId, vialId, reason, userId, userRole, req }) {
    const bank = await getBank(bankId);
    const { data: vial, error: vErr } = await supabase.from('cell_bank_vials').select('*')
      .eq('vial_id', vialId).eq('bank_id', bankId).single();
    if (vErr || !vial) throw err('Vial not found', 404);
    if (vial.status === 'destroyed' || vial.status === 'used') throw err(`Vial is already ${vial.status}`, 400);

    const prevStatus = vial.status;
    const { error } = await supabase.from('cell_bank_vials').update({
      status: 'destroyed',
      destroyed_date: new Date().toISOString().split('T')[0],
      destroyed_by: userId || 'system',
      destruction_reason: reason || '',
      updated_at: new Date().toISOString(),
    }).eq('vial_id', vialId);
    if (error) throw error;

    // Update bank counts
    const countUpdates = {
      destroyed_vials: bank.destroyed_vials + 1,
      updated_at: new Date().toISOString(),
    };
    if (prevStatus === 'available') countUpdates.available_vials = bank.available_vials - 1;
    else if (prevStatus === 'reserved') countUpdates.reserved_vials = bank.reserved_vials - 1;
    else if (prevStatus === 'quarantine') countUpdates.quarantine_vials = bank.quarantine_vials - 1;

    await supabase.from('cell_banks').update(countUpdates).eq('bank_id', bankId);

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'vial_destroyed',
      entityType: 'cell_bank_vial',
      entityId: vialId,
      before: { status: prevStatus },
      after: { status: 'destroyed', reason },
      reason: `Vial ${vialId} destroyed: ${reason || 'no reason given'}`,
      req,
    });
    return { ok: true, vialId, status: 'destroyed' };
  }

  async function reserveVial({ bankId, vialId, reservedFor, userId, userRole, req }) {
    const bank = await getBank(bankId);
    const { data: vial, error: vErr } = await supabase.from('cell_bank_vials').select('*')
      .eq('vial_id', vialId).eq('bank_id', bankId).single();
    if (vErr || !vial) throw err('Vial not found', 404);
    if (vial.status !== 'available') throw err(`Cannot reserve vial in status: ${vial.status}`, 400);

    const { error } = await supabase.from('cell_bank_vials').update({
      status: 'reserved',
      reserved_for: reservedFor || '',
      reserved_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('vial_id', vialId);
    if (error) throw error;

    await supabase.from('cell_banks').update({
      available_vials: bank.available_vials - 1,
      reserved_vials: bank.reserved_vials + 1,
      updated_at: new Date().toISOString(),
    }).eq('bank_id', bankId);

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'vial_reserved',
      entityType: 'cell_bank_vial',
      entityId: vialId,
      after: { status: 'reserved', reservedFor },
      reason: `Vial ${vialId} reserved for ${reservedFor}`,
      req,
    });
    return { ok: true, vialId, status: 'reserved' };
  }

  async function quarantineVial({ bankId, vialId, reason, deviationId, userId, userRole, req }) {
    const bank = await getBank(bankId);
    const { data: vial, error: vErr } = await supabase.from('cell_bank_vials').select('*')
      .eq('vial_id', vialId).eq('bank_id', bankId).single();
    if (vErr || !vial) throw err('Vial not found', 404);
    if (vial.status !== 'available') throw err(`Cannot quarantine vial in status: ${vial.status}`, 400);

    const { error } = await supabase.from('cell_bank_vials').update({
      status: 'quarantine',
      quarantine_reason: reason || '',
      quarantine_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('vial_id', vialId);
    if (error) throw error;

    await supabase.from('cell_banks').update({
      available_vials: bank.available_vials - 1,
      quarantine_vials: bank.quarantine_vials + 1,
      updated_at: new Date().toISOString(),
    }).eq('bank_id', bankId);

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'vial_quarantined',
      entityType: 'cell_bank_vial',
      entityId: vialId,
      after: { status: 'quarantine', reason, deviationId },
      reason: `Vial ${vialId} quarantined: ${reason}`,
      req,
    });
    return { ok: true, vialId, status: 'quarantine' };
  }

  async function releaseVial({ bankId, vialId, userId, userRole, req }) {
    const bank = await getBank(bankId);
    const { data: vial, error: vErr } = await supabase.from('cell_bank_vials').select('*')
      .eq('vial_id', vialId).eq('bank_id', bankId).single();
    if (vErr || !vial) throw err('Vial not found', 404);
    if (!['reserved', 'quarantine'].includes(vial.status)) throw err(`Cannot release vial in status: ${vial.status}`, 400);

    const prevStatus = vial.status;
    const { error } = await supabase.from('cell_bank_vials').update({
      status: 'available',
      reserved_for: '',
      reserved_date: null,
      quarantine_reason: '',
      quarantine_date: null,
      updated_at: new Date().toISOString(),
    }).eq('vial_id', vialId);
    if (error) throw error;

    const countUpdates = {
      available_vials: bank.available_vials + 1,
      updated_at: new Date().toISOString(),
    };
    if (prevStatus === 'reserved') countUpdates.reserved_vials = bank.reserved_vials - 1;
    if (prevStatus === 'quarantine') countUpdates.quarantine_vials = bank.quarantine_vials - 1;
    await supabase.from('cell_banks').update(countUpdates).eq('bank_id', bankId);

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'vial_released',
      entityType: 'cell_bank_vial',
      entityId: vialId,
      before: { status: prevStatus },
      after: { status: 'available' },
      reason: `Vial ${vialId} released from ${prevStatus}`,
      req,
    });
    return { ok: true, vialId, status: 'available' };
  }

  // ── Testing ────────────────────────────────────────────────────────────────

  async function listTests(bankId) {
    await getBank(bankId);
    const { data, error } = await supabase.from('cell_bank_testing').select('*')
      .eq('bank_id', bankId).order('test_type', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function updateTest({ bankId, testId, result, testDate, testMethod, reportReference, performedBy, reviewedBy, status, notes, userId, userRole, req }) {
    const bank = await getBank(bankId);
    const { data: test, error: tErr } = await supabase.from('cell_bank_testing').select('*')
      .eq('test_id', testId).eq('bank_id', bankId).single();
    if (tErr || !test) throw err('Test record not found', 404);

    const updates = { updated_at: new Date().toISOString() };
    if (result !== undefined) updates.result = result;
    if (testDate !== undefined) updates.test_date = testDate;
    if (testMethod !== undefined) updates.test_method = testMethod;
    if (reportReference !== undefined) updates.report_reference = reportReference;
    if (performedBy !== undefined) updates.performed_by = performedBy;
    if (reviewedBy !== undefined) {
      updates.reviewed_by = reviewedBy;
      updates.reviewed_date = new Date().toISOString();
    }
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    const { error } = await supabase.from('cell_bank_testing').update(updates).eq('test_id', testId);
    if (error) throw error;

    // Update summary status on cell_banks
    if (result !== undefined) {
      const statusField = test.test_type.replace(/_/g, '_') + '_status';
      const bankUpdate = { updated_at: new Date().toISOString() };
      // Map test_type to the bank summary fields
      const fieldMap = {
        sterility: 'sterility_status',
        mycoplasma: 'mycoplasma_status',
        identity: 'identity_status',
        adventitious_virus_in_vitro: 'adventitious_status',
        adventitious_virus_in_vivo: 'adventitious_status',
        karyology: 'karyology_status',
        retrovirus_em: 'retrovirus_status',
        retrovirus_infectivity: 'retrovirus_status',
        reverse_transcriptase: 'retrovirus_status',
        genetic_stability: 'genetic_stability_status',
      };
      if (fieldMap[test.test_type]) {
        bankUpdate[fieldMap[test.test_type]] = result;
      }
      await supabase.from('cell_banks').update(bankUpdate).eq('bank_id', bankId);
    }

    // Check if all required tests pass -> auto-update qualification_status
    const { data: allTests } = await supabase.from('cell_bank_testing').select('*').eq('bank_id', bankId);
    const requiredTypes = getRequiredTests(bank.bank_type);
    const allRequiredPass = requiredTypes.every(rt =>
      (allTests || []).some(t => t.test_type === rt && t.result === 'pass')
    );
    if (allRequiredPass && bank.qualification_status === 'pending') {
      await supabase.from('cell_banks').update({
        qualification_status: 'ready_for_review',
        updated_at: new Date().toISOString(),
      }).eq('bank_id', bankId);
    }

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'cell_bank_test_updated',
      entityType: 'cell_bank_testing',
      entityId: testId,
      before: test,
      after: updates,
      reason: `Test ${testId} (${test.test_type}) updated: result=${result || test.result}`,
      req,
    });
    return { ok: true, testId, allRequiredPass };
  }

  async function addTest({ bankId, testType, testMethod, testDate, notes, userId, userRole, req }) {
    await getBank(bankId);
    const testId = ids.cellBankTestId();
    const row = {
      test_id: testId,
      bank_id: bankId,
      test_type: testType,
      test_method: testMethod || '',
      test_date: testDate || null,
      result: 'pending',
      status: 'scheduled',
      notes: notes || '',
      created_by: userId || 'system',
    };
    const { error } = await supabase.from('cell_bank_testing').insert(row);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'cell_bank_test_added',
      entityType: 'cell_bank_testing',
      entityId: testId,
      after: row,
      reason: `Test ${testId} (${testType}) added to ${bankId}`,
      req,
    });
    return { ok: true, testId };
  }

  // ── Transactions ───────────────────────────────────────────────────────────

  async function withdrawVials({ bankId, quantity, purpose, batchNumber, vialIds, fifoOverrideJustification, witness, notes, userId, userRole, req }) {
    const bank = await getBank(bankId);

    // Qualification gating for production
    if (purpose === 'production' && bank.qualification_status !== 'qualified') {
      throw err('Bank must be qualified before production withdrawals', 400);
    }

    if (bank.available_vials < quantity) {
      throw err(`Insufficient vials: ${bank.available_vials} available, ${quantity} requested`, 400);
    }

    const txnId = ids.cellBankTransactionId();

    // FIFO auto-suggest: get oldest available vials
    const { data: availableVials } = await supabase.from('cell_bank_vials').select('*')
      .eq('bank_id', bankId).eq('status', 'available').order('freeze_date', { ascending: true }).limit(quantity);

    let selectedVials = availableVials || [];
    let fifoOverride = false;
    if (vialIds && vialIds.length > 0) {
      // Check if selection matches FIFO order
      const fifoIds = (availableVials || []).slice(0, quantity).map(v => v.vial_id);
      fifoOverride = !vialIds.every(id => fifoIds.includes(id));
      const { data: selected } = await supabase.from('cell_bank_vials').select('*')
        .in('vial_id', vialIds).eq('bank_id', bankId).eq('status', 'available');
      selectedVials = selected || [];
    } else {
      selectedVials = (availableVials || []).slice(0, quantity);
    }

    if (selectedVials.length < quantity) {
      throw err(`Could not find ${quantity} available vials`, 400);
    }

    const row = {
      transaction_id: txnId,
      bank_id: bankId,
      transaction_type: 'withdraw',
      quantity,
      purpose: purpose || '',
      batch_number: batchNumber || '',
      requested_by: userId || 'system',
      status: 'requested',
      witness: witness || '',
      from_location: bank.storage_location,
      notes: notes || '',
      chain_of_custody: [{ action: 'requested', by: userId, at: new Date().toISOString() }],
      created_by: userId || 'system',
    };
    if (fifoOverride && fifoOverrideJustification) {
      row.notes = (row.notes ? row.notes + '\n' : '') + `FIFO Override: ${fifoOverrideJustification}`;
    }

    const { error: txErr } = await supabase.from('cell_bank_transactions').insert(row);
    if (txErr) throw txErr;

    // Mark selected vials as withdrawn
    for (const vial of selectedVials) {
      await supabase.from('cell_bank_vials').update({
        status: 'withdrawn',
        updated_at: new Date().toISOString(),
      }).eq('vial_id', vial.vial_id);
    }

    // Update bank counts
    await supabase.from('cell_banks').update({
      available_vials: bank.available_vials - quantity,
      withdrawn_vials: bank.withdrawn_vials + quantity,
      updated_at: new Date().toISOString(),
    }).eq('bank_id', bankId);

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'vial_withdrawal_requested',
      entityType: 'cell_bank_transaction',
      entityId: txnId,
      after: { bankId, quantity, purpose, batchNumber, fifoOverride, vialIds: selectedVials.map(v => v.vial_id) },
      reason: `Withdrawal of ${quantity} vial(s) from ${bankId} for ${purpose}`,
      req,
    });

    return { ok: true, transactionId: txnId, vialsSelected: selectedVials.map(v => v.vial_id), fifoOverride };
  }

  async function depositVials({ bankId, quantity, purpose, sourceBank, notes, userId, userRole, req }) {
    const bank = await getBank(bankId);
    const txnId = ids.cellBankTransactionId();

    const row = {
      transaction_id: txnId,
      bank_id: bankId,
      transaction_type: 'deposit',
      quantity,
      purpose: purpose || 'rebanking',
      requested_by: userId || 'system',
      status: 'completed',
      to_location: bank.storage_location,
      notes: notes || '',
      chain_of_custody: [{ action: 'deposited', by: userId, at: new Date().toISOString() }],
      created_by: userId || 'system',
    };

    const { error: txErr } = await supabase.from('cell_bank_transactions').insert(row);
    if (txErr) throw txErr;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'vial_deposit',
      entityType: 'cell_bank_transaction',
      entityId: txnId,
      after: { bankId, quantity, purpose },
      reason: `Deposit of ${quantity} vial(s) to ${bankId}`,
      req,
    });

    return { ok: true, transactionId: txnId };
  }

  async function listTransactions(bankId) {
    await getBank(bankId);
    const { data, error } = await supabase.from('cell_bank_transactions').select('*')
      .eq('bank_id', bankId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function getTransaction(txnId) {
    const { data, error } = await supabase.from('cell_bank_transactions').select('*')
      .eq('transaction_id', txnId).single();
    if (error || !data) throw err('Transaction not found', 404);
    return data;
  }

  async function updateTransaction({ txnId, updates, userId, userRole, req }) {
    const current = await getTransaction(txnId);
    updates.updated_at = new Date().toISOString();
    const { error } = await supabase.from('cell_bank_transactions').update(updates).eq('transaction_id', txnId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'transaction_updated',
      entityType: 'cell_bank_transaction',
      entityId: txnId,
      before: current,
      after: updates,
      reason: `Transaction ${txnId} updated`,
      req,
    });
    return { ok: true, txnId };
  }

  async function approveTransaction({ txnId, eSig, userId, userRole, req }) {
    const txn = await getTransaction(txnId);
    if (txn.status !== 'requested') throw err('Transaction is not in requested status', 400);

    // Passage limit check
    const bank = await getBank(txn.bank_id);
    if (txn.purpose === 'production') {
      const estimatedPassages = bank.passage_number + 5; // typical seed train
      if (estimatedPassages > bank.max_passage_limit) {
        throw err(`Passage limit would be exceeded: current ${bank.passage_number} + ~5 seed train = ${estimatedPassages} > limit ${bank.max_passage_limit}`, 400);
      }
    }

    const custody = [...(txn.chain_of_custody || []), { action: 'approved', by: userId, at: new Date().toISOString() }];
    const { error } = await supabase.from('cell_bank_transactions').update({
      status: 'approved',
      approved_by: userId,
      approved_date: new Date().toISOString(),
      e_signature: eSig || {},
      chain_of_custody: custody,
      updated_at: new Date().toISOString(),
    }).eq('transaction_id', txnId);
    if (error) throw error;

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'transaction_approved',
      entityType: 'cell_bank_transaction',
      entityId: txnId,
      after: { status: 'approved', e_signature: eSig || {} },
      reason: `Transaction ${txnId} approved by ${userId}`,
      req,
    });
    return { ok: true, txnId, status: 'approved' };
  }

  async function completeTransaction({ txnId, postThawViability, postThawVcd, timeOutOfStorageMinutes, witness, temperatureLog, chainOfCustody, eSig, notes, userId, userRole, req }) {
    const txn = await getTransaction(txnId);
    if (!['approved', 'requested'].includes(txn.status)) throw err('Transaction must be approved or requested to complete', 400);

    const bank = await getBank(txn.bank_id);
    const warnings = [];

    // Post-thaw viability alerts
    if (postThawViability != null) {
      if (postThawViability < 70) {
        warnings.push(`Post-thaw viability ${postThawViability}% is below 70% threshold`);
      }
      if (bank.viability_at_bank && (bank.viability_at_bank - postThawViability) > 10) {
        warnings.push(`Post-thaw viability ${postThawViability}% is >10% below banking viability ${bank.viability_at_bank}%`);
      }
    }

    const custody = [...(txn.chain_of_custody || []), ...(chainOfCustody || []),
      { action: 'completed', by: userId, at: new Date().toISOString() }];

    const updates = {
      status: 'completed',
      performed_by: userId,
      performed_date: new Date().toISOString(),
      post_thaw_viability: postThawViability || null,
      post_thaw_vcd: postThawVcd || null,
      time_out_of_storage_minutes: timeOutOfStorageMinutes || null,
      witness: witness || txn.witness || '',
      temperature_log: temperatureLog || txn.temperature_log || [],
      chain_of_custody: custody,
      e_signature: eSig || txn.e_signature || {},
      notes: notes ? (txn.notes ? txn.notes + '\n' + notes : notes) : txn.notes,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('cell_bank_transactions').update(updates).eq('transaction_id', txnId);
    if (error) throw error;

    // Mark withdrawn vials as 'used'
    if (txn.transaction_type === 'withdraw') {
      await supabase.from('cell_bank_vials').update({
        status: 'used',
        thaw_date: new Date().toISOString().split('T')[0],
        thawed_by: userId || '',
        updated_at: new Date().toISOString(),
      }).eq('bank_id', txn.bank_id).eq('status', 'withdrawn');
    }

    await auditLog({
      userId: userId || 'system',
      userRole: userRole || 'system',
      action: 'transaction_completed',
      entityType: 'cell_bank_transaction',
      entityId: txnId,
      after: { ...updates, warnings },
      reason: `Transaction ${txnId} completed${warnings.length ? ' (with viability warnings)' : ''}`,
      req,
    });

    return { ok: true, txnId, status: 'completed', warnings };
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  async function getStats() {
    const { data: banks, error: bErr } = await supabase.from('cell_banks').select('*');
    if (bErr) {
      if (bErr.message.includes('does not exist')) return { totalBanks: 0 };
      throw bErr;
    }
    const all = banks || [];
    const now = new Date();

    const byType = { mcb: 0, wcb: 0, epc: 0 };
    const byStatus = {};
    let totalAvailableVials = 0;
    let expiringIn6m = 0;
    let lowInventory = 0;
    let pendingQualification = 0;
    let noSplitStorage = 0;

    all.forEach(b => {
      byType[b.bank_type] = (byType[b.bank_type] || 0) + 1;
      byStatus[b.status] = (byStatus[b.status] || 0) + 1;
      totalAvailableVials += b.available_vials || 0;
      if (b.expiry_date) {
        const daysToExpiry = (new Date(b.expiry_date) - now) / (1000 * 60 * 60 * 24);
        if (daysToExpiry <= 180 && daysToExpiry > 0) expiringIn6m++;
      }
      if (b.available_vials < 10 && b.status === 'active') lowInventory++;
      if (b.qualification_status !== 'qualified' && b.status === 'active') pendingQualification++;
      if (!b.backup_storage_location) noSplitStorage++;
    });

    // This month's withdrawals
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { data: txns } = await supabase.from('cell_bank_transactions').select('*')
      .eq('transaction_type', 'withdraw').gte('created_at', startOfMonth);

    // Incomplete testing
    const { data: tests } = await supabase.from('cell_bank_testing').select('bank_id, result')
      .in('result', ['pending', 'in_progress']);
    const banksWithIncompleteTests = new Set((tests || []).map(t => t.bank_id)).size;

    return {
      totalBanks: all.length,
      byType,
      byStatus,
      totalAvailableVials,
      withdrawalsThisMonth: (txns || []).length,
      expiringIn6Months: expiringIn6m,
      lowInventory,
      pendingQualification,
      noSplitStorage,
      incompleteTesting: banksWithIncompleteTests,
      splitStorageCompliance: all.length > 0 ? Math.round(((all.length - noSplitStorage) / all.length) * 100) : 100,
    };
  }

  // ── AI Features ────────────────────────────────────────────────────────────

  async function aiDepletion(bankId) {
    const bank = await getBank(bankId);
    const { data: txns } = await supabase.from('cell_bank_transactions').select('*')
      .eq('bank_id', bankId).eq('transaction_type', 'withdraw').order('created_at', { ascending: true });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: DEPLETION_PROMPT(bank, txns || []) }],
    });
    const result = parseClaudeJson(message.content[0].text);

    await supabase.from('cell_banks').update({
      ai_depletion_est: JSON.stringify(result),
      updated_at: new Date().toISOString(),
    }).eq('bank_id', bankId);

    return { ok: true, bankId, depletion: result };
  }

  async function aiRebank(bankId) {
    const bank = await getBank(bankId);
    const { data: txns } = await supabase.from('cell_bank_transactions').select('*')
      .eq('bank_id', bankId).eq('transaction_type', 'withdraw').order('created_at', { ascending: true });

    let depletionData = {};
    try { depletionData = JSON.parse(bank.ai_depletion_est || '{}'); } catch (_e) { /* ignore */ }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: REBANK_PROMPT(bank, depletionData, txns || []) }],
    });
    const result = parseClaudeJson(message.content[0].text);

    await supabase.from('cell_banks').update({
      ai_rebank_rec: JSON.stringify(result),
      updated_at: new Date().toISOString(),
    }).eq('bank_id', bankId);

    return { ok: true, bankId, rebank: result };
  }

  async function aiExpiryAlerts() {
    const { data: banks } = await supabase.from('cell_banks').select('*').neq('status', 'retired');
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: EXPIRY_PROMPT(banks || []) }],
    });
    return { ok: true, ...parseClaudeJson(message.content[0].text) };
  }

  async function aiUsageOptimization() {
    const { data: banks } = await supabase.from('cell_banks').select('*').eq('status', 'active');
    const { data: txns } = await supabase.from('cell_bank_transactions').select('*')
      .order('created_at', { ascending: false }).limit(200);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: USAGE_OPTIMIZATION_PROMPT(banks || [], txns || []) }],
    });
    return { ok: true, ...parseClaudeJson(message.content[0].text) };
  }

  async function aiViabilityTrend(bankId) {
    const bank = await getBank(bankId);
    const { data: txns } = await supabase.from('cell_bank_transactions').select('*')
      .eq('bank_id', bankId).eq('status', 'completed').order('performed_date', { ascending: true });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: VIABILITY_TREND_PROMPT(bank, txns || []) }],
    });
    return { ok: true, bankId, ...parseClaudeJson(message.content[0].text) };
  }

  async function aiComplianceCheck() {
    const { data: banks } = await supabase.from('cell_banks').select('*').neq('status', 'retired');
    const { data: tests } = await supabase.from('cell_bank_testing').select('*');

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: COMPLIANCE_PROMPT(banks || [], tests || []) }],
    });
    return { ok: true, ...parseClaudeJson(message.content[0].text) };
  }

  // ── Return public API ──────────────────────────────────────────────────────

  return {
    createBank, listBanks, getBankDetail, updateBank, retireBank, getLineage, qualifyBank,
    getInventory, registerVials, updateVial, destroyVial, reserveVial, quarantineVial, releaseVial,
    listTests, updateTest, addTest,
    withdrawVials, depositVials, listTransactions, getTransaction, updateTransaction,
    approveTransaction, completeTransaction,
    getStats,
    aiDepletion, aiRebank, aiExpiryAlerts, aiUsageOptimization, aiViabilityTrend, aiComplianceCheck,
  };
}

module.exports = { makeCellBankService };
