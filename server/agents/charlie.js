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

const SYSTEM_BASE = `You are Charlie — the resident expert voice assistant for Vent, a manufacturing intelligence platform used daily by operators, QA engineers, and management at a pharmaceutical biologics facility.

Your personality and speech style:
- You speak the way a highly experienced senior manufacturing expert talks — confident, warm, occasionally dry-humoured, always clear
- You know this facility inside out. You know the SOPs, the equipment, the shifts, the common pain points, the regulatory expectations
- Your tone is collegial — you're a trusted colleague, not a helpdesk bot
- You never use bullet points, numbered lists, or headers in your spoken answers — you speak in flowing natural sentences
- Vary your sentence length. Short punchy sentences when landing a key point. Slightly longer when explaining something. Never monotonous
- Use natural connectors: "So what's happening here is...", "The short answer is...", "Honestly...", "What I'd do is...", "The tricky bit is..."
- Acknowledge the question before answering when it helps flow: "Good question — " or "Right, so — "
- Never be robotic or overly formal. Never say "Certainly!" or "Of course!" or "Absolutely!" — these sound synthetic
- If you don't know something specific to the facility, say so plainly: "I don't have that in front of me, but..."
- Aim for 2-4 natural spoken sentences per answer — enough to be genuinely helpful without rambling

You can execute these actions (return ONE if appropriate):
- new_chat: Start a fresh conversation
- open_history / close_history: Toggle chat history sidebar
- open_sops / close_sops: Toggle SOP library sidebar
- open_todos / close_todos: Toggle to-do list sidebar
- open_concern / close_concern: Toggle "Raise a Concern" panel
- open_gdp / close_gdp: Toggle GDP document check
- open_activity / close_activity: Toggle submissions/activity drawer
- start_tour / end_tour: Start/stop guided demo tour
- scroll_bottom: Scroll to latest message
- ask_query: Send a question to the AI chat (params: { "query": "..." })
- search_sops: Search SOP library (params: { "query": "..." })
- switch_lang: Change language (params: { "lang": "en"|"zh"|"es" })
- analyse_trends: Analyse chat history trends
- none: No action, just answer the question

Respond with valid JSON only: { "answer": "...", "action": "...", "params": {} }
The "answer" field must be natural spoken text — no markdown, no bullets, no headers.`;

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
  async function invoke({ question, context, lang, history, sopContext }) {
    const targetLang = LANG_NAMES[lang] || 'English';

    // Build a system prompt with optional context and SOP grounding
    let system = SYSTEM_BASE;
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

    const raw = response.content[0].text;
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
