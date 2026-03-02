'use strict';

/**
 * agents/router.js — RouterAgent
 *
 * Responsibility: Assign contacts from the facility directory to this observation.
 *   • Select 3–5 contacts based on area, priority, and corrective actions
 *   • Assign each a workflowPhase (1–4)
 *   • Explain why each person is needed for this specific observation
 *
 * Input  → { observation, area, contactsContext, classification, analysis }
 * Output → { contacts: [...] }
 */

const SYSTEM = `You are the RouterAgent inside Vent — an anonymous improvement intelligence system in a regulated biologics manufacturing facility.

Your ONLY job is to select 3–5 contacts from the CONTACTS DIRECTORY who must be involved in responding to this observation.

RULES:
- Use EXACT contact fields from the directory: name, role, dept, deptLabel, avatarClass, initials.
- Do NOT invent or modify any contact fields.
- Assign each contact a workflowPhase integer (1–4):
    1 = Immediate floor response (Shift Leads, EHS, 0–4h)
    2 = Document & notify (QA Leads, QMS Lead, same day)
    3 = Investigate & act (MSAT, Engineering specialists, 2–7 days)
    4 = Review & close (Directors, QP, Senior staff, 1–4 weeks)
- Include a "why" sentence specific to this observation explaining why this person needs to act.
- For High priority: ensure at least one Phase 1 contact and one Phase 2 contact.
- Match contacts to the process area when possible.`;

function makeRouterAgent(anthropic) {
  /**
   * @param {object} state  Pipeline state
   * @returns {object}      { contacts: [...] }
   */
  async function invoke(state) {
    const { observation, area, contactsContext, classification, analysis } = state;

    const caList = (analysis.correctiveActions || [])
      .map(ca => `- ${ca.title} (${ca.timing})`).join('\n');

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `Priority: ${classification.priority}
Category: ${classification.category}
Risk level: ${classification.riskLevel}
Process area: ${area}

Corrective actions proposed:
${caList || '(none yet)'}

Observation: "${observation}"

════ CONTACTS DIRECTORY ════
${contactsContext}
════════════════════════════

Select 3–5 contacts. Return ONLY valid JSON:
{
  "contacts": [{
    "name": "exact name from directory",
    "role": "exact role from directory",
    "dept": "exact dept from directory",
    "deptLabel": "exact deptLabel from directory",
    "avatarClass": "exact avatarClass from directory",
    "initials": "exact initials from directory",
    "workflowPhase": 1,
    "why": "one sentence specific to this observation"
  }]
}`,
      }],
    });

    const raw = message.content[0].text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(raw);
    console.log(`[ROUTER] Assigned ${result.contacts.length} contacts: ${result.contacts.map(c => `${c.initials}(P${c.workflowPhase})`).join(', ')}`);
    return result;
  }

  return { invoke };
}

module.exports = makeRouterAgent;
