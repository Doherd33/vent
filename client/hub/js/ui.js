import { PROCESS_DATA, EQUIP_DOCS, EQUIP_HISTORY } from './data.js';
import { openDocInViewer } from './sop-viewer.js';

// ── DOM refs ──
var detailPanel = document.getElementById('equipDetail');
var defaultIntel = document.getElementById('intelDefault');

function getEquipType(name) {
  // Seed train (order matters — check specific stages first)
  if (name.indexOf('N-2 · 20L') !== -1) return 'SEED BR 20L';
  if (name.indexOf('N-1 · 50L') !== -1) return 'SEED BR';
  // Production bioreactors
  if (name.startsWith('BR-')) return 'BR';
  if (name.startsWith('SARTORIUS BIOSTAT STR')) return 'CONTROL TOWER';
  if (name.startsWith('GAS PANEL')) return 'GAS PANEL';
  if (name.startsWith('FEED')) return 'FEED TANK';
  if (name.startsWith('BLEED')) return 'BLEED TANK';
  if (name.startsWith('REPLIGEN') || name.startsWith('ATF')) return 'ATF';
  if (name.startsWith('SU FILTER')) return 'SU FILTER';
  if (name === 'HARVEST SUMP') return 'HARVEST';
  if (name === 'PROTEIN A COLUMN') return 'PROTEIN A';
  if (name === 'ION EXCHANGE COLUMN') return 'ION EXCHANGE';
  if (name === 'UF/DF SKID') return 'UF/DF';
  if (name.startsWith('FILL TANK')) return 'FILL TANK';
  if (name.startsWith('MEDIA PREP')) return 'MEDIA PREP';
  if (name.startsWith('MEDIA HOLD')) return 'MEDIA HOLD';
  // Parts wash (updated brand names)
  if (name.startsWith('BELIMED')) return 'PARTS WASHER';
  if (name.startsWith('GETINGE')) return 'AUTOCLAVE';
  if (name.indexOf('PARTS RACK') !== -1) return 'PARTS RACK';
  // Seed room instruments
  if (name.indexOf('Vi-CELL') !== -1) return 'CELL COUNTER';
  if (name.indexOf('CEDEX') !== -1 || name.indexOf('Cedex') !== -1) return 'CEDEX';
  if (name.indexOf('HERASAFE') !== -1) return 'BSC';
  if (name.indexOf('CKX53') !== -1) return 'MICROSCOPE';
  // Media prep instruments (updated brand names)
  if (name === 'LAB BENCH') return 'LAB BENCH';
  if (name.indexOf('SevenExcellence') !== -1) return 'PH METER';
  if (name.indexOf('OsmoPRO') !== -1) return 'OSMOMETER';
  if (name.indexOf('METTLER TOLEDO XPR') !== -1) return 'SCALES';
  if (name.indexOf('ICS685') !== -1) return 'FLOOR SCALES';
  if (name === 'WFI POU') return 'WFI';
  if (name.indexOf('BioWelder') !== -1) return 'TUBE WELDER';
  if (name.indexOf('STERILE FILTER') !== -1) return 'STERILE FILTER';
  // Inoculation
  if (name === 'INOCULATION VESSEL') return 'INOCULATION';
  if (name === 'PASS-THROUGH') return 'PASS-THROUGH';
  return null;
}

function statusColor(status) {
  var s = (status || '').toUpperCase();
  if (['RUNNING','FEEDING','COLLECTING','IN-USE','FILLING','PASS','ONLINE','MIXING','HOLDING'].indexOf(s) !== -1) return 'green';
  if (['WARNING','STANDBY','IDLE','COOLING'].indexOf(s) !== -1) return 'amber';
  if (['STOPPED','FAIL','ERROR','ALARM'].indexOf(s) !== -1) return 'red';
  return '';
}

function barColor(pct) {
  if (pct > 85) return 'var(--hud-amber)';
  if (pct > 95) return 'var(--hud-red)';
  return 'var(--hud-green)';
}

function buildBar(label, pct) {
  return '<div class="equip-bar">' +
    '<span class="equip-bar-label">' + label + '</span>' +
    '<div class="equip-bar-track"><div class="equip-bar-fill" style="width:' + pct + '%;background:' + barColor(pct) + '"></div></div>' +
    '<span class="equip-bar-val">' + pct + '%</span></div>';
}

function buildRow(label, value, cls) {
  return '<div class="equip-row"><span>' + label + '</span><span class="val ' + (cls || '') + '">' + value + '</span></div>';
}

function buildProcessHTML(type, data) {
  var html = '';

  // Bioreactor — show N-1 / N stage tabs
  if (type === 'BR') {
    html += '<div class="equip-stage-tabs">' +
      '<button class="equip-stage-tab active" data-stage="N-1">N-1 SEED</button>' +
      '<button class="equip-stage-tab" data-stage="N">N PRODUCTION</button></div>';
    html += '<div id="stageContent">' + renderBRStage(data.stages['N-1'], 'N-1') + '</div>';
  }

  // Feed / Bleed tanks
  if (type === 'FEED TANK' || type === 'BLEED TANK') {
    html += '<div class="equip-section">' +
      '<div class="equip-section-label">Tank Status</div>' +
      buildBar('Level', data.pctFull) +
      buildRow('Volume', data.volume + ' / ' + data.maxVolume) +
      buildRow('Flow rate', data.flowRate) +
      buildRow('Temp', data.temp + ' °C') +
      buildRow('Status', data.status, statusColor(data.status)) +
      '</div>';
    if (data.media) html += '<div class="equip-section"><div class="equip-section-label">Media</div>' + buildRow('Type', data.media) + buildRow('Last refill', data.lastRefill) + '</div>';
    if (data.contents) html += '<div class="equip-section"><div class="equip-section-label">Contents</div>' + buildRow('Type', data.contents) + buildRow('Last drain', data.lastDrain) + '</div>';
  }

  // ATF filters
  if (type === 'ATF') {
    html += '<div class="equip-section">' +
      '<div class="equip-section-label">Filter Status</div>' +
      buildRow('Type', data.type) +
      buildRow('Fiber count', data.fiberCount) +
      buildRow('Pore size', data.poreSize) +
      buildRow('Status', data.status, statusColor(data.status)) +
      buildRow('Hours run', data.hoursRun + 'h') +
      buildRow('Integrity', data.integrity, statusColor(data.integrity)) +
      '</div>';
    html += '<div class="equip-section"><div class="equip-section-label">Pressure</div>' +
      buildRow('Feed', data.pressure.feed) +
      buildRow('Retentate', data.pressure.retentate) +
      buildRow('Permeate', data.pressure.permeate) +
      buildRow('Flow rate', data.flowRate) +
      buildRow('Exchange', data.exchangeRate) +
      '</div>';
  }

  // SU Filter
  if (type === 'SU FILTER') {
    var campPct = Math.round((data.campaignDay / data.campaignMax) * 100);
    var tpPct = Math.round((parseFloat(data.throughput) / parseFloat(data.throughputMax.replace(',', '')) ) * 100);
    html += '<div class="equip-section">' +
      '<div class="equip-section-label">Campaign</div>' +
      buildBar('Day', campPct) +
      buildRow('Day', data.campaignDay + ' / ' + data.campaignMax) +
      buildRow('dP', data.dP + ' / ' + data.dPMax) +
      buildBar('Throughput', tpPct) +
      buildRow('Throughput', data.throughput + ' / ' + data.throughputMax) +
      buildRow('Status', data.status, statusColor(data.status)) +
      '</div>';
  }

  // Harvest sump
  if (type === 'HARVEST') {
    html += '<div class="equip-section">' +
      '<div class="equip-section-label">Sump Status</div>' +
      buildBar('Level', data.pctFull) +
      buildRow('Volume', data.volume + ' / ' + data.maxVolume) +
      buildRow('Turbidity', data.turbidity) +
      buildRow('Temp', data.temp + ' °C') +
      buildRow('pH', data.ph) +
      buildRow('Status', data.status, statusColor(data.status)) +
      buildRow('Feeding to', data.feedingTo) +
      '</div>';
  }

  // Chromatography columns
  if (type === 'PROTEIN A' || type === 'ION EXCHANGE') {
    var cyclePct = Math.round((data.cycles / data.maxCycles) * 100);
    html += '<div class="equip-section">' +
      '<div class="equip-section-label">Column</div>' +
      buildRow('Resin', data.resin) +
      buildRow('Volume', data.columnVol) +
      buildRow('Phase', data.phase, 'green') +
      buildRow('Pressure', data.pressure) +
      '</div>';
    html += '<div class="equip-section"><div class="equip-section-label">Lifecycle</div>' +
      buildBar('Cycles', cyclePct) +
      buildRow('Cycles', data.cycles + ' / ' + data.maxCycles) +
      (data.yield ? buildRow('Yield', data.yield, 'green') : '') +
      (data.purity ? buildRow('Purity', data.purity, 'green') : '') +
      (data.hcp ? buildRow('HCP', data.hcp) : '') +
      (data.aggregates ? buildRow('Aggregates', data.aggregates) : '') +
      '</div>';
  }

  // UF/DF
  if (type === 'UF/DF') {
    html += '<div class="equip-section">' +
      '<div class="equip-section-label">Membrane</div>' +
      buildRow('MWCO', data.membrane) +
      buildRow('Area', data.area) +
      buildRow('Phase', data.phase, 'green') +
      buildRow('Conc.', data.concentration) +
      buildRow('Diavolumes', data.diavolumes) +
      buildRow('TMP', data.tmp) +
      buildRow('Flux', data.flux) +
      '</div>';
  }

  // Fill tank
  if (type === 'FILL TANK') {
    html += '<div class="equip-section">' +
      '<div class="equip-section-label">Fill Status</div>' +
      buildBar('Level', data.pctFull) +
      buildRow('Volume', data.volume + ' / ' + data.maxVolume) +
      buildRow('Product', data.product) +
      buildRow('Conc.', data.concentration) +
      buildRow('Temp', data.temp + ' °C') +
      buildRow('Batch', data.batchId) +
      buildRow('Status', data.status, statusColor(data.status)) +
      '</div>';
  }

  // Seed bioreactor (uses same stage layout as BR)
  if (type === 'SEED BR') {
    html += '<div class="equip-stage-tabs">' +
      '<button class="equip-stage-tab active" data-stage="N-1">N-1 SEED</button>' +
      '<button class="equip-stage-tab" data-stage="N">N PRODUCTION</button></div>';
    html += '<div id="stageContent">' + renderBRStage(data.stages['N-1'], 'N-1') + '</div>';
  }

  // Seed bioreactor 20L
  if (type === 'SEED BR 20L') {
    html += '<div class="equip-stage-tabs">' +
      '<button class="equip-stage-tab active" data-stage="N-2">N-2 SEED</button>' +
      '<button class="equip-stage-tab" data-stage="N">N PRODUCTION</button></div>';
    html += '<div id="stageContent">' + renderBRStage(data.stages['N-2'], 'N-2') + '</div>';
  }

  // Media prep / hold (tank-style)
  if (type === 'MEDIA PREP' || type === 'MEDIA HOLD') {
    html += '<div class="equip-section">' +
      '<div class="equip-section-label">Vessel Status</div>' +
      buildBar('Level', data.pctFull) +
      buildRow('Volume', data.volume + ' / ' + data.maxVolume) +
      buildRow('Media', data.media) +
      buildRow('Temp', data.temp + ' °C') +
      buildRow('Status', data.status, statusColor(data.status)) +
      '</div>';
  }

  // Parts washer
  if (type === 'PARTS WASHER') {
    html += '<div class="equip-section">' +
      '<div class="equip-section-label">Washer Status</div>' +
      buildRow('Model', data.type) +
      buildRow('Cycle', data.cycle) +
      buildRow('Temp', data.temp + ' °C') +
      buildRow('Duration', data.duration) +
      buildRow('Status', data.status, statusColor(data.status)) +
      buildRow('Load', data.currentLoad) +
      '</div>';
  }

  // Autoclave
  if (type === 'AUTOCLAVE') {
    html += '<div class="equip-section">' +
      '<div class="equip-section-label">Autoclave Status</div>' +
      buildRow('Model', data.type) +
      buildRow('Cycle', data.cycle) +
      buildRow('Pressure', data.pressure) +
      buildRow('Duration', data.duration) +
      buildRow('Status', data.status, statusColor(data.status)) +
      buildRow('Load', data.currentLoad) +
      '</div>';
  }

  // Parts racks
  if (type === 'PARTS RACK') {
    html += '<div class="equip-section">' +
      '<div class="equip-section-label">Rack Status</div>' +
      buildRow('Items', data.items) +
      buildRow('Status', data.status, statusColor(data.status)) +
      buildRow('Last audit', data.lastAudit) +
      buildRow('Notes', data.notes) +
      '</div>';
  }

  // Generic instrument display
  if (['LAB BENCH','PH METER','OSMOMETER','SCALES','FLOOR SCALES','WFI',
       'CONTROL TOWER','GAS PANEL','CELL COUNTER','CEDEX','BSC',
       'MICROSCOPE','TUBE WELDER','STERILE FILTER','INOCULATION','PASS-THROUGH'].indexOf(type) !== -1) {
    html += '<div class="equip-section"><div class="equip-section-label">Equipment</div>';
    Object.keys(data).forEach(function (key) {
      var label = key.replace(/([A-Z])/g, ' $1').replace(/^./, function (c) { return c.toUpperCase(); });
      var val = data[key];
      html += buildRow(label, val, key === 'status' ? statusColor(val) : '');
    });
    html += '</div>';
  }

  return html;
}

function renderBRStage(d, stageName) {
  var dayPct = Math.round((d.day / d.totalDays) * 100);
  return '<div class="equip-section">' +
    '<div class="equip-section-label">' + stageName + ' Process</div>' +
    buildBar('Campaign', dayPct) +
    buildRow('Day', d.day + ' / ' + d.totalDays) +
    buildRow('VCD', d.vcd + ' x10⁶/mL', 'green') +
    buildRow('Viability', d.viability + '%', parseFloat(d.viability) > 90 ? 'green' : 'amber') +
    buildRow('Titer', d.titer + ' g/L') +
    '</div>' +
    '<div class="equip-section">' +
    '<div class="equip-section-label">Parameters</div>' +
    buildRow('pH', d.ph) +
    buildRow('DO₂', d.dO2 + '%') +
    buildRow('Temp', d.temp + ' °C') +
    buildRow('Perf. rate', d.perfusionRate + ' VVD') +
    buildRow('Feed rate', d.feedRate + ' L/hr') +
    buildRow('Bleed rate', d.bleedRate + ' L/hr') +
    '</div>';
}

function buildSparkline(points) {
  var max = Math.max.apply(null, points);
  var html = '<div class="sparkline">';
  points.forEach(function(v) {
    var h = Math.max(2, Math.round((v / max) * 24));
    var color = v > max * 0.8 ? 'var(--hud-amber)' : 'var(--hud-green)';
    html += '<div class="sparkline-bar" style="height:' + h + 'px;background:' + color + '"></div>';
  });
  return html + '</div>';
}

function buildHistoryHTML(type) {
  var hist = EQUIP_HISTORY[type];
  if (!hist) return '<div class="doc-empty">No history available</div>';

  var html = '';

  // ── Deviations ──
  if (hist.deviations && hist.deviations.length) {
    html += '<div class="hist-section"><div class="hist-section-label">Deviations</div>';
    hist.deviations.forEach(function(d) {
      var sevClass = d.severity === 'critical' ? 'critical' : d.severity === 'major' ? 'major' : 'minor';
      var statusClass = d.status === 'open' ? 'open' : 'closed';
      html += '<div class="hist-entry hist-entry-' + sevClass + '">' +
        '<div class="hist-entry-top">' +
          '<span class="hist-badge ' + sevClass + '">' + d.severity.toUpperCase() + '</span>' +
          '<span class="hist-date">' + d.date + '</span>' +
          '<span class="hist-badge ' + statusClass + '">' + d.status.toUpperCase() + '</span>' +
        '</div>' +
        '<div class="hist-entry-title">' + d.title + '</div>' +
        '<div class="hist-entry-meta">' + d.id + (d.capa ? ' · ' + d.capa : '') + '</div>' +
      '</div>';
    });
    html += '</div>';
  }

  // ── Maintenance ──
  if (hist.maintenance && hist.maintenance.length) {
    html += '<div class="hist-section"><div class="hist-section-label">Maintenance</div>';
    hist.maintenance.forEach(function(m) {
      var typeClass = m.type === 'unplanned' ? 'major' : 'minor';
      html += '<div class="hist-entry">' +
        '<div class="hist-entry-top">' +
          '<span class="hist-badge ' + typeClass + '">' + m.type.toUpperCase() + '</span>' +
          '<span class="hist-date">' + m.date + '</span>' +
        '</div>' +
        '<div class="hist-entry-title">' + m.title + '</div>' +
        '<div class="hist-entry-meta">Tech: ' + m.tech + '</div>' +
      '</div>';
    });
    html += '</div>';
  }

  // ── Calibrations ──
  if (hist.calibrations && hist.calibrations.length) {
    html += '<div class="hist-section"><div class="hist-section-label">Calibrations</div>';
    hist.calibrations.forEach(function(c) {
      html += '<div class="hist-cal-row">' +
        '<div class="hist-cal-name">' + c.instrument + '</div>' +
        '<div class="hist-cal-dates">' +
          '<span class="hist-cal-label">Last</span><span>' + c.lastCal + '</span>' +
          '<span class="hist-cal-label">Due</span><span>' + c.nextDue + '</span>' +
        '</div>' +
        '<span class="hist-badge ' + c.status + '">' + c.status.replace('-', ' ').toUpperCase() + '</span>' +
      '</div>';
    });
    html += '</div>';
  }

  // ── CIP/SIP ──
  if (hist.cipSip && hist.cipSip.length) {
    html += '<div class="hist-section"><div class="hist-section-label">CIP / SIP</div>';
    hist.cipSip.forEach(function(c) {
      var resultClass = c.result === 'PASS' ? 'minor' : 'critical';
      html += '<div class="hist-cip-row">' +
        '<span class="hist-date">' + c.date + '</span>' +
        '<span class="hist-badge ' + (c.type === 'SIP' ? 'sip' : 'cip') + '">' + c.type + '</span>' +
        '<span class="hist-badge ' + resultClass + '">' + c.result + '</span>' +
        '<span class="hist-cip-detail">' + c.duration + ' · ' + c.detail + '</span>' +
      '</div>';
    });
    html += '</div>';
  }

  // ── Sensor Trends ──
  if (hist.trends && hist.trends.length) {
    html += '<div class="hist-section"><div class="hist-section-label">Sensor Trends <span class="hist-trend-period">12-month</span></div>';
    hist.trends.forEach(function(t) {
      var current = t.points[t.points.length - 1];
      html += '<div class="hist-trend-row">' +
        '<div class="hist-trend-header">' +
          '<span class="hist-trend-name">' + t.parameter + '</span>' +
          '<span class="hist-trend-val">' + current + ' ' + t.unit + '</span>' +
        '</div>' +
        buildSparkline(t.points) +
      '</div>';
    });
    html += '</div>';
  }

  return html;
}

function buildDocsHTML(type, filter) {
  var docs = EQUIP_DOCS[type] || [];
  var q = (filter || '').toLowerCase();
  if (q) {
    docs = docs.filter(function (d) {
      return d.title.toLowerCase().indexOf(q) !== -1 || d.meta.toLowerCase().indexOf(q) !== -1;
    });
  }
  if (!docs.length) return '<div class="doc-empty">No matching documents</div>';

  var tagIcons = { pbr: '■', sop: '▶', spec: '◆', log: '○' };
  var groups = { pbr: [], sop: [], spec: [], log: [] };
  docs.forEach(function (d) { (groups[d.tag] || groups.sop).push(d); });

  var labels = { pbr: 'Batch Records', sop: 'SOPs', spec: 'Specifications', log: 'Logs & Trends' };
  var html = '';
  ['pbr', 'sop', 'spec', 'log'].forEach(function (key) {
    if (!groups[key].length) return;
    html += '<div class="doc-group-label">' + labels[key] + '</div><div class="doc-list">';
    groups[key].forEach(function (d) {
      html += '<div class="doc-item" data-doc-id="' + d.id + '">' +
        '<span class="doc-item-icon">' + (tagIcons[d.tag] || '') + '</span>' +
        '<div class="doc-item-body">' +
          '<div class="doc-item-title">' + d.title + '</div>' +
          '<div class="doc-item-meta">' + d.meta + '</div>' +
        '</div>' +
        '<span class="doc-item-tag ' + d.tag + '">' + d.tag.toUpperCase() + '</span>' +
      '</div>';
    });
    html += '</div>';
  });
  return html;
}

function renderDetail(grp) {
  var name = grp.userData.name;
  var desc = grp.userData.desc;
  var type = getEquipType(name);
  var data = PROCESS_DATA[type];
  if (!data) return;

  var docs = EQUIP_DOCS[type] || [];
  var hasDocs = docs.length > 0;
  var history = EQUIP_HISTORY[type];
  var hasHistory = !!history;
  var histEventCount = hasHistory ? (history.deviations || []).length + (history.maintenance || []).length : 0;

  var html = '<div class="equip-detail-header">' +
    '<span class="equip-detail-title">' + name + '</span>' +
    '<button class="equip-detail-close" id="equipClose">ESC</button></div>' +
    '<div class="equip-detail-desc">' + desc + '</div>';

  // Panel-level tabs (Process / History / Documents)
  if (hasDocs || hasHistory) {
    html += '<div class="equip-panel-tabs">' +
      '<button class="equip-panel-tab active" data-panel="process">PROCESS</button>';
    if (hasHistory) {
      html += '<button class="equip-panel-tab" data-panel="history">HISTORY (' + histEventCount + ')</button>';
    }
    if (hasDocs) {
      html += '<button class="equip-panel-tab" data-panel="docs">DOCS (' + docs.length + ')</button>';
    }
    html += '</div>';
  }

  html += '<div id="panelProcess">' + buildProcessHTML(type, data) + '</div>';

  if (hasHistory) {
    html += '<div id="panelHistory" style="display:none">' + buildHistoryHTML(type) + '</div>';
  }

  if (hasDocs) {
    html += '<div id="panelDocs" style="display:none">' +
      '<input type="text" class="doc-search" id="docSearchInput" placeholder="Search SOPs, PBRs, specs...">' +
      '<div id="docResults" class="doc-nav">' + buildDocsHTML(type) + '</div></div>';
  }

  detailPanel.innerHTML = html;
  detailPanel.classList.add('active');
  defaultIntel.style.display = 'none';

  // Close button — wired by interaction.js via onClose callback
  if (typeof renderDetail._onClose === 'function') {
    document.getElementById('equipClose').addEventListener('click', renderDetail._onClose);
  }

  // Stage tabs for bioreactors
  if (type === 'BR' || type === 'SEED BR') {
    detailPanel.querySelectorAll('.equip-stage-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        detailPanel.querySelectorAll('.equip-stage-tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        document.getElementById('stageContent').innerHTML = renderBRStage(data.stages[tab.dataset.stage], tab.dataset.stage);
      });
    });
  }

  // Panel-level tabs (Process / History / Documents)
  if (hasDocs || hasHistory) {
    var processPane = document.getElementById('panelProcess');
    var historyPane = hasHistory ? document.getElementById('panelHistory') : null;
    var docsPane = hasDocs ? document.getElementById('panelDocs') : null;
    detailPanel.querySelectorAll('.equip-panel-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        detailPanel.querySelectorAll('.equip-panel-tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        var which = tab.dataset.panel;
        processPane.style.display = which === 'process' ? '' : 'none';
        if (historyPane) historyPane.style.display = which === 'history' ? '' : 'none';
        if (docsPane) docsPane.style.display = which === 'docs' ? '' : 'none';
        if (which === 'docs' && docsPane) {
          document.getElementById('docSearchInput').focus();
        }
      });
    });

    // Live search within docs
    document.getElementById('docSearchInput').addEventListener('input', function () {
      document.getElementById('docResults').innerHTML = buildDocsHTML(type, this.value);
    });

    // Doc item click — open in floating viewer
    docsPane.addEventListener('click', function (e) {
      var item = e.target.closest('.doc-item');
      if (!item) return;
      openDocInViewer(item.dataset.docId);
    });
  }
}

function hideDetailPanel() {
  detailPanel.classList.remove('active');
  detailPanel.innerHTML = '';
  defaultIntel.style.display = '';
}

export {
  getEquipType,
  statusColor,
  barColor,
  buildProcessHTML,
  buildDocsHTML,
  renderDetail,
  renderBRStage,
  hideDetailPanel
};
