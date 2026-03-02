// ════════════════════════════════════════════════════════════════════════════════
// JARVIS VOICE COMMAND — Bar creation + animation
// ════════════════════════════════════════════════════════════════════════════════
var VC_NUM_BARS = 28;
var VC_SPACER = 30; // px from center to where visible bar starts
var vcMicFrame = null;

(function initVCBars() {
  var container = document.getElementById('vcBars');
  if (!container) return;
  for (var i = 0; i < VC_NUM_BARS; i++) {
    var bar = document.createElement('div');
    bar.className = 'vc-bar';
    bar.style.transform = 'rotate(' + (i * (360 / VC_NUM_BARS)) + 'deg)';
    bar.style.height = (VC_SPACER + 3) + 'px';
    container.appendChild(bar);
  }
})();

function animateVCBars(freqData) {
  var bars = document.querySelectorAll('.vc-bar');
  if (!bars.length || !freqData) return;
  for (var i = 0; i < bars.length; i++) {
    var idx = Math.floor((i / bars.length) * freqData.length * 0.7);
    var val = freqData[idx] || 0;
    var h = VC_SPACER + Math.max(3, (val / 255) * 30);
    bars[i].style.height = h + 'px';
  }
}

function resetVCBars() {
  if (vcMicFrame) { cancelAnimationFrame(vcMicFrame); vcMicFrame = null; }
  var bars = document.querySelectorAll('.vc-bar');
  for (var i = 0; i < bars.length; i++) {
    bars[i].style.height = (VC_SPACER + 3) + 'px';
  }
}

function startVCMicAnimation() {
  if (vcMicFrame) return;
  (function tick() {
    if (voiceState !== 'listening') { vcMicFrame = null; return; }
    var ma = VentAudio.getMicAnalyser();
    if (ma) {
      var freq = new Uint8Array(ma.frequencyBinCount);
      ma.getByteFrequencyData(freq);
      animateVCBars(freq);
    }
    vcMicFrame = requestAnimationFrame(tick);
  })();
}

// ── i18n setup ──
if (window.VentI18n) {
  VentI18n.applyAll();
  VentI18n.renderLangSwitcher('langSwitcher');
}

// ── Init ──
loadSessions();

// Auto-greeting: show Charlie's opening line without consuming an API session
(function showOpeningGreeting() {
  var thread = document.getElementById('chatThread');
  if (!thread || thread.children.length > 0) return;
  appendChatMsg('assistant', "Hey! I'd love to hear how things are going with Vent. What's been on your mind — anything working well, or anything that's been frustrating you?");
})();
