// ── MODAL ──
function showNewDocModal() {
  document.getElementById('newDocModal').classList.add('show');
  document.getElementById('newDocTitle').value = '';
  document.getElementById('newDocDesc').value = '';
  document.getElementById('createDocBtn').disabled = true;
  setTimeout(() => document.getElementById('newDocTitle').focus(), 100);
}
function hideNewDocModal() {
  document.getElementById('newDocModal').classList.remove('show');
}
function validateNewDoc() {
  document.getElementById('createDocBtn').disabled = !document.getElementById('newDocTitle').value.trim();
}
function createDocument() {
  const title = document.getElementById('newDocTitle').value.trim();
  const area = document.getElementById('newDocArea').value;
  const desc = document.getElementById('newDocDesc').value.trim();
  if (!title) return;

  const doc = makeDoc(title, area, desc);
  documents.push(doc);
  saveDocs(documents);
  createDocOnServer(doc);
  hideNewDocModal();
  renderDocList();
  updateCounts();
  openDoc(doc.id);
  logActivity('Created new document: "' + title + '"', 'action');
}

// ── UTILITIES ──
function updateCounts() {
  var nonChat = documents.filter(function(d){ return d.source !== 'chat'; }).length;
  document.getElementById('docCount').textContent = nonChat;
  document.getElementById('statusDocCount').textContent = documents.length + ' document' + (documents.length !== 1 ? 's' : '');
}

// ── SIGN-OFF / APPROVAL SYSTEM ──
function buildSignoffSectionHtml(doc) {
  const signoffs = doc.signoffs || [];
  const canReview = ['qa', 'director', 'admin'].includes(userRole);
  const canApprove = ['director', 'admin'].includes(userRole);

  let html = '<div class="signoff-section">';
  html += '<div class="signoff-label">Sign-Off &amp; Approval</div>';

  // Status bar
  const statusLabels = { draft: 'Draft', reviewed: 'Reviewed', approved: 'Approved', rejected: 'Rejected', published: 'Published' };
  const statusLabel = statusLabels[doc.status] || doc.status;
  html += '<div class="signoff-status-bar">' +
    '<span class="signoff-status-pill status-' + doc.status + '">' + statusLabel + '</span>' +
    '<span class="signoff-status-text">' +
      (doc.status === 'draft' ? 'Awaiting review' :
       doc.status === 'reviewed' ? 'Reviewed — awaiting approval' :
       doc.status === 'approved' ? 'Approved and locked' :
       doc.status === 'rejected' ? 'Rejected — returned to draft' : '') +
    '</span>' +
  '</div>';

  // Sign-off chain
  if (signoffs.length) {
    html += '<div class="signoff-chain">';
    signoffs.forEach(s => {
      const actionLabel = s.action === 'reviewed' ? 'Reviewed' : s.action === 'approved' ? 'Approved' : 'Rejected';
      const ts = s.timestamp ? new Date(s.timestamp) : new Date();
      const dateStr = ts.toLocaleDateString('en-IE', { day:'2-digit', month:'short', year:'numeric' }) + ' ' + ts.toLocaleTimeString('en-IE', { hour:'2-digit', minute:'2-digit' });
      html += '<div class="signoff-entry">' +
        '<div class="signoff-entry-dot ' + s.action + '"></div>' +
        '<div class="signoff-entry-info">' +
          '<div>' +
            '<span class="signoff-entry-name">' + esc(s.user) + '</span>' +
            '<span class="signoff-entry-role">' + esc(s.role || '') + '</span>' +
            '<span style="float:right;font-size:9px;color:var(--dim)">' + actionLabel + '</span>' +
          '</div>' +
          '<div class="signoff-entry-time">' + dateStr + '</div>' +
          (s.comment ? '<div class="signoff-entry-comment">"' + esc(s.comment) + '"</div>' : '') +
        '</div>' +
      '</div>';
    });
    html += '</div>';
  }

  // Action buttons
  html += '<div class="signoff-actions">';
  if (doc.status === 'draft' && canReview) {
    html += '<button class="signoff-btn review" onclick="openSignoffModal(\'' + doc.id + '\',\'reviewed\')">Review &amp; Sign</button>';
  }
  if (doc.status === 'reviewed' && canApprove) {
    html += '<button class="signoff-btn approve" onclick="openSignoffModal(\'' + doc.id + '\',\'approved\')">Approve &amp; Sign</button>';
  }
  if ((doc.status === 'draft' || doc.status === 'reviewed') && canReview) {
    html += '<button class="signoff-btn reject" onclick="openSignoffModal(\'' + doc.id + '\',\'rejected\')">Reject</button>';
  }
  if (doc.status === 'draft' && !canReview) {
    html += '<span style="font-size:10px;color:var(--dim)">QA or Director sign-off required</span>';
  }
  html += '</div></div>';

  return html;
}

function openSignoffModal(docId, action) {
  const doc = documents.find(d => d.id === docId);
  if (!doc) return;

  const actionLabels = { reviewed: 'Review', approved: 'Approve', rejected: 'Reject' };
  const actionLabel = actionLabels[action] || action;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IE', { day:'2-digit', month:'short', year:'numeric' });
  const timeStr = now.toLocaleTimeString('en-IE', { hour:'2-digit', minute:'2-digit' });

  const ov = document.createElement('div');
  ov.className = 'signoff-modal-overlay';
  ov.innerHTML = '<div class="signoff-modal">' +
    '<div class="signoff-modal-title">' + actionLabel + ' Document</div>' +
    '<div class="signoff-modal-desc">You are about to <strong>' + actionLabel.toLowerCase() + '</strong> "' + esc(doc.title) + '". This action will be permanently recorded in the audit trail.</div>' +
    '<div class="signoff-modal-sig">' +
      '<div class="signoff-modal-sig-line"><span class="signoff-modal-sig-label">Name</span><span class="signoff-modal-sig-value">' + esc(userName) + '</span></div>' +
      '<div class="signoff-modal-sig-line"><span class="signoff-modal-sig-label">Role</span><span class="signoff-modal-sig-value">' + userRole.toUpperCase() + '</span></div>' +
      '<div class="signoff-modal-sig-line"><span class="signoff-modal-sig-label">Date</span><span class="signoff-modal-sig-value">' + dateStr + ' ' + timeStr + '</span></div>' +
    '</div>' +
    '<textarea class="signoff-modal-comment" id="signoffComment" placeholder="Add a comment (optional)…"></textarea>' +
    '<div class="signoff-modal-actions">' +
      '<button class="edit-btn" onclick="this.closest(\'.signoff-modal-overlay\').remove()">Cancel</button>' +
      '<button class="signoff-btn ' + (action === 'rejected' ? 'reject' : action === 'approved' ? 'approve' : 'review') + '" id="signoffConfirmBtn" onclick="submitSignoff(\'' + docId + '\',\'' + action + '\')">' +
        'Confirm ' + actionLabel +
      '</button>' +
    '</div>' +
  '</div>';

  document.body.appendChild(ov);
  document.getElementById('signoffComment').focus();
}

async function submitSignoff(docId, action) {
  const comment = (document.getElementById('signoffComment') || {}).value || '';
  const confirmBtn = document.getElementById('signoffConfirmBtn');
  if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = 'Signing…'; }

  try {
    const res = await authFetch(SERVER + '/docs/documents/' + encodeURIComponent(docId) + '/signoff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, comment })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Sign-off failed' }));
      alert(err.error || 'Sign-off failed');
      if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = 'Retry'; }
      return;
    }

    const result = await res.json();

    // Update local document
    const doc = documents.find(d => d.id === docId);
    if (doc) {
      doc.status = result.status;
      if (!doc.signoffs) doc.signoffs = [];
      doc.signoffs.push(result.signoff);
      doc.updated = result.signoff.timestamp;
      doc.versions.push({
        time: result.signoff.timestamp,
        label: (action === 'reviewed' ? 'Reviewed' : action === 'approved' ? 'Approved' : 'Rejected') + ' by ' + userName + ' (' + userRole.toUpperCase() + ')' + (comment ? ' — ' + comment : ''),
        user: userName
      });
      saveDocs(documents);
    }

    // Close modal
    const overlay = document.querySelector('.signoff-modal-overlay');
    if (overlay) overlay.remove();

    // Refresh UI
    renderDocList();
    renderEditorTabs();
    if (doc) {
      renderDocView(doc);
      renderRightPanel(doc);
    }

    const actionLabel = action === 'reviewed' ? 'Reviewed' : action === 'approved' ? 'Approved' : 'Rejected';
    logActivity(actionLabel + ' document: "' + (doc ? doc.title : docId) + '"', 'action');

  } catch (err) {
    console.error('Sign-off error:', err);
    alert('Sign-off failed: ' + err.message);
    if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = 'Retry'; }
  }
}

function logActivity(message, type) {
  const log = document.getElementById('activityLog');
  const now = new Date();
  const ts = now.toTimeString().slice(0, 8);
  const cls = type === 'warn' ? 'log-warn' : type === 'action' ? 'log-action' : 'log-info';
  log.innerHTML += '<div class="log-line"><span class="log-time">' + ts + '</span><span class="' + cls + '">' + esc(message) + '</span></div>';
  log.scrollTop = log.scrollHeight;
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  return days + 'd ago';
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + d.toTimeString().slice(0, 5);
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

// ── RESIZE LOGIC ──
let _rightExpanded = false;
let _savedRightW = 300;
let _savedLeftW = 240;

function toggleExpandRight() {
  const wb   = document.getElementById('workbench');
  const btn  = document.getElementById('expandRightBtn');
  const icon = document.getElementById('expandIcon');

  if (!_rightExpanded) {
    // Save current widths
    _savedLeftW  = wb.querySelector('.left-panel').getBoundingClientRect().width;
    _savedRightW = wb.querySelector('.right-panel').getBoundingClientRect().width;
    // Expand: hide left panel + centre, give all space to right
    wb.style.gridTemplateColumns = '0px 0px 0px 0px 1fr';
    wb.querySelector('.left-panel').style.overflow = 'hidden';
    document.getElementById('resizerV1').style.display = 'none';
    document.getElementById('resizerV2').style.display = 'none';
    btn.classList.add('expanded');
    btn.title = 'Collapse panel';
    icon.innerHTML = '<polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/>';
    _rightExpanded = true;
  } else {
    // Restore
    wb.style.gridTemplateColumns = _savedLeftW + 'px 6px 1fr 6px ' + _savedRightW + 'px';
    wb.querySelector('.left-panel').style.overflow = '';
    document.getElementById('resizerV1').style.display = '';
    document.getElementById('resizerV2').style.display = '';
    btn.classList.remove('expanded');
    btn.title = 'Expand panel';
    icon.innerHTML = '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>';
    _rightExpanded = false;
  }
}

(function initResizers() {
  const wb   = document.getElementById('workbench');
  const r1   = document.getElementById('resizerV1');
  const r2   = document.getElementById('resizerV2');
  const rh   = document.getElementById('resizerH');
  const lp   = wb.querySelector('.left-panel');
  const rp   = wb.querySelector('.right-panel');
  const bp   = wb.querySelector('.bottom-panel');

  // ── Left-panel inner resizer (between Docs and Exports) ──
  var lpResizer = document.getElementById('lpInnerResizer');
  var lpDocs = document.getElementById('lpDocsSection');
  var lpExports = document.getElementById('lpExportsSection');
  lpResizer.addEventListener('mousedown', function(e) {
    e.preventDefault();
    lpResizer.classList.add('dragging');
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'row-resize';
    var lpRect = lp.getBoundingClientRect();
    var startY = e.clientY;
    var startDocsFlex = lpDocs.getBoundingClientRect().height;
    var startExportsFlex = lpExports.getBoundingClientRect().height;
    var totalH = startDocsFlex + startExportsFlex;

    function onMove(ev) {
      var dy = ev.clientY - startY;
      var newDocsH = Math.max(60, Math.min(startDocsFlex + dy, totalH - 60));
      var newExportsH = totalH - newDocsH;
      lpDocs.style.flex = '0 0 ' + newDocsH + 'px';
      lpExports.style.flex = '0 0 ' + newExportsH + 'px';
    }
    function onUp() {
      lpResizer.classList.remove('dragging');
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  let leftW  = 240;
  let rightW = 300;
  let botH   = 160;

  function applyCols() {
    wb.style.gridTemplateColumns = leftW + 'px 6px 1fr 6px ' + rightW + 'px';
    _rightExpanded = false; // collapse state if user drags
    const btn = document.getElementById('expandRightBtn');
    if (btn) { btn.classList.remove('expanded'); btn.title = 'Expand panel'; }
  }
  function applyRows() {
    wb.style.gridTemplateRows = '1fr 6px ' + botH + 'px';
  }

  // Left resizer
  r1.addEventListener('mousedown', function(e) {
    e.preventDefault();
    r1.classList.add('dragging');
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    leftW = lp.getBoundingClientRect().width;
    rightW = rp.getBoundingClientRect().width;
    var lastX = e.clientX;

    function onMove(ev) {
      var dx = ev.clientX - lastX;
      lastX = ev.clientX;
      leftW = Math.max(140, Math.min(leftW + dx, wb.clientWidth - 250));
      applyCols();
    }
    function onUp() {
      r1.classList.remove('dragging');
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  // Right resizer
  r2.addEventListener('mousedown', function(e) {
    e.preventDefault();
    r2.classList.add('dragging');
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    leftW = lp.getBoundingClientRect().width;
    rightW = rp.getBoundingClientRect().width;
    var lastX = e.clientX;

    function onMove(ev) {
      var dx = ev.clientX - lastX;
      lastX = ev.clientX;
      rightW = Math.max(0, Math.min(rightW - dx, wb.clientWidth - 350));
      applyCols();
    }
    function onUp() {
      r2.classList.remove('dragging');
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  // Horizontal resizer
  rh.addEventListener('mousedown', function(e) {
    e.preventDefault();
    rh.classList.add('dragging');
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'row-resize';
    botH = bp.getBoundingClientRect().height;
    var lastY = e.clientY;

    function onMove(ev) {
      var dy = ev.clientY - lastY;
      lastY = ev.clientY;
      botH = Math.max(40, Math.min(botH - dy, wb.clientHeight - 200));
      applyRows();
    }
    function onUp() {
      rh.classList.remove('dragging');
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
})();


