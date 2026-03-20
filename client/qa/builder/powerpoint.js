// ── POWERPOINT GENERATION ──
function parseSopContent(content) {
  if (!content) return [];
  const lines = content.split('\n');
  let bodyStart = 0;
  // Skip header lines: "[SOP-xxx] Title", "Section: ...", blank lines
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('Section:') || trimmed === '') {
      bodyStart = i + 1;
    } else {
      break;
    }
  }
  const bodyLines = lines.slice(bodyStart);
  const bullets = [];
  let current = '';
  for (const raw of bodyLines) {
    const line = raw.trim();
    if (line === '') {
      if (current) { bullets.push(current.trim()); current = ''; }
      continue;
    }
    const isNewBullet =
      /^\d+[\.\)]\s/.test(line) ||
      /^[a-z][\.\)]\s/.test(line) ||
      /^[ivxIVX]+[\.\)]\s/.test(line) ||
      /^[-\u2022\u2013\u2014\*]\s/.test(line) ||
      /^NOTE:/i.test(line) ||
      /^WARNING:/i.test(line) ||
      /^CAUTION:/i.test(line);
    if (isNewBullet) {
      if (current) bullets.push(current.trim());
      current = line;
    } else {
      current += (current ? ' ' : '') + line;
    }
  }
  if (current) bullets.push(current.trim());
  return bullets.map(b => b.length > 300 ? b.substring(0, 297) + '...' : b);
}

function generateSopPptx() {
  const tab = openSopTabs.find(t => t.id === activeSopTab);
  if (!tab || !tab.data || !tab.data.sections || !tab.data.sections.length) {
    logActivity('No active SOP to export as PowerPoint', 'warn');
    return;
  }
  const d = tab.data;
  const docId = d.docId;
  const sections = d.sections;
  const btn = document.getElementById('pptxExportBtn');
  btn.classList.add('generating');
  btn.disabled = true;

  try {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.author = 'Vent';
    pptx.company = 'Vent';
    pptx.subject = docId;
    pptx.title = docId;

    const C = {
      darkBg: '1E1E1E', cardBg: '252526', accent: '007ACC',
      gold: 'FFC64D', green: '4EC9B0', text: 'CCCCCC',
      mid: '8E8E8E', dim: '5A5A5A', white: 'FFFFFF', border: '3C3C3C'
    };

    // Slide masters
    pptx.defineSlideMaster({
      title: 'TITLE_SLIDE',
      background: { color: C.darkBg },
      objects: [
        { rect: { x: 0, y: 0, w: '100%', h: 0.06, fill: { color: C.accent } } },
        { text: { text: 'Vent', options: { x: 10.5, y: 6.6, w: 2.5, h: 0.6, fontFace: 'Georgia', fontSize: 18, color: C.dim, align: 'right', italic: true } } },
        { rect: { x: 0.5, y: 6.4, w: 12.33, h: 0.01, fill: { color: C.border } } }
      ]
    });
    pptx.defineSlideMaster({
      title: 'SECTION_SLIDE',
      background: { color: C.darkBg },
      objects: [
        { rect: { x: 0, y: 0, w: '100%', h: 0.04, fill: { color: C.accent } } },
        { text: { text: docId, options: { x: 0.5, y: 7.0, w: 4, h: 0.35, fontFace: 'Arial', fontSize: 8, color: C.dim, align: 'left' } } },
        { text: { text: 'Vent', options: { x: 10.5, y: 7.0, w: 2.5, h: 0.35, fontFace: 'Georgia', fontSize: 9, color: C.dim, align: 'right', italic: true } } },
        { rect: { x: 0.5, y: 6.9, w: 12.33, h: 0.01, fill: { color: C.border } } }
      ]
    });

    // ── TITLE SLIDE ──
    const titleSlide = pptx.addSlide({ masterName: 'TITLE_SLIDE' });
    titleSlide.addText(docId, {
      x: 0.8, y: 2.0, w: 11.7, h: 1.2,
      fontFace: 'Arial', fontSize: 36, bold: true, color: C.white, align: 'left'
    });
    let docName = '';
    if (sections.length > 0 && sections[0].content) {
      const firstLine = sections[0].content.split('\n')[0].trim();
      const m = firstLine.match(/^\[.*?\]\s*(.+)/);
      docName = m ? m[1] : firstLine;
    }
    if (docName) {
      titleSlide.addText(docName, {
        x: 0.8, y: 3.1, w: 11.7, h: 0.8,
        fontFace: 'Arial', fontSize: 20, color: C.gold, align: 'left'
      });
    }
    titleSlide.addText('Standard Operating Procedure', {
      x: 0.8, y: 4.0, w: 11.7, h: 0.5,
      fontFace: 'Arial', fontSize: 14, color: C.mid, align: 'left'
    });
    const dateStr = new Date().toLocaleDateString('en-IE', { year: 'numeric', month: 'long', day: 'numeric' });
    titleSlide.addText('Generated ' + dateStr, {
      x: 0.8, y: 4.6, w: 11.7, h: 0.4,
      fontFace: 'Arial', fontSize: 10, color: C.dim, align: 'left'
    });

    // ── TABLE OF CONTENTS ──
    if (sections.length > 1) {
      const tocSlide = pptx.addSlide({ masterName: 'SECTION_SLIDE' });
      tocSlide.addText('Contents', {
        x: 0.8, y: 0.4, w: 11.7, h: 0.7,
        fontFace: 'Arial', fontSize: 24, bold: true, color: C.white
      });
      tocSlide.addShape(pptx.ShapeType.rect, { x: 0.8, y: 1.05, w: 2.0, h: 0.03, fill: { color: C.accent } });
      const tocItems = sections.map(sec => ({
        text: sec.section_title,
        options: { fontSize: 12, color: C.text, bullet: { code: '2022', color: C.accent }, paraSpaceBefore: 4, paraSpaceAfter: 4 }
      }));
      tocSlide.addText(tocItems, {
        x: 0.8, y: 1.3, w: 11.7, h: 5.4,
        fontFace: 'Arial', valign: 'top', lineSpacingMultiple: 1.3
      });
    }

    // ── SECTION SLIDES ──
    const MAX_BULLETS = 10;
    sections.forEach(sec => {
      const parsed = parseSopContent(sec.content);

      if (parsed.length > MAX_BULLETS) {
        // Overflow: split across multiple slides
        for (let chunk = 0; chunk < parsed.length; chunk += MAX_BULLETS) {
          const slide = pptx.addSlide({ masterName: 'SECTION_SLIDE' });
          const isFirst = chunk === 0;
          slide.addText(sec.section_title + (isFirst ? '' : ' (cont.)'), {
            x: 0.8, y: 0.4, w: 11.7, h: 0.7,
            fontFace: 'Arial', fontSize: 20, bold: true, color: C.gold
          });
          if (isFirst) {
            slide.addShape(pptx.ShapeType.rect, { x: 0.8, y: 1.05, w: 1.5, h: 0.03, fill: { color: C.gold } });
          }
          const items = parsed.slice(chunk, chunk + MAX_BULLETS).map(line => ({
            text: line,
            options: { fontSize: 11, color: C.text, bullet: { code: '2022', color: C.accent }, paraSpaceBefore: 3, paraSpaceAfter: 3 }
          }));
          slide.addText(items, {
            x: 0.8, y: isFirst ? 1.3 : 0.9, w: 11.7, h: isFirst ? 5.4 : 5.8,
            fontFace: 'Arial', valign: 'top', lineSpacingMultiple: 1.2, wrap: true
          });
        }
      } else {
        const slide = pptx.addSlide({ masterName: 'SECTION_SLIDE' });
        slide.addText(sec.section_title, {
          x: 0.8, y: 0.4, w: 11.7, h: 0.7,
          fontFace: 'Arial', fontSize: 20, bold: true, color: C.gold
        });
        slide.addShape(pptx.ShapeType.rect, { x: 0.8, y: 1.05, w: 1.5, h: 0.03, fill: { color: C.gold } });
        if (parsed.length === 0) {
          slide.addText(sec.content.trim(), {
            x: 0.8, y: 1.3, w: 11.7, h: 5.4,
            fontFace: 'Arial', fontSize: 11, color: C.text, valign: 'top', lineSpacingMultiple: 1.4, wrap: true
          });
        } else {
          const items = parsed.map(line => ({
            text: line,
            options: { fontSize: 11, color: C.text, bullet: { code: '2022', color: C.accent }, paraSpaceBefore: 3, paraSpaceAfter: 3 }
          }));
          slide.addText(items, {
            x: 0.8, y: 1.3, w: 11.7, h: 5.4,
            fontFace: 'Arial', valign: 'top', lineSpacingMultiple: 1.2, wrap: true
          });
        }
      }
    });

    // ── CLOSING SLIDE ──
    const endSlide = pptx.addSlide({ masterName: 'TITLE_SLIDE' });
    endSlide.addText(docId, {
      x: 0.8, y: 2.5, w: 11.7, h: 1.0,
      fontFace: 'Arial', fontSize: 28, bold: true, color: C.white, align: 'center'
    });
    endSlide.addText('End of Document', {
      x: 0.8, y: 3.5, w: 11.7, h: 0.6,
      fontFace: 'Arial', fontSize: 14, color: C.mid, align: 'center'
    });

    // ── SAVE ──
    const filename = docId.replace(/[^a-zA-Z0-9_-]/g, '_') + '.pptx';
    pptx.writeFile({ fileName: filename }).then(() => {
      logActivity('Exported PowerPoint: ' + filename, 'action');
    }).catch(err => {
      logActivity('PowerPoint export failed: ' + err.message, 'warn');
    }).finally(() => {
      btn.classList.remove('generating');
      updatePptxBtnState();
    });

  } catch (err) {
    logActivity('PowerPoint generation error: ' + err.message, 'warn');
    btn.classList.remove('generating');
    updatePptxBtnState();
  }
}

function renderSopResult(tabId) {
  const tab = openSopTabs.find(t => t.id === tabId);
  if (!tab) return;
  const d = tab.data;
  const rc = document.getElementById('rightContent');

  const catMap = {
    procedure:      { label: 'Step-by-step procedure', cls: 'cat-proc',  icon: '≡' },
    specification:  { label: 'Specification / parameter', cls: 'cat-spec', icon: '◈' },
    troubleshooting:{ label: 'Troubleshooting guide',   cls: 'cat-fault', icon: '⚡' },
    general:        { label: 'General information',     cls: 'cat-gen',   icon: '○' }
  };
  const cat = catMap[d.category] || catMap.general;

  let html = '<div class="sop-result-card">';

  // Header
  html += '<div class="sop-r-head">' +
    '<div class="sop-r-cat ' + cat.cls + '">' + cat.icon + '</div>' +
    '<div><div class="sop-r-label">' + cat.label + '</div></div>' +
    '<button class="step-action-btn" style="margin-left:auto;font-size:10px;padding:4px 8px" onclick="openSopSearch()" title="New search">' +
      '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Search' +
    '</button>' +
  '</div>';

  // Summary
  html += '<div class="sop-r-summary">' + esc(d.summary) + '</div>';

  // Warnings
  if (d.warnings && d.warnings.length) {
    d.warnings.forEach(w => {
      html += '<div class="sop-r-warn">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:1px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' +
        esc(w) + '</div>';
    });
  }

  // Steps
  if (d.steps && d.steps.length) {
    html += '<div class="sop-r-section-head">' +
      '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>' +
      'Procedure steps</div>';
    d.steps.forEach(s => {
      html += '<div class="sop-r-step">' +
        '<div class="sop-r-step-n' + (s.critical ? ' crit' : '') + '">' + s.n + '</div>' +
        '<div>' +
          '<div class="sop-r-step-text">' + esc(s.action) + (s.critical ? ' <span style="color:var(--red);font-size:10px">⚠ Critical</span>' : '') + '</div>' +
          (s.detail ? '<div class="sop-r-step-detail">' + esc(s.detail) + '</div>' : '') +
          (s.value ? '<div class="sop-r-step-val">Target: ' + esc(s.value) + '</div>' : '') +
        '</div>' +
      '</div>';
    });
  }

  // Parameters
  if (d.params && d.params.length) {
    html += '<div class="sop-r-section-head">' +
      '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/></svg>' +
      'Process parameters</div>';
    d.params.forEach(p => {
      html += '<div class="sop-r-param">' +
        '<div class="sop-r-param-name">' + esc(p.name) + '</div>' +
        '<div><span class="sop-r-param-val">' + esc(p.value) + '</span> <span class="sop-r-param-unit">' + esc(p.unit || '') + '</span></div>' +
        (p.range ? '<div class="sop-r-param-range">Range: ' + esc(p.range) + '</div>' : '') +
      '</div>';
    });
  }

  // Notes
  if (d.notes && d.notes.length) {
    html += '<div class="sop-r-section-head">' +
      '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
      'Notes</div>';
    d.notes.forEach(n => {
      html += '<div class="sop-r-note"><span style="color:var(--dim)">–</span> ' + esc(n) + '</div>';
    });
  }

  // Sources
  if (d.sources && d.sources.length) {
    html += '<div class="sop-r-section-head" style="margin-top:16px">' +
      '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
      'Sources</div>';
    d.sources.forEach(s => {
      html += '<div class="sop-r-src">' +
        '<span class="sop-r-src-code">' + esc(s.code) + '</span>' +
        '<span style="color:var(--mid);font-size:11px">' + esc(s.title) + '</span>' +
        '<span class="sop-r-src-section">§ ' + esc(s.section) + '</span>' +
      '</div>';
    });
  }

  html += '</div>';
  rc.innerHTML = html;
}

