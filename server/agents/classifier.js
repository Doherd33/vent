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

const { loadPrompt } = require('../prompts/loader');
const SYSTEM = loadPrompt('classifier');

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
