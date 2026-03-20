// ACTIONS
// ════════════════════════════════════════════════════════════════════════════════
async function reanalyseSession(clickedBtn) {
  if (!currentSessionId) { console.warn('reanalyseSession: no currentSessionId'); return; }
  var tabBtn = document.getElementById('btnReanalyse');
  var btn = clickedBtn || tabBtn;
  var origHTML = btn ? btn.innerHTML : '';
  var spinnerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:btnSpin 1s linear infinite"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg> Analysing...';
  if (btn) { btn.innerHTML = spinnerHTML; btn.disabled = true; }
  if (tabBtn && tabBtn !== btn) { tabBtn.innerHTML = spinnerHTML; tabBtn.disabled = true; }
  try {
    await authFetch(SERVER + '/feedback/analyse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: currentSessionId }),
    });
    await selectSession(currentSessionId);
    loadSessions();
    // Auto-switch to analysis view
    centerView = 'analysis';
    document.querySelectorAll('.center-tab').forEach(function(t) {
      t.classList.toggle('active', t.dataset.view === 'analysis');
    });
    renderDetail();
  } catch (err) {
    console.error('Re-analyse error:', err);
  }
  if (btn) { btn.innerHTML = origHTML; btn.disabled = false; }
  if (tabBtn && tabBtn !== btn) { tabBtn.innerHTML = origHTML; tabBtn.disabled = false; }
}

async function generatePrompt(clickedBtn) {
  if (!currentSessionId) { console.warn('generatePrompt: no currentSessionId'); return; }
  // Update both the tab-bar button and any inline button that was clicked
  var tabBtn = document.getElementById('btnGenPrompt');
  var btn = clickedBtn || tabBtn;
  var origHTML = btn ? btn.innerHTML : '';
  var spinnerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:btnSpin 1s linear infinite"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg> Generating...';
  if (btn) { btn.innerHTML = spinnerHTML; btn.disabled = true; }
  if (tabBtn && tabBtn !== btn) { tabBtn.innerHTML = spinnerHTML; tabBtn.disabled = true; }

  try {
    var res = await authFetch(SERVER + '/feedback/generate-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionIds: [currentSessionId] }),
    });
    var data = await res.json();

    if (data.error) {
      alert(data.error);
    } else {
      // Slide in the prompt panel
      document.getElementById('rightPanel').classList.add('open');
      document.getElementById('promptContent').innerHTML =
        '<div style="display:flex;gap:8px;margin-bottom:12px;">' +
          '<button class="copy-btn" onclick="copyPrompt()" style="flex:1">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>' +
            'Copy to Clipboard' +
          '</button>' +
        '</div>' +
        '<div class="prompt-block" id="promptText">' + escHtml(data.prompt) + '</div>';
    }
  } catch (err) {
    console.error('Generate prompt error:', err);
  }
  if (btn) { btn.innerHTML = origHTML; btn.disabled = false; }
  if (tabBtn && tabBtn !== btn) { tabBtn.innerHTML = origHTML; tabBtn.disabled = false; }
}

function copyPrompt() {
  var text = document.getElementById('promptText').textContent;
  navigator.clipboard.writeText(text).then(function() {
    var btn = document.querySelector('.copy-btn');
    var orig = btn.innerHTML;
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' + t('fb.copied');
    setTimeout(function() { btn.innerHTML = orig; }, 2000);
  });
}

function closePromptPanel() {
  document.getElementById('rightPanel').classList.remove('open');
}

async function generateTrendReport() {
  var el = document.getElementById('trendContent');
  el.innerHTML = '<div class="empty-state" style="height:120px"><p style="color:var(--dim)">' + t('fb.analysing') + '</p></div>';
  try {
    var res = await authFetch(SERVER + '/feedback/batch-analyse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    var data = await res.json();
    if (data.html) {
      el.innerHTML = data.html;
    } else {
      el.innerHTML = '<div class="empty-state" style="height:120px"><p style="color:var(--dim)">No feedback data available.</p></div>';
    }
  } catch (err) {
    console.error('Trend report error:', err);
    el.innerHTML = '<div class="empty-state" style="height:120px"><p style="color:var(--red)">Failed to generate report.</p></div>';
  }
}

async function exportFeedback(format) {
  try {
    var res = await authFetch(SERVER + '/feedback/sessions');
    var data = await res.json();
    var content, mime, ext;
    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
      mime = 'application/json';
      ext = 'json';
    } else {
      // CSV
      var headers = ['id','user_name','user_role','status','sentiment','severity','summary','categories','created_at'];
      var rows = [headers.join(',')];
      data.forEach(function(s) {
        rows.push(headers.map(function(h) {
          var v = Array.isArray(s[h]) ? s[h].join('; ') : (s[h] || '');
          return '"' + String(v).replace(/"/g, '""') + '"';
        }).join(','));
      });
      content = rows.join('\n');
      mime = 'text/csv';
      ext = 'csv';
    }
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'vent-feedback-' + new Date().toISOString().slice(0,10) + '.' + ext;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Export error:', err);
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// UI WIRING
// ════════════════════════════════════════════════════════════════════════════════
function escHtml(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Filter buttons
document.querySelectorAll('.filter-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    currentFilter = btn.dataset.filter || '';
    loadSessions();
  });
});

// Center tabs
document.querySelectorAll('.center-tab').forEach(function(tab) {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.center-tab').forEach(function(t) { t.classList.remove('active'); });
    tab.classList.add('active');
    centerView = tab.dataset.view;
    if (currentSession) renderDetail();
  });
});

// Bottom tabs
document.querySelectorAll('.bottom-tab').forEach(function(tab) {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.bottom-tab').forEach(function(t) { t.classList.remove('active'); });
    tab.classList.add('active');
    document.querySelectorAll('.bottom-pane').forEach(function(p) { p.classList.remove('active'); });
    var pane = document.getElementById('pane' + tab.dataset.pane.charAt(0).toUpperCase() + tab.dataset.pane.slice(1));
    if (pane) pane.classList.add('active');
  });
});

// ── Resizer Logic ──
(function(){
  var rh = document.getElementById('resizerH');
  var wb = document.getElementById('workbench');
  if(!rh || !wb) return;
  var startY, startH;
  rh.addEventListener('mousedown', function(e){
    e.preventDefault();
    rh.classList.add('dragging');
    startY = e.clientY;
    var rows = getComputedStyle(wb).gridTemplateRows.split(/\s+/);
    startH = parseFloat(rows[2]) || 220;
    function onMove(e2){
      var diff = startY - e2.clientY;
      var newH = Math.max(80, Math.min(500, startH + diff));
      wb.style.gridTemplateRows = '1fr 4px ' + newH + 'px';
    }
    function onUp(){ rh.classList.remove('dragging'); document.removeEventListener('mousemove',onMove); document.removeEventListener('mouseup',onUp); }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
})();

// Hide admin-only actions for operators
(function(){
  var role = localStorage.getItem('vent_role') || 'operator';
  if (role === 'operator') {
    document.getElementById('centerActions').style.display = 'none';
  }
})();
