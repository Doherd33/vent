// ── Shared Utilities ──────────────────────────────────────────────────────────
// Common functions used across multiple modules. Import what you need:
//   import { escHtml } from '/shared/utils.js';
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Escape a string for safe insertion into HTML.
 * Prevents XSS by converting &, <, >, " into their HTML entities.
 */
export function escHtml(s) {
  return s
    ? String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    : '';
}
