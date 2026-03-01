'use strict';

let _gdpTableReady = false;
async function ensureGdpTables(supabase) {
  if (_gdpTableReady) return;
  try {
    const { error } = await supabase.from('gdp_documents').select('id').limit(1);
    if (error && error.message.includes('does not exist')) {
      console.log('[GDP] gdp_documents table not found — run the SQL from GET /admin/setup in Supabase.');
    }
    _gdpTableReady = true;
  } catch { _gdpTableReady = true; }
}

module.exports = function(app, { supabase, anthropic, auditLog, rag, auth, gdpImage }) {
  const { requireAuth } = auth;
  const { getRelevantChunks, buildSopContext } = rag;
  const { preprocessImage, detectBlueInkRegions } = gdpImage;

// ─── VISUAL SOP QUERY (Image/Video Analysis) ─────────────────────────────────

app.post('/query/visual', requireAuth, async (req, res) => {
  const { image, mimeType, area, context } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'No image data provided' });
  }

  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const mediaType = mimeType || 'image/jpeg';
  if (!validTypes.includes(mediaType)) {
    return res.status(400).json({ error: 'Unsupported image type. Use JPEG, PNG, GIF, or WebP.' });
  }

  try {
    // Step 1: Send image to Claude Vision to identify equipment, errors, readings
    console.log(`[VISUAL-QUERY] Analysing image (${mediaType}, ${Math.round(image.length / 1024)}KB)…`);

    const visionMessage = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: image
            }
          },
          {
            type: 'text',
            text: `You are an equipment specialist in a GMP biologics manufacturing facility running upstream perfusion processes.

Analyse this image and identify:
1. What equipment, instrument, or system is shown
2. Any error codes, alarm messages, or abnormal readings visible
3. The current state or condition of what's shown
4. Any visible parameters, values, or display readings
${context ? '\nOperator context: "' + context + '"' : ''}

Return ONLY valid JSON — no markdown fences:
{
  "equipment": "name of equipment/instrument identified",
  "error": "error code or alarm message if visible, or null",
  "condition": "brief description of what's shown and its state",
  "readings": [{"parameter": "name", "value": "reading", "unit": "unit"}],
  "searchQuery": "the best SOP search query to find procedures relevant to this equipment/situation — be specific, include equipment name and error/condition"
}`
          }
        ]
      }]
    });

    const visionRaw = visionMessage.content[0].text;
    const visionClean = visionRaw.replace(/```json|```/g, '').trim();
    const vision = JSON.parse(visionClean);

    console.log(`[VISUAL-QUERY] Identified: ${vision.equipment} | Error: ${vision.error || 'none'} | Query: "${vision.searchQuery}"`);

    // Step 2: Use the vision analysis to search SOPs via RAG
    const searchText = vision.searchQuery || vision.equipment + ' ' + (vision.error || '') + ' ' + (vision.condition || '');
    const chunks = await getRelevantChunks(searchText, area || 'Upstream');
    const sopContext = buildSopContext(chunks);

    // Step 3: Send to Claude with SOP context for a complete answer
    const queryMessage = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are the SOP Knowledge Assistant for a biologics manufacturing facility. An operator has taken a photo of equipment on the manufacturing floor. The image has been analysed and the following was identified:

Equipment: ${vision.equipment}
${vision.error ? 'Error/Alarm: ' + vision.error : 'No error code visible'}
Condition: ${vision.condition}
${vision.readings && vision.readings.length ? 'Readings: ' + vision.readings.map(r => r.parameter + ': ' + r.value + ' ' + (r.unit || '')).join(', ') : ''}
${context ? 'Operator note: "' + context + '"' : ''}

Using the SOP sections below, provide the relevant procedure, troubleshooting steps, and any critical parameters. Be practical — this is for an operator on the floor who needs help right now.

RULES:
- Answer only from the SOP content provided. Do not invent steps or values.
- If the image shows an error or alarm, prioritise troubleshooting procedures.
- If the question cannot be answered from the provided SOP content, say so clearly.
- Always cite the exact SOP section numbers.

════ RELEVANT SOP SECTIONS ════
${sopContext}
═══════════════════════════════

Return ONLY valid JSON — no markdown, no preamble:
{
  "category": "procedure or specification or troubleshooting or general",
  "summary": "2–3 sentences describing what was identified and the relevant SOP guidance",
  "steps": [{ "n": 1, "action": "step instruction", "detail": "additional detail or null", "critical": false, "value": "specific value or target if relevant, else null" }],
  "params": [{ "name": "parameter name", "value": "target value", "unit": "unit string", "range": "acceptable range or null", "flag": "critical or normal" }],
  "warnings": ["warning text — only genuine safety or quality critical cautions"],
  "notes": ["general procedural note"],
  "sources": [{ "code": "doc_id", "title": "document title", "section": "section number" }]
}`
      }]
    });

    const queryRaw = queryMessage.content[0].text;
    const queryClean = queryRaw.replace(/```json|```/g, '').trim();
    const answer = JSON.parse(queryClean);

    // Return both the vision analysis and the SOP answer
    res.json({
      vision,
      answer
    });

    console.log(`[VISUAL-QUERY] Complete — ${answer.steps?.length || 0} steps, ${answer.sources?.length || 0} sources`);

  } catch (error) {
    console.error('Visual query error:', error);
    res.status(500).json({ error: 'Visual query failed: ' + error.message });
  }
});

// ─── GDP CHECK ────────────────────────────────────────────────────────────────

app.post('/query/gdp', requireAuth, async (req, res) => {
  const { images } = req.body;

  if (!images || !Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: 'No images provided' });
  }
  if (images.length > 10) {
    return res.status(400).json({ error: 'Maximum 10 pages per check' });
  }

  try {
    const pageResults = [];

    for (let i = 0; i < images.length; i++) {
      const { image, pageNumber, filename } = images[i];
      const pNum = pageNumber || i + 1;

      console.log(`[GDP-CHECK] Page ${pNum}/${images.length} — preprocessing…`);

      // Step 0: Preprocess image for better vision results
      const preprocessedImage = await preprocessImage(image);
      console.log(`[GDP-CHECK] Page ${pNum} — preprocessed (${Math.round(image.length/1024)}KB → ${Math.round(preprocessedImage.length/1024)}KB)`);

      // Step 1: Detect blue ink regions with sharp (use ORIGINAL for color accuracy)
      const { regions } = await detectBlueInkRegions(image);

      console.log(`[GDP-CHECK] Page ${pNum} — ${regions.length} blue regions found, sending to Claude…`);

      // Step 2: Build region summary for Claude
      const regionList = regions.map((r, idx) =>
        `  Region ${idx + 1}: x=${r.x}%, y=${r.y}%, w=${r.w}%, h=${r.h}%`
      ).join('\n');

      // Step 3: Send PREPROCESSED image to Claude for GDP analysis (better contrast/sharpness)
      const gdpMessage = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: preprocessedImage }
            },
            {
              type: 'text',
              text: `You are an expert GMP Quality Assurance reviewer for pharmaceutical batch records.

This is a photo of a batch record form. The form has a PRE-PRINTED structure (field labels, table headers, grid lines, logos, document IDs) — IGNORE all pre-printed content. Your job is to find and review only the HANDWRITTEN entries that operators filled in by hand.

WHAT COUNTS AS HANDWRITTEN: signatures, initials, dates written by hand, values filled into blank fields, checkmarks, corrections, notes added by a person. Handwriting has irregular strokes, personal style, and is visually distinct from the uniform machine-printed text of the form.

WHAT TO IGNORE: all pre-printed form labels, column headers, row labels, document titles, revision numbers, SOP references, page numbers, logos, watermarks, and any other machine-printed text that is part of the form template.

I have run pixel analysis and detected ${regions.length} regions likely containing BLUE INK:
${regionList || '  (none detected)'}

These blue-ink regions are hints. Operators may also write in black ink or pencil — look for those too, but ONLY in areas where the form expects operator input (fill-in fields, signature lines, data cells).

YOUR TASK:
1. Identify each HANDWRITTEN entry on the page (in any ink color)
2. Transcribe what was written
3. Check each entry for GDP compliance
4. Note any fields that are EMPTY but should have been filled in (IE errors)

For entries matching a detected blue ink region, use those EXACT bounding box coordinates.
For handwritten entries NOT in my detected regions, estimate the bbox as % of image.

GDP ERROR CATEGORIES:
- EE (Erroneous Entry): Wrong values, incorrect dates/times, calculation errors
- LE (Late Entry): Different ink shade suggesting different time, times out of sequence, squeezed entries
- IE (Incomplete Entry): Blank fields that should have data, missing signatures/initials/dates
- CE (Correction Error): Correction fluid used, no single-line strikethrough, missing initials/date/reason on corrections
- GDP (Other): Illegible handwriting, blank spaces not lined through, pencil use

Return ONLY valid JSON:
{
  "pageNumber": ${pNum},
  "description": "brief description of what this form page documents",
  "entries": [
    {
      "id": 1,
      "text": "transcribed handwriting",
      "bbox": {"x": 0, "y": 0, "w": 0, "h": 0},
      "status": "ok|error|warning",
      "errorType": null,
      "inkColor": "blue|black|grey|other",
      "classification": "handwritten"
    }
  ],
  "errors": [
    {
      "type": "EE|LE|IE|CE|GDP",
      "severity": "critical|major|minor",
      "title": "short title",
      "location": "human-readable location (e.g. Row 3, Signature field)",
      "bbox": {"x": 0, "y": 0, "w": 0, "h": 0},
      "description": "what was observed",
      "correction": "correct GDP procedure",
      "entryId": 1
    }
  ]
}

CRITICAL RULES:
- ONLY include handwritten content in "entries" — NEVER include pre-printed form text
- Every entry must have classification "handwritten" — if it's printed, do not include it
- Use EXACT bbox coordinates from my detected regions where they match
- Do NOT invent GDP issues — only flag genuine, visible problems
- Be conservative: if something looks acceptable, mark it status "ok"
- For IE errors (empty fields), estimate the bbox of the blank field`
            }
          ]
        }]
      });

      let pageResult;
      try {
        const raw = gdpMessage.content[0].text.trim();
        pageResult = JSON.parse(raw);
      } catch (parseErr) {
        const jsonMatch = gdpMessage.content[0].text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          pageResult = JSON.parse(jsonMatch[0]);
        } else {
          pageResult = { pageNumber: pNum, description: 'Could not parse analysis', entries: [], errors: [] };
        }
      }
      pageResult.pageNumber = pNum;
      pageResults.push(pageResult);
    }

    // Aggregate counts
    let totalErrors = 0, criticalCount = 0, majorCount = 0, minorCount = 0;
    const allErrors = [];
    pageResults.forEach(page => {
      (page.errors || []).forEach(e => {
        totalErrors++;
        if (e.severity === 'critical') criticalCount++;
        else if (e.severity === 'major') majorCount++;
        else minorCount++;
        allErrors.push(e);
      });
    });

    // Recommendations
    const recommendations = [];
    const errorTypes = allErrors.map(e => e.type);
    if (errorTypes.filter(t => t === 'IE').length >= 2)
      recommendations.push('Multiple incomplete entries found — ensure all fields are completed at time of activity before moving to next step.');
    if (errorTypes.includes('CE'))
      recommendations.push('Correction errors detected — single line strikethrough, initial, date, and reason for every correction. Never use correction fluid.');
    if (errorTypes.includes('LE'))
      recommendations.push('Late entries identified — all entries must be contemporaneous. If unavoidable, annotate with "Late Entry", reason, date, time, and signature.');
    if (errorTypes.includes('EE'))
      recommendations.push('Erroneous entries found — double-check all values against source data before recording.');
    if (allErrors.some(e => e.description?.toLowerCase().includes('illegible')))
      recommendations.push('Illegible handwriting noted — all entries must be clearly legible.');
    if (allErrors.some(e => e.description?.toLowerCase().includes('blank')))
      recommendations.push('Unused blank spaces should be lined through with a single diagonal line.');
    if (totalErrors === 0)
      recommendations.push('Excellent GDP compliance on the reviewed pages.');

    // ── Persist to Supabase (non-fatal — results still return on failure) ──
    let savedDocId = null;
    try {
      await ensureGdpTables(supabase);
      const userId = req.user.id || req.user.email;
      const docFilename = images[0]?.filename || `GDP Check ${new Date().toISOString().slice(0, 10)}`;

      const { data: docRow, error: docErr } = await supabase
        .from('gdp_documents')
        .insert({
          user_id: userId,
          filename: docFilename,
          page_count: images.length,
          total_errors: totalErrors,
          critical_count: criticalCount,
          major_count: majorCount,
          minor_count: minorCount,
          recommendations,
          review_status: 'pending_review',
          processing_status: 'complete'
        })
        .select('id')
        .single();

      if (docErr) throw docErr;
      savedDocId = docRow.id;

      // Build findings rows — merge entries + errors per page
      const findingRows = [];
      pageResults.forEach(page => {
        (page.entries || []).forEach((entry, idx) => {
          const linkedError = (page.errors || []).find(e => e.entryId === entry.id);
          findingRows.push({
            document_id: savedDocId,
            page_number: page.pageNumber,
            region_index: idx,
            classification: entry.classification || 'handwritten',
            ink_color: entry.inkColor || 'blue',
            bbox: entry.bbox || null,
            extracted_text: entry.text || '',
            error_type: linkedError?.type || null,
            severity: linkedError?.severity || null,
            title: linkedError?.title || '',
            location: linkedError?.location || '',
            description: linkedError?.description || '',
            correction: linkedError?.correction || '',
            status: entry.status || 'ok',
            entry_id: entry.id
          });
        });
        // Standalone errors (IE errors with no matching entry)
        (page.errors || []).forEach(err => {
          const hasEntry = (page.entries || []).some(e => e.id === err.entryId);
          if (!hasEntry) {
            findingRows.push({
              document_id: savedDocId,
              page_number: page.pageNumber,
              classification: 'handwritten',
              ink_color: 'unknown',
              bbox: err.bbox || null,
              extracted_text: '',
              error_type: err.type,
              severity: err.severity,
              title: err.title || '',
              location: err.location || '',
              description: err.description || '',
              correction: err.correction || '',
              status: 'error',
              entry_id: err.entryId || null
            });
          }
        });
      });

      if (findingRows.length > 0) {
        const { error: findErr } = await supabase.from('gdp_findings').insert(findingRows);
        if (findErr) console.error('[GDP] Findings insert error:', findErr.message);
      }

      await auditLog({
        userId, userRole: req.user.role || 'user',
        action: 'gdp_check_completed', entityType: 'gdp_document', entityId: savedDocId,
        after: { totalErrors, criticalCount, majorCount, minorCount, pageCount: images.length },
        req
      });
      console.log(`[GDP] Saved document ${savedDocId} with ${findingRows.length} findings`);
    } catch (persistErr) {
      console.error('[GDP] Persistence error (non-fatal):', persistErr.message);
    }

    res.json({ documentId: savedDocId, pages: pageResults, totalErrors, criticalCount, majorCount, minorCount, recommendations });
    console.log(`[GDP-CHECK] Complete — ${totalErrors} issues (${criticalCount}C/${majorCount}M/${minorCount}m), ${pageResults.reduce((a, p) => a + (p.entries?.length || 0), 0)} entries across ${images.length} page(s)`);

  } catch (error) {
    console.error('GDP check error:', error);
    res.status(500).json({ error: 'GDP check failed: ' + error.message });
  }
});

// ─── GDP DOCUMENT IDENTIFICATION ────────────────────────────────────────────

// POST /gdp/identify-docs — Identify WX-SOP/WX-MBR doc IDs from batch record images
app.post('/gdp/identify-docs', requireAuth, async (req, res) => {
  const { images } = req.body;

  if (!images || !images.length) {
    return res.status(400).json({ error: 'No images provided' });
  }

  console.log(`[GDP-ID] Identifying document IDs for ${images.length} page(s)…`);

  try {
    const results = [];

    for (let i = 0; i < images.length; i++) {
      const { base64, mimeType, pageNumber } = images[i];
      const mediaType = ['image/jpeg','image/png','image/gif','image/webp'].includes(mimeType)
        ? mimeType : 'image/jpeg';

      console.log(`[GDP-ID] Page ${pageNumber || i + 1} — sending to Claude…`);

      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: `Look at this pharmaceutical batch record / GMP document page. Find the document identifier printed on it.

Document IDs typically follow patterns like:
- WX-SOP-001, WX-SOP-042 (Standard Operating Procedures)
- WX-MBR-001, WX-MBR-042 (Master Batch Records)
- WX-FRM-xxx (Forms)
- WX-LOG-xxx (Logbooks)
- Or similar alphanumeric reference numbers with a prefix and number

Also identify the document title and the page/section title if visible.

Return ONLY valid JSON (no markdown fences):
{
  "documentId": "WX-SOP-001 or null if not found",
  "documentTitle": "The full document title if visible",
  "pageTitle": "The section or page title if different from document title",
  "confidence": "high|medium|low"
}` }
          ]
        }]
      });

      let parsed;
      try {
        const raw = msg.content[0].text.trim();
        parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
      } catch {
        parsed = { documentId: null, documentTitle: 'Unknown', pageTitle: '', confidence: 'low' };
      }
      parsed.pageNumber = pageNumber || i + 1;
      results.push(parsed);
      console.log(`[GDP-ID] Page ${parsed.pageNumber} → ${parsed.documentId || 'unidentified'} (${parsed.confidence})`);
    }

    console.log(`[GDP-ID] Complete — identified ${results.filter(r => r.documentId).length}/${results.length} pages`);
    res.json({ pages: results });
  } catch (error) {
    console.error('GDP identify-docs error:', error?.message || error);
    if (error?.status) console.error('[GDP-ID] API status:', error.status);
    res.status(500).json({ error: 'Document identification failed: ' + (error?.message || String(error)) });
  }
});

// ─── GDP PERSISTENCE & REVIEW ────────────────────────────────────────────────

// GET /api/gdp/documents — list GDP check history for the current user
app.get('/api/gdp/documents', requireAuth, async (req, res) => {
  await ensureGdpTables(supabase);
  try {
    const { data, error } = await supabase
      .from('gdp_documents')
      .select('id, filename, page_count, total_errors, critical_count, major_count, minor_count, review_status, created_at')
      .eq('user_id', req.user.id || req.user.email)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('GDP doc list error:', err);
    res.status(500).json({ error: 'Failed to load GDP history' });
  }
});

// GET /api/gdp/documents/:id — get a single GDP check with all findings
app.get('/api/gdp/documents/:id', requireAuth, async (req, res) => {
  await ensureGdpTables(supabase);
  try {
    const { data: doc, error: docErr } = await supabase
      .from('gdp_documents')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (docErr) throw docErr;
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const { data: findings, error: findErr } = await supabase
      .from('gdp_findings')
      .select('*')
      .eq('document_id', req.params.id)
      .order('page_number', { ascending: true })
      .order('region_index', { ascending: true });
    if (findErr) throw findErr;

    // Reconstruct the pages format the frontend expects
    const pageMap = {};
    (findings || []).forEach(f => {
      if (!pageMap[f.page_number]) {
        pageMap[f.page_number] = { pageNumber: f.page_number, entries: [], errors: [] };
      }
      const page = pageMap[f.page_number];

      page.entries.push({
        id: f.entry_id,
        text: f.manually_corrected ? f.corrected_text : f.extracted_text,
        originalText: f.manually_corrected ? f.extracted_text : undefined,
        bbox: f.bbox,
        status: f.status,
        inkColor: f.ink_color,
        classification: f.classification,
        findingId: f.id,
        manuallyCorrected: f.manually_corrected
      });

      if (f.error_type) {
        page.errors.push({
          type: f.error_type,
          severity: f.severity,
          title: f.title,
          location: f.location,
          bbox: f.bbox,
          description: f.description,
          correction: f.correction,
          entryId: f.entry_id,
          findingId: f.id
        });
      }
    });

    const pages = Object.values(pageMap).sort((a, b) => a.pageNumber - b.pageNumber);

    res.json({
      ...doc,
      pages,
      totalErrors: doc.total_errors,
      criticalCount: doc.critical_count,
      majorCount: doc.major_count,
      minorCount: doc.minor_count,
      recommendations: doc.recommendations
    });
  } catch (err) {
    console.error('GDP doc detail error:', err);
    res.status(500).json({ error: 'Failed to load GDP document' });
  }
});

// PATCH /api/gdp/documents/:docId/findings/:findingId — correct a finding's text
app.patch('/api/gdp/documents/:docId/findings/:findingId', requireAuth, async (req, res) => {
  await ensureGdpTables(supabase);
  const { corrected_text } = req.body;

  if (corrected_text === undefined) {
    return res.status(400).json({ error: 'corrected_text is required' });
  }

  try {
    const { data: doc } = await supabase
      .from('gdp_documents')
      .select('id, user_id')
      .eq('id', req.params.docId)
      .single();

    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const userId = req.user.id || req.user.email;
    const userRole = req.user.role || 'user';

    // Allow owner or QA/admin roles
    if (doc.user_id !== userId && !['qa', 'admin', 'director'].includes(userRole)) {
      return res.status(403).json({ error: 'Not authorized to edit this document' });
    }

    const { data: original } = await supabase
      .from('gdp_findings')
      .select('extracted_text, corrected_text, manually_corrected')
      .eq('id', req.params.findingId)
      .eq('document_id', req.params.docId)
      .single();

    const { data, error } = await supabase
      .from('gdp_findings')
      .update({
        manually_corrected: true,
        corrected_text,
        corrected_by: userId,
        corrected_at: new Date().toISOString()
      })
      .eq('id', req.params.findingId)
      .eq('document_id', req.params.docId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Finding not found' });

    await auditLog({
      userId, userRole,
      action: 'gdp_finding_corrected', entityType: 'gdp_finding', entityId: req.params.findingId,
      before: { text: original?.extracted_text, corrected: original?.manually_corrected },
      after: { corrected_text },
      req
    });

    res.json(data);
  } catch (err) {
    console.error('GDP finding correction error:', err);
    res.status(500).json({ error: 'Failed to update finding' });
  }
});

// PATCH /api/gdp/documents/:docId/status — update review status
app.patch('/api/gdp/documents/:docId/status', requireAuth, async (req, res) => {
  await ensureGdpTables(supabase);
  const { review_status } = req.body;

  const validStatuses = ['pending_review', 'reviewed', 'approved'];
  if (!validStatuses.includes(review_status)) {
    return res.status(400).json({ error: 'Invalid status. Must be: ' + validStatuses.join(', ') });
  }

  const userId = req.user.id || req.user.email;
  const userRole = req.user.role || 'user';

  try {
    const { data: doc } = await supabase
      .from('gdp_documents')
      .select('review_status, user_id')
      .eq('id', req.params.docId)
      .single();

    if (!doc) return res.status(404).json({ error: 'Document not found' });

    if (review_status === 'approved' && !['qa', 'admin', 'director'].includes(userRole)) {
      return res.status(403).json({ error: 'Only QA, admin, or director can approve GDP checks' });
    }

    const { data, error } = await supabase
      .from('gdp_documents')
      .update({ review_status, updated_at: new Date().toISOString() })
      .eq('id', req.params.docId)
      .select()
      .single();

    if (error) throw error;

    await auditLog({
      userId, userRole,
      action: 'gdp_review_status_changed', entityType: 'gdp_document', entityId: req.params.docId,
      before: { review_status: doc.review_status },
      after: { review_status },
      req
    });

    res.json(data);
  } catch (err) {
    console.error('GDP status update error:', err);
    res.status(500).json({ error: 'Failed to update review status' });
  }
});

}; // end module.exports
