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

/** EQ-1000 … EQ-9999 */
function equipId() {
  return 'EQ-' + Math.floor(1000 + Math.random() * 8999);
}

/** EQLOG-1000 … EQLOG-9999 */
function equipLogId() {
  return 'EQLOG-' + Math.floor(1000 + Math.random() * 8999);
}

/** signoff-<timestamp>-<random> */
function signoffId() {
  return `signoff-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/** DEV-1000 … DEV-9999 */
function deviationId() {
  return 'DEV-' + Math.floor(1000 + Math.random() * 8999);
}

/** INOC-1000 … INOC-9999  (incubator units) */
function inocId() {
  return 'INOC-' + Math.floor(1000 + Math.random() * 8999);
}

/** ILOG-1000 … ILOG-9999  (incubator log entries) */
function inocLogId() {
  return 'ILOG-' + Math.floor(1000 + Math.random() * 8999);
}

/** IALM-1000 … IALM-9999  (incubator alarms) */
function inocAlarmId() {
  return 'IALM-' + Math.floor(1000 + Math.random() * 8999);
}

/** ICAL-1000 … ICAL-9999  (incubator calibrations) */
function inocCalId() {
  return 'ICAL-' + Math.floor(1000 + Math.random() * 8999);
}

/** IMNT-1000 … IMNT-9999  (incubator maintenance) */
function inocMntId() {
  return 'IMNT-' + Math.floor(1000 + Math.random() * 8999);
}

/** MP-1000 … MP-9999 */
function mediaPrepId() {
  return 'MP-' + Math.floor(1000 + Math.random() * 8999);
}

/** TRN-1000 … TRN-9999 */
function trainingId() {
  return 'TRN-' + Math.floor(1000 + Math.random() * 8999);
}

module.exports = { submissionRef, capaId, equipId, equipLogId, signoffId, deviationId, inocId, inocLogId, inocAlarmId, inocCalId, inocMntId, mediaPrepId, trainingId };
