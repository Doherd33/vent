'use strict';

/**
 * agents/builder.js — BuilderAgent (SOP Drafting)
 *
 * Responsibility: AI-assisted SOP content generation.
 *   • Rewrite, expand, add safety, or format SOP steps
 *   • Generate complete SOP drafts from an outline
 *   • Cross-reference existing SOPs for consistency
 *
 * This agent encapsulates the Claude prompts currently scattered across
 * the /docs/ai-assist and /docs/generate-steps routes, making them
 * testable and reusable.
 *
 * Input  → { action, stepTitle, stepContent, stepNote?, docTitle?, area?, sopContext? }
 * Output → { title, content, note } (for step-level actions)
 *        → { sections: [...] } (for full generation)
 */

const ACTIONS = {
  rewrite: `Rewrite the following SOP step for maximum clarity, precision, and readability. Use active voice, short sentences, and unambiguous language. Keep all technical accuracy. Do not add or remove information — just improve the writing.`,
  expand: `Expand the following SOP step with additional detail that an operator would need on the manufacturing floor. Add specific sub-steps, expected observations, and acceptance criteria where appropriate. Keep it practical and actionable.`,
  safety: `Review the following SOP step and add all relevant safety warnings, PPE requirements, hazard callouts, and precautions. Consider chemical exposure, biological hazards, equipment risks, ergonomic concerns, and GMP requirements. Add warnings as notes and integrate safety language into the content.`,
  format: `Reformat the following content as a proper GMP SOP step. Structure it with: a clear objective, numbered sub-steps, acceptance criteria, and any critical control points marked. Use standard SOP language conventions.`,
};

const { loadPrompt } = require('../prompts/loader');
const SYSTEM = loadPrompt('builder');

function makeBuilderAgent(anthropic) {
  /**
   * Step-level action: rewrite, expand, safety, or format a single step.
   *
   * @param {object} params
   * @param {string} params.action         One of: rewrite, expand, safety, format
   * @param {string} params.stepTitle      Title of the SOP step
   * @param {string} params.stepContent    Content of the step
   * @param {string} [params.stepNote]     Existing note/warning
   * @param {string} [params.docTitle]     Parent document title
   * @param {string} [params.area]         Process area
   * @param {string} [params.sopContext]   Retrieved SOP context for cross-reference
   * @returns {{ title: string, content: string, note: string }}
   */
  async function assistStep({ action, stepTitle, stepContent, stepNote, docTitle, area, sopContext }) {
    if (!ACTIONS[action]) throw new Error(`Invalid action: ${action}`);

    const crossRef = sopContext
      ? `\n\n═══ RELATED SOP SECTIONS (for cross-reference) ═══\n${sopContext}\n═══════════════════════════════════════════════════`
      : '';

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `${ACTIONS[action]}
${crossRef}

Document: "${docTitle || 'Untitled'}"
Process Area: ${area || 'General'}
Step Title: "${stepTitle || 'Untitled Step'}"
Step Content:
${stepContent}
${stepNote ? '\nExisting Note/Warning: ' + stepNote : ''}

Return ONLY valid JSON: { "title": "step title", "content": "improved content", "note": "any note/warning or empty string" }`,
      }],
    });

    const raw = message.content[0].text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(raw);
    console.log(`[BUILDER] ${action} on "${stepTitle}" — done`);
    return result;
  }

  /**
   * Generate a full SOP draft from an outline / description.
   *
   * @param {object} params
   * @param {string} params.description   What the SOP should cover
   * @param {string} [params.area]        Process area
   * @param {string} [params.sopContext]   Existing SOP context for consistency
   * @returns {{ sections: Array<{ title: string, content: string, note: string }> }}
   */
  async function generateDraft({ description, area, sopContext }) {
    const crossRef = sopContext
      ? `\n\n═══ EXISTING SOP SECTIONS (for consistency) ═══\n${sopContext}\n════════════════════════════════════════════════`
      : '';

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `Generate a complete GMP SOP draft for the following:

Description: "${description}"
Process Area: ${area || 'General'}
${crossRef}

Structure the SOP with numbered sections. Each section should have a title, detailed content with sub-steps, and any relevant notes/warnings.

Return ONLY valid JSON:
{
  "sections": [
    { "title": "1. Purpose", "content": "...", "note": "" },
    { "title": "2. Scope", "content": "...", "note": "" },
    { "title": "3. Responsibilities", "content": "...", "note": "" }
  ]
}`,
      }],
    });

    const raw = message.content[0].text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(raw);
    console.log(`[BUILDER] Generated draft with ${result.sections?.length || 0} sections`);
    return result;
  }

  return { assistStep, generateDraft };
}

module.exports = makeBuilderAgent;
