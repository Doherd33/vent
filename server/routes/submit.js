'use strict';

module.exports = function(app, { supabase, anthropic, auditLog, rag, auth, buildContactsContext }) {
  const { requireAuth } = auth;
  const { getRelevantChunks, buildSopContext, findSimilarSubmissions, buildPatternContext } = rag;

  // Internal helper: create notifications for contacts when a submission is created
  async function notifyContacts(submission, contacts) {
    if (!contacts || !contacts.length) return;
    const notifications = contacts.map(c => ({
      user_id: c.name, // using contact name as user_id for now
      user_role: c.dept || 'unknown',
      type: 'submission_routed',
      title: `New ${submission.priority} priority observation routed to you`,
      body: `${submission.refCode}: ${(submission.observation || '').slice(0, 120)}...`,
      entity_type: 'submission',
      entity_id: submission.refCode,
      workflow_phase: c.workflowPhase || 1,
      why: c.why || '',
      read: false
    }));

    try {
      const { error } = await supabase.from('notifications').insert(notifications);
      if (error) console.error('[NOTIFY] Insert error:', error.message);
      else console.log(`[NOTIFY] Sent ${notifications.length} notifications for ${submission.refCode}`);
    } catch (err) {
      console.error('[NOTIFY] Failed:', err.message);
    }
  }

  // GET /patterns?observation=...&area=... — standalone pattern search endpoint
  app.get('/patterns', requireAuth, async (req, res) => {
    const { observation, area } = req.query;
    if (!observation) return res.status(400).json({ error: 'observation query param required' });
    const patterns = await findSimilarSubmissions(observation, area);
    res.json(patterns);
  });

  // Submit route
  app.post('/submit', requireAuth, async (req, res) => {
    const { observation, area, shift, willingToConsult } = req.body;

    if (!observation || observation.length < 10) {
      return res.status(400).json({ error: 'Observation too short' });
    }

    const refCode = 'VNT-' + Math.floor(1000 + Math.random() * 8999);

    try {
      // Step 1: Find the most relevant SOP sections for this observation
      const chunks = await getRelevantChunks(observation, area);
      const sopContext = buildSopContext(chunks);

      console.log(`[${refCode}] Found ${chunks.length} relevant SOP chunks for: "${observation.slice(0, 60)}..."`);

      // Step 2: Build the contacts directory for this submission
      const contactsContext = buildContactsContext();

      // Step 2.5: Search for similar past submissions (pattern detection)
      const patterns = await findSimilarSubmissions(observation, area);
      const patternContext = buildPatternContext(patterns);
      console.log(`[${refCode}] Pattern detection: ${patterns.count} similar submission(s) found`);

      // Step 3: Send to Claude with real SOP content, real contacts, and real patterns as grounding
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `You are the AI engine of Vent — an anonymous improvement intelligence system inside a regulated biologics manufacturing facility running perfusion upstream processes.

An operator has submitted an observation. You have been given the ACTUAL facility SOP sections and the ACTUAL contacts directory. Your job is to analyse the observation against real documents and route it to the correct people.

RULES:
- Reference ONLY the SOP documents provided below. Do not invent SOP codes or section numbers.
- Select 3–5 contacts from the CONTACTS DIRECTORY below. Use their EXACT name, role, dept, deptLabel, initials, and avatarClass — do not invent or modify any contact fields.
- Assign each contact a workflowPhase integer (1–4): 1=Immediate floor response (Shift Leads, EHS, 0–4h); 2=Document & notify (QA Leads, QMS Lead, same day); 3=Investigate & act (MSAT, Engineering specialists, 2–7 days); 4=Review & close (Directors, QP, Senior staff, 1–4 weeks).
- If the observation matches a documented gap or NOTE in the SOPs, flag it explicitly.
- Be specific. Use actual section numbers from the SOP content below.

════ RELEVANT SOP SECTIONS ════
${sopContext}
═══════════════════════════════

════ CONTACTS DIRECTORY ════
${contactsContext}
════════════════════════════

════ SIMILAR PAST SUBMISSIONS ════
${patternContext}
══════════════════════════════════

Process area: ${area}
Shift: ${shift}
Operator observation: "${observation}"

Return ONLY valid JSON — no markdown fences, no preamble, no explanation outside the JSON.

{
  "priority": "High or Medium or Low",
  "sopRefs": [{ "code": "doc_id from above e.g. WX-SOP-1001-03", "title": "document title", "step": "actual section number e.g. 8.6.1.4", "relevance": "one sentence explaining connection to observation", "flag": "gap or ambiguous or compliant" }],
  "bprRefs": [{ "code": "WX-BPR-2001-03 if relevant", "title": "Batch Production Record", "step": "section ref", "relevance": "one sentence", "flag": "gap or ambiguous or compliant" }],
  "sciEval": { "summary": "3-4 sentences grounded in the retrieved SOP content", "rootCauseHypothesis": "one sentence", "riskLevel": "High or Medium or Low", "affectedParameter": "specific parameter name", "regulatoryFlag": "Yes or No", "regulatoryNote": "one sentence citing relevant regulation or SOP requirement" },
  "correctiveActions": [{ "title": "action title", "description": "specific description referencing actual SOP steps where possible", "timing": "immediate or short or long", "timingLabel": "e.g. Within 24 hours" }],
  "contacts": [{ "name": "exact name from directory", "role": "exact role from directory", "dept": "exact dept from directory", "deptLabel": "exact deptLabel from directory", "avatarClass": "exact avatarClass from directory", "initials": "exact initials from directory", "workflowPhase": 1, "why": "one sentence specific to this observation explaining why this person needs to act" }],
  "timeline": [{ "state": "done or now or next or later", "when": "timeframe", "event": "event title", "detail": "one sentence" }],
  "pattern": { "summary": "two sentences on whether this is a recurring pattern based on the SIMILAR PAST SUBMISSIONS data above", "currentCount": ${patterns.count + 1}, "threshold": 3 }
}`
        }]
      });

      const raw = message.content[0].text;
      const clean = raw.replace(/\`\`\`json|\`\`\`/g, '').trim();
      const feedback = JSON.parse(clean);

      // Step 3: Save to Supabase
      const { error } = await supabase
        .from('submissions')
        .insert({
          ref_code: refCode,
          process_area: area,
          shift: shift,
          raw_text: observation,
          priority: feedback.priority,
          structured: feedback,
          willing_to_consult: willingToConsult || false
        });

      if (error) {
        console.error('Supabase error:', error);
      } else {
        console.log(`[${refCode}] Saved to database`);
        // Audit: log the submission creation
        await auditLog({
          userId: shift || 'operator',
          userRole: 'operator',
          action: 'submission_created',
          entityType: 'submission',
          entityId: refCode,
          after: { priority: feedback.priority, area, shift, sopRefs: (feedback.sopRefs || []).map(s => s.code) },
          reason: 'Operator submitted observation via Query page',
          req
        });

        // Notify routed contacts
        await notifyContacts(
          { refCode, priority: feedback.priority, observation },
          feedback.contacts || []
        );

        // Auto-create CAPAs from corrective actions
        for (const ca of (feedback.correctiveActions || [])) {
          try {
            const capaId = 'CAPA-' + Math.floor(1000 + Math.random() * 8999);
            // Find the best matching contact to assign as owner
            const matchContact = (feedback.contacts || [])
              .sort((a, b) => (a.workflowPhase || 99) - (b.workflowPhase || 99))
              .find(c => c.workflowPhase >= 2) || (feedback.contacts || [])[0];
            await supabase.from('capas').insert({
              capa_id: capaId,
              submission_ref: refCode,
              title: ca.title,
              description: ca.description || '',
              timing: ca.timing || 'short',
              timing_label: ca.timingLabel || '',
              owner: matchContact ? matchContact.name : 'Unassigned',
              owner_role: matchContact ? matchContact.role : '',
              due_date: ca.timing === 'immediate' ? new Date(Date.now() + 86400000).toISOString().slice(0, 10)
                       : ca.timing === 'short' ? new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
                       : new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
              status: 'open'
            }).then(() => console.log(`[${refCode}] CAPA ${capaId} created: ${ca.title}`))
              .catch(e => console.warn(`[${refCode}] CAPA creation skipped:`, e.message));
          } catch (e) { /* table may not exist yet */ }
        }
      }

      res.json({ ...feedback, refCode });

    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Something went wrong' });
    }
  });
};
