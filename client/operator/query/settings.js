// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE & SETTINGS (ES Module)
// ═══════════════════════════════════════════════════════════════════════════════

var PALETTES = [
  { name: 'Blue',   hue: 210, color: 'hsl(210,100%,50%)' },
  { name: 'Cyan',   hue: 185, color: 'hsl(185,100%,50%)' },
  { name: 'Green',  hue: 145, color: 'hsl(145,85%,45%)'  },
  { name: 'Amber',  hue: 38,  color: 'hsl(38,95%,50%)'   },
  { name: 'Purple', hue: 270, color: 'hsl(270,85%,55%)'  },
  { name: 'Rose',   hue: 340, color: 'hsl(340,85%,55%)'  }
];

var BUILTIN_PRESETS = [
  { name: 'Default',  hue: 210, radius: 120, wedgeSize: 80, borderRadius: 14, glowIntensity: 100 },
  { name: 'Compact',  hue: 210, radius: 90,  wedgeSize: 65, borderRadius: 10, glowIntensity: 60  },
  { name: 'Expanded', hue: 210, radius: 150, wedgeSize: 95, borderRadius: 18, glowIntensity: 100 },
  { name: 'Minimal',  hue: 210, radius: 110, wedgeSize: 70, borderRadius: 4,  glowIntensity: 30  }
];

var panelEl, hueSlider, hueVal;
var wedgeSizeSlider, wedgeSizeVal;
var radiusSlider, radiusVal;
var cornerSlider, cornerVal;
var glowSlider, glowVal;
var paletteGrid, presetGrid;
var currentHue = 210;

// Voice settings elements
var voiceVolumeSlider, voiceVolumeVal;
var voiceSpeedSlider, voiceSpeedVal;
var voiceStabilitySlider, voiceStabilityVal;
var voiceClaritySlider, voiceClarityVal;
var voiceStyleSlider, voiceStyleVal;
var voiceTestBtn, voiceResetBtn, voicePickerGrid, voiceSaveBtn;
var voiceBoostToggle, voicePitchSlider, voicePitchVal;
var voiceBassSlider, voiceBassVal, voiceTrebleSlider, voiceTrebleVal;
var voiceWelcomeToggle, voiceMuteToggle;

var VOICE_DEFAULTS = {
  volume: 100, speed: 100, stability: 50, clarity: 75, style: 30,
  voiceId: 'IKne3meq5aSn9XLyUdCD', boost: false,
  pitch: 0, bass: 0, treble: 0,
  welcomeVoice: true, mute: false
};

var VOICE_OPTIONS = [
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie',  tag: 'AUS M',   initial: 'C' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel',   tag: 'US F',    initial: 'R' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George',   tag: 'UK M',    initial: 'G' },
  { id: 'ThT5KcBeYPX3keUQqHPh', name: 'Dorothy',  tag: 'UK F',    initial: 'D' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh',     tag: 'US M',    initial: 'J' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli',     tag: 'US F',    initial: 'E' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold',   tag: 'US M',    initial: 'A' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam',     tag: 'US M',    initial: 'Ad' }
];

function init(){
  panelEl = document.getElementById('profilePanel');
  if(!panelEl) return;

  hueSlider       = document.getElementById('hueSlider');
  hueVal          = document.getElementById('hueVal');
  wedgeSizeSlider = document.getElementById('wedgeSizeSlider');
  wedgeSizeVal    = document.getElementById('wedgeSizeVal');
  radiusSlider    = document.getElementById('radiusSlider');
  radiusVal       = document.getElementById('radiusVal');
  cornerSlider    = document.getElementById('cornerSlider');
  cornerVal       = document.getElementById('cornerVal');
  glowSlider      = document.getElementById('glowSlider');
  glowVal         = document.getElementById('glowVal');
  paletteGrid     = document.getElementById('paletteGrid');
  presetGrid      = document.getElementById('presetGrid');

  // Voice settings DOM
  voiceVolumeSlider    = document.getElementById('voiceVolumeSlider');
  voiceVolumeVal       = document.getElementById('voiceVolumeVal');
  voiceSpeedSlider     = document.getElementById('voiceSpeedSlider');
  voiceSpeedVal        = document.getElementById('voiceSpeedVal');
  voiceStabilitySlider = document.getElementById('voiceStabilitySlider');
  voiceStabilityVal    = document.getElementById('voiceStabilityVal');
  voiceClaritySlider   = document.getElementById('voiceClaritySlider');
  voiceClarityVal      = document.getElementById('voiceClarityVal');
  voiceStyleSlider     = document.getElementById('voiceStyleSlider');
  voiceStyleVal        = document.getElementById('voiceStyleVal');
  voiceTestBtn         = document.getElementById('voiceTestBtn');
  voiceResetBtn        = document.getElementById('voiceResetBtn');
  voicePickerGrid      = document.getElementById('voicePickerGrid');
  voiceSaveBtn         = document.getElementById('voiceSaveBtn');
  voiceBoostToggle     = document.getElementById('voiceBoostToggle');
  voicePitchSlider     = document.getElementById('voicePitchSlider');
  voicePitchVal        = document.getElementById('voicePitchVal');
  voiceBassSlider      = document.getElementById('voiceBassSlider');
  voiceBassVal         = document.getElementById('voiceBassVal');
  voiceTrebleSlider    = document.getElementById('voiceTrebleSlider');
  voiceTrebleVal       = document.getElementById('voiceTrebleVal');
  voiceWelcomeToggle   = document.getElementById('voiceWelcomeToggle');
  voiceMuteToggle      = document.getElementById('voiceMuteToggle');

  // Populate profile info
  var profName = document.getElementById('profName');
  var profRole = document.getElementById('profRole');
  if(profName) profName.textContent = localStorage.getItem('vent_name') || '(not set)';
  if(profRole) profRole.textContent = (localStorage.getItem('vent_role') || 'operator').replace(/^\w/, function(c){ return c.toUpperCase(); });

  buildPalette();

  // Slider listeners — live preview
  hueSlider.addEventListener('input', function(){
    var h = parseInt(this.value);
    hueVal.textContent = h;
    applyHue(h);
    clearActiveSwatch();
  });
  if(wedgeSizeSlider) wedgeSizeSlider.addEventListener('input', function(){
    if(wedgeSizeVal) wedgeSizeVal.textContent = this.value;
    applyMenuDesign();
  });
  if(radiusSlider) radiusSlider.addEventListener('input', function(){
    if(radiusVal) radiusVal.textContent = this.value;
    applyMenuDesign();
  });
  if(cornerSlider) cornerSlider.addEventListener('input', function(){
    if(cornerVal) cornerVal.textContent = this.value;
    applyMenuDesign();
  });
  if(glowSlider) glowSlider.addEventListener('input', function(){
    if(glowVal) glowVal.textContent = this.value + '%';
    applyMenuDesign();
  });

  // ── Voice slider listeners ──
  if(voiceVolumeSlider) voiceVolumeSlider.addEventListener('input', function(){
    voiceVolumeVal.textContent = this.value + '%';
    saveVoiceSettings();
  });
  if(voiceSpeedSlider) voiceSpeedSlider.addEventListener('input', function(){
    voiceSpeedVal.textContent = (parseInt(this.value) / 100).toFixed(1) + '\u00d7';
    saveVoiceSettings();
  });
  if(voiceStabilitySlider) voiceStabilitySlider.addEventListener('input', function(){
    voiceStabilityVal.textContent = this.value;
    saveVoiceSettings();
  });
  if(voiceClaritySlider) voiceClaritySlider.addEventListener('input', function(){
    voiceClarityVal.textContent = this.value;
    saveVoiceSettings();
  });
  if(voiceStyleSlider) voiceStyleSlider.addEventListener('input', function(){
    voiceStyleVal.textContent = this.value;
    saveVoiceSettings();
  });
  if(voiceTestBtn) voiceTestBtn.addEventListener('click', function(){
    testVoice();
  });
  if(voiceResetBtn) voiceResetBtn.addEventListener('click', function(){
    resetVoiceSettings();
  });
  if(voiceBoostToggle) voiceBoostToggle.addEventListener('change', function(){
    saveVoiceSettings();
  });
  if(voicePitchSlider) voicePitchSlider.addEventListener('input', function(){
    voicePitchVal.textContent = (parseInt(this.value) > 0 ? '+' : '') + this.value;
    saveVoiceSettings();
  });
  if(voiceBassSlider) voiceBassSlider.addEventListener('input', function(){
    voiceBassVal.textContent = (parseInt(this.value) > 0 ? '+' : '') + this.value + ' dB';
    saveVoiceSettings();
  });
  if(voiceTrebleSlider) voiceTrebleSlider.addEventListener('input', function(){
    voiceTrebleVal.textContent = (parseInt(this.value) > 0 ? '+' : '') + this.value + ' dB';
    saveVoiceSettings();
  });
  if(voiceWelcomeToggle) voiceWelcomeToggle.addEventListener('change', function(){
    saveVoiceSettings();
  });
  if(voiceMuteToggle) voiceMuteToggle.addEventListener('change', function(){
    saveVoiceSettings();
  });
  if(voiceSaveBtn) voiceSaveBtn.addEventListener('click', function(){
    saveVoiceSettingsExplicit();
  });

  // Close on backdrop click or close button
  panelEl.addEventListener('click', function(e){
    if(e.target === panelEl) toggleProfilePanel();
  });
  var closeBtn = panelEl.querySelector('.profile-close');
  if(closeBtn) closeBtn.addEventListener('click', toggleProfilePanel);

  loadSavedSettings();
  renderPresets();
}

function applyHue(h){
  currentHue = h;
  document.documentElement.style.setProperty('--hue', h);
  localStorage.setItem('vent_theme_hue', String(h));
}

function applyMenuDesign(){
  var config = {
    radius:        parseInt(radiusSlider.value),
    wedgeSize:     parseInt(wedgeSizeSlider.value),
    borderRadius:  parseInt(cornerSlider.value),
    glowIntensity: parseInt(glowSlider.value) / 100
  };
  // provided by radial-menu.js
  if(window.applyMenuConfig) window.applyMenuConfig(config);
  localStorage.setItem('vent_menu_config', JSON.stringify(config));
}

// ── Voice Settings helpers ──
function getVoiceSettings(){
  try { return JSON.parse(localStorage.getItem('vent_voice_config') || 'null') || Object.assign({}, VOICE_DEFAULTS); }
  catch(e){ return Object.assign({}, VOICE_DEFAULTS); }
}

function saveVoiceSettings(){
  var cfg = {
    volume:    parseInt(voiceVolumeSlider.value),
    speed:     parseInt(voiceSpeedSlider.value),
    stability: parseInt(voiceStabilitySlider.value),
    clarity:   parseInt(voiceClaritySlider.value),
    style:     parseInt(voiceStyleSlider.value),
    voiceId:   (window._ventVoiceConfig && window._ventVoiceConfig.voiceId) || VOICE_DEFAULTS.voiceId,
    boost:     voiceBoostToggle ? voiceBoostToggle.checked : false,
    pitch:     voicePitchSlider  ? parseInt(voicePitchSlider.value)  : 0,
    bass:      voiceBassSlider   ? parseInt(voiceBassSlider.value)   : 0,
    treble:    voiceTrebleSlider ? parseInt(voiceTrebleSlider.value) : 0,
    welcomeVoice: voiceWelcomeToggle ? voiceWelcomeToggle.checked : true,
    mute:      voiceMuteToggle ? voiceMuteToggle.checked : false
  };
  localStorage.setItem('vent_voice_config', JSON.stringify(cfg));
  window._ventVoiceConfig = cfg;
}

function saveVoiceSettingsExplicit(){
  saveVoiceSettings();
  // Visual confirmation on button
  if(voiceSaveBtn){
    voiceSaveBtn.classList.add('saved');
    voiceSaveBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Saved!';
    setTimeout(function(){
      voiceSaveBtn.classList.remove('saved');
      voiceSaveBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save settings';
    }, 2200);
  }
  // Toast
  showVoiceToast('Voice settings saved \u2714');
}

function showVoiceToast(msg){
  var toast = document.getElementById('voiceToast');
  if(!toast){
    toast = document.createElement('div');
    toast.className = 'voice-toast';
    toast.id = 'voiceToast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(function(){ toast.classList.remove('show'); }, 2500);
}

function loadVoiceSettings(){
  var cfg = getVoiceSettings();
  if(voiceVolumeSlider)    { voiceVolumeSlider.value    = cfg.volume;    voiceVolumeVal.textContent    = cfg.volume + '%'; }
  if(voiceSpeedSlider)     { voiceSpeedSlider.value     = cfg.speed;     voiceSpeedVal.textContent     = (cfg.speed / 100).toFixed(1) + '\u00d7'; }
  if(voiceStabilitySlider) { voiceStabilitySlider.value = cfg.stability; voiceStabilityVal.textContent = cfg.stability; }
  if(voiceClaritySlider)   { voiceClaritySlider.value   = cfg.clarity;   voiceClarityVal.textContent   = cfg.clarity; }
  if(voiceStyleSlider)     { voiceStyleSlider.value     = cfg.style;     voiceStyleVal.textContent     = cfg.style; }
  if(voiceBoostToggle)     { voiceBoostToggle.checked   = !!cfg.boost; }
  if(voicePitchSlider)     { voicePitchSlider.value     = cfg.pitch  || 0; voicePitchVal.textContent  = (cfg.pitch > 0 ? '+' : '') + (cfg.pitch || 0); }
  if(voiceBassSlider)      { voiceBassSlider.value      = cfg.bass   || 0; voiceBassVal.textContent   = (cfg.bass > 0 ? '+' : '') + (cfg.bass || 0) + ' dB'; }
  if(voiceTrebleSlider)    { voiceTrebleSlider.value    = cfg.treble || 0; voiceTrebleVal.textContent = (cfg.treble > 0 ? '+' : '') + (cfg.treble || 0) + ' dB'; }
  if(voiceWelcomeToggle)   { voiceWelcomeToggle.checked = cfg.welcomeVoice !== false; }
  if(voiceMuteToggle)      { voiceMuteToggle.checked    = !!cfg.mute; }
  window._ventVoiceConfig = cfg;
  buildVoicePicker(cfg.voiceId || VOICE_DEFAULTS.voiceId);
}

function buildVoicePicker(activeId){
  if(!voicePickerGrid) return;
  voicePickerGrid.innerHTML = '';
  VOICE_OPTIONS.forEach(function(v){
    var card = document.createElement('div');
    card.className = 'voice-card' + (v.id === activeId ? ' active' : '');
    card.innerHTML = '<div class="voice-card-icon">' + v.initial + '</div>' +
                     '<div class="voice-card-name">' + v.name + '</div>' +
                     '<div class="voice-card-tag">' + v.tag + '</div>';
    card.addEventListener('click', function(){
      window._ventVoiceConfig = window._ventVoiceConfig || {};
      window._ventVoiceConfig.voiceId = v.id;
      saveVoiceSettings();
      voicePickerGrid.querySelectorAll('.voice-card').forEach(function(c){ c.classList.remove('active'); });
      card.classList.add('active');
    });
    voicePickerGrid.appendChild(card);
  });
}

function resetVoiceSettings(){
  localStorage.removeItem('vent_voice_config');
  window._ventVoiceConfig = Object.assign({}, VOICE_DEFAULTS);
  loadVoiceSettings();
}

var TEST_BTN_HTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg> Test voice';

function testVoice(){
  if(!voiceTestBtn) return;
  // Save current slider state to localStorage FIRST so speak() reads fresh values
  saveVoiceSettings();

  // Unlock audio context synchronously in click handler
  if(window.VentAudio) VentAudio.unlock();
  voiceTestBtn.disabled = true;
  voiceTestBtn.textContent = 'Speaking\u2026';

  function resetBtn(){
    voiceTestBtn.disabled = false;
    voiceTestBtn.innerHTML = TEST_BTN_HTML;
  }

  if(!window.VentAudio){ resetBtn(); return; }

  // Safety: if speak never calls back, reset after 20s
  var fallback = setTimeout(resetBtn, 20000);

  try {
    VentAudio.speak('Hello! How does this voice sound?', null, function(){
      clearTimeout(fallback);
      resetBtn();
    });
  } catch(e){
    console.warn('[testVoice] error:', e);
    clearTimeout(fallback);
    resetBtn();
  }
}

// Export getter for VentAudio
export { getVoiceSettings as getVentVoiceConfig };

function buildPalette(){
  if(!paletteGrid) return;
  paletteGrid.innerHTML = '';
  PALETTES.forEach(function(p){
    var sw = document.createElement('div');
    sw.className = 'profile-swatch';
    sw.style.background = p.color;
    sw.title = p.name;
    sw.dataset.hue = p.hue;
    sw.addEventListener('click', function(){
      applyHue(p.hue);
      hueSlider.value = p.hue;
      hueVal.textContent = p.hue;
      setActiveSwatch(sw);
    });
    paletteGrid.appendChild(sw);
  });
}

function setActiveSwatch(el){
  paletteGrid.querySelectorAll('.profile-swatch').forEach(function(s){ s.classList.remove('active'); });
  if(el) el.classList.add('active');
}
function clearActiveSwatch(){
  if(!paletteGrid) return;
  paletteGrid.querySelectorAll('.profile-swatch').forEach(function(s){ s.classList.remove('active'); });
}

// ── Presets ──
function getCustomPresets(){
  try { return JSON.parse(localStorage.getItem('vent_presets') || '[]'); } catch(e){ return []; }
}
function saveCustomPresets(list){
  localStorage.setItem('vent_presets', JSON.stringify(list));
}

function renderPresets(){
  if(!presetGrid) return;
  presetGrid.innerHTML = '';
  var all = BUILTIN_PRESETS.concat(getCustomPresets());
  all.forEach(function(p, i){
    var btn = document.createElement('button');
    btn.className = 'profile-preset-btn';
    btn.textContent = p.name;
    btn.addEventListener('click', function(){
      applyPreset(p);
      presetGrid.querySelectorAll('.profile-preset-btn').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
    });
    // Custom presets get a delete button
    if(i >= BUILTIN_PRESETS.length){
      var del = document.createElement('span');
      del.className = 'preset-delete';
      del.textContent = '\u00d7';
      del.addEventListener('click', function(e){
        e.stopPropagation();
        var customs = getCustomPresets();
        customs.splice(i - BUILTIN_PRESETS.length, 1);
        saveCustomPresets(customs);
        renderPresets();
      });
      btn.appendChild(del);
    }
    presetGrid.appendChild(btn);
  });
}

function applyPreset(p){
  applyHue(p.hue);
  if(hueSlider){ hueSlider.value = p.hue; hueVal.textContent = p.hue; }
  if(wedgeSizeSlider){ wedgeSizeSlider.value = p.wedgeSize; wedgeSizeVal.textContent = p.wedgeSize; }
  if(radiusSlider){ radiusSlider.value = p.radius; radiusVal.textContent = p.radius; }
  if(cornerSlider){ cornerSlider.value = p.borderRadius; cornerVal.textContent = p.borderRadius; }
  if(glowSlider){ glowSlider.value = p.glowIntensity; glowVal.textContent = p.glowIntensity + '%'; }
  applyMenuDesign();
  clearActiveSwatch();
  if(paletteGrid){
    paletteGrid.querySelectorAll('.profile-swatch').forEach(function(s){
      if(parseInt(s.dataset.hue) === p.hue) setActiveSwatch(s);
    });
  }
}

export function saveCurrentPreset(){
  var input = document.getElementById('presetNameInput');
  var name = (input.value || '').trim();
  if(!name) return;
  var preset = {
    name: name,
    hue: currentHue,
    radius: parseInt(radiusSlider.value),
    wedgeSize: parseInt(wedgeSizeSlider.value),
    borderRadius: parseInt(cornerSlider.value),
    glowIntensity: parseInt(glowSlider.value)
  };
  var customs = getCustomPresets().filter(function(p){ return p.name !== name; });
  customs.push(preset);
  saveCustomPresets(customs);
  input.value = '';
  renderPresets();
}

function loadSavedSettings(){
  var savedHue = localStorage.getItem('vent_theme_hue');
  if(savedHue !== null){
    var h = parseInt(savedHue);
    currentHue = h;
    if(hueSlider){ hueSlider.value = h; hueVal.textContent = h; }
    if(paletteGrid){
      paletteGrid.querySelectorAll('.profile-swatch').forEach(function(s){
        if(parseInt(s.dataset.hue) === h) setActiveSwatch(s);
      });
    }
  }
  var savedConfig = localStorage.getItem('vent_menu_config');
  if(savedConfig){
    try {
      var cfg = JSON.parse(savedConfig);
      if(wedgeSizeSlider){ wedgeSizeSlider.value = cfg.wedgeSize || 80; wedgeSizeVal.textContent = cfg.wedgeSize || 80; }
      if(radiusSlider){ radiusSlider.value = cfg.radius || 120; radiusVal.textContent = cfg.radius || 120; }
      if(cornerSlider){ cornerSlider.value = cfg.borderRadius || 14; cornerVal.textContent = cfg.borderRadius || 14; }
      var glow = cfg.glowIntensity !== undefined ? Math.round(cfg.glowIntensity * 100) : 100;
      if(glowSlider){ glowSlider.value = glow; glowVal.textContent = glow + '%'; }
      // provided by radial-menu.js
      if(window.applyMenuConfig) window.applyMenuConfig(cfg);
    } catch(e){}
  }
  // Load voice settings
  loadVoiceSettings();
}

function toggleProfilePanel(){
  if(!panelEl) init();
  if(!panelEl) return;
  panelEl.classList.toggle('show');
}
window.toggleProfilePanel = toggleProfilePanel;

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
