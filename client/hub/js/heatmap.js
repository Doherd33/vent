// ── Heatmap overlays: training coverage, deviation hotspots ──
import * as THREE from 'three';
import { equipment } from './scene.js';
import { TRAINING_MATRIX, SHIFT_ROSTER } from './data.js';
import { getEquipType } from './ui.js';

// ── Heatmap materials ──
var matGreenWire = new THREE.MeshBasicMaterial({ color: 0x4ec9b0, wireframe: true, transparent: true, opacity: 0.6 });
var matGreenSolid = new THREE.MeshBasicMaterial({ color: 0x4ec9b0, transparent: true, opacity: 0.15 });
var matAmberWire = new THREE.MeshBasicMaterial({ color: 0xffc64d, wireframe: true, transparent: true, opacity: 0.6 });
var matAmberSolid = new THREE.MeshBasicMaterial({ color: 0xffc64d, transparent: true, opacity: 0.15 });
var matRedWire = new THREE.MeshBasicMaterial({ color: 0xff4444, wireframe: true, transparent: true, opacity: 0.7 });
var matRedSolid = new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.18 });
var matDimWire = new THREE.MeshBasicMaterial({ color: 0x4ec9b0, wireframe: true, transparent: true, opacity: 0.1 });
var matDimSolid = new THREE.MeshBasicMaterial({ color: 0x4ec9b0, transparent: true, opacity: 0.02 });

var _active = false;
var _savedMaterials = []; // [{ mesh, material }]

// DOM refs
var legendEl = document.getElementById('heatmapLegend');
var panelEl = document.getElementById('heatmapPanel');
var toggleBtn = document.getElementById('heatmapToggle');

// ── Coverage calculation ──
function getCoverage(type) {
  var entry = TRAINING_MATRIX[type];
  if (!entry) return null;

  var onShift = SHIFT_ROSTER.operators.map(function(o) { return o.id; });
  var qualifiedOnShift = entry.qualified.filter(function(id) {
    return onShift.indexOf(id) !== -1;
  });

  var count = qualifiedOnShift.length;
  var required = entry.required;

  if (count >= required) return 'full';
  if (count >= 1) return 'minimum';
  return 'none';
}

function getCoverageDetail(type) {
  var entry = TRAINING_MATRIX[type];
  if (!entry) return null;

  var onShift = SHIFT_ROSTER.operators.map(function(o) { return o.id; });
  var qualifiedOnShift = entry.qualified.filter(function(id) {
    return onShift.indexOf(id) !== -1;
  });

  // Resolve names
  var qualifiedNames = qualifiedOnShift.map(function(id) {
    var op = SHIFT_ROSTER.operators.find(function(o) { return o.id === id; });
    return op ? op.name : id;
  });

  return {
    label: entry.label,
    required: entry.required,
    qualifiedCount: qualifiedOnShift.length,
    qualifiedNames: qualifiedNames,
    totalQualified: entry.qualified.length,
    ojts: entry.ojts,
    sopRefs: entry.sopRefs,
    lastAssessment: entry.lastAssessment,
    nextAssessment: entry.nextAssessment
  };
}

// ── Apply heatmap colours to all equipment ──
function applyHeatmap() {
  _savedMaterials = [];

  equipment.forEach(function(grp) {
    var name = grp.userData.name;
    if (!name) return;

    var type = getEquipType(name);
    var coverage = getCoverage(type);

    grp.traverse(function(child) {
      if (!child.isMesh) return;
      // Save original material
      _savedMaterials.push({ mesh: child, material: child.material });

      if (coverage === 'full') {
        child.material = child.material.wireframe ? matGreenWire : matGreenSolid;
      } else if (coverage === 'minimum') {
        child.material = child.material.wireframe ? matAmberWire : matAmberSolid;
      } else if (coverage === 'none') {
        child.material = child.material.wireframe ? matRedWire : matRedSolid;
      } else {
        // No training data — dim it
        child.material = child.material.wireframe ? matDimWire : matDimSolid;
      }
    });
  });
}

// ── Restore original materials ──
function restoreMaterials() {
  _savedMaterials.forEach(function(entry) {
    entry.mesh.material = entry.material;
  });
  _savedMaterials = [];
}

// ── Build summary panel HTML ──
function buildSummaryHTML() {
  var onShift = SHIFT_ROSTER.operators;
  var types = Object.keys(TRAINING_MATRIX);
  var fullCount = 0, minCount = 0, noneCount = 0;

  types.forEach(function(type) {
    var c = getCoverage(type);
    if (c === 'full') fullCount++;
    else if (c === 'minimum') minCount++;
    else if (c === 'none') noneCount++;
  });

  var html = '<div class="hm-panel-header">' +
    '<span class="hm-panel-title">TRAINING COVERAGE</span>' +
    '<button class="equip-detail-close" id="heatmapClose">ESC</button>' +
  '</div>';

  html += '<div class="hm-shift-info">' +
    '<div class="equip-row"><span>Shift</span><span class="val green">' + SHIFT_ROSTER.shift + '</span></div>' +
    '<div class="equip-row"><span>Date</span><span class="val">' + SHIFT_ROSTER.date + '</span></div>' +
    '<div class="equip-row"><span>Operators</span><span class="val">' + onShift.length + '</span></div>' +
  '</div>';

  // Roster
  html += '<div class="hm-section"><div class="hm-section-label">On Shift</div>';
  onShift.forEach(function(op) {
    html += '<div class="hm-roster-row">' +
      '<span class="hm-roster-name">' + op.name + '</span>' +
      '<span class="hm-roster-role">' + op.role + '</span>' +
    '</div>';
  });
  html += '</div>';

  // Coverage summary
  html += '<div class="hm-section"><div class="hm-section-label">Coverage Summary</div>' +
    '<div class="equip-row"><span>Full coverage</span><span class="val green">' + fullCount + '</span></div>' +
    '<div class="equip-row"><span>Minimum coverage</span><span class="val amber">' + minCount + '</span></div>' +
    '<div class="equip-row"><span>No coverage</span><span class="val red">' + noneCount + '</span></div>' +
  '</div>';

  // Risk areas (red + amber)
  html += '<div class="hm-section"><div class="hm-section-label">Risk Areas</div>';
  types.forEach(function(type) {
    var c = getCoverage(type);
    if (c === 'none' || c === 'minimum') {
      var detail = getCoverageDetail(type);
      var colorClass = c === 'none' ? 'red' : 'amber';
      html += '<div class="hm-risk-row">' +
        '<span class="hm-risk-dot ' + colorClass + '"></span>' +
        '<span class="hm-risk-name">' + detail.label + '</span>' +
        '<span class="val ' + colorClass + '">' + detail.qualifiedCount + '/' + detail.required + '</span>' +
      '</div>';
    }
  });
  html += '</div>';

  // OJTs in progress
  var activeOJTs = [];
  types.forEach(function(type) {
    var entry = TRAINING_MATRIX[type];
    entry.ojts.forEach(function(ojt) {
      if (ojt.status === 'in-progress') {
        var op = SHIFT_ROSTER.operators.find(function(o) { return o.id === ojt.operator; });
        activeOJTs.push({
          operator: op ? op.name : ojt.operator,
          equipment: entry.label,
          completion: ojt.completion,
          target: ojt.targetDate
        });
      }
    });
  });

  if (activeOJTs.length) {
    html += '<div class="hm-section"><div class="hm-section-label">Active OJTs</div>';
    activeOJTs.forEach(function(ojt) {
      var barColor = ojt.completion >= 80 ? 'var(--hud-green)' : ojt.completion >= 50 ? 'var(--hud-amber)' : 'var(--hud-red)';
      html += '<div class="hm-ojt-row">' +
        '<div class="hm-ojt-header">' +
          '<span class="hm-ojt-name">' + ojt.operator + '</span>' +
          '<span class="hm-ojt-pct">' + ojt.completion + '%</span>' +
        '</div>' +
        '<div class="hm-ojt-equip">' + ojt.equipment + ' · Due ' + ojt.target + '</div>' +
        '<div class="equip-bar-track"><div class="equip-bar-fill" style="width:' + ojt.completion + '%;background:' + barColor + '"></div></div>' +
      '</div>';
    });
    html += '</div>';
  }

  return html;
}

// ── Toggle heatmap on/off ──
export function toggleHeatmap() {
  _active = !_active;

  if (_active) {
    applyHeatmap();
    legendEl.classList.add('show');
    document.getElementById('heatmapShiftLabel').textContent = SHIFT_ROSTER.shift + ' · ' + SHIFT_ROSTER.date;
    panelEl.innerHTML = buildSummaryHTML();
    panelEl.classList.add('active');
    toggleBtn.classList.add('active');

    // Wire close button
    var closeBtn = document.getElementById('heatmapClose');
    if (closeBtn) closeBtn.addEventListener('click', toggleHeatmap);

    // Hide default intel + equip detail
    var defaultIntel = document.getElementById('intelDefault');
    var equipDetail = document.getElementById('equipDetail');
    if (defaultIntel) defaultIntel.style.display = 'none';
    if (equipDetail) { equipDetail.classList.remove('active'); equipDetail.innerHTML = ''; }
  } else {
    restoreMaterials();
    legendEl.classList.remove('show');
    panelEl.classList.remove('active');
    panelEl.innerHTML = '';
    toggleBtn.classList.remove('active');

    // Restore default intel
    var defaultIntel = document.getElementById('intelDefault');
    if (defaultIntel) defaultIntel.style.display = '';
  }
}

export function isHeatmapActive() {
  return _active;
}

// ── Keyboard shortcut: H to toggle ──
document.addEventListener('keydown', function(e) {
  if (e.key === 'h' || e.key === 'H') {
    // Don't trigger if typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    toggleHeatmap();
  }
});
