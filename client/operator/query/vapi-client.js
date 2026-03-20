// ═══════════════════════════════════════════════════════════════════════════════
// VAPI Client — Real-time Voice Pipeline for Charlie (ES Module)
// ═══════════════════════════════════════════════════════════════════════════════
// Progressive enhancement: if VAPI is configured (server returns enabled=true),
// this replaces the manual STT→Claude→TTS round-trip with a persistent WebRTC
// session. Falls back to the existing ElevenLabs flow when VAPI is unavailable.
//
// Loaded after charlie.js — hooks into the same toggle/close/dispatch system.
// ═══════════════════════════════════════════════════════════════════════════════
import { toggleCharlie as _originalToggle, closeCharlie as _originalClose, dispatchAction } from './charlie.js';

var vapiInstance = null;
var vapiEnabled = false;
var vapiReady = false;
var vapiCallActive = false;

// ── Check if VAPI is available ──────────────────────────────────────────────
async function checkVapiConfig(){
  try {
    var res = await fetch(SERVER + '/vapi/config', {
      headers: Object.assign({'Content-Type':'application/json'}, getAuthHeaders())
    });
    if(!res.ok) return false;
    var data = await res.json();
    if(data.enabled && data.publicKey && data.assistantId){
      return data;
    }
  } catch(e){
    console.log('[VAPI] Config check failed:', e.message);
  }
  return false;
}

// ── Load VAPI Web SDK dynamically ───────────────────────────────────────────
function loadVapiSdk(){
  return new Promise(function(resolve, reject){
    if(window.Vapi){ return resolve(window.Vapi); }
    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@vapi-ai/web@latest/dist/vapi.umd.js';
    script.onload = function(){ resolve(window.Vapi); };
    script.onerror = function(){ reject(new Error('Failed to load VAPI SDK')); };
    document.head.appendChild(script);
  });
}

// ── Initialise VAPI ─────────────────────────────────────────────────────────
async function initVapi(){
  var config = await checkVapiConfig();
  if(!config){
    console.log('[VAPI] Not configured — using ElevenLabs fallback');
    return;
  }

  try {
    var VapiClass = await loadVapiSdk();
    vapiInstance = new VapiClass(config.publicKey);
    vapiEnabled = true;

    // Store assistant ID for startCall
    vapiInstance._ventAssistantId = config.assistantId;

    // ── Event handlers ────────────────────────────────────────────────────

    vapiInstance.on('call-start', function(){
      vapiCallActive = true;
      vapiReady = true;
      console.log('[VAPI] Call started');
      updateCharlieState('listening');
    });

    vapiInstance.on('call-end', function(){
      vapiCallActive = false;
      console.log('[VAPI] Call ended');
      updateCharlieState('idle');
    });

    vapiInstance.on('speech-start', function(){
      updateCharlieState('speaking');
    });

    vapiInstance.on('speech-end', function(){
      if(vapiCallActive){
        updateCharlieState('listening');
      }
    });

    vapiInstance.on('message', function(msg){
      if(!msg) return;

      // Handle function-call results coming back (for UI actions)
      if(msg.type === 'function-call' && msg.functionCall){
        var result = msg.functionCall.result;
        if(result && result.action){
          dispatchAction(result.action, result.params || {});
        }
      }

      // Display transcripts
      if(msg.type === 'transcript'){
        var answerEl = document.getElementById('charlieAnswer');
        if(answerEl && msg.transcriptType === 'final'){
          if(msg.role === 'user'){
            answerEl.style.display = 'block';
            answerEl.innerHTML = '<div class="charlie-q">\u201c' + msg.transcript + '\u201d</div>';
          } else if(msg.role === 'assistant'){
            var existing = answerEl.innerHTML;
            answerEl.innerHTML = existing + msg.transcript;
          }
        }
      }
    });

    vapiInstance.on('error', function(err){
      console.error('[VAPI] Error:', err);
      vapiCallActive = false;
      updateCharlieState('idle');
    });

    console.log('[VAPI] Initialised — real-time voice enabled');
  } catch(e){
    console.warn('[VAPI] Init failed:', e.message, '— falling back to ElevenLabs');
    vapiEnabled = false;
  }
}

// ── Start/stop VAPI call ────────────────────────────────────────────────────
function startVapiCall(){
  if(!vapiInstance || !vapiEnabled) return false;

  var lang = (window.VentI18n && VentI18n.getLang()) || 'en';

  vapiInstance.start(vapiInstance._ventAssistantId, {
    metadata: {
      lang: lang,
      page: window.location.pathname,
    },
    // Override assistant settings per-call if needed
    variableValues: {
      language: lang === 'zh' ? 'Chinese (Mandarin)' : lang === 'es' ? 'Spanish' : 'English',
    },
  });

  return true;
}

function stopVapiCall(){
  if(vapiInstance && vapiCallActive){
    vapiInstance.stop();
    vapiCallActive = false;
    return true;
  }
  return false;
}

// ── Update Charlie UI state ─────────────────────────────────────────────────
function updateCharlieState(state){
  var panel = document.getElementById('charliePanel');
  var statusEl = document.getElementById('charlieStatus');
  var barsEl = document.getElementById('charlieBars');

  if(panel){
    panel.classList.remove('listening','thinking','speaking');
    if(state !== 'idle') panel.classList.add(state);
  }

  if(statusEl){
    var t = (window.VentI18n && VentI18n.t) || function(k){ return k; };
    if(state === 'listening')      statusEl.textContent = t('charlie.listening');
    else if(state === 'thinking')  statusEl.textContent = t('charlie.thinking');
    else if(state === 'speaking')  statusEl.textContent = t('charlie.speaking');
    else                           statusEl.textContent = t('charlie.ready');
  }

  // Animate bars during speech via VAPI's audio levels
  if(state === 'speaking' && vapiInstance && barsEl){
    animateVapiBars(barsEl);
  }
}

// ── Animate radial bars from VAPI volume levels ─────────────────────────────
var barsFrame = null;
function animateVapiBars(barsEl){
  if(barsFrame) cancelAnimationFrame(barsFrame);

  function tick(){
    if(!vapiCallActive){
      // Reset bars
      var bars = barsEl.querySelectorAll('.charlie-bar');
      bars.forEach(function(bar){ bar.style.height = ''; });
      barsFrame = null;
      return;
    }
    // VAPI exposes volume level events; we use random gentle animation as fallback
    var bars = barsEl.querySelectorAll('.charlie-bar');
    bars.forEach(function(bar){
      var h = Math.max(4, Math.random() * 28 + 4);
      bar.style.height = h + 'px';
    });
    barsFrame = requestAnimationFrame(tick);
  }
  tick();
}

// ── VAPI-enhanced toggle/close wrappers ─────────────────────────────────────
export function vapiToggleCharlie(){
  if(!vapiEnabled){
    // Fall back to original ElevenLabs flow
    if(_originalToggle) _originalToggle();
    return;
  }

  var panel = document.getElementById('charliePanel');
  if(!panel) return;

  if(vapiCallActive){
    // Tap during active call → end it
    stopVapiCall();
    panel.style.display = 'none';
  } else if(panel.style.display === 'block'){
    // Panel open but no call → close
    stopVapiCall();
    panel.style.display = 'none';
  } else {
    // Open panel and start VAPI call
    panel.style.display = 'block';
    var answerEl = document.getElementById('charlieAnswer');
    if(answerEl){ answerEl.style.display = 'none'; }
    startVapiCall();
  }
}

export function vapiCloseCharlie(){
  stopVapiCall();
  if(_originalClose) _originalClose();
}

// ── Expose VapiClient for external use ──────────────────────────────────────
export const VapiClient = {
  isEnabled: function(){ return vapiEnabled; },
  isActive: function(){ return vapiCallActive; },
  start: startVapiCall,
  stop: stopVapiCall,
};

// ── Boot ────────────────────────────────────────────────────────────────────
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', function(){ initVapi(); });
} else {
  initVapi();
}
