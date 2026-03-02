// ── SOP SEARCH ──
let openSopTabs = []; // {id, query, data}
let activeSopTab = null;

function updatePptxBtnState() {
  const btn = document.getElementById('pptxExportBtn');
  if (!btn) return;
  const hasActiveSop = activeSopTab && openSopTabs.find(t => t.id === activeSopTab && t.data && t.data.sections);
  btn.disabled = !hasActiveSop;
}



function openSopSearch() {
  // Build context hint from active step/doc
  let hint = '';
  if (activeStepTab && activeDocId) {
    const doc = documents.find(d => d.id === activeDocId);
    if (doc) {
      const step = doc.steps.find(s => s.id === activeStepTab);
      if (step) hint = step.title + (step.content ? ' — ' + step.content.substring(0, 80) : '');
    }
  } else if (activeDocId) {
    const doc = documents.find(d => d.id === activeDocId);
    if (doc) hint = doc.title;
  }

  const rc = document.getElementById('rightContent');
  rc.innerHTML = '<div class="sop-search-overlay fade-in">' +
    '<div class="search-hint">Search SOPs for procedures, specifications, or troubleshooting relevant to your document.</div>' +
    '<div class="search-row">' +
      '<input id="sopSearchInput" type="text" placeholder="e.g. bioreactor inoculation procedure…" value="' + esc(hint) + '" ' +
        'onkeydown="if(event.key===\'Enter\')runSopSearch()">' +
      '<button class="search-go" id="sopSearchBtn" onclick="runSopSearch()">Search</button>' +
    '</div>' +
    '<div id="sopSearchResults"></div>' +
  '</div>';

  // Render SOP tabs + a "+" active indicator
  const tabBar = document.querySelector('.right-panel-header .right-tabs');
  let html = '';
  openSopTabs.forEach(t => {
    const isWhy = t._isWhy;
    const tabClass = isWhy ? 'right-tab why-tab' : 'right-tab sop-tab';
    const icon = isWhy
      ? '<span class="why-tab-icon" style="font-family:JetBrains Mono,monospace;font-size:10px;font-weight:700">?</span>'
      : '<span class="sop-tab-num" style="font-family:JetBrains Mono,monospace;font-size:10px">§</span>';
    html += '<div class="' + tabClass + (t.id === activeSopTab ? ' active' : '') + '" ' +
      'onclick="switchToSopTab(\'' + t.id + '\')" style="gap:6px">' +
        icon +
        esc(t.query.length > 18 ? t.query.substring(0,18) + '…' : t.query) +
        '<button onclick="event.stopPropagation();closeSopTab(\'' + t.id + '\')" ' +
          'style="background:none;border:none;color:' + (t.id === activeSopTab ? '#6c6c6c' : 'transparent') + ';cursor:pointer;font-size:11px;padding:0 2px;line-height:1;margin-left:2px">×</button>' +
    '</div>';
  });
  html += '<div class="right-tab active" style="gap:4px;color:var(--accent)">' +
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
      'Search' +
  '</div>';
  tabBar.innerHTML = html;

  // Focus the input and auto-load all SOPs
  setTimeout(() => {
    const inp = document.getElementById('sopSearchInput');
    if (inp) { inp.focus(); inp.select(); }
    runSopSearch(); // show all SOPs immediately
  }, 50);
}

async function runSopSearch() {
  const inp = document.getElementById('sopSearchInput');
  const btn = document.getElementById('sopSearchBtn');
  const results = document.getElementById('sopSearchResults');
  if (!inp || !btn || !results) return;
  const q = inp.value.trim();
  btn.disabled = true;
  results.innerHTML = '<div class="search-status"><div class="dot"></div> Searching SOPs…</div>';
  try {
    const url = q.length >= 2 ? SERVER + '/sop/search?q=' + encodeURIComponent(q) : SERVER + '/sop/search';
    const res = await authFetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Query failed');
    if (!data.length) {
      results.innerHTML = '<div class="search-status">No SOPs found matching your query.</div>';
      return;
    }
    results.innerHTML = data.map(row =>
      `<div class="sop-search-result" style="padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="openSopDocTab('${row.doc_id}','${esc(row.section_title)}')">
        <div style="font-size:13px;color:var(--accent);font-weight:500">${esc(row.doc_id)}</div>
        <div style="font-size:12px;color:var(--text);margin-bottom:2px">${esc(row.section_title)}</div>
        <div style="font-size:11px;color:var(--mid);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(row.content.substring(0, 80))}</div>
      </div>`
    ).join('');
    logActivity('SOP search: "' + q + '"', 'info');
  } catch (err) {
    results.innerHTML = '<div style="color:var(--red);font-size:12px;padding:8px 0">Error: ' + esc(err.message) + '</div>';
  } finally {
    btn.disabled = false;
  }
}

// Open full SOP doc in a new tab
async function openSopDocTab(docId, sectionTitle) {
  const res = await authFetch(SERVER + '/sop/' + encodeURIComponent(docId));
  const data = await res.json();
  if (!Array.isArray(data) || !data.length) return;
  const tabId = 'sopdoc_' + docId + '_' + Date.now();
  openSopTabs.push({ id: tabId, query: docId, data: { docId, sections: data } });
  activeSopTab = tabId;
  openStepTabs = [];
  activeStepTab = null;
  document.querySelectorAll('.doc-step').forEach(s => s.classList.remove('editing'));
  renderSopTabs();
  renderSopDoc(tabId);
  updatePptxBtnState();
}

function renderSopDoc(tabId) {
  const tab = openSopTabs.find(t => t.id === tabId);
  if (!tab) return;
  const d = tab.data;
  const rc = document.getElementById('rightContent');
  const isBPR = d.docId && d.docId.includes('BPR');
  let html = `<div class="sop-result-card" id="sopDocCard"><div style="font-size:13px;font-weight:600;color:var(--accent);margin-bottom:8px">${esc(d.docId)}</div>`;
  d.sections.forEach((sec, idx) => {
    const whyBtn = isBPR
      ? `<span class="why-icon" title="Why do we do this?" data-why-idx="${idx}">?</span>`
      : '';
    html += `<div style="margin-bottom:18px">
      <div style="font-size:12px;color:var(--gold);font-weight:500;margin-bottom:2px;display:flex;align-items:center">${esc(sec.section_title)}${whyBtn}</div>
      <div style="font-size:12px;color:var(--text);white-space:pre-line">${esc(sec.content)}</div>
    </div>`;
  });
  html += '</div>';
  rc.innerHTML = html;

  // Bind why icons via event delegation (avoids inline quoting issues)
  if (isBPR) {
    const card = document.getElementById('sopDocCard');
    card.addEventListener('click', function(e) {
      const icon = e.target.closest('.why-icon');
      if (!icon) return;
      e.stopPropagation();
      const idx = parseInt(icon.dataset.whyIdx, 10);
      const sec = d.sections[idx];
      if (sec) openRationalePanel(d.docId, sec.section_title);
    });
  }
}

function renderSopTabs() {
  const tabBar = document.querySelector('.right-panel-header .right-tabs');
  let html = '';
  openSopTabs.forEach(t => {
    const isActive = t.id === activeSopTab;
    const isWhy = t._isWhy;
    const tabClass = isWhy ? 'right-tab why-tab' : 'right-tab sop-tab';
    const icon = isWhy
      ? '<span class="why-tab-icon" style="font-family:JetBrains Mono,monospace;font-size:10px;font-weight:700">?</span>'
      : '<span class="sop-tab-num" style="font-family:JetBrains Mono,monospace;font-size:10px">§</span>';
    html += '<div class="' + tabClass + (isActive ? ' active' : '') + '" ' +
      'onclick="switchToSopTab(\'' + t.id + '\')" style="gap:6px">' +
        icon +
        esc(t.query.length > 18 ? t.query.substring(0,18) + '…' : t.query) +
        '<button onclick="event.stopPropagation();closeSopTab(\'' + t.id + '\')" ' +
          'style="background:none;border:none;color:' + (isActive ? '#6c6c6c' : 'transparent') + ';cursor:pointer;font-size:11px;padding:0 2px;line-height:1;margin-left:2px">×</button>' +
    '</div>';
  });
  tabBar.innerHTML = html;
}

function switchToSopTab(tabId) {
  activeSopTab = tabId;
  renderSopTabs();
  const tab = openSopTabs.find(t => t.id === tabId);
  if (tab && tab._isWhy) {
    renderRationaleView(tabId);
  } else if (tab && tab.data && tab.data.sections) {
    renderSopDoc(tabId);
  } else {
    renderSopResult(tabId);
  }
  updatePptxBtnState();
}

function closeSopTab(tabId) {
  openSopTabs = openSopTabs.filter(t => t.id !== tabId);
  if (activeSopTab === tabId) {
    if (openSopTabs.length) {
      activeSopTab = openSopTabs[openSopTabs.length - 1].id;
      renderSopTabs();
      renderSopResult(activeSopTab);
    } else {
      activeSopTab = null;
      const doc = documents.find(d => d.id === activeDocId);
      if (doc) renderRightPanel(doc);
      else {
        document.querySelector('.right-panel-header .right-tabs').innerHTML =
          '<div class="right-tab active" data-tab="edit" onclick="switchRightTab(this)">Edit</div>' +
          '<div class="right-tab" data-tab="ai" onclick="switchRightTab(this)">AI Assist</div>' +
          '<div class="right-tab" data-tab="versions" onclick="switchRightTab(this)">Versions</div>';
        document.getElementById('rightContent').innerHTML =
          '<div class="empty-state" style="height:100%"><div class="ei">✏️</div><p>Open a document to start editing</p></div>';
      }
    }
  } else {
    renderSopTabs();
  }
  updatePptxBtnState();
}

