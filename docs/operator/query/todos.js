// ── TO-DO SIDEBAR ──
let _todos = [];
let _collapsedGroups = new Set(); // track collapsed parent IDs

/* ── SOP SEARCH SIDEBAR ── */
let _sopSearchLoaded = false;
let _discoverOpen = false;

function toggleDiscoverPanel() {
  _discoverOpen = !_discoverOpen;
  document.getElementById('discoverBody').classList.toggle('open', _discoverOpen);
  document.getElementById('discoverChevron').classList.toggle('open', _discoverOpen);
  if (_discoverOpen) setTimeout(() => document.getElementById('discoverInput').focus(), 100);
}

async function discoverSops() {
  const inp = document.getElementById('discoverInput');
  const btn = document.getElementById('discoverBtn');
  const responseEl = document.getElementById('discoverResponse');
  if (!inp || !btn) return;
  const desc = inp.value.trim();
  if (desc.length < 5) return;

  btn.disabled = true;
  inp.value = '';

  // Show user message
  responseEl.innerHTML += `<div class="sop-discover-msg user">${escHtml(desc)}</div>`;
  responseEl.innerHTML += '<div class="sop-discover-thinking" id="discoverThinking"><div class="dot"></div> Finding SOPs...</div>';
  responseEl.scrollTop = responseEl.scrollHeight;

  try {
    const res = await authFetch(`${SERVER}/sop/discover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: desc })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Discovery failed');

    const thinkEl = document.getElementById('discoverThinking');
    if (thinkEl) thinkEl.remove();

    // Show AI response with clickable SOP links
    let msgHtml = escHtml(data.message);
    if (data.results && data.results.length) {
      msgHtml += '<div style="margin-top:8px">';
      data.results.forEach(r => {
        msgHtml += `<button class="discover-sop-link" onclick="openSopDoc('${escHtml(r.doc_id)}')">${escHtml(r.doc_id)}</button> `;
      });
      msgHtml += '</div>';
    }
    responseEl.innerHTML += `<div class="sop-discover-msg">${msgHtml}</div>`;
    responseEl.scrollTop = responseEl.scrollHeight;
  } catch (err) {
    const thinkEl = document.getElementById('discoverThinking');
    if (thinkEl) thinkEl.remove();
    responseEl.innerHTML += `<div class="sop-discover-msg" style="color:var(--red)">Error: ${escHtml(err.message)}</div>`;
  } finally {
    btn.disabled = false;
    inp.focus();
  }
}

function toggleSopSidebar() {
  const sb = document.getElementById('sopSidebar');
  if (sb.classList.contains('show')) closeSopSidebar();
  else openSopSidebar();
}
function openSopSidebar() {
  closeTodoSidebar();
  document.getElementById('sopSidebar').classList.add('show');
  document.getElementById('sopBackdrop').classList.add('show');
  setTimeout(() => document.getElementById('sopSearchInput').focus(), 280);
  if (!_sopSearchLoaded) { searchSops(); _sopSearchLoaded = true; }
}
function closeSopSidebar() {
  document.getElementById('sopSidebar').classList.remove('show');
  document.getElementById('sopBackdrop').classList.remove('show');
}

async function searchSops() {
  const inp = document.getElementById('sopSearchInput');
  const btn = document.getElementById('sopSearchBtn');
  const results = document.getElementById('sopResults');
  if (!inp || !btn || !results) return;
  const q = inp.value.trim();
  btn.disabled = true;
  results.innerHTML = '<div class="sop-status"><div class="dot"></div> Searching SOPs...</div>';
  try {
    const url = q.length >= 2
      ? `${SERVER}/sop/search?q=${encodeURIComponent(q)}`
      : `${SERVER}/sop/search`;
    const res = await authFetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Search failed');
    if (!data.length) {
      results.innerHTML = '<div class="sop-status">No SOPs found.</div>';
      return;
    }
    results.innerHTML = data.map(row =>
      `<div class="sop-result-item" onclick="openSopDoc('${escHtml(row.doc_id)}')">
        <div class="sop-result-doc">${escHtml(row.doc_id)}</div>
        <div class="sop-result-section">${escHtml(row.section_title)}</div>
        <div class="sop-result-preview">${escHtml((row.content || '').substring(0, 100))}</div>
      </div>`
    ).join('');
  } catch (err) {
    // Demo mode fallback: show realistic SOP results if server unavailable
    if (localStorage.getItem('vent_token') === 'demo') {
      const demoSops = [
        { doc_id: 'SOP-BIO-047', section_title: 'ATF Filter Preparation & Flush Procedure', content: 'Section 4.3: Flush ATF filter with 150L purified WFI at 25±5°C through retentate loop. Verify permeate TOC ≤ 500 ppb...' },
        { doc_id: 'WX-SOP-1001', section_title: 'Cell Culture Preparation — Equipment Setup', content: 'Section 8.4.2: All single-use assemblies must be flushed per SOP-BIO-047 prior to inoculation...' },
        { doc_id: 'SOP-BIO-052', section_title: 'TFF Cassette Filter Cleaning & Flush', content: 'Section 3.2: Tangential flow filtration cassettes require different flush volumes based on membrane area...' },
        { doc_id: 'SOP-QC-018', section_title: 'WFI Quality Specifications', content: 'Section 2.1: Water for Injection used in equipment flush must meet USP <1231> and conductivity ≤ 1.3 µS/cm...' },
        { doc_id: 'SOP-BIO-039', section_title: 'Bioreactor Assembly — Single-Use Systems', content: 'Section 5.1: Connect single-use bag assemblies per AD-UP-001. Perform integrity test before flush...' }
      ];
      results.innerHTML = demoSops.map(row =>
        `<div class="sop-result-item" onclick="openSopDoc('${escHtml(row.doc_id)}')">
          <div class="sop-result-doc">${escHtml(row.doc_id)}</div>
          <div class="sop-result-section">${escHtml(row.section_title)}</div>
          <div class="sop-result-preview">${escHtml((row.content || '').substring(0, 100))}</div>
        </div>`
      ).join('');
    } else {
      results.innerHTML = `<div style="color:var(--red);font-size:12px;padding:16px">Error: ${escHtml(err.message)}</div>`;
    }
  } finally {
    btn.disabled = false;
  }
}

/* ── SOP VIEWER PANEL (tabbed) ── */
let _svTabs = [];      // { id, docId, sections, chatHtml, chatOpen }
let _svActiveTab = null;
let _svMaximized = false;

function openSopViewer() {
  document.getElementById('sopViewer').classList.add('show');
}
function closeSopViewer() {
  document.getElementById('sopViewer').classList.remove('show');
  document.getElementById('sopViewer').classList.remove('sv-maximized');
  _svMaximized = false;
}
function toggleSvMaximize() {
  _svMaximized = !_svMaximized;
  document.getElementById('sopViewer').classList.toggle('sv-maximized', _svMaximized);
}

// Drag logic — uses transform for GPU-composited movement
(function() {
  let dragging = false, dragX = 0, dragY = 0, tx = 0, ty = 0;
  document.addEventListener('mousedown', function(e) {
    const tabs = e.target.closest('.sv-tabs');
    if (!tabs) return;
    if (e.target.closest('button, .sv-tab, .sv-add-btn, input')) return;
    const viewer = document.getElementById('sopViewer');
    if (!viewer || _svMaximized) return;
    dragging = true;
    dragX = e.clientX;
    dragY = e.clientY;
    viewer.classList.add('sv-dragging');
    tabs.classList.add('dragging');
    e.preventDefault();
  });
  document.addEventListener('mousemove', function(e) {
    if (!dragging) return;
    tx = e.clientX - dragX;
    ty = e.clientY - dragY;
    var viewer = document.getElementById('sopViewer');
    if (viewer) viewer.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0)';
  });
  document.addEventListener('mouseup', function() {
    if (!dragging) return;
    dragging = false;
    var viewer = document.getElementById('sopViewer');
    if (viewer) {
      // Bake the transform into top/left so it sticks
      viewer.style.left = (viewer.offsetLeft + tx) + 'px';
      viewer.style.top = (viewer.offsetTop + ty) + 'px';
      viewer.style.transform = 'translate3d(0,0,0)';
      viewer.classList.remove('sv-dragging');
    }
    tx = 0; ty = 0;
    var tabs = document.querySelector('.sv-tabs');
    if (tabs) tabs.classList.remove('dragging');
  });
}());

async function openSopDoc(docId) {
  // If tab already open, just switch to it
  const existing = _svTabs.find(t => t.docId === docId);
  if (existing) {
    _svActiveTab = existing.id;
    renderSvTabs();
    renderSvContent();
    openSopViewer();
    return;
  }

  // Open viewer and show loading
  openSopViewer();
  const body = document.getElementById('svBody');
  body.innerHTML = '<div class="sv-empty"><div class="sop-status"><div class="dot"></div> Loading ' + escHtml(docId) + '...</div></div>';

  try {
    const res = await authFetch(`${SERVER}/sop/${encodeURIComponent(docId)}`);
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) {
      body.innerHTML = '<div class="sv-empty">No sections found for ' + escHtml(docId) + '.</div>';
      return;
    }

    const tabId = 'sv_' + docId + '_' + Date.now();
    _svTabs.push({ id: tabId, docId, sections: data, chatHtml: '', chatOpen: false });
    _svActiveTab = tabId;
    renderSvTabs();
    renderSvContent();
  } catch (err) {
    body.innerHTML = '<div class="sv-empty" style="color:var(--red)">Error loading document: ' + escHtml(err.message) + '</div>';
  }
}

let _svShowSearch = false;

function renderSvTabs() {
  const tabBar = document.getElementById('svTabs');
  tabBar.innerHTML =
  `<button class="sv-add-btn${_svShowSearch ? ' active' : ''}" onclick="showSvSearch()" title="Find another SOP">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="15.8" y2="15.8"/></svg>
  </button>` +
  _svTabs.map(t =>
    `<div class="sv-tab${!_svShowSearch && t.id === _svActiveTab ? ' active' : ''}" onclick="switchSvTab('${t.id}')">
      <span class="sv-tab-id">${escHtml(t.docId)}</span>
      <button class="sv-tab-close" onclick="event.stopPropagation();closeSvTab('${t.id}')">&times;</button>
    </div>`
  ).join('') +
  `<div class="sv-window-controls">
    <button class="sv-maximize-btn" onclick="toggleSvMaximize()" title="${_svMaximized ? 'Restore' : 'Maximize'}">
      ${_svMaximized
        ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 4V2h13v13h-2"/></svg>'
        : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>'}
    </button>
    <button class="sv-close-btn" onclick="closeSopViewer()" title="Close">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  </div>`;
}

function showSvSearch() {
  _svShowSearch = true;
  renderSvTabs();
  const body = document.getElementById('svBody');
  body.innerHTML = `
    <div class="sv-search-view">
      <div class="sv-search-header">
        <div class="sv-search-title">Find an SOP</div>
        <div class="sv-search-row">
          <input class="sv-search-input" id="svSearchInput" type="text"
            placeholder="Search by keyword or describe what you're working on..."
            onkeydown="if(event.key==='Enter')runSvSearch()">
          <button class="sv-search-go" id="svSearchBtn" onclick="runSvSearch()">Search</button>
        </div>
      </div>
      <div class="sv-search-results" id="svSearchResults">
        <div class="sop-status" style="padding:16px"><div class="dot"></div> Loading SOPs...</div>
      </div>
    </div>`;
  setTimeout(() => {
    const inp = document.getElementById('svSearchInput');
    if (inp) inp.focus();
    runSvSearch(); // Load all SOPs immediately
  }, 100);
}

async function runSvSearch() {
  const inp = document.getElementById('svSearchInput');
  const btn = document.getElementById('svSearchBtn');
  const results = document.getElementById('svSearchResults');
  if (!inp || !btn || !results) return;
  const q = inp.value.trim();
  btn.disabled = true;
  results.innerHTML = '<div class="sop-status" style="padding:16px"><div class="dot"></div> Searching...</div>';
  try {
    const url = q.length >= 2
      ? `${SERVER}/sop/search?q=${encodeURIComponent(q)}`
      : `${SERVER}/sop/search`;
    const res = await authFetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Search failed');
    if (!data.length) {
      results.innerHTML = '<div class="sop-status" style="padding:16px">No SOPs found.</div>';
      return;
    }
    // Check which docs are already open
    const openIds = new Set(_svTabs.map(t => t.docId));
    results.innerHTML = data.map(row => {
      const isOpen = openIds.has(row.doc_id);
      return `<div class="sv-search-item" onclick="openSvSearchResult('${escHtml(row.doc_id)}')">
        <div class="sv-search-item-icon">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <div class="sv-search-item-body">
          <div class="sv-search-item-id">${escHtml(row.doc_id)}</div>
          <div class="sv-search-item-section">${escHtml(row.section_title)}</div>
          <div class="sv-search-item-preview">${escHtml((row.content || '').substring(0, 120))}</div>
        </div>
        ${isOpen ? '<span class="sv-search-item-open">Open</span>' : ''}
      </div>`;
    }).join('');
  } catch (err) {
    results.innerHTML = `<div style="color:var(--red);font-size:12px;padding:16px">Error: ${escHtml(err.message)}</div>`;
  } finally {
    btn.disabled = false;
  }
}

function openSvSearchResult(docId) {
  _svShowSearch = false;
  openSopDoc(docId);
}

function switchSvTab(tabId) {
  _svShowSearch = false;
  // Save current chat state before switching
  saveSvChatState();
  _svActiveTab = tabId;
  renderSvTabs();
  renderSvContent();
}

function closeSvTab(tabId) {
  _svTabs = _svTabs.filter(t => t.id !== tabId);
  if (_svTabs.length === 0) {
    _svActiveTab = null;
    closeSopViewer();
    return;
  }
  if (_svActiveTab === tabId) {
    _svActiveTab = _svTabs[_svTabs.length - 1].id;
  }
  renderSvTabs();
  renderSvContent();
}

function saveSvChatState() {
  const tab = _svTabs.find(t => t.id === _svActiveTab);
  if (!tab) return;
  const msgs = document.getElementById('svChatMessages');
  if (msgs) tab.chatHtml = msgs.innerHTML;
}

// Lightweight markdown → HTML renderer
function renderMd(raw) {
  if (!raw) return '';
  let text = raw;

  // Strip metadata prefix lines like "[WX-SOP-1001-03] Title |\nSection: Overview"
  text = text.replace(/^\[[\w-]+\][^\n]*\|\s*\n(Section:\s*[^\n]*\n)?/gm, '');
  text = text.replace(/^Section:\s*[^\n]*\n/gm, '');

  // Escape HTML first
  text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Horizontal rules
  text = text.replace(/^---+$/gm, '<hr>');

  // Headers
  text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  text = text.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  text = text.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold and italic
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Blockquotes
  text = text.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

  // Tables — detect markdown table blocks
  text = text.replace(/((?:^\|.+\|$\n?)+)/gm, function(tableBlock) {
    const rows = tableBlock.trim().split('\n').filter(r => r.trim());
    if (rows.length < 2) return tableBlock;
    // Check for separator row
    const sepIdx = rows.findIndex(r => /^\|[\s-:|]+\|$/.test(r));
    if (sepIdx < 0) return tableBlock;
    let html = '<table>';
    // Header rows (before separator)
    rows.slice(0, sepIdx).forEach(row => {
      const cells = row.split('|').filter((_, i, a) => i > 0 && i < a.length - 1);
      html += '<tr>' + cells.map(c => '<th>' + c.trim() + '</th>').join('') + '</tr>';
    });
    // Body rows (after separator)
    rows.slice(sepIdx + 1).forEach(row => {
      const cells = row.split('|').filter((_, i, a) => i > 0 && i < a.length - 1);
      html += '<tr>' + cells.map(c => '<td>' + c.trim() + '</td>').join('') + '</tr>';
    });
    html += '</table>';
    return html;
  });

  // Unordered lists
  text = text.replace(/((?:^[-*] .+$\n?)+)/gm, function(block) {
    const items = block.trim().split('\n').map(l => '<li>' + l.replace(/^[-*] /, '') + '</li>');
    return '<ul>' + items.join('') + '</ul>';
  });

  // Paragraphs — wrap remaining loose lines
  text = text.replace(/^(?!<[huptbl]|<hr|<ul|<ol|<block)(.+)$/gm, '<p>$1</p>');

  // Clean up empty paragraphs
  text = text.replace(/<p>\s*<\/p>/g, '');

  return text;
}

// Extract a readable title from the first section
function getSopDocTitle(sections) {
  if (!sections.length) return '';
  const first = sections[0].content || '';
  // Look for a Title row in a markdown table
  const titleMatch = first.match(/\*\*Title\*\*\s*\|\s*(.+?)\s*\|/);
  if (titleMatch) return titleMatch[1];
  // Fallback: use section_title of the second section (usually "PURPOSE")
  if (sections.length > 1) return sections[1].section_title;
  return '';
}

// Generate smart suggested questions based on the doc
function getSopSuggestions(docId, sections) {
  const content = sections.map(s => s.section_title + ' ' + s.content).join(' ').toLowerCase();
  const suggestions = [];

  if (content.includes('calibrat'))
    suggestions.push('What are the calibration steps?');
  if (content.includes('temperature') || content.includes('setpoint'))
    suggestions.push('What are the critical setpoints?');
  if (content.includes('safety') || content.includes('ppe') || content.includes('hazard'))
    suggestions.push('What are the safety requirements?');
  if (content.includes('acceptance') || content.includes('criteria'))
    suggestions.push('What are the acceptance criteria?');
  if (content.includes('troubleshoot') || content.includes('fault') || content.includes('alarm'))
    suggestions.push('How do I troubleshoot common issues?');
  if (content.includes('clean') || content.includes('steril') || content.includes('cip'))
    suggestions.push('What are the cleaning requirements?');
  if (content.includes('sample') || content.includes('sampling'))
    suggestions.push('What is the sampling procedure?');
  if (content.includes('inoculat'))
    suggestions.push('What are the inoculation steps?');

  // Always add a generic one
  suggestions.push('Summarise the key steps in this procedure');

  return suggestions.slice(0, 3);
}

function renderSvContent() {
  const tab = _svTabs.find(t => t.id === _svActiveTab);
  if (!tab) return;

  const body = document.getElementById('svBody');
  const docTitle = getSopDocTitle(tab.sections);

  let sectionsHtml = `<div class="sv-doc-title">${escHtml(tab.docId)}</div>`;
  if (docTitle) sectionsHtml += `<div class="sv-doc-subtitle">${escHtml(docTitle)}</div>`;

  // Skip the overview/metadata section, start from real content
  const displaySections = tab.sections.filter(sec => {
    const t = (sec.section_title || '').toLowerCase();
    return t !== 'overview' && t !== 'metadata';
  });
  // If filtering removed everything, show all
  const sectionsToRender = displaySections.length ? displaySections : tab.sections;

  sectionsToRender.forEach(sec => {
    sectionsHtml += `<div class="sv-section">
      <div class="sv-section-title">${escHtml(sec.section_title)}</div>
      <div class="sv-section-content">${renderMd(sec.content)}</div>
    </div>`;
  });

  const suggestions = getSopSuggestions(tab.docId, tab.sections);
  const emptyChatHtml = `<div class="sv-chat-empty">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    Ask anything about this SOP.
    <div class="sv-suggestions">
      ${suggestions.map(s => `<div class="sv-sug" onclick="fillSvChat('${escHtml(s)}')">${escHtml(s)}</div>`).join('')}
    </div>
  </div>`;

  body.innerHTML = `
    <div class="sv-doc-pane">${sectionsHtml}</div>
    <div class="sv-chat-pane">
      <div class="sv-chat-header">
        <div class="sv-chat-header-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span class="sv-chat-header-title">Ask this SOP</span>
        </div>
        <div class="sv-chat-header-sub">Searching only within <strong>${escHtml(tab.docId)}</strong></div>
      </div>
      <div class="sv-chat-messages" id="svChatMessages">${tab.chatHtml || emptyChatHtml}</div>
      <div class="sv-chat-footer">
        <div class="sv-chat-input-row">
          <input class="sv-chat-input" id="svChatInput" type="text"
            placeholder="What do you need to know?"
            onkeydown="if(event.key==='Enter')askSvDoc()">
          <button class="sv-chat-send" id="svChatBtn" onclick="askSvDoc()" title="Ask">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
    </div>`;

  // Scroll chat to bottom and focus input
  const msgs = document.getElementById('svChatMessages');
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
  setTimeout(() => { const inp = document.getElementById('svChatInput'); if (inp) inp.focus(); }, 150);
}

// Fill chat input from suggestion click and auto-send
function fillSvChat(question) {
  const inp = document.getElementById('svChatInput');
  if (inp) { inp.value = question; askSvDoc(); }
}

async function askSvDoc() {
  const tab = _svTabs.find(t => t.id === _svActiveTab);
  if (!tab) return;
  const inp = document.getElementById('svChatInput');
  const btn = document.getElementById('svChatBtn');
  const msgs = document.getElementById('svChatMessages');
  if (!inp || !btn || !msgs) return;
  const question = inp.value.trim();
  if (question.length < 3) return;

  btn.disabled = true;
  inp.value = '';

  // Clear empty state on first message
  const emptyEl = msgs.querySelector('.sv-chat-empty');
  if (emptyEl) emptyEl.remove();

  msgs.innerHTML += `<div class="sv-chat-msg user">${escHtml(question)}</div>`;
  msgs.innerHTML += `<div class="sv-chat-thinking" id="svThinking"><div class="dot"></div> Searching ${escHtml(tab.docId)}...</div>`;
  msgs.scrollTop = msgs.scrollHeight;

  try {
    const res = await authFetch(`${SERVER}/sop/${encodeURIComponent(tab.docId)}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');

    const thinkEl = document.getElementById('svThinking');
    if (thinkEl) thinkEl.remove();

    msgs.innerHTML += `<div class="sv-chat-msg ai">${escHtml(data.answer)}</div>`;
    msgs.scrollTop = msgs.scrollHeight;
    tab.chatHtml = msgs.innerHTML;
  } catch (err) {
    const thinkEl = document.getElementById('svThinking');
    if (thinkEl) thinkEl.remove();
    msgs.innerHTML += `<div class="sv-chat-msg ai" style="color:var(--red)">Error: ${escHtml(err.message)}</div>`;
    tab.chatHtml = msgs.innerHTML;
  } finally {
    btn.disabled = false;
    inp.focus();
  }
}

function backToSopSearch() {
  _sopSearchLoaded = false;
  searchSops();
  _sopSearchLoaded = true;
}

function toggleTodoSidebar() {
  const sb = document.getElementById('todoSidebar');
  if (sb.classList.contains('show')) closeTodoSidebar();
  else openTodoSidebar();
}
function openTodoSidebar() {
  closeSopSidebar();
  loadTodos();
  document.getElementById('todoSidebar').classList.add('show');
  document.getElementById('todoBackdrop').classList.add('show');
  setTimeout(() => document.getElementById('todoNewInput').focus(), 280);
}
function closeTodoSidebar() {
  document.getElementById('todoSidebar').classList.remove('show');
  document.getElementById('todoBackdrop').classList.remove('show');
}

async function loadTodos() {
  try {
    const res = await authFetch(`${SERVER}/todos?page=query`);
    if (res.ok) _todos = await res.json();
    else _todos = [];
  } catch { _todos = []; }
  renderTodos();
}

function getChildren(todos, parentId) {
  return todos.filter(t => (t.parent_id || null) === parentId)
    .sort((a, b) => a.position - b.position || new Date(a.created_at) - new Date(b.created_at));
}

function hasChildren(id) {
  return _todos.some(t => t.parent_id === id);
}

function updateProgress() {
  const total = _todos.length;
  const done = _todos.filter(t => t.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('todoCount').textContent = total;
  document.getElementById('todoProgressFill').style.width = pct + '%';
  document.getElementById('todoProgressText').textContent = `${done} of ${total} done`;
  document.getElementById('todoProgressPct').textContent = pct + '%';
  // Color the progress bar based on completion
  const fill = document.getElementById('todoProgressFill');
  fill.style.background = pct === 100 ? 'var(--green)' : pct > 50 ? 'var(--accent)' : 'var(--gold)';
}

function toggleCollapse(id) {
  if (_collapsedGroups.has(id)) _collapsedGroups.delete(id);
  else _collapsedGroups.add(id);
  renderTodos();
}

function renderTodoItem(t, depth) {
  const doneClass = t.done ? ' done' : '';
  const checkSvg = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg>';
  const kids = hasChildren(t.id);
  const collapsed = _collapsedGroups.has(t.id);

  // Collapse chevron or spacer
  let collapseBtn = '';
  if (depth < 2 && kids) {
    collapseBtn = `<button class="td-collapse${collapsed ? ' closed' : ''}" onclick="event.stopPropagation(); toggleCollapse('${t.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></button>`;
  } else if (depth === 0) {
    collapseBtn = '<div class="td-collapse-spacer"></div>';
  }

  // Add sub-task button (only for depth 0 and 1)
  const addBtn = depth < 2 ? `<button class="td-act-btn add" onclick="event.stopPropagation(); showAddChild('${t.id}')" title="Add sub-task"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>` : '';

  let html = `<div class="td-item" data-id="${t.id}">
    ${collapseBtn}
    <button class="td-check${doneClass}" onclick="event.stopPropagation(); toggleTodoDone('${t.id}', ${!t.done})">${t.done ? checkSvg : ''}</button>
    <span class="td-text depth-${depth}${doneClass}" contenteditable="true" onblur="editTodoTitle('${t.id}', this.textContent)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}">${escHtml(t.title)}</span>
    <div class="td-actions">
      ${addBtn}
      <button class="td-act-btn del" onclick="event.stopPropagation(); deleteTodo('${t.id}')" title="Delete"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
  </div>`;

  // Inline add-child input
  if (depth < 2) {
    html += `<div class="td-add-child" id="addChild-${t.id}" style="display:none">
      <input placeholder="${depth === 0 ? 'Add sub-task...' : 'Add detail...'}" onkeydown="if(event.key==='Enter'){event.preventDefault();addTodo(this.value,'${t.id}');this.value='';document.getElementById('addChild-${t.id}').style.display='none';}if(event.key==='Escape'){this.value='';document.getElementById('addChild-${t.id}').style.display='none';}">
    </div>`;
  }

  return html;
}

function renderTodos() {
  const list = document.getElementById('todoList');
  if (!_todos.length) {
    list.innerHTML = `<div class="td-empty">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
      No tasks yet.<br>Add one below to get started.</div>`;
    updateProgress();
    return;
  }

  const topLevel = getChildren(_todos, null);
  let html = '';

  topLevel.forEach(parent => {
    const children = getChildren(_todos, parent.id);
    const collapsed = _collapsedGroups.has(parent.id);

    html += '<div class="td-group">';
    html += renderTodoItem(parent, 0);

    if (children.length && !collapsed) {
      html += '<div class="td-branch">';
      children.forEach(child => {
        const grandchildren = getChildren(_todos, child.id);
        const childCollapsed = _collapsedGroups.has(child.id);

        html += renderTodoItem(child, 1);

        if (grandchildren.length && !childCollapsed) {
          html += '<div class="td-branch-inner">';
          grandchildren.forEach(gc => {
            html += renderTodoItem(gc, 2);
          });
          html += '</div>';
        }
      });
      html += '</div>';
    }

    html += '</div>';
  });

  list.innerHTML = html;
  updateProgress();
}

function showAddChild(parentId) {
  const el = document.getElementById('addChild-' + parentId);
  if (el) {
    // Expand parent if collapsed
    if (_collapsedGroups.has(parentId)) {
      _collapsedGroups.delete(parentId);
      renderTodos();
      setTimeout(() => {
        const el2 = document.getElementById('addChild-' + parentId);
        if (el2) { el2.style.display = 'flex'; el2.querySelector('input').focus(); }
      }, 50);
      return;
    }
    el.style.display = 'flex';
    el.querySelector('input').focus();
  }
}

function addTodoFromInput() {
  const input = document.getElementById('todoNewInput');
  const title = input.value.trim();
  if (!title) return;
  input.value = '';
  addTodo(title, null);
}

async function addTodo(title, parentId) {
  if (!title.trim()) return;
  try {
    await authFetch(`${SERVER}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), parent_id: parentId, page: 'query' })
    });
    await loadTodos();
  } catch (err) { console.error('Add todo error:', err); }
}

async function toggleTodoDone(id, done) {
  try {
    await authFetch(`${SERVER}/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done, page: 'query' })
    });
    const t = _todos.find(x => x.id === id);
    if (t) t.done = done;
    renderTodos();
  } catch (err) { console.error('Toggle todo error:', err); }
}

async function editTodoTitle(id, newTitle) {
  const trimmed = newTitle.trim();
  const t = _todos.find(x => x.id === id);
  if (!trimmed || (t && t.title === trimmed)) return;
  try {
    await authFetch(`${SERVER}/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: trimmed, page: 'query' })
    });
    if (t) t.title = trimmed;
  } catch (err) { console.error('Edit todo error:', err); }
}

async function deleteTodo(id) {
  try {
    await authFetch(`${SERVER}/todos/${id}?page=query`, { method: 'DELETE' });
    _todos = _todos.filter(t => t.id !== id && t.parent_id !== id);
    renderTodos();
    await loadTodos();
  } catch (err) { console.error('Delete todo error:', err); }
}

