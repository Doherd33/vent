// ── Floating SOP Viewer — tabbed document viewer with AI chat ──
import { DOC_CONTENT, DOC_QUERY_RESPONSES } from './data.js';

// ── DOM refs ──
var hsvViewer = document.getElementById('hubSopViewer');
var hsvTabsEl = document.getElementById('hsvTabs');
var hsvBody = document.getElementById('hsvBody');

// ── State ──
var _hsvTabs = [];
var _hsvActiveTab = null;

function answerQuery(question, docId) {
  var q = question.toLowerCase();
  var bestMatch = '';
  var bestScore = 0;
  Object.keys(DOC_QUERY_RESPONSES).forEach(function (key) {
    var words = key.split(' ');
    var score = 0;
    words.forEach(function (w) { if (q.indexOf(w) !== -1) score += 2; });
    if (q.indexOf(key) !== -1) score += 5;
    if (score > bestScore) { bestScore = score; bestMatch = key; }
  });
  if (bestScore > 0) return DOC_QUERY_RESPONSES[bestMatch];
  var doc = DOC_CONTENT[docId];
  if (doc) return 'Based on ' + doc.title + ': this document covers ' + doc.sections.map(function (s) { return s.heading; }).join(', ') + '. Could you be more specific about what you need?';
  return 'I can help answer questions about this document. Try asking about specific procedures, parameters, acceptance criteria, or equipment details.';
}

function getSuggestions(docId) {
  var doc = DOC_CONTENT[docId];
  if (!doc) return [];
  var hints = [];
  var text = doc.sections.map(function (s) { return s.text; }).join(' ').toLowerCase();
  if (text.indexOf('sampl') !== -1) hints.push('What is the sampling schedule?');
  if (text.indexOf('calibrat') !== -1) hints.push('How do I calibrate the probes?');
  if (text.indexOf('temperature') !== -1 || text.indexOf('temp') !== -1) hints.push('What are the temperature limits?');
  if (text.indexOf('accept') !== -1) hints.push('What are the acceptance criteria?');
  if (text.indexOf('cip') !== -1 || text.indexOf('clean') !== -1) hints.push('What is the CIP procedure?');
  if (text.indexOf('safety') !== -1 || text.indexOf('warn') !== -1) hints.push('Are there safety warnings?');
  if (hints.length < 2) hints.push('Summarise the key steps');
  return hints.slice(0, 3);
}

function renderHsvTabs() {
  var html = '';
  _hsvTabs.forEach(function (tab) {
    html += '<div class="hsv-tab' + (tab.id === _hsvActiveTab ? ' active' : '') + '" data-tab-id="' + tab.id + '">' +
      '<span class="hsv-tab-id">' + tab.shortTitle + '</span>' +
      '<button class="hsv-tab-close" data-close-id="' + tab.id + '">×</button></div>';
  });
  html += '<div class="hsv-window-controls">' +
    '<button class="hsv-maximize-btn" id="hsvMaxBtn" title="Maximize">□</button>' +
    '<button class="hsv-close-btn" id="hsvCloseAll" title="Close">×</button></div>';
  hsvTabsEl.innerHTML = html;

  hsvTabsEl.querySelectorAll('.hsv-tab').forEach(function (el) {
    el.addEventListener('click', function (e) {
      if (e.target.closest('.hsv-tab-close')) return;
      switchHsvTab(el.dataset.tabId);
    });
  });
  hsvTabsEl.querySelectorAll('.hsv-tab-close').forEach(function (el) {
    el.addEventListener('click', function () { closeHsvTab(el.dataset.closeId); });
  });
  document.getElementById('hsvCloseAll').addEventListener('click', function () {
    _hsvTabs = []; _hsvActiveTab = null;
    hsvViewer.classList.remove('show', 'sv-maximized');
  });
  document.getElementById('hsvMaxBtn').addEventListener('click', function () {
    hsvViewer.classList.toggle('sv-maximized');
  });
}

function renderHsvContent(tabId) {
  var tab = _hsvTabs.find(function (t) { return t.id === tabId; });
  if (!tab) return;
  var doc = DOC_CONTENT[tab.docId];
  if (!doc) return;

  var docHtml = '<div class="hsv-doc-pane">';
  docHtml += '<div class="hsv-doc-title">' + doc.title.split(' · ')[0] + '</div>';
  docHtml += '<div class="hsv-doc-subtitle">' + (doc.title.split(' · ')[1] || '') + '</div>';
  doc.sections.forEach(function (s) {
    docHtml += '<div class="hsv-section"><div class="hsv-section-title">' + s.heading + '</div>' +
      '<div class="hsv-section-content">' + s.text + '</div></div>';
  });
  docHtml += '<div class="hsv-concern-bar" id="hsvConcernArea">' +
    '<button class="hsv-concern-btn" id="hsvConcernBtn">⚠ RAISE CONCERN ON THIS DOCUMENT</button></div>';
  docHtml += '</div>';

  var chatHtml = '<div class="hsv-chat-pane">';
  chatHtml += '<div class="hsv-chat-header">' +
    '<div class="hsv-chat-title"><span class="hsv-chat-title-icon">●</span> Ask this document</div>' +
    '<div class="hsv-chat-scope">' + doc.title + '</div></div>';
  chatHtml += '<div class="hsv-chat-messages" id="hsvChatMessages">';
  if (tab.chatMessages.length === 0) {
    var sugs = getSuggestions(tab.docId);
    chatHtml += '<div class="hsv-chat-empty">Ask any question about this document and Vent AI will find the answer.' +
      '<div class="hsv-suggestions">';
    sugs.forEach(function (s) {
      chatHtml += '<div class="hsv-sug">' + s + '</div>';
    });
    chatHtml += '</div></div>';
  } else {
    tab.chatMessages.forEach(function (m) {
      chatHtml += '<div class="hsv-chat-msg ' + m.role + '">' + m.text + '</div>';
    });
  }
  chatHtml += '</div>';
  chatHtml += '<div class="hsv-chat-footer"><div class="hsv-chat-input-row">' +
    '<input type="text" class="hsv-chat-input" id="hsvChatInput" placeholder="Ask about this document...">' +
    '<button class="hsv-chat-send" id="hsvChatSend">↑</button></div></div>';
  chatHtml += '</div>';

  hsvBody.innerHTML = docHtml + chatHtml;

  var chatInput = document.getElementById('hsvChatInput');
  var chatMessages = document.getElementById('hsvChatMessages');

  function sendChat(question) {
    if (!question) return;
    tab.chatMessages.push({ role: 'user', text: question });
    var emptyEl = chatMessages.querySelector('.hsv-chat-empty');
    if (emptyEl) emptyEl.remove();
    chatMessages.innerHTML += '<div class="hsv-chat-msg user">' + question + '</div>';
    chatMessages.innerHTML += '<div class="hsv-chat-thinking" id="hsvThinking"><span class="dot"></span><span class="dot" style="animation-delay:.2s"></span><span class="dot" style="animation-delay:.4s"></span> Analysing...</div>';
    chatMessages.scrollTop = chatMessages.scrollHeight;
    chatInput.value = '';

    setTimeout(function () {
      var answer = answerQuery(question, tab.docId);
      tab.chatMessages.push({ role: 'ai', text: answer });
      var thinkEl = document.getElementById('hsvThinking');
      if (thinkEl) thinkEl.remove();
      chatMessages.innerHTML += '<div class="hsv-chat-msg ai">' + answer + '</div>';
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 800);
  }

  document.getElementById('hsvChatSend').addEventListener('click', function () {
    sendChat(chatInput.value.trim());
  });
  chatInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') sendChat(chatInput.value.trim());
  });

  chatMessages.querySelectorAll('.hsv-sug').forEach(function (el) {
    el.addEventListener('click', function () {
      sendChat(el.textContent);
    });
  });

  function initHsvConcern() {
    var btn = document.getElementById('hsvConcernBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var area = document.getElementById('hsvConcernArea');
      area.innerHTML = '<div class="hsv-concern-form">' +
        '<label>Concern Type</label>' +
        '<select class="hsv-concern-select" id="hsvConcernType">' +
          '<option value="error">Error in Document</option>' +
          '<option value="outdated">Outdated Information</option>' +
          '<option value="clarification">Needs Clarification</option>' +
          '<option value="safety">Safety Concern</option>' +
          '<option value="process-change">Process Change Required</option>' +
          '<option value="other">Other</option>' +
        '</select>' +
        '<label>Details</label>' +
        '<textarea class="hsv-concern-textarea" id="hsvConcernText" placeholder="Describe what needs to change..."></textarea>' +
        '<div class="hsv-concern-actions">' +
          '<button class="hsv-concern-cancel" id="hsvConcernCancel">CANCEL</button>' +
          '<button class="hsv-concern-submit" id="hsvConcernSubmit">SUBMIT CONCERN</button></div></div>';

      document.getElementById('hsvConcernCancel').addEventListener('click', function () {
        area.innerHTML = '<button class="hsv-concern-btn" id="hsvConcernBtn">⚠ RAISE CONCERN ON THIS DOCUMENT</button>';
        initHsvConcern();
      });

      document.getElementById('hsvConcernSubmit').addEventListener('click', function () {
        var cType = document.getElementById('hsvConcernType').value;
        var text = document.getElementById('hsvConcernText').value.trim();
        if (!text) { document.getElementById('hsvConcernText').style.borderColor = 'var(--hud-red)'; return; }
        area.innerHTML = '<div class="hsv-concern-success">✔ Concern submitted — routed to QA for review<br><span style="font-size:10px;color:#666;">REF: CON-' + Date.now().toString(36).toUpperCase() + ' · ' + cType.toUpperCase() + '</span></div>';
      });
    });
  }
  initHsvConcern();

  chatInput.focus();
}

function switchHsvTab(tabId) {
  _hsvActiveTab = tabId;
  renderHsvTabs();
  renderHsvContent(tabId);
}

function closeHsvTab(tabId) {
  _hsvTabs = _hsvTabs.filter(function (t) { return t.id !== tabId; });
  if (_hsvTabs.length === 0) {
    _hsvActiveTab = null;
    hsvViewer.classList.remove('show', 'sv-maximized');
  } else {
    if (_hsvActiveTab === tabId) _hsvActiveTab = _hsvTabs[_hsvTabs.length - 1].id;
    renderHsvTabs();
    renderHsvContent(_hsvActiveTab);
  }
}

export function openDocInViewer(docId) {
  var doc = DOC_CONTENT[docId];
  if (!doc) return;

  var existing = _hsvTabs.find(function (t) { return t.docId === docId; });
  if (existing) {
    switchHsvTab(existing.id);
    hsvViewer.classList.add('show');
    return;
  }

  var tabId = 'hsv-' + Date.now();
  var shortTitle = doc.title.split(' · ')[0];
  if (shortTitle.length > 20) shortTitle = shortTitle.substring(0, 18) + '…';
  _hsvTabs.push({ id: tabId, docId: docId, shortTitle: shortTitle, chatMessages: [] });
  _hsvActiveTab = tabId;

  hsvViewer.classList.add('show');
  renderHsvTabs();
  renderHsvContent(tabId);
}

// ── Draggable tab bar ──
(function () {
  var dragging = false, startX, startY, startLeft, startTop;
  hsvTabsEl.addEventListener('mousedown', function (e) {
    if (e.target.closest('.hsv-tab-close') || e.target.closest('.hsv-window-controls') || e.target.closest('.hsv-tab')) return;
    dragging = true;
    var rect = hsvViewer.getBoundingClientRect();
    startX = e.clientX; startY = e.clientY;
    startLeft = rect.left; startTop = rect.top;
    hsvViewer.classList.add('sv-dragging');
    hsvTabsEl.classList.add('dragging');
    e.preventDefault();
  });
  document.addEventListener('mousemove', function (e) {
    if (!dragging) return;
    hsvViewer.style.left = (startLeft + e.clientX - startX) + 'px';
    hsvViewer.style.top = (startTop + e.clientY - startY) + 'px';
  });
  document.addEventListener('mouseup', function () {
    if (!dragging) return;
    dragging = false;
    hsvViewer.classList.remove('sv-dragging');
    hsvTabsEl.classList.remove('dragging');
  });
})();

// Close viewer on Escape when it's open
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && hsvViewer.classList.contains('show')) {
    if (_hsvActiveTab) closeHsvTab(_hsvActiveTab);
    e.stopImmediatePropagation();
    return;
  }
});
