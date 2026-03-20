// ── VISUAL QUERY (Camera/Photo) ──
import { escHtml } from '/shared/utils.js';

export let _camImageData = null; // base64 string (no prefix)
export let _camMimeType = null;

const qInput = document.getElementById('qInput');

export function triggerCamUpload() {
  document.getElementById('camFileInput').click();
}

document.getElementById('camFileInput').addEventListener('change', function() {
  const file = this.files[0];
  if (!file) return;

  // Validate size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    alert('Image too large. Maximum 10MB.');
    this.value = '';
    return;
  }

  _camMimeType = file.type || 'image/jpeg';

  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    // Extract base64 data (remove "data:image/...;base64," prefix)
    _camImageData = dataUrl.split(',')[1];

    // Show preview
    const preview = document.getElementById('camPreview');
    document.getElementById('camPreviewImg').src = dataUrl;
    document.getElementById('camPreviewName').textContent = file.name + ' (' + formatSize(file.size) + ')';
    preview.style.display = 'block';

    // Update placeholder
    qInput.placeholder = 'Add a note about what you see (optional), then hit Send\u2026';

    // Update button text
    document.getElementById('camBtn').innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> Change';
  };
  reader.readAsDataURL(file);
  this.value = '';
});

export function clearCamImage() {
  _camImageData = null;
  _camMimeType = null;
  document.getElementById('camPreview').style.display = 'none';
  document.getElementById('camPreviewImg').src = '';
  document.getElementById('camContext').value = '';
  qInput.placeholder = 'Ask a question about any SOP procedure, parameter, or step\u2026';
  document.getElementById('camBtn').innerHTML =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> Photo';
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

export async function runVisualQuery() {
  const area = document.getElementById('areaSelect').value;
  const context = document.getElementById('camContext').value.trim() || qInput.value.trim();
  const imagePreviewSrc = document.getElementById('camPreviewImg').src;

  // Clear state
  const savedImage = _camImageData;
  const savedMime = _camMimeType;
  const userMsg = context || 'Analyse this image and find relevant SOPs';
  clearCamImage();
  qInput.value = '';
  qInput.style.height = 'auto';

  // Add to conversation history
  _chatHistory.push({ role: 'user', content: '[Visual Query] ' + userMsg, area });

  // Hide empty state
  document.getElementById('emptyState').style.display = 'none';

  const btn = document.getElementById('sendBtn');
  btn.disabled = true;

  // Build question bubble with image thumbnail
  const turn = document.createElement('div');
  turn.className = 'chat-turn';
  const thinkId = 'thinking-' + Date.now();
  turn.innerHTML = `
    <div class="turn-q-meta">${area} \u00b7 Visual Query</div>
    <div class="turn-q">
      <div class="turn-q-bubble">
        <img src="${imagePreviewSrc}" style="max-width:200px;max-height:120px;border-radius:6px;margin-bottom:8px;display:block">
        ${context ? escHtml(context) : '<span style="color:var(--dim);font-style:italic">Analyse this image and find relevant SOPs</span>'}
      </div>
    </div>
    <div class="thinking" id="${thinkId}">
      <div class="think-dots">
        <div class="think-dot"></div><div class="think-dot"></div><div class="think-dot"></div>
      </div>
      Analysing image &amp; searching SOPs\u2026
    </div>`;

  const inner = document.getElementById('chatInner');
  inner.appendChild(turn);
  scrollToBottom();

  try {
    const res = await authFetch(`${SERVER}/query/visual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: savedImage,
        mimeType: savedMime,
        area,
        context: context || null
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Visual query failed');

    // Build the response: vision card + SOP answer
    const visionHtml = buildVisionHtml(data.vision);
    const answerHtml = buildAnswerHtml(data.answer);

    document.getElementById(thinkId).outerHTML = visionHtml + answerHtml;

    // Save to conversation history
    _chatHistory.push({
      role: 'assistant',
      summary: data.answer?.summary || 'Visual query response',
      diagramHint: data.answer?.diagramHint || '',
      fullResponse: data.answer
    });
    await saveCurrentSession();

  } catch (err) {
    _chatHistory.pop();
    document.getElementById(thinkId).outerHTML =
      `<div class="answer-card"><div class="answer-body">
        <div class="answer-summary" style="color:var(--red)">Something went wrong: ${escHtml(err.message)}</div>
        <p style="color:var(--dim);font-size:12px;margin-top:8px;">The image could not be processed. Please try again.</p>
      </div></div>`;
  } finally {
    btn.disabled = false;
    scrollToBottom();
  }
}

// ── GDP CHECK ──────────────────────────────────────────────────────
let _gdpImages = [];        // [{dataUrl, base64, mimeType, name}]
let _gdpData = null;        // full API response
let _gdpActivePage = 0;     // which page is shown
let _gdpActiveError = -1;   // which error is highlighted (-1 = none)
let _gdpZoomScale = 1;
let _gdpTourTimer = null;

export function openGdpModal() {
  _gdpImages = []; _gdpData = null; _gdpActivePage = 0; _gdpActiveError = -1; _gdpZoomScale = 1;
  if (_gdpTourTimer) { clearInterval(_gdpTourTimer); _gdpTourTimer = null; }
  document.getElementById('gdpPhotos').innerHTML = '';
  document.getElementById('gdpUploadSection').style.display = 'flex';
  document.getElementById('gdpLoading').style.display = 'none';
  document.getElementById('gdpReviewSplit').style.display = 'none';
  document.getElementById('gdpHeadStats').style.display = 'none';
  document.getElementById('gdpPhotoCount').textContent = '0 pages';
  document.getElementById('gdpRunBtn').disabled = true;
  document.getElementById('gdpOverlay').classList.add('show');
  _gdpResetActionBar();
}

export function closeGdpModal() {
  if (_gdpTourTimer) { clearInterval(_gdpTourTimer); _gdpTourTimer = null; }
  if (_gdpCameraStream) gdpCloseCamera();
  document.getElementById('gdpOverlay').classList.remove('show');
}

function _gdpResetActionBar() {
  document.getElementById('gdpActionBar').innerHTML = `
    <div class="gdp-photo-count" id="gdpPhotoCount">${_gdpImages.length} page${_gdpImages.length !== 1 ? 's' : ''}</div>
    <div style="display:flex;gap:8px;align-items:center">
      <button class="gdp-add-more" data-action="gdpAddMore">+ Add more</button>
      <button class="gdp-run-btn" id="gdpRunBtn" data-action="runGdpCheck" ${_gdpImages.length === 0 ? 'disabled' : ''}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 15l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
        Run GDP Check
      </button>
    </div>`;
}

// File input
document.getElementById('gdpFileInput').addEventListener('change', function() {
  Array.from(this.files).forEach(file => {
    if (file.size > 20 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = e => {
      _gdpImages.push({ dataUrl: e.target.result, base64: e.target.result.split(',')[1], mimeType: file.type || 'image/jpeg', name: file.name });
      renderGdpThumbs();
    };
    reader.readAsDataURL(file);
  });
  this.value = '';
});

// Camera input (mobile fallback — uses native camera app)
document.getElementById('gdpCameraInput').addEventListener('change', function() {
  Array.from(this.files).forEach(file => {
    if (file.size > 20 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = e => {
      _gdpImages.push({ dataUrl: e.target.result, base64: e.target.result.split(',')[1], mimeType: file.type || 'image/jpeg', name: 'Photo ' + (_gdpImages.length + 1) + '.jpg' });
      renderGdpThumbs();
    };
    reader.readAsDataURL(file);
  });
  this.value = '';
});

// ── Camera capture (getUserMedia for desktop, native camera for mobile) ──
let _gdpCameraStream = null;
let _gdpCameraFacing = 'environment'; // 'environment' = rear, 'user' = front

export function gdpOpenCamera() {
  // On mobile, try native camera input first (better UX)
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) {
    document.getElementById('gdpCameraInput').click();
    return;
  }
  // Desktop: use getUserMedia viewfinder
  gdpStartCamera();
}

async function gdpStartCamera() {
  const cameraView = document.getElementById('gdpCameraView');
  const dropZone = document.getElementById('gdpDropZone');
  const video = document.getElementById('gdpCameraVideo');

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: _gdpCameraFacing, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false
    });
    _gdpCameraStream = stream;
    video.srcObject = stream;

    // Show switch button if multiple cameras available
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(d => d.kind === 'videoinput');
    document.getElementById('gdpCamSwitch').style.display = cameras.length > 1 ? '' : 'none';

    dropZone.style.display = 'none';
    cameraView.style.display = 'flex';
  } catch (err) {
    alert('Could not access camera: ' + err.message);
  }
}

export function gdpCloseCamera() {
  if (_gdpCameraStream) {
    _gdpCameraStream.getTracks().forEach(t => t.stop());
    _gdpCameraStream = null;
  }
  document.getElementById('gdpCameraView').style.display = 'none';
  document.getElementById('gdpDropZone').style.display = '';
}

export function gdpCapturePhoto() {
  const video = document.getElementById('gdpCameraVideo');
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  _gdpImages.push({
    dataUrl,
    base64: dataUrl.split(',')[1],
    mimeType: 'image/jpeg',
    name: 'Photo ' + (_gdpImages.length + 1) + '.jpg'
  });
  renderGdpThumbs();

  // Flash effect
  const flash = document.createElement('div');
  flash.style.cssText = 'position:absolute;inset:0;background:#fff;opacity:.6;z-index:10;pointer-events:none;transition:opacity .3s';
  document.getElementById('gdpCameraView').appendChild(flash);
  requestAnimationFrame(() => { flash.style.opacity = '0'; setTimeout(() => flash.remove(), 300); });
}

export async function gdpSwitchCamera() {
  _gdpCameraFacing = _gdpCameraFacing === 'environment' ? 'user' : 'environment';
  if (_gdpCameraStream) {
    _gdpCameraStream.getTracks().forEach(t => t.stop());
  }
  await gdpStartCamera();
}

// Drag & drop
const gdpDrop = document.getElementById('gdpDropZone');
gdpDrop.addEventListener('dragover', e => { e.preventDefault(); gdpDrop.classList.add('dragover'); });
gdpDrop.addEventListener('dragleave', () => gdpDrop.classList.remove('dragover'));
gdpDrop.addEventListener('drop', e => {
  e.preventDefault(); gdpDrop.classList.remove('dragover');
  Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')).forEach(file => {
    if (file.size > 20 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = ev => {
      _gdpImages.push({ dataUrl: ev.target.result, base64: ev.target.result.split(',')[1], mimeType: file.type || 'image/jpeg', name: file.name });
      renderGdpThumbs();
    };
    reader.readAsDataURL(file);
  });
});

function renderGdpThumbs() {
  const c = document.getElementById('gdpPhotos');
  c.innerHTML = _gdpImages.map((img, i) =>
    `<div class="gdp-photo-thumb"><img src="${img.dataUrl}" alt="P${i+1}"><button class="gdp-photo-remove" data-action="gdpRemoveThumb" data-index="${i}">\u00d7</button><span class="gdp-photo-page-num">P${i+1}</span></div>`
  ).join('');
  document.getElementById('gdpPhotoCount').textContent = _gdpImages.length + ' page' + (_gdpImages.length !== 1 ? 's' : '');
  const btn = document.getElementById('gdpRunBtn');
  if (btn) btn.disabled = _gdpImages.length === 0;
}

// Delegated click handler for dynamic GDP elements
document.addEventListener('click', function(e) {
  const action = e.target.closest('[data-action]');
  if (!action) return;
  const act = action.dataset.action;
  if (act === 'gdpAddMore') {
    document.getElementById('gdpFileInput').click();
  } else if (act === 'runGdpCheck') {
    runGdpCheck();
  } else if (act === 'gdpRemoveThumb') {
    const idx = parseInt(action.dataset.index, 10);
    e.stopPropagation();
    _gdpImages.splice(idx, 1);
    renderGdpThumbs();
  }
});

// ── Run GDP Check ──
export async function runGdpCheck() {
  if (!_gdpImages.length) return;
  const runBtn = document.getElementById('gdpRunBtn');
  if (runBtn) runBtn.disabled = true;

  document.getElementById('gdpUploadSection').style.display = 'none';
  document.getElementById('gdpReviewSplit').style.display = 'none';
  document.getElementById('gdpLoading').style.display = 'flex';

  const loadingPage = document.getElementById('gdpLoadingPage');
  loadingPage.textContent = `Analysing ${_gdpImages.length} page${_gdpImages.length !== 1 ? 's' : ''}\u2026`;

  try {
    const images = _gdpImages.map((img, i) => ({ image: img.base64, mimeType: img.mimeType, pageNumber: i + 1, filename: img.name }));
    const res = await authFetch(`${SERVER}/query/gdp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'GDP check failed');

    _gdpData = data;
    _gdpData.documentId = data.documentId;
    renderGdpReview();
  } catch (err) {
    document.getElementById('gdpLoading').style.display = 'none';
    document.getElementById('gdpUploadSection').style.display = 'flex';
    alert('GDP check failed: ' + err.message);
  }
}

// ── Render review view ──
function renderGdpReview() {
  document.getElementById('gdpLoading').style.display = 'none';
  document.getElementById('gdpReviewSplit').style.display = 'flex';

  // Head stats
  const hs = document.getElementById('gdpHeadStats');
  hs.style.display = 'flex';
  hs.innerHTML = `
    ${_gdpData.criticalCount ? `<span class="gdp-head-stat critical"><span class="dot"></span>${_gdpData.criticalCount} Critical</span>` : ''}
    ${_gdpData.majorCount ? `<span class="gdp-head-stat major"><span class="dot"></span>${_gdpData.majorCount} Major</span>` : ''}
    ${_gdpData.minorCount ? `<span class="gdp-head-stat minor"><span class="dot"></span>${_gdpData.minorCount} Minor</span>` : ''}
    ${_gdpData.totalErrors === 0 ? `<span class="gdp-head-stat minor"><span class="dot"></span>All clear</span>` : ''}`;

  // Page tabs
  const tabs = document.getElementById('gdpPageTabs');
  if (_gdpData.pages.length > 1) {
    tabs.innerHTML = _gdpData.pages.map((p, i) => {
      const errCount = (p.errors || []).length;
      return `<button class="gdp-page-tab ${i === 0 ? 'active' : ''}" onclick="gdpSwitchPage(${i})">Page ${p.pageNumber}<span class="tab-count ${errCount ? 'has-errors' : 'clean'}">${errCount || '\u2713'}</span></button>`;
    }).join('');
    tabs.style.display = 'flex';
  } else {
    tabs.style.display = 'none';
  }

  // Recommendations
  const recs = document.getElementById('gdpRecs');
  if (_gdpData.recommendations && _gdpData.recommendations.length) {
    recs.style.display = '';
    recs.innerHTML = `<div class="gdp-recs-title">Recommendations</div><ul>${_gdpData.recommendations.map(r => `<li>${escHtml(r)}</li>`).join('')}</ul>`;
  }

  // Action bar — with review controls when persisted
  const reviewControls = _gdpData.documentId ? `
    <div style="display:flex;gap:6px;align-items:center;margin-right:auto;margin-left:12px">
      <span style="font-size:10px;color:var(--dim)">Review:</span>
      <button class="gdp-add-more" onclick="gdpSetReviewStatus('reviewed')" style="${_gdpData.review_status === 'reviewed' ? 'color:var(--accent);border-color:var(--accent)' : ''}">Mark Reviewed</button>
      <button class="gdp-add-more" onclick="gdpSetReviewStatus('approved')" style="${_gdpData.review_status === 'approved' ? 'color:var(--green);border-color:var(--green)' : ''}">Approve</button>
      <span class="gdp-review-badge ${_gdpData.review_status || 'pending_review'}" id="gdpReviewBadge">${(_gdpData.review_status || 'pending_review').replace('_', ' ')}</span>
    </div>` : '';

  document.getElementById('gdpActionBar').innerHTML = `
    <div class="gdp-photo-count">${_gdpData.totalErrors} issue${_gdpData.totalErrors !== 1 ? 's' : ''} across ${_gdpData.pages.length} page${_gdpData.pages.length !== 1 ? 's' : ''}</div>
    ${reviewControls}
    <div style="display:flex;gap:8px;align-items:center">
      <button class="gdp-export-btn" onclick="exportGdpToBuilder()" id="gdpExportBtn">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        Export to Doc Builder
      </button>
      <button class="gdp-add-more" onclick="resetGdpModal()">New Check</button>
    </div>`;

  _gdpActivePage = 0;
  _gdpActiveError = -1;
  gdpRenderPage(0);
}

function resetGdpModal() {
  if (_gdpTourTimer) { clearInterval(_gdpTourTimer); _gdpTourTimer = null; }
  if (_gdpCameraStream) gdpCloseCamera();
  _gdpImages = []; _gdpData = null; _gdpActivePage = 0; _gdpActiveError = -1;
  document.getElementById('gdpPhotos').innerHTML = '';
  document.getElementById('gdpUploadSection').style.display = 'flex';
  document.getElementById('gdpReviewSplit').style.display = 'none';
  document.getElementById('gdpLoading').style.display = 'none';
  document.getElementById('gdpHeadStats').style.display = 'none';
  _gdpResetActionBar();
}

// ── Render a single page (image + annotations + findings) ──
function gdpRenderPage(pageIdx) {
  _gdpActivePage = pageIdx;
  _gdpActiveError = -1;
  _gdpZoomScale = 1;

  const page = _gdpData.pages[pageIdx];
  const errors = page.errors || [];
  const entries = page.entries || [];
  const imgSrc = _gdpImages[pageIdx]?.dataUrl || page.imageUrl || '';
  const isEditable = !!_gdpData.documentId;

  // Update tab highlighting
  document.querySelectorAll('.gdp-page-tab').forEach((t, i) => t.classList.toggle('active', i === pageIdx));

  // ── Image + annotation overlays ──
  const canvas = document.getElementById('gdpCanvas');
  _gdpZoomScale = 1;
  document.getElementById('gdpZoomLevel').textContent = '100%';

  let innerHtml = `<div class="gdp-viewer-inner" id="gdpInner">`;

  if (imgSrc) {
    innerHtml += `<img src="${imgSrc}" id="gdpPageImg" onload="gdpOnImgLoad()">`;

    // Draw entry boxes (green dashed for OK entries)
    entries.forEach(entry => {
      if (!entry.bbox) return;
      const hasError = errors.some(e => e.entryId === entry.id);
      if (hasError) return;
      const b = entry.bbox;
      innerHtml += `<div class="gdp-anno entry-ok" style="left:${b.x}%;top:${b.y}%;width:${b.w}%;height:${b.h}%"
        title="${escHtml(entry.text || '')}">
        <span class="gdp-anno-badge">\u2713</span>
      </div>`;
    });

    // Draw error boxes
    errors.forEach((err, i) => {
      if (!err.bbox) return;
      const b = err.bbox;
      const sev = err.severity || 'minor';
      innerHtml += `<div class="gdp-anno severity-${sev}" id="gdpAnno${i}"
        style="left:${b.x}%;top:${b.y}%;width:${b.w}%;height:${b.h}%"
        onclick="gdpSelectError(${i})" title="${escHtml(err.title || '')}">
        <span class="gdp-anno-badge">${i + 1}</span>
      </div>`;
    });
  } else {
    // No image available (loaded from history)
    innerHtml += `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;min-height:300px;color:var(--dim);text-align:center;padding:40px">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:12px;opacity:.4"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
      <div style="font-size:13px;margin-bottom:4px">No image available</div>
      <div style="font-size:11px">Re-upload the original page to see visual annotations</div>
    </div>`;
  }

  innerHtml += `</div>`;
  canvas.innerHTML = innerHtml;

  // ── Findings list ──
  const list = document.getElementById('gdpFindingsList');
  document.getElementById('gdpFindingsCount').textContent = errors.length + ' issue' + (errors.length !== 1 ? 's' : '') + ', ' + entries.length + ' entries';

  if (errors.length === 0) {
    list.innerHTML = `<div style="padding:32px 16px;text-align:center;color:var(--green);font-size:13px">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:8px"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg><br>
      No GDP errors on this page<br><span style="font-size:11px;color:var(--dim)">${escHtml(page.description || '')}</span>
    </div>`;
  } else {
    list.innerHTML = errors.map((err, i) => {
      const tc = getGdpTypeClass(err.type);
      const entryForError = entries.find(e => e.id === err.entryId);
      const currentText = entryForError?.manuallyCorrected ? entryForError.text : (entryForError?.text || '');
      const findingId = err.findingId || '';

      return `<div class="gdp-finding-card" id="gdpFinding${i}" onclick="gdpSelectError(${i})">
        <div class="gdp-finding-top">
          <span class="gdp-finding-num ${err.severity || 'minor'}">${i + 1}</span>
          <span class="gdp-finding-type ${tc}">${escHtml(err.type || 'GDP')}</span>
          <span class="gdp-finding-sev">${escHtml(err.severity || '')}</span>
          ${entryForError?.manuallyCorrected ? '<span class="gdp-corrected-badge">Corrected</span>' : ''}
        </div>
        <div class="gdp-finding-title">${escHtml(err.title || 'GDP Issue')}</div>
        <div class="gdp-finding-loc">${escHtml(err.location || '')}</div>
        <div class="gdp-finding-detail">
          <div class="gdp-finding-desc">${escHtml(err.description || '')}</div>
          ${currentText ? `<div class="gdp-transcription-box">
            <div style="flex:1"><span style="color:var(--dim);font-size:9px">Transcription:</span><br>
            <span id="gdpFindingText${i}">${escHtml(currentText)}</span></div>
            ${isEditable && findingId ? `<button class="gdp-edit-btn" onclick="event.stopPropagation();gdpEditFinding(${i},'${findingId}')">Edit</button>` : ''}
          </div>` : ''}
          <div class="gdp-finding-fix"><strong>Correction:</strong> ${escHtml(err.correction || 'Review and correct per GDP standards.')}</div>
        </div>
      </div>`;
    }).join('');
  }

  // Tour label
  document.getElementById('gdpTourLabel').textContent = errors.length ? `0 / ${errors.length}` : 'No issues';
  document.getElementById('gdpTourPrev').disabled = true;
  document.getElementById('gdpTourNext').disabled = errors.length === 0;
}

function gdpSwitchPage(idx) {
  if (_gdpTourTimer) { clearInterval(_gdpTourTimer); _gdpTourTimer = null;
    document.getElementById('gdpTourAuto').classList.remove('playing'); }
  gdpRenderPage(idx);
}

function gdpOnImgLoad() {
  // Fit image to viewer on load
  gdpZoomFit();
}

// ── Select / highlight an error ──
function gdpSelectError(idx) {
  const page = _gdpData.pages[_gdpActivePage];
  const errors = page.errors || [];
  if (idx < 0 || idx >= errors.length) return;

  // Toggle expand if clicking same
  if (_gdpActiveError === idx) {
    const card = document.getElementById('gdpFinding' + idx);
    if (card) card.classList.toggle('expanded');
    return;
  }

  _gdpActiveError = idx;

  // Clear all active states
  document.querySelectorAll('.gdp-anno.active').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.gdp-finding-card.active').forEach(el => { el.classList.remove('active'); el.classList.remove('expanded'); });

  // Activate annotation box
  const anno = document.getElementById('gdpAnno' + idx);
  if (anno) {
    anno.classList.add('active');
    // Scroll image viewer to center on the annotation
    const viewer = document.getElementById('gdpViewer');
    const err = errors[idx];
    if (err.bbox) {
      const cx = (err.bbox.x + err.bbox.w / 2) / 100;
      const cy = (err.bbox.y + err.bbox.h / 2) / 100;
      const inner = document.getElementById('gdpInner');
      if (inner) {
        const scrollX = cx * inner.offsetWidth - viewer.clientWidth / 2;
        const scrollY = cy * inner.offsetHeight - viewer.clientHeight / 2;
        viewer.scrollTo({ left: Math.max(0, scrollX), top: Math.max(0, scrollY), behavior: 'smooth' });
      }
    }
  }

  // Activate finding card
  const card = document.getElementById('gdpFinding' + idx);
  if (card) {
    card.classList.add('active');
    card.classList.add('expanded');
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Update tour label
  document.getElementById('gdpTourLabel').textContent = `${idx + 1} / ${errors.length}`;
  document.getElementById('gdpTourPrev').disabled = idx <= 0;
  document.getElementById('gdpTourNext').disabled = idx >= errors.length - 1;
}

// ── Tour navigation ──
export function gdpTourPrev() {
  if (_gdpActiveError > 0) gdpSelectError(_gdpActiveError - 1);
}

export function gdpTourNext() {
  const errors = (_gdpData?.pages[_gdpActivePage]?.errors || []);
  if (_gdpActiveError < errors.length - 1) gdpSelectError(_gdpActiveError + 1);
  else if (_gdpActiveError === -1 && errors.length) gdpSelectError(0);
}

export function gdpTourToggleAuto() {
  const btn = document.getElementById('gdpTourAuto');
  if (_gdpTourTimer) {
    clearInterval(_gdpTourTimer);
    _gdpTourTimer = null;
    btn.classList.remove('playing');
    return;
  }
  btn.classList.add('playing');
  const errors = (_gdpData?.pages[_gdpActivePage]?.errors || []);
  if (!errors.length) return;
  if (_gdpActiveError < 0) gdpSelectError(0);
  _gdpTourTimer = setInterval(() => {
    const errs = (_gdpData?.pages[_gdpActivePage]?.errors || []);
    if (_gdpActiveError >= errs.length - 1) {
      // Move to next page if available
      if (_gdpActivePage < _gdpData.pages.length - 1) {
        gdpSwitchPage(_gdpActivePage + 1);
        setTimeout(() => { if ((_gdpData.pages[_gdpActivePage]?.errors || []).length) gdpSelectError(0); }, 400);
      } else {
        clearInterval(_gdpTourTimer); _gdpTourTimer = null;
        btn.classList.remove('playing');
      }
    } else {
      gdpSelectError(_gdpActiveError + 1);
    }
  }, 3500);
}

// ── Zoom ──
function _gdpApplyZoom() {
  const inner = document.getElementById('gdpInner');
  const img = document.getElementById('gdpPageImg');
  if (!inner || !img || !img.naturalWidth) return;
  const w = Math.round(img.naturalWidth * _gdpZoomScale);
  inner.style.width = w + 'px';
  document.getElementById('gdpZoomLevel').textContent = Math.round(_gdpZoomScale * 100) + '%';
}

export function gdpZoom(dir) {
  _gdpZoomScale = Math.max(0.25, Math.min(3, _gdpZoomScale + dir * 0.15));
  _gdpApplyZoom();
}

export function gdpZoomFit() {
  const viewer = document.getElementById('gdpViewer');
  const img = document.getElementById('gdpPageImg');
  if (!img || !img.naturalWidth) { _gdpZoomScale = 1; return; }
  const padH = 16, padW = 16;
  const scaleW = (viewer.clientWidth - padW) / img.naturalWidth;
  const scaleH = (viewer.clientHeight - padH) / img.naturalHeight;
  _gdpZoomScale = Math.min(scaleW, scaleH);
  _gdpApplyZoom();
}

function getGdpTypeClass(type) {
  if (!type) return 'other';
  const t = type.toUpperCase();
  if (t === 'EE' || t.includes('ERRONEOUS')) return 'ee';
  if (t === 'LE' || t.includes('LATE')) return 'le';
  if (t === 'IE' || t.includes('INCOMPLETE')) return 'ie';
  if (t === 'CE' || t.includes('CORRECTION')) return 'ce';
  return 'other';
}

/* ── GDP EXPORT TO DOC BUILDER ── */
async function exportGdpToBuilder() {
  if (!_gdpData || !_gdpImages.length) return;

  const exportBtn = document.getElementById('gdpExportBtn');
  if (exportBtn) { exportBtn.disabled = true; exportBtn.textContent = 'Exporting\u2026'; }

  // Progress overlay
  const ov = document.createElement('div');
  ov.className = 'gdp-export-overlay';
  ov.innerHTML = `
    <div class="gdp-export-card">
      <div class="gdp-export-title">Exporting to Doc Builder</div>
      <div class="gdp-export-bar"><div class="gdp-export-fill" id="gdpExpFill"></div></div>
      <div class="gdp-export-label" id="gdpExpLabel">Identifying document IDs\u2026</div>
    </div>`;
  document.body.appendChild(ov);
  const fill = document.getElementById('gdpExpFill');
  const label = document.getElementById('gdpExpLabel');

  try {
    // 1. Identify doc IDs via server
    fill.style.width = '8%';
    const images = _gdpImages.map((img, i) => ({
      base64: img.base64, mimeType: img.mimeType, pageNumber: i + 1
    }));

    const idRes = await authFetch(SERVER + '/gdp/identify-docs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images })
    });
    if (!idRes.ok) throw new Error('Document identification failed');
    const idData = await idRes.json();

    fill.style.width = '40%';
    label.textContent = 'Organising by document\u2026';

    // 2. Group pages by detected document ID
    const groups = {};
    idData.pages.forEach((pg, idx) => {
      const key = pg.documentId || '_unidentified';
      if (!groups[key]) {
        groups[key] = {
          docId: pg.documentId,
          docTitle: pg.documentTitle || pg.documentId || 'Unidentified Pages',
          pages: []
        };
      }
      groups[key].pages.push({
        pageNumber: pg.pageNumber,
        pageTitle: pg.pageTitle || `Page ${pg.pageNumber}`,
        imageIdx: idx,
        gdpPage: _gdpData.pages[idx] || null,
        confidence: pg.confidence
      });
    });

    const groupKeys = Object.keys(groups);
    fill.style.width = '50%';
    label.textContent = `Found ${groupKeys.length} document(s). Storing images\u2026`;

    // 3. Open shared IndexedDB (same DB the builder uses)
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('vent_media', 1);
      req.onupgradeneeded = e => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains('files')) {
          const store = d.createObjectStore('files', { keyPath: 'id' });
          store.createIndex('stepId', 'stepId', { unique: false });
          store.createIndex('docId', 'docId', { unique: false });
        }
      };
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(e.target.error);
    });

    // 4. Build manifest + store images in IndexedDB
    const transferId = 'gdp-' + Date.now();
    const manifest = {
      transferId,
      documents: [],
      gdpSummary: {
        totalErrors: _gdpData.totalErrors,
        criticalCount: _gdpData.criticalCount,
        majorCount: _gdpData.majorCount,
        minorCount: _gdpData.minorCount,
        recommendations: _gdpData.recommendations || []
      }
    };

    let stored = 0;
    const total = _gdpImages.length;

    for (const key of groupKeys) {
      const group = groups[key];
      const clientId = 'doc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      const docEntry = {
        clientId,
        docId: group.docId,
        title: group.docTitle,
        steps: []
      };

      for (const page of group.pages) {
        const stepId = 'step-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
        const img = _gdpImages[page.imageIdx];
        const mediaId = 'media-' + transferId + '-' + page.pageNumber;

        // Write image to IndexedDB
        await new Promise((resolve, reject) => {
          const tx = db.transaction('files', 'readwrite');
          tx.objectStore('files').put({
            id: mediaId,
            docId: clientId,
            stepId: stepId,
            name: img.name || `Page_${page.pageNumber}.jpg`,
            mimeType: img.mimeType || 'image/jpeg',
            size: Math.ceil(img.base64.length * 0.75),
            data: img.dataUrl
          });
          tx.oncomplete = () => resolve();
          tx.onerror = e => reject(e.target.error);
        });

        stored++;
        fill.style.width = (50 + (stored / total) * 40) + '%';
        label.textContent = `Storing image ${stored} of ${total}\u2026`;

        // Build step from GDP findings
        const gp = page.gdpPage;
        let errText = 'No GDP issues detected.';
        if (gp && gp.errors && gp.errors.length) {
          errText = gp.errors.map(e =>
            `[${e.type || 'GDP'}/${e.severity}] ${e.title}: ${e.description}${e.correction ? ' \u2192 ' + e.correction : ''}`
          ).join('\n');
        }

        docEntry.steps.push({
          id: stepId,
          title: page.pageTitle || `Page ${page.pageNumber}`,
          content: gp?.description || `Batch record page ${page.pageNumber}`,
          note: errText,
          gdpErrors: gp?.errors || [],
          gdpEntries: gp?.entries || []
        });
      }

      manifest.documents.push(docEntry);
    }

    fill.style.width = '95%';
    label.textContent = 'Opening Doc Builder\u2026';

    // 5. Store manifest in sessionStorage and open builder
    sessionStorage.setItem('vent_gdp_export', JSON.stringify(manifest));
    await new Promise(r => setTimeout(r, 350));
    fill.style.width = '100%';

    window.open('builder.html', '_blank');
    ov.remove();

    if (exportBtn) {
      exportBtn.disabled = false;
      exportBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> Export to Doc Builder`;
    }

  } catch (err) {
    console.error('GDP export error:', err);
    ov.remove();
    alert('Export failed: ' + err.message);
    if (exportBtn) {
      exportBtn.disabled = false;
      exportBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> Export to Doc Builder`;
    }
  }
}

/* ── GDP HISTORY ── */
let _gdpHistoryOpen = false;

export async function toggleGdpHistory() {
  if (_gdpHistoryOpen) {
    document.getElementById('gdpHistoryPanel')?.remove();
    _gdpHistoryOpen = false;
    return;
  }
  _gdpHistoryOpen = true;

  const panel = document.createElement('div');
  panel.id = 'gdpHistoryPanel';
  panel.style.cssText = 'position:absolute;top:50px;right:60px;width:380px;background:var(--s1);border:1px solid var(--border);border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.5);z-index:500;';
  panel.innerHTML = '<div style="padding:12px 16px;border-bottom:1px solid var(--border);font-size:13px;color:var(--text);font-weight:400">GDP Check History</div><div class="gdp-history-list" id="gdpHistoryList"><div style="padding:24px;text-align:center;color:var(--dim);font-size:11px">Loading\u2026</div></div>';
  document.querySelector('.gdp-modal').appendChild(panel);

  // Close when clicking outside
  panel.addEventListener('click', e => e.stopPropagation());

  try {
    const res = await authFetch(`${SERVER}/api/gdp/documents`);
    const docs = await res.json();
    const list = document.getElementById('gdpHistoryList');

    if (!docs.length) {
      list.innerHTML = '<div style="padding:24px;text-align:center;color:var(--dim);font-size:11px">No previous GDP checks</div>';
      return;
    }

    list.innerHTML = docs.map(d => `
      <div class="gdp-history-item" onclick="loadGdpDocument('${d.id}')">
        <div style="min-width:0">
          <div class="gdp-history-item-title">${escHtml(d.filename)}</div>
          <div class="gdp-history-item-meta">${d.page_count} page${d.page_count !== 1 ? 's' : ''} &middot; ${new Date(d.created_at).toLocaleDateString()}</div>
        </div>
        <div class="gdp-history-item-stats">
          ${d.critical_count ? '<span class="gdp-history-item-badge" style="background:var(--red2);color:var(--red)">' + d.critical_count + 'C</span>' : ''}
          ${d.major_count ? '<span class="gdp-history-item-badge" style="background:var(--gold2);color:var(--gold)">' + d.major_count + 'M</span>' : ''}
          ${d.minor_count ? '<span class="gdp-history-item-badge" style="background:var(--blue2);color:var(--accent)">' + d.minor_count + 'm</span>' : ''}
          ${d.total_errors === 0 ? '<span class="gdp-history-item-badge" style="background:rgba(78,201,176,.12);color:var(--green)">Clear</span>' : ''}
          <span class="gdp-review-badge ${d.review_status}">${(d.review_status || 'pending_review').replace('_', ' ')}</span>
        </div>
      </div>`
    ).join('');
  } catch (err) {
    document.getElementById('gdpHistoryList').innerHTML = '<div style="padding:24px;text-align:center;color:var(--red);font-size:11px">Failed to load history</div>';
  }
}

async function loadGdpDocument(docId) {
  document.getElementById('gdpHistoryPanel')?.remove();
  _gdpHistoryOpen = false;

  document.getElementById('gdpUploadSection').style.display = 'none';
  document.getElementById('gdpReviewSplit').style.display = 'none';
  document.getElementById('gdpLoading').style.display = 'flex';
  document.getElementById('gdpLoadingPage').textContent = 'Loading saved check\u2026';

  try {
    const res = await authFetch(`${SERVER}/api/gdp/documents/${docId}`);
    if (!res.ok) throw new Error('Failed to load');
    const data = await res.json();

    _gdpData = data;
    _gdpData.documentId = docId;
    _gdpImages = [];
    renderGdpReview();
  } catch (err) {
    document.getElementById('gdpLoading').style.display = 'none';
    document.getElementById('gdpUploadSection').style.display = 'flex';
    alert('Failed to load GDP check: ' + err.message);
  }
}

/* ── GDP CORRECTION WORKFLOW ── */
function gdpEditFinding(errorIdx, findingId) {
  if (!findingId || !_gdpData.documentId) return;

  const page = _gdpData.pages[_gdpActivePage];
  const err = (page.errors || [])[errorIdx];
  const entry = (page.entries || []).find(e => e.id === err?.entryId);
  const currentText = entry?.manuallyCorrected ? entry.text : (entry?.text || '');

  const container = document.getElementById('gdpFindingText' + errorIdx)?.closest('.gdp-transcription-box');
  if (!container) return;

  container.innerHTML = `
    <div style="width:100%">
      <span style="color:var(--dim);font-size:9px">Edit transcription:</span><br>
      <textarea id="gdpEditArea${errorIdx}" style="width:100%;min-height:40px;background:var(--s3);border:1px solid var(--gold);border-radius:4px;color:var(--text);font-size:11px;font-family:'JetBrains Mono',monospace;padding:6px;resize:vertical;margin-top:4px">${escHtml(currentText)}</textarea>
      <div style="display:flex;gap:6px;margin-top:4px">
        <button onclick="event.stopPropagation();gdpSaveCorrection(${errorIdx},'${findingId}')" style="background:var(--gold);color:#1a1a1a;border:none;border-radius:4px;font-size:10px;padding:4px 12px;cursor:pointer;font-family:inherit">Save</button>
        <button onclick="event.stopPropagation();gdpCancelEdit()" style="background:none;border:1px solid var(--border);color:var(--mid);border-radius:4px;font-size:10px;padding:4px 12px;cursor:pointer;font-family:inherit">Cancel</button>
      </div>
    </div>`;
  document.getElementById('gdpEditArea' + errorIdx)?.focus();
}

function gdpCancelEdit() {
  gdpRenderPage(_gdpActivePage);
}

async function gdpSaveCorrection(errorIdx, findingId) {
  const textarea = document.getElementById('gdpEditArea' + errorIdx);
  if (!textarea) return;
  const newText = textarea.value.trim();

  try {
    const res = await authFetch(`${SERVER}/api/gdp/documents/${_gdpData.documentId}/findings/${findingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ corrected_text: newText })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Save failed');
    }

    // Update local data
    const page = _gdpData.pages[_gdpActivePage];
    const err = (page.errors || [])[errorIdx];
    const entry = (page.entries || []).find(e => e.id === err?.entryId);
    if (entry) {
      entry.text = newText;
      entry.manuallyCorrected = true;
    }

    gdpRenderPage(_gdpActivePage);
  } catch (err) {
    alert('Failed to save correction: ' + err.message);
  }
}

/* ── GDP REVIEW STATUS ── */
async function gdpSetReviewStatus(status) {
  if (!_gdpData?.documentId) return;
  try {
    const res = await authFetch(`${SERVER}/api/gdp/documents/${_gdpData.documentId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ review_status: status })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Status update failed');
    }
    _gdpData.review_status = status;
    // Re-render action bar to update button states
    renderGdpReview();
  } catch (err) {
    alert('Failed to update status: ' + err.message);
  }
}

function buildVisionHtml(v) {
  if (!v) return '';
  let html = '<div class="vision-detail">';
  html += '<div class="vision-detail-label">Image Analysis</div>';

  if (v.equipment) {
    html += '<div class="vision-detail-row"><span class="vision-detail-key">Equipment</span><span class="vision-detail-val">' + escHtml(v.equipment) + '</span></div>';
  }
  if (v.error) {
    html += '<div class="vision-detail-row"><span class="vision-detail-key">Error</span><span class="vision-detail-val" style="color:var(--red)">' + escHtml(v.error) + '</span></div>';
  }
  if (v.condition) {
    html += '<div class="vision-detail-row"><span class="vision-detail-key">Condition</span><span class="vision-detail-val">' + escHtml(v.condition) + '</span></div>';
  }
  if (v.readings && v.readings.length) {
    v.readings.forEach(r => {
      html += '<div class="vision-detail-row"><span class="vision-detail-key">' + escHtml(r.parameter) + '</span><span class="vision-detail-val" style="font-family:JetBrains Mono,monospace;color:var(--teal)">' + escHtml(r.value) + ' ' + escHtml(r.unit || '') + '</span></div>';
    });
  }

  html += '</div>';
  return html;
}

// Expose functions that are called from inline onclick in dynamic HTML (GDP internal)
// These remain on window because they are generated deep inside renderGdpReview/renderGdpPage
window.gdpSwitchPage = gdpSwitchPage;
window.gdpSelectError = gdpSelectError;
window.gdpOnImgLoad = gdpOnImgLoad;
window.gdpEditFinding = gdpEditFinding;
window.gdpCancelEdit = gdpCancelEdit;
window.gdpSaveCorrection = gdpSaveCorrection;
window.gdpSetReviewStatus = gdpSetReviewStatus;
window.resetGdpModal = resetGdpModal;
window.exportGdpToBuilder = exportGdpToBuilder;
window.loadGdpDocument = loadGdpDocument;
