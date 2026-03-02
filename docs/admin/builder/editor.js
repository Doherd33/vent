// ── STEP MANAGEMENT ──
function addStep(docId) {
  const doc = documents.find(d => d.id === docId);
  if (!doc) return;
  const num = doc.steps.length + 1;
  doc.steps.push({
    id: 's' + Date.now(),
    title: 'Step ' + num,
    content: 'Describe this step…',
    note: ''
  });
  doc.updated = new Date().toISOString();
  doc.versions.push({ time: doc.updated, label: 'Added step ' + num, user: userName });
  saveDocs(documents, doc.id);
  renderDocView(doc);
  renderRightPanel(doc);
  renderDocList();
  logActivity('Added step ' + num + ' to "' + doc.title + '"', 'action');
}

function deleteStep(docId, stepId) {
  const doc = documents.find(d => d.id === docId);
  if (!doc || doc.steps.length <= 1) return;
  const idx = doc.steps.findIndex(s => s.id === stepId);
  const title = doc.steps[idx]?.title || 'Step';
  doc.steps = doc.steps.filter(s => s.id !== stepId);
  doc.updated = new Date().toISOString();
  doc.versions.push({ time: doc.updated, label: 'Deleted "' + title + '"', user: userName });
  saveDocs(documents, doc.id);

  // Remove from step tabs
  closeStepTab(stepId);

  renderDocView(doc);
  renderDocList();
  logActivity('Deleted step "' + title + '" from "' + doc.title + '"', 'warn');
}

function editStep(docId, stepId) {
  const doc = documents.find(d => d.id === docId);
  if (!doc) return;
  const step = doc.steps.find(s => s.id === stepId);
  if (!step) return;

  // Clear step tabs — going into edit mode
  openStepTabs = [];
  activeStepTab = null;

  // Switch right panel to edit tab and populate
  activeRightTab = 'edit';
  document.querySelector('.right-panel-header .right-tabs').innerHTML =
    '<div class="right-tab active" data-tab="edit" onclick="switchRightTab(this)">Edit</div>' +
    '<div class="right-tab" data-tab="ai" onclick="switchRightTab(this)">AI Assist</div>' +
    '<div class="right-tab" data-tab="versions" onclick="switchRightTab(this)">Versions</div>';
  renderRightPanelEdit(doc, step);

  // Highlight the step
  document.querySelectorAll('.doc-step').forEach(el => el.classList.remove('editing'));
  const el = document.getElementById('step-' + stepId);
  if (el) el.classList.add('editing');
}

// ── RIGHT PANEL ──
function switchRightTab(tabEl) {
  activeRightTab = tabEl.dataset.tab;
  activeSopTab = null;
  document.querySelectorAll('.right-tab').forEach(t => t.classList.remove('active'));
  tabEl.classList.add('active');

  const doc = documents.find(d => d.id === activeDocId);
  if (doc) renderRightPanel(doc);
  updatePptxBtnState();
}

function renderRightPanel(doc) {
  if (!doc) return;

  // GDP documents: show GDP review panel instead of Edit/AI/Versions
  if (doc.source === 'gdp') {
    document.querySelector('.right-panel-header .right-tabs').innerHTML =
      '<div class="right-tab active" data-tab="gdp-review" style="color:var(--gold)">GDP Review</div>' +
      '<div class="right-tab" data-tab="versions" onclick="switchRightTab(this)">Versions</div>';
    renderGdpRightPanel(doc);
    return;
  }

  // Restore default right panel tabs
  document.querySelector('.right-panel-header .right-tabs').innerHTML =
    '<div class="right-tab' + (activeRightTab === 'edit' ? ' active' : '') + '" data-tab="edit" onclick="switchRightTab(this)">Edit</div>' +
    '<div class="right-tab' + (activeRightTab === 'ai' ? ' active' : '') + '" data-tab="ai" onclick="switchRightTab(this)">AI Assist</div>' +
    '<div class="right-tab' + (activeRightTab === 'versions' ? ' active' : '') + '" data-tab="versions" onclick="switchRightTab(this)">Versions</div>';
  if (activeRightTab === 'edit') {
    renderRightPanelEdit(doc);
  } else if (activeRightTab === 'ai') {
    renderRightPanelAI(doc);
  } else if (activeRightTab === 'versions') {
    renderRightPanelVersions(doc);
  }
}

function renderGdpRightPanel(doc, selectedStepId) {
  const rc = document.getElementById('rightContent');
  const stepId = selectedStepId || (doc.steps.length ? doc.steps[0].id : null);

  // Summary header
  let totalErrors = 0;
  let critCount = 0, majCount = 0, minCount = 0;
  doc.steps.forEach(s => {
    (s.gdpErrors || []).forEach(e => {
      totalErrors++;
      if (e.severity === 'critical') critCount++;
      else if (e.severity === 'major') majCount++;
      else minCount++;
    });
  });

  let html = '<div class="fade-in" style="padding:2px 0">';

  // Summary pills
  html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">';
  if (totalErrors === 0) {
    html += '<span style="font-size:11px;color:var(--green)">✓ All pages clear</span>';
  } else {
    html += '<span style="font-family:JetBrains Mono,monospace;font-size:10px;color:var(--text)">' + totalErrors + ' total issue' + (totalErrors !== 1 ? 's' : '') + '</span>';
    if (critCount) html += '<span style="font-family:JetBrains Mono,monospace;font-size:9px;padding:1px 6px;border-radius:100px;background:var(--red2);color:var(--red)">' + critCount + ' critical</span>';
    if (majCount) html += '<span style="font-family:JetBrains Mono,monospace;font-size:9px;padding:1px 6px;border-radius:100px;background:var(--gold2);color:var(--gold)">' + majCount + ' major</span>';
    if (minCount) html += '<span style="font-family:JetBrains Mono,monospace;font-size:9px;padding:1px 6px;border-radius:100px;background:rgba(0,122,204,.08);color:var(--accent)">' + minCount + ' minor</span>';
  }
  html += '</div>';
  html += '<div style="border-bottom:1px solid var(--border);margin-bottom:12px"></div>';

  // Page-by-page findings
  doc.steps.forEach((step, si) => {
    const errors = step.gdpErrors || [];
    const isSelected = step.id === stepId;
    const hasErrors = errors.length > 0;

    html += '<div style="margin-bottom:12px;border:1px solid ' + (isSelected ? 'var(--accent)' : 'var(--border)') + ';border-radius:8px;overflow:hidden;background:' + (isSelected ? 'rgba(0,122,204,.04)' : 'transparent') + ';cursor:pointer" onclick="gdpSelectPageInBuilder(\'' + doc.id + '\',\'' + step.id + '\')">';

    // Page header
    html += '<div style="padding:8px 12px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border)">' +
      '<span style="font-family:JetBrains Mono,monospace;font-size:10px;color:var(--accent);background:rgba(0,122,204,.08);padding:1px 6px;border-radius:3px">' + (si + 1) + '</span>' +
      '<span style="font-size:11.5px;color:var(--text);flex:1">' + esc(step.title) + '</span>' +
      (hasErrors
        ? '<span style="font-family:JetBrains Mono,monospace;font-size:9px;padding:1px 6px;border-radius:100px;background:var(--red2);color:var(--red)">' + errors.length + '</span>'
        : '<span style="color:var(--green);font-size:10px">✓</span>') +
    '</div>';

    // Findings (only show when selected or when few pages)
    if (isSelected || doc.steps.length <= 3) {
      if (hasErrors) {
        errors.forEach(e => {
          const typeClass = getGdpTypeClass(e.type);
          html += '<div class="gdp-fc" style="margin:6px;margin-bottom:4px">' +
            '<div class="gdp-fc-top">' +
              '<span class="gdp-fc-type ' + typeClass + '">' + esc(e.type || 'GDP') + '</span>' +
              '<span class="gdp-fc-sev ' + (e.severity || 'minor') + '">' + esc(e.severity || 'minor') + '</span>' +
            '</div>' +
            '<div class="gdp-fc-title">' + esc(e.title || '') + '</div>' +
            (e.description ? '<div class="gdp-fc-desc">' + esc(e.description) + '</div>' : '') +
            (e.correction ? '<div class="gdp-fc-fix">Correction: ' + esc(e.correction) + '</div>' : '') +
          '</div>';
        });
      } else {
        html += '<div style="padding:10px 12px;font-size:11px;color:var(--green)">✓ No issues on this page</div>';
      }
    }

    html += '</div>';
  });

  html += '</div>';

  // Sign-off section for GDP documents
  html += buildSignoffSectionHtml(doc);

  rc.innerHTML = html;
}

function gdpSelectPageInBuilder(docId, stepId) {
  // Scroll center panel to the step and highlight it
  const el = document.getElementById('step-' + stepId);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.querySelectorAll('.doc-step').forEach(s => s.classList.remove('editing'));
    el.classList.add('editing');
  }
  // Re-render right panel with this page selected
  const doc = documents.find(d => d.id === docId);
  if (doc) renderGdpRightPanel(doc, stepId);
}

function renderRightPanelEdit(doc, focusStep) {
  const rc = document.getElementById('rightContent');

  // If a specific step is selected, show its editor
  if (focusStep) {
    rc.innerHTML = '<div class="fade-in">' +
      '<div class="edit-section">' +
        '<div class="edit-label">Editing: ' + esc(focusStep.title) + '</div>' +
        '<div class="modal-field" style="margin-bottom:10px">' +
          '<label>Step Title</label>' +
          '<input type="text" id="editStepTitle" value="' + esc(focusStep.title) + '">' +
        '</div>' +
        '<div class="modal-field">' +
          '<label>Content</label>' +
          '<textarea class="edit-textarea" id="editStepContent" style="min-height:140px">' + esc(focusStep.content) + '</textarea>' +
        '</div>' +
        '<div class="modal-field">' +
          '<label>Note / Warning (optional)</label>' +
          '<input type="text" id="editStepNote" value="' + esc(focusStep.note || '') + '" placeholder="e.g. Critical: wear PPE">' +
        '</div>' +
        '<div class="modal-field">' +
          '<label>Attachments</label>' +
          '<div class="media-upload-zone" id="stepDropZone" onclick="triggerStepUpload(\'' + doc.id + '\',\'' + focusStep.id + '\')">' +
            '<div class="media-upload-zone-icon">📎</div>' +
            'Drop files here or click to attach<br>' +
            '<span style="font-size:10px;color:var(--dim)">Images, videos, PDFs, documents</span>' +
          '</div>' +
          '<div class="media-upload-list" id="stepMediaList"></div>' +
        '</div>' +
      '</div>' +
      '<div class="edit-actions">' +
        '<button class="edit-btn primary" onclick="saveStepEdit(\'' + doc.id + '\',\'' + focusStep.id + '\')">Save Changes</button>' +
        '<button class="edit-btn" onclick="renderRightPanelEdit(documents.find(d=>d.id===\'' + doc.id + '\'))">Cancel</button>' +
      '</div>' +
    '</div>';

    // Load existing media into the list
    loadStepMediaList(doc.id, focusStep.id);

    // Setup drag-and-drop on the drop zone
    setTimeout(() => {
      const dz = document.getElementById('stepDropZone');
      if (!dz) return;
      dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
      dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
      dz.addEventListener('drop', async e => {
        e.preventDefault();
        dz.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (!files.length) return;
        for (const file of files) {
          const data = await readFileAsDataURL(file);
          await saveMedia({
            id: 'media-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            docId: doc.id, stepId: focusStep.id,
            name: file.name, mimeType: file.type || 'application/octet-stream',
            size: file.size, data,
            uploadedBy: userName, uploadedAt: new Date().toISOString()
          });
          logActivity('Attached "' + file.name + '" (' + formatFileSize(file.size) + ')', 'action');
        }
        doc.updated = new Date().toISOString();
        doc.versions.push({ time: doc.updated, label: 'Added ' + files.length + ' attachment(s)', user: userName });
        saveDocs(documents, doc.id);
        renderDocList();
        loadStepMedia(doc.id, focusStep.id);
        loadStepMediaList(doc.id, focusStep.id);
      });
    }, 0);

    return;
  }

  // Default: show doc-level edit
  rc.innerHTML = '<div class="fade-in">' +
    '<div class="edit-section">' +
      '<div class="edit-label">Document Settings</div>' +
      '<div class="modal-field" style="margin-bottom:10px">' +
        '<label>Title</label>' +
        '<input type="text" id="editDocTitle" value="' + esc(doc.title) + '">' +
      '</div>' +
      '<div class="modal-field" style="margin-bottom:10px">' +
        '<label>Description</label>' +
        '<textarea class="edit-textarea" id="editDocDesc" style="min-height:60px">' + esc(doc.description || '') + '</textarea>' +
      '</div>' +
      '<div class="modal-field" style="margin-bottom:10px">' +
        '<label>Status</label>' +
        '<select id="editDocStatus" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:6px 8px;color:var(--text);font-size:12px;font-family:inherit">' +
          '<option value="draft"' + (doc.status==='draft' ? ' selected' : '') + '>Draft</option>' +
          '<option value="active"' + (doc.status==='active' ? ' selected' : '') + '>Active</option>' +
          '<option value="archived"' + (doc.status==='archived' ? ' selected' : '') + '>Archived</option>' +
        '</select>' +
      '</div>' +
    '</div>' +
    '<div class="edit-actions">' +
      '<button class="edit-btn primary" onclick="saveDocEdit(\'' + doc.id + '\')">Save</button>' +
      '<button class="edit-btn" style="border-color:var(--red);color:var(--red)" onclick="deleteDoc(\'' + doc.id + '\')">Delete Document</button>' +
    '</div>' +
    '<div class="edit-section" style="margin-top:24px">' +
      '<div class="edit-label">Steps — click a step\'s ✏️ icon to edit it</div>' +
      '<div style="font-size:12px;color:var(--mid);line-height:1.6">' +
        doc.steps.map((s, i) =>
          '<div style="padding:6px 0;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;cursor:pointer" onclick="editStep(\'' + doc.id + '\',\'' + s.id + '\')">' +
            '<span style="color:var(--accent);font-size:11px;font-weight:600;font-family:JetBrains Mono,monospace">' + (i+1) + '</span>' +
            '<span>' + esc(s.title) + '</span>' +
          '</div>'
        ).join('') +
      '</div>' +
    '</div>' +
    buildSignoffSectionHtml(doc) +
  '</div>';
}

function renderRightPanelAI(doc) {
  const rc = document.getElementById('rightContent');

  // Determine which step is selected
  let targetStep = null;
  if (activeStepTab) {
    targetStep = doc.steps.find(s => s.id === activeStepTab);
  }
  const editingEl = document.querySelector('.doc-step.editing');
  if (!targetStep && editingEl) {
    const sid = editingEl.id.replace('step-', '');
    targetStep = doc.steps.find(s => s.id === sid);
  }

  const stepHint = targetStep
    ? '<div style="background:var(--s2);border:1px solid var(--border);border-radius:6px;padding:10px 12px;margin-bottom:14px">' +
        '<div style="font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Target Step</div>' +
        '<div style="font-size:13px;color:var(--text)">' + esc(targetStep.title) + '</div>' +
        '<div style="font-size:11px;color:var(--mid);margin-top:4px;line-height:1.5;max-height:60px;overflow:hidden">' + esc(targetStep.content.substring(0, 120)) + (targetStep.content.length > 120 ? '…' : '') + '</div>' +
      '</div>'
    : '<div style="background:var(--gold2);border-left:3px solid var(--gold);padding:10px 12px;border-radius:0 6px 6px 0;margin-bottom:14px;font-size:11px;color:var(--gold)">Click a step in the document first, then use these actions to improve it.</div>';

  rc.innerHTML = '<div class="fade-in">' +
    '<div class="ai-suggestion">' +
      '<div class="ai-suggestion-header">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' +
        'AI Assist' +
      '</div>' +
      '<div class="ai-suggestion-text">Select a step and use these actions to improve your documentation with AI.</div>' +
    '</div>' +
    stepHint +
    '<div class="edit-section">' +
      '<div class="edit-label">Quick Actions</div>' +
      '<div style="display:flex;flex-direction:column;gap:6px;margin-top:8px">' +
        '<button class="edit-btn" onclick="aiRewrite(\'' + doc.id + '\')" ' + (!targetStep ? 'disabled style="opacity:.4;cursor:default"' : '') + '><span style="margin-right:6px">✨</span> Rewrite for Clarity</button>' +
        '<button class="edit-btn" onclick="aiExpand(\'' + doc.id + '\')" ' + (!targetStep ? 'disabled style="opacity:.4;cursor:default"' : '') + '><span style="margin-right:6px">📝</span> Expand Details</button>' +
        '<button class="edit-btn" onclick="aiSafety(\'' + doc.id + '\')" ' + (!targetStep ? 'disabled style="opacity:.4;cursor:default"' : '') + '><span style="margin-right:6px">⚠️</span> Add Safety Notes</button>' +
        '<button class="edit-btn" onclick="aiFormat(\'' + doc.id + '\')" ' + (!targetStep ? 'disabled style="opacity:.4;cursor:default"' : '') + '><span style="margin-right:6px">📋</span> Format as SOP</button>' +
      '</div>' +
    '</div>' +
    '<div class="edit-section" style="margin-top:16px">' +
      '<div class="edit-label">Document Tools</div>' +
      '<div style="display:flex;flex-direction:column;gap:6px;margin-top:8px">' +
        '<button class="edit-btn" onclick="openGenerateFromSOP(\'' + doc.id + '\')"><span style="margin-right:6px">🧬</span> Generate Steps from SOP</button>' +
        '<button class="edit-btn" onclick="runComplianceCheck(\'' + doc.id + '\')"><span style="margin-right:6px">🔍</span> Compliance Review</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function renderRightPanelVersions(doc) {
  const rc = document.getElementById('rightContent');
  let html = '<div class="fade-in"><div class="edit-label" style="margin-bottom:12px">Version History</div>';
  if (doc.versions.length === 0) {
    html += '<p style="font-size:12px;color:var(--dim)">No versions recorded yet.</p>';
  } else {
    doc.versions.slice().reverse().forEach(v => {
      html += '<div class="version-item">' +
        '<div class="version-dot"></div>' +
        '<div>' +
          '<div class="version-meta">' + formatTime(v.time) + '</div>' +
          '<div class="version-label">' + esc(v.label) + '</div>' +
          '<div style="font-size:10px;color:var(--dim);margin-top:2px">by ' + esc(v.user) + '</div>' +
        '</div>' +
      '</div>';
    });
  }
  html += '</div>';
  rc.innerHTML = html;
}

// ── SAVE OPERATIONS ──
function saveStepEdit(docId, stepId) {
  const doc = documents.find(d => d.id === docId);
  if (!doc) return;
  const step = doc.steps.find(s => s.id === stepId);
  if (!step) return;

  const oldTitle = step.title;
  step.title = document.getElementById('editStepTitle').value.trim() || step.title;
  step.content = document.getElementById('editStepContent').value.trim() || step.content;
  step.note = document.getElementById('editStepNote').value.trim();
  doc.updated = new Date().toISOString();
  doc.versions.push({ time: doc.updated, label: 'Edited step "' + step.title + '"', user: userName });

  saveDocs(documents, doc.id);
  renderDocView(doc);
  renderRightPanelEdit(doc);
  renderDocList();
  logActivity('Saved changes to step "' + step.title + '" in "' + doc.title + '"', 'action');
}

function saveDocEdit(docId) {
  const doc = documents.find(d => d.id === docId);
  if (!doc) return;

  const newTitle = document.getElementById('editDocTitle').value.trim();
  const newDesc = document.getElementById('editDocDesc').value.trim();
  const newStatus = document.getElementById('editDocStatus').value;

  if (newTitle) doc.title = newTitle;
  doc.description = newDesc;
  doc.status = newStatus;
  doc.updated = new Date().toISOString();
  doc.versions.push({ time: doc.updated, label: 'Updated document settings', user: userName });

  saveDocs(documents, doc.id);
  renderDocView(doc);
  renderEditorTabs();
  renderDocList();
  logActivity('Updated document settings for "' + doc.title + '"', 'action');
}

function deleteDoc(docId) {
  const doc = documents.find(d => d.id === docId);
  if (!doc) return;
  if (!confirm('Delete "' + doc.title + '"? This cannot be undone.')) return;

  // Clean up media from IndexedDB
  deleteMediaForDoc(docId);

  documents = documents.filter(d => d.id !== docId);
  saveDocs(documents);
  deleteDocFromServer(docId);
  closeTab(docId);
  updateCounts();
  logActivity('Deleted document: "' + doc.title + '"', 'warn');
}

// ── MEDIA FUNCTIONS ──

// Load and render media for a step in the doc viewer
async function loadStepMedia(docId, stepId, gdpMode) {
  const container = document.getElementById('media-' + stepId);
  if (!container) return;

  const items = await getMediaForStep(docId, stepId);
  if (!items.length) {
    container.innerHTML = '';
    return;
  }

  let html = '';
  items.forEach(m => {
    const type = getMediaType(m.mimeType);
    if (type === 'image' && gdpMode) {
      // GDP mode: full-width image for easy reading
      html += '<div style="cursor:pointer;margin-bottom:6px" onclick="openLightbox(\'' + m.id + '\')" title="Click to enlarge">' +
        '<img class="gdp-step-image" src="' + m.data + '" alt="' + esc(m.name) + '">' +
      '</div>';
    } else if (type === 'image') {
      html += '<div class="media-item" onclick="openLightbox(\'' + m.id + '\')" title="' + esc(m.name) + '">' +
        '<img src="' + m.data + '" alt="' + esc(m.name) + '">' +
        '<button class="media-delete" onclick="event.stopPropagation();removeMedia(\'' + m.id + '\',\'' + docId + '\',\'' + stepId + '\')" title="Remove">×</button>' +
      '</div>';
    } else if (type === 'video') {
      html += '<div class="media-item" title="' + esc(m.name) + '">' +
        '<video controls preload="metadata" onclick="event.stopPropagation()"><source src="' + m.data + '" type="' + m.mimeType + '"></video>' +
        '<button class="media-delete" onclick="event.stopPropagation();removeMedia(\'' + m.id + '\',\'' + docId + '\',\'' + stepId + '\')" title="Remove">×</button>' +
      '</div>';
    } else if (type === 'audio') {
      html += '<div class="media-item media-item-file" title="' + esc(m.name) + '">' +
        '<div class="media-item-file-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div>' +
        '<div class="media-item-file-info">' +
          '<div class="media-item-file-name">' + esc(m.name) + '</div>' +
          '<div class="media-item-file-size">' + formatFileSize(m.size) + '</div>' +
          '<audio controls style="width:100%;height:28px;margin-top:4px" onclick="event.stopPropagation()"><source src="' + m.data + '" type="' + m.mimeType + '"></audio>' +
        '</div>' +
        '<button class="media-delete" onclick="event.stopPropagation();removeMedia(\'' + m.id + '\',\'' + docId + '\',\'' + stepId + '\')" title="Remove">×</button>' +
      '</div>';
    } else {
      html += '<div class="media-item media-item-file" onclick="downloadMedia(\'' + m.id + '\')" title="' + esc(m.name) + '">' +
        '<div class="media-item-file-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg></div>' +
        '<div class="media-item-file-info">' +
          '<div class="media-item-file-name">' + esc(m.name) + '</div>' +
          '<div class="media-item-file-size">' + formatFileSize(m.size) + '</div>' +
        '</div>' +
        '<button class="media-delete" onclick="event.stopPropagation();removeMedia(\'' + m.id + '\',\'' + docId + '\',\'' + stepId + '\')" title="Remove">×</button>' +
      '</div>';
    }
  });

  container.innerHTML = html;
}

// Load media list in the right-panel step editor
async function loadStepMediaList(docId, stepId) {
  const container = document.getElementById('stepMediaList');
  if (!container) return;

  const items = await getMediaForStep(docId, stepId);
  if (!items.length) {
    container.innerHTML = '<div style="font-size:11px;color:var(--dim);padding:6px 0">No attachments yet</div>';
    return;
  }

  let html = '';
  items.forEach(m => {
    const type = getMediaType(m.mimeType);
    const icon = type === 'image' ? '🖼' : type === 'video' ? '🎬' : type === 'audio' ? '🎵' : '📄';
    html += '<div class="media-upload-item">' +
      '<span>' + icon + '</span>' +
      '<span class="media-upload-item-name">' + esc(m.name) + '</span>' +
      '<span class="media-upload-item-size">' + formatFileSize(m.size) + '</span>' +
      '<button class="media-upload-item-del" onclick="removeMediaFromEditor(\'' + m.id + '\',\'' + docId + '\',\'' + stepId + '\')" title="Remove">×</button>' +
    '</div>';
  });
  container.innerHTML = html;
}

// Remove media from editor panel (same as removeMedia but refreshes editor list)
async function removeMediaFromEditor(mediaId, docId, stepId) {
  if (!confirm('Remove this attachment?')) return;
  await deleteMedia(mediaId);
  logActivity('Removed attachment', 'warn');

  const doc = documents.find(d => d.id === docId);
  if (doc) {
    doc.updated = new Date().toISOString();
    doc.versions.push({ time: doc.updated, label: 'Removed an attachment', user: userName });
    saveDocs(documents, doc.id);
    renderDocList();
  }

  loadStepMedia(docId, stepId);
  loadStepMediaList(docId, stepId);
}

// Trigger file picker for a step
function triggerStepUpload(docId, stepId) {
  _fileInputCallback = async (files) => {
    if (!files || !files.length) return;
    
    for (const file of files) {
      const data = await readFileAsDataURL(file);
      const entry = {
        id: 'media-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        docId,
        stepId,
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        data,
        uploadedBy: userName,
        uploadedAt: new Date().toISOString()
      };
      await saveMedia(entry);
      logActivity('Attached "' + file.name + '" (' + formatFileSize(file.size) + ')', 'action');
    }

    // Update doc timestamp and version
    const doc = documents.find(d => d.id === docId);
    if (doc) {
      doc.updated = new Date().toISOString();
      doc.versions.push({ time: doc.updated, label: 'Added ' + files.length + ' attachment(s)', user: userName });
      saveDocs(documents, doc.id);
      renderDocList();
    }

    // Reload media for this step
    loadStepMedia(docId, stepId);

    // Refresh right panel if editing this step
    if (doc && activeRightTab === 'edit') renderRightPanel(doc);
  };
  _fileInput.click();
}

// Remove a media item
async function removeMedia(mediaId, docId, stepId) {
  if (!confirm('Remove this attachment?')) return;
  await deleteMedia(mediaId);
  logActivity('Removed attachment', 'warn');

  const doc = documents.find(d => d.id === docId);
  if (doc) {
    doc.updated = new Date().toISOString();
    doc.versions.push({ time: doc.updated, label: 'Removed an attachment', user: userName });
    saveDocs(documents, doc.id);
    renderDocList();
  }

  loadStepMedia(docId, stepId);
  if (doc && activeRightTab === 'edit') renderRightPanel(doc);
}

// Lightbox for images
async function openLightbox(mediaId) {
  const db = await openMediaDB();
  const tx = db.transaction(MEDIA_STORE, 'readonly');
  const req = tx.objectStore(MEDIA_STORE).get(mediaId);
  req.onsuccess = () => {
    const m = req.result;
    if (!m) return;
    const type = getMediaType(m.mimeType);
    const overlay = document.createElement('div');
    overlay.className = 'media-lightbox';
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };

    let content = '';
    if (type === 'image') {
      content = '<img src="' + m.data + '" alt="' + esc(m.name) + '">';
    } else if (type === 'video') {
      content = '<video controls autoplay><source src="' + m.data + '" type="' + m.mimeType + '"></video>';
    }

    overlay.innerHTML = content +
      '<button class="media-lightbox-close" onclick="this.parentElement.remove()">×</button>' +
      '<div class="media-lightbox-name">' + esc(m.name) + ' · ' + formatFileSize(m.size) + '</div>';
    document.body.appendChild(overlay);
  };
}

// Download a file attachment
async function downloadMedia(mediaId) {
  const db = await openMediaDB();
  const tx = db.transaction(MEDIA_STORE, 'readonly');
  const req = tx.objectStore(MEDIA_STORE).get(mediaId);
  req.onsuccess = () => {
    const m = req.result;
    if (!m) return;
    const a = document.createElement('a');
    a.href = m.data;
    a.download = m.name;
    a.click();
  };
}

