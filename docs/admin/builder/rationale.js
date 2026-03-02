// ── RATIONALE ("WHY?") PANEL SYSTEM ──
let _rationaleCache = {}; // docId → rationale array

async function fetchRationale(docId) {
  if (_rationaleCache[docId]) return _rationaleCache[docId];
  try {
    const res = await authFetch(SERVER + '/sop/' + encodeURIComponent(docId) + '/rationale');
    const data = await res.json();
    if (Array.isArray(data) && data.length) {
      _rationaleCache[docId] = data;
      return data;
    }
  } catch (err) {
    console.error('Rationale fetch error:', err);
  }
  return [];
}

function matchRationale(rationaleList, sectionTitle) {
  if (!rationaleList || !rationaleList.length) return null;
  const t = sectionTitle.toUpperCase();
  // Exact match first
  let match = rationaleList.find(r => t === r.section.toUpperCase());
  if (match) return match;
  // Partial match — rationale section key contained in the section title
  match = rationaleList.find(r => t.includes(r.section.toUpperCase()));
  if (match) return match;
  // Reverse — section title contained in rationale section key
  match = rationaleList.find(r => r.section.toUpperCase().includes(t));
  return match || null;
}

async function openRationalePanel(docId, sectionTitle) {
  const rationale = await fetchRationale(docId);
  const entry = matchRationale(rationale, sectionTitle);

  if (!entry) {
    logActivity('No rationale found for "' + sectionTitle + '"', 'warn');
    return;
  }

  // Open as a new tab in the right panel
  const tabId = 'why_' + docId + '_' + sectionTitle.replace(/[^a-zA-Z0-9]/g, '_') + '_' + Date.now();
  const shortLabel = entry.title.replace(/^Why\s+/i, '').substring(0, 22);

  openSopTabs.push({ id: tabId, query: shortLabel, data: null, _rationale: entry, _isWhy: true });
  activeSopTab = tabId;
  openStepTabs = [];
  activeStepTab = null;
  document.querySelectorAll('.doc-step').forEach(s => s.classList.remove('editing'));

  renderSopTabs();
  renderRationaleView(tabId);
  updatePptxBtnState();
  logActivity('Opened rationale: "' + entry.title + '"', 'info');
}

function renderRationaleView(tabId) {
  const tab = openSopTabs.find(t => t.id === tabId);
  if (!tab || !tab._rationale) return;
  const r = tab._rationale;
  const rc = document.getElementById('rightContent');

  let html = '<div class="rationale-panel">';

  // Header
  html += '<div class="rat-header">' +
    '<div class="rat-icon">?</div>' +
    '<div>' +
      '<div class="rat-section-label">' + esc(r.section) + '</div>' +
      '<div class="rat-title">' + esc(r.title) + '</div>' +
    '</div>' +
  '</div>';

  // Summary
  html += '<div class="rat-summary">' + esc(r.summary) + '</div>';

  // Detail blocks
  if (r.detail && r.detail.length) {
    r.detail.forEach(d => {
      html += '<div class="rat-detail-block">' +
        '<div class="rat-detail-heading">' +
          '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>' +
          esc(d.heading) +
        '</div>' +
        '<div class="rat-detail-content">' + esc(d.content) + '</div>' +
      '</div>';
    });
  }

  // Key Points
  if (r.keyPoints && r.keyPoints.length) {
    html += '<div class="rat-keypoints">' +
      '<div class="rat-keypoints-title">' +
        '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' +
        'Key Points' +
      '</div>';
    r.keyPoints.forEach(kp => {
      html += '<div class="rat-keypoint">' +
        '<span class="rat-keypoint-bullet">&#x25C6;</span>' +
        '<span>' + esc(kp) + '</span>' +
      '</div>';
    });
    html += '</div>';
  }

  // References
  if (r.references && r.references.length) {
    html += '<div class="rat-references">' +
      '<div class="rat-ref-title">Regulatory &amp; Technical References</div>';
    r.references.forEach(ref => {
      html += '<div class="rat-ref">' +
        '<svg class="rat-ref-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
        '<span>' + esc(ref) + '</span>' +
      '</div>';
    });
    html += '</div>';
  }

  html += '</div>';
  rc.innerHTML = html;
}

