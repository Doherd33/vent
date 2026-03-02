'use strict';

/**
 * lib/parse-claude-json.js — Safe JSON extraction from Claude responses
 *
 * Claude sometimes wraps JSON in markdown fences or adds preamble text.
 * This helper strips that reliably and returns parsed JSON.
 */

/**
 * @param {string} raw - Raw text from Claude's response content block
 * @returns {object} Parsed JSON object
 * @throws {SyntaxError} If the text cannot be parsed as JSON after cleaning
 */
function parseClaudeJson(raw) {
  // Strip markdown fences (```json … ``` or ``` … ```)
  let cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();

  // If the response starts with text before the JSON, find the first { or [
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let start = -1;

  if (firstBrace >= 0 && firstBracket >= 0) {
    start = Math.min(firstBrace, firstBracket);
  } else if (firstBrace >= 0) {
    start = firstBrace;
  } else if (firstBracket >= 0) {
    start = firstBracket;
  }

  if (start > 0) {
    cleaned = cleaned.slice(start);
  }

  return JSON.parse(cleaned);
}

module.exports = parseClaudeJson;
