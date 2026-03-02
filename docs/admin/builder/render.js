// ── INIT ──
async function init() {
  documents = await loadDocs();
  renderDocList();
  updateCounts();

  // Check if launched with a title from index.html
  const params = new URLSearchParams(window.location.search);
  const initTitle = params.get('title');
  if (initTitle) {
    // Create a new doc with this title
    const doc = makeDoc(initTitle, params.get('area') || 'Upstream', '');
    documents.push(doc);
    saveDocs(documents);
    createDocOnServer(doc);
    renderDocList();
    openDoc(doc.id);
    logActivity('Created document from Submit page: "' + initTitle + '"', 'action');
    // Clean URL
    history.replaceState(null, '', 'builder.html');
  }

  // Check if launched from chat export (Query page → Export to Doc Builder)
  var chatExport = sessionStorage.getItem('vent_chat_export');
  if (chatExport) {
    sessionStorage.removeItem('vent_chat_export');
    try {
      var ex = JSON.parse(chatExport);
      var doc = makeDoc(ex.title || 'Exported Chat', ex.area || 'General', ex.description || '');
      doc.source = 'chat';
      if (ex.steps && ex.steps.length) {
        doc.steps = ex.steps.map(function(s, i) {
          return { id: 'step-' + Date.now() + '-' + i, title: s.title || '', content: s.content || '', note: s.note || '' };
        });
      }
      documents.push(doc);
      saveDocs(documents);
      createDocOnServer(doc);
      renderDocList();
      openDoc(doc.id);
      logActivity('Imported from chat: "' + (ex.title || 'Exported Chat') + '"', 'action');
    } catch(e) { console.error('Chat export import error:', e); }
  }

  // Check if launched from GDP export (GDP Check → Export to Doc Builder)
  var gdpExport = sessionStorage.getItem('vent_gdp_export');
  if (gdpExport) {
    sessionStorage.removeItem('vent_gdp_export');
    try {
      var manifest = JSON.parse(gdpExport);
      var importedDocs = [];

      for (var d = 0; d < manifest.documents.length; d++) {
        var docData = manifest.documents[d];
        var docTitle = docData.title;
        if (docData.docId && !docTitle.includes(docData.docId)) {
          docTitle += ' (' + docData.docId + ')';
        }

        var summaryParts = [];
        if (manifest.gdpSummary.criticalCount) summaryParts.push(manifest.gdpSummary.criticalCount + ' critical');
        if (manifest.gdpSummary.majorCount) summaryParts.push(manifest.gdpSummary.majorCount + ' major');
        if (manifest.gdpSummary.minorCount) summaryParts.push(manifest.gdpSummary.minorCount + ' minor');

        var doc = {
          id: docData.clientId,
          title: docTitle,
          area: 'GDP Imports',
          description: 'Imported from GDP Check. ' +
            (manifest.gdpSummary.totalErrors > 0
              ? manifest.gdpSummary.totalErrors + ' GDP issues (' + summaryParts.join(', ') + ')'
              : 'No GDP issues detected.'),
          status: 'draft',
          source: 'gdp',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          steps: docData.steps.map(function(s) {
            var step = { id: s.id, title: s.title || '', content: s.content || '', note: s.note || '' };
            if (s.gdpErrors) step.gdpErrors = s.gdpErrors;
            if (s.gdpEntries) step.gdpEntries = s.gdpEntries;
            return step;
          }),
          versions: [
            { time: new Date().toISOString(), label: 'Imported from GDP Check', user: userName }
          ]
        };

        documents.push(doc);
        saveDocs(documents);
        createDocOnServer(doc);
        importedDocs.push(doc);
      }

      renderDocList();
      if (importedDocs.length > 0) {
        openDoc(importedDocs[0].id);
        logActivity('Imported ' + importedDocs.length + ' document(s) from GDP Check', 'action');
      }

      // Success toast
      var totalPages = manifest.documents.reduce(function(a, d) { return a + d.steps.length; }, 0);
      var toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(78,201,176,.08);border:1px solid rgba(78,201,176,.25);border-radius:8px;padding:10px 18px;z-index:9999;color:#4ec9b0;font-size:12.5px;font-family:DM Sans,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.3);';
      toast.textContent = 'Imported ' + importedDocs.length + ' document(s) with ' + totalPages + ' pages from GDP Check';
      document.body.appendChild(toast);
      setTimeout(function() { toast.remove(); }, 5000);

    } catch(e) { console.error('GDP export import error:', e); }
  }
}

function makeDoc(title, area, description) {
  return {
    id: 'doc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    title: title.trim(),
    area,
    description: description.trim(),
    status: 'draft',
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    steps: [
      { id: 's1', title: 'Purpose & Scope', content: 'Define the purpose of this workflow and where it applies.', note: '' },
      { id: 's2', title: 'Materials & Equipment', content: 'List all materials, equipment, and prerequisites needed.', note: '' },
      { id: 's3', title: 'Procedure', content: 'Describe the step-by-step procedure here.', note: '' }
    ],
    versions: [
      { time: new Date().toISOString(), label: 'Document created', user: userName }
    ]
  };
}

// ── RENDER DOCUMENT LIST ──
function renderDocList(filter) {
  const list = document.getElementById('docList');
  const fl = (filter || '').toLowerCase();
  const nonChat = documents.filter(d => d.source !== 'chat');
  const filtered = fl ? nonChat.filter(d => d.title.toLowerCase().includes(fl) || d.area.toLowerCase().includes(fl)) : nonChat;

  // Group by area
  const groups = {};
  filtered.forEach(d => {
    if (!groups[d.area]) groups[d.area] = [];
    groups[d.area].push(d);
  });

  if (!filtered.length) {
    list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--dim);font-size:12px;">' +
      (fl ? 'No documents match your search.' : 'No documents yet.<br>Click <strong>+ New</strong> to create one.') + '</div>';
    return;
  }

  let html = '';
  Object.keys(groups).sort().forEach(area => {
    const docs = groups[area].sort((a,b) => new Date(b.updated) - new Date(a.updated));
    const isGdpGroup = area === 'GDP Imports';

    html += '<div class="doc-group-header" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\'none\'?\'block\':\'none\';this.querySelector(\'.doc-group-chevron\').classList.toggle(\'collapsed\')">' +
      '<span class="doc-group-chevron">▼</span>' +
      area +
      '<span class="doc-group-count">' + docs.length + '</span>' +
      '</div>' +
      '<div class="doc-group-items">';

    if (isGdpGroup) {
      // GDP tree view: doc nodes with expandable page children
      docs.forEach(d => {
        const isActive = d.id === activeDocId;
        const totalErrors = d.steps.reduce((sum, s) => {
          if (s.gdpErrors && s.gdpErrors.length) return sum + s.gdpErrors.length;
          // Parse from note text as fallback
          const matches = (s.note || '').match(/\[(\w+)\/(critical|major|minor)\]/g);
          return sum + (matches ? matches.length : 0);
        }, 0);
        const countClass = totalErrors > 0 ? 'has-errors' : 'clean';
        const countLabel = totalErrors > 0 ? totalErrors + ' issue' + (totalErrors !== 1 ? 's' : '') : '✓';

        html += '<div class="gdp-tree-doc' + (isActive ? ' active' : '') + '" onclick="openDoc(\'' + d.id + '\')" title="' + esc(d.title) + '">' +
          '<span class="gdp-tree-chevron" onclick="event.stopPropagation();toggleGdpTree(this)">▼</span>' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffc64d" stroke-width="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>' +
          '<span class="gdp-tree-doc-title">' + esc(d.title) + '</span>' +
          '<span class="gdp-tree-doc-count ' + countClass + '">' + countLabel + '</span>' +
          '<button class="export-del-btn" onclick="event.stopPropagation(); deleteDoc(\'' + d.id + '\')" title="Delete" style="position:relative;margin-left:2px">' +
            '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          '</button>' +
        '</div>';

        // Page children
        html += '<div class="gdp-tree-pages">';
        d.steps.forEach((step, si) => {
          const stepActive = isActive && activeStepTab === step.id;
          let errCount = 0;
          if (step.gdpErrors && step.gdpErrors.length) errCount = step.gdpErrors.length;
          else {
            const m = (step.note || '').match(/\[(\w+)\/(critical|major|minor)\]/g);
            if (m) errCount = m.length;
          }
          const pgClass = errCount > 0 ? 'has-errors' : 'clean';
          const pgLabel = errCount > 0 ? errCount : '✓';

          html += '<div class="gdp-tree-page' + (stepActive ? ' active' : '') + '" onclick="event.stopPropagation();openDoc(\'' + d.id + '\');setTimeout(function(){selectStep(\'' + d.id + '\',\'' + step.id + '\')},100)">' +
            '<svg class="gdp-tree-page-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>' +
            '<span class="gdp-tree-page-label">' + esc(step.title || 'Page ' + (si + 1)) + '</span>' +
            '<span class="gdp-tree-page-badge ' + pgClass + '">' + pgLabel + '</span>' +
          '</div>';
        });
        html += '</div>';
      });
    } else {
      // Normal doc cards
      docs.forEach(d => {
        const isActive = d.id === activeDocId;
        const statusClass = 'status-' + d.status;
        const ago = timeAgo(d.updated);
        html += '<div class="doc-card' + (isActive ? ' active' : '') + '" onclick="openDoc(\'' + d.id + '\')">' +
          '<div class="doc-card-top">' +
            '<svg class="doc-card-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>' +
            '<button class="export-del-btn" onclick="event.stopPropagation(); deleteDoc(\'' + d.id + '\')" title="Delete">' +
              '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
            '</button>' +
            '<span class="doc-card-status ' + statusClass + '">' + d.status + '</span>' +
          '</div>' +
          '<div class="doc-card-title">' + esc(d.title) + '</div>' +
          '<div class="doc-card-meta">' + ago + ' · ' + d.steps.length + ' steps</div>' +
        '</div>';
      });
    }
    html += '</div>';
  });

  list.innerHTML = html;
  document.getElementById('docCount').textContent = documents.filter(d => d.source !== 'chat').length;
  renderExportedChats();
}

function filterDocs(val) { renderDocList(val); }

function toggleGdpTree(chevron) {
  chevron.classList.toggle('collapsed');
  const pages = chevron.closest('.gdp-tree-doc').nextElementSibling;
  if (pages && pages.classList.contains('gdp-tree-pages')) {
    pages.classList.toggle('collapsed');
  }
}

// ── RENDER EXPORTED CHATS SECTION ──
function renderExportedChats() {
  var list = document.getElementById('exportsList');
  var chatDocs = documents.filter(function(d) { return d.source === 'chat'; });
  document.getElementById('exportsCount').textContent = chatDocs.length;

  if (!chatDocs.length) {
    list.innerHTML = '<div class="exports-empty">No exported chats yet.<br>Export a conversation from the Query page.</div>';
    return;
  }

  chatDocs.sort(function(a, b) { return new Date(b.updated) - new Date(a.updated); });

  var html = '';
  chatDocs.forEach(function(d) {
    var isActive = d.id === activeDocId;
    var ago = timeAgo(d.updated);
    html += '<div class="doc-card' + (isActive ? ' active' : '') + '" onclick="openDoc(\'' + d.id + '\')">' +
      '<div class="doc-card-top">' +
        '<svg class="doc-card-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
        '<button class="export-del-btn" onclick="event.stopPropagation(); deleteDoc(\'' + d.id + '\')" title="Delete">' +
          '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '</button>' +
        '<span class="doc-card-status status-draft">' + d.status + '</span>' +
      '</div>' +
      '<div class="doc-card-title">' + esc(d.title) + '</div>' +
      '<div class="doc-card-meta">' + ago + ' · ' + d.steps.length + ' steps</div>' +
    '</div>';
  });
  list.innerHTML = html;
}

// ── LEFT PANEL SECTION CONTROLS ──
var _lpExpanded = null; // 'docs' | 'exports' | null

function toggleLpSection(which) {
  var docsEl = document.getElementById('lpDocsSection');
  var exportsEl = document.getElementById('lpExportsSection');
  var resizer = document.getElementById('lpInnerResizer');

  if (which === 'docs') {
    docsEl.classList.toggle('collapsed');
    if (docsEl.classList.contains('collapsed')) {
      exportsEl.classList.remove('collapsed');
      resizer.style.display = 'none';
    } else {
      resizer.style.display = '';
    }
  } else {
    exportsEl.classList.toggle('collapsed');
    if (exportsEl.classList.contains('collapsed')) {
      docsEl.classList.remove('collapsed');
      resizer.style.display = 'none';
    } else {
      resizer.style.display = '';
    }
  }
  _lpExpanded = null;
  document.getElementById('docsExpandBtn').classList.remove('active');
  document.getElementById('exportsExpandBtn').classList.remove('active');
}

function expandLpSection(which) {
  var docsEl = document.getElementById('lpDocsSection');
  var exportsEl = document.getElementById('lpExportsSection');
  var resizer = document.getElementById('lpInnerResizer');

  if (_lpExpanded === which) {
    // Un-expand — restore both
    _lpExpanded = null;
    docsEl.classList.remove('collapsed');
    exportsEl.classList.remove('collapsed');
    resizer.style.display = '';
    document.getElementById('docsExpandBtn').classList.remove('active');
    document.getElementById('exportsExpandBtn').classList.remove('active');
  } else {
    _lpExpanded = which;
    if (which === 'docs') {
      docsEl.classList.remove('collapsed');
      exportsEl.classList.add('collapsed');
      document.getElementById('docsExpandBtn').classList.add('active');
      document.getElementById('exportsExpandBtn').classList.remove('active');
    } else {
      exportsEl.classList.remove('collapsed');
      docsEl.classList.add('collapsed');
      document.getElementById('exportsExpandBtn').classList.add('active');
      document.getElementById('docsExpandBtn').classList.remove('active');
    }
    resizer.style.display = 'none';
  }
}

// ── OPEN DOCUMENT ──
function openDoc(id) {
  const doc = documents.find(d => d.id === id);
  if (!doc) return;

  activeDocId = id;

  // Clear step tabs from previous doc
  openStepTabs = [];
  activeStepTab = null;
  document.querySelectorAll('.doc-step').forEach(s => s.classList.remove('editing'));

  // Add to open tabs if not already
  if (!openTabs.includes(id)) openTabs.push(id);

  renderDocList();
  renderEditorTabs();
  renderDocView(doc);
  renderRightPanel(doc);
  logActivity('Opened document: "' + doc.title + '"', 'info');
}

// ── RENDER EDITOR TABS ──
function renderEditorTabs() {
  const cont = document.getElementById('editorTabs');
  if (!openTabs.length) {
    cont.innerHTML = '<span class="editor-tab-placeholder">No document open</span>';
    return;
  }
  let html = '';
  openTabs.forEach(id => {
    const doc = documents.find(d => d.id === id);
    if (!doc) return;
    const isActive = id === activeDocId;
    html += '<div class="editor-tab' + (isActive ? ' active' : '') + '" onclick="openDoc(\'' + id + '\')">' +
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>' +
      esc(doc.title) +
      '<button class="tab-close" onclick="event.stopPropagation();closeTab(\'' + id + '\')">×</button>' +
    '</div>';
  });
  cont.innerHTML = html;
}

function closeTab(id) {
  openTabs = openTabs.filter(t => t !== id);
  if (activeDocId === id) {
    activeDocId = openTabs.length ? openTabs[openTabs.length - 1] : null;
  }
  if (activeDocId) {
    openDoc(activeDocId);
  } else {
    renderEditorTabs();
    document.getElementById('centerContent').innerHTML =
      '<div class="empty-state"><div class="ei">📄</div><p>Select a document from the left panel<br>or create a new one to get started.</p><span class="hint">Your workflow documents will appear here</span></div>';
    document.getElementById('rightContent').innerHTML =
      '<div class="empty-state" style="height:100%"><div class="ei">✏️</div><p>Open a document to start editing</p></div>';
    renderDocList();
  }
}

// ── RENDER DOCUMENT VIEW ──
function renderDocView(doc) {
  const el = document.getElementById('centerContent');
  const statusClass = 'status-' + doc.status;
  const isGdp = doc.source === 'gdp';

  // Build steps — media loaded async
  let stepsHtml = '';
  doc.steps.forEach((step, i) => {
    if (isGdp) {
      // GDP view: larger image area + styled finding cards
      const errors = step.gdpErrors || [];
      let findingsHtml = '';
      if (errors.length) {
        errors.forEach(e => {
          const typeClass = getGdpTypeClass(e.type);
          findingsHtml += '<div class="gdp-fc">' +
            '<div class="gdp-fc-top">' +
              '<span class="gdp-fc-type ' + typeClass + '">' + esc(e.type || 'GDP') + '</span>' +
              '<span class="gdp-fc-sev ' + (e.severity || 'minor') + '">' + esc(e.severity || 'minor') + '</span>' +
            '</div>' +
            '<div class="gdp-fc-title">' + esc(e.title || '') + '</div>' +
            (e.description ? '<div class="gdp-fc-desc">' + esc(e.description) + '</div>' : '') +
            (e.correction ? '<div class="gdp-fc-fix">Correction: ' + esc(e.correction) + '</div>' : '') +
          '</div>';
        });
      } else if (step.note && step.note !== 'No GDP issues detected.') {
        findingsHtml = '<div class="step-note" style="margin-top:8px">⚠ ' + esc(step.note) + '</div>';
      } else {
        findingsHtml = '<div style="font-size:11px;color:var(--green);margin-top:8px">✓ No GDP issues detected</div>';
      }

      stepsHtml += '<div class="doc-step" id="step-' + step.id + '">' +
        '<div class="step-header" onclick="selectStep(\'' + doc.id + '\',\'' + step.id + '\')">' +
          '<div class="step-number">' + (i + 1) + '</div>' +
          '<div class="step-title">' + esc(step.title) + '</div>' +
          (errors.length ? '<span style="font-family:JetBrains Mono,monospace;font-size:9px;padding:2px 7px;border-radius:100px;background:var(--red2);color:var(--red);margin-left:auto">' + errors.length + ' issue' + (errors.length !== 1 ? 's' : '') + '</span>' : '<span style="font-family:JetBrains Mono,monospace;font-size:9px;color:var(--green);margin-left:auto">✓</span>') +
        '</div>' +
        '<div class="step-body">' +
          '<div class="step-media" id="media-' + step.id + '" style="margin-bottom:10px"></div>' +
          '<p style="font-size:12px;color:var(--mid)">' + esc(step.content).replace(/\n/g, '</p><p>') + '</p>' +
          findingsHtml +
        '</div>' +
      '</div>';
    } else {
      // Normal step view
      stepsHtml += '<div class="doc-step" id="step-' + step.id + '">' +
        '<div class="step-header" onclick="selectStep(\'' + doc.id + '\',\'' + step.id + '\')">' +
          '<div class="step-number">' + (i + 1) + '</div>' +
          '<div class="step-title">' + esc(step.title) + '</div>' +
          '<div class="step-actions">' +
            '<button class="step-attach-btn" title="Attach media" onclick="event.stopPropagation();triggerStepUpload(\'' + doc.id + '\',\'' + step.id + '\')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg> Attach</button>' +
            '<button class="step-action-btn" title="Edit step" onclick="event.stopPropagation();editStep(\'' + doc.id + '\',\'' + step.id + '\')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>' +
            '<button class="step-action-btn" title="Delete step" onclick="event.stopPropagation();deleteStep(\'' + doc.id + '\',\'' + step.id + '\')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>' +
          '</div>' +
        '</div>' +
        '<div class="step-body">' +
          '<p>' + esc(step.content).replace(/\n/g, '</p><p>') + '</p>' +
          (step.note ? '<div class="step-note">⚠ ' + esc(step.note) + '</div>' : '') +
          '<div class="step-media" id="media-' + step.id + '"></div>' +
        '</div>' +
      '</div>';
    }
  });

  // GDP header shows page count + error summary; normal header unchanged
  const headerMeta = isGdp
    ? '<span class="doc-meta-pill ' + statusClass + '">' + doc.status.toUpperCase() + '</span>' +
      '<span>📁 ' + doc.area + '</span>' +
      '<span>📄 ' + doc.steps.length + ' page' + (doc.steps.length !== 1 ? 's' : '') + '</span>' +
      '<span>🕐 ' + timeAgo(doc.updated) + '</span>'
    : '<span class="doc-meta-pill ' + statusClass + '">' + doc.status.toUpperCase() + '</span>' +
      '<span>📁 ' + doc.area + '</span>' +
      '<span>📝 ' + doc.steps.length + ' steps</span>' +
      '<span>🕐 Updated ' + timeAgo(doc.updated) + '</span>';

  el.innerHTML = '<div class="doc-view">' +
    '<div class="doc-view-header">' +
      '<div class="doc-view-title">' + esc(doc.title) + '</div>' +
      '<div class="doc-view-meta">' + headerMeta + '</div>' +
      (doc.description ? '<p style="font-size:13px;color:var(--mid);margin-top:10px;line-height:1.6">' + esc(doc.description) + '</p>' : '') +
    '</div>' +
    '<div class="doc-steps">' + stepsHtml + '</div>' +
    (isGdp ? '' : '<button class="add-step-btn" onclick="addStep(\'' + doc.id + '\')">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
      'Add Step' +
    '</button>') +
  '</div>';

  // Load media for each step asynchronously
  doc.steps.forEach(step => loadStepMedia(doc.id, step.id, isGdp));
}

function getGdpTypeClass(type) {
  if (!type) return 'gdp';
  const t = type.toUpperCase();
  if (t === 'EE' || t.includes('ERRONEOUS')) return 'ee';
  if (t === 'LE' || t.includes('LATE')) return 'le';
  if (t === 'IE' || t.includes('INCOMPLETE')) return 'ie';
  if (t === 'CE' || t.includes('CORRECTION')) return 'ce';
  return 'gdp';
}

function toggleStep(stepId) {
  const el = document.getElementById('step-' + stepId);
  if (!el) return;
  const body = el.querySelector('.step-body');
  body.style.display = body.style.display === 'none' ? '' : 'none';
}

let openStepTabs = []; // array of {docId, stepId}
let activeStepTab = null; // stepId

function selectStep(docId, stepId) {
  const doc = documents.find(d => d.id === docId);
  if (!doc) return;
  const step = doc.steps.find(s => s.id === stepId);
  if (!step) return;

  // Toggle body open
  const el = document.getElementById('step-' + stepId);
  if (el) {
    const body = el.querySelector('.step-body');
    if (body && body.style.display === 'none') body.style.display = '';
  }

  activeStepTab = stepId;

  // Highlight in centre
  document.querySelectorAll('.doc-step').forEach(s => s.classList.remove('editing'));
  if (el) el.classList.add('editing');

  // GDP docs: update right panel findings, no step tabs
  if (doc.source === 'gdp') {
    renderGdpRightPanel(doc, stepId);
    return;
  }

  // Normal docs: step tabs + step view
  if (!openStepTabs.find(t => t.stepId === stepId)) {
    openStepTabs.push({ docId, stepId });
  }
  renderStepTabs(doc);
  renderStepView(docId, stepId);
}

function closeStepTab(stepId) {
  openStepTabs = openStepTabs.filter(t => t.stepId !== stepId);

  // Unhighlight
  const el = document.getElementById('step-' + stepId);
  if (el) el.classList.remove('editing');

  if (activeStepTab === stepId) {
    if (openStepTabs.length) {
      activeStepTab = openStepTabs[openStepTabs.length - 1].stepId;
      const doc = documents.find(d => d.id === openStepTabs[openStepTabs.length - 1].docId);
      if (doc) {
        renderStepTabs(doc);
        renderStepView(openStepTabs[openStepTabs.length - 1].docId, activeStepTab);
        const sel = document.getElementById('step-' + activeStepTab);
        if (sel) sel.classList.add('editing');
      }
    } else {
      activeStepTab = null;
      // Restore default right panel
      const doc = documents.find(d => d.id === activeDocId);
      document.querySelector('.right-panel-header .right-tabs').innerHTML =
        '<div class="right-tab active" data-tab="edit" onclick="switchRightTab(this)">Edit</div>' +
        '<div class="right-tab" data-tab="ai" onclick="switchRightTab(this)">AI Assist</div>' +
        '<div class="right-tab" data-tab="versions" onclick="switchRightTab(this)">Versions</div>';
      if (doc) renderRightPanel(doc);
      else document.getElementById('rightContent').innerHTML =
        '<div class="empty-state" style="height:100%"><div class="ei">✏️</div><p>Open a document to start editing</p></div>';
    }
  } else {
    const doc = documents.find(d => d.id === activeDocId);
    if (doc) renderStepTabs(doc);
  }
}

let _dragStepId = null;

function renderStepTabs(doc) {
  const tabBar = document.querySelector('.right-panel-header .right-tabs');
  let html = '';
  openStepTabs.forEach((t, i) => {
    const step = doc.steps.find(s => s.id === t.stepId);
    if (!step) return;
    const idx = doc.steps.indexOf(step);
    const isActive = t.stepId === activeStepTab;
    html += '<div class="right-tab' + (isActive ? ' active' : '') + '" ' +
      'draggable="true" data-step-id="' + t.stepId + '" data-doc-id="' + t.docId + '" data-tab-idx="' + i + '" ' +
      'onclick="switchToStepTab(\'' + t.docId + '\',\'' + t.stepId + '\')" ' +
      'style="gap:6px">' +
        '<span style="font-family:JetBrains Mono,monospace;font-size:10px;color:' + (isActive ? 'var(--accent)' : 'var(--dim)') + '">' + (idx + 1) + '</span>' +
        esc(step.title) +
        '<button onclick="event.stopPropagation();closeStepTab(\'' + t.stepId + '\')" ' +
          'style="background:none;border:none;color:' + (isActive ? '#6c6c6c' : 'transparent') + ';cursor:pointer;font-size:11px;padding:0 2px;line-height:1;margin-left:2px">×</button>' +
    '</div>';
  });
  tabBar.innerHTML = html;
  initStepTabDrag(tabBar);
}

function initStepTabDrag(tabBar) {
  const tabs = tabBar.querySelectorAll('.right-tab[draggable]');
  tabs.forEach(tab => {
    tab.addEventListener('dragstart', e => {
      _dragStepId = tab.dataset.stepId;
      tab.classList.add('tab-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', tab.dataset.tabIdx);
    });
    tab.addEventListener('dragend', () => {
      _dragStepId = null;
      tab.classList.remove('tab-dragging');
      tabBar.querySelectorAll('.right-tab').forEach(t => t.classList.remove('drag-over-left', 'drag-over-right'));
    });
    tab.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (tab.dataset.stepId === _dragStepId) return;
      const rect = tab.getBoundingClientRect();
      const mid = rect.left + rect.width / 2;
      tab.classList.remove('drag-over-left', 'drag-over-right');
      tab.classList.add(e.clientX < mid ? 'drag-over-left' : 'drag-over-right');
    });
    tab.addEventListener('dragleave', () => {
      tab.classList.remove('drag-over-left', 'drag-over-right');
    });
    tab.addEventListener('drop', e => {
      e.preventDefault();
      tab.classList.remove('drag-over-left', 'drag-over-right');
      const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
      let toIdx = parseInt(tab.dataset.tabIdx, 10);
      if (fromIdx === toIdx) return;
      const rect = tab.getBoundingClientRect();
      const mid = rect.left + rect.width / 2;
      if (e.clientX >= mid && toIdx < openStepTabs.length - 1) toIdx++;
      // Reorder
      const [moved] = openStepTabs.splice(fromIdx, 1);
      if (fromIdx < toIdx) toIdx--;
      openStepTabs.splice(toIdx, 0, moved);
      const doc = documents.find(d => d.id === activeDocId);
      if (doc) renderStepTabs(doc);
    });
  });
}

function switchToStepTab(docId, stepId) {
  activeStepTab = stepId;
  const doc = documents.find(d => d.id === docId);
  if (!doc) return;

  // Highlight in centre
  document.querySelectorAll('.doc-step').forEach(s => s.classList.remove('editing'));
  const el = document.getElementById('step-' + stepId);
  if (el) el.classList.add('editing');

  renderStepTabs(doc);
  renderStepView(docId, stepId);
}

function renderStepView(docId, stepId) {
  const doc = documents.find(d => d.id === docId);
  if (!doc) return;
  const step = doc.steps.find(s => s.id === stepId);
  if (!step) return;
  const idx = doc.steps.indexOf(step);
  const isGdp = doc.source === 'gdp';

  const rc = document.getElementById('rightContent');

  if (isGdp) {
    // GDP view: show image preview + structured finding cards
    const errors = step.gdpErrors || [];
    let findingsHtml = '';
    if (errors.length) {
      findingsHtml += '<div class="edit-label" style="margin-bottom:8px">' + errors.length + ' GDP Issue' + (errors.length !== 1 ? 's' : '') + '</div>';
      errors.forEach(function(e) {
        const typeClass = getGdpTypeClass(e.type);
        findingsHtml += '<div class="gdp-fc">' +
          '<div class="gdp-fc-top">' +
            '<span class="gdp-fc-type ' + typeClass + '">' + esc(e.type || 'GDP') + '</span>' +
            '<span class="gdp-fc-sev ' + (e.severity || 'minor') + '">' + esc(e.severity || 'minor') + '</span>' +
            (e.location ? '<span style="font-size:9px;color:var(--dim);margin-left:auto;font-family:JetBrains Mono,monospace">' + esc(e.location) + '</span>' : '') +
          '</div>' +
          '<div class="gdp-fc-title">' + esc(e.title || '') + '</div>' +
          (e.description ? '<div class="gdp-fc-desc">' + esc(e.description) + '</div>' : '') +
          (e.correction ? '<div class="gdp-fc-fix">Correction: ' + esc(e.correction) + '</div>' : '') +
        '</div>';
      });
    } else {
      findingsHtml = '<div style="text-align:center;padding:20px 0;color:var(--green);font-size:12px">✓ No GDP issues detected on this page</div>';
    }

    rc.innerHTML = '<div class="fade-in">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">' +
        '<div style="display:flex;align-items:center;gap:10px">' +
          '<div class="step-number">' + (idx + 1) + '</div>' +
          '<span style="font-size:14px;color:var(--text);font-weight:400">' + esc(step.title) + '</span>' +
        '</div>' +
        (errors.length ? '<span style="font-family:JetBrains Mono,monospace;font-size:9px;padding:2px 7px;border-radius:100px;background:var(--red2);color:var(--red)">' + errors.length + '</span>' : '<span style="color:var(--green);font-size:11px">✓</span>') +
      '</div>' +
      '<div style="border-bottom:1px solid var(--border);margin-bottom:14px"></div>' +
      '<div style="font-size:12px;color:var(--mid);line-height:1.6;margin-bottom:14px">' + esc(step.content) + '</div>' +
      '<div id="rightStepMedia" style="margin-bottom:14px"></div>' +
      findingsHtml +
    '</div>';
  } else {
    rc.innerHTML = '<div class="fade-in">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">' +
        '<div style="display:flex;align-items:center;gap:10px">' +
          '<div class="step-number">' + (idx + 1) + '</div>' +
          '<span style="font-size:14px;color:var(--text);font-weight:400">' + esc(step.title) + '</span>' +
        '</div>' +
        '<button class="edit-btn" style="font-size:10px;padding:4px 10px" onclick="editStep(\'' + docId + '\',\'' + stepId + '\')"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit</button>' +
      '</div>' +
      '<div style="border-bottom:1px solid var(--border);margin-bottom:14px"></div>' +
      '<div style="font-size:12.5px;color:var(--mid);line-height:1.7;margin-bottom:14px">' +
        '<p>' + esc(step.content).replace(/\n/g, '</p><p>') + '</p>' +
      '</div>' +
      (step.note ? '<div class="step-note" style="margin-bottom:14px">⚠ ' + esc(step.note) + '</div>' : '') +
      '<div id="rightStepMedia"></div>' +
      '<div style="margin-top:16px;display:flex;gap:6px">' +
        '<button class="step-attach-btn" onclick="triggerStepUpload(\'' + docId + '\',\'' + stepId + '\')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg> Attach File</button>' +
        '<button class="step-action-btn" style="font-size:10px;padding:4px 8px" onclick="deleteStep(\'' + docId + '\',\'' + stepId + '\')"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Delete</button>' +
      '</div>' +
    '</div>';
  }

  loadRightStepMedia(docId, stepId);
}

async function loadRightStepMedia(docId, stepId) {
  const container = document.getElementById('rightStepMedia');
  if (!container) return;
  const items = await getMediaForStep(docId, stepId);
  if (!items.length) { container.innerHTML = ''; return; }

  let html = '<div class="edit-label" style="margin-bottom:8px">Attachments</div>';
  items.forEach(m => {
    const type = getMediaType(m.mimeType);
    if (type === 'image') {
      html += '<div style="margin-bottom:8px;cursor:pointer" onclick="openLightbox(\'' + m.id + '\')">' +
        '<img src="' + m.data + '" style="max-width:100%;border-radius:6px;border:1px solid var(--border)" alt="' + esc(m.name) + '">' +
        '<div style="font-size:10px;color:var(--dim);margin-top:3px">' + esc(m.name) + ' · ' + formatFileSize(m.size) + '</div>' +
      '</div>';
    } else if (type === 'video') {
      html += '<div style="margin-bottom:8px">' +
        '<video controls preload="metadata" style="max-width:100%;border-radius:6px;background:#000"><source src="' + m.data + '" type="' + m.mimeType + '"></video>' +
        '<div style="font-size:10px;color:var(--dim);margin-top:3px">' + esc(m.name) + ' · ' + formatFileSize(m.size) + '</div>' +
      '</div>';
    } else {
      const icon = type === 'audio' ? '🎵' : '📄';
      html += '<div class="media-upload-item" onclick="downloadMedia(\'' + m.id + '\')" style="cursor:pointer;margin-bottom:4px">' +
        '<span>' + icon + '</span>' +
        '<span class="media-upload-item-name">' + esc(m.name) + '</span>' +
        '<span class="media-upload-item-size">' + formatFileSize(m.size) + '</span>' +
      '</div>';
    }
  });
  container.innerHTML = html;
}

