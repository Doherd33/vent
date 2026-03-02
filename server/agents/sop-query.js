'use strict';

/**
 * agents/sop-query.js — SOPQueryAgent
 *
 * Responsibility: Semantic SOP search + AI-augmented Q&A.
 *   • Retrieve the most relevant SOP chunks for a query
 *   • Synthesise an answer grounded in retrieved content
 *   • Return source references so the UI can link to documents
 *
 * Used by the operator query flow and can be called as a tool from
 * other agents (e.g., AnalystAgent needing deeper SOP context).
 *
 * Input  → { query, area, conversationHistory? }
 * Output → { answer, sources: [{ docId, title, section, excerpt }] }
 */

const SYSTEM = `You are the SOP Query Agent inside Vent — an anonymous improvement intelligence system for a regulated biologics manufacturing facility.

Your job is to answer the operator's question using ONLY the SOP content provided. Follow these rules:

1. Ground every claim in the retrieved SOP sections. Cite specific section numbers.
2. If the SOPs don't cover the question, say so honestly — do NOT fabricate information.
3. If a section has a NOTE or CAUTION, highlight it.
4. Keep answers concise (3-6 sentences) unless the question clearly asks for a longer explanation.
5. Be conversational and helpful — these are floor operators, not regulators.
6. Return valid JSON only — no markdown fences.`;

function makeSopQueryAgent(anthropic, rag) {
  const { getRelevantChunks, buildSopContext } = rag;

  /**
   * @param {object} params
   * @param {string} params.query            The operator's question
   * @param {string} [params.area]           Process area for relevance scoring
   * @param {Array}  [params.conversationHistory]  Prior messages for context
   * @returns {{ answer: string, sources: Array }}
   */
  async function invoke({ query, area = 'General', conversationHistory = [] }) {
    // 1. Retrieve relevant SOP chunks via RAG
    const chunks = await getRelevantChunks(query, area);
    const sopContext = buildSopContext(chunks);

    // Build conversation context if available
    const historyBlock = conversationHistory.length
      ? `Previous conversation:\n${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}\n\n`
      : '';

    // 2. Ask Claude with retrieved context
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `═══ RELEVANT SOP SECTIONS ═══
${sopContext}
═════════════════════════════

${historyBlock}Operator question: "${query}"
Process area: ${area}

Return ONLY valid JSON:
{
  "answer": "your grounded answer",
  "sources": [
    {
      "docId": "WX-SOP-XXXX-XX",
      "title": "document title",
      "section": "section number",
      "excerpt": "brief relevant excerpt (1-2 sentences)"
    }
  ]
}`,
      }],
    });

    const raw = message.content[0].text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(raw);

    console.log(`[SOP-QUERY] "${query.slice(0, 50)}..." → ${result.sources?.length || 0} sources`);

    return {
      answer:  result.answer || 'I could not find a relevant answer in the SOPs.',
      sources: result.sources || [],
    };
  }

  return { invoke };
}

module.exports = makeSopQueryAgent;
