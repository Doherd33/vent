// Aliased contacts directory — real roles and reporting structure, fictional names.
// Organised by department. Injected into Claude prompt so routing is grounded in real org.

const CONTACTS = [

  // ── QA / DOC CONTROL ──────────────────────────────────────────────────────
  {
    name: 'Sinéad Kelly',
    role: 'QA Manufacturing Lead',
    dept: 'qa', deptLabel: 'QA',
    initials: 'SK', avatarClass: 'av-a',
    areas: ['Upstream', 'Downstream', 'Media Prep'],
    context: 'Document owner for Drug Substance manufacturing SOPs. Raise all upstream deviations, SOP gaps, and change control requests with her first.'
  },
  {
    name: 'Emma Walsh',
    role: 'QA Manufacturing Lead',
    dept: 'qa', deptLabel: 'QA',
    initials: 'EW', avatarClass: 'av-a',
    areas: ['Upstream', 'Downstream', 'QC'],
    context: 'Second QA Manufacturing Lead for DS operations. Deviation management and batch record discrepancies.'
  },
  {
    name: 'Omar Hassan',
    role: 'QMS Lead',
    dept: 'qa', deptLabel: 'QA',
    initials: 'OH', avatarClass: 'av-a',
    areas: ['all'],
    context: 'Manages CAPA, change control, and SOP version control across the site. Relevant when a systemic process gap is identified.'
  },
  {
    name: 'Declan O\'Brien',
    role: 'QA Director',
    dept: 'qa', deptLabel: 'QA',
    initials: 'DO', avatarClass: 'av-a',
    areas: ['all'],
    context: 'QA Director — escalate High-priority deviations and any observation with a regulatory flag.'
  },
  {
    name: 'Patrick Flynn',
    role: 'Senior QP',
    dept: 'qa', deptLabel: 'QA',
    initials: 'PF', avatarClass: 'av-a',
    areas: ['all'],
    context: 'Qualified Person responsible for batch release and regulatory compliance. Relevant for any batch-impacting or release-blocking observation.'
  },
  {
    name: 'Dr. Claire Fitzpatrick',
    role: 'Quality Director of Technical Operations',
    dept: 'qa', deptLabel: 'QA',
    initials: 'CF', avatarClass: 'av-e',
    areas: ['all'],
    context: 'Cross-functional quality authority. Escalate observations with regulatory impact or where multiple departments are involved.'
  },
  {
    name: 'Dr. Niamh O\'Connor',
    role: 'QC Director',
    dept: 'qa', deptLabel: 'QC',
    initials: 'NO', avatarClass: 'av-a',
    areas: ['QC', 'Upstream', 'Downstream'],
    context: 'QC Director — responsible for analytical testing methods, in-process controls, and out-of-specification results.'
  },

  // ── MANUFACTURING / OPERATIONS ────────────────────────────────────────────
  {
    name: 'Ciarán Murphy',
    role: 'Upstream Manufacturing Lead',
    dept: 'ops', deptLabel: 'Manufacturing',
    initials: 'CM', avatarClass: 'av-c',
    areas: ['Upstream'],
    context: 'First-line operational escalation for all upstream bioprocessing observations. Responsible for day-to-day upstream suite operations.'
  },
  {
    name: 'Liu Chen',
    role: 'Bioprocessing Shift Lead',
    dept: 'ops', deptLabel: 'Manufacturing',
    initials: 'LC', avatarClass: 'av-c',
    areas: ['Upstream'],
    context: 'Upstream Shift Lead — direct supervisor for floor-level observations. First contact for immediate operational issues during shift.'
  },
  {
    name: 'Kai Wu',
    role: 'Bioprocessing Shift Lead',
    dept: 'ops', deptLabel: 'Manufacturing',
    initials: 'KW', avatarClass: 'av-c',
    areas: ['Upstream'],
    context: 'Upstream Shift Lead covering alternate shifts. Relevant for observations arising on night or rotating shifts.'
  },
  {
    name: 'Aoife Brennan',
    role: 'Manufacturing Operations Lead',
    dept: 'ops', deptLabel: 'Manufacturing',
    initials: 'AB', avatarClass: 'av-c',
    areas: ['Upstream', 'Downstream', 'Media Prep'],
    context: 'Cross-shift manufacturing operations. Relevant for staffing gaps, recurring shift handover issues, or systemic process observations.'
  },
  {
    name: 'Wei Zhang',
    role: 'Senior Manufacturing Director',
    dept: 'ops', deptLabel: 'Manufacturing',
    initials: 'WZ', avatarClass: 'av-e',
    areas: ['all'],
    context: 'Senior Manufacturing Director — escalate observations with batch impact, production schedule risk, or site-level manufacturing concern.'
  },
  {
    name: 'Mark Dempsey',
    role: 'Operations Director',
    dept: 'ops', deptLabel: 'Operations',
    initials: 'MD', avatarClass: 'av-e',
    areas: ['all'],
    context: 'Operations Director — cross-functional operational issues and site performance. Escalation for sustained or systemic problems.'
  },

  // ── MSAT / PROCESS SCIENCES ───────────────────────────────────────────────
  {
    name: 'Dr. Robert Kim',
    role: 'Senior MSAT Director',
    dept: 'ms', deptLabel: 'MSAT',
    initials: 'RK', avatarClass: 'av-d',
    areas: ['Upstream', 'Media Prep', 'Downstream'],
    context: 'MSAT authority for process parameters, scale-up, and tech transfer. Relevant for out-of-trend parameters, media performance issues, or scientifically complex deviations.'
  },
  {
    name: 'Dr. Sarah Park',
    role: 'MSAT Technical Services Lead',
    dept: 'ms', deptLabel: 'MSAT',
    initials: 'SP', avatarClass: 'av-d',
    areas: ['Upstream', 'Media Prep'],
    context: 'Process support for upstream and media operations. First MSAT contact for cell performance, media formulation, or upstream parameter observations.'
  },

  // ── ENGINEERING ───────────────────────────────────────────────────────────
  {
    name: 'Brian Gallagher',
    role: 'Senior Engineering Director',
    dept: 'eng', deptLabel: 'Engineering',
    initials: 'BG', avatarClass: 'av-b',
    areas: ['all'],
    context: 'Engineering authority for all facility and equipment systems. Escalate when equipment failure or infrastructure issues affect GMP operations.'
  },
  {
    name: 'Sean Doyle',
    role: 'Automation Lead',
    dept: 'eng', deptLabel: 'Engineering',
    initials: 'SD', avatarClass: 'av-b',
    areas: ['Upstream', 'Downstream'],
    context: 'BAS, automation, and control systems. Relevant for observations about sensor calibration, alarm management, or automated process control failures.'
  },
  {
    name: 'Michael Burke',
    role: 'Facilities & Utilities Director',
    dept: 'eng', deptLabel: 'Engineering',
    initials: 'MB', avatarClass: 'av-b',
    areas: ['all'],
    context: 'Cleanroom classification, HVAC, WFI, and environmental monitoring systems. Relevant for facility-related or environmental excursion observations.'
  },
  {
    name: 'Tom Ryan',
    role: 'Maintenance Lead',
    dept: 'eng', deptLabel: 'Engineering',
    initials: 'TR', avatarClass: 'av-b',
    areas: ['all'],
    context: 'Preventive and corrective maintenance for all manufacturing equipment. Relevant for equipment performance, breakdown, or PM scheduling observations.'
  },
  {
    name: 'David Connolly',
    role: 'Plant Engineering Director',
    dept: 'eng', deptLabel: 'Engineering',
    initials: 'DC', avatarClass: 'av-b',
    areas: ['all'],
    context: 'Plant-level engineering projects and capital works. Relevant for observations requiring engineering change or capital investment.'
  },

  // ── EHS ───────────────────────────────────────────────────────────────────
  {
    name: 'Catherine Murphy',
    role: 'EHS Lead',
    dept: 'ops', deptLabel: 'EHS',
    initials: 'CaM', avatarClass: 'av-c',
    areas: ['all'],
    context: 'Safety observations, chemical handling, ergonomics, and environmental compliance. Any safety-related observation must be routed here immediately.'
  },
  {
    name: 'Megan O\'Brien',
    role: 'Senior OpEx Specialist',
    dept: 'ops', deptLabel: 'Operations',
    initials: 'MO', avatarClass: 'av-c',
    areas: ['all'],
    context: 'Operational excellence and continuous improvement. Relevant for process inefficiency observations or observations suitable for a lean/WBS initiative.'
  },

];

function buildContactsContext() {
  const grouped = {};
  CONTACTS.forEach(c => {
    const key = c.deptLabel;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(c);
  });

  return Object.entries(grouped).map(([dept, list]) =>
    `[${dept}]\n` + list.map(c =>
      `• ${c.name} | ${c.role} | dept:"${c.dept}" | deptLabel:"${c.deptLabel}" | initials:"${c.initials}" | avatarClass:"${c.avatarClass}"\n  → ${c.context}`
    ).join('\n')
  ).join('\n\n');
}

module.exports = { CONTACTS, buildContactsContext };
