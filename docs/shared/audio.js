// ═══════════════════════════════════════════════════════════════════════════════
// VENT AUDIO — Shared TTS/STT infrastructure (used by query, feedback)
// ═══════════════════════════════════════════════════════════════════════════════
window.VentAudio = (function(){
  var CHARLIE_VOICE_ID = 'IKne3meq5aSn9XLyUdCD';
  var TTS_MODEL = 'eleven_multilingual_v2';
  var audioCtx = null;
  var analyser = null;
  var currentSource = null;
  var currentAudio = null; // fallback HTMLAudioElement
  var gainNode = null;
  var animFrame = null;
  var recorder = null;
  var recChunks = [];
  var recStream = null;
  var micAnalyser = null;
  var micSource = null;
  var cancelled = false;

  // Call this SYNCHRONOUSLY from a click/tap handler to guarantee unlock
  function unlock(){
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if(audioCtx.state === 'suspended') audioCtx.resume();
    if(!gainNode){
      gainNode = audioCtx.createGain();
      gainNode.gain.value = 0.85;
      gainNode.connect(audioCtx.destination);
    }
    return audioCtx;
  }

  var stopGen = 0;                    // generation counter — incremented on stop()
  function stop(){
    stopGen++;
    if(animFrame){ cancelAnimationFrame(animFrame); animFrame = null; }
    if(currentSource){ try{ currentSource.stop(); }catch(e){} currentSource = null; }
    if(currentAudio){ currentAudio.pause(); currentAudio.src = ''; currentAudio = null; }
  }

  // Stripped-down speak: fetch TTS → blob URL → Audio.play()
  // No Web Audio, no BufferSource — get sound working first
  function speak(text, onBars, onEnd){
    if(!text){ if(onEnd) onEnd(); return; }

    // Check global mute
    var vc = (window.getVentVoiceConfig ? window.getVentVoiceConfig() : null) || {};
    if(vc.mute){ if(onEnd) onEnd(); return; }

    stop();
    var gen = stopGen;                 // capture current generation
    var done = false;
    function finish(){
      if(done) return; done = true;
      if(animFrame){ cancelAnimationFrame(animFrame); animFrame = null; }
      currentSource = null; currentAudio = null;
      if(onEnd) onEnd();
    }
    var safety = setTimeout(function(){ console.warn('[VentAudio] safety timeout'); finish(); }, 25000);
    function finishClean(){ clearTimeout(safety); finish(); }

    // Step 1: fetch TTS audio from server (with user voice settings)
    var selectedVoice = (vc.voiceId) || CHARLIE_VOICE_ID;
    var ttsBody = {
      text: text,
      voiceId: selectedVoice,
      modelId: TTS_MODEL,
      stability:          vc.stability !== undefined ? vc.stability / 100 : undefined,
      similarity_boost:   vc.clarity   !== undefined ? vc.clarity  / 100 : undefined,
      style:              vc.style     !== undefined ? vc.style    / 100 : undefined,
      use_speaker_boost:  vc.boost !== undefined ? vc.boost : undefined
    };
    // Strip undefined keys
    Object.keys(ttsBody).forEach(function(k){ if(ttsBody[k] === undefined) delete ttsBody[k]; });

    fetch(SERVER + '/tts', {
      method: 'POST',
      headers: Object.assign({'Content-Type':'application/json'}, getAuthHeaders()),
      body: JSON.stringify(ttsBody)
    })
    .then(function(r){
      if(!r.ok) throw new Error('TTS server returned ' + r.status);
      var ct = r.headers.get('content-type') || '';
      // If server returned JSON error instead of audio, bail
      if(ct.indexOf('json') !== -1) throw new Error('TTS returned JSON error');
      return r.blob();
    })
    .then(function(blob){
      if(gen !== stopGen){ finishClean(); return; }   // stop() was called — bail
      if(blob.size < 200) throw new Error('TTS audio too small (' + blob.size + 'b)');

      // Step 2: create blob URL and play with plain Audio element
      var url = URL.createObjectURL(blob);
      currentAudio = new Audio(url);
      currentAudio.volume = vc.volume !== undefined ? vc.volume / 100 : 1.0;
      currentAudio.playbackRate = vc.speed !== undefined ? vc.speed / 100 : 1.0;

      currentAudio.onended = function(){
        URL.revokeObjectURL(url);
        finishClean();
      };
      currentAudio.onerror = function(e){
        console.warn('[VentAudio] Audio element error:', e);
        URL.revokeObjectURL(url);
        finishClean();
      };

      // Step 3: try to hook up Web Audio analyser + EQ for bar visualization
      try {
        var ctx = unlock();
        if(ctx.state === 'running'){
          var source = ctx.createMediaElementSource(currentAudio);

          // Pitch shift via detune on a chain (semitones → cents)
          // Note: detune works on BufferSource, for MediaElement we use playbackRate trick
          // Apply pitch as a playbackRate offset: each semitone = 2^(1/12)
          var pitchSemis = vc.pitch || 0;
          if(pitchSemis !== 0){
            currentAudio.playbackRate = (vc.speed !== undefined ? vc.speed / 100 : 1.0) * Math.pow(2, pitchSemis / 12);
          }

          // Bass EQ (lowshelf at 200Hz)
          var bassFilter = null;
          if(vc.bass && vc.bass !== 0){
            bassFilter = ctx.createBiquadFilter();
            bassFilter.type = 'lowshelf';
            bassFilter.frequency.value = 200;
            bassFilter.gain.value = vc.bass;
          }

          // Treble EQ (highshelf at 3000Hz)
          var trebleFilter = null;
          if(vc.treble && vc.treble !== 0){
            trebleFilter = ctx.createBiquadFilter();
            trebleFilter.type = 'highshelf';
            trebleFilter.frequency.value = 3000;
            trebleFilter.gain.value = vc.treble;
          }

          analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.75;

          // Chain: source → [bass] → [treble] → analyser → destination
          var chain = source;
          if(bassFilter)  { chain.connect(bassFilter);   chain = bassFilter; }
          if(trebleFilter){ chain.connect(trebleFilter);  chain = trebleFilter; }
          chain.connect(analyser);
          analyser.connect(ctx.destination);
        }
      } catch(e){
        // Visualization won't work but audio will still play directly
        analyser = null;
      }

      // Step 4: play — this is inside a promise chain from a user-activated page
      var playPromise = currentAudio.play();
      if(playPromise && playPromise.then){
        playPromise.then(function(){
          // Audio is playing — start bar animation if we have an analyser
          if(onBars && analyser) tickBars(onBars);
        }).catch(function(err){
          console.warn('[VentAudio] play() rejected:', err.name, err.message);
          URL.revokeObjectURL(url);
          finishClean();
        });
      } else {
        // Old browser, play() returned void — assume it's playing
        if(onBars && analyser) tickBars(onBars);
      }
    })
    .catch(function(e){
      console.warn('[VentAudio] TTS failed:', e.message || e);
      speak._lastError = e.message || String(e);
      finishClean();
    });
  }

  function tickBars(cb){
    if(!analyser) return;
    var freqData = new Uint8Array(analyser.frequencyBinCount);
    (function tick(){
      analyser.getByteFrequencyData(freqData);
      cb(freqData);
      animFrame = requestAnimationFrame(tick);
    })();
  }

  function getAnalyser(){ return analyser; }
  function getMicAnalyser(){ return micAnalyser; }

  function recordSTT(onResult, onError){
    killRecording();
    cancelled = false;
    navigator.mediaDevices.getUserMedia({ audio: true })
    .then(function(stream){
      recStream = stream;
      recChunks = [];
      // Wire up mic analyser for real-time voice visualization
      var ctx = unlock();
      micSource = ctx.createMediaStreamSource(stream);
      micAnalyser = ctx.createAnalyser();
      micAnalyser.fftSize = 128;
      micAnalyser.smoothingTimeConstant = 0.7;
      micSource.connect(micAnalyser);
      // Don't connect to destination — that would echo the mic

      recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : ''
      });
      recorder.ondataavailable = function(e){ if(e.data.size > 0) recChunks.push(e.data); };
      recorder.onstop = function(){
        // Clean up mic analyser
        if(micSource){ try{ micSource.disconnect(); }catch(e){} micSource = null; }
        micAnalyser = null;
        // Clean up stream
        if(recStream){ recStream.getTracks().forEach(function(t){ t.stop(); }); recStream = null; }
        // If cancelled, don't process
        if(cancelled){ cancelled = false; return; }
        var blob = new Blob(recChunks, { type: 'audio/webm' });
        if(blob.size < 100){ if(onError) onError('empty'); return; }
        var reader = new FileReader();
        reader.onload = function(){
          var base64 = reader.result.split(',')[1];
          fetch(SERVER + '/stt', {
            method: 'POST',
            headers: Object.assign({'Content-Type':'application/json'}, getAuthHeaders()),
            body: JSON.stringify({ audio: base64, mimeType: 'audio/webm', language_code: (window.VentI18n && VentI18n.getSttLangCode()) || 'eng' })
          })
          .then(function(r){ return r.json(); })
          .then(function(data){
            if(data.text && data.text.trim()) onResult(data.text.trim());
            else if(onError) onError('empty');
          })
          .catch(function(err){ console.warn('[VentAudio] STT error:', err); if(onError) onError(err); });
        };
        reader.readAsDataURL(blob);
      };
      recorder.start(250);
    })
    .catch(function(err){ console.warn('[VentAudio] Mic error:', err); if(onError) onError('mic'); });
  }

  // Stop recording and process the audio through STT
  function stopRecording(){
    if(recorder && recorder.state === 'recording'){
      try{ recorder.stop(); }catch(e){}
      // Let onstop handle stream + mic cleanup and STT processing
    }
  }

  // Kill recording without processing (for cancel/close)
  function killRecording(){
    cancelled = true;
    if(recorder && recorder.state === 'recording'){ try{ recorder.stop(); }catch(e){} }
    if(micSource){ try{ micSource.disconnect(); }catch(e){} micSource = null; }
    micAnalyser = null;
    if(recStream){ recStream.getTracks().forEach(function(t){ t.stop(); }); recStream = null; }
  }

  function isRecording(){ return recorder && recorder.state === 'recording'; }

  return {
    speak: speak, stop: stop, unlock: unlock,
    recordSTT: recordSTT, stopRecording: stopRecording,
    killRecording: killRecording, isRecording: isRecording,
    getAnalyser: getAnalyser, getMicAnalyser: getMicAnalyser,
    CHARLIE_VOICE_ID: CHARLIE_VOICE_ID, TTS_MODEL: TTS_MODEL
  };
})();
