'use strict';

/**
 * prompts/loader.js — Versioned prompt loader
 *
 * Loads prompt templates from Markdown files in the prompts/ directory.
 * Supports version pinning and variable interpolation.
 *
 * Usage:
 *   const { loadPrompt, listVersions } = require('./prompts/loader');
 *
 *   // Load latest version (highest v number)
 *   const system = loadPrompt('classifier');
 *
 *   // Load specific version
 *   const system = loadPrompt('classifier', { version: 1 });
 *
 *   // Load with variable interpolation
 *   const system = loadPrompt('feedback-conversation', {
 *     vars: { targetLang: 'Spanish' }
 *   });
 *
 *   // List available versions
 *   const versions = listVersions('classifier'); // [1]
 */

const fs   = require('fs');
const path = require('path');

const PROMPTS_DIR = path.join(__dirname);

// Cache loaded prompts in memory (cleared on version change)
const cache = new Map();

/**
 * List all available versions for a prompt name.
 * @param {string} name — prompt base name (e.g. 'classifier', 'charlie')
 * @returns {number[]} sorted version numbers ascending
 */
function listVersions(name) {
  const files = fs.readdirSync(PROMPTS_DIR).filter(f =>
    f.startsWith(`${name}.v`) && f.endsWith('.md')
  );

  return files
    .map(f => {
      const match = f.match(/\.v(\d+)\.md$/);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter(v => v !== null)
    .sort((a, b) => a - b);
}

/**
 * Load a versioned prompt template.
 *
 * @param {string} name     — prompt base name (e.g. 'classifier')
 * @param {object} [opts]
 * @param {number} [opts.version]  — specific version; defaults to latest
 * @param {object} [opts.vars]     — variables to interpolate: {{key}} → value
 * @param {boolean} [opts.noCache] — bypass cache
 * @returns {string} rendered prompt text
 * @throws if prompt file not found
 */
function loadPrompt(name, opts = {}) {
  const versions = listVersions(name);
  if (versions.length === 0) {
    throw new Error(`No prompt files found for "${name}" in ${PROMPTS_DIR}`);
  }

  const version = opts.version || versions[versions.length - 1]; // latest
  const filename = `${name}.v${version}.md`;
  const filepath = path.join(PROMPTS_DIR, filename);

  if (!fs.existsSync(filepath)) {
    throw new Error(`Prompt not found: ${filename}`);
  }

  // Check cache
  const cacheKey = filepath;
  if (!opts.noCache && cache.has(cacheKey)) {
    return interpolate(cache.get(cacheKey), opts.vars);
  }

  const text = fs.readFileSync(filepath, 'utf-8').trim();
  cache.set(cacheKey, text);

  return interpolate(text, opts.vars);
}

/**
 * Replace {{key}} placeholders with values from vars object.
 */
function interpolate(text, vars) {
  if (!vars || Object.keys(vars).length === 0) return text;

  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (key in vars) return String(vars[key]);
    return `{{${key}}}`; // leave unmatched placeholders
  });
}

/**
 * Clear the prompt cache (useful in tests or hot-reload scenarios).
 */
function clearCache() {
  cache.clear();
}

/**
 * Get metadata about all available prompts.
 * @returns {Array<{name: string, versions: number[], latestVersion: number}>}
 */
function listPrompts() {
  const files = fs.readdirSync(PROMPTS_DIR).filter(f => f.endsWith('.md') && f.includes('.v'));
  const names = new Set(files.map(f => f.replace(/\.v\d+\.md$/, '')));

  return Array.from(names).sort().map(name => {
    const versions = listVersions(name);
    return { name, versions, latestVersion: versions[versions.length - 1] };
  });
}

module.exports = { loadPrompt, listVersions, listPrompts, clearCache };
