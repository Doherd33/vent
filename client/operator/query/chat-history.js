import { escHtml } from '/shared/utils.js';
import { buildAnswerHtml, scrollToBottom } from './query-engine.js';

// Auto-resize textarea
const qInput = document.getElementById('qInput');
qInput.addEventListener('input', () => {
  qInput.style.height = 'auto';
  qInput.style.height = Math.min(qInput.scrollHeight, 120) + 'px';
});
qInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) { e.preventDefault(); runQuery(); }
});

export function fillAndSend(q) {
  qInput.value = q;
  qInput.dispatchEvent(new Event('input'));
  runQuery();
}

// ── CONVERSATION HISTORY (for follow-up questions) ──
export let _chatHistory = []; // [{role:'user',content:'...'}, {role:'assistant',summary:'...',diagramHint:'...'}]
export let _currentSessionId = null;   // ID of the active chat_session in Supabase
let _sessionsList = [];          // cached list of sessions for sidebar

export function clearChat() {
  _chatHistory = [];
  _currentSessionId = null;
  const inner = document.getElementById('chatInner');
  inner.querySelectorAll('.chat-turn').forEach(el => el.remove());
  document.getElementById('emptyState').style.display = '';
  // Deselect in sidebar
  document.querySelectorAll('.hs-item.active').forEach(el => el.classList.remove('active'));
}

export async function startNewChat() {
  // Save current session before switching
  await saveCurrentSession();
  clearChat();
}

// ── HISTORY SIDEBAR ──
export function toggleHistorySidebar() {
  const sb = document.getElementById('historySidebar');
  if (sb.classList.contains('show')) closeHistorySidebar();
  else openHistorySidebar();
}

export function openHistorySidebar() {
  loadSessionsList();
  document.getElementById('historySidebar').classList.add('show');
  document.getElementById('historyBackdrop').classList.add('show');
}

export function closeHistorySidebar() {
  document.getElementById('historySidebar').classList.remove('show');
  document.getElementById('historyBackdrop').classList.remove('show');
}

async function loadSessionsList() {
  try {
    const res = await authFetch(`${SERVER}/chat/sessions`);
    if (res.ok) {
      _sessionsList = await res.json();
    } else {
      // Fallback: load from localStorage if Supabase table not ready
      _sessionsList = JSON.parse(localStorage.getItem('vent_chat_sessions') || '[]');
    }
    renderSessionsList();
  } catch (err) {
    console.error('Load sessions error:', err);
    _sessionsList = JSON.parse(localStorage.getItem('vent_chat_sessions') || '[]');
    renderSessionsList();
  }
}

function renderSessionsList() {
  const list = document.getElementById('hsList');
  const counter = document.getElementById('hsCount');

  // Update count badge
  if (counter) counter.textContent = _sessionsList.length;

  if (!_sessionsList.length) {
    list.innerHTML = `<div class="hs-empty">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="margin-bottom:8px;opacity:.4"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><br>
      No conversations yet.<br><span style="color:var(--dim)">Ask a question to get started.</span></div>`;
    return;
  }

  // Group by date
  const today = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);

  const groups = { today: [], yesterday: [], week: [], older: [] };

  _sessionsList.forEach(s => {
    const d = new Date(s.updated_at || s.created_at);
    if (d >= today) groups.today.push(s);
    else if (d >= yesterday) groups.yesterday.push(s);
    else if (d >= weekAgo) groups.week.push(s);
    else groups.older.push(s);
  });

  let html = '';

  function relativeTime(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return mins + 'm';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h';
    const days = Math.floor(hrs / 24);
    if (days < 7) return days + 'd';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function renderGroup(label, items) {
    if (!items.length) return '';
    let h = `<div class="hs-date-label">${label}</div>`;
    items.forEach(s => {
      const active = s.id === _currentSessionId ? ' active' : '';
      const time = relativeTime(s.updated_at || s.created_at);
      const msgCount = s.messages ? Math.floor(s.messages.length / 2) : 0;
      const msgLabel = msgCount > 0 ? `<span class="hs-item-msgs">${msgCount} Q</span>` : '';
      h += `<div class="hs-item${active}" data-sid="${s.id}" data-action="loadSession" data-session-id="${s.id}">
        <div class="hs-item-dot"></div>
        <div class="hs-item-body">
          <div class="hs-item-text" title="${escHtml(s.title)}">${escHtml(s.title)}</div>
          <div class="hs-item-meta">
            <span class="hs-item-time">${time}</span>
            ${msgLabel}
          </div>
        </div>
        <button class="hs-item-menu-btn" data-action="toggleItemMenu" data-session-id="${s.id}" title="Options">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
        </button>
      </div>`;
    });
    return h;
  }

  html += renderGroup('Today', groups.today);
  html += renderGroup('Yesterday', groups.yesterday);
  html += renderGroup('Previous 7 days', groups.week);
  html += renderGroup('Older', groups.older);

  list.innerHTML = html;
}

export async function loadSession(sessionId) {
  // Save current session before switching
  await saveCurrentSession();

  try {
    let session;
    if (sessionId.startsWith('local-')) {
      // Load from localStorage
      const sessions = JSON.parse(localStorage.getItem('vent_chat_sessions') || '[]');
      session = sessions.find(s => s.id === sessionId);
      if (!session) throw new Error('Session not found');
    } else {
      const res = await authFetch(`${SERVER}/chat/sessions/${sessionId}`);
      if (!res.ok) throw new Error('Failed to load session');
      session = await res.json();
    }

    // Clear current chat UI
    const inner = document.getElementById('chatInner');
    inner.querySelectorAll('.chat-turn').forEach(el => el.remove());
    document.getElementById('emptyState').style.display = 'none';

    // Restore conversation state
    _currentSessionId = session.id;
    _chatHistory = session.messages || [];

    // Rebuild chat UI from messages
    for (const msg of _chatHistory) {
      if (msg.role === 'user') {
        const turn = document.createElement('div');
        turn.className = 'chat-turn';
        turn.innerHTML = `
          <div class="turn-q-meta">${msg.area || ''}</div>
          <div class="turn-q"><div class="turn-q-bubble">${escHtml(msg.content)}</div></div>`;
        inner.appendChild(turn);
      } else if (msg.role === 'assistant' && msg.fullResponse) {
        const turn = document.createElement('div');
        turn.className = 'chat-turn';
        turn.innerHTML = buildAnswerHtml(msg.fullResponse);
        inner.appendChild(turn);
      } else if (msg.role === 'assistant' && msg.summary) {
        const turn = document.createElement('div');
        turn.className = 'chat-turn';
        turn.innerHTML = `<div class="answer-card"><div class="answer-body"><div class="answer-summary">${escHtml(msg.summary)}</div></div></div>`;
        inner.appendChild(turn);
      }
    }

    scrollToBottom();

    // Update active state in sidebar
    document.querySelectorAll('.hs-item.active').forEach(el => el.classList.remove('active'));
    const activeItem = document.querySelector(`.hs-item[data-sid="${sessionId}"]`);
    if (activeItem) activeItem.classList.add('active');

    closeHistorySidebar();
  } catch (err) {
    console.error('Load session error:', err);
  }
}

export async function saveCurrentSession() {
  if (!_chatHistory.length) return;

  // Auto-generate title from first user message
  const firstQ = _chatHistory.find(m => m.role === 'user');
  const title = firstQ ? firstQ.content.slice(0, 80) + (firstQ.content.length > 80 ? '...' : '') : 'Untitled';

  try {
    if (_currentSessionId) {
      // Update existing session
      const res = await authFetch(`${SERVER}/chat/sessions/${_currentSessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, messages: _chatHistory })
      });
      if (!res.ok) throw new Error('server');
    } else {
      // Create new session
      const res = await authFetch(`${SERVER}/chat/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, messages: _chatHistory })
      });
      if (res.ok) {
        const data = await res.json();
        _currentSessionId = data.id;
      } else {
        throw new Error('server');
      }
    }
  } catch (err) {
    // Fallback: save to localStorage
    saveSessionLocal(title);
  }
}

function saveSessionLocal(title) {
  let sessions = JSON.parse(localStorage.getItem('vent_chat_sessions') || '[]');
  const now = new Date().toISOString();

  if (_currentSessionId) {
    const idx = sessions.findIndex(s => s.id === _currentSessionId);
    if (idx >= 0) {
      sessions[idx].title = title;
      sessions[idx].messages = _chatHistory;
      sessions[idx].updated_at = now;
    }
  } else {
    _currentSessionId = 'local-' + Date.now();
    sessions.unshift({
      id: _currentSessionId,
      title,
      messages: _chatHistory,
      created_at: now,
      updated_at: now
    });
  }
  // Keep max 30 sessions locally
  if (sessions.length > 30) sessions = sessions.slice(0, 30);
  localStorage.setItem('vent_chat_sessions', JSON.stringify(sessions));
}

export async function deleteSession(sessionId) {
  try {
    if (sessionId.startsWith('local-')) {
      // Delete from localStorage
      let sessions = JSON.parse(localStorage.getItem('vent_chat_sessions') || '[]');
      sessions = sessions.filter(s => s.id !== sessionId);
      localStorage.setItem('vent_chat_sessions', JSON.stringify(sessions));
    } else {
      await authFetch(`${SERVER}/chat/sessions/${sessionId}`, { method: 'DELETE' });
    }
    if (sessionId === _currentSessionId) clearChat();
    _sessionsList = _sessionsList.filter(s => s.id !== sessionId);
    renderSessionsList();
  } catch (err) {
    console.error('Delete session error:', err);
  }
}

// ── CLEAR ALL SESSIONS ──
export async function clearAllSessions() {
  if (!confirm('Clear all conversations? This can\'t be undone.')) return;
  try {
    await authFetch(`${SERVER}/chat/sessions`, { method: 'DELETE' });
  } catch(e) { console.error('Bulk delete error:', e); }
  localStorage.removeItem('vent_chat_sessions');
  _sessionsList = [];
  clearChat();
  renderSessionsList();
}

// ── SEARCH / FILTER SESSIONS ──
export function filterSessions() {
  const q = (document.getElementById('hsSearchInput').value || '').toLowerCase().trim();
  if (!q) { renderSessionsList(); return; }
  const list = document.getElementById('hsList');
  const matches = _sessionsList.filter(function(s) {
    if ((s.title || '').toLowerCase().indexOf(q) >= 0) return true;
    var msgs = s.messages || [];
    for (var i = 0; i < msgs.length; i++) {
      if (msgs[i].role === 'user' && (msgs[i].content || '').toLowerCase().indexOf(q) >= 0) return true;
    }
    return false;
  });
  if (!matches.length) {
    list.innerHTML = '<div class="hs-empty">No exact matches.<br><span style="font-size:11px;color:var(--dim)">Press Enter for AI-powered search</span></div>';
    return;
  }
  renderFilteredSessions(matches);
}

function renderFilteredSessions(matches, isAI) {
  var list = document.getElementById('hsList');
  var html = '';
  if (isAI) {
    html += '<div class="hs-ai-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 0 1 4 4v1a3 3 0 0 1 3 3v1a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-1a3 3 0 0 1 3-3V6a4 4 0 0 1 4-4z"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/></svg>AI results</div>';
  }
  matches.forEach(function(s) {
    var active = s.id === _currentSessionId ? ' active' : '';
    var d = new Date(s.updated_at || s.created_at);
    var now = new Date();
    var diffMs = now - d;
    var mins = Math.floor(diffMs / 60000);
    var time;
    if (mins < 1) time = 'now';
    else if (mins < 60) time = mins + 'm';
    else if (mins < 1440) time = Math.floor(mins / 60) + 'h';
    else if (mins < 10080) time = Math.floor(mins / 1440) + 'd';
    else time = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    var msgCount = s.messages ? Math.floor(s.messages.length / 2) : 0;
    var msgLabel = msgCount > 0 ? '<span class="hs-item-msgs">' + msgCount + ' Q</span>' : '';
    html += '<div class="hs-item' + active + '" data-sid="' + s.id + '" data-action="loadSession" data-session-id="' + s.id + '">' +
      '<div class="hs-item-dot"></div>' +
      '<div class="hs-item-body">' +
        '<div class="hs-item-text" title="' + escHtml(s.title) + '">' + escHtml(s.title) + '</div>' +
        '<div class="hs-item-meta"><span class="hs-item-time">' + time + '</span>' + msgLabel + '</div>' +
      '</div>' +
      '<button class="hs-item-menu-btn" data-action="toggleItemMenu" data-session-id="' + s.id + '" title="Options">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>' +
      '</button>' +
    '</div>';
  });
  list.innerHTML = html;
}

export async function aiSearchSessions() {
  var q = (document.getElementById('hsSearchInput').value || '').trim();
  if (!q) return;
  var spinner = document.getElementById('hsSearchSpinner');
  var list = document.getElementById('hsList');
  spinner.classList.add('active');
  list.innerHTML = '<div class="hs-empty" style="color:var(--dim)">Searching with AI…</div>';
  try {
    // Server fetches sessions + messages from Supabase directly
    var res = await authFetch('/chat/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q })
    });
    var data = await res.json();
    spinner.classList.remove('active');
    if (data.error) {
      list.innerHTML = '<div class="hs-empty">Search failed: ' + escHtml(data.error) + '</div>';
      return;
    }
    if (!data.matches || !data.matches.length) {
      list.innerHTML = '<div class="hs-empty">No conversations found for that description.</div>';
      return;
    }
    // Order results by the AI's ranking, match against local list
    var ordered = [];
    data.matches.forEach(function(id) {
      var s = _sessionsList.find(function(x) { return x.id === id; });
      if (s) ordered.push(s);
    });
    if (!ordered.length) {
      list.innerHTML = '<div class="hs-empty">No conversations found for that description.</div>';
      return;
    }
    renderFilteredSessions(ordered, true);
  } catch (err) {
    spinner.classList.remove('active');
    console.error('AI search error:', err);
    list.innerHTML = '<div class="hs-empty">Search failed. Try again.</div>';
  }
}

// ── EXPORT CHAT TO DOC BUILDER ──
export async function exportToDocBuilder(sessionId) {
  closeAllDropdowns();
  // Find session in cache or fetch it
  var session = _sessionsList.find(function(s){ return s.id === sessionId; });
  if (!session || !session.messages) {
    try {
      if (sessionId.startsWith('local-')) {
        var locals = JSON.parse(localStorage.getItem('vent_chat_sessions') || '[]');
        session = locals.find(function(s){ return s.id === sessionId; });
      } else {
        var r = await authFetch(SERVER + '/chat/sessions/' + sessionId);
        if (r.ok) session = await r.json();
      }
    } catch(e) { console.error('Load session for export:', e); }
  }
  if (!session || !session.messages || !session.messages.length) {
    alert('No messages to export.');
    return;
  }
  // Show loading in a small toast
  var toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:10px 18px;z-index:9999;color:var(--mid);font-size:12.5px;font-family:DM Sans,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.3);display:flex;align-items:center;gap:8px;';
  toast.innerHTML = '<div class="think-dots"><div class="think-dot"></div><div class="think-dot"></div><div class="think-dot"></div></div> Exporting to Doc Builder…';
  document.body.appendChild(toast);
  try {
    var res = await authFetch(SERVER + '/chat/export-to-doc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: session.messages, title: session.title })
    });
    if (!res.ok) throw new Error('Export failed');
    var data = await res.json();
    sessionStorage.setItem('vent_chat_export', JSON.stringify(data));
    window.open('builder.html', '_blank');
  } catch(e) {
    console.error('Export error:', e);
    alert('Export failed: ' + e.message);
  } finally {
    toast.remove();
  }
}

// ── ITEM CONTEXT MENU ──
let _openDropdown = null;

export function toggleItemMenu(btn, sessionId) {
  closeAllDropdowns();
  const dd = document.createElement('div');
  dd.className = 'hs-dropdown show';
  dd.innerHTML = `
    <button class="hs-dropdown-item" data-action="analyseChats">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
      Analyse trends
    </button>
    <button class="hs-dropdown-item" data-action="exportToDocBuilder" data-session-id="${sessionId}">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
      Export to Doc Builder
    </button>
    <button class="hs-dropdown-item danger" data-action="deleteSession" data-session-id="${sessionId}">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
      Delete
    </button>
  `;
  btn.classList.add('open');
  btn.appendChild(dd);
  _openDropdown = { btn, dd };
  setTimeout(() => document.addEventListener('click', _closeDropdownOutside, { once: true }), 0);
}

function _closeDropdownOutside(e) {
  if (_openDropdown && !_openDropdown.dd.contains(e.target)) closeAllDropdowns();
}

export function closeAllDropdowns() {
  if (_openDropdown) {
    _openDropdown.btn.classList.remove('open');
    _openDropdown.dd.remove();
    _openDropdown = null;
  }
  document.removeEventListener('click', _closeDropdownOutside);
}

// ── CHAT ANALYSIS ──
function openAnalysisModal() {
  document.getElementById('analysisOverlay').classList.add('show');
}
export function closeAnalysisModal() {
  document.getElementById('analysisOverlay').classList.remove('show');
}

export async function analyseChats() {
  closeAllDropdowns();
  document.getElementById('analysisBody').innerHTML = `
    <div class="analysis-loading">
      <div class="think-dots"><div class="think-dot"></div><div class="think-dot"></div><div class="think-dot"></div></div>
      Analysing all chat sessions...
    </div>
  `;
  openAnalysisModal();

  try {
    const res = await authFetch(`${SERVER}/chat/analyse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Analysis failed' }));
      throw new Error(err.error || 'Analysis failed');
    }
    const data = await res.json();
    renderAnalysis(data);
  } catch (err) {
    console.error('Analysis error:', err);
    document.getElementById('analysisBody').innerHTML = `
      <div style="color:var(--red);padding:20px 0;text-align:center;">
        <p>Analysis failed: ${escHtml(err.message)}</p>
        <p style="color:var(--dim);font-size:12px;margin-top:8px;">Check that sessions exist and the server is reachable.</p>
      </div>
    `;
  }
}

function renderAnalysis(data) {
  const body = document.getElementById('analysisBody');
  const statsRow = `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
      <span class="analysis-stat">${data.totalSessions} sessions</span>
      <span class="analysis-stat">${data.totalMessages} messages</span>
      ${data.dateRange ? `<span class="analysis-stat">${escHtml(data.dateRange)}</span>` : ''}
    </div>
  `;
  body.innerHTML = statsRow + data.html;
}
