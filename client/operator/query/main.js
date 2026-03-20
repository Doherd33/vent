// ── Query Page Entry Point ──
// Single ES module that imports all query-page modules, wires up DOM events,
// and registers cross-module action maps.

// -- Module imports --
import { fillAndSend, clearChat, startNewChat, toggleHistorySidebar, openHistorySidebar,
  closeHistorySidebar, loadSession, deleteSession, clearAllSessions, filterSessions,
  aiSearchSessions, exportToDocBuilder, toggleItemMenu, closeAllDropdowns,
  closeAnalysisModal, analyseChats, saveCurrentSession } from './chat-history.js';

import { runQuery, retryQuery, buildAnswerHtml, scrollToBottom, toggleSrc,
  copyAnswer, exportAnswerToDoc, feedbackAnswer, toggleBookmark, removeBookmark,
  scrollToAnswer, toggleBookmarksPanel, renderBookmarks, renderSopMarkdown } from './query-engine.js';

import { toggleCharlie, closeCharlie, registerActions, dispatchAction } from './charlie.js';

import './vapi-client.js';

import { toggleProfilePanel, saveCurrentPreset, getVentVoiceConfig } from './settings.js';

import { openSubsDrawer, closeSubsDrawer, switchSubsTab, openVentPanel, closeVentPanel,
  toggleVentPanel, setPri, submitVent, resetVentPanel, removeVentFile, toggleVpRecording } from './submissions.js';

import { triggerCamUpload, clearCamImage, runVisualQuery, openGdpModal, closeGdpModal,
  gdpOpenCamera, gdpCloseCamera, gdpCapturePhoto, gdpSwitchCamera, runGdpCheck,
  gdpTourPrev, gdpTourNext, gdpTourToggleAuto, gdpZoom, gdpZoomFit,
  toggleGdpHistory } from './gdp.js';

import { toggleDiscoverPanel, discoverSops, toggleSopSidebar, openSopSidebar,
  closeSopSidebar, searchSops, openSopViewer, closeSopViewer, toggleSvMaximize,
  openSopDoc, showSvSearch, runSvSearch, switchSvTab, closeSvTab, fillSvChat,
  askSvDoc, backToSopSearch, toggleTodoSidebar, openTodoSidebar, closeTodoSidebar,
  addTodoFromInput } from './todos.js';

import { startTour, startVoiceTour, startDemoTour, nextTourStep, prevTourStep,
  exploreTourStep, endTour, toggleTourMute, askCharlie, registerPanels,
  registerHelpers } from './tour.js';

import { applyMenuConfig } from './radial-menu.js';


// ── Register cross-module action maps ──

// Charlie voice assistant: action dispatch registry
registerActions({
  fillAndSend,
  runQuery,
  startNewChat,
  openVentPanel,
  closeVentPanel,
  toggleVentPanel,
  openGdpModal,
  toggleHistorySidebar,
  toggleSopSidebar,
  toggleTodoSidebar,
  startTour,
  startVoiceTour,
});

// Tour: panel open/close registry
registerPanels({
  openCharlie: toggleCharlie,
  closeCharlie,
  openHistory: openHistorySidebar,
  closeHistory: closeHistorySidebar,
  openSops: openSopSidebar,
  closeSops: closeSopSidebar,
  openTodos: openTodoSidebar,
  closeTodos: closeTodoSidebar,
  openVent: openVentPanel,
  closeVent: closeVentPanel,
  openGdp: openGdpModal,
  closeGdp: closeGdpModal,
  openSubs: openSubsDrawer,
  closeSubs: closeSubsDrawer,
  openProfile: toggleProfilePanel,
  closeProfile: toggleProfilePanel,
});

// Tour: query-engine helpers
registerHelpers({ buildAnswerHtml, scrollToBottom });

// ── Expose functions on window for inline onclick attributes in query.html ──
Object.assign(window, {
  // chat-history.js
  startNewChat, toggleHistorySidebar, closeHistorySidebar, analyseChats,
  clearAllSessions, closeAnalysisModal, fillAndSend,
  // query-engine.js
  runQuery, scrollToBottom, clearCamImage, toggleBookmarksPanel,
  // gdp.js
  openGdpModal, closeGdpModal, toggleGdpHistory, gdpOpenCamera, gdpCloseCamera,
  gdpCapturePhoto, gdpSwitchCamera, gdpZoom, gdpZoomFit,
  gdpTourPrev, gdpTourNext, gdpTourToggleAuto, runGdpCheck, triggerCamUpload,
  // todos.js
  toggleSopSidebar, closeSopSidebar, toggleDiscoverPanel, discoverSops,
  searchSops, openSopDoc,
  // submissions.js
  closeSubsDrawer, switchSubsTab, closeVentPanel, openVentPanel,
  toggleVpRecording, setPri, submitVent, resetVentPanel,
  // charlie.js
  closeCharlie,
  // settings.js
  applyMenuConfig, toggleProfilePanel,
});


// ── Static DOM event listeners (replacing onclick attributes) ──

function $(id) { return document.getElementById(id); }
function on(el, evt, fn) {
  if (typeof el === 'string') el = $(el);
  if (el) el.addEventListener(evt, fn);
}
function onClick(el, fn) { on(el, 'click', fn); }

// -- Hub & Profile --
onClick('hubProfileBtn', toggleProfilePanel);
onClick(document.querySelector('.profile-close'), toggleProfilePanel);
onClick(document.querySelector('.profile-preset-save-btn'), saveCurrentPreset);

// -- Title bar --
const hamburger = document.querySelector('.mobile-hamburger');
if (hamburger) hamburger.addEventListener('click', () => {
  document.querySelector('.title-nav').classList.toggle('open');
});
onClick(document.querySelector('.sop-search-btn'), toggleSopSidebar);

// Title bar right buttons (New chat, Settings, Sign out)
const titleBarRight = $('titleBarRight');
if (titleBarRight) {
  const btns = titleBarRight.querySelectorAll('.sign-out-btn');
  // Order: New chat, Settings, Sign out
  if (btns[0]) btns[0].addEventListener('click', startNewChat);
  // btns[1] = Settings (toggleProfilePanel, already on window)
  // btns[2] = Sign out — ventSignOut from nav.js is already on window via onclick attr
  if (btns[2]) btns[2].addEventListener('click', () => window.ventSignOut());
}

// -- History sidebar --
onClick(document.querySelector('.history-toggle'), toggleHistorySidebar);
onClick('historyBackdrop', closeHistorySidebar);

// History sidebar head actions (Analyse, Clear all, Close)
const hsHeadActions = document.querySelectorAll('.hs-head-actions .hs-icon-btn');
if (hsHeadActions[0]) hsHeadActions[0].addEventListener('click', analyseChats);
if (hsHeadActions[1]) hsHeadActions[1].addEventListener('click', clearAllSessions);
if (hsHeadActions[2]) hsHeadActions[2].addEventListener('click', closeHistorySidebar);

// New conversation button
const hsNewBtn = document.querySelector('.hs-new-btn');
if (hsNewBtn) hsNewBtn.addEventListener('click', () => { startNewChat(); closeHistorySidebar(); });

// History search input
const hsSearchInput = $('hsSearchInput');
if (hsSearchInput) {
  hsSearchInput.addEventListener('input', filterSessions);
  hsSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); aiSearchSessions(); }
  });
}

// -- Analysis modal --
onClick('analysisOverlay', (e) => { if (e.target === e.currentTarget) closeAnalysisModal(); });
onClick(document.querySelector('.analysis-modal-close'), closeAnalysisModal);

// -- GDP modal --
onClick('gdpOverlay', (e) => { if (e.target === e.currentTarget) closeGdpModal(); });
onClick('gdpHistoryBtn', toggleGdpHistory);
onClick(document.querySelector('.gdp-modal-close'), closeGdpModal);

// GDP upload zone
const gdpDropZone = $('gdpDropZone');
if (gdpDropZone) gdpDropZone.addEventListener('click', () => $('gdpFileInput').click());

// GDP upload action buttons (Choose Files, Take Photo)
const gdpUploadBtns = document.querySelectorAll('.gdp-upload-action-btn');
if (gdpUploadBtns[0]) gdpUploadBtns[0].addEventListener('click', (e) => { e.stopPropagation(); $('gdpFileInput').click(); });
if (gdpUploadBtns[1]) gdpUploadBtns[1].addEventListener('click', (e) => { e.stopPropagation(); gdpOpenCamera(); });

// GDP camera controls
onClick(document.querySelector('.gdp-camera-cancel'), gdpCloseCamera);
onClick(document.querySelector('.gdp-camera-shutter'), gdpCapturePhoto);
onClick('gdpCamSwitch', gdpSwitchCamera);

// GDP zoom
const gdpZoomBtns = document.querySelectorAll('.gdp-zoom-btn');
if (gdpZoomBtns[0]) gdpZoomBtns[0].addEventListener('click', () => gdpZoom(-1));
if (gdpZoomBtns[1]) gdpZoomBtns[1].addEventListener('click', () => gdpZoom(1));
if (gdpZoomBtns[2]) gdpZoomBtns[2].addEventListener('click', gdpZoomFit);

// GDP tour nav
onClick('gdpTourPrev', gdpTourPrev);
onClick('gdpTourNext', gdpTourNext);
onClick('gdpTourAuto', gdpTourToggleAuto);

// GDP action bar
onClick(document.querySelector('.gdp-add-more'), () => $('gdpFileInput').click());
onClick('gdpRunBtn', runGdpCheck);

// -- Todo sidebar --
onClick(document.querySelector('.todo-toggle'), toggleTodoSidebar);
onClick('todoBackdrop', closeTodoSidebar);
onClick(document.querySelector('.td-close'), closeTodoSidebar);

const todoNewInput = $('todoNewInput');
if (todoNewInput) {
  todoNewInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addTodoFromInput(); }
  });
}
onClick(document.querySelector('.td-foot-add'), addTodoFromInput);

// -- SOP sidebar --
onClick('sopBackdrop', closeSopSidebar);
onClick(document.querySelector('.sop-close'), closeSopSidebar);
onClick(document.querySelector('.sop-discover-header'), toggleDiscoverPanel);

const discoverInput = $('discoverInput');
if (discoverInput) discoverInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') discoverSops();
});
onClick('discoverBtn', discoverSops);

const sopSearchInput = $('sopSearchInput');
if (sopSearchInput) sopSearchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchSops();
});
onClick('sopSearchBtn', searchSops);

// -- Bookmarks --
onClick(document.querySelector('.bookmarks-header'), toggleBookmarksPanel);

// -- Suggestion chips --
document.querySelectorAll('.sug-chip').forEach(chip => {
  chip.addEventListener('click', () => fillAndSend(chip.textContent === 'pH control'
    ? 'What is the target pH range and how is it controlled?'
    : chip.getAttribute('data-query') || chip.textContent));
});

// -- Chat area --
onClick('scrollBottomBtn', scrollToBottom);

// -- Input bar --
onClick(document.querySelector('.cam-preview-remove'), clearCamImage);
onClick('camBtn', triggerCamUpload);
onClick('gdpBtn', openGdpModal);
onClick('sendBtn', runQuery);

// -- Submissions drawer --
onClick('subsBackdrop', closeSubsDrawer);
onClick(document.querySelector('.sd-close'), closeSubsDrawer);
document.querySelectorAll('.sd-tab').forEach(tab => {
  tab.addEventListener('click', function() {
    switchSubsTab(this.textContent.includes('Submissions') ? 'subs' : 'progress', this);
  });
});

// -- Vent panel --
onClick('ventBackdrop', closeVentPanel);
onClick(document.querySelector('.vp-close'), closeVentPanel);

// Priority buttons
document.querySelectorAll('.vp-pri-btn').forEach(btn => {
  btn.addEventListener('click', () => setPri(btn));
});

// File drop zone
const vpDrop = $('vpDrop');
if (vpDrop) {
  vpDrop.addEventListener('click', () => $('vpFileInput').click());
  vpDrop.addEventListener('dragover', (e) => { e.preventDefault(); vpDrop.classList.add('drag-over'); });
  vpDrop.addEventListener('dragleave', () => vpDrop.classList.remove('drag-over'));
  vpDrop.addEventListener('drop', (e) => {
    e.preventDefault();
    vpDrop.classList.remove('drag-over');
    // handleVentFiles is internal to submissions.js — dispatch via vpFileInput
    const dt = new DataTransfer();
    Array.from(e.dataTransfer.files).forEach(f => dt.items.add(f));
    $('vpFileInput').files = dt.files;
    $('vpFileInput').dispatchEvent(new Event('change'));
  });
}

onClick('ventSubmitBtn', submitVent);
onClick(document.querySelector('.vps-again'), resetVentPanel);
onClick('vpMicBtn', toggleVpRecording);


// -- Charlie panel --
onClick(document.querySelector('.charlie-close'), closeCharlie);

// -- Tour help --
onClick(document.querySelector('.tour-help-btn'), startVoiceTour);


// ── Delegated click handler for data-action attributes ──
// Dynamic HTML generated by modules uses data-action="fnName" instead of onclick.
const ACTION_MAP = {
  // chat-history.js
  fillAndSend,
  loadSession,
  deleteSession,
  toggleItemMenu,
  analyseChats,
  exportToDocBuilder,
  clearAllSessions,

  // query-engine.js
  toggleSrc,
  copyAnswer,
  exportAnswerToDoc,
  feedbackUp: (el) => feedbackAnswer(el.dataset.cardId, 'up'),
  feedbackDown: (el) => feedbackAnswer(el.dataset.cardId, 'down'),
  toggleBookmark,
  scrollToAnswer,
  removeBookmark,

  // submissions.js
  removeVentFile,

  // tour.js
  nextTourStep,
  prevTourStep,
  exploreTourStep,
  endTour,
  toggleTourMute,
  askCharlie: askCharlie,

  // todos.js
  openSopDoc,
  switchSvTab,
  closeSvTab,
  toggleSvMaximize,
  showSvSearch,
  runSvSearch,
  fillSvChat,
  askSvDoc,
  backToSopSearch,
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;

  const action = el.dataset.action;
  const handler = ACTION_MAP[action];
  if (!handler) return;

  e.preventDefault();

  // Gather args from data attributes
  if (action === 'fillAndSend') {
    handler(el.dataset.query || el.textContent);
  } else if (action === 'loadSession') {
    handler(el.dataset.sessionId);
  } else if (action === 'deleteSession') {
    handler(el.dataset.sessionId);
  } else if (action === 'toggleItemMenu') {
    handler(el, el.dataset.sessionId);
  } else if (action === 'exportToDocBuilder') {
    handler(el.dataset.sessionId);
  } else if (action === 'toggleSrc') {
    handler(el, el.dataset.docId, el.dataset.section, el.dataset.uid);
  } else if (action === 'copyAnswer' || action === 'exportAnswerToDoc' || action === 'toggleBookmark') {
    handler(el.dataset.cardId);
  } else if (action === 'feedbackUp' || action === 'feedbackDown') {
    handler(el);
  } else if (action === 'scrollToAnswer' || action === 'removeBookmark') {
    handler(el.dataset.id);
  } else if (action === 'removeVentFile') {
    handler(parseInt(el.dataset.index, 10));
  } else if (action === 'openSopDoc') {
    handler(el.dataset.docId);
  } else if (action === 'switchSvTab' || action === 'closeSvTab') {
    handler(el.dataset.tabId);
  } else if (action === 'fillSvChat') {
    handler(el.dataset.question || el.textContent);
  } else {
    // No-arg actions
    handler();
  }
});


// ── Suggestion chips: wire up data-query from text content ──
// The chips in the empty state use onclick="fillAndSend('...')" — we replace with data-action.
// But the query text is embedded in the onclick, not in a data attr. We handle this:
// The chips already have click listeners from the static wiring above. Remove this if
// the HTML is updated to use data-action + data-query instead.


// ── Demo seeding (moved from inline script in query.html) ──
(function seedDemoChat() {
  if (localStorage.getItem('vent_token') !== 'demo') return;
  const params = new URLSearchParams(window.location.search);
  if (params.get('demo') === '1') return;

  const inner = $('chatInner');
  const empty = $('emptyState');
  if (!inner || !empty) return;

  empty.style.display = 'none';

  const turn = document.createElement('div');
  turn.className = 'chat-turn';
  turn.innerHTML =
    '<div class="turn-q"><div class="turn-q-bubble">What is the target pH range for the N-1 bioreactor and how is it controlled?</div></div>' +
    '<div class="answer-card"><div class="answer-head">' +
      '<div class="answer-cat-icon cat-proc"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>' +
      '<div><div class="answer-cat-label">PROCEDURE</div></div>' +
    '</div><div class="answer-body">' +
      '<div class="answer-summary">The target pH for the N-1 bioreactor is <strong>7.0 \u00b1 0.1</strong> (operational range 6.9\u20137.1). pH is maintained using an automated cascade control system:<br><br>' +
      '<strong>1.</strong> CO\u2082 gas sparging for pH reduction (acidification)<br>' +
      '<strong>2.</strong> 1M NaOH addition via peristaltic pump for pH increase<br>' +
      '<strong>3.</strong> Dead-band of \u00b10.05 pH units before correction triggers<br><br>' +
      'The pH probe must be calibrated with pH 4.0 and pH 7.0 buffer solutions within 4 hours before inoculation. Calibration slope must be between 95\u2013102%.</div>' +
      '<div class="section-head">SOP REFERENCE</div>' +
      '<div style="font-size:12px;color:var(--dim);font-family:\'JetBrains Mono\',monospace">WX-SOP-1001-03 \u00b7 Cell Culture Preparation \u00b7 Section 8.4.2</div>' +
    '</div></div>';
  inner.insertBefore(turn, inner.firstChild);
})();

// ── Handle ?openVent=1 to auto-open the observation panel ──
(function() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('openVent') === '1') {
    setTimeout(() => openVentPanel(), 500);
  }
  if (params.get('gdp') === '1') {
    setTimeout(() => openGdpModal(), 500);
  }
})();
