// ════════════════════════════════════════════════════════════════════════════════
// SESSION LIST
// ════════════════════════════════════════════════════════════════════════════════
async function loadSessions() {
  try {
    var url = SERVER + '/feedback/sessions';
    if (currentFilter) url += '?status=' + currentFilter;
    var res = await authFetch(url);
    sessions = await res.json();
    renderSessionList();
    document.getElementById('sessionCount').textContent = sessions.length;
    document.getElementById('statusSessions').textContent = 'Sessions: ' + sessions.length;
  } catch (err) {
    console.error('Load sessions error:', err);
  }
}

function renderSessionList() {
  var list = document.getElementById('sessionList');
  if (!sessions.length) {
    list.innerHTML = '<div class="empty-state" style="padding:20px;height:auto"><span style="font-size:11px">' + t('fb.noSessions') + '</span></div>';
    return;
  }
  var roleColors = { operator:'#4ec9b0', qa:'#007acc', director:'#ffc64d', msat:'#4ec9b0', engineering:'#8e8e8e', admin:'#f44747' };

  list.innerHTML = sessions.map(function(s) {
    var isActive = s.id === currentSessionId;
    var tags = (s.categories || []).map(function(c) { return '<span class="cat-tag ' + c + '">' + c.replace('_',' ') + '</span>'; }).join('');
    var roleColor = roleColors[s.user_role] || '#8e8e8e';
    return '<div class="session-card' + (isActive ? ' active' : '') + '" onclick="selectSession(\'' + s.id + '\')">' +
      '<div class="session-card-top">' +
        '<span class="sev-dot sev-' + (s.severity || 'low') + '"></span>' +
        '<span class="session-user">' + (s.user_name || 'Unknown') + '</span>' +
        '<span class="session-role-badge" style="background:' + roleColor + '22;color:' + roleColor + '">' + s.user_role + '</span>' +
        '<span class="status-pill status-' + s.status + '">' + s.status + '</span>' +
      '</div>' +
      '<div class="session-date">' + new Date(s.created_at).toLocaleDateString() + ' &middot; ' + (s.message_count || 0) + ' msgs' + (s.session_duration ? ' &middot; ' + Math.floor(s.session_duration/60) + 'm' + (s.session_duration%60) + 's' : '') + '</div>' +
      (s.summary ? '<div class="session-summary">' + s.summary + '</div>' : '') +
      (tags ? '<div class="session-tags">' + tags + '</div>' : '') +
    '</div>';
  }).join('');
}

// ════════════════════════════════════════════════════════════════════════════════
// SESSION DETAIL
// ════════════════════════════════════════════════════════════════════════════════
async function selectSession(id) {
  currentSessionId = id;
  renderSessionList(); // update active state
  try {
    var res = await authFetch(SERVER + '/feedback/sessions/' + id);
    currentSession = await res.json();
    renderDetail();
    document.getElementById('centerActions').style.display = 'flex';
  } catch (err) {
    console.error('Load session error:', err);
  }
}

function renderDetail() {
  if (!currentSession) return;
  if (centerView === 'transcript') renderTranscript();
  else renderAnalysis();
}

function renderTranscript() {
  var el = document.getElementById('centerContent');
  var transcript = currentSession.transcript || [];
  if (!transcript.length) {
    el.innerHTML = '<div class="empty-state"><p style="color:var(--dim)">No messages in this session.</p></div>';
    return;
  }
  el.innerHTML = transcript.map(function(msg) {
    var isOp = msg.role === 'user';
    var cls = isOp ? 'operator' : 'assistant';
    var avCls = isOp ? 'operator-av' : 'charlie-av';
    var initials = isOp ? 'OP' : 'CH';
    var time = msg.ts ? new Date(msg.ts).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '';
    return '<div class="transcript-msg ' + cls + '">' +
      '<div class="msg-avatar ' + avCls + '">' + initials + '</div>' +
      '<div>' +
        '<div class="msg-bubble">' + escHtml(msg.content) + '</div>' +
        '<div class="msg-time">' + time + '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function renderAnalysis() {
  var el = document.getElementById('centerContent');
  var a = currentSession.analysis;
  if (!a) {
    var status = currentSession.status;
    if (status === 'active') {
      el.innerHTML = '<div class="empty-state"><p style="color:var(--dim)">Session is still active. End the session to generate analysis.</p></div>';
    } else {
      el.innerHTML = '<div class="empty-state" style="gap:12px">' +
        '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
        '<p style="color:var(--dim)">No analysis yet</p>' +
        '<button class="action-btn primary" onclick="reanalyseSession(this)" style="margin-top:8px">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' +
          ' Summarise this session' +
        '</button>' +
      '</div>';
    }
    return;
  }

  var sentiment = currentSession.sentiment || a.sentiment || 'neutral';
  var severity = currentSession.severity || a.severity || 'low';
  var summary = currentSession.summary || a.summary || '';
  var categories = currentSession.categories || a.categories || [];
  var quotes = a.key_quotes || currentSession.key_quotes || [];
  var themes = a.themes || [];
  var items = a.actionable_items || [];

  var html = '<div class="analysis-grid">';

  // Summary hero card
  html += '<div class="analysis-card full-width" style="background:var(--s2);border-color:var(--borderhi)">' +
    '<div class="analysis-label" style="font-size:12px;margin-bottom:6px">Summary</div>' +
    '<div class="analysis-value" style="font-size:13px;line-height:1.6;color:var(--text)">' + escHtml(summary) + '</div>' +
    '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;align-items:center">' +
      '<span class="sentiment-badge sentiment-' + sentiment + '">' + sentiment + '</span>' +
      '<span class="severity-badge severity-' + severity + '">' + severity + ' severity</span>' +
      categories.map(function(c) { return '<span class="cat-tag ' + c + '">' + c.replace('_',' ') + '</span>'; }).join('') +
    '</div>' +
  '</div>';

  // Key quotes
  if (quotes.length) {
    html += '<div class="analysis-card full-width">' +
      '<div class="analysis-label">Key Quotes</div>' +
      '<div class="analysis-value">' +
        quotes.map(function(q) { return '<div class="quote-block">"' + escHtml(q) + '"</div>'; }).join('') +
      '</div>' +
    '</div>';
  }

  // Themes
  if (themes.length) {
    html += '<div class="analysis-card full-width">' +
      '<div class="analysis-label">Themes</div>' +
      '<div class="analysis-value">' +
        themes.map(function(th) {
          return '<div style="margin:6px 0;padding:8px 10px;background:var(--bg);border-radius:6px;border-left:3px solid var(--accent)">' +
            '<strong style="color:var(--text);font-size:12px">' + escHtml(th.name) + '</strong>' +
            '<div style="font-size:11px;color:var(--mid);margin-top:2px">' + escHtml(th.description) + '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>';
  }

  // Action items
  if (items.length) {
    html += '<div class="analysis-card full-width">' +
      '<div class="analysis-label">Action Items</div>' +
      '<div class="analysis-value">' +
        items.map(function(item) {
          return '<div class="action-item">' +
            '<div class="action-item-title"><span class="action-item-priority priority-' + (item.priority || 'medium') + '">' + (item.priority || 'medium') + '</span>' + escHtml(item.title) + '</div>' +
            '<div class="action-item-desc">' + escHtml(item.description) + '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>';
  }

  // Generate Prompt CTA
  html += '<div style="padding:16px 0;text-align:center">' +
    '<button class="action-btn primary" onclick="generatePrompt(this)" style="padding:10px 24px;font-size:13px;border-radius:8px">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>' +
      ' Generate Requirements Brief' +
    '</button>' +
    '<p style="color:var(--dim);font-size:10px;margin-top:6px">Creates a clear requirements brief you can paste into Claude Code</p>' +
  '</div>';

  html += '</div>';
  el.innerHTML = html;
}

// ════════════════════════════════════════════════════════════════════════════════
