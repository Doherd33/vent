'use strict';

/**
 * agents/classifier.js — ClassifierAgent
 *
 * Responsibility: Triage an operator observation.
 *   • Assign priority (High / Medium / Low)
 *   • Identify the most relevant process area
 *   • Flag whether a regulatory notification may be needed
 *
 * Input  → { observation, area, shift, sopContext, patternContext }
 * Output → { priority, riskLevel, regulatoryFlag, regulatoryNote, category, reasoning }
 */

const SYSTEM = `You are the ClassifierAgent inside Vent — an anonymous improvement intelligence system in a regulated biologics manufacturing facility.

Your ONLY job is to triage the operator's observation:
1. Assign a priority: High, Medium, or Low.
2. Assess risk level: High, Medium, or Low.
3. Determine if a regulatory notification may be required (Yes / No) and explain briefly.
4. Categorise: safety | process-deviation | equipment | documentation | environmental | other.
5. Give 1–2 sentences of reasoning grounding your decision in the SOP content.

RULES:
- Base your assessment on the SOP sections and pattern data provided.
- If there's a documented gap or NOTE in the SOPs matching this observation, bias toward High.
- If similar submissions have occurred before (see pattern data), bias toward higher priority.
- Be concise — this is a triage step, not a full analysis.`;

function makeClassifierAgent(anthropic) {
  /**
   * @param {object} state  Pipeline state
   * @returns {object}      { priority, riskLevel, regulatoryFlag, regulatoryNote, category, reasoning }
   */
  async function invoke(state) {
    const { observation, area, shift, sopContext, patternContext } = state;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `════ RELEVANT SOP SECTIONS ════
${sopContext}
═══════════════════════════════

════ SIMILAR PAST SUBMISSIONS ════
${patternContext}
══════════════════════════════════

Process area: ${area}
Shift: ${shift}
Operator observation: "${observation}"

Return ONLY valid JSON:
{
  "priority": "High or Medium or Low",
  "riskLevel": "High or Medium or Low",
  "regulatoryFlag": "Yes or No",
  "regulatoryNote": "one sentence",
  "category": "safety|process-deviation|equipment|documentation|environmental|other",
  "reasoning": "1-2 sentences"
}`,
      }],
    });

    const raw = message.content[0].text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(raw);
    console.log(`[CLASSIFIER] ${result.priority} priority | ${result.category} | regulatory: ${result.regulatoryFlag}`);
    return result;
  }

  return { invoke };
}

module.exports = makeClassifierAgent;
