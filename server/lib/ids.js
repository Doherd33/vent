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

/** SUP-1000 … SUP-9999 */
function supplierId() {
  return 'SUP-' + Math.floor(1000 + Math.random() * 8999);
}

/** SAUD-1000 … SAUD-9999 */
function supplierAuditId() {
  return 'SAUD-' + Math.floor(1000 + Math.random() * 8999);
}

/** QAG-1000 … QAG-9999 */
function qualityAgreementId() {
  return 'QAG-' + Math.floor(1000 + Math.random() * 8999);
}

/** HO-1000 … HO-9999 */
function handoverId() {
  return 'HO-' + Math.floor(1000 + Math.random() * 8999);
}

/** CLN-1000 … CLN-9999 */
function cleaningId() {
  return 'CLN-' + Math.floor(1000 + Math.random() * 8999);
}

// ── Round 3 ──────────────────────────────────────────────

/** CC-1000 … CC-9999 */
function changeControlId() {
  return 'CC-' + Math.floor(1000 + Math.random() * 8999);
}

/** CCAP-1000 … CCAP-9999 */
function ccApprovalId() {
  return 'CCAP-' + Math.floor(1000 + Math.random() * 8999);
}

/** CCIA-1000 … CCIA-9999 */
function ccImpactId() {
  return 'CCIA-' + Math.floor(1000 + Math.random() * 8999);
}

/** CCTK-1000 … CCTK-9999 */
function ccTaskId() {
  return 'CCTK-' + Math.floor(1000 + Math.random() * 8999);
}

/** COMP-1000 … COMP-9999 */
function complaintId() {
  return 'COMP-' + Math.floor(1000 + Math.random() * 8999);
}

/** RCL-1000 … RCL-9999 */
function recallId() {
  return 'RCL-' + Math.floor(1000 + Math.random() * 8999);
}

/** DISP-1000 … DISP-9999 */
function dispositionId() {
  return 'DISP-' + Math.floor(1000 + Math.random() * 8999);
}

/** DCHK-1000 … DCHK-9999 */
function dispositionCheckId() {
  return 'DCHK-' + Math.floor(1000 + Math.random() * 8999);
}

/** CERT-1000 … CERT-9999 */
function certRegisterId() {
  return 'CERT-' + Math.floor(1000 + Math.random() * 8999);
}

/** QCS-1000 … QCS-9999 (QC samples) */
function qcSampleId() {
  return 'QCS-' + Math.floor(1000 + Math.random() * 8999);
}

/** QCT-1000 … QCT-9999 (QC tests) */
function qcTestId() {
  return 'QCT-' + Math.floor(1000 + Math.random() * 8999);
}

/** QCR-1000 … QCR-9999 (QC results) */
function qcResultId() {
  return 'QCR-' + Math.floor(1000 + Math.random() * 8999);
}

/** QCI-1000 … QCI-9999 (QC instruments) */
function qcInstrumentId() {
  return 'QCI-' + Math.floor(1000 + Math.random() * 8999);
}

/** QCAQ-1000 … QCAQ-9999 (QC analyst qualifications) */
function qcQualificationId() {
  return 'QCAQ-' + Math.floor(1000 + Math.random() * 8999);
}

/** QCM-1000 … QCM-9999 (QC test methods) */
function qcMethodId() {
  return 'QCM-' + Math.floor(1000 + Math.random() * 8999);
}

/** QCTP-1000 … QCTP-9999 (QC test templates) */
function qcTemplateId() {
  return 'QCTP-' + Math.floor(1000 + Math.random() * 8999);
}

/** CB-1000 … CB-9999  (cell banks) */
function cellBankId() {
  return 'CB-' + Math.floor(1000 + Math.random() * 8999);
}

/** CBV-1000 … CBV-9999  (cell bank vials) */
function cellBankVialId() {
  return 'CBV-' + Math.floor(1000 + Math.random() * 8999);
}

/** CBT-1000 … CBT-9999  (cell bank transactions) */
function cellBankTransactionId() {
  return 'CBT-' + Math.floor(1000 + Math.random() * 8999);
}

/** CBTEST-1000 … CBTEST-9999  (cell bank testing) */
function cellBankTestId() {
  return 'CBTEST-' + Math.floor(1000 + Math.random() * 8999);
}

module.exports = { submissionRef, capaId, equipId, equipLogId, signoffId, deviationId, inocId, inocLogId, inocAlarmId, inocCalId, inocMntId, mediaPrepId, trainingId, supplierId, supplierAuditId, qualityAgreementId, handoverId, cleaningId, changeControlId, ccApprovalId, ccImpactId, ccTaskId, complaintId, recallId, dispositionId, dispositionCheckId, certRegisterId, qcSampleId, qcTestId, qcResultId, qcInstrumentId, qcQualificationId, qcMethodId, qcTemplateId, cellBankId, cellBankVialId, cellBankTransactionId, cellBankTestId };
