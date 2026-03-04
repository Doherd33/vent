/* ════════════════════════════════════════════════════════
   cinematic.js — audio engine, visualizer, TTS, intro flow
   ════════════════════════════════════════════════════════ */

// ── ElevenLabs config ──
const ELEVEN_CONFIG = {
  voiceId: 'pNInz6obpgDQGcFmaJgB',
  modelId: 'eleven_multilingual_v2',
  get greeting() { return t('tts.greeting'); },
};

// ════════════════════════════════════════════════════════
// AUDIO ENGINE
// ════════════════════════════════════════════════════════
let audioCtx   = null;
let analyser   = null;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser  = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    analyser.connect(audioCtx.destination);
  }
  return audioCtx;
}

function playSfx(type) {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;

  // ── Hover: soft, barely-there glass tap ──
  if (type === 'hover') {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    const filt = ctx.createBiquadFilter();
    osc.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    filt.type = 'lowpass'; filt.frequency.value = 1200;
    gain.gain.setValueAtTime(0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.start(now); osc.stop(now + 0.08);
  }

  // ── Click: clean two-note confirmation (like a medical device acknowledge) ──
  if (type === 'click') {
    const osc1 = ctx.createOscillator(), g1 = ctx.createGain();
    const osc2 = ctx.createOscillator(), g2 = ctx.createGain();
    osc1.connect(g1); g1.connect(ctx.destination);
    osc2.connect(g2); g2.connect(ctx.destination);
    osc1.type = 'sine'; osc1.frequency.value = 523;  // C5
    g1.gain.setValueAtTime(0.07, now);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc1.start(now); osc1.stop(now + 0.1);
    osc2.type = 'sine'; osc2.frequency.value = 659;  // E5
    g2.gain.setValueAtTime(0.0001, now);
    g2.gain.exponentialRampToValueAtTime(0.06, now + 0.06);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc2.start(now + 0.05); osc2.stop(now + 0.15);
  }

  // ── Enter: gentle rising chord — clean, clinical, confident ──
  if (type === 'enter') {
    var notes = [261.6, 329.6, 392.0];  // C4, E4, G4 — major triad
    notes.forEach(function(freq, i) {
      var osc = ctx.createOscillator(), gain = ctx.createGain();
      var filt = ctx.createBiquadFilter();
      osc.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.value = freq;
      filt.type = 'lowpass'; filt.frequency.value = 2000;
      var offset = i * 0.12;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.06, now + offset + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.7);
      osc.start(now + offset); osc.stop(now + offset + 0.7);
    });
  }

  // ── Ambient: low filtered drone — barely audible, feels like a cleanroom hum ──
  if (type === 'ambient') {
    var osc = ctx.createOscillator(), gain = ctx.createGain();
    var filt = ctx.createBiquadFilter();
    osc.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine'; osc.frequency.value = 65;   // Low C2
    filt.type = 'lowpass'; filt.frequency.value = 120;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.025, now + 3);
    gain.gain.setValueAtTime(0.025, now + 7);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 12);
    osc.start(now); osc.stop(now + 12);
  }
}

// ════════════════════════════════════════════════════════
// FREQUENCY VISUALIZER BARS
// ════════════════════════════════════════════════════════
const NUM_BARS    = 48;
let barHeights    = new Array(NUM_BARS).fill(4);
let targetHeights = new Array(NUM_BARS).fill(4);
let vizRunning    = false;
let isPlayingVoice = false;

function initBars() {
  const container = document.getElementById('vizBars');
  for (let i = 0; i < NUM_BARS; i++) {
    const bar = document.createElement('div');
    bar.className = 'cine-bar';
    bar.style.height = '4px';
    container.appendChild(bar);
  }
}

function animateBars() {
  vizRunning = true;
  const bars    = document.querySelectorAll('.cine-bar');
  const freqData = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

  function tick() {
    if (!vizRunning) return;
    if (isPlayingVoice && analyser && freqData) {
      analyser.getByteFrequencyData(freqData);
      for (let i = 0; i < NUM_BARS; i++) {
        const idx = Math.floor((i / NUM_BARS) * freqData.length * 0.7);
        targetHeights[i] = Math.max(4, (freqData[idx] / 255) * 76);
      }
    } else {
      const t = Date.now() / 1000;
      for (let i = 0; i < NUM_BARS; i++) {
        const center   = NUM_BARS / 2;
        const dist     = Math.abs(i - center) / center;
        const wave1    = Math.sin(t * 1.5 + i * 0.25) * 0.5 + 0.5;
        const wave2    = Math.sin(t * 0.8 + i * 0.15 + 1.5) * 0.5 + 0.5;
        const wave3    = Math.sin(t * 2.3 + i * 0.4  + 3.0) * 0.3 + 0.7;
        const envelope = 1 - dist * 0.6;
        targetHeights[i] = Math.max(4, (wave1 * wave2 * wave3 * envelope) * 50 + 4);
      }
    }
    for (let i = 0; i < NUM_BARS; i++) {
      barHeights[i] += (targetHeights[i] - barHeights[i]) * 0.18;
      if (bars[i]) bars[i].style.height = barHeights[i] + 'px';
    }
    requestAnimationFrame(tick);
  }
  tick();
}

// ════════════════════════════════════════════════════════
// CANVAS — cinematic intro particles
// ════════════════════════════════════════════════════════
function initCanvas() {
  const canvas = document.getElementById('vizCanvas');
  const ctx    = canvas.getContext('2d');
  let particles = [];
  const COUNT  = 60;

  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < COUNT; i++) {
    particles.push({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      size: Math.random() * 1.5 + 0.5, opacity: Math.random() * 0.3 + 0.05,
      color: Math.random() > 0.5 ? '0,122,204' : '78,201,176',
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          ctx.strokeStyle = `rgba(0,122,204,${(1 - dist / 150) * 0.08})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${p.opacity})`;
      ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;  if (p.x > canvas.width)  p.x = 0;
      if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
    });
    requestAnimationFrame(draw);
  }
  draw();
  setTimeout(() => canvas.classList.add('active'), 500);
}

// ════════════════════════════════════════════════════════
// CANVAS — login card background particles
// ════════════════════════════════════════════════════════
function initLoginCanvas() {
  const canvas = document.getElementById('loginCanvas');
  const ctx    = canvas.getContext('2d');
  let particles = [];
  const COUNT  = 40;

  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < COUNT; i++) {
    particles.push({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2,
      size: Math.random() * 1.2 + 0.3, opacity: Math.random() * 0.25 + 0.03,
      color: Math.random() > 0.5 ? '0,122,204' : '78,201,176',
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.strokeStyle = `rgba(0,122,204,${(1 - dist / 120) * 0.06})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${p.opacity})`;
      ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;  if (p.x > canvas.width)  p.x = 0;
      if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
    });
    requestAnimationFrame(draw);
  }
  draw();
  setTimeout(() => canvas.classList.add('active'), 300);
}

// ════════════════════════════════════════════════════════
// TYPEWRITER
// ════════════════════════════════════════════════════════
function typewriter(element, text, speed = 50) {
  return new Promise(resolve => {
    let i = 0;
    element.innerHTML = '<span class="cursor"></span>';
    const interval = setInterval(() => {
      if (i < text.length) {
        element.innerHTML = text.substring(0, i + 1) + '<span class="cursor"></span>';
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => { element.innerHTML = text; resolve(); }, 1500);
      }
    }, speed);
  });
}

// ════════════════════════════════════════════════════════
// ELEVENLABS TTS
// ════════════════════════════════════════════════════════
async function playVoiceGreeting() {
  try {
    // Read saved voice config from localStorage (set in query.html profile panel)
    let vc = {};
    try { vc = JSON.parse(localStorage.getItem('vent_voice_config') || '{}') || {}; } catch(e){}

    // If mute is on, skip greeting entirely
    if (vc.mute) return false;

    // If welcome voice toggle is explicitly off, skip greeting
    if (vc.welcomeVoice !== undefined && !vc.welcomeVoice) return false;

    // Build TTS body with saved settings
    const voiceId = vc.voiceId || ELEVEN_CONFIG.voiceId;
    const ttsBody = {
      text:    ELEVEN_CONFIG.greeting,
      voiceId: voiceId,
      modelId: ELEVEN_CONFIG.modelId,
    };
    if (vc.stability !== undefined)  ttsBody.stability        = vc.stability / 100;
    if (vc.clarity   !== undefined)  ttsBody.similarity_boost  = vc.clarity  / 100;
    if (vc.style     !== undefined)  ttsBody.style             = vc.style    / 100;
    if (vc.boost     !== undefined)  ttsBody.use_speaker_boost = !!vc.boost;

    const response = await fetch(SERVER + '/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ttsBody),
    });
    if (!response.ok) throw new Error('TTS request failed');
    const audioUrl = URL.createObjectURL(await response.blob());
    const audio    = new Audio(audioUrl);

    // Apply volume
    audio.volume = vc.volume !== undefined ? vc.volume / 100 : 1.0;

    // Apply speed + pitch
    const baseRate = vc.speed !== undefined ? vc.speed / 100 : 1.0;
    const pitchSemis = vc.pitch || 0;
    audio.playbackRate = pitchSemis !== 0 ? baseRate * Math.pow(2, pitchSemis / 12) : baseRate;

    const ctx      = getAudioCtx();
    const source   = ctx.createMediaElementSource(audio);

    // Build audio chain: source → [bass] → [treble] → analyser
    let lastNode = source;
    const bassVal = vc.bass || 0;
    if (bassVal !== 0) {
      const bassFilter = ctx.createBiquadFilter();
      bassFilter.type = 'lowshelf';
      bassFilter.frequency.value = 200;
      bassFilter.gain.value = bassVal;
      lastNode.connect(bassFilter);
      lastNode = bassFilter;
    }
    const trebleVal = vc.treble || 0;
    if (trebleVal !== 0) {
      const trebleFilter = ctx.createBiquadFilter();
      trebleFilter.type = 'highshelf';
      trebleFilter.frequency.value = 3000;
      trebleFilter.gain.value = trebleVal;
      lastNode.connect(trebleFilter);
      lastNode = trebleFilter;
    }
    lastNode.connect(analyser);

    isPlayingVoice = true;
    audio.play();
    audio.addEventListener('ended', () => {
      isPlayingVoice = false;
      URL.revokeObjectURL(audioUrl);
    });
    return true;
  } catch (err) {
    console.warn('ElevenLabs TTS failed:', err.message);
    return false;
  }
}

// ════════════════════════════════════════════════════════
// ENTER TRANSITION
// ════════════════════════════════════════════════════════
let hasEntered = false;

async function enterVent() {
  if (hasEntered) return;
  hasEntered = true;

  playSfx('enter');
  const voicePlayed = await playVoiceGreeting();
  const delay       = voicePlayed ? 2500 : 800;

  setTimeout(() => {
    const cine = document.getElementById('cinematic');
    cine.classList.add('exit');
    vizRunning = false;

    const savedName = localStorage.getItem('vent_first_name');
    if (savedName) {
      // Returning user — skip welcome screen
      transitionToLogin(savedName);
      setTimeout(() => { cine.style.display = 'none'; }, 600);
    } else {
      // New user — show welcome screen
      initWelcomeCanvas();
      setTimeout(() => {
        document.getElementById('welcomeScreen').classList.add('active');
        cine.style.display = 'none';
        playSfx('click');
        setTimeout(() => { document.getElementById('welcomeNameInput').focus(); }, 400);
      }, 500);
    }
  }, delay);
}

// ════════════════════════════════════════════════════════
// BOOT / RESET
// ════════════════════════════════════════════════════════
function bootCinematic() {
  hasEntered = false;
  vizRunning = false;

  const cine = document.getElementById('cinematic');
  cine.style.display = '';
  cine.classList.remove('exit');

  document.body.classList.remove('login-ready');
  document.getElementById('loginWrap').classList.remove('visible');
  document.getElementById('loginOrbs').classList.remove('show');
  const lc = document.getElementById('loginCanvas');
  if (lc) lc.classList.remove('active');

  const ws = document.getElementById('welcomeScreen');
  ws.classList.remove('active', 'exit');
  const wni = document.getElementById('welcomeNameInput');
  if (wni) wni.value = '';
  const wb = document.getElementById('welcomeBtn');
  if (wb) wb.disabled = true;

  // ?reset param clears stored name, forcing welcome screen on next Enter
  if (new URLSearchParams(window.location.search).has('reset')) {
    localStorage.removeItem('vent_first_name');
    history.replaceState(null, '', window.location.pathname);
  }

  const tagline = document.getElementById('cineTagline');
  tagline.innerHTML = '<span class="cursor"></span>';
  document.getElementById('cineDivider').classList.remove('expand');

  initCanvas();
  initBars();

  setTimeout(() => document.getElementById('cineDivider').classList.add('expand'), 1400);
  setTimeout(() => typewriter(document.getElementById('cineTagline'), t('cine.tagline'), 65), 1900);
  setTimeout(() => animateBars(), 2600);

  // Voice status
  const dot   = document.getElementById('voiceDot');
  const label = document.getElementById('voiceLabel');
  dot.classList.remove('connected', 'offline');
  label.textContent = '';
  fetch(SERVER + '/health').then(r => {
    if (r.ok) { dot.classList.add('connected'); label.textContent = t('cine.voiceConnected'); }
    else throw new Error();
  }).catch(() => {
    dot.classList.add('offline'); label.textContent = t('cine.voiceOffline');
  });
}

// Language switcher support
window.addEventListener('ventLangChanged', () => {
  const sub = document.getElementById('cineSubtitle');
  if (sub) sub.textContent = t('cine.subtitle');
  const tagline = document.getElementById('cineTagline');
  if (tagline && !tagline.querySelector('.cursor')) tagline.textContent = t('cine.tagline');
  const dot = document.getElementById('voiceDot'), label = document.getElementById('voiceLabel');
  if (dot && dot.classList.contains('connected')) label.textContent = t('cine.voiceConnected');
  if (dot && dot.classList.contains('offline'))   label.textContent = t('cine.voiceOffline');
});

// bfcache restore
window.addEventListener('pageshow', (e) => {
  if (e.persisted) bootCinematic();
});

document.addEventListener('DOMContentLoaded', () => {
  bootCinematic();

  document.addEventListener('mouseenter', (e) => {
    if (e.target.matches('button, .tab, .path-card, .dept-item, a')) playSfx('hover');
  }, true);

  document.addEventListener('mousedown', (e) => {
    if (e.target.matches('button, .tab, .path-card, .dept-item, a') && !e.target.matches('#cineEnter')) playSfx('click');
  }, true);

  document.addEventListener('focusin', (e) => {
    if (e.target.matches('input')) playSfx('hover');
  }, true);
});
