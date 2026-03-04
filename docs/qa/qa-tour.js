// ─── QA CONTROL CENTRE DEMO TOUR (Charlie voice narration) ──────────────────
(function(){
  var tourSteps = [
    // 1 — QA Control Centre overview
    { target:'.workbench', titleKey:'qtour.step1.title', descKey:'qtour.step1.desc', voiceKey:'qtour.step1.voice', pos:'bottom' },
    // 2 — Submissions List
    { target:'.left-panel', titleKey:'qtour.step2.title', descKey:'qtour.step2.desc', voiceKey:'qtour.step2.voice', pos:'right',
      sub:[
        { target:'.filter-bar', titleKey:'qtour.step2.sub1.title', descKey:'qtour.step2.sub1.desc', voiceKey:'qtour.step2.sub1.voice', pos:'right' },
        { target:'#subList', titleKey:'qtour.step2.sub2.title', descKey:'qtour.step2.sub2.desc', voiceKey:'qtour.step2.sub2.voice', pos:'right' },
        { target:'.sub-card', titleKey:'qtour.step2.sub3.title', descKey:'qtour.step2.sub3.desc', voiceKey:'qtour.step2.sub3.voice', pos:'right', skipIfMissing:true }
      ]},
    // 3 — Submission Detail
    { target:'.center-panel', titleKey:'qtour.step3.title', descKey:'qtour.step3.desc', voiceKey:'qtour.step3.voice', pos:'left',
      setup: function(){ autoSelectFirst(); },
      sub:[
        { target:'.status-badge', titleKey:'qtour.step3.sub1.title', descKey:'qtour.step3.sub1.desc', voiceKey:'qtour.step3.sub1.voice', pos:'bottom', skipIfMissing:true },
        { target:'.obs-text', titleKey:'qtour.step3.sub2.title', descKey:'qtour.step3.sub2.desc', voiceKey:'qtour.step3.sub2.voice', pos:'left', skipIfMissing:true },
        { target:'.sop-table', titleKey:'qtour.step3.sub3.title', descKey:'qtour.step3.sub3.desc', voiceKey:'qtour.step3.sub3.voice', pos:'left', skipIfMissing:true }
      ]},
    // 4 — Suggested Changes
    { target:'.changes-list', titleKey:'qtour.step4.title', descKey:'qtour.step4.desc', voiceKey:'qtour.step4.voice', pos:'left', skipIfMissing:true },
    // 5 — SOP Viewer
    { target:'#rightPanel', titleKey:'qtour.step5.title', descKey:'qtour.step5.desc', voiceKey:'qtour.step5.voice', pos:'left',
      setup: function(){ autoOpenSop(); },
      sub:[
        { target:'#rightContent', titleKey:'qtour.step5.sub1.title', descKey:'qtour.step5.sub1.desc', voiceKey:'qtour.step5.sub1.voice', pos:'left', skipIfMissing:true },
        { target:'.right-toolbar', titleKey:'qtour.step5.sub2.title', descKey:'qtour.step5.sub2.desc', voiceKey:'qtour.step5.sub2.voice', pos:'left', skipIfMissing:true }
      ]},
    // 6 — Audit Trail & E-Signature
    { target:'.audit-section', titleKey:'qtour.step6.title', descKey:'qtour.step6.desc', voiceKey:'qtour.step6.voice', pos:'top', skipIfMissing:true,
      setup: function(){ autoExpandAudit(); }},
    // 7 — Outro
    { target:'.title-bar', titleKey:'qtour.step7.title', descKey:'qtour.step7.desc', voiceKey:'qtour.step7.voice', pos:'bottom' }
  ];

  // ── Helpers: auto-select submission & open SOP so tour has content ──
  function autoSelectFirst(){
    if(typeof selected !== 'undefined' && selected) return;
    var card = document.querySelector('.sub-card');
    if(card) card.click();
  }
  function autoOpenSop(){
    if(typeof selected !== 'undefined' && selected && selected.sops && selected.sops.length){
      if(typeof openSop === 'function') openSop(0);
    }
  }
  function autoExpandAudit(){
    var btn = document.querySelector('.audit-toggle');
    var content = document.getElementById('auditTrailContent');
    if(btn && content && content.style.display === 'none'){
      btn.click();
    }
  }

  var tourIdx = 0, subIdx = -1;
  var overlay, highlight, card, demoBanner;
  var openPanelClose = null;
  var voiceMuted = false;
  var isVoiceTour = true;

  function buildOverlay(){
    overlay = document.createElement('div');
    overlay.className = 'tour-overlay';
    document.body.appendChild(overlay);
    highlight = document.createElement('div');
    highlight.className = 'tour-highlight';
    document.body.appendChild(highlight);
    card = document.createElement('div');
    card.className = 'tour-card';
    document.body.appendChild(card);
  }

  function showDemoBanner(){
    if(demoBanner) return;
    demoBanner = document.createElement('div');
    demoBanner.className = 'tour-demo-banner';
    demoBanner.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none"/></svg>' +
      '<span class="tour-demo-text">' + t('tour.demoBanner') + '</span>' +
      '<button class="tour-demo-exit" onclick="endTour()">' + t('tour.exitDemo') + '</button>';
    document.body.appendChild(demoBanner);
  }

  function removeDemoBanner(){
    if(demoBanner){ demoBanner.remove(); demoBanner = null; }
  }

  function clipOverlay(rect){
    var p = 6;
    var x1 = rect.left - p, y1 = rect.top - p;
    var x2 = rect.right + p, y2 = rect.bottom + p;
    var W = window.innerWidth, H = window.innerHeight;
    overlay.style.clipPath =
      'polygon(0 0, '+W+'px 0, '+W+'px '+H+'px, 0 '+H+'px, 0 0, ' +
      x1+'px '+y1+'px, '+x1+'px '+y2+'px, '+x2+'px '+y2+'px, '+x2+'px '+y1+'px, '+x1+'px '+y1+'px)';
  }

  function positionCard(rect, pos){
    var cw = 330, gap = 14;
    var top, left, arrowClass;
    if(pos === 'bottom'){
      top = rect.bottom + gap;
      left = rect.left + rect.width/2 - cw/2;
      arrowClass = 'arrow-top';
    } else if(pos === 'top'){
      top = rect.top - gap;
      left = rect.left + rect.width/2 - cw/2;
      arrowClass = 'arrow-bottom';
    } else if(pos === 'right'){
      top = rect.top + rect.height/2 - 60;
      left = rect.right + gap;
      arrowClass = 'arrow-left';
    } else {
      top = rect.top + rect.height/2 - 60;
      left = rect.left - cw - gap;
      arrowClass = 'arrow-right';
    }
    if(left < 10) left = 10;
    if(left + cw > window.innerWidth - 10) left = window.innerWidth - cw - 10;
    if(pos === 'top'){
      card.style.left = left + 'px';
      card.style.top = '0px';
      card.style.visibility = 'hidden';
      card.style.display = 'block';
      var ch = card.offsetHeight;
      top = rect.top - gap - ch;
      if(top < 10){ top = rect.bottom + gap; arrowClass = 'arrow-top'; }
      card.style.visibility = '';
    }
    if(pos === 'bottom'){
      var spaceBelow = window.innerHeight - rect.bottom - gap;
      if(spaceBelow < 160){ top = rect.top - gap - 160; arrowClass = 'arrow-bottom'; }
    }
    if(top < 10) top = 10;
    card.style.top = top + 'px';
    card.style.left = left + 'px';
    var arrows = card.querySelectorAll('.tour-card-arrow');
    arrows.forEach(function(a){ a.className = 'tour-card-arrow ' + arrowClass; });
  }

  function closeOpenPanel(){
    if(openPanelClose){ try{ window[openPanelClose](); }catch(e){} openPanelClose = null; }
  }

  // ── Voice narration ──
  function stopCurrentAudio(){ if(window.VentAudio) VentAudio.stop(); }

  function speakStep(text){
    if(voiceMuted || !isVoiceTour || !text || !window.VentAudio) return;
    VentAudio.speak(text, function(freqData){
      var bars = card ? card.querySelectorAll('.tour-voice-bar') : [];
      bars.forEach(function(bar, i){
        var idx = Math.floor((i / bars.length) * freqData.length * 0.7);
        bar.style.height = Math.max(3, (freqData[idx] / 255) * 20) + 'px';
      });
    }, function(){
      resetVoiceBarsIdle();
    });
  }

  function resetVoiceBarsIdle(){
    var bars = card ? card.querySelectorAll('.tour-voice-bar') : [];
    bars.forEach(function(bar, i){
      bar.style.height = (3 + Math.sin(i * 0.5) * 2) + 'px';
    });
  }

  function toggleMute(){
    voiceMuted = !voiceMuted;
    var btn = card ? card.querySelector('.tour-voice-mute') : null;
    if(btn){
      btn.classList.toggle('muted', voiceMuted);
      btn.innerHTML = voiceMuted
        ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg> Muted'
        : '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg> Charlie';
    }
    if(voiceMuted) stopCurrentAudio();
  }

  // ── Ask Charlie: voice Q&A during tour ──
  var tourConvoHistory = [];
  var lastAskStepIdx = -1;
  var lastAskSubIdx = -1;

  function askCharlieToggle(){
    if(window.VentAudio && VentAudio.isRecording()){
      VentAudio.stopRecording();
    } else {
      startTourAsk();
    }
  }

  function startTourAsk(){
    stopCurrentAudio();
    var btn = card ? card.querySelector('.tour-ask-btn') : null;
    if(btn){
      btn.classList.add('recording');
      btn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12" rx="1"/></svg> ' + t('tour.askStop');
    }
    VentAudio.recordSTT(function(text){
      setAskBtnThinking();
      sendTourQuestion(text);
    }, function(err){
      if(err === 'mic'){
        var ans = card ? card.querySelector('#tourAskAnswer') : null;
        if(ans){ ans.style.display = 'block'; ans.textContent = t('tour.askMicError'); }
      }
      resetAskBtn();
    });
  }

  function setAskBtnThinking(){
    var btn = card ? card.querySelector('.tour-ask-btn') : null;
    if(btn){
      btn.classList.remove('recording');
      btn.classList.add('thinking');
      btn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> ' + t('tour.thinking');
    }
  }

  function sendTourQuestion(question){
    var mainStep = tourSteps[tourIdx];
    var step = subIdx >= 0 ? mainStep.sub[subIdx] : mainStep;
    var context = t(step.titleKey) + ': ' + t(step.descKey);
    var lang = (window.VentI18n && VentI18n.getLang()) || 'en';

    fetch(SERVER + '/charlie/ask', {
      method: 'POST',
      headers: Object.assign({'Content-Type':'application/json'}, getAuthHeaders()),
      body: JSON.stringify({ question: question, context: context, lang: lang, history: tourConvoHistory })
    })
    .then(function(r){ return r.json(); })
    .then(function(data){
      var answer = data.answer || '';
      if(answer){
        tourConvoHistory.push({ q: question, a: answer });
        var ans = card ? card.querySelector('#tourAskAnswer') : null;
        if(ans){
          ans.style.display = 'block';
          ans.innerHTML = '<div class="tour-ask-q">\u201c' + question + '\u201d</div>' + answer;
        }
        speakStep(answer);
      } else {
        var ans = card ? card.querySelector('#tourAskAnswer') : null;
        if(ans){ ans.style.display = 'block'; ans.textContent = t('tour.askError'); }
      }
      resetAskBtn();
    })
    .catch(function(){
      resetAskBtn();
      var ans = card ? card.querySelector('#tourAskAnswer') : null;
      if(ans){ ans.style.display = 'block'; ans.textContent = t('tour.askError'); }
    });
  }

  function resetAskBtn(){
    var btn = card ? card.querySelector('.tour-ask-btn') : null;
    if(btn){
      btn.classList.remove('recording', 'thinking');
      btn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg> ' + t('tour.askCharlie');
    }
  }

  // ── Step rendering ──
  function renderStep(){
    stopCurrentAudio();
    if(window.VentAudio) VentAudio.killRecording();
    if(tourIdx !== lastAskStepIdx || subIdx !== lastAskSubIdx){
      tourConvoHistory = [];
      lastAskStepIdx = tourIdx;
      lastAskSubIdx = subIdx;
    }
    var mainStep = tourSteps[tourIdx];
    var step, isSubStep = subIdx >= 0;
    if(isSubStep){
      step = mainStep.sub[subIdx];
      if(step.setup) try{ step.setup(); }catch(e){}
    } else {
      step = mainStep;
      if(step.setup) try{ step.setup(); }catch(e){}
    }

    var el = document.querySelector(step.target);
    if(!el){
      if(step.skipIfMissing){
        if(isSubStep){ subIdx++; if(subIdx >= mainStep.sub.length){ leaveSubTour(); nextMain(); } else renderStep(); }
        else { tourIdx++; if(tourIdx >= tourSteps.length) endTourInner(); else renderStep(); }
        return;
      }
      if(isSubStep){ subIdx++; if(subIdx >= mainStep.sub.length){ leaveSubTour(); nextMain(); } else renderStep(); }
      else { if(step.teardown) try{ step.teardown(); }catch(e){} tourIdx++; if(tourIdx >= tourSteps.length) endTourInner(); else renderStep(); }
      return;
    }
    var rect = el.getBoundingClientRect();

    var p = 6;
    highlight.style.top = (rect.top - p) + 'px';
    highlight.style.left = (rect.left - p) + 'px';
    highlight.style.width = (rect.width + p*2) + 'px';
    highlight.style.height = (rect.height + p*2) + 'px';
    clipOverlay(rect);

    var counter = t('tour.counter').replace('{current}', tourIdx+1).replace('{total}', tourSteps.length);
    if(isSubStep){
      counter += '<span class="tour-sub-counter"> \u00b7 ' + (subIdx+1) + '/' + mainStep.sub.length + '</span>';
    }

    var hasSub = !isSubStep && mainStep.sub && mainStep.sub.length > 0;
    var isLastMain = tourIdx === tourSteps.length - 1;
    var isLastSub = isSubStep && subIdx === mainStep.sub.length - 1;
    var canGoBack = tourIdx > 0 || subIdx > 0;

    var btns = '';
    if(canGoBack) btns += '<button class="tour-back" onclick="prevTourStep()">' + t('tour.back') + '</button>';
    if(hasSub) btns += '<button class="tour-explore" onclick="exploreTourStep()">' + t('tour.explore') + '</button>';
    var nextLabel = (isLastMain && !isSubStep && !hasSub) || (isLastMain && isLastSub) ? t('tour.done') : t('tour.next');
    btns += '<button class="tour-next" onclick="nextTourStep()">' + nextLabel + '</button>';

    var voiceBarCount = 16;
    var barsHtml = '';
    for(var b=0; b<voiceBarCount; b++){
      barsHtml += '<div class="tour-voice-bar" style="height:'+(3+Math.sin(b*0.5)*2)+'px"></div>';
    }
    var muteIcon = voiceMuted
      ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg> Muted'
      : '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg> Charlie';
    var askBtn = isVoiceTour
      ? '<button class="tour-ask-btn" onclick="askCharlie()" title="' + t('tour.askHint') + '">' +
          '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg> ' +
          t('tour.askCharlie') +
        '</button>'
      : '';
    var voiceRow = isVoiceTour
      ? '<div class="tour-voice-row">' +
          '<div class="tour-voice-bars">' + barsHtml + '</div>' +
          '<div class="tour-voice-label"><span class="tour-voice-pip"></span> CHARLIE</div>' +
          '<button class="tour-voice-mute'+(voiceMuted?' muted':'')+'" onclick="toggleTourMute()">'+muteIcon+'</button>' +
          askBtn +
        '</div>'
      : '';

    card.innerHTML =
      '<div class="tour-card-step">' + counter + '</div>' +
      voiceRow +
      '<div class="tour-card-title">' + t(step.titleKey) + '</div>' +
      '<div class="tour-card-desc">' + t(step.descKey) + '</div>' +
      '<div class="tour-ask-answer" id="tourAskAnswer" style="display:none"></div>' +
      '<div class="tour-card-actions">' +
        '<button class="tour-skip" onclick="endTour()">' + t('tour.skip') + '</button>' +
        '<div class="tour-card-btns">' + btns + '</div>' +
      '</div>' +
      '<div class="tour-card-arrow"></div>';

    positionCard(rect, step.pos);

    if(isVoiceTour && step.voiceKey){
      setTimeout(function(){ speakStep(t(step.voiceKey)); }, 400);
    }
  }

  function leaveSubTour(){
    closeOpenPanel();
    subIdx = -1;
  }

  function nextMain(){
    var prev = tourSteps[tourIdx];
    if(prev && prev.teardown) try{ prev.teardown(); }catch(e){}
    tourIdx++;
    subIdx = -1;
    if(tourIdx >= tourSteps.length){ endTourInner(); return; }
    renderStep();
  }

  function nextStep(){
    var mainStep = tourSteps[tourIdx];
    if(subIdx >= 0){
      var prevSub = mainStep.sub[subIdx];
      if(prevSub && prevSub.teardown) try{ prevSub.teardown(); }catch(e){}
      subIdx++;
      if(subIdx >= mainStep.sub.length){
        leaveSubTour();
        nextMain();
      } else {
        renderStep();
      }
    } else {
      closeOpenPanel();
      nextMain();
    }
  }

  function prevStep(){
    var mainStep = tourSteps[tourIdx];
    if(subIdx > 0){
      subIdx--;
      renderStep();
    } else if(subIdx === 0){
      leaveSubTour();
      renderStep();
    } else {
      if(tourIdx > 0){
        var prev = tourSteps[tourIdx];
        if(prev && prev.teardown) try{ prev.teardown(); }catch(e){}
        closeOpenPanel();
        tourIdx--;
        subIdx = -1;
        renderStep();
      }
    }
  }

  function exploreStep(){
    var mainStep = tourSteps[tourIdx];
    if(!mainStep.sub || !mainStep.sub.length) return;
    if(mainStep.open){ try{ window[mainStep.open](); }catch(e){} }
    openPanelClose = mainStep.close || null;
    subIdx = 0;
    setTimeout(renderStep, 250);
  }

  function endTourInner(){
    stopCurrentAudio();
    var ms = tourSteps[tourIdx];
    if(ms && ms.teardown) try{ ms.teardown(); }catch(e){}
    closeOpenPanel();
    removeDemoBanner();
    if(overlay){ overlay.remove(); overlay = null; }
    if(highlight){ highlight.remove(); highlight = null; }
    if(card){ card.remove(); card = null; }
    isVoiceTour = false;
  }

  function start(){
    tourIdx = 0;
    subIdx = -1;
    isVoiceTour = true;
    voiceMuted = false;
    if(overlay) endTourInner();
    buildOverlay();
    showDemoBanner();
    // Give the page a moment to load submissions
    setTimeout(renderStep, 300);
  }

  // Expose globally
  window.startQaTour = start;
  window.nextTourStep = nextStep;
  window.prevTourStep = prevStep;
  window.exploreTourStep = exploreStep;
  window.endTour = endTourInner;
  window.toggleTourMute = toggleMute;
  window.askCharlie = askCharlieToggle;

  // Re-render tour card when language changes mid-tour
  window.addEventListener('ventLangChanged', function(){
    if(overlay){
      stopCurrentAudio();
      renderStep();
      if(demoBanner){
        var sp = demoBanner.querySelector('.tour-demo-text');
        if(sp) sp.textContent = t('tour.demoBanner');
        var ex = demoBanner.querySelector('.tour-demo-exit');
        if(ex) ex.textContent = t('tour.exitDemo');
      }
    }
  });

  // Auto-start if chained from query.html demo tour
  var demoSignal = sessionStorage.getItem('vent_demo_tour');
  if(demoSignal === '1'){
    sessionStorage.removeItem('vent_demo_tour');
    // Wait for submissions to load, then start
    setTimeout(function(){ start(); }, 1500);
  }
})();
