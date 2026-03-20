// CHAT WITH CHARLIE — Text + Voice feedback
// ════════════════════════════════════════════════════════════════════════════════
var chatBusy = false;

function appendChatMsg(role, text) {
  var thread = document.getElementById('chatThread');
  var isUser = role === 'user';
  var div = document.createElement('div');
  div.className = 'chat-msg ' + (isUser ? 'from-user' : 'from-charlie');
  div.innerHTML =
    '<div class="chat-msg-av ' + (isUser ? 'user-av' : 'charlie-av') + '">' + (isUser ? 'You' : 'CH') + '</div>' +
    '<div class="chat-msg-text">' + escHtml(text) + '</div>';
  thread.appendChild(div);
  thread.scrollTop = thread.scrollHeight;
}

function showThinking() {
  var thread = document.getElementById('chatThread');
  var div = document.createElement('div');
  div.className = 'chat-msg from-charlie';
  div.id = 'thinkingMsg';
  div.innerHTML =
    '<div class="chat-msg-av charlie-av">CH</div>' +
    '<div class="chat-msg-thinking"><span class="dots"><span>.</span><span>.</span><span>.</span></span></div>';
  thread.appendChild(div);
  thread.scrollTop = thread.scrollHeight;
}

function hideThinking() {
  var el = document.getElementById('thinkingMsg');
  if (el) el.remove();
}

async function sendChatMessage() {
  if (chatBusy) return;
  var input = document.getElementById('chatInput');
  var text = input.value.trim();
  if (!text) return;

  input.value = '';
  chatBusy = true;
  setChatBusy(true);

  // Show in thread
  appendChatMsg('user', text);

  // Mark session active
  var cc = document.getElementById('chatCapture');
  cc.classList.add('has-session');

  showThinking();

  try {
    var lang = (window.VentI18n && VentI18n.getLang()) || 'en';
    var body = { question: text, lang: lang };
    if (feedbackSessionId) body.sessionId = feedbackSessionId;

    var res = await authFetch(SERVER + '/charlie/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    hideThinking();

    if (!res.ok) {
      var errBody = {};
      try { errBody = await res.json(); } catch(_) {}
      console.error('[Charlie/feedback] HTTP', res.status, errBody.error || '');
      var errMsg = res.status === 401
        ? 'Session expired — please sign out and back in.'
        : res.status === 500 && errBody.error
          ? 'Server error: ' + errBody.error
          : 'Sorry, something went wrong (HTTP ' + res.status + '). Please try again.';
      appendChatMsg('assistant', errMsg);
      chatBusy = false;
      setChatBusy(false);
      return;
    }

    var data = await res.json();

    if (data.error) {
      console.error('[Charlie/feedback] API error:', data.error);
      appendChatMsg('assistant', 'Sorry — ' + data.error + '. Please try again.');
      chatBusy = false;
      setChatBusy(false);
      return;
    }

    if (!feedbackSessionId && data.sessionId) {
      feedbackSessionId = data.sessionId;
    }

    appendChatMsg('assistant', data.answer);

    if (data.action === 'end_session') {
      endFeedbackSessionUI();
      chatBusy = false;
      setChatBusy(false);
      return;
    }

    // Strip markdown before TTS so asterisks/bullets aren't read aloud
    function stripTTSMarkdown(text){
      if(!text) return text;
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

    // Voice path: speak Charlie's response via TTS, then auto-listen
    if (voiceConvoMode) {
      setVoiceState('speaking');
      VentAudio.speak(stripTTSMarkdown(data.answer), function(freqData) {
        animateVCBars(freqData);
      }, function() {
        resetVCBars();
        setVoiceState('idle');
        chatBusy = false;
        setChatBusy(false);
        // Auto-listen for next message in continuous mode
        if (voiceConvoMode && feedbackSessionId) {
          startListening();
        }
      });
      return;
    }
  } catch (err) {
    hideThinking();
    console.error('Feedback error:', err);
    appendChatMsg('assistant', 'Connection error. Is the server running?');
    voiceConvoMode = false;
  }

  chatBusy = false;
  setChatBusy(false);
  input.focus();
}

function setChatBusy(busy) {
  document.getElementById('chatSendBtn').disabled = busy;
  document.getElementById('chatInput').disabled = busy;
}

// ── Voice input (mic button) ──
function toggleFeedbackVoice() {
  VentAudio.unlock();

  // If already in continuous mode, stop everything
  if (voiceConvoMode) {
    voiceConvoMode = false;
    VentAudio.stop();
    VentAudio.killRecording();
    setVoiceState('idle');
    chatBusy = false;
    setChatBusy(false);
    return;
  }

  // Start continuous voice conversation
  voiceConvoMode = true;
  document.getElementById('chatCapture').classList.add('has-session');
  startListening();
}

function setVoiceState(s) {
  voiceState = s;
  var btn = document.getElementById('voiceBtn');
  btn.classList.remove('recording', 'thinking', 'speaking');
  if (s === 'listening') btn.classList.add('recording');
  else if (s === 'thinking') btn.classList.add('thinking');
  else if (s === 'speaking') btn.classList.add('speaking');

  // Drive JARVIS voice command UI
  var cc = document.getElementById('chatCapture');
  cc.classList.remove('state-idle', 'state-listening', 'state-thinking', 'state-speaking');
  cc.classList.add('state-' + s);
  var statusLabels = { idle: 'READY', listening: 'LISTENING', thinking: 'PROCESSING', speaking: 'SPEAKING' };
  var vcStatus = document.getElementById('vcStatus');
  if (vcStatus) vcStatus.textContent = statusLabels[s] || 'READY';

  // Start/stop mic bar animation
  if (s === 'listening') startVCMicAnimation();
  else if (s === 'idle') resetVCBars();
}

function startListening() {
  VentAudio.stop();
  setVoiceState('listening');

  var cc = document.getElementById('chatCapture');
  cc.classList.add('has-session');

  var speechDetected = false;
  var silenceStart = 0;
  var SILENCE_THRESH = 12;
  var SILENCE_MS = 3000;
  var MAX_REC_MS = 120000;
  var recStart = Date.now();

  VentAudio.recordSTT(function(text) {
    voiceRetryCount = 0;

    // ── Instant voice language switching ──────────────────────────────────
    var LANG_CONFIRM = { en: 'Switched to English.', es: 'Cambiado a Español.', zh: '已切换到中文。' };
    function detectLangCommand(raw){
      var t = raw.toLowerCase().trim();
      if(/\b(english|inglés|ingles|英语|英文|说英语|切换英语)\b/.test(t)) return 'en';
      if(/\b(spanish|español|espanol|en español|habla español|西班牙语|说西班牙语)\b/.test(t)) return 'es';
      if(/\b(chinese|mandarin|中文|普通话|说中文|切换中文|en chino|chino)\b/.test(t)) return 'zh';
      return null;
    }
    var targetLang = detectLangCommand(text);
    if(targetLang && window.VentI18n){
      VentI18n.setLang(targetLang); // fires ventLangChanged → handled below
      var confirmMsg = LANG_CONFIRM[targetLang];
      setVoiceState('speaking');
      appendChatMsg('assistant', confirmMsg);
      VentAudio.speak(confirmMsg, null, function(){
        setVoiceState('idle');
        chatBusy = false;
        setChatBusy(false);
        if(voiceConvoMode) setTimeout(startListening, 400);
      });
      return;
    }
    // ─────────────────────────────────────────────────────────────────────

    setVoiceState('thinking');
    // Put transcribed text in input and auto-send
    document.getElementById('chatInput').value = text;
    sendChatMessage();
  }, function(err) {
    setVoiceState('idle');
    if (err === 'mic') {
      voiceConvoMode = false;
      voiceRetryCount = 0;
      appendChatMsg('assistant', 'Microphone access denied. Please allow mic permissions or type your feedback below.');
    } else if (err === 'stt_error') {
      voiceConvoMode = false;
      voiceRetryCount = 0;
      setChatBusy(false);
      chatBusy = false;
      appendChatMsg('assistant', 'Voice recognition is unavailable right now. Please type your feedback in the box below — I\'m still listening!');
    } else if (err === 'empty' || err === 'no_speech') {
      voiceRetryCount++;
      if (!speechDetected) {
        // User never spoke — don't show a message, just silently retry once
        if (voiceConvoMode && voiceRetryCount <= 1) {
          setTimeout(startListening, 500);
        } else {
          voiceConvoMode = false;
          voiceRetryCount = 0;
          appendChatMsg('assistant', 'No audio detected. Make sure your mic is working, or type your response below.');
        }
      } else if (voiceRetryCount <= 2) {
        appendChatMsg('assistant', "I didn't quite catch that. Could you speak a little louder and try again?");
        if (voiceConvoMode) setTimeout(startListening, 800);
      } else {
        // Too many failures — fall back to text
        voiceConvoMode = false;
        voiceRetryCount = 0;
        appendChatMsg('assistant', 'Having trouble with the mic. Please type your feedback below instead.');
      }
    } else {
      voiceConvoMode = false;
      voiceRetryCount = 0;
      appendChatMsg('assistant', 'Something went wrong with the recording. Please try again or type below.');
    }
  });

  // Silence detection loop — poll until mic analyser is ready, then tick every frame
  (function waitForMic() {
    if (voiceState !== 'listening') return; // aborted before mic was ready
    var ma = VentAudio.getMicAnalyser();
    if (!ma) {
      // Mic not ready yet — retry in 100 ms instead of bailing out
      setTimeout(waitForMic, 100);
      return;
    }
    // Mic is ready — start the real tick loop
    (function tickListen() {
      if (voiceState !== 'listening') return;
      var ma2 = VentAudio.getMicAnalyser();
      if (!ma2) return; // stream died
      var freq = new Uint8Array(ma2.frequencyBinCount);
      ma2.getByteFrequencyData(freq);
      var avg = 0;
      for (var i = 0; i < freq.length; i++) avg += freq[i];
      avg /= freq.length;

      if (avg > SILENCE_THRESH) { speechDetected = true; silenceStart = 0; }
      else if (speechDetected) {
        if (!silenceStart) silenceStart = Date.now();
        else if (Date.now() - silenceStart > SILENCE_MS) {
          VentAudio.stopRecording();
          return;
        }
      }
      if (Date.now() - recStart > MAX_REC_MS) { VentAudio.stopRecording(); return; }
      requestAnimationFrame(tickListen);
    })();
  })();
}

function endFeedbackSession() {
  if (!feedbackSessionId) return;
  VentAudio.stop();
  VentAudio.killRecording();

  authFetch(SERVER + '/charlie/feedback/end', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: feedbackSessionId }),
  }).then(function() {
    endFeedbackSessionUI();
  }).catch(function(err) {
    console.error('End session error:', err);
    endFeedbackSessionUI();
  });
}

function endFeedbackSessionUI() {
  voiceConvoMode = false;
  VentAudio.stop();
  VentAudio.killRecording();
  setVoiceState('idle');
  feedbackSessionId = null;
  document.getElementById('chatCapture').classList.remove('has-session');
  appendChatMsg('assistant', 'Session ended. Thanks for your feedback!');

  // Refresh sessions after a moment (analysis runs async)
  setTimeout(function() { loadSessions(); }, 2000);
}

// ════════════════════════════════════════════════════════════════════════════════
