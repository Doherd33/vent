// ── AI ASSIST ACTIONS ──
let _aiInProgress = false;

async function runAiAssist(docId, action) {
  if (_aiInProgress) return;
  const doc = documents.find(d => d.id === docId);
  if (!doc) return;

  // Find the step being edited, or fall back to first step
  let step = null;
  const titleEl = document.getElementById('editStepTitle');
  const contentEl = document.getElementById('editStepContent');
  const noteEl = document.getElementById('editStepNote');

  if (titleEl && contentEl) {
    // We're in step edit mode — use the form values
    const editingStep = doc.steps.find(s => s.title === titleEl.value.trim() || document.querySelector('.doc-step.editing'));
    step = editingStep || doc.steps[0];
  } else if (activeStepTab) {
    step = doc.steps.find(s => s.id === activeStepTab);
  }

  if (!step) {
    // No step selected — prompt user to select one
    const rc = document.getElementById('rightContent');
    rc.innerHTML = '<div class="fade-in" style="padding:20px;text-align:center">' +
      '<div style="font-size:24px;margin-bottom:12px">✏️</div>' +
      '<p style="font-size:13px;color:var(--mid)">Click the edit icon on a step first,<br>then use AI Assist to improve it.</p>' +
    '</div>';
    return;
  }

  const labels = { rewrite: 'Rewriting for clarity', expand: 'Expanding details', safety: 'Adding safety notes', format: 'Formatting as SOP' };

  _aiInProgress = true;
  const rc = document.getElementById('rightContent');
  const prevContent = rc.innerHTML;

  rc.innerHTML = '<div class="fade-in" style="padding:24px;text-align:center">' +
    '<div style="font-size:28px;margin-bottom:14px;animation:breathe 1.5s ease-in-out infinite">✨</div>' +
    '<div style="font-size:13px;color:var(--accent);font-weight:500;margin-bottom:6px">' + labels[action] + '…</div>' +
    '<div style="font-size:11px;color:var(--dim)">Step: ' + esc(step.title) + '</div>' +
  '</div>';

  try {
    const stepContent = contentEl ? contentEl.value.trim() : step.content;
    const stepTitle = titleEl ? titleEl.value.trim() : step.title;
    const stepNote = noteEl ? noteEl.value.trim() : (step.note || '');

    const resp = await authFetch(SERVER + '/docs/ai-assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        stepTitle,
        stepContent,
        stepNote,
        docTitle: doc.title,
        area: doc.area
      })
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'AI assist failed');

    // Show the result with accept/reject
    rc.innerHTML = '<div class="fade-in">' +
      '<div class="ai-suggestion">' +
        '<div class="ai-suggestion-header">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' +
          labels[action].toUpperCase() +
        '</div>' +
        '<div style="margin-bottom:8px">' +
          '<div class="edit-label" style="font-size:9px;margin-bottom:4px">Title</div>' +
          '<div style="font-size:13px;color:var(--text);font-weight:400;margin-bottom:10px">' + esc(data.title || step.title) + '</div>' +
          '<div class="edit-label" style="font-size:9px;margin-bottom:4px">Content</div>' +
          '<div style="font-size:12px;color:var(--mid);line-height:1.7;margin-bottom:10px;white-space:pre-line">' + esc(data.content || step.content) + '</div>' +
          (data.note ? '<div class="step-note" style="margin-bottom:0">⚠ ' + esc(data.note) + '</div>' : '') +
        '</div>' +
        '<div class="ai-suggestion-actions">' +
          '<button class="edit-btn primary" onclick="acceptAiResult(\'' + docId + '\',\'' + step.id + '\')">Accept</button>' +
          '<button class="edit-btn" onclick="editStep(\'' + docId + '\',\'' + step.id + '\')">Reject</button>' +
        '</div>' +
      '</div>' +
    '</div>';

    // Store for acceptance
    window._pendingAiResult = data;

    logActivity('AI ' + action + ' completed for "' + step.title + '"', 'action');

  } catch (err) {
    rc.innerHTML = '<div class="fade-in" style="padding:20px">' +
      '<div style="color:var(--red);font-size:12px;margin-bottom:10px">AI Assist Error: ' + esc(err.message) + '</div>' +
      '<button class="edit-btn" onclick="editStep(\'' + docId + '\',\'' + step.id + '\')">Back to Editor</button>' +
    '</div>';
    logActivity('AI ' + action + ' failed: ' + err.message, 'warn');
  } finally {
    _aiInProgress = false;
  }
}

function acceptAiResult(docId, stepId) {
  const data = window._pendingAiResult;
  if (!data) return;

  const doc = documents.find(d => d.id === docId);
  if (!doc) return;
  const step = doc.steps.find(s => s.id === stepId);
  if (!step) return;

  step.title = data.title || step.title;
  step.content = data.content || step.content;
  step.note = data.note || step.note;
  doc.updated = new Date().toISOString();
  doc.versions.push({ time: doc.updated, label: 'AI-assisted update to "' + step.title + '"', user: userName });

  saveDocs(documents, activeDocId);
  renderDocView(doc);
  renderDocList();
  editStep(docId, stepId);
  logActivity('Accepted AI suggestion for "' + step.title + '"', 'action');
  window._pendingAiResult = null;
}

function aiRewrite(docId)  { runAiAssist(docId, 'rewrite'); }
function aiExpand(docId)   { runAiAssist(docId, 'expand'); }
function aiSafety(docId)   { runAiAssist(docId, 'safety'); }
function aiFormat(docId)   { runAiAssist(docId, 'format'); }

// ── GENERATE STEPS FROM SOP ──
async function openGenerateFromSOP(docId) {
  const doc = documents.find(d => d.id === docId);
  if (!doc) return;

  // Switch to AI tab
  activeRightTab = 'ai';
  document.querySelector('.right-panel-header .right-tabs').innerHTML =
    '<div class="right-tab" data-tab="edit" onclick="switchRightTab(this)">Edit</div>' +
    '<div class="right-tab active" data-tab="ai" onclick="switchRightTab(this)">AI Assist</div>' +
    '<div class="right-tab" data-tab="versions" onclick="switchRightTab(this)">Versions</div>';

  const rc = document.getElementById('rightContent');
  rc.innerHTML = '<div class="fade-in" style="padding:4px">' +
    '<div class="ai-suggestion">' +
      '<div class="ai-suggestion-header">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' +
        'GENERATE FROM SOP' +
      '</div>' +
      '<div class="ai-suggestion-text">Select an SOP and AI will generate a complete set of document steps with procedures, parameters, and safety notes.</div>' +
    '</div>' +
    '<div class="edit-section">' +
      '<div class="edit-label">Search for an SOP</div>' +
      '<div style="display:flex;gap:6px;margin-top:6px">' +
        '<input type="text" id="genSopSearchInput" placeholder="e.g. BPR-001 or bioreactor…" style="flex:1;background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:8px 10px;color:var(--text);font-size:12px;font-family:DM Sans,sans-serif;outline:none" onkeydown="if(event.key===\'Enter\')searchSOPsForGenerate()">' +
        '<button class="edit-btn primary" onclick="searchSOPsForGenerate()" style="white-space:nowrap">Search</button>' +
      '</div>' +
      '<div id="genSopResults" style="margin-top:10px"></div>' +
    '</div>' +
  '</div>';

  setTimeout(() => {
    const inp = document.getElementById('genSopSearchInput');
    if (inp) inp.focus();
    searchSOPsForGenerate(); // show all SOPs immediately
  }, 50);
}

async function searchSOPsForGenerate() {
  const inp = document.getElementById('genSopSearchInput');
  const results = document.getElementById('genSopResults');
  if (!inp || !results) return;
  const q = inp.value.trim();

  results.innerHTML = '<div style="font-size:11px;color:var(--mid);padding:8px 0;display:flex;align-items:center;gap:6px"><div class="dot" style="width:6px;height:6px;border-radius:50%;background:var(--accent);animation:breathe 1.5s ease-in-out infinite"></div> Searching…</div>';

  try {
    const url = q.length >= 2 ? SERVER + '/sop/search?q=' + encodeURIComponent(q) : SERVER + '/sop/search';
    const res = await authFetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Search failed');

    // Group by doc_id to show unique SOPs
    const seen = {};
    const unique = data.filter(row => {
      if (seen[row.doc_id]) return false;
      seen[row.doc_id] = true;
      return true;
    });

    if (!unique.length) {
      results.innerHTML = '<div style="font-size:11px;color:var(--dim);padding:8px 0">No SOPs found.</div>';
      return;
    }

    results.innerHTML = unique.map(row =>
      '<div style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;margin-bottom:4px;cursor:pointer;transition:all .12s;background:var(--s2)" ' +
        'onmouseover="this.style.borderColor=\'var(--accent)\';this.style.background=\'var(--accent2)\'" ' +
        'onmouseout="this.style.borderColor=\'var(--border)\';this.style.background=\'var(--s2)\'" ' +
        'onclick="generateFromSOP(\'' + esc(row.doc_id) + '\')">' +
        '<div style="font-size:12px;color:var(--accent);font-weight:500">' + esc(row.doc_id) + '</div>' +
        '<div style="font-size:11px;color:var(--mid);margin-top:2px">' + esc(row.section_title) + '</div>' +
      '</div>'
    ).join('');

  } catch (err) {
    results.innerHTML = '<div style="color:var(--red);font-size:11px;padding:8px 0">Error: ' + esc(err.message) + '</div>';
  }
}

async function generateFromSOP(sopDocId) {
  const doc = documents.find(d => d.id === activeDocId);
  if (!doc) return;

  const rc = document.getElementById('rightContent');
  rc.innerHTML = '<div class="fade-in" style="padding:24px;text-align:center">' +
    '<div style="font-size:32px;margin-bottom:14px;animation:breathe 1.5s ease-in-out infinite">🧬</div>' +
    '<div style="font-size:13px;color:var(--accent);font-weight:500;margin-bottom:6px">Generating steps from ' + esc(sopDocId) + '…</div>' +
    '<div style="font-size:11px;color:var(--dim)">AI is reading the SOP and creating document steps</div>' +
  '</div>';

  try {
    const resp = await authFetch(SERVER + '/docs/generate-steps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId: sopDocId })
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Generation failed');

    if (!data.steps || !data.steps.length) throw new Error('No steps generated');

    // Show preview with accept/reject
    let previewHtml = '<div class="fade-in">' +
      '<div class="ai-suggestion">' +
        '<div class="ai-suggestion-header">GENERATED FROM ' + esc(sopDocId) + '</div>' +
        '<div class="ai-suggestion-text">' + esc(data.description || '') + '</div>' +
      '</div>' +
      '<div style="margin:12px 0">';

    data.steps.forEach((s, i) => {
      previewHtml += '<div style="display:flex;gap:8px;margin-bottom:8px">' +
        '<div class="step-number" style="width:22px;height:22px;font-size:10px;flex-shrink:0">' + (i + 1) + '</div>' +
        '<div style="min-width:0">' +
          '<div style="font-size:12px;color:var(--text);font-weight:400;margin-bottom:2px">' + esc(s.title) + '</div>' +
          '<div style="font-size:11px;color:var(--dim);line-height:1.5;max-height:40px;overflow:hidden">' + esc(s.content.substring(0, 120)) + (s.content.length > 120 ? '…' : '') + '</div>' +
          (s.note ? '<div style="font-size:10px;color:var(--gold);margin-top:2px">⚠ ' + esc(s.note.substring(0, 80)) + '</div>' : '') +
        '</div>' +
      '</div>';
    });

    previewHtml += '</div>' +
      '<div style="background:var(--gold2);border-left:3px solid var(--gold);padding:10px 12px;border-radius:0 6px 6px 0;margin-bottom:14px;font-size:11px;color:var(--gold)">' +
        'This will replace all existing steps in "' + esc(doc.title) + '" with ' + data.steps.length + ' new steps.' +
      '</div>' +
      '<div class="edit-actions">' +
        '<button class="edit-btn primary" onclick="acceptGeneratedSteps()">Accept ' + data.steps.length + ' Steps</button>' +
        '<button class="edit-btn" onclick="renderRightPanelAI(documents.find(d=>d.id===\'' + doc.id + '\'))">Cancel</button>' +
      '</div>' +
    '</div>';

    rc.innerHTML = previewHtml;

    // Store for acceptance
    window._pendingGeneratedSteps = data;
    logActivity('Generated ' + data.steps.length + ' steps from ' + sopDocId, 'action');

  } catch (err) {
    rc.innerHTML = '<div class="fade-in" style="padding:20px">' +
      '<div style="color:var(--red);font-size:12px;margin-bottom:10px">Generation Error: ' + esc(err.message) + '</div>' +
      '<button class="edit-btn" onclick="openGenerateFromSOP(\'' + activeDocId + '\')">Try Again</button>' +
    '</div>';
    logActivity('Step generation failed: ' + err.message, 'warn');
  }
}

function acceptGeneratedSteps() {
  const data = window._pendingGeneratedSteps;
  if (!data || !data.steps) return;

  const doc = documents.find(d => d.id === activeDocId);
  if (!doc) return;

  // Update document title/description if provided
  if (data.title) doc.title = data.title;
  if (data.description) doc.description = data.description;

  // Replace steps
  doc.steps = data.steps.map((s, i) => ({
    id: 's' + Date.now() + '_' + i,
    title: s.title,
    content: s.content,
    note: s.note || ''
  }));

  doc.updated = new Date().toISOString();
  doc.versions.push({ time: doc.updated, label: 'AI-generated ' + data.steps.length + ' steps from SOP', user: userName });

  saveDocs(documents, activeDocId);
  renderDocView(doc);
  renderEditorTabs();
  renderDocList();
  renderRightPanelAI(doc);
  logActivity('Accepted ' + data.steps.length + ' AI-generated steps for "' + doc.title + '"', 'action');
  window._pendingGeneratedSteps = null;
}

// ── COMPLIANCE CHECKER ──
async function runComplianceCheck(docId) {
  const doc = documents.find(d => d.id === docId);
  if (!doc || !doc.steps.length) return;

  // Switch to AI tab
  activeRightTab = 'ai';
  document.querySelector('.right-panel-header .right-tabs').innerHTML =
    '<div class="right-tab" data-tab="edit" onclick="switchRightTab(this)">Edit</div>' +
    '<div class="right-tab active" data-tab="ai" onclick="switchRightTab(this)">AI Assist</div>' +
    '<div class="right-tab" data-tab="versions" onclick="switchRightTab(this)">Versions</div>';

  const rc = document.getElementById('rightContent');
  rc.innerHTML = '<div class="fade-in" style="padding:24px;text-align:center">' +
    '<div style="font-size:32px;margin-bottom:14px;animation:breathe 1.5s ease-in-out infinite">🔍</div>' +
    '<div style="font-size:13px;color:var(--accent);font-weight:500;margin-bottom:6px">Running compliance review…</div>' +
    '<div style="font-size:11px;color:var(--dim)">Checking ' + doc.steps.length + ' steps against GMP standards</div>' +
  '</div>';

  try {
    const resp = await authFetch(SERVER + '/docs/compliance-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        docTitle: doc.title,
        area: doc.area,
        steps: doc.steps.map(s => ({ title: s.title, content: s.content, note: s.note || '' }))
      })
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Compliance check failed');

    renderComplianceResults(doc, data);
    logActivity('Compliance review completed for "' + doc.title + '" — Score: ' + data.score + '/100', 'action');

  } catch (err) {
    rc.innerHTML = '<div class="fade-in" style="padding:20px">' +
      '<div style="color:var(--red);font-size:12px;margin-bottom:10px">Compliance Check Error: ' + esc(err.message) + '</div>' +
      '<button class="edit-btn" onclick="renderRightPanelAI(documents.find(d=>d.id===\'' + docId + '\'))">Back</button>' +
    '</div>';
    logActivity('Compliance check failed: ' + err.message, 'warn');
  }
}

function renderComplianceResults(doc, data) {
  const rc = document.getElementById('rightContent');

  const gradeColors = {
    'A': 'var(--green)', 'B': 'var(--accent)', 'C': 'var(--gold)',
    'D': '#e87040', 'F': 'var(--red)'
  };
  const statusIcons = {
    'pass': '<span style="color:var(--green);font-size:12px">&#x2714;</span>',
    'warn': '<span style="color:var(--gold);font-size:12px">&#x26A0;</span>',
    'fail': '<span style="color:var(--red);font-size:12px">&#x2716;</span>'
  };
  const catLabels = {
    'safety': 'Safety / PPE', 'criteria': 'Acceptance Criteria', 'terminology': 'Terminology',
    'signoff': 'Sign-off Points', 'sop_deviation': 'SOP Deviation', 'materials': 'Materials',
    'completeness': 'Completeness', 'gmp_format': 'GMP Format'
  };

  const gradeColor = gradeColors[data.grade] || 'var(--mid)';
  const passes = (data.checks || []).filter(c => c.status === 'pass').length;
  const warns = (data.checks || []).filter(c => c.status === 'warn').length;
  const fails = (data.checks || []).filter(c => c.status === 'fail').length;

  let html = '<div class="fade-in">';

  // Score header
  html += '<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid var(--border)">' +
    '<div style="width:56px;height:56px;border-radius:50%;border:3px solid ' + gradeColor + ';display:flex;align-items:center;justify-content:center;flex-shrink:0">' +
      '<span style="font-size:22px;font-weight:700;color:' + gradeColor + ';font-family:JetBrains Mono,monospace">' + data.score + '</span>' +
    '</div>' +
    '<div>' +
      '<div style="font-size:14px;color:var(--text);font-weight:500">Grade: <span style="color:' + gradeColor + '">' + data.grade + '</span></div>' +
      '<div style="font-size:11px;color:var(--mid);line-height:1.5;margin-top:4px">' + esc(data.summary || '') + '</div>' +
    '</div>' +
  '</div>';

  // Summary counts
  html += '<div style="display:flex;gap:8px;margin-bottom:14px">' +
    '<div style="flex:1;text-align:center;padding:8px;background:var(--green2);border-radius:6px"><div style="font-size:18px;font-weight:700;color:var(--green)">' + passes + '</div><div style="font-size:9px;color:var(--green);text-transform:uppercase;letter-spacing:.05em">Pass</div></div>' +
    '<div style="flex:1;text-align:center;padding:8px;background:var(--gold2);border-radius:6px"><div style="font-size:18px;font-weight:700;color:var(--gold)">' + warns + '</div><div style="font-size:9px;color:var(--gold);text-transform:uppercase;letter-spacing:.05em">Warn</div></div>' +
    '<div style="flex:1;text-align:center;padding:8px;background:var(--red2);border-radius:6px"><div style="font-size:18px;font-weight:700;color:var(--red)">' + fails + '</div><div style="font-size:9px;color:var(--red);text-transform:uppercase;letter-spacing:.05em">Fail</div></div>' +
  '</div>';

  // Check items — failures first, then warnings, then passes
  const sorted = (data.checks || []).sort((a, b) => {
    const order = { fail: 0, warn: 1, pass: 2 };
    return (order[a.status] || 2) - (order[b.status] || 2);
  });

  sorted.forEach(c => {
    const bgColor = c.status === 'fail' ? 'var(--red2)' : c.status === 'warn' ? 'var(--gold2)' : 'var(--s2)';
    const borderColor = c.status === 'fail' ? 'var(--red)' : c.status === 'warn' ? 'var(--gold)' : 'var(--border)';
    html += '<div style="background:' + bgColor + ';border:1px solid ' + borderColor + ';border-radius:6px;padding:10px 12px;margin-bottom:6px">' +
      '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">' +
        (statusIcons[c.status] || '') +
        '<span style="font-size:11px;font-weight:500;color:var(--text)">' + esc(c.title) + '</span>' +
        '<span style="margin-left:auto;font-size:9px;color:var(--dim);font-family:JetBrains Mono,monospace">' + esc(c.stepRef || '') + '</span>' +
      '</div>' +
      '<div style="font-size:11px;color:var(--mid);line-height:1.5">' + esc(c.detail) + '</div>' +
      '<div style="font-size:9px;color:var(--dim);margin-top:4px;text-transform:uppercase;letter-spacing:.04em">' + (catLabels[c.category] || c.category) + '</div>' +
    '</div>';
  });

  // Recommendations
  if (data.recommendations && data.recommendations.length) {
    html += '<div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border)">' +
      '<div class="edit-label" style="margin-bottom:8px">Priority Recommendations</div>';
    data.recommendations.forEach((r, i) => {
      html += '<div style="display:flex;gap:8px;margin-bottom:6px">' +
        '<div style="width:18px;height:18px;border-radius:4px;background:var(--accent2);color:var(--accent);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;flex-shrink:0">' + (i + 1) + '</div>' +
        '<div style="font-size:12px;color:var(--text);line-height:1.5">' + esc(r) + '</div>' +
      '</div>';
    });
    html += '</div>';
  }

  // Re-run button
  html += '<div style="margin-top:16px;display:flex;gap:6px">' +
    '<button class="edit-btn" onclick="runComplianceCheck(\'' + doc.id + '\')"><span style="margin-right:4px">🔍</span> Re-check</button>' +
    '<button class="edit-btn" onclick="renderRightPanelAI(documents.find(d=>d.id===\'' + doc.id + '\'))">Back to AI Assist</button>' +
  '</div>';

  html += '</div>';
  rc.innerHTML = html;
}

