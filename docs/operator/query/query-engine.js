async function runQuery() {
  // If there's an image attached, route to visual query
  if (_camImageData) {
    return runVisualQuery();
  }

  const q    = qInput.value.trim();
  const area = document.getElementById('areaSelect').value;
  if (!q) return;

  // Hide empty state
  document.getElementById('emptyState').style.display = 'none';

  // Clear input
  qInput.value = '';
  qInput.style.height = 'auto';

  // Disable button while loading
  const btn = document.getElementById('sendBtn');
  btn.disabled = true;

  // Append the question bubble
  const thinkTs = Date.now();
  const turn = document.createElement('div');
  turn.className = 'chat-turn';
  turn.innerHTML = `
    <div class="turn-q-meta">${area}</div>
    <div class="turn-q"><div class="turn-q-bubble">${escHtml(q)}</div></div>
    <div class="thinking" id="thinking-${thinkTs}">
      <div class="think-dots">
        <div class="think-dot"></div><div class="think-dot"></div><div class="think-dot"></div>
      </div>
      <span class="think-text">Searching SOPs…</span>
    </div>`;

  const inner = document.getElementById('chatInner');
  inner.appendChild(turn);
  scrollToBottom();

  const thinkId = `thinking-${thinkTs}`;

  // Multi-stage loading progression
  const thinkStages = [
    setTimeout(() => { const t = document.querySelector(`#${thinkId} .think-text`); if(t){ t.classList.add('switching'); setTimeout(()=>{ t.textContent='Analysing context…'; t.classList.remove('switching'); },150); }}, 1200),
    setTimeout(() => { const t = document.querySelector(`#${thinkId} .think-text`); if(t){ t.classList.add('switching'); setTimeout(()=>{ t.textContent='Generating answer…'; t.classList.remove('switching'); },150); }}, 3000),
  ];

  // Add user message to conversation history
  _chatHistory.push({ role: 'user', content: q, area });

  const _queryAbort = new AbortController();
  const _queryTimeout = setTimeout(() => _queryAbort.abort(), 60000);

  try {
    const res  = await authFetch(`${SERVER}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q, area, history: _chatHistory.slice(0, -1) }),
      signal: _queryAbort.signal
    });
    clearTimeout(_queryTimeout);
    const data = await res.json();
    thinkStages.forEach(clearTimeout);
    if (!res.ok) throw new Error(data.error || 'Query failed');

    // Add assistant response to conversation history (include full response for replay)
    _chatHistory.push({
      role: 'assistant',
      summary: data.summary || '',
      diagramHint: data.diagramHint || '',
      fullResponse: data
    });

    // Replace thinking indicator with answer
    const thinkEl = document.getElementById(thinkId);
    thinkEl.outerHTML = buildAnswerHtml(data);

    // Auto-save session after each exchange
    await saveCurrentSession();

    // Render relevant PDF pages inline — use diagramHint if available
    if (data.sources && data.sources.length) {
      renderPdfPages(data.sources, q, data.diagramHint);
    }

  } catch (err) {
    clearTimeout(_queryTimeout);
    thinkStages.forEach(clearTimeout);
    // Remove the failed user message from history so retry works cleanly
    _chatHistory.pop();
    const thinkEl = document.getElementById(thinkId);
    const retryQ = escHtml(q).replace(/'/g, '&#39;');
    thinkEl.outerHTML = `<div class="answer-card"><div class="answer-body">
      <div class="error-card">
        <div class="error-card-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
        <div class="error-card-msg">${escHtml(err.message)}</div>
        <div class="error-card-actions">
          <button class="retry-btn" onclick="retryQuery('${retryQ}')">Retry</button>
          <button class="retry-btn" style="border-color:var(--border);color:var(--mid)" onclick="startNewChat()">New chat</button>
        </div>
      </div>
    </div></div>`;
  } finally {
    btn.disabled = false;
    scrollToBottom();
  }
}

function retryQuery(q) {
  const input = document.getElementById('qInput');
  input.value = q;
  input.dispatchEvent(new Event('input'));
  runQuery();
}

function buildAnswerHtml(d) {
  const catMap = {
    procedure:      { label: 'Step-by-step procedure', cls: 'cat-proc',  icon: '≡' },
    specification:  { label: 'Specification / parameter', cls: 'cat-spec', icon: '◈' },
    troubleshooting:{ label: 'Troubleshooting guide',   cls: 'cat-fault', icon: '⚡' },
    general:        { label: 'General information',     cls: 'cat-gen',   icon: '○' }
  };
  const cat = catMap[d.category] || catMap.general;

  let body = '';

  // Warnings first
  if (d.warnings && d.warnings.length) {
    body += d.warnings.map(w => `
      <div class="warning-block">
        <svg class="warn-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        ${escHtml(w)}
      </div>`).join('');
  }

  // Steps
  if (d.steps && d.steps.length) {
    body += `<div class="section-head"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>Procedure steps</div>`;
    body += d.steps.map(s => {
      const nc   = s.critical ? 'sn-critical' : 'sn-normal';
      const badge = s.critical ? `<span class="crit-badge">⚠ Critical</span>` : '';
      const val  = s.value ? `<div><span class="step-val">Target: ${escHtml(s.value)}</span></div>` : '';
      const det  = s.detail ? `<div class="step-detail">${escHtml(s.detail)}</div>` : '';
      return `<div class="step-row">
        <div class="step-n ${nc}">${s.n}</div>
        <div class="step-body-txt">
          <div class="step-action">${escHtml(s.action)}${badge}</div>
          ${det}${val}
        </div>
      </div>`;
    }).join('');
  }

  // Parameters
  if (d.params && d.params.length) {
    body += `<div class="section-head"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/></svg>Process parameters</div>
    <div class="params-grid">` +
    d.params.map(p => {
      const rng = p.range ? `<div class="pt-range">Range: ${escHtml(p.range)}</div>` : '';
      return `<div class="param-tile ${p.flag === 'critical' ? 'crit' : ''}">
        <div class="pt-name">${escHtml(p.name)}</div>
        <div class="pt-value">${escHtml(p.value)}</div>
        <div class="pt-unit">${escHtml(p.unit || '')}</div>
        ${rng}
      </div>`;
    }).join('') + `</div>`;
  }

  // Notes
  if (d.notes && d.notes.length) {
    body += `<div class="section-head"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Notes</div>`;
    body += d.notes.map(n => `<div class="note-row"><span style="color:var(--dim);flex-shrink:0">–</span>${escHtml(n)}</div>`).join('');
  }

  // Sources section
  let srcHtml = '';
  if (d.sources && d.sources.length) {
    srcHtml = `<div class="source-section">
      <div class="section-head" style="margin-top:0">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        Source sections — click to read
      </div>
      <div class="source-list">` +
      d.sources.map((s, i) => {
        const uid = `src-${Date.now()}-${i}`;
        return `
        <div>
          <div class="source-item-row">
            <span class="src-code">${escHtml(s.code)}</span>
            <span class="src-title">${escHtml(s.title)}</span>
            <span class="src-section">§ ${escHtml(s.section)}</span>
            <button class="src-expand-btn" onclick="toggleSrc(this, '${escHtml(s.code)}', '${escHtml(s.section)}', '${uid}')">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              Read
            </button>
          </div>
          <div id="${uid}" style="display:none"></div>
        </div>`;
      }).join('') +
      `</div></div>`;
  }

  const cardId = `ans-${Date.now()}`;
  // Store answer data on window for copy/export/bookmark
  if (!window._answerData) window._answerData = {};
  window._answerData[cardId] = d;

  // Follow-up chips
  let followHtml = '';
  if (d.followUps && d.followUps.length) {
    followHtml = `<div class="follow-ups">
      <div class="follow-ups-label"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>Continue exploring</div>
      <div class="follow-up-chips">${d.followUps.map((f, i) =>
        `<div class="follow-up-chip" style="animation-delay:${400 + i * 120}ms" onclick="fillAndSend('${escHtml(f).replace(/'/g, "&#39;")}')">${escHtml(f)}</div>`
      ).join('')}</div>
    </div>`;
  }

  // Action bar
  const isBookmarked = isAnswerBookmarked(cardId);
  const actionsHtml = `<div class="answer-actions">
    <button class="answer-act-btn" onclick="copyAnswer('${cardId}')" title="Copy answer">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      <span>Copy</span>
    </button>
    <button class="answer-act-btn" onclick="exportAnswerToDoc('${cardId}')" title="Export to Doc Builder">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
      <span>Export</span>
    </button>
    <div class="answer-actions-sep"></div>
    <button class="bookmark-btn${isBookmarked ? ' active' : ''}" id="bm-${cardId}" onclick="toggleBookmark('${cardId}')" title="Pin answer">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
    </button>
    <button class="feedback-btn" id="fb-up-${cardId}" onclick="feedbackAnswer('${cardId}','up')" title="Helpful">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
    </button>
    <button class="feedback-btn" id="fb-down-${cardId}" onclick="feedbackAnswer('${cardId}','down')" title="Not helpful">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>
    </button>
  </div>`;

  return `
  <div class="answer-card" id="${cardId}">
    <div class="answer-head">
      <div class="answer-cat-icon ${cat.cls}">${cat.icon}</div>
      <div class="answer-cat-label">${cat.label}</div>
    </div>
    <div class="answer-body">
      <div class="answer-summary">${escHtml(d.summary)}</div>
      ${body}
      <div class="pdf-pages-section" data-card-id="${cardId}"></div>
    </div>
    ${srcHtml}
    ${actionsHtml}
    ${followHtml}
  </div>`;
}

async function toggleSrc(btn, docId, section, uid) {
  const box = document.getElementById(uid);
  if (!box) return;
  if (box.style.display !== 'none') {
    box.style.display = 'none';
    btn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg> Read`;
    return;
  }

  btn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg> Hide`;
  box.style.display = 'block';

  if (box.dataset.loaded) return;
  box.dataset.loaded = '1';
  box.innerHTML = `<div class="sop-content-box"><div style="color:var(--dim);font-size:12px">Loading section…</div></div>`;

  try {
    const url = `${SERVER}/sop/${encodeURIComponent(docId)}/chunk?section=${encodeURIComponent(section)}`;
    const res  = await authFetch(url);
    const data = await res.json();

    if (!data || !data.content) {
      box.innerHTML = `<div class="sop-content-box"><div style="color:var(--dim);font-size:12px">Section content not available.</div></div>`;
      return;
    }

    const rendered = renderSopMarkdown(data.content);
    const figures  = extractFigureRefs(data.content);

    let figHtml = figures.map(f => `
      <div class="fig-callout">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:2px"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        <div>
          <div class="fig-label">Referenced document</div>
          <div class="fig-name">${escHtml(f)}</div>
          <div class="fig-note">Verify against physical document in Document Management System</div>
        </div>
      </div>`).join('');

    box.innerHTML = `
      <div class="sop-content-box">
        <div class="sop-section-label">${docId} · ${data.section_title}</div>
        <div class="sop-md">${rendered}</div>
        ${figHtml}
      </div>`;
  } catch (err) {
    box.innerHTML = `<div class="sop-content-box"><div style="color:var(--red);font-size:12px">Failed to load section.</div></div>`;
  }
}

// ── MARKDOWN RENDERER ──
function renderSopMarkdown(md) {
  let out = md;

  // Tables: find blocks of pipe-separated lines
  out = out.replace(/((?:\|.+\|\n?)+)/g, (block) => {
    const rows = block.trim().split('\n').filter(r => r.trim());
    if (rows.length < 2) return block;
    let html = '<table>';
    rows.forEach((row, i) => {
      if (/^\|[-| ]+\|$/.test(row.trim())) return; // separator row
      const cells = row.split('|').filter((_, j, arr) => j > 0 && j < arr.length - 1);
      if (i === 0) {
        html += '<tr>' + cells.map(c => `<th>${renderInline(c.trim())}</th>`).join('') + '</tr>';
      } else {
        html += '<tr>' + cells.map(c => `<td>${renderInline(c.trim())}</td>`).join('') + '</tr>';
      }
    });
    html += '</table>';
    return html;
  });

  // Code blocks
  out = out.replace(/```[\s\S]*?```/g, m => `<pre style="background:var(--s3);padding:10px 12px;border-radius:7px;font-family:'JetBrains Mono',monospace;font-size:11px;overflow-x:auto;margin:8px 0">${escHtml(m.replace(/```\w*\n?/g, ''))}</pre>`);

  // Blockquotes
  out = out.replace(/^> (.+)/gm, '<blockquote>$1</blockquote>');

  // Headers
  out = out.replace(/^#{4} (.+)/gm, '<h5>$1</h5>');
  out = out.replace(/^#{3} (.+)/gm, '<h4>$1</h4>');
  out = out.replace(/^#{1,2} (.+)/gm, '');  // strip top-level headers (usually doc title)

  // Inline
  out = renderInline(out);

  // Paragraphs / line breaks
  out = out.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>');
  out = '<p>' + out + '</p>';

  return out;
}

function renderInline(txt) {
  return escHtml(txt)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

// Extract figure / drawing references from SOP content
function extractFigureRefs(content) {
  const refs = new Set();
  const patterns = [
    /\b(AD-[\w-]+)\b/g,       // Assembly drawings: AD-UP-001
    /\b(IQ-[\w-]+)\b/g,       // IQ/OQ docs
    /Figure\s+\d+/gi,         // Figure 1, Figure 3 etc
    /\bSDS-[\w-]+\b/g,        // Safety data sheets
    /drawing\s+([\w-]+)/gi,   // "drawing AD-UP-001"
  ];
  patterns.forEach(p => {
    const m = content.match(p);
    if (m) m.forEach(r => refs.add(r.trim()));
  });
  return [...refs].slice(0, 5); // max 5 refs
}

// ── PDF PAGE RENDERER (pdf.js client-side) ──
let _pdfjsLib = null;
let _pdfDocCache = {};    // cache loaded PDFs by URL
let _pageIndexCache = {}; // cache page index by docId

async function getPdfjsLib() {
  if (_pdfjsLib) return _pdfjsLib;
  _pdfjsLib = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs');
  _pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';
  return _pdfjsLib;
}

async function getPageIndex(docId) {
  if (_pageIndexCache[docId]) return _pageIndexCache[docId];
  try {
    const res = await authFetch(`${SERVER}/manual/${encodeURIComponent(docId)}/pages`);
    const data = await res.json();
    _pageIndexCache[docId] = data;
    return data;
  } catch { return { sections: [], keywords: {} }; }
}

async function getPdfDoc(docId) {
  const url = `${SERVER}/manuals/${encodeURIComponent(docId)}.pdf`;
  if (_pdfDocCache[url]) return _pdfDocCache[url];
  const pdfjsLib = await getPdfjsLib();
  const doc = await pdfjsLib.getDocument(url).promise;
  _pdfDocCache[url] = doc;
  return doc;
}

function findRelevantPages(pageIndex, sources, query) {
  const diagramSet = new Set(pageIndex.diagramPages || []);
  const diagramHits = new Set();
  const textHits = new Set();
  const qLower = query.toLowerCase();

  // Detect if user is asking for visual content
  const wantsVisual = /picture|image|photo|diagram|show\s*me|what does.*look|visual|figure|illustrat|display|screen/i.test(query);

  // 1. Match query keywords → diagram-keyword index (best quality)
  for (const [term, page] of Object.entries(pageIndex.keywordDiagrams || {})) {
    if (qLower.includes(term)) diagramHits.add(page);
  }

  // 2. Match query keywords → regular keyword index
  for (const [term, page] of Object.entries(pageIndex.keywords || {})) {
    if (qLower.includes(term)) {
      if (diagramSet.has(page)) diagramHits.add(page);
      else textHits.add(page);
    }
  }

  // 3. Match source sections → page index (use both section ref AND title)
  for (const src of sources) {
    // Combine section + title for more matching surface
    const combined = ((src.section || '') + ' ' + (src.title || '')).toLowerCase();
    const secWords = combined.replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 2);

    // Also try to match section numbers like "2.1" against page index "2 Introduction..."
    const secNumMatch = (src.section || '').match(/^(\d+)/);
    const secNum = secNumMatch ? secNumMatch[1] : null;

    for (const entry of pageIndex.sections || []) {
      const entryLower = entry.section.toLowerCase();

      // Section number prefix match (e.g. source "2.1" matches entry "2 Introduction...")
      if (secNum) {
        const entryNumMatch = entryLower.match(/^(\d+)/);
        if (entryNumMatch && entryNumMatch[1] === secNum) {
          if (diagramSet.has(entry.page)) diagramHits.add(entry.page);
          else textHits.add(entry.page);
          continue;
        }
      }

      // Word fuzzy matching
      const matchCount = secWords.filter(w => entryLower.includes(w)).length;
      if (matchCount >= 2 || (secWords.length <= 2 && matchCount >= 1)) {
        if (diagramSet.has(entry.page)) diagramHits.add(entry.page);
        else textHits.add(entry.page);
      }
    }
  }

  // 4. Broader keyword fallback from query words against sections
  if (diagramHits.size === 0 && textHits.size === 0) {
    const qWords = qLower.replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 3);
    for (const entry of pageIndex.sections || []) {
      const entryLower = entry.section.toLowerCase();
      if (qWords.some(w => entryLower.includes(w))) {
        if (diagramSet.has(entry.page)) diagramHits.add(entry.page);
        else textHits.add(entry.page);
      }
    }
  }

  // 5. Find nearest diagram page to any text hit (±20 range)
  if (diagramHits.size === 0 && textHits.size > 0 && diagramSet.size > 0) {
    const diagArray = [...diagramSet].sort((a, b) => a - b);
    for (const tp of textHits) {
      let bestDist = Infinity, bestPage = null;
      for (const dp of diagArray) {
        const dist = Math.abs(dp - tp);
        if (dist <= 20 && dist < bestDist) { bestDist = dist; bestPage = dp; }
      }
      if (bestPage) diagramHits.add(bestPage);
    }
  }

  // 6. Visual fallback: if user asked for images but we found nothing,
  //    show representative diagram pages from the document
  if (diagramHits.size === 0 && wantsVisual && diagramSet.size > 0) {
    const diagArray = [...diagramSet].sort((a, b) => a - b);
    // Pick first 3 content diagram pages (skip early cover/TOC pages)
    const contentDiagrams = diagArray.filter(p => p >= 25);
    for (const p of contentDiagrams.slice(0, 3)) diagramHits.add(p);
  }

  const result = diagramHits.size > 0 ? [...diagramHits] : [...textHits];
  return result.sort((a, b) => a - b).slice(0, 3);
}

async function renderPdfPages(sources, query, diagramHint) {
  // Find which doc IDs have PDFs
  const docIds = [...new Set(sources.map(s => s.code))];

  // Find the container in the most recent answer card
  const containers = document.querySelectorAll('.pdf-pages-section');
  const container = containers[containers.length - 1];
  if (!container) return;

  for (const docId of docIds) {
    try {
      // Get page index for this doc
      const pageIndex = await getPageIndex(docId);
      if (!pageIndex.totalPages) continue;

      // Use diagramHint from Claude for better matching, fall back to raw query
      const searchText = diagramHint || query;
      const pages = findRelevantPages(pageIndex, sources, searchText);
      if (!pages.length) continue;

      // Show loading state
      container.innerHTML = `<div class="section-head" style="margin-top:12px">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        Loading manual pages…
      </div>`;
      scrollToBottom();

      // Load pdf.js and the PDF document
      const pdfDoc = await getPdfDoc(docId);

      container.innerHTML = `<div class="section-head" style="margin-top:12px">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        Manual pages
      </div>
      <div class="pdf-pages-grid"></div>`;

      const grid = container.querySelector('.pdf-pages-grid');

      for (const pageNum of pages) {
        const page = await pdfDoc.getPage(pageNum);
        const scale = 1.8;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        await page.render({ canvasContext: ctx, viewport }).promise;

        const card = document.createElement('div');
        card.className = 'pdf-page-card';
        card.innerHTML = `<div class="pdf-page-label">${escHtml(docId)} <span>Page ${pageNum} of ${pageIndex.totalPages}</span></div>`;
        card.appendChild(canvas);
        grid.appendChild(card);
        scrollToBottom();
      }

      return; // done — rendered pages for this doc
    } catch (err) {
      console.error('PDF render error:', err);
      container.innerHTML = `<div class="note-row" style="margin-top:8px;color:var(--dim);font-size:12px">Could not render manual pages for this source.</div>`;
    }
  }
}

function scrollToBottom() {
  const area = document.getElementById('chatArea');
  setTimeout(() => { area.scrollTop = area.scrollHeight; }, 50);
}

function escHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── COPY ANSWER ──────────────────────────────────────
function copyAnswer(cardId) {
  const d = window._answerData && window._answerData[cardId];
  if (!d) return;

  let text = d.summary || '';
  if (d.steps && d.steps.length) {
    text += '\n\nSteps:\n' + d.steps.map(s =>
      `${s.n}. ${s.action}${s.detail ? ' — ' + s.detail : ''}${s.value ? ' [' + s.value + ']' : ''}${s.critical ? ' (CRITICAL)' : ''}`
    ).join('\n');
  }
  if (d.params && d.params.length) {
    text += '\n\nParameters:\n' + d.params.map(p =>
      `• ${p.name}: ${p.value} ${p.unit || ''}${p.range ? ' (Range: ' + p.range + ')' : ''}`
    ).join('\n');
  }
  if (d.warnings && d.warnings.length) {
    text += '\n\nWarnings:\n' + d.warnings.map(w => `⚠ ${w}`).join('\n');
  }
  if (d.notes && d.notes.length) {
    text += '\n\nNotes:\n' + d.notes.map(n => `– ${n}`).join('\n');
  }
  if (d.sources && d.sources.length) {
    text += '\n\nSources: ' + d.sources.map(s => `${s.code} §${s.section}`).join(', ');
  }

  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector(`#${cardId} .answer-act-btn`);
    if (btn) {
      btn.classList.add('copied');
      const span = btn.querySelector('span');
      const orig = span.textContent;
      span.textContent = 'Copied!';
      setTimeout(() => { btn.classList.remove('copied'); span.textContent = orig; }, 1800);
    }
  }).catch(() => {
    // Fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
  });
}

// ── EXPORT ANSWER TO DOC BUILDER ─────────────────────
function exportAnswerToDoc(cardId) {
  const d = window._answerData && window._answerData[cardId];
  if (!d) return;

  const area = document.getElementById('areaSelect').value || 'General';
  const steps = (d.steps || []).map(s => ({
    title: s.action,
    content: [s.detail, s.value ? `Target: ${s.value}` : ''].filter(Boolean).join('\n') || s.action,
    note: s.critical ? 'CRITICAL STEP — verify before proceeding' : ''
  }));

  if (!steps.length) {
    steps.push({ title: 'Summary', content: d.summary || '', note: '' });
  }

  const doc = {
    title: d.summary ? d.summary.slice(0, 60) + (d.summary.length > 60 ? '…' : '') : 'Exported Answer',
    area,
    description: d.summary || '',
    steps
  };

  sessionStorage.setItem('vent_chat_export', JSON.stringify(doc));
  window.open('builder.html', '_blank');
}

// ── ANSWER FEEDBACK ──────────────────────────────────
function feedbackAnswer(cardId, type) {
  const upBtn = document.getElementById(`fb-up-${cardId}`);
  const downBtn = document.getElementById(`fb-down-${cardId}`);
  if (!upBtn || !downBtn) return;

  const isUp = type === 'up';
  const btn = isUp ? upBtn : downBtn;
  const other = isUp ? downBtn : upBtn;
  const activeClass = isUp ? 'up-active' : 'down-active';
  const otherClass = isUp ? 'down-active' : 'up-active';

  // Toggle
  if (btn.classList.contains(activeClass)) {
    btn.classList.remove(activeClass);
    updateFeedbackInHistory(cardId, null);
  } else {
    btn.classList.add(activeClass);
    btn.classList.add('pop');
    setTimeout(() => btn.classList.remove('pop'), 300);
    other.classList.remove(otherClass);
    updateFeedbackInHistory(cardId, type);
  }
}

function updateFeedbackInHistory(cardId, feedback) {
  // Find the corresponding assistant message in chat history and tag it
  const d = window._answerData && window._answerData[cardId];
  if (!d) return;
  const entry = _chatHistory.find(h => h.role === 'assistant' && h.summary === d.summary);
  if (entry) {
    entry.feedback = feedback;
    saveCurrentSession();
  }
}

// ── BOOKMARKS ────────────────────────────────────────
function getBookmarks() {
  try { return JSON.parse(localStorage.getItem('vent_bookmarks') || '[]'); } catch { return []; }
}
function saveBookmarks(bm) { localStorage.setItem('vent_bookmarks', JSON.stringify(bm)); }

function isAnswerBookmarked(cardId) {
  return getBookmarks().some(b => b.id === cardId);
}

function toggleBookmark(cardId) {
  const d = window._answerData && window._answerData[cardId];
  if (!d) return;
  let bm = getBookmarks();
  const idx = bm.findIndex(b => b.id === cardId);
  const btn = document.getElementById(`bm-${cardId}`);

  if (idx >= 0) {
    bm.splice(idx, 1);
    if (btn) {
      btn.classList.remove('active');
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
    }
  } else {
    const catMap = { procedure:'≡', specification:'◈', troubleshooting:'⚡', general:'○' };
    bm.unshift({
      id: cardId,
      summary: (d.summary || '').slice(0, 120),
      category: d.category || 'general',
      icon: catMap[d.category] || '○',
      timestamp: new Date().toISOString()
    });
    if (btn) {
      btn.classList.add('active');
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
    }
  }
  saveBookmarks(bm);
  renderBookmarks();
}

function renderBookmarks() {
  const bm = getBookmarks();
  const panel = document.getElementById('bookmarksPanel');
  const list = document.getElementById('bookmarksList');
  const count = document.getElementById('bookmarksCount');

  if (!bm.length) {
    panel.style.display = 'none';
    return;
  }

  panel.style.display = 'block';
  count.textContent = bm.length;

  list.innerHTML = bm.map(b => `
    <div class="bookmark-item" onclick="scrollToAnswer('${b.id}')">
      <span class="bookmark-item-icon">${escHtml(b.icon)}</span>
      <span class="bookmark-item-text">${escHtml(b.summary)}</span>
      <button class="bookmark-item-remove" onclick="event.stopPropagation(); removeBookmark('${b.id}')" title="Unpin">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `).join('');
}

function removeBookmark(id) {
  let bm = getBookmarks().filter(b => b.id !== id);
  saveBookmarks(bm);
  renderBookmarks();
  const btn = document.getElementById(`bm-${id}`);
  if (btn) {
    btn.classList.remove('active');
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
  }
}

function scrollToAnswer(id) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.style.boxShadow = '0 0 0 2px var(--gold), 0 0 20px rgba(255,198,77,.2)';
    setTimeout(() => { el.style.boxShadow = ''; }, 2000);
  }
}

function toggleBookmarksPanel() {
  const list = document.getElementById('bookmarksList');
  const chevron = document.getElementById('bookmarksChevron');
  list.classList.toggle('open');
  chevron.classList.toggle('open');
}

// ── SCROLL-TO-BOTTOM BUTTON ──────────────────────────
(function initScrollBtn() {
  const chatArea = document.getElementById('chatArea');
  const scrollBtn = document.getElementById('scrollBottomBtn');
  if (!chatArea || !scrollBtn) return;

  chatArea.addEventListener('scroll', () => {
    const distFromBottom = chatArea.scrollHeight - chatArea.scrollTop - chatArea.clientHeight;
    if (distFromBottom > 200) {
      scrollBtn.classList.add('show');
    } else {
      scrollBtn.classList.remove('show');
    }
  });
})();

// ── KEYBOARD SHORTCUT ────────────────────────────────
document.getElementById('qInput').addEventListener('keydown', function(e) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    runQuery();
  }
});

// ── INIT BOOKMARKS ───────────────────────────────────
renderBookmarks();
