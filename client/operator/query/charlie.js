// ═══════════════════════════════════════════════════════════════════════════════
// CHARLIE — Persistent Voice Assistant (ES Module)
// ═══════════════════════════════════════════════════════════════════════════════
import { escHtml } from '/shared/utils.js';

var fab, panel, statusEl, answerEl, barsEl;
var isOpen = false;
var state  = 'idle'; // idle | listening | thinking | speaking
var convoHistory = [];

function t(k){ return (window.VentI18n && VentI18n.t(k)) || k; }

// ── Action dispatcher (registry pattern) ──
let actions = {};

export function registerActions(map) { Object.assign(actions, map); }

export function dispatchAction(action, params){
  if(action && action !== 'none' && actions[action]){
    try{ actions[action](params || {}); }catch(e){ console.warn('[Charlie] action error:', action, e); }
  }
}

// Strip markdown formatting before sending text to TTS
// so Claude's *bold*, numbered lists, bullet points etc. aren't read aloud literally
function stripTTSMarkdown(text){
  if(!text) return text;
  return text
    .replace(/#{1,6}\s+/g, '')           // ## headers
    .replace(/\*\*(.+?)\*\*/g, '$1')     // **bold**
    .replace(/\*(.+?)\*/g, '$1')          // *italic*
    .replace(/`(.+?)`/g, '$1')            // `code`
    .replace(/^\s*[-*•]\s+/gm, '')       // bullet points
    .replace(/^\s*\d+\.\s+/gm, '')      // numbered lists
    .replace(/\n{2,}/g, '. ')             // double newlines → spoken pause
    .replace(/\n/g, ' ')                  // single newlines → space
    .trim();
}

var NUM_BARS = 48;

// ── Init DOM refs ──
function init(){
  fab      = null; // FAB replaced by radial menu
  panel    = document.getElementById('charliePanel');
  statusEl = document.getElementById('charlieStatus');
  answerEl = document.getElementById('charlieAnswer');
  barsEl   = document.getElementById('charlieBars');
  // Generate radial bar slots
  if(barsEl && !barsEl.children.length){
    for(var i = 0; i < NUM_BARS; i++){
      var slot = document.createElement('div');
      slot.className = 'charlie-bar-slot';
      slot.style.transform = 'rotate(' + (i * (360 / NUM_BARS)) + 'deg)';
      var bar = document.createElement('div');
      bar.className = 'charlie-bar';
      bar.style.animationDelay = (i * 0.045) + 's';
      slot.appendChild(bar);
      barsEl.appendChild(slot);
    }
  }
  statusEl.textContent = t('charlie.ready');
}

// ── State management ──
function setState(s){
  state = s;
  if(fab){
    fab.classList.remove('active','listening','thinking','speaking');
    if(s === 'listening') fab.classList.add('active','listening');
    else if(s === 'thinking') fab.classList.add('active','thinking');
    else if(s === 'speaking') fab.classList.add('active','speaking');
    else if(isOpen) fab.classList.add('active');
  }
  // Panel state classes for CSS animations
  if(panel){
    panel.classList.remove('listening','thinking','speaking');
    if(s !== 'idle') panel.classList.add(s);
  }
  if(statusEl){
    if(s === 'listening')      statusEl.textContent = t('charlie.listening');
    else if(s === 'thinking')  statusEl.textContent = t('charlie.thinking');
    else if(s === 'speaking')  statusEl.textContent = t('charlie.speaking');
    else                       statusEl.textContent = t('charlie.ready');
  }
}

function resetBarsIdle(){
  if(!barsEl) return;
  var bars = barsEl.querySelectorAll('.charlie-bar');
  bars.forEach(function(bar){ bar.style.height = ''; }); // clear inline → CSS animation takes over
}

var listenFrame = null;
var MIC_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';

var lastActivity = 0; // timestamp of last interaction
var CONVO_TTL = 5 * 60 * 1000; // clear conversation after 5 min idle

// ── Toggle (FAB tap) ──
function toggle(){
  if(!panel) init();
  // Unlock AudioContext NOW — within the user gesture scope
  VentAudio.unlock();
  if(!isOpen){
    // If conversation is stale, clear it
    if(convoHistory.length && Date.now() - lastActivity > CONVO_TTL){
      convoHistory = [];
    }
    isOpen = true;
    panel.style.display = 'block';
    // Restore last answer if there is one
    if(convoHistory.length){
      var last = convoHistory[convoHistory.length - 1];
      answerEl.style.display = 'block';
      answerEl.innerHTML = '<div class="charlie-q">\u201c' + escHtml(last.q) + '\u201d</div>' + last.a;
    } else {
      answerEl.style.display = 'none';
    }
    startListening();
  } else if(state === 'listening' && VentAudio.isRecording()){
    // Tap while listening → force stop → process
    VentAudio.stopRecording();
  } else if(state === 'speaking'){
    // Tap while speaking → skip → re-listen
    VentAudio.stop();
    resetBarsIdle();
    startListening();
  } else {
    closePanel();
  }
}

function closePanel(){
  isOpen = false;
  if(listenFrame){ cancelAnimationFrame(listenFrame); listenFrame = null; }
  VentAudio.stop();
  VentAudio.killRecording();
  if(fab) fab.innerHTML = MIC_ICON;
  panel.style.display = 'none';
  resetBarsIdle();
  setState('idle');
  lastActivity = Date.now();
  // Conversation history is KEPT — reopening restores it
}

// ── Listening with real mic visualization + silence detection ──
function startListening(){
  VentAudio.stop();
  setState('listening');

  var speechDetected = false;
  var silenceStart = 0;
  var SILENCE_THRESH = 12;    // average frequency bin level
  var SILENCE_MS     = 1800;  // ms of quiet after speech → auto-stop
  var MAX_REC_MS     = 15000; // safety timeout
  var recStart = Date.now();

  VentAudio.recordSTT(function(text){
    if(listenFrame){ cancelAnimationFrame(listenFrame); listenFrame = null; }
    if(fab) fab.innerHTML = MIC_ICON;
    onTranscript(text);
  }, function(err){
    if(listenFrame){ cancelAnimationFrame(listenFrame); listenFrame = null; }
    if(fab) fab.innerHTML = MIC_ICON;
    if(!isOpen) return;
    statusEl.textContent = (err === 'mic') ? t('charlie.micError') : t('charlie.sttError');
    setState('idle');
  });

  // Real-time mic visualizer + auto-silence-stop
  setTimeout(function tickListen(){
    var ma = VentAudio.getMicAnalyser();
    if(!ma || !isOpen || state !== 'listening'){
      listenFrame = null; return;
    }
    var freq = new Uint8Array(ma.frequencyBinCount);
    ma.getByteFrequencyData(freq);

    // Animate radial bars from mic input
    if(barsEl){
      var bars = barsEl.querySelectorAll('.charlie-bar');
      bars.forEach(function(bar, i){
        var idx = Math.floor((i / bars.length) * freq.length * 0.6);
        bar.style.height = Math.max(4, (freq[idx] / 255) * 34) + 'px';
      });
    }

    // Compute average level
    var sum = 0;
    for(var j = 0; j < freq.length; j++) sum += freq[j];
    var avg = sum / freq.length;

    if(avg > SILENCE_THRESH){
      speechDetected = true;
      silenceStart = 0;
    } else if(speechDetected){
      if(!silenceStart) silenceStart = Date.now();
      else if(Date.now() - silenceStart > SILENCE_MS){
        // Silence after speech → auto-stop & process
        VentAudio.stopRecording();
        listenFrame = null;
        return;
      }
    }

    // Safety max duration
    if(Date.now() - recStart > MAX_REC_MS){
      VentAudio.stopRecording();
      listenFrame = null;
      return;
    }

    listenFrame = requestAnimationFrame(tickListen);
  }, 300); // short delay for mic init
}

// ── After response: go idle, wait for user to tap again ──
function returnToReady(){
  resetBarsIdle();
  if(!isOpen) return;
  setState('idle');
  if(statusEl) statusEl.textContent = t('charlie.ready');
}

// ── Transcript received → ask Claude ──
// Detect voice language-switch commands in any of the three languages.
// Returns target lang code or null.
function detectLangCommand(text){
  var t = text.toLowerCase().trim();
  // English triggers (EN / ES / ZH)
  if(/\b(english|inglés|ingles|英语|英文|说英语|切换英语)\b/.test(t)) return 'en';
  // Spanish triggers
  if(/\b(spanish|español|espanol|en español|habla español|西班牙语|说西班牙语)\b/.test(t)) return 'es';
  // Chinese / Mandarin triggers
  if(/\b(chinese|mandarin|中文|普通话|说中文|切换中文|en chino|chino)\b/.test(t)) return 'zh';
  return null;
}

var LANG_CONFIRM = { en: 'Switched to English.', es: 'Cambiado a Español.', zh: '已切换到中文。' };
var LANG_PIVOT = {
  en: { q: '(language changed to English)', a: 'Got it — switching to English now.' },
  es: { q: '(idioma cambiado a Español)',   a: 'Claro — cambio al español ahora.' },
  zh: { q: '（已切换到中文）',                 a: '好的，我现在用中文回答。' }
};

// Listen for any language change (button or voice) and inject a context pivot
// so Claude breaks from the previous language on the very next turn
window.addEventListener('ventLangChanged', function(e){
  var pivot = LANG_PIVOT[e.detail && e.detail.lang];
  if(pivot){
    convoHistory.push(pivot);
    if(convoHistory.length > 12) convoHistory = convoHistory.slice(-10);
  }
});

function onTranscript(text){
  // ── Instant voice language switching ──────────────────────────────────
  var targetLang = detectLangCommand(text);
  if(targetLang && window.VentI18n){
    VentI18n.setLang(targetLang); // fires ventLangChanged → pivot injected above
    var confirm = LANG_CONFIRM[targetLang];
    setState('speaking');
    answerEl.style.display = 'block';
    answerEl.innerHTML = confirm;
    VentAudio.speak(confirm, null, function(){ returnToReady(); });
    return;
  }
  // ─────────────────────────────────────────────────────────────────────
  setState('thinking');
  lastActivity = Date.now();
  answerEl.style.display = 'block';
  answerEl.innerHTML = '<div class="charlie-q">\u201c' + escHtml(text) + '\u201d</div>';
  var lang = (window.VentI18n && VentI18n.getLang()) || 'en';

  fetch(SERVER + '/charlie/ask', {
    method: 'POST',
    headers: Object.assign({'Content-Type':'application/json'}, getAuthHeaders()),
    body: JSON.stringify({ question: text, lang: lang, history: convoHistory })
  })
  .then(function(r){
    if(!r.ok) throw new Error('Server ' + r.status);
    return r.json();
  })
  .then(function(data){
    var answer = data.answer || t('charlie.error');
    convoHistory.push({ q: text, a: answer });
    if(convoHistory.length > 12) convoHistory = convoHistory.slice(-10);
    lastActivity = Date.now();

    answerEl.innerHTML = '<div class="charlie-q">\u201c' + escHtml(text) + '\u201d</div>' + answer;

    // Dispatch action
    if(data.action) dispatchAction(data.action, data.params || {});

    // Speak the answer via TTS
    setState('speaking');
    VentAudio.speak._lastError = null;
    VentAudio.speak(stripTTSMarkdown(answer), function(freqData){
      if(!barsEl) return;
      var bars = barsEl.querySelectorAll('.charlie-bar');
      bars.forEach(function(bar, i){
        var idx = Math.floor((i / bars.length) * freqData.length * 0.7);
        var h = Math.max(4, (freqData[idx] / 255) * 32);
        bar.style.height = h + 'px';
      });
    }, function(){
      // TTS finished (or failed)
      var err = VentAudio.speak._lastError;
      if(err){
        VentAudio.speak._lastError = null;
        // Show error visibly so user can see what went wrong
        if(statusEl) statusEl.textContent = 'Voice error: ' + err;
        console.warn('[Charlie] TTS error:', err);
      }
      returnToReady();
    });
  })
  .catch(function(err){
    console.warn('[Charlie] /charlie/ask failed:', err);
    answerEl.innerHTML = '<div class="charlie-q">\u201c' + text + '\u201d</div>' + t('charlie.error');
    // Still re-listen so user can try again
    returnToReady();
  });
}

// Exports
export { toggle as toggleCharlie, closePanel as closeCharlie };

// Init on DOM ready
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
