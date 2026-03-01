'use strict';

let _builderTableReady = false;
async function ensureBuilderTable(supabase) {
  if (_builderTableReady) return;
  try {
    const { error } = await supabase.from('builder_docs').select('id').limit(1);
    if (error && error.message.includes('does not exist')) {
      console.log('[DOCS] builder_docs table not found. Run the SQL from GET /admin/setup in Supabase.');
    }
    _builderTableReady = true;
  } catch { _builderTableReady = true; }
}

module.exports = function(app, { supabase, anthropic, auditLog, rag, auth }) {
  const { requireAuth, requireRole } = auth;
  const { getRelevantChunks, buildSopContext } = rag;

  // ─── DOC BUILDER AI ENDPOINTS ─────────────────────────────────────────────────

  // AI Assist — rewrite, expand, add safety, format as SOP
  app.post('/docs/ai-assist', requireAuth, async (req, res) => {
    const { action, stepTitle, stepContent, stepNote, docTitle, area } = req.body;

    const validActions = ['rewrite', 'expand', 'safety', 'format'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be: ' + validActions.join(', ') });
    }
    if (!stepContent || stepContent.length < 5) {
      return res.status(400).json({ error: 'Step content too short' });
    }

    const prompts = {
      rewrite: `Rewrite the following SOP step for maximum clarity, precision, and readability. Use active voice, short sentences, and unambiguous language. Keep all technical accuracy. Do not add or remove information — just improve the writing.\n\nReturn ONLY valid JSON: { "title": "improved step title", "content": "improved content", "note": "any note/warning or empty string" }`,
      expand: `Expand the following SOP step with additional detail that an operator would need on the manufacturing floor. Add specific sub-steps, expected observations, and acceptance criteria where appropriate. Keep it practical and actionable.\n\nReturn ONLY valid JSON: { "title": "step title", "content": "expanded content with sub-steps", "note": "any note/warning or empty string" }`,
      safety: `Review the following SOP step and add all relevant safety warnings, PPE requirements, hazard callouts, and precautions. Consider chemical exposure, biological hazards, equipment risks, ergonomic concerns, and GMP requirements. Add warnings as notes and integrate safety language into the content.\n\nReturn ONLY valid JSON: { "title": "step title", "content": "content with safety language integrated", "note": "safety warnings and PPE requirements" }`,
      format: `Reformat the following content as a proper GMP SOP step. Structure it with: a clear objective, numbered sub-steps, acceptance criteria, and any critical control points marked. Use standard SOP language conventions.\n\nReturn ONLY valid JSON: { "title": "formatted step title", "content": "properly formatted SOP content", "note": "any critical notes or empty string" }`
    };

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `${prompts[action]}

Document: "${docTitle || 'Untitled'}"
Process Area: ${area || 'General'}
Step Title: "${stepTitle || 'Untitled Step'}"
Step Content:
${stepContent}
${stepNote ? '\nExisting Note/Warning: ' + stepNote : ''}

Return ONLY valid JSON — no markdown fences, no preamble.`
        }]
      });

      const raw = message.content[0].text;
      const clean = raw.replace(/```json|```/g, '').trim();
      const result = JSON.parse(clean);

      console.log(`[DOC-AI] ${action} on "${stepTitle}" — success`);
      res.json(result);

    } catch (error) {
      console.error('Doc AI assist error:', error);
      res.status(500).json({ error: 'AI assist failed: ' + error.message });
    }
  });

  // Generate document steps from an SOP
  app.post('/docs/generate-steps', requireAuth, async (req, res) => {
    const { docId } = req.body;

    if (!docId) {
      return res.status(400).json({ error: 'docId is required' });
    }

    try {
      // Fetch all SOP sections for this document
      const { data: sections, error } = await supabase
        .from('sop_chunks')
        .select('doc_id, doc_title, section_title, content')
        .eq('doc_id', docId)
        .order('chunk_index', { ascending: true });

      if (error) return res.status(500).json({ error: error.message });
      if (!sections || !sections.length) {
        return res.status(404).json({ error: 'No SOP sections found for ' + docId });
      }

      const sopContent = sections.map(s => `Section: ${s.section_title}\n${s.content}`).join('\n\n---\n\n');
      const docTitle = sections[0].doc_title || docId;

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: `You are a GMP documentation specialist. Generate a complete set of document steps from the following SOP. Each step should be practical, actionable, and ready for an operator to follow on the manufacturing floor.

Rules:
- Create 5–12 steps covering the full scope of the SOP
- Each step should have a clear title, detailed content, and a note/warning if applicable
- Include specific parameter values, acceptance criteria, and critical control points from the SOP
- Mark safety-critical information in the notes
- Use the actual values and specifications from the SOP — do not invent data

════ SOP CONTENT: ${docId} — ${docTitle} ════
${sopContent}
═══════════════════════════════════════════════

Return ONLY valid JSON — no markdown fences, no preamble:
{
  "title": "suggested document title",
  "description": "1-2 sentence description of what this document covers",
  "steps": [
    { "title": "step title", "content": "detailed step content", "note": "warning or critical note, or empty string" }
  ]
}`
        }]
      });

      const raw = message.content[0].text;
      const clean = raw.replace(/```json|```/g, '').trim();
      const result = JSON.parse(clean);

      console.log(`[DOC-GEN] Generated ${result.steps?.length || 0} steps from ${docId}`);
      res.json(result);

    } catch (error) {
      console.error('Doc generate error:', error);
      res.status(500).json({ error: 'Step generation failed: ' + error.message });
    }
  });

  // Compliance checker — review a full document
  app.post('/docs/compliance-check', requireAuth, async (req, res) => {
    const { docTitle, area, steps } = req.body;

    if (!steps || !steps.length) {
      return res.status(400).json({ error: 'Document must have at least one step' });
    }

    try {
      // Build the document content for review
      const docContent = steps.map((s, i) =>
        `Step ${i + 1}: ${s.title}\nContent: ${s.content}${s.note ? '\nNote: ' + s.note : ''}`
      ).join('\n\n---\n\n');

      // Optionally fetch relevant SOP chunks to cross-reference
      let sopContext = '';
      try {
        const chunks = await getRelevantChunks(docTitle + ' ' + steps.map(s => s.title).join(' '), area || 'Upstream');
        sopContext = buildSopContext(chunks);
      } catch (e) {
        console.warn('[COMPLIANCE] Could not fetch SOP context:', e.message);
      }

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2500,
        messages: [{
          role: 'user',
          content: `You are a GMP compliance reviewer for a biologics manufacturing facility. Review the following workflow document for compliance gaps, missing information, and quality issues.

Check for:
1. Missing PPE or safety warnings on steps that involve chemicals, biologics, or equipment
2. Steps without acceptance criteria or verification points
3. Undefined acronyms or ambiguous terminology
4. Missing sign-off or approval points for critical operations
5. Deviations from SOP parameters (compare against the SOP sections provided)
6. Missing material/equipment specifications
7. Incomplete procedures (missing steps that would be expected)
8. Non-compliance with GMP documentation standards

${sopContext ? '════ RELEVANT SOP SECTIONS FOR CROSS-REFERENCE ════\n' + sopContext + '\n═══════════════════════════════════════════════════════\n' : ''}

════ DOCUMENT UNDER REVIEW ════
Title: ${docTitle || 'Untitled Document'}
Process Area: ${area || 'General'}

${docContent}
════════════════════════════════

Return ONLY valid JSON — no markdown fences, no preamble:
{
  "score": 0-100,
  "grade": "A or B or C or D or F",
  "summary": "2-3 sentence overall assessment",
  "checks": [
    {
      "category": "safety|criteria|terminology|signoff|sop_deviation|materials|completeness|gmp_format",
      "status": "pass|warn|fail",
      "title": "short check title",
      "detail": "specific finding and recommendation",
      "stepRef": "which step number this applies to, or 'Document' for overall issues"
    }
  ],
  "recommendations": ["top 3 priority improvements as short strings"]
}`
        }]
      });

      const raw = message.content[0].text;
      const clean = raw.replace(/```json|```/g, '').trim();
      const result = JSON.parse(clean);

      console.log(`[COMPLIANCE] Reviewed "${docTitle}" — score: ${result.score}, ${result.checks?.length || 0} checks`);
      res.json(result);

    } catch (error) {
      console.error('Compliance check error:', error);
      res.status(500).json({ error: 'Compliance check failed: ' + error.message });
    }
  });

  // ─── DOC BUILDER PERSISTENCE ─────────────────────────────────────────────────
  // Table: builder_docs (see /admin/setup SQL output)

  // GET /docs/documents — list all documents for the current user
  app.get('/docs/documents', requireAuth, async (req, res) => {
    await ensureBuilderTable(supabase);
    try {
      const { data, error } = await supabase
        .from('builder_docs')
        .select('client_id, title, area, description, status, steps, versions, source, created_at, updated_at')
        .eq('user_id', req.user.id || req.user.email)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      res.json(data || []);
    } catch (err) {
      console.error('Doc list error:', err);
      res.status(500).json({ error: 'Failed to load documents' });
    }
  });

  // POST /docs/documents — create a new document
  app.post('/docs/documents', requireAuth, async (req, res) => {
    await ensureBuilderTable(supabase);
    const { client_id, title, area, description, status, steps, versions, source } = req.body;
    if (!client_id) return res.status(400).json({ error: 'client_id is required' });
    try {
      const { data, error } = await supabase
        .from('builder_docs')
        .insert({
          user_id: req.user.id || req.user.email,
          client_id,
          title: title || 'Untitled',
          area: area || 'Other',
          description: description || '',
          status: status || 'draft',
          steps: steps || [],
          versions: versions || [],
          source: source || null
        })
        .select()
        .single();
      if (error) throw error;

      await auditLog({
        userId: req.user.id || req.user.email,
        userRole: req.user.role || 'user',
        action: 'doc_created',
        entityType: 'builder_doc',
        entityId: client_id,
        after: { title, area, status: status || 'draft' },
        req
      });

      res.json(data);
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'Document already exists' });
      console.error('Doc create error:', err);
      res.status(500).json({ error: 'Failed to create document' });
    }
  });

  // GET /docs/documents/:clientId — get a single document
  app.get('/docs/documents/:clientId', requireAuth, async (req, res) => {
    await ensureBuilderTable(supabase);
    try {
      const { data, error } = await supabase
        .from('builder_docs')
        .select('*')
        .eq('client_id', req.params.clientId)
        .eq('user_id', req.user.id || req.user.email)
        .single();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Document not found' });
      res.json(data);
    } catch (err) {
      console.error('Doc get error:', err);
      res.status(500).json({ error: 'Failed to load document' });
    }
  });

  // PUT /docs/documents/:clientId — update a document
  app.put('/docs/documents/:clientId', requireAuth, async (req, res) => {
    await ensureBuilderTable(supabase);
    const { title, area, description, status, steps, versions, signoffs } = req.body;
    const update = { updated_at: new Date().toISOString() };
    if (title !== undefined) update.title = title;
    if (area !== undefined) update.area = area;
    if (description !== undefined) update.description = description;
    if (steps !== undefined) update.steps = steps;
    if (versions !== undefined) update.versions = versions;
    if (signoffs !== undefined) update.signoffs = signoffs;

    // Track status changes for audit
    let oldStatus = null;
    if (status !== undefined) {
      update.status = status;
      try {
        const { data: existing } = await supabase
          .from('builder_docs')
          .select('status')
          .eq('client_id', req.params.clientId)
          .eq('user_id', req.user.id || req.user.email)
          .single();
        if (existing) oldStatus = existing.status;
      } catch {}
    }

    try {
      const { data, error } = await supabase
        .from('builder_docs')
        .update(update)
        .eq('client_id', req.params.clientId)
        .eq('user_id', req.user.id || req.user.email)
        .select()
        .single();
      if (error) throw error;

      if (status !== undefined && oldStatus && oldStatus !== status) {
        await auditLog({
          userId: req.user.id || req.user.email,
          userRole: req.user.role || 'user',
          action: 'doc_status_changed',
          entityType: 'builder_doc',
          entityId: req.params.clientId,
          before: { status: oldStatus },
          after: { status },
          req
        });
      }

      res.json(data);
    } catch (err) {
      console.error('Doc update error:', err);
      res.status(500).json({ error: 'Failed to update document' });
    }
  });

  // DELETE /docs/documents/:clientId — delete a document
  app.delete('/docs/documents/:clientId', requireAuth, async (req, res) => {
    await ensureBuilderTable(supabase);
    try {
      const { error } = await supabase
        .from('builder_docs')
        .delete()
        .eq('client_id', req.params.clientId)
        .eq('user_id', req.user.id || req.user.email);
      if (error) throw error;

      await auditLog({
        userId: req.user.id || req.user.email,
        userRole: req.user.role || 'user',
        action: 'doc_deleted',
        entityType: 'builder_doc',
        entityId: req.params.clientId,
        req
      });

      res.json({ ok: true });
    } catch (err) {
      console.error('Doc delete error:', err);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  });

  // ─── DOCUMENT SIGN-OFF ──────────────────────────────────────────────────────

  // POST /docs/documents/:clientId/signoff — electronic sign-off (21 CFR Part 11)
  app.post('/docs/documents/:clientId/signoff', requireAuth, async (req, res) => {
    await ensureBuilderTable(supabase);
    const { action, comment } = req.body;
    const userId = req.user.id || req.user.email;
    const role = req.user.role || 'operator';
    const name = req.user.name || userId;

    const validActions = ['reviewed', 'approved', 'rejected'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be: ' + validActions.join(', ') });
    }

    // Role-based permissions
    const canReview = ['qa', 'director', 'admin'].includes(role);
    const canApprove = ['director', 'admin'].includes(role);

    if (action === 'reviewed' && !canReview) {
      return res.status(403).json({ error: 'Only QA, Director, or Admin can review documents' });
    }
    if (action === 'approved' && !canApprove) {
      return res.status(403).json({ error: 'Only Director or Admin can approve documents' });
    }

    try {
      // Fetch current document
      const { data: doc, error: fetchErr } = await supabase
        .from('builder_docs')
        .select('*')
        .eq('client_id', req.params.clientId)
        .eq('user_id', userId)
        .single();

      if (fetchErr || !doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const oldStatus = doc.status;

      // Validate status transition
      if (action === 'reviewed' && oldStatus !== 'draft') {
        return res.status(400).json({ error: 'Only draft documents can be reviewed' });
      }
      if (action === 'approved' && oldStatus !== 'reviewed') {
        return res.status(400).json({ error: 'Only reviewed documents can be approved' });
      }

      // Build sign-off entry
      const signoffEntry = {
        id: 'signoff-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        action,
        user: name,
        role,
        timestamp: new Date().toISOString(),
        comment: comment || null
      };

      // Update document
      const signoffs = Array.isArray(doc.signoffs) ? doc.signoffs : [];
      signoffs.push(signoffEntry);

      const newStatus = action === 'rejected' ? 'draft' : action;
      const versions = Array.isArray(doc.versions) ? doc.versions : [];
      const actionLabel = action === 'reviewed' ? 'Reviewed' : action === 'approved' ? 'Approved' : 'Rejected';
      versions.push({
        time: signoffEntry.timestamp,
        label: actionLabel + ' by ' + name + ' (' + role.toUpperCase() + ')' + (comment ? ' — ' + comment : ''),
        user: name
      });

      const { data: updated, error: updateErr } = await supabase
        .from('builder_docs')
        .update({
          status: newStatus,
          signoffs,
          versions,
          updated_at: signoffEntry.timestamp
        })
        .eq('client_id', req.params.clientId)
        .eq('user_id', userId)
        .select()
        .single();

      if (updateErr) throw updateErr;

      // Immutable audit log
      await auditLog({
        userId,
        userRole: role,
        action: 'doc_' + action,
        entityType: 'builder_doc',
        entityId: req.params.clientId,
        before: { status: oldStatus },
        after: { status: newStatus, signoff: signoffEntry },
        reason: comment || null,
        req
      });

      console.log(`[SIGNOFF] ${actionLabel} doc ${req.params.clientId} by ${name} (${role})`);
      res.json({ ok: true, status: newStatus, signoff: signoffEntry });
    } catch (err) {
      console.error('Sign-off error:', err);
      res.status(500).json({ error: 'Sign-off failed: ' + err.message });
    }
  });
};
