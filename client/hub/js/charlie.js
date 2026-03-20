// ── Charlie AI: Hub Voice Assistant — Jarvis Mode ──
// When activated, the facility fades out and a wireframe humanoid avatar
// appears in the 3D viewport. Voice I/O via VentAudio, backend via /charlie/ask.

import { equipment } from './scene.js';
import { flyToView } from './nav.js';
import { PROCESS_DATA } from './data.js';
import { openDocInViewer } from './sop-viewer.js';
import { selectEquipmentByName, getSelectedEquipment, deselectEquipment } from './interaction.js';
import { createAvatar, showAvatar, hideAvatar, setAvatarState, highlightEquipmentRed, clearRedHighlights, isAvatarVisible } from './avatar.js';

var CONVO_TTL = 5 * 60 * 1000;

var statusEl, answerEl;
var isOpen = false;
var state = 'idle';
var convoHistory = [];
var lastActivity = 0;
var listenFrame = null;

// ── Escape HTML ──
function esc(s) {
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ── Strip markdown for TTS ──
function stripMd(text) {
  if (!text) return text;
  return text
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .trim();
}

// ── Build facility context ──
function buildContext() {
  var parts = ['Hub 3D facility command centre.'];
  var activeBtn = document.querySelector('.facility-nav-btn.active');
  if (activeBtn) parts.push('Camera: ' + activeBtn.getAttribute('data-view') + '.');

  var sel = getSelectedEquipment();
  if (sel && sel.userData.name) {
    var name = sel.userData.name;
    var info = name;
    if (sel.userData.desc) info += ' (' + sel.userData.desc + ')';
    var pKey = findProcessKey(name);
    if (pKey && PROCESS_DATA[pKey]) {
      var pd = PROCESS_DATA[pKey];
      var vals = [];
      if (pd.VCD !== undefined) vals.push('VCD ' + pd.VCD);
      if (pd.Viability !== undefined) vals.push('Viability ' + pd.Viability + '%');
      if (pd.Titer !== undefined) vals.push('Titer ' + pd.Titer + ' g/L');
      if (pd.Temperature !== undefined) vals.push('Temp ' + pd.Temperature + '°C');
      if (pd.pH !== undefined) vals.push('pH ' + pd.pH);
      if (pd.DO !== undefined) vals.push('DO ' + pd.DO + '%');
      if (vals.length) info += ' — ' + vals.join(', ');
    }
    parts.push('Selected: ' + info + '.');
  }
  parts.push('Available areas: overview, bioreactors, atf, seed, inoculation, downstream, media, parts.');
  return parts.join(' ');
}

function findProcessKey(name) {
  if (!name) return null;
  if (PROCESS_DATA[name]) return name;
  var upper = name.toUpperCase();
  for (var key in PROCESS_DATA) {
    if (upper.indexOf(key.toUpperCase()) !== -1 || key.toUpperCase().indexOf(upper) !== -1) return key;
  }
  return null;
}

// ── DOM setup — minimal HUD overlays ──
function initDOM() {
  var viewport = document.getElementById('viewport3d');
  if (!viewport) return;

  // Charlie button — matches facility-nav-btn style
  var navArea = document.getElementById('facilityNav');
  if (navArea) {
    var btn = document.createElement('button');
    btn.className = 'facility-nav-btn charlie-hud-btn';
    btn.innerHTML = '<span class="facility-nav-pip"></span>CHARLIE AI';
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggle();
    });
    navArea.appendChild(btn);
  }

  // Status overlay — bottom-center of viewport
  statusEl = document.createElement('div');
  statusEl.className = 'charlie-hud-status';
  statusEl.textContent = '';
  viewport.appendChild(statusEl);

  // Answer overlay — above status
  answerEl = document.createElement('div');
  answerEl.className = 'charlie-hud-answer';
  viewport.appendChild(answerEl);

  // Create the 3D avatar (hidden initially)
  createAvatar();
}

// ── State machine ──
function setState(s) {
  state = s;
  setAvatarState(s);
  var btn = document.querySelector('.charlie-hud-btn');
  if (btn) btn.classList.toggle('active', isOpen);

  if (statusEl) {
    var labels = { listening: 'LISTENING', thinking: 'PROCESSING', speaking: 'SPEAKING' };
    statusEl.textContent = isOpen ? (labels[s] || 'READY') : '';
    statusEl.className = 'charlie-hud-status' + (s !== 'idle' ? ' ' + s : '');
  }
}

// ── Toggle ──
function toggle() {
  if (typeof VentAudio !== 'undefined') VentAudio.unlock();

  if (!isOpen) {
    if (convoHistory.length && Date.now() - lastActivity > CONVO_TTL) {
      convoHistory = [];
    }
    isOpen = true;
    showAvatar();
    // Restore last answer
    if (convoHistory.length) {
      var last = convoHistory[convoHistory.length - 1];
      answerEl.style.display = 'block';
      answerEl.innerHTML = '<div class="hc-q">\u201c' + esc(last.q) + '\u201d</div>' + last.a;
    } else {
      answerEl.style.display = 'none';
    }
    setState('idle');
    // Brief delay for transition, then start listening
    setTimeout(function () {
      if (isOpen) startListening();
    }, 800);
  } else if (state === 'listening' && typeof VentAudio !== 'undefined' && VentAudio.isRecording()) {
    VentAudio.stopRecording();
  } else if (state === 'speaking') {
    if (typeof VentAudio !== 'undefined') VentAudio.stop();
    startListening();
  } else {
    closeCharlie();
  }
}

function closeCharlie() {
  isOpen = false;
  if (listenFrame) { cancelAnimationFrame(listenFrame); listenFrame = null; }
  if (typeof VentAudio !== 'undefined') {
    VentAudio.stop();
    VentAudio.killRecording();
  }
  hideAvatar();
  clearRedHighlights();
  setState('idle');
  answerEl.style.display = 'none';
  lastActivity = Date.now();
}

// ── Listening with silence detection ──
function startListening() {
  if (typeof VentAudio === 'undefined') {
    if (statusEl) statusEl.textContent = 'VOICE UNAVAILABLE';
    return;
  }
  VentAudio.stop();
  setState('listening');

  var speechDetected = false;
  var silenceStart = 0;
  var SILENCE_THRESH = 12;
  var SILENCE_MS = 1800;
  var MAX_REC_MS = 15000;
  var recStart = Date.now();

  VentAudio.recordSTT(function (text) {
    if (listenFrame) { cancelAnimationFrame(listenFrame); listenFrame = null; }
    onTranscript(text);
  }, function (err) {
    if (listenFrame) { cancelAnimationFrame(listenFrame); listenFrame = null; }
    if (!isOpen) return;
    if (statusEl) statusEl.textContent = (err === 'mic') ? 'MIC ERROR' : 'TRANSCRIPTION ERROR';
    setState('idle');
  });

  setTimeout(function tickListen() {
    var ma = VentAudio.getMicAnalyser();
    if (!ma || !isOpen || state !== 'listening') { listenFrame = null; return; }

    var freq = new Uint8Array(ma.frequencyBinCount);
    ma.getByteFrequencyData(freq);

    var sum = 0;
    for (var j = 0; j < freq.length; j++) sum += freq[j];
    var avg = sum / freq.length;

    if (avg > SILENCE_THRESH) {
      speechDetected = true;
      silenceStart = 0;
    } else if (speechDetected) {
      if (!silenceStart) silenceStart = Date.now();
      else if (Date.now() - silenceStart > SILENCE_MS) {
        VentAudio.stopRecording();
        listenFrame = null;
        return;
      }
    }

    if (Date.now() - recStart > MAX_REC_MS) {
      VentAudio.stopRecording();
      listenFrame = null;
      return;
    }

    listenFrame = requestAnimationFrame(tickListen);
  }, 300);
}

function returnToReady() {
  if (!isOpen) return;
  setState('idle');
}

// ── Transcript → ask Charlie ──
function onTranscript(text) {
  setState('thinking');
  lastActivity = Date.now();
  answerEl.style.display = 'block';
  answerEl.innerHTML = '<div class="hc-q">\u201c' + esc(text) + '\u201d</div>';

  fetch(SERVER + '/charlie/ask', {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, getAuthHeaders()),
    body: JSON.stringify({
      question: text,
      context: buildContext(),
      lang: 'en',
      history: convoHistory,
      mode: 'hub'
    })
  })
    .then(function (r) {
      if (!r.ok) throw new Error('Server ' + r.status);
      return r.json();
    })
    .then(function (data) {
      var answer = data.answer || 'Sorry, I couldn\u2019t process that.';
      convoHistory.push({ q: text, a: answer });
      if (convoHistory.length > 12) convoHistory = convoHistory.slice(-10);
      lastActivity = Date.now();

      answerEl.innerHTML = '<div class="hc-q">\u201c' + esc(text) + '\u201d</div>' + answer;

      // Dispatch action
      if (data.action && data.action !== 'none') {
        dispatchHubAction(data.action, data.params || {});
      }

      // Speak the answer
      setState('speaking');
      if (typeof VentAudio !== 'undefined') {
        VentAudio.speak(stripMd(answer), null, function () {
          returnToReady();
        });
      } else {
        returnToReady();
      }
    })
    .catch(function (err) {
      console.warn('[Hub Charlie] /charlie/ask failed:', err);
      answerEl.innerHTML = '<div class="hc-q">\u201c' + esc(text) + '\u201d</div>Something went wrong. Try again.';
      returnToReady();
    });
}

// ── Hub action dispatcher ──
function dispatchHubAction(action, params) {
  switch (action) {
    case 'fly_to_area':
      if (params.area) {
        // Bring facility back partially + fly camera
        clearRedHighlights();
        flyToView(params.area);
      }
      break;
    case 'select_equipment':
      if (params.name) {
        clearRedHighlights();
        highlightEquipmentRed(params.name);
      }
      break;
    case 'open_document':
      if (params.docId) openDocInViewer(params.docId);
      break;
    case 'navigate_page':
      if (params.url) window.location.href = params.url;
      break;
    case 'deselect':
      clearRedHighlights();
      deselectEquipment();
      break;
    default:
      break;
  }
}

// ── ESC closes Charlie ──
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && isOpen) {
    closeCharlie();
  }
});

// ── Expose for inline scripts ──
window.toggleHubCharlie = toggle;

// ── Init ──
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDOM);
} else {
  initDOM();
}
