import * as THREE from 'three';
import { scene, equipment, bioreactors, wireMat, solidMat, pipeMat } from './scene.js';
import {
  makeVessel,
  makeBox,
  makeRoom,
  makePipe,
  makeLabel3D,
  addImpeller,
  makeVesselFrame,
  makeBSC,
  makeUtilityPanel,
  makeTrolley
} from './helpers.js';

// ══════════════════════════════════════════════════════════
//  DK2 Manufacturing Level 1 — MFG 6.1 & MFG 6.2
//  Mirror-image suites: 6.1 at X < 0, 6.2 at X > 0
// ══════════════════════════════════════════════════════════

// ── Build one bioreactor station ──
function makeStation(cx, num, cz) {
  // 1. Bioreactor (1000L) — Sartorius BIOSTAT STR
  var br = makeVessel(0.7, 2.0, cx, cz,
    'BR-' + num + ' · 1000L',
    'Sartorius BIOSTAT STR 1000L — single-use perfusion bioreactor'
  );
  addImpeller(br);
  bioreactors.push(br);
  makeLabel3D('BR-' + num, new THREE.Vector3(cx, 4.0, cz));

  // 1b. Control tower (right of BR)
  makeBox(0.6, 1.2, 0.5, cx + 1.8, cz,
    'SARTORIUS BIOSTAT STR · BR-' + num,
    'Process controller — pH, DO₂, temp cascade loops, alarms'
  );

  // 1c. Gas supply panel (behind BR)
  var gasPanel = makeBox(0.8, 1.0, 0.15, cx - 1.4, cz - 1.5,
    'GAS PANEL · BR-' + num,
    'O₂/CO₂/N₂/Air — Bronkhorst EL-FLOW mass flow controllers'
  );
  gasPanel.position.y = 1.0;

  // 2. Feed totes (2000L each)
  var fx = cx - 2.5;
  makeBox(0.8, 0.9, 0.8, fx, cz + 1.5,
    'FEED TOTE A · BR-' + num,
    '2000L single-use feed — CD CHO + supplements'
  );
  makeBox(0.8, 0.9, 0.8, fx, cz + 3,
    'FEED TOTE B · BR-' + num,
    '2000L single-use feed — CD CHO + supplements'
  );

  // 3. Bleed totes (2000L each)
  var bx = cx + 2.5;
  makeBox(0.8, 0.9, 0.8, bx, cz + 1.5,
    'BLEED TOTE A · BR-' + num,
    '2000L bleed — cell density & viability control'
  );
  makeBox(0.8, 0.9, 0.8, bx, cz + 3,
    'BLEED TOTE B · BR-' + num,
    '2000L bleed — cell density & viability control'
  );

  // 4. ATF filters — Repligen XCell ATF
  var atfZ = cz + 1.5;
  makeVessel(0.2, 1.0, cx - 0.6, atfZ,
    'REPLIGEN XCell ATF-A · BR-' + num,
    'Alternating tangential flow — 0.2μm hollow fibre, cell retention'
  );
  makeVessel(0.2, 1.0, cx + 0.6, atfZ,
    'REPLIGEN XCell ATF-B · BR-' + num,
    'Alternating tangential flow — 0.2μm hollow fibre, cell retention'
  );

  // 5. Single-use filter
  var suZ = cz + 3.5;
  makeVessel(0.12, 0.4, cx, suZ,
    'SU FILTER · BR-' + num,
    'Single-use depth filter — 40-day campaign'
  );

  // ── Station piping ──
  var pY = 1.5;

  // Feeds → BR
  makePipe(new THREE.Vector3(fx, pY, cz + 1.5), new THREE.Vector3(cx - 0.7, pY, cz));
  makePipe(new THREE.Vector3(fx, pY, cz + 3), new THREE.Vector3(cx - 0.7, pY, cz));

  // BR → Bleeds
  makePipe(new THREE.Vector3(cx + 0.7, pY, cz), new THREE.Vector3(bx, pY, cz + 1.5));
  makePipe(new THREE.Vector3(cx + 0.7, pY, cz), new THREE.Vector3(bx, pY, cz + 3));

  // BR → ATFs
  makePipe(new THREE.Vector3(cx, pY, cz + 0.7), new THREE.Vector3(cx - 0.6, pY, atfZ - 0.5));
  makePipe(new THREE.Vector3(cx, pY, cz + 0.7), new THREE.Vector3(cx + 0.6, pY, atfZ - 0.5));

  // ATFs → SU filter
  makePipe(new THREE.Vector3(cx - 0.6, pY, atfZ + 0.5), new THREE.Vector3(cx, pY * 0.6, suZ - 0.2));
  makePipe(new THREE.Vector3(cx + 0.6, pY, atfZ + 0.5), new THREE.Vector3(cx, pY * 0.6, suZ - 0.2));

  return { suX: cx, suZ: suZ, pY: pY * 0.6 };
}

// ══════════════════════════════════════════════════════════
//  makeSuite — builds one complete manufacturing suite
//  suiteId: '6.1' or '6.2'
//  mirrorX: -1 (left/6.1) or +1 (right/6.2)
// ══════════════════════════════════════════════════════════
function makeSuite(suiteId, mirrorX) {
  var baseX = mirrorX * 18;
  var prefix = suiteId === '6.1' ? 1 : 2; // 1xx or 2xx

  // ── Upstream Processing Room ──
  makeRoom(baseX, 8, 18, 10, 3.0, 'MFG ' + suiteId + ' · UPSTREAM');

  // 3 bioreactor stations spread across the room
  var s1 = makeStation(baseX + 6, prefix + '01', 6);
  var s2 = makeStation(baseX, prefix + '02', 6);
  var s3 = makeStation(baseX - 6, prefix + '03', 6);

  // ── Downstream within USP room ──
  // Harvest sump (front of USP room)
  var harvestZ = 11;
  var harvest = makeVessel(0.6, 1.4, baseX, harvestZ,
    'HARVEST SUMP · ' + suiteId,
    'Permeate collection — clarified harvest from all 3 bioreactors'
  );
  makeLabel3D('HARVEST', new THREE.Vector3(baseX, 3.2, harvestZ));

  // SU filters → harvest sump
  [s1, s2, s3].forEach(function(s) {
    makePipe(
      new THREE.Vector3(s.suX, s.pY, s.suZ + 0.3),
      new THREE.Vector3(baseX, 1.2, harvestZ - 0.6)
    );
  });

  // ── DSP 1 Room ──
  var dsp1X = baseX - mirrorX * 5;
  makeRoom(dsp1X, 16, 8, 6, 3.0, 'DSP 1 · ' + suiteId);

  // AKTA columns in DSP 1
  makeVessel(0.2, 1.6, dsp1X - 0.5, 16,
    'PROTEIN A COLUMN · ' + suiteId,
    'AKTA — affinity capture, primary purification'
  );
  makeVessel(0.2, 1.6, dsp1X + 0.5, 16,
    'ION EXCHANGE COLUMN · ' + suiteId,
    'AKTA — polish step, charge-based separation'
  );
  makeLabel3D('AKTA', new THREE.Vector3(dsp1X, 2.8, 16));

  // Harvest → DSP 1
  makePipe(new THREE.Vector3(baseX, 1.2, harvestZ + 0.6), new THREE.Vector3(dsp1X, 1.2, 16 - 2.5));

  // ── DSP 2 Room ──
  var dsp2X = baseX + mirrorX * 5;
  makeRoom(dsp2X, 16, 8, 6, 3.0, 'DSP 2 · ' + suiteId);

  // UF/DF skid in DSP 2
  makeBox(0.8, 0.6, 0.5, dsp2X, 15.5,
    'UF/DF SKID · ' + suiteId,
    'Ultrafiltration / diafiltration — concentration & buffer exchange'
  );
  makeLabel3D('UF/DF', new THREE.Vector3(dsp2X, 1.6, 15.5));

  // Fill tank in DSP 2
  makeVessel(0.4, 1.0, dsp2X, 17,
    'FILL TANK · 200L · ' + suiteId,
    'Final bulk drug substance — ready for fill/finish'
  );
  makeLabel3D('FILL', new THREE.Vector3(dsp2X, 2.4, 17));

  // DSP 1 → DSP 2 pipe
  makePipe(new THREE.Vector3(dsp1X + mirrorX * 3.5, 1.2, 16), new THREE.Vector3(dsp2X - mirrorX * 3.5, 0.6, 15.5));
  // UF/DF → Fill
  makePipe(new THREE.Vector3(dsp2X, 0.6, 15.8), new THREE.Vector3(dsp2X, 0.8, 17 - 0.5));

  // ── Seed Room (photo-accurate: long rectangle, utility panels on back wall) ──
  // Aligned so 50L BRs sit directly below their 1000L production BRs
  makeRoom(baseX, -5, 18, 8, 2.5, 'SEED · ' + suiteId);

  // Back wall: 6 utility panels aligned with production stations (X = baseX+6, 0, -6)
  // plus 3 spares between/beside them
  var panelZ = -8.5;
  var panelPositions = [baseX + 6, baseX + 3, baseX, baseX - 3, baseX - 6, baseX - 8];
  panelPositions.forEach(function(px, i) {
    var panelNum = '0' + (i + 1);
    makeUtilityPanel(px, panelZ,
      'UP-0262-' + panelNum + ' · ' + suiteId,
      'PRO STAINLESS utility panel — VACUUM, TGS, TGR, PCA, CO₂, O₂, N₂'
    );
  });

  // 3 × 50L bioreactors — aligned with 1000L stations at baseX+6, baseX, baseX-6
  [baseX + 6, baseX, baseX - 6].forEach(function(stationX, i) {
    var brNum = prefix + '1' + (i + 1);

    var br50 = makeVessel(0.3, 1.0, stationX - 0.5, panelZ + 1.8,
      'BR-' + brNum + ' · 50L',
      'GE/Cytiva Xcellerex XDR-50 — 50L single-use seed bioreactor'
    );
    addImpeller(br50);
    bioreactors.push(br50);

    makeBox(0.5, 1.4, 0.4, stationX + 0.3, panelZ + 1.8,
      'BIOSTAT CONTROLLER · BR-' + brNum,
      'Integrated controller — pH, DO₂, temp, agitation, blue LCD displays'
    );

    makeLabel3D('BR-' + brNum, new THREE.Vector3(stationX, 3.5, panelZ + 1.8));

    // Pipe: 50L → production USP bioreactor (straight up, same X)
    makePipe(new THREE.Vector3(stationX, 1.2, panelZ + 2.5), new THREE.Vector3(stationX, 1.5, 6 - 0.7));
  });

  // 2 × 20L bioreactors near entrance (between the 50L stations)
  [baseX + 3, baseX - 3].forEach(function(seedX20, i) {
    var brNum20 = prefix + '0' + (i + 1);

    var br20 = makeVessel(0.2, 0.7, seedX20, -3,
      'BR-' + brNum20 + ' · 20L',
      'GE/Cytiva Xcellerex XDR-20 — 20L single-use seed bioreactor'
    );
    addImpeller(br20);
    bioreactors.push(br20);

    makeBox(0.4, 1.0, 0.35, seedX20 + 0.5, -3,
      'BIOSTAT CONTROLLER · BR-' + brNum20,
      'Integrated controller — 20L seed expansion'
    );

    makeLabel3D('BR-' + brNum20 + ' 20L', new THREE.Vector3(seedX20, 2.5, -3));

    // Pipe: 20L → nearest 50L
    var nearest50X = i === 0 ? baseX + 6 : baseX - 6;
    makePipe(new THREE.Vector3(seedX20, 0.8, -2.5), new THREE.Vector3(nearest50X - 0.5, 1.0, panelZ + 1.0));
  });

  // Opposite wall: BSCs and instruments (Z = -2)
  var bscWall = -2;
  makeBSC(baseX + 6, bscWall,
    'THERMO HERASAFE 2030i · ' + suiteId,
    'Class II Type A2 biosafety cabinet — 1.8m, aseptic cell culture work'
  );
  makeBSC(baseX + 2, bscWall,
    'THERMO HERASAFE 2030i B · ' + suiteId,
    'Class II Type A2 biosafety cabinet — 1.8m, aseptic cell culture work'
  );
  makeBox(0.4, 0.5, 0.35, baseX - 2, bscWall,
    'BECKMAN Vi-CELL BLU · ' + suiteId,
    'Automated cell counter — trypan blue, 24-position carousel'
  );
  makeBox(0.4, 0.45, 0.35, baseX - 4, bscWall,
    'ROCHE CEDEX HiRes · ' + suiteId,
    'Automated cell analyser — cell morphology, viability & count'
  );
  makeBox(0.25, 0.2, 0.2, baseX - 6, bscWall,
    'ADVANCED INSTRUMENTS OsmoPRO · ' + suiteId,
    'Osmometer — freezing-point depression, 50μL sample'
  );

  // Centre: mobile SS trolleys
  makeTrolley(baseX + 3, -5, 'SS MOBILE RACK A · ' + suiteId, 'Stainless steel mobile rack — equipment staging');
  makeTrolley(baseX - 3, -5, 'SS MOBILE RACK B · ' + suiteId, 'Stainless steel mobile rack — equipment staging');

  // ── Inoculation Room ──
  var inocX = baseX + mirrorX * 8;
  makeRoom(inocX, -3, 5, 4, 2.5, 'INOCULATION · ' + suiteId);
  makeBox(0.3, 0.3, 0.3, inocX, -3,
    'INOCULATION VESSEL · ' + suiteId,
    'Cell thaw & initial culture expansion'
  );
  // Pass-through to seed room
  makeBox(0.6, 0.6, 0.15, inocX - mirrorX * 2, -3,
    'PASS-THROUGH · ' + suiteId,
    'Glass pass-through — inoculation to seed room'
  );
}

// ══════════════════════════════════════════════════════════
//  SHARED ROOMS (X = 0, between both suites)
// ══════════════════════════════════════════════════════════

function buildSharedRooms() {
  // ── Cell Bank Room ──
  makeRoom(0, -10, 8, 4, 2.5, 'CELL BANK');
  makeBox(1.2, 1.8, 0.8, -1.5, -10,
    'CELL BANK FREEZER A',
    '-80°C ultra-low freezer — master & working cell banks'
  );
  makeBox(1.2, 1.8, 0.8, 1.5, -10,
    'CELL BANK FREEZER B',
    '-80°C ultra-low freezer — backup cell bank storage'
  );
  makeVessel(0.3, 1.2, 0, -11,
    'LN₂ STORAGE',
    'Liquid nitrogen dewar — cryopreservation, vapour phase'
  );

  // ── Final Purification ──
  makeRoom(0, 22, 10, 4, 3.0, 'FINAL PURIFICATION');
  makeBox(1.0, 1.4, 0.8, -2, 22,
    'VIRAL INACTIVATION SKID',
    'Low pH viral inactivation — hold step, pH 3.5 for 60 min'
  );
  makeBox(1.0, 1.4, 0.8, 2, 22,
    'NANOFILTRATION SKID',
    'Planova 20N — virus removal filter, 20nm pore size'
  );
  makeLabel3D('VI', new THREE.Vector3(-2, 3.0, 22));
  makeLabel3D('NF', new THREE.Vector3(2, 3.0, 22));

  // DSP 1/2 → Final Purification pipes (from both suites)
  makePipe(new THREE.Vector3(-13, 1.2, 18.5), new THREE.Vector3(-4, 1.2, 22));
  makePipe(new THREE.Vector3(13, 1.2, 18.5), new THREE.Vector3(4, 1.2, 22));

  // ── DSP 3 (shared polish) ──
  makeRoom(0, 26, 8, 4, 3.0, 'DSP 3');
  makeVessel(0.25, 1.4, -1, 26,
    'POLISH COLUMN A',
    'Mixed-mode chromatography — final polish step'
  );
  makeVessel(0.25, 1.4, 1, 26,
    'POLISH COLUMN B',
    'Hydroxyapatite column — aggregate removal'
  );
  makeLabel3D('POLISH', new THREE.Vector3(0, 2.8, 26));

  // Final Purification → DSP 3
  makePipe(new THREE.Vector3(0, 1.2, 23.5), new THREE.Vector3(0, 1.2, 24.5));
}

// ══════════════════════════════════════════════════════════
//  SUPPORT AREAS
// ══════════════════════════════════════════════════════════

function buildSupportAreas() {
  // ── Media Prep (X = -30, Z = +16) ──
  var mpX = -30;
  var mpZ = 16;

  makeRoom(mpX, mpZ, 6, 7, 2.5, 'MEDIA PREP');

  // 4000L media prep vessel
  var mp4000 = makeVessel(0.9, 2.4, mpX, mpZ + 1.2,
    'MEDIA PREP · 4000L',
    'Sartorius Flexsafe Pro Mixer 4000L — CD CHO media preparation'
  );
  addImpeller(mp4000);
  bioreactors.push(mp4000);

  // 2000L media prep vessel
  var mp2000 = makeVessel(0.65, 1.8, mpX, mpZ - 1.8,
    'MEDIA PREP · 2000L',
    'Sartorius Flexsafe Pro Mixer 2000L — supplement/buffer preparation'
  );
  addImpeller(mp2000);
  bioreactors.push(mp2000);

  // Pipes
  makePipe(new THREE.Vector3(mpX, 1.4, mpZ - 1.0), new THREE.Vector3(mpX, 1.8, mpZ + 0.4));

  // Vessel support frames
  makeVesselFrame(mpX, mpZ + 1.2, 2.2, 0.9, 0.36);
  makeVesselFrame(mpX, mpZ - 1.8, 1.8, 0.65, 0.26);

  // ── Platform & stairs ──
  var platY = 2.8;
  var platW = 5;
  var platD = 6;
  var platMat = new THREE.MeshBasicMaterial({
    color: 0x4ec9b0, wireframe: true, transparent: true, opacity: 0.2
  });
  var platSolidMat = new THREE.MeshBasicMaterial({
    color: 0x4ec9b0, transparent: true, opacity: 0.03
  });

  // Platform deck
  var deckGeo = new THREE.BoxGeometry(platW, 0.06, platD);
  var deck = new THREE.Mesh(deckGeo, platMat);
  deck.position.set(mpX, platY, mpZ);
  scene.add(deck);
  var deckSolid = new THREE.Mesh(deckGeo, platSolidMat);
  deckSolid.position.set(mpX, platY, mpZ);
  scene.add(deckSolid);

  // Platform columns
  var colGeo = new THREE.CylinderGeometry(0.04, 0.04, platY, 4);
  [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(function (c) {
    var col = new THREE.Mesh(colGeo, platMat);
    col.position.set(mpX + c[0] * platW / 2, platY / 2, mpZ + c[1] * platD / 2);
    scene.add(col);
  });

  // Handrails
  var railMat = new THREE.MeshBasicMaterial({
    color: 0x4ec9b0, wireframe: true, transparent: true, opacity: 0.25
  });
  var railH = 1.0;
  [-1, 1].forEach(function (s) {
    var rGeo = new THREE.CylinderGeometry(0.02, 0.02, platW, 4);
    var r = new THREE.Mesh(rGeo, railMat);
    r.rotation.z = Math.PI / 2;
    r.position.set(mpX, platY + railH, mpZ + s * platD / 2);
    scene.add(r);
  });
  [-1, 1].forEach(function (s) {
    var rGeo = new THREE.CylinderGeometry(0.02, 0.02, platD, 4);
    var r = new THREE.Mesh(rGeo, railMat);
    r.rotation.x = Math.PI / 2;
    r.position.set(mpX + s * platW / 2, platY + railH, mpZ);
    scene.add(r);
  });
  [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(function (c) {
    var upGeo = new THREE.CylinderGeometry(0.02, 0.02, railH, 4);
    var up = new THREE.Mesh(upGeo, railMat);
    up.position.set(mpX + c[0] * platW / 2, platY + railH / 2, mpZ + c[1] * platD / 2);
    scene.add(up);
  });

  // Stairs
  var stairX = mpX + platW / 2 + 0.5;
  var stairSteps = 8;
  var stepW = 1.0;
  var stepD = 0.35;
  var stepH = platY / stairSteps;
  var stairMat = new THREE.MeshBasicMaterial({
    color: 0x4ec9b0, wireframe: true, transparent: true, opacity: 0.3
  });
  for (var st = 0; st < stairSteps; st++) {
    var stepGeo = new THREE.BoxGeometry(stepW, 0.04, stepD);
    var step = new THREE.Mesh(stepGeo, stairMat);
    step.position.set(stairX, platY - st * stepH, mpZ - platD / 2 + st * stepD + stepD / 2);
    scene.add(step);
  }
  // Stair stringers
  var stringerLen = Math.sqrt(platY * platY + (stairSteps * stepD) * (stairSteps * stepD));
  var stringerGeo = new THREE.CylinderGeometry(0.025, 0.025, stringerLen, 4);
  [-1, 1].forEach(function (s) {
    var stringer = new THREE.Mesh(stringerGeo, railMat);
    var topPt = new THREE.Vector3(stairX + s * stepW / 2, platY + railH, mpZ - platD / 2);
    var botPt = new THREE.Vector3(stairX + s * stepW / 2, railH * 0.5, mpZ - platD / 2 + stairSteps * stepD);
    stringer.position.copy(topPt).add(botPt).multiplyScalar(0.5);
    stringer.lookAt(botPt);
    stringer.rotateX(Math.PI / 2);
    scene.add(stringer);
  });

  // Media prep bench + instruments (wall-mounted, raised to counter height)
  var wallX = mpX - 3;
  var counterX = wallX + 0.4;
  var bench = makeBox(0.8, 0.06, 1.4, counterX, mpZ - 0.6,
    'LAB BENCH · MEDIA',
    'Stainless steel wall-mounted bench — media prep analytics'
  );
  bench.position.y = 0.9;

  var phMeter = makeBox(0.2, 0.25, 0.15, counterX, mpZ - 0.2,
    'METTLER TOLEDO SevenExcellence',
    'pH & conductivity meter — dual-channel, GLP-compliant'
  );
  phMeter.position.y = 1.05;

  var balance = makeBox(0.3, 0.1, 0.3, counterX, mpZ - 1.0,
    'METTLER TOLEDO XPR',
    'Analytical balance — 6200g capacity, 0.01g readability'
  );
  balance.position.y = 0.98;

  // Floor scales
  makeBox(1.5, 0.1, 1.5, wallX + 0.8, mpZ - 2.5,
    'METTLER TOLEDO ICS685',
    'Floor scales — 600kg capacity, tote weighing'
  );

  // Sterile filter
  makeVessel(0.15, 0.5, mpX - 2, mpZ + 1.0,
    'STERILE FILTER 0.2μm',
    'Sartorius Sartopore 2 — 0.2μm capsule, sterile media filtration'
  );
  makePipe(new THREE.Vector3(mpX - 0.9, 1.5, mpZ + 1.2), new THREE.Vector3(mpX - 2, 0.8, mpZ + 1.0));

}

// ══════════════════════════════════════════════════════════
//  BUILD EVERYTHING
// ══════════════════════════════════════════════════════════

makeSuite('6.1', -1);  // left side
makeSuite('6.2', +1);  // right side (mirror)
buildSharedRooms();
buildSupportAreas();
