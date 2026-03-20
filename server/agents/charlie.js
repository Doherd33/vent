'use strict';

/**
 * agents/charlie.js — Charlie Voice Assistant Agent
 *
 * Responsibility: Natural-language voice assistant for operators.
 *   • Answer questions conversationally using SOP knowledge
 *   • Dispatch UI actions (open panels, search SOPs, start tour, etc.)
 *   • Maintain conversation context across turns
 *   • Support multilingual responses (EN / ZH / ES)
 *
 * Input  → { question, context?, lang?, history? }
 * Output → { answer, action, params }
 */

const { loadPrompt } = require('../prompts/loader');
const SYSTEM_BASE = loadPrompt('charlie');
const SYSTEM_HUB  = loadPrompt('charlie-hub');

const LANG_NAMES = { en: 'English', zh: 'Chinese (Mandarin)', es: 'Spanish' };

function makeCharlieAgent(anthropic) {
  /**
   * @param {object} params
   * @param {string} params.question            Operator's spoken question
   * @param {string} [params.context]           What the user is currently viewing
   * @param {string} [params.lang]              Target language code: en|zh|es
   * @param {Array}  [params.history]           Prior [{q, a}] turns (max 8)
   * @param {string} [params.sopContext]        Retrieved SOP context (optional — from sop-query agent)
   * @returns {{ answer: string, action: string, params: object }}
   */
  async function invoke({ question, context, lang, history, sopContext, mode }) {
    const targetLang = LANG_NAMES[lang] || 'English';

    // Build a system prompt with optional context and SOP grounding
    let system = mode === 'hub' ? SYSTEM_HUB : SYSTEM_BASE;
    if (context) {
      system += `\nThe user is currently viewing: ${context}`;
    }
    if (sopContext) {
      system += `\n\n═══ RELEVANT SOP SECTIONS ═══\n${sopContext}\n═════════════════════════════\nUse this SOP content to ground your answer. Cite section numbers when relevant.`;
    }
    system += `\nRespond in ${targetLang}.`;

    // Build message history
    const messages = [];
    if (history && history.length) {
      history.slice(-8).forEach(h => {
        messages.push({ role: 'user', content: h.q });
        messages.push({ role: 'assistant', content: JSON.stringify({ answer: h.a, action: 'none', params: {} }) });
      });
    }
    messages.push({ role: 'user', content: question });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 650,
      system,
      messages,
    });

    let raw = response.content[0].text;
    // Strip markdown fences Claude sometimes wraps around JSON
    raw = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // If Claude didn't return JSON, wrap it
      parsed = { answer: raw, action: 'none', params: {} };
    }

    const result = {
      answer: parsed.answer || raw,
      action: parsed.action || 'none',
      params: parsed.params || {},
    };

    console.log(`[CHARLIE] "${question.slice(0, 40)}..." → action: ${result.action}`);
    return result;
  }

  return { invoke };
}

module.exports = makeCharlieAgent;
