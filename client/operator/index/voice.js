  // VOICE RECORDING — Speech-to-Text
  // ════════════════════════════════════════════════════════
  let mediaRecorder = null;
  let audioChunks = [];
  let recStream = null;
  let recStartTime = 0;
  let recTimerInterval = null;
  let recAnalyser = null;
  let recAnimFrame = null;

  // Init recording waveform bars
  (function initRecBars() {
    const container = document.getElementById('recBars');
    for (let i = 0; i < 32; i++) {
      const bar = document.createElement('div');
      bar.className = 'rec-bar-item';
      bar.style.height = '3px';
      container.appendChild(bar);
    }
  })();

  async function toggleRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      stopRecording();
    } else {
      startRecording();
    }
  }

  async function startRecording() {
    try {
      recStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      alert(t('mic.noAccess'));
      return;
    }

    audioChunks = [];
    mediaRecorder = new MediaRecorder(recStream, { mimeType: 'audio/webm' });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      // Clean up stream
      recStream.getTracks().forEach(t => t.stop());
      clearInterval(recTimerInterval);
      cancelAnimationFrame(recAnimFrame);

      // Show transcribing state
      document.getElementById('recOverlay').classList.remove('active');
      document.getElementById('recTranscribing').classList.add('active');

      // Convert to base64
      const blob = new Blob(audioChunks, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        try {
          const res = await fetch(SERVER_URL + '/stt', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + (localStorage.getItem('vent_token') || ''),
            },
            body: JSON.stringify({ audio: base64, mimeType: 'audio/webm', language_code: (window.VentI18n && VentI18n.getSttLangCode()) || 'eng' }),
          });

          const data = await res.json();
          if (data.text) {
            const textarea = document.getElementById('ventText');
            // Append to existing text or set it
            const existing = textarea.value.trim();
            textarea.value = existing ? existing + ' ' + data.text : data.text;
            // Trigger the submit button enable check
            onType(textarea);
            textarea.focus();
          }
        } catch (err) {
          console.error('STT error:', err);
          alert(t('mic.sttFailed'));
        }

        document.getElementById('recTranscribing').classList.remove('active');
        resetMicBtn();
      };
      reader.readAsDataURL(blob);
    };

    // Start recording
    mediaRecorder.start(250);
    recStartTime = Date.now();

    // Update UI
    const micBtn = document.getElementById('micBtn');
    micBtn.classList.add('recording');
    micBtn.querySelector('.mic-icon').style.display = 'none';
    micBtn.querySelector('.mic-stop').style.display = '';
    document.getElementById('recOverlay').classList.add('active');

    // Start timer
    recTimerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - recStartTime) / 1000);
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      document.getElementById('recTimer').textContent = mins + ':' + String(secs).padStart(2, '0');
    }, 200);

    // Start waveform animation using AnalyserNode
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(recStream);
    recAnalyser = audioCtx.createAnalyser();
    recAnalyser.fftSize = 128;
    recAnalyser.smoothingTimeConstant = 0.7;
    source.connect(recAnalyser);

    const bars = document.querySelectorAll('.rec-bar-item');
    const freqData = new Uint8Array(recAnalyser.frequencyBinCount);

    function animateRecBars() {
      recAnalyser.getByteFrequencyData(freqData);
      bars.forEach((bar, i) => {
        const idx = Math.floor((i / bars.length) * freqData.length * 0.8);
        const val = freqData[idx] || 0;
        const h = Math.max(3, (val / 255) * 22);
        bar.style.height = h + 'px';
      });
      recAnimFrame = requestAnimationFrame(animateRecBars);
    }
    animateRecBars();
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
  }

  function resetMicBtn() {
    const micBtn = document.getElementById('micBtn');
    micBtn.classList.remove('recording');
    micBtn.querySelector('.mic-icon').style.display = '';
    micBtn.querySelector('.mic-stop').style.display = 'none';
  }

