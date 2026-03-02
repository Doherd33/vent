'use strict';

/**
 * agents/capa-writer.js — CAPAAgent
 *
 * Responsibility: Generate structured CAPA records from the analyst's corrective actions.
 *   • Refine each corrective action into a formal CAPA record
 *   • Assign owners from the routed contacts
 *   • Set due dates based on timing
 *   • Ensure regulatory-grade descriptions
 *
 * Input  → { observation, area, classification, analysis, routing }
 * Output → { capas: [...] }
 */

const SYSTEM = `You are the CAPAAgent inside Vent — an anonymous improvement intelligence system in a regulated biologics manufacturing facility.

Your ONLY job is to refine corrective actions into formal Corrective and Preventive Action (CAPA) records suitable for a GMP audit trail.

RULES:
- Each CAPA must have a clear, specific title and description.
- Descriptions should reference SOP section numbers when applicable.
- Assign an owner from the routed contacts — prefer Phase 2-3 contacts as CAPA owners.
- Set realistic due dates based on timing:
    immediate → 1 day from now
    short → 7 days from now
    long → 30 days from now
- If no corrective actions were proposed, return an empty capas array.
- Keep descriptions professional and audit-ready.`;

function makeCapaWriterAgent(anthropic) {
  /**
   * @param {object} state  Pipeline state
   * @returns {object}      { capas: [...] }
   */
  async function invoke(state) {
    const { observation, area, classification, analysis, routing } = state;

    const actions = analysis.correctiveActions || [];
    if (!actions.length) {
      console.log('[CAPA-WRITER] No corrective actions — skipping CAPA generation');
      return { capas: [] };
    }

    const contactList = (routing.contacts || [])
      .map(c => `${c.name} (${c.role}, Phase ${c.workflowPhase})`).join('\n');

    const actionList = actions
      .map((ca, i) => `${i + 1}. ${ca.title} — ${ca.description} [timing: ${ca.timing}]`).join('\n');

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `Priority: ${classification.priority}
Process area: ${area}
Observation: "${observation}"

Corrective actions from the Analyst:
${actionList}

Available contacts (prefer Phase 2-3 as owners):
${contactList}

Refine each corrective action into a formal CAPA. Return ONLY valid JSON:
{
  "capas": [{
    "title": "formal CAPA title",
    "description": "audit-ready description referencing SOP sections",
    "timing": "immediate or short or long",
    "timingLabel": "e.g. Within 24 hours",
    "owner": "exact contact name from list above",
    "ownerRole": "their role"
  }]
}`,
      }],
    });

    const raw = message.content[0].text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(raw);
    console.log(`[CAPA-WRITER] Generated ${result.capas.length} CAPA records`);
    return result;
  }

  return { invoke };
}

module.exports = makeCapaWriterAgent;
