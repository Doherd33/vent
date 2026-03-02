'use strict';

/**
 * lib/ids.js — Centralised ID generation
 *
 * All entity identifiers are created here so the format is consistent,
 * easy to find, and simple to swap out for UUIDs later.
 */

/** VNT-1000 … VNT-9999 */
function submissionRef() {
  return 'VNT-' + Math.floor(1000 + Math.random() * 8999);
}

/** CAPA-1000 … CAPA-9999 */
function capaId() {
  return 'CAPA-' + Math.floor(1000 + Math.random() * 8999);
}

/** signoff-<timestamp>-<random> */
function signoffId() {
  return `signoff-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

module.exports = { submissionRef, capaId, signoffId };
