// ── MY SUBMISSIONS DATA ──────────────────────────────
const MY_SUBS = [
  {
    ref:      'VNT-0051',
    area:     'Upstream Bioreactor',
    priority: 'high',
    text:     'DO probe showing erratic readings during inoculation — values jumping ±15% outside the expected window across 3 consecutive runs.',
    status:   'new',
    date:     '2 hours ago',
    pipeline: [
      { stage:'Submitted',          status:'done',    who:'You',            date:'2 hours ago',  note:'Observation logged and routed to QA.' },
      { stage:'Received by QA',     status:'active',  who:'QA Team',                             note:'Under initial review — triaging priority.' },
      { stage:'MSAT / MFG Review',  status:'pending' },
      { stage:'AD Review',          status:'pending' },
      { stage:'Director Sign-off',  status:'pending' },
      { stage:'Doc Control',        status:'pending' }
    ]
  },
  {
    ref:      'VNT-0048',
    area:     'Media Prep',
    priority: 'medium',
    text:     'Sodium bicarbonate additions not matching BPR documented volumes. Discrepancy of ~20 mL on 3 consecutive batches.',
    status:   'acknowledged',
    date:     '3 days ago',
    outcome:  'QA reviewing with MSAT — BPR cross-check initiated.',
    reviewer: 'QA Team',
    pipeline: [
      { stage:'Submitted',          status:'done',    who:'You',                  date:'3 days ago',  note:'Observation logged.' },
      { stage:'Received by QA',     status:'done',    who:'QA Team',              date:'2 days ago',  note:'BPR cross-check initiated.' },
      { stage:'MSAT / MFG Review',  status:'active',  who:'Siobhán K., MSAT',                         note:'Reviewing documented volumes against batch records.' },
      { stage:'AD Review',          status:'pending' },
      { stage:'Director Sign-off',  status:'pending' },
      { stage:'Doc Control',        status:'pending' }
    ]
  },
  {
    ref:      'VNT-0044',
    area:     'Upstream Bioreactor',
    priority: 'medium',
    text:     'Agitation speed setpoint in SOP appears inconsistent with what\'s in the BPR for the N-1 seed step.',
    status:   'in_progress',
    date:     '8 days ago',
    outcome:  'MSAT investigating parameter discrepancy — deviation report DEV-0192 opened.',
    reviewer: 'Siobhán K., MSAT',
    pipeline: [
      { stage:'Submitted',          status:'done',   who:'You',                  date:'8 days ago',  note:'Observation logged.' },
      { stage:'Received by QA',     status:'done',   who:'QA Team',              date:'7 days ago',  note:'Observation verified and escalated to MSAT.' },
      { stage:'MSAT / MFG Review',  status:'done',   who:'Siobhán K., MSAT',     date:'4 days ago',  note:'DEV-0192 opened. Parameter discrepancy confirmed.' },
      { stage:'AD Review',          status:'active', who:'Conor F., AD',                             note:'Reviewing deviation report and proposed SOP amendment.' },
      { stage:'Director Sign-off',  status:'pending' },
      { stage:'Doc Control',        status:'pending' }
    ]
  },
  {
    ref:      'VNT-0041',
    area:     'CIP / SIP',
    priority: 'low',
    text:     'Caustic rinse cycle consistently runs 2 min over stated time in SOP-CIP-003. Vessel conductivity sensor delay suspected.',
    status:   'resolved',
    date:     '14 days ago',
    outcome:  'SOP-CIP-003 Rev.4 updated — sensor timeout tolerance added to §4.2. Engineering confirmed sensor within spec.',
    reviewer: 'Ciarán M., Engineering',
    pipeline: [
      { stage:'Submitted',          status:'done', who:'You',                    date:'14 days ago', note:'Observation logged.' },
      { stage:'Received by QA',     status:'done', who:'QA Team',                date:'13 days ago', note:'Confirmed against maintenance log.' },
      { stage:'MSAT / MFG Review',  status:'done', who:'Ciarán M., Engineering', date:'11 days ago', note:'Sensor verified in spec. Root cause: timeout setting in §4.2.' },
      { stage:'AD Review',          status:'done', who:'Conor F., AD',           date:'9 days ago',  note:'SOP amendment approved.' },
      { stage:'Director Sign-off',  status:'done', who:'Dr. M. Walsh',           date:'7 days ago',  note:'Approved.' },
      { stage:'Doc Control',        status:'done', who:'Doc Control',            date:'5 days ago',  note:'SOP-CIP-003 Rev.4 issued and released.' }
    ]
  },
  {
    ref:      'VNT-0037',
    area:     'QC / In-process',
    priority: 'medium',
    text:     'Cell viability threshold for inoculation is 85% in the SOP but 80% in the BPR. Operators unsure which figure governs acceptance.',
    status:   'resolved',
    date:     '22 days ago',
    outcome:  'SOP-QC-011 harmonised with BPR — acceptance criterion standardised at 85% across both documents.',
    reviewer: 'Aoife D., QA',
    pipeline: [
      { stage:'Submitted',          status:'done', who:'You',                    date:'22 days ago', note:'Observation logged.' },
      { stage:'Received by QA',     status:'done', who:'Aoife D., QA',           date:'21 days ago', note:'Discrepancy confirmed between SOP and BPR.' },
      { stage:'MSAT / MFG Review',  status:'done', who:'Siobhán K., MSAT',       date:'18 days ago', note:'SOP criterion of 85% confirmed as correct.' },
      { stage:'AD Review',          status:'done', who:'Conor F., AD',           date:'16 days ago', note:'Harmonisation approved.' },
      { stage:'Director Sign-off',  status:'done', who:'Dr. M. Walsh',           date:'13 days ago', note:'Approved.' },
      { stage:'Doc Control',        status:'done', who:'Doc Control',            date:'10 days ago', note:'SOP-QC-011 harmonised with BPR and re-issued.' }
    ]
  }
];

function openSubsDrawer() {
  // Reset to first tab
  document.querySelectorAll('.sd-tab').forEach((b, i) => b.classList.toggle('on', i === 0));
  document.getElementById('sdPanelSubs').style.display = '';
  document.getElementById('sdPanelProg').style.display = 'none';
  renderSubsDrawer();
  document.getElementById('subsDrawer').classList.add('show');
  document.getElementById('subsBackdrop').classList.add('show');
}
function closeSubsDrawer() {
  document.getElementById('subsDrawer').classList.remove('show');
  document.getElementById('subsBackdrop').classList.remove('show');
}
function switchSubsTab(tab, btn) {
  document.querySelectorAll('.sd-tab').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  document.getElementById('sdPanelSubs').style.display = tab === 'subs' ? '' : 'none';
  document.getElementById('sdPanelProg').style.display = tab === 'progress' ? '' : 'none';
  if (tab === 'progress') renderProgressTab();
}
function renderSubsDrawer() {
  const name    = localStorage.getItem('vent_name') || null;
  const initial = name ? name.trim()[0].toUpperCase() : '·';
  const total   = MY_SUBS.length;
  const resolved = MY_SUBS.filter(s => s.status === 'resolved').length;
  const inReview = MY_SUBS.filter(s => s.status === 'acknowledged' || s.status === 'in_progress').length;
  const sopsUpdated = resolved; // 1-to-1 in demo

  const priDot = p => {
    const c = p === 'high' ? 'var(--red)' : p === 'medium' ? 'var(--gold)' : 'var(--green)';
    const l = p === 'high' ? 'High' : p === 'medium' ? 'Medium' : 'Low';
    return `<div class="sc-pri"><div class="sc-dot" style="background:${c}"></div>${l} priority</div>`;
  };
  const badgeCls = { new:'sb-new', acknowledged:'sb-ack', in_progress:'sb-wip', resolved:'sb-done' };
  const badgeTxt = { new:'New', acknowledged:'Acknowledged', in_progress:'In Progress', resolved:'Resolved ✓' };

  const cards = MY_SUBS.map(s => {
    let outcomeHtml = '';
    if (s.outcome) {
      const iconPath = s.status === 'resolved'
        ? '<polyline points="20 6 9 17 4 12"/>'
        : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>';
      const iconClr = s.status === 'resolved' ? 'var(--green)' : 'var(--teal)';
      outcomeHtml = `
      <div class="sc-outcome">
        <svg class="sc-out-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${iconClr}" stroke-width="2.2">${iconPath}</svg>
        <div>
          <div class="sc-out-txt">${escHtml(s.outcome)}</div>
          ${s.reviewer ? `<div class="sc-out-by">${escHtml(s.reviewer)}</div>` : ''}
        </div>
      </div>`;
    }
    let attachHtml = '';
    if (s.attachments && s.attachments.length) {
      attachHtml = `<div class="sc-attachments">` +
        s.attachments.map(a => a.type === 'image'
          ? `<img class="sc-att-img" src="${a.url}" alt="">`
          : `<div class="sc-att-vid"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0"><polygon points="5 3 19 12 5 21 5 3"/></svg><span class="sc-att-vid-name">${escHtml(a.name)}</span></div>`
        ).join('') + `</div>`;
    }
    return `
    <div class="sub-card">
      <div class="sc-top">
        <span class="sc-ref">${escHtml(s.ref)}</span>
        <span class="sc-area">${escHtml(s.area)}</span>
        <span class="sc-badge ${badgeCls[s.status]}">${badgeTxt[s.status]}</span>
      </div>
      <div class="sc-meta">${priDot(s.priority)}</div>
      <div class="sc-text">${escHtml(s.text)}</div>
      <div class="sc-date">${escHtml(s.date)}</div>
      ${attachHtml}
      ${outcomeHtml}
    </div>`;
  }).join('');

  const impactFoot = sopsUpdated > 0 ? `
    <div class="sd-impact-foot">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
      ${sopsUpdated} SOP${sopsUpdated > 1 ? 's' : ''} updated directly from your reports
    </div>` : '';

  document.getElementById('sdPanelSubs').innerHTML = `
    <div class="sd-impact">
      <div class="sd-impact-top">
        <div class="sd-avatar">${escHtml(initial)}</div>
        <div>
          <div class="sd-impact-name">${name ? escHtml(name) : 'Operator'}</div>
          <div class="sd-impact-role">Floor Operator · Upstream</div>
        </div>
      </div>
      <div class="sd-stats">
        <div class="sd-stat">
          <div class="sd-stat-n ct">${total}</div>
          <div class="sd-stat-lbl">Submitted</div>
        </div>
        <div class="sd-stat">
          <div class="sd-stat-n cg">${inReview}</div>
          <div class="sd-stat-lbl">In Review</div>
        </div>
        <div class="sd-stat">
          <div class="sd-stat-n cv">${resolved}</div>
          <div class="sd-stat-lbl">Resolved</div>
        </div>
      </div>
      ${impactFoot}
    </div>
    <div class="sd-section-lbl">Your observations</div>
    <div class="sd-cards">${cards}</div>
  `;
}

function renderProgressTab() {
  const badgeCls = { new:'sb-new', acknowledged:'sb-ack', in_progress:'sb-wip', resolved:'sb-done' };
  const badgeTxt = { new:'New', acknowledged:'Acknowledged', in_progress:'In Progress', resolved:'Resolved ✓' };

  const cards = MY_SUBS.map(s => {
    const pipelineHtml = s.pipeline.map((step, idx) => {
      const isLast = idx === s.pipeline.length - 1;
      const dotInner = step.status === 'done'
        ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`
        : step.status === 'active'
          ? `<div style="width:7px;height:7px;border-radius:50%;background:var(--teal)"></div>`
          : `<div style="width:5px;height:5px;border-radius:50%;background:var(--border)"></div>`;
      const connCls  = step.status === 'done' ? 'pl-connector done-line' : 'pl-connector';
      const connector = !isLast ? `<div class="${connCls}"></div>` : '';
      const activeBadge = step.status === 'active' ? `<span class="pl-badge-active">● With them now</span>` : '';
      const whoHtml  = step.who  ? `<div class="pl-who">${escHtml(step.who)}${activeBadge}</div>` : '';
      const noteHtml = step.note ? `<div class="pl-note">${escHtml(step.note)}</div>` : '';
      const dateHtml = step.date ? `<div class="pl-date">${escHtml(step.date)}</div>` : '';
      return `
      <div class="pl-step">
        <div class="pl-left">
          <div class="pl-dot ${step.status}">${dotInner}</div>
          ${connector}
        </div>
        <div class="pl-body">
          <div class="pl-stage">${escHtml(step.stage)}</div>
          ${whoHtml}${noteHtml}${dateHtml}
        </div>
      </div>`;
    }).join('');

    return `
    <div class="prog-card">
      <div class="prog-card-top">
        <span class="prog-card-ref">${escHtml(s.ref)}</span>
        <span class="prog-card-area">${escHtml(s.area)}</span>
        <span class="sc-badge ${badgeCls[s.status]}">${badgeTxt[s.status]}</span>
      </div>
      <div class="pl-pipeline">${pipelineHtml}</div>
    </div>`;
  }).join('');

  document.getElementById('sdPanelProg').innerHTML = `
    <div class="sd-section-lbl" style="margin-bottom:14px">Where each of your observations sits in the approval pipeline</div>
    <div class="prog-cards">${cards}</div>
  `;
}

// ── VENT PANEL ───────────────────────────────────────
let _ventPri   = 'medium';
let _ventFiles = [];

function onVpDragOver(e) {
  e.preventDefault();
  document.getElementById('vpDrop').classList.add('drag-over');
}
function onVpDragLeave(e) {
  document.getElementById('vpDrop').classList.remove('drag-over');
}
function onVpDrop(e) {
  e.preventDefault();
  document.getElementById('vpDrop').classList.remove('drag-over');
  handleVentFiles(e.dataTransfer.files);
}
function handleVentFiles(files) {
  Array.from(files).forEach(f => {
    if (_ventFiles.length >= 5) return;
    if (!f.type.startsWith('image/') && !f.type.startsWith('video/')) return;
    _ventFiles.push(f);
  });
  renderVentPreviews();
}
function removeVentFile(i) {
  _ventFiles.splice(i, 1);
  renderVentPreviews();
}
function renderVentPreviews() {
  const el = document.getElementById('vpPreviews');
  if (!_ventFiles.length) { el.innerHTML = ''; return; }
  el.innerHTML = _ventFiles.map((f, i) => {
    const url   = URL.createObjectURL(f);
    const isImg = f.type.startsWith('image/');
    const inner = isImg
      ? `<img class="vp-prev-img" src="${url}" alt="">`
      : `<div class="vp-prev-vid">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="color:var(--mid);flex-shrink:0"><polygon points="5 3 19 12 5 21 5 3"/></svg>
           <div class="vp-prev-vid-name">${escHtml(f.name)}</div>
         </div>`;
    return `<div class="vp-prev-item">
      ${inner}
      <button class="vp-prev-remove" onclick="removeVentFile(${i})" title="Remove">×</button>
    </div>`;
  }).join('');
}

function toggleVentPanel() {
  document.getElementById('ventPanel').classList.contains('show') ? closeVentPanel() : openVentPanel();
}
function openVentPanel() {
  document.getElementById('ventPanel').classList.add('show');
  document.getElementById('ventBackdrop').classList.add('show');
  setTimeout(() => document.getElementById('ventText').focus(), 240);
}
function closeVentPanel() {
  document.getElementById('ventPanel').classList.remove('show');
  document.getElementById('ventBackdrop').classList.remove('show');
}
function setPri(btn) {
  document.querySelectorAll('.vp-pri-btn').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  _ventPri = btn.dataset.p;
}
async function submitVent() {
  const text = document.getElementById('ventText').value.trim();
  if (!text) { document.getElementById('ventText').focus(); return; }
  const btn = document.getElementById('ventSubmitBtn');
  btn.disabled = true;
  btn.innerHTML = 'Analysing &amp; submitting…';
  const area = document.getElementById('ventArea').value;
  const shift = localStorage.getItem('vent_name') || 'Day Shift';

  try {
    // POST to server — triggers Voyage embed + Claude analysis + Supabase store
    const res = await authFetch(SERVER + '/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        observation: text,
        area: area,
        shift: shift,
        willingToConsult: true
      })
    });
    if (!res.ok) throw new Error('Server returned ' + res.status);
    const result = await res.json();
    const ref = result.refCode || 'VNT-????';

    // Capture attachments as object URLs for in-session preview
    const attachments = _ventFiles.map(f => ({
      url:  URL.createObjectURL(f),
      type: f.type.startsWith('image/') ? 'image' : 'video',
      name: f.name
    }));
    // Prepend to MY_SUBS so it appears immediately in the drawer
    MY_SUBS.unshift({
      ref,
      area,
      priority: result.priority || _ventPri,
      text,
      status:   'new',
      date:     'Just now',
      attachments: attachments.length ? attachments : undefined,
      pipeline: [
        { stage:'Submitted',         status:'done',   who:'You', date:'Just now', note:'Observation logged and routed to QA.' },
        { stage:'Received by QA',    status:'pending' },
        { stage:'MSAT / MFG Review', status:'pending' },
        { stage:'AD Review',         status:'pending' },
        { stage:'Director Sign-off', status:'pending' },
        { stage:'Doc Control',       status:'pending' }
      ]
    });
    // Update topbar trigger count
    const trigger = document.querySelector('.subs-trigger');
    if (trigger) trigger.querySelector('.subs-count').textContent = MY_SUBS.length;
    document.getElementById('vpBody').style.display = 'none';
    document.getElementById('vpSuccess').style.display = '';
    const attNote = _ventFiles.length ? ` · ${_ventFiles.length} file${_ventFiles.length > 1 ? 's' : ''} attached` : '';
    document.getElementById('vpsRef').textContent = 'Ref. ' + ref + attNote + ' · QA & MSAT notified';
  } catch (err) {
    console.error('Submit error:', err);
    btn.innerHTML = 'Submit failed — try again';
    btn.disabled = false;
    return;
  }
}
function resetVentPanel() {
  document.getElementById('ventText').value = '';
  document.querySelectorAll('.vp-pri-btn').forEach(b => b.classList.remove('on'));
  document.querySelector('[data-p="medium"]').classList.add('on');
  _ventPri = 'medium';
  _ventFiles = [];
  document.getElementById('vpPreviews').innerHTML = '';
  document.getElementById('vpFileInput').value = '';
  document.getElementById('vpBody').style.display = '';
  document.getElementById('vpSuccess').style.display = 'none';
  const btn = document.getElementById('ventSubmitBtn');
  btn.disabled = false;
  btn.innerHTML = 'Submit observation <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
  setTimeout(() => document.getElementById('ventText').focus(), 50);
}

// ════════════════════════════════════════════════════════
// VOICE RECORDING — Speech-to-Text (Vent Panel)
// ════════════════════════════════════════════════════════
let vpMediaRecorder = null;
let vpAudioChunks = [];
let vpRecStream = null;
let vpRecStartTime = 0;
let vpRecTimerInterval = null;
let vpRecAnalyser = null;
let vpRecAnimFrame = null;

// Init waveform bars
(function() {
  const c = document.getElementById('vpRecBars');
  if (!c) return;
  for (let i = 0; i < 24; i++) {
    const bar = document.createElement('div');
    bar.className = 'vp-rec-bar';
    bar.style.height = '3px';
    c.appendChild(bar);
  }
})();

function toggleVpRecording() {
  if (vpMediaRecorder && vpMediaRecorder.state === 'recording') {
    vpMediaRecorder.stop();
  } else {
    startVpRecording();
  }
}

async function startVpRecording() {
  try {
    vpRecStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    alert(t('mic.noAccess'));
    return;
  }

  vpAudioChunks = [];
  vpMediaRecorder = new MediaRecorder(vpRecStream, {
    mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : ''
  });

  vpMediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) vpAudioChunks.push(e.data);
  };

  vpMediaRecorder.onstop = async () => {
    vpRecStream.getTracks().forEach(t => t.stop());
    clearInterval(vpRecTimerInterval);
    cancelAnimationFrame(vpRecAnimFrame);

    document.getElementById('vpRecOverlay').classList.remove('active');
    document.getElementById('vpRecTranscribing').classList.add('active');

    const blob = new Blob(vpAudioChunks, { type: 'audio/webm' });
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      try {
        const res = await fetch(SERVER + '/stt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + (localStorage.getItem('vent_token') || ''),
          },
          body: JSON.stringify({ audio: base64, mimeType: 'audio/webm', language_code: (window.VentI18n && VentI18n.getSttLangCode()) || 'eng' }),
        });
        const data = await res.json();
        if (data.text) {
          const ta = document.getElementById('ventText');
          const existing = ta.value.trim();
          ta.value = existing ? existing + ' ' + data.text : data.text;
          ta.focus();
        }
      } catch (err) {
        console.error('STT error:', err);
        alert(t('mic.sttFailed'));
      }
      document.getElementById('vpRecTranscribing').classList.remove('active');
      resetVpMicBtn();
    };
    reader.readAsDataURL(blob);
  };

  vpMediaRecorder.start(250);
  vpRecStartTime = Date.now();

  const btn = document.getElementById('vpMicBtn');
  btn.classList.add('recording');
  btn.querySelector('.vp-mic-icon').style.display = 'none';
  btn.querySelector('.vp-mic-stop').style.display = '';
  document.getElementById('vpRecOverlay').classList.add('active');

  vpRecTimerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - vpRecStartTime) / 1000);
    document.getElementById('vpRecTimer').textContent =
      Math.floor(elapsed / 60) + ':' + String(elapsed % 60).padStart(2, '0');
  }, 200);

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioCtx.createMediaStreamSource(vpRecStream);
  vpRecAnalyser = audioCtx.createAnalyser();
  vpRecAnalyser.fftSize = 128;
  vpRecAnalyser.smoothingTimeConstant = 0.7;
  source.connect(vpRecAnalyser);

  const bars = document.querySelectorAll('.vp-rec-bar');
  const freqData = new Uint8Array(vpRecAnalyser.frequencyBinCount);

  function animateBars() {
    vpRecAnalyser.getByteFrequencyData(freqData);
    bars.forEach((bar, i) => {
      const idx = Math.floor((i / bars.length) * freqData.length * 0.8);
      bar.style.height = Math.max(3, (freqData[idx] / 255) * 18) + 'px';
    });
    vpRecAnimFrame = requestAnimationFrame(animateBars);
  }
  animateBars();
}

function resetVpMicBtn() {
  const btn = document.getElementById('vpMicBtn');
  btn.classList.remove('recording');
  btn.querySelector('.vp-mic-icon').style.display = '';
  btn.querySelector('.vp-mic-stop').style.display = 'none';
}

