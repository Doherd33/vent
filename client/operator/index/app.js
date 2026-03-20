  function escHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── BUILD A WORKFLOW ──
  function startBuild() {
    const q = document.getElementById('buildSearch').value.trim();
    if (!q) return;
    // Launch the document builder with the title pre-filled
    window.location.href = 'builder.html?title=' + encodeURIComponent(q) + '&area=Upstream';
  }

  let selArea = 'Upstream';

  function setArea(btn) {
    document.querySelectorAll('.atab').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    selArea = btn.dataset.area;
  }

  function onType(el) { document.getElementById('goBtn').disabled = el.value.trim().length < 10; }
  function onKey(e)   { if ((e.metaKey||e.ctrlKey) && e.key==='Enter') doSubmit(); }
  function tog(id)    { document.getElementById(id).classList.toggle('open'); }

  function showScreen(id) {
    ['submitScreen','procScreen','fbScreen'].forEach(s => {
      const el = document.getElementById(s);
      if (s === id) {
        el.style.display = s === 'procScreen' ? 'flex' : 'block';
      } else {
        el.style.display = 'none';
      }
    });
  }

  function animateSteps(cb) {
    const ids = ['ps0','ps1','ps2','ps3','ps4','ps5'];
    let i = 0;
    const tick = () => {
      if (i > 0) {
        const prev = document.getElementById(ids[i-1]);
        prev.classList.remove('live'); prev.classList.add('done');
        prev.querySelector('.p-icon').textContent = '✓';
      }
      if (i < ids.length) {
        document.getElementById(ids[i]).classList.add('live');
        i++; setTimeout(tick, 800);
      } else { setTimeout(cb, 300); }
    };
    tick();
  }

  let _submitting = false;
  async function doSubmit() {
    const text = document.getElementById('ventText').value.trim();
    if (text.length < 10 || _submitting) return;
    _submitting = true;
    document.getElementById('goBtn').disabled = true;
    const shift = document.getElementById('shiftSel').value || 'Unspecified';
    const willingToConsult = document.getElementById('conToggle').checked;

    showScreen('procScreen');

    animateSteps(async () => {
      try {
        // Call YOUR server — not Anthropic directly
        const res = await fetch(`${SERVER_URL}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            observation: text,
            area: selArea,
            shift: shift,
            willingToConsult: willingToConsult
          })
        });

        const data = await res.json();

        // Store in localStorage so workflow.html can read it immediately
        localStorage.setItem('vent_' + data.refCode, JSON.stringify({
          ...data,
          raw_text: text,
          process_area: selArea,
          shift: shift,
          status: 'new'
        }));

        // Redirect to workflow page
        window.location.href = 'workflow.html?ref=' + data.refCode;

      } catch(err) {
        console.error('Error:', err);
        alert(t('err.serverDown'));
        _submitting = false;
        document.getElementById('goBtn').disabled = false;
        showScreen('submitScreen');
      }
    });
  }

  function populateFeedback(d, obsText, shift) {
    document.getElementById('refCode').textContent = d.refCode || 'VNT-0000';
    document.getElementById('heroArea').textContent = selArea;
    document.getElementById('heroShift').textContent = (shift||'Unspecified') + ' shift';
    document.getElementById('obsEcho').textContent = obsText;

    const pill = document.getElementById('priorityPill');
    const p = d.priority || 'Medium';
    pill.textContent = p + ' Priority';
    pill.className = 'pill ' + (p==='High'?'pill-red': p==='Medium'?'pill-amber':'pill-green');

    const allDocs = [...(d.sopRefs||[]), ...(d.bprRefs||[])];
    document.getElementById('sopCount').textContent = allDocs.length + ' docs';
    const tbody = document.getElementById('sopTbody');
    tbody.innerHTML = '';
    allDocs.forEach(r => {
      const flagClass = r.flag==='gap'?'flag-gap': r.flag==='ambiguous'?'flag-ambi':'flag-ok';
      const flagLabel = r.flag==='gap'?'Gap': r.flag==='ambiguous'?'Ambiguous':'Compliant';
      tbody.innerHTML += `<tr>
        <td><div class="sop-code">${escHtml(r.code)}</div></td>
        <td>${escHtml(r.title)}</td>
        <td><span class="sop-step">${escHtml(r.step)}</span></td>
        <td>${escHtml(r.relevance)}</td>
        <td><span class="flag ${flagClass}">${flagLabel}</span></td>
      </tr>`;
    });

    const s = d.sciEval || {};
    document.getElementById('sciSummary').textContent = s.summary || '';
    const grid = document.getElementById('sciGrid');
    grid.innerHTML = '';
    [
      { label:'Root Cause Hypothesis', val: s.rootCauseHypothesis, cls:'' },
      { label:'Risk Level', val: s.riskLevel, cls: s.riskLevel==='High'?'red': s.riskLevel==='Medium'?'amber':'green' },
      { label:'Affected Parameter', val: s.affectedParameter, cls:'accent' },
      { label:'Regulatory Note', val: s.regulatoryNote, cls: s.regulatoryFlag==='Yes'?'red':'' }
    ].forEach(i => {
      grid.innerHTML += `<div class="sci-item">
        <div class="sci-item-label">${i.label}</div>
        <div class="sci-item-val ${i.cls}">${escHtml(i.val)||'—'}</div>
      </div>`;
    });

    const cas = d.correctiveActions || [];
    document.getElementById('caCount').textContent = cas.length;
    const caList = document.getElementById('caList');
    caList.innerHTML = '';
    cas.forEach((c,i) => {
      const tcls = c.timing==='immediate'?'ca-imm': c.timing==='short'?'ca-short':'ca-long';
      caList.innerHTML += `<div class="ca-item">
        <div class="ca-num">${String(i+1).padStart(2,'0')}</div>
        <div class="ca-text">
          <div class="ca-title">${escHtml(c.title)}</div>
          <div class="ca-desc">${escHtml(c.description)}</div>
        </div>
        <div class="ca-type ${tcls}">${c.timingLabel}</div>
      </div>`;
    });

    const cl = document.getElementById('contactList');
    cl.innerHTML = '';
    (d.contacts||[]).forEach(c => {
      cl.innerHTML += `<div class="contact-item">
        <div class="contact-avatar ${c.avatarClass}">${escHtml(c.initials)}</div>
        <div class="contact-info">
          <div class="contact-name">${escHtml(c.name)}</div>
          <div class="contact-role">${escHtml(c.role)}</div>
          <div class="contact-why">${escHtml(c.why)}</div>
        </div>
        <div class="contact-dept dept-${escHtml(c.dept)}">${escHtml(c.deptLabel)}</div>
      </div>`;
    });

    const tl = document.getElementById('timeline');
    tl.innerHTML = '';
    (d.timeline||[]).forEach(t => {
      const sym = t.state==='done'?'✓': t.state==='now'?'●':'○';
      tl.innerHTML += `<div class="tl-item">
        <div class="tl-dot tl-${t.state}">${sym}</div>
        <div class="tl-content">
          <div class="tl-when">${escHtml(t.when)}</div>
          <div class="tl-event">${escHtml(t.event)}</div>
          <div class="tl-detail">${escHtml(t.detail)}</div>
        </div>
      </div>`;
    });

    const pat = d.pattern || {};
    document.getElementById('patternSummary').textContent = pat.summary || '';
    const cur = pat.currentCount || 1;
    const thr = pat.threshold || 3;
    document.getElementById('pbFraction').textContent = `${cur} / ${thr} threshold`;
    document.getElementById('patternBadge').textContent = `${cur} submission${cur>1?'s':''}`;
    const pct = Math.round((cur/thr)*100);
    document.getElementById('pbFill').style.setProperty('--w', pct+'%');
    document.getElementById('thresholdNote').textContent =
      `When ${thr} or more independent submissions describe the same issue, it is automatically escalated to priority review — regardless of shift, seniority, or who raised it.`;
  }

  function resetAll() {
    document.getElementById('ventText').value = '';
    document.getElementById('goBtn').disabled = true;
    document.getElementById('conToggle').checked = false;
    document.getElementById('shiftSel').value = '';
    document.querySelectorAll('.atab').forEach(b => b.classList.remove('on'));
    document.querySelector('[data-area="Upstream"]').classList.add('on');
    selArea = 'Upstream';
    ['ps0','ps1','ps2','ps3','ps4','ps5'].forEach((id,i) => {
      const el = document.getElementById(id);
      el.classList.remove('live','done');
      el.querySelector('.p-icon').textContent = String(i+1).padStart(2,'0');
    });
    document.getElementById('pbFill').classList.remove('animate');
    showScreen('submitScreen');
    setTimeout(() => document.getElementById('ventText').focus(), 100);
  }

  showScreen('submitScreen');

