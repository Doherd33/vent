// ═══════════════════════════════════════════════════════════════════════════════
// RADIAL PIE MENU + VENT HUB + SOUND DESIGN
// ═══════════════════════════════════════════════════════════════════════════════
(function(){
  var trigger, menu, backdrop, center, centerLabel, centerSub, wedges;
  var hub, hubOrb, hubGreeting;
  var isOpen = false;
  var hubActive = true;
  var NUM_WEDGES = 10;
  var RADIUS = 120;
  var START_ANGLE = -90;
  var WEDGE_SIZE = 80;
  var WEDGE_BORDER_RADIUS = 14;
  var GLOW_INTENSITY = 1.0;
  var STEP = 360 / NUM_WEDGES; // 45°
  var rotOffset = 0;            // current rotation offset in degrees
  var lastNotch = 0;            // last notch index for tick detection
  var spinDrag = null;          // null | { startAngle, startOffset }
  var didSpin = false;           // true after a drag-rotate, prevents backdrop close

  // ── Sound engine — pure Web Audio, no files ──
  var sndCtx = null;
  function ensureSnd(){
    if(!sndCtx){
      sndCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if(sndCtx.state === 'suspended') sndCtx.resume();
    return sndCtx;
  }

  function playTone(freq, duration, type, vol, ramp){
    try {
      var ctx = ensureSnd();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if(ramp) osc.frequency.linearRampToValueAtTime(ramp, ctx.currentTime + duration);
      gain.gain.setValueAtTime(vol || 0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch(e){}
  }

  // Orb tap — soft sonar ping
  function sndPing(){
    playTone(440, 0.25, 'sine', 0.07);
    playTone(660, 0.2, 'sine', 0.04);
  }

  // Wedges fan out — rising hum
  function sndFanOut(){
    playTone(120, 0.3, 'triangle', 0.06, 220);
    setTimeout(function(){ playTone(180, 0.15, 'sine', 0.03, 320); }, 80);
  }

  // Wedge select — crisp ascending confirm
  function sndSelect(){
    playTone(520, 0.1, 'sine', 0.07);
    setTimeout(function(){ playTone(780, 0.12, 'sine', 0.06); }, 70);
  }

  // Close — soft descending tone
  function sndClose(){
    playTone(360, 0.18, 'sine', 0.05, 200);
  }

  // Rotary tick — crisp mechanical detent click
  function sndTick(){
    playTone(1800, 0.035, 'square', 0.04);
    playTone(3200, 0.02, 'sine', 0.02);
  }

  // ── Haptics ──
  function haptic(ms){
    if(navigator.vibrate) navigator.vibrate(ms || 12);
  }

  // ── Wedge labels for center preview ──
  var wedgeLabels = {
    'charlie': 'CHARLIE',
    'newchat': 'NEW CHAT',
    'history': 'HISTORY',
    'sops':    'SOPs',
    'todos':   'TO-DO',
    'concern': 'CONCERN',
    'gdp':      'GDP CHECK',
    'tour':     'TOUR',
    'builder':  'BUILDER',
    'feedback': 'FEEDBACK'
  };

  var actionMap = {
    'charlie':  function(){ toggleCharlie(); },
    'newchat':  function(){ startNewChat(); },
    'history':  function(){ toggleHistorySidebar(); },
    'sops':     function(){ toggleSopSidebar(); },
    'todos':    function(){ toggleTodoSidebar(); },
    'concern':  function(){ toggleVentPanel(); },
    'gdp':      function(){ openGdpModal(); },
    'tour':     function(){ startVoiceTour(); },
    'builder':  function(){ window.location.href = 'builder.html'; },
    'feedback': function(){ window.location.href = 'feedback.html'; }
  };

  function init(){
    trigger     = document.getElementById('radialTrigger');
    menu        = document.getElementById('radialMenu');
    backdrop    = document.getElementById('radialBackdrop');
    center      = document.getElementById('radialCenter');
    centerLabel = center ? center.querySelector('.radial-center-label') : null;
    centerSub   = center ? center.querySelector('.radial-center-sub') : null;
    hub         = document.getElementById('ventHub');
    hubOrb      = document.getElementById('hubOrb');
    hubGreeting = document.getElementById('hubGreeting');
    if(!menu) return;
    wedges = menu.querySelectorAll('.radial-wedge');

    // Collapse all wedges initially
    wedges.forEach(function(w){
      w.style.transform = 'translate(-' + (WEDGE_SIZE/2) + 'px, -' + (WEDGE_SIZE/2) + 'px) scale(0)';
      w.style.width = WEDGE_SIZE + 'px';
      w.style.height = WEDGE_SIZE + 'px';
    });

    center.addEventListener('click', function(e){ e.stopPropagation(); closeMenu(); });
    backdrop.addEventListener('click', function(){
      if(didSpin){ didSpin = false; return; } // was spinning, don't close
      closeMenu();
    });

    // Wedge click + hover preview
    wedges.forEach(function(wedge){
      var inner = wedge.querySelector('.radial-wedge-inner');
      var action = wedge.dataset.action;

      inner.addEventListener('click', function(e){
        e.stopPropagation();
        sndSelect();
        haptic(15);
        closeMenu();
        if(hubActive) dismissHub();
        setTimeout(function(){ if(actionMap[action]) actionMap[action](); }, hubActive ? 400 : 180);
      });

      // Center label preview on hover/touch
      inner.addEventListener('mouseenter', function(){
        if(centerLabel) centerLabel.textContent = wedgeLabels[action] || 'VENT';
        if(centerSub) centerSub.textContent = 'SELECT';
      });
      inner.addEventListener('mouseleave', function(){
        if(centerLabel) centerLabel.textContent = 'VENT';
        if(centerSub) centerSub.textContent = 'CLOSE';
      });
      // Touch: show preview on touchstart
      inner.addEventListener('touchstart', function(){
        if(centerLabel) centerLabel.textContent = wedgeLabels[action] || 'VENT';
        if(centerSub) centerSub.textContent = 'SELECT';
      }, {passive: true});
    });

    // Hub orb tap
    if(hubOrb){
      hubOrb.addEventListener('click', function(e){
        e.stopPropagation();
        if(!isOpen){ sndPing(); haptic(20); openMenu(); }
        else closeMenu();
      });
    }

    // Show greeting
    if(hubGreeting){
      var name = localStorage.getItem('vent_name') || '';
      if(name) hubGreeting.textContent = 'Welcome, ' + name;
    }

    // Move radial menu + backdrop inside the hub
    if(hub && hubActive){
      hub.appendChild(backdrop);
      hub.appendChild(menu);
      document.body.classList.add('hub-mode');
    }

    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && isOpen) closeMenu();
    });

    // ── Rotary spin: mouse wheel ──
    menu.addEventListener('wheel', function(e){
      if(!isOpen) return;
      e.preventDefault();
      var delta = e.deltaY > 0 ? 8 : -8; // 8° per scroll tick
      rotOffset += delta;
      repositionWedges(false);
      checkNotch();
    }, {passive: false});

    // ── Rotary spin: drag-to-rotate (middle click or left-click on backdrop area) ──
    menu.addEventListener('mousedown', function(e){
      if(!isOpen) return;
      // Middle button (1) or left button (0) on the menu background (not wedge/center)
      if(e.target !== menu && !e.target.classList.contains('radial-ring')
         && !e.target.classList.contains('radial-ring-1')
         && !e.target.classList.contains('radial-ring-2')) return;
      e.preventDefault();
      spinDrag = { startAngle: angleFromCenter(e.clientX, e.clientY), startOffset: rotOffset };
    });
    backdrop.addEventListener('mousedown', function(e){
      if(!isOpen) return;
      e.preventDefault();
      didSpin = false;
      spinDrag = { startAngle: angleFromCenter(e.clientX, e.clientY), startOffset: rotOffset };
    });

    document.addEventListener('mousemove', function(e){
      if(!spinDrag) return;
      var curr = angleFromCenter(e.clientX, e.clientY);
      var delta = curr - spinDrag.startAngle;
      if(delta > 180) delta -= 360;
      if(delta < -180) delta += 360;
      if(Math.abs(delta) > 3) didSpin = true; // meaningful rotation
      rotOffset = spinDrag.startOffset + delta;
      repositionWedges(false);
      checkNotch();
    });

    document.addEventListener('mouseup', function(e){
      if(!spinDrag) return;
      spinDrag = null;
      snapToNotch();
    });

    // ── Rotary spin: touch drag-to-rotate on backdrop/menu ──
    menu.addEventListener('touchstart', function(e){
      if(!isOpen) return;
      if(e.target !== menu && !e.target.classList.contains('radial-ring')
         && !e.target.classList.contains('radial-ring-1')
         && !e.target.classList.contains('radial-ring-2')) return;
      if(e.touches.length !== 1) return;
      var t = e.touches[0];
      spinDrag = { startAngle: angleFromCenter(t.clientX, t.clientY), startOffset: rotOffset };
    }, {passive: true});

    backdrop.addEventListener('touchstart', function(e){
      if(!isOpen) return;
      if(e.touches.length !== 1) return;
      var t = e.touches[0];
      e.stopPropagation();
      spinDrag = { startAngle: angleFromCenter(t.clientX, t.clientY), startOffset: rotOffset };
    }, {passive: true});

    document.addEventListener('touchmove', function(e){
      if(!spinDrag) return;
      var t = e.touches[0];
      var curr = angleFromCenter(t.clientX, t.clientY);
      var delta = curr - spinDrag.startAngle;
      if(delta > 180) delta -= 360;
      if(delta < -180) delta += 360;
      if(Math.abs(delta) > 3) didSpin = true;
      rotOffset = spinDrag.startOffset + delta;
      repositionWedges(false);
      checkNotch();
    }, {passive: true});

    document.addEventListener('touchend', function(e){
      if(!spinDrag) return;
      spinDrag = null;
      snapToNotch();
    });

    // ── Draggable FAB ──
    initDrag();

    // Restore saved FAB position
    restorePosition();
  }

  // ── Position the radial menu centered on a point ──
  function positionMenuAt(cx, cy){
    menu.style.top = cy + 'px';
    menu.style.left = cx + 'px';
    menu.style.transform = 'translate(-50%, -50%)';
  }

  // Get FAB center coordinates
  function getFabCenter(){
    if(!trigger) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    var r = trigger.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  // ── Reposition wedges at current rotOffset (no transition) ──
  function repositionWedges(animate){
    if(!wedges) return;
    wedges.forEach(function(w, i){
      var deg = START_ANGLE + i * STEP + rotOffset;
      var rad = deg * Math.PI / 180;
      var x = Math.cos(rad) * RADIUS - WEDGE_SIZE / 2;
      var y = Math.sin(rad) * RADIUS - WEDGE_SIZE / 2;
      if(animate){
        w.style.transition = 'transform .18s cubic-bezier(.34,1.2,.64,1)';
      } else {
        w.style.transition = 'transform 0s';
      }
      w.style.transform = 'translate(' + x + 'px, ' + y + 'px) scale(1)';
    });
  }

  // ── Check if we crossed a notch boundary → play tick ──
  function checkNotch(){
    // Normalize offset to 0-360
    var norm = ((rotOffset % 360) + 360) % 360;
    var notch = Math.round(norm / STEP);
    if(notch !== lastNotch){
      lastNotch = notch;
      sndTick();
      haptic(8);
    }
  }

  // ── Snap to nearest 45° notch with animation ──
  function snapToNotch(){
    var nearest = Math.round(rotOffset / STEP) * STEP;
    rotOffset = nearest;
    repositionWedges(true);
    sndTick();
    haptic(10);
  }

  // ── Get angle (degrees) from menu center to a point ──
  function angleFromCenter(clientX, clientY){
    var r = menu.getBoundingClientRect();
    var cx = r.left + r.width / 2;
    var cy = r.top + r.height / 2;
    return Math.atan2(clientY - cy, clientX - cx) * 180 / Math.PI;
  }

  function openMenu(){
    isOpen = true;
    if(trigger) trigger.classList.add('open');
    if(hubOrb) hubOrb.style.opacity = '0';
    if(hubGreeting) hubGreeting.parentElement.style.opacity = '0';
    if(centerLabel) centerLabel.textContent = 'VENT';
    if(centerSub) centerSub.textContent = 'CLOSE';

    // Position menu: hub = viewport center, FAB = centered on FAB
    if(!hubActive){
      var c = getFabCenter();
      positionMenuAt(c.x, c.y);
    } else {
      menu.style.top = '50%';
      menu.style.left = '50%';
      menu.style.transform = 'translate(-50%, -50%)';
    }

    menu.classList.add('show');
    backdrop.classList.add('show');
    sndFanOut();
    lastNotch = Math.round(((rotOffset % 360 + 360) % 360) / STEP);
    wedges.forEach(function(w, i){
      var deg = START_ANGLE + i * STEP + rotOffset;
      var rad = deg * Math.PI / 180;
      var x = Math.cos(rad) * RADIUS - WEDGE_SIZE / 2;
      var y = Math.sin(rad) * RADIUS - WEDGE_SIZE / 2;
      w.style.transition = 'transform .28s cubic-bezier(.2,1.3,.5,1), opacity .15s';
      w.style.opacity = '1';
      w.style.transform = 'translate(' + x + 'px, ' + y + 'px) scale(1)';
    });
  }

  function closeMenu(){
    isOpen = false;
    sndClose();
    if(trigger) trigger.classList.remove('open');
    if(hubActive && hubOrb){ hubOrb.style.opacity = '1'; }
    if(hubActive && hubGreeting){ hubGreeting.parentElement.style.opacity = '1'; }
    backdrop.classList.remove('show');
    wedges.forEach(function(w){
      w.style.transition = 'transform .15s cubic-bezier(.6,0,.7,1), opacity .1s';
      w.style.opacity = '0';
      w.style.transform = 'translate(-' + (WEDGE_SIZE/2) + 'px, -' + (WEDGE_SIZE/2) + 'px) scale(0)';
    });
    setTimeout(function(){ menu.classList.remove('show'); }, 200);
  }

  // ── Apply menu config from settings panel ──
  function applyMenuConfig(config){
    if(config.radius !== undefined) RADIUS = config.radius;
    if(config.wedgeSize !== undefined) WEDGE_SIZE = config.wedgeSize;
    if(config.borderRadius !== undefined) WEDGE_BORDER_RADIUS = config.borderRadius;
    if(config.glowIntensity !== undefined) GLOW_INTENSITY = config.glowIntensity;
    if(wedges){
      wedges.forEach(function(w){
        w.style.width = WEDGE_SIZE + 'px';
        w.style.height = WEDGE_SIZE + 'px';
        var inner = w.querySelector('.radial-wedge-inner');
        if(inner){
          inner.style.width = WEDGE_SIZE + 'px';
          inner.style.height = WEDGE_SIZE + 'px';
          inner.style.borderRadius = WEDGE_BORDER_RADIUS + 'px';
        }
      });
    }
    document.documentElement.style.setProperty('--glow-mult', GLOW_INTENSITY);
    if(isOpen) repositionWedges(true);
  }
  window.applyMenuConfig = applyMenuConfig;

  function dismissHub(){
    hubActive = false;
    if(hub) hub.classList.add('dismissed');
    document.body.classList.remove('hub-mode');
    setTimeout(function(){
      document.body.appendChild(backdrop);
      document.body.appendChild(menu);
    }, 550);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // DRAGGABLE FAB — long-press to drag, tap to open menu
  // ═════════════════════════════════════════════════════════════════════════════
  var LONG_PRESS_MS = 300;
  var dragState = null; // null | 'pending' | 'dragging'
  var pressTimer = null;
  var startX, startY, offsetX, offsetY;
  var didDrag = false;

  function initDrag(){
    if(!trigger) return;

    // Mouse events
    trigger.addEventListener('mousedown', onDown);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);

    // Touch events
    trigger.addEventListener('touchstart', onTouchDown, {passive: false});
    document.addEventListener('touchmove', onTouchMove, {passive: false});
    document.addEventListener('touchend', onTouchUp);
  }

  function onDown(e){
    if(hubActive || isOpen) return;
    startPress(e.clientX, e.clientY);
  }
  function onTouchDown(e){
    if(hubActive || isOpen) return;
    if(e.touches.length !== 1) return;
    e.preventDefault();
    var t = e.touches[0];
    startPress(t.clientX, t.clientY);
  }

  function startPress(cx, cy){
    didDrag = false;
    startX = cx; startY = cy;
    var r = trigger.getBoundingClientRect();
    offsetX = cx - r.left - r.width / 2;
    offsetY = cy - r.top - r.height / 2;
    dragState = 'pending';
    pressTimer = setTimeout(function(){
      dragState = 'dragging';
      didDrag = true;
      trigger.classList.add('dragging');
      haptic(30);
      // Switch to top/left positioning for dragging
      var rect = trigger.getBoundingClientRect();
      trigger.style.bottom = 'auto';
      trigger.style.right = 'auto';
      trigger.style.top = rect.top + 'px';
      trigger.style.left = rect.left + 'px';
    }, LONG_PRESS_MS);
  }

  function onMove(e){
    if(dragState === 'pending'){
      // If moved too far before 300ms, cancel the pending press (it's a click, not a drag)
      var dx = e.clientX - startX, dy = e.clientY - startY;
      if(dx*dx + dy*dy > 25){ clearTimeout(pressTimer); dragState = null; }
      return;
    }
    if(dragState !== 'dragging') return;
    e.preventDefault();
    moveAt(e.clientX, e.clientY);
  }
  function onTouchMove(e){
    var t = e.touches[0];
    if(dragState === 'pending'){
      var dx = t.clientX - startX, dy = t.clientY - startY;
      if(dx*dx + dy*dy > 25){ clearTimeout(pressTimer); dragState = null; }
      return;
    }
    if(dragState !== 'dragging') return;
    e.preventDefault();
    moveAt(t.clientX, t.clientY);
  }

  function moveAt(cx, cy){
    if(dragState !== 'dragging') return;
    var size = trigger.offsetWidth;
    var x = cx - offsetX - size / 2;
    var y = cy - offsetY - size / 2;
    // Clamp to viewport
    x = Math.max(4, Math.min(window.innerWidth - size - 4, x));
    y = Math.max(4, Math.min(window.innerHeight - size - 4, y));
    trigger.style.left = x + 'px';
    trigger.style.top = y + 'px';
  }

  function onUp(e){ endPress(e.clientX, e.clientY); }
  function onTouchUp(e){
    var t = e.changedTouches ? e.changedTouches[0] : null;
    endPress(t ? t.clientX : startX, t ? t.clientY : startY);
  }

  function endPress(cx, cy){
    clearTimeout(pressTimer);
    if(dragState === 'dragging'){
      trigger.classList.remove('dragging');
      // Snap to nearest edge
      snapToEdge();
      dragState = null;
      return;
    }
    dragState = null;
    // It was a short tap — toggle menu (handled by onclick)
  }

  function snapToEdge(){
    var r = trigger.getBoundingClientRect();
    var cx = r.left + r.width / 2;
    var vw = window.innerWidth;
    var size = trigger.offsetWidth;
    var margin = 16;
    var targetLeft;

    // Snap to nearest horizontal edge
    if(cx < vw / 2){
      targetLeft = margin;
    } else {
      targetLeft = vw - size - margin;
    }

    // Keep vertical position, clamped
    var targetTop = Math.max(60, Math.min(window.innerHeight - size - 16, r.top));

    trigger.classList.add('settling');
    trigger.style.left = targetLeft + 'px';
    trigger.style.top = targetTop + 'px';

    // Save position
    savePosition(targetLeft, targetTop);

    setTimeout(function(){
      trigger.classList.remove('settling');
    }, 350);
  }

  function savePosition(left, top){
    try {
      localStorage.setItem('vent_fab_pos', JSON.stringify({l: left, t: top}));
    } catch(e){}
  }

  function restorePosition(){
    if(!trigger || hubActive) return;
    try {
      var saved = JSON.parse(localStorage.getItem('vent_fab_pos'));
      if(saved && typeof saved.l === 'number'){
        trigger.style.bottom = 'auto';
        trigger.style.right = 'auto';
        trigger.style.left = saved.l + 'px';
        trigger.style.top = saved.t + 'px';
      }
    } catch(e){}
  }

  // ═════════════════════════════════════════════════════════════════════════════

  window.toggleRadialMenu = function(){
    if(!trigger) init();
    if(hubActive) return;
    if(didDrag){ didDrag = false; return; } // just finished a drag, don't open
    sndPing(); haptic(20);
    if(isOpen) closeMenu(); else openMenu();
  };

  window.dismissVentHub = function(){
    dismissHub();
    // Restore saved FAB position after hub dismisses
    setTimeout(restorePosition, 600);
  };

  window.showVentHub = function(){
    if(!hub) return;
    if(typeof closeCharlie === 'function') closeCharlie();
    if(typeof closeVentPanel === 'function') closeVentPanel();
    if(typeof closeHistorySidebar === 'function') closeHistorySidebar();
    if(typeof closeSopSidebar === 'function') closeSopSidebar();
    if(typeof closeTodoSidebar === 'function') closeTodoSidebar();
    if(typeof closeSubsDrawer === 'function') closeSubsDrawer();
    if(typeof closeGdpModal === 'function') closeGdpModal();
    hubActive = true;
    hub.classList.remove('dismissed');
    document.body.classList.add('hub-mode');
    hub.appendChild(backdrop);
    hub.appendChild(menu);
    // Reset FAB to default position
    trigger.style.bottom = '';
    trigger.style.right = '';
    trigger.style.top = '';
    trigger.style.left = '';
    if(hubOrb) hubOrb.style.opacity = '1';
    if(hubGreeting) hubGreeting.parentElement.style.opacity = '1';
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
