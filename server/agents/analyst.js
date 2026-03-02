'use strict';

/**
 * agents/analyst.js — AnalystAgent
 *
 * Responsibility: Deep analysis of the observation against SOP content.
 *   • Scientific evaluation / root cause hypothesis
 *   • SOP cross-references with specific section numbers
 *   • BPR cross-references if applicable
 *   • Proposed corrective actions with timing
 *   • Response timeline
 *
 * Receives the ClassifierAgent's triage so it can calibrate depth of analysis.
 *
 * Input  → { observation, area, shift, sopContext, patternContext, classification }
 * Output → { sciEval, sopRefs, bprRefs, correctiveActions, timeline, pattern }
 */

const SYSTEM = `You are the AnalystAgent inside Vent — an anonymous improvement intelligence system in a regulated biologics manufacturing facility running perfusion upstream processes.

Your ONLY job is to perform a detailed scientific analysis of the operator's observation against the retrieved SOP content. The ClassifierAgent has already triaged this — use its assessment to calibrate your depth.

RULES:
- Reference ONLY the SOP documents provided below. Do not invent SOP codes or section numbers.
- Use actual section numbers from the SOP content.
- If the observation matches a documented gap or NOTE in the SOPs, flag it explicitly in sopRefs with flag: "gap".
- Corrective actions must reference SOP steps where possible.
- Timeline should reflect realistic response times for a GMP facility.
- Be specific and grounded. No generic advice.`;

function makeAnalystAgent(anthropic) {
  /**
   * @param {object} state  Pipeline state (includes classification from prior node)
   * @returns {object}      { sciEval, sopRefs, bprRefs, correctiveActions, timeline, pattern }
   */
  async function invoke(state) {
    const { observation, area, shift, sopContext, patternContext, classification } = state;
    const patternCount = state.patternCount || 0;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `The ClassifierAgent triaged this as: ${classification.priority} priority, ${classification.category}, risk: ${classification.riskLevel}, regulatory: ${classification.regulatoryFlag}.

════ RELEVANT SOP SECTIONS ════
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
  "sciEval": {
    "summary": "3-4 sentences grounded in retrieved SOP content",
    "rootCauseHypothesis": "one sentence",
    "riskLevel": "${classification.riskLevel}",
    "affectedParameter": "specific parameter name",
    "regulatoryFlag": "${classification.regulatoryFlag}",
    "regulatoryNote": "one sentence citing relevant regulation or SOP requirement"
  },
  "sopRefs": [{ "code": "doc_id e.g. WX-SOP-1001-03", "title": "document title", "step": "section number e.g. 8.6.1.4", "relevance": "one sentence", "flag": "gap or ambiguous or compliant" }],
  "bprRefs": [{ "code": "WX-BPR-2001-03 if relevant", "title": "Batch Production Record", "step": "section ref", "relevance": "one sentence", "flag": "gap or ambiguous or compliant" }],
  "correctiveActions": [{ "title": "action title", "description": "specific description referencing SOP steps", "timing": "immediate or short or long", "timingLabel": "e.g. Within 24 hours" }],
  "timeline": [{ "state": "done or now or next or later", "when": "timeframe", "event": "event title", "detail": "one sentence" }],
  "pattern": { "summary": "two sentences on recurrence based on pattern data", "currentCount": ${patternCount + 1}, "threshold": 3 }
}`,
      }],
    });

    const raw = message.content[0].text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(raw);
    console.log(`[ANALYST] ${result.sopRefs.length} SOP refs | ${result.correctiveActions.length} corrective actions | root cause: ${result.sciEval.rootCauseHypothesis.slice(0, 60)}...`);
    return result;
  }

  return { invoke };
}

module.exports = makeAnalystAgent;
