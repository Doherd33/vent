import * as THREE from 'three';
import { scene, equipment, bioreactors, wireMat, solidMat, pipeMat } from './scene.js';

// Helper: create a vessel (cylinder + hemisphere caps)
export function makeVessel(radius, height, x, z, name, desc) {
  var group = new THREE.Group();
  group.position.set(x, height / 2 + radius * 0.4, z);
  group.userData = { name: name, desc: desc };

  // Body
  var bodyGeo = new THREE.CylinderGeometry(radius, radius, height, 16);
  group.add(new THREE.Mesh(bodyGeo, wireMat.clone()));
  group.add(new THREE.Mesh(bodyGeo, solidMat.clone()));

  // Top dome
  var topGeo = new THREE.SphereGeometry(radius, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  var topMesh = new THREE.Mesh(topGeo, wireMat.clone());
  topMesh.position.y = height / 2;
  group.add(topMesh);
  var topSolid = new THREE.Mesh(topGeo, solidMat.clone());
  topSolid.position.y = height / 2;
  group.add(topSolid);

  // Bottom dome
  var botGeo = new THREE.SphereGeometry(radius, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  var botMesh = new THREE.Mesh(botGeo, wireMat.clone());
  botMesh.rotation.x = Math.PI;
  botMesh.position.y = -height / 2;
  group.add(botMesh);
  var botSolid = new THREE.Mesh(botGeo, solidMat.clone());
  botSolid.rotation.x = Math.PI;
  botSolid.position.y = -height / 2;
  group.add(botSolid);

  // Legs (4 small cylinders)
  for (var i = 0; i < 4; i++) {
    var angle = (i / 4) * Math.PI * 2;
    var legGeo = new THREE.CylinderGeometry(0.04, 0.04, radius * 0.8, 4);
    var leg = new THREE.Mesh(legGeo, pipeMat.clone());
    leg.position.set(
      Math.cos(angle) * radius * 0.7,
      -height / 2 - radius * 0.4,
      Math.sin(angle) * radius * 0.7
    );
    group.add(leg);
  }

  scene.add(group);
  equipment.push(group);
  return group;
}

// Helper: pipe between two points
export function makePipe(start, end) {
  var dir = new THREE.Vector3().subVectors(end, start);
  var len = dir.length();
  var geo = new THREE.CylinderGeometry(0.04, 0.04, len, 6);
  var pipe = new THREE.Mesh(geo, pipeMat.clone());
  pipe.position.copy(start).add(dir.multiplyScalar(0.5));
  pipe.lookAt(end);
  pipe.rotateX(Math.PI / 2);
  scene.add(pipe);
  return pipe;
}

// Helper: small box (filter/skid housing)
export function makeBox(w, h, d, x, z, name, desc) {
  var group = new THREE.Group();
  group.position.set(x, h / 2, z);
  group.userData = { name: name, desc: desc };

  var geo = new THREE.BoxGeometry(w, h, d);
  group.add(new THREE.Mesh(geo, wireMat.clone()));
  group.add(new THREE.Mesh(geo, solidMat.clone()));

  // Legs
  var legH = 0.3;
  var legGeo = new THREE.CylinderGeometry(0.03, 0.03, legH, 4);
  [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(function(c) {
    var leg = new THREE.Mesh(legGeo, pipeMat.clone());
    leg.position.set(c[0] * w * 0.35, -h / 2 - legH / 2, c[1] * d * 0.35);
    group.add(leg);
  });

  scene.add(group);
  equipment.push(group);
  return group;
}

// Helper: room outline (flat rectangle on the floor with walls)
export function makeRoom(cx, cz, w, d, wallH, name) {
  var wallMat = new THREE.MeshBasicMaterial({
    color: 0x4ec9b0, wireframe: true, transparent: true, opacity: 0.15
  });
  var floorMat = new THREE.MeshBasicMaterial({
    color: 0x4ec9b0, transparent: true, opacity: 0.03, side: THREE.DoubleSide
  });
  // Floor
  var floorGeo = new THREE.PlaneGeometry(w, d);
  var floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cx, 0.01, cz);
  scene.add(floor);
  // Walls (4 thin boxes)
  var t = 0.04;
  var wallGeo;
  // Front wall (z+)
  wallGeo = new THREE.BoxGeometry(w, wallH, t);
  var wf = new THREE.Mesh(wallGeo, wallMat);
  wf.position.set(cx, wallH / 2, cz + d / 2);
  scene.add(wf);
  // Back wall (z-)
  var wb = new THREE.Mesh(wallGeo, wallMat);
  wb.position.set(cx, wallH / 2, cz - d / 2);
  scene.add(wb);
  // Left wall (x-)
  wallGeo = new THREE.BoxGeometry(t, wallH, d);
  var wl = new THREE.Mesh(wallGeo, wallMat);
  wl.position.set(cx - w / 2, wallH / 2, cz);
  scene.add(wl);
  // Right wall (x+)
  var wr = new THREE.Mesh(wallGeo, wallMat);
  wr.position.set(cx + w / 2, wallH / 2, cz);
  scene.add(wr);
  // Label
  if (name) makeLabel3D(name, new THREE.Vector3(cx, wallH + 0.5, cz));
}

// Helper: GMP corridor (same as makeRoom but with gold-tinted floor)
export function makeCorridor(cx, cz, w, d, wallH, name) {
  var wallMat = new THREE.MeshBasicMaterial({
    color: 0xb5a642, wireframe: true, transparent: true, opacity: 0.15
  });
  var floorMat = new THREE.MeshBasicMaterial({
    color: 0xb5a642, transparent: true, opacity: 0.05, side: THREE.DoubleSide
  });
  // Floor
  var floorGeo = new THREE.PlaneGeometry(w, d);
  var floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cx, 0.01, cz);
  scene.add(floor);
  // Walls (4 thin boxes)
  var t = 0.04;
  var wallGeo;
  // Front wall (z+)
  wallGeo = new THREE.BoxGeometry(w, wallH, t);
  var wf = new THREE.Mesh(wallGeo, wallMat);
  wf.position.set(cx, wallH / 2, cz + d / 2);
  scene.add(wf);
  // Back wall (z-)
  var wb = new THREE.Mesh(wallGeo, wallMat);
  wb.position.set(cx, wallH / 2, cz - d / 2);
  scene.add(wb);
  // Left wall (x-)
  wallGeo = new THREE.BoxGeometry(t, wallH, d);
  var wl = new THREE.Mesh(wallGeo, wallMat);
  wl.position.set(cx - w / 2, wallH / 2, cz);
  scene.add(wl);
  // Right wall (x+)
  var wr = new THREE.Mesh(wallGeo, wallMat);
  wr.position.set(cx + w / 2, wallH / 2, cz);
  scene.add(wr);
  // Label
  if (name) makeLabel3D(name, new THREE.Vector3(cx, wallH + 0.5, cz));
}

// Sprite label helper
export function makeLabel3D(text, position) {
  var canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  var ctx = canvas.getContext('2d');
  ctx.font = '24px JetBrains Mono, monospace';
  ctx.fillStyle = '#4ec9b0';
  ctx.textAlign = 'center';
  ctx.fillText(text, 256, 40);
  var texture = new THREE.CanvasTexture(canvas);
  var mat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.6 });
  var sprite = new THREE.Sprite(mat);
  sprite.position.copy(position);
  sprite.scale.set(3, 0.4, 1);
  scene.add(sprite);
}

// Add impeller to a bioreactor group
export function addImpeller(brGroup) {
  var shaftGeo = new THREE.CylinderGeometry(0.03, 0.03, 2.2, 6);
  var shaft = new THREE.Mesh(shaftGeo, pipeMat);
  brGroup.add(shaft);
  for (var b = 0; b < 3; b++) {
    var bladeGeo = new THREE.BoxGeometry(0.45, 0.02, 0.1);
    var blade = new THREE.Mesh(bladeGeo, pipeMat.clone());
    blade.position.y = -0.3 + b * 0.4;
    blade.rotation.y = b * (Math.PI / 3);
    blade.userData._isBlade = true;
    brGroup.add(blade);
  }
}

// Vessel support frames (square frame + angled legs for load cells)
export function makeVesselFrame(vx, vz, frameW, vesselR, baseY) {
  var frameMat = new THREE.MeshBasicMaterial({
    color: 0x4ec9b0, wireframe: true, transparent: true, opacity: 0.4
  });
  var hw = frameW / 2;
  // Top square frame (horizontal rails)
  var railGeo = new THREE.CylinderGeometry(0.03, 0.03, frameW, 4);
  // X rails (front & back)
  [-1, 1].forEach(function (s) {
    var rail = new THREE.Mesh(railGeo, frameMat);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(vx, baseY, vz + s * hw);
    scene.add(rail);
  });
  // Z rails (left & right)
  var railZ = new THREE.CylinderGeometry(0.03, 0.03, frameW, 4);
  [-1, 1].forEach(function (s) {
    var rail = new THREE.Mesh(railZ, frameMat);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(vx + s * hw, baseY, vz);
    scene.add(rail);
  });
  // 4 angled legs from corners down to floor, angling inward to vessel base
  var legTargetR = vesselR * 0.5;
  [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(function (c) {
    var topX = vx + c[0] * hw;
    var topZ = vz + c[1] * hw;
    var botX = vx + c[0] * legTargetR;
    var botZ = vz + c[1] * legTargetR;
    var start = new THREE.Vector3(topX, 0, topZ);
    var end = new THREE.Vector3(botX, baseY, botZ);
    var dir = new THREE.Vector3().subVectors(end, start);
    var len = dir.length();
    var legGeo = new THREE.CylinderGeometry(0.035, 0.035, len, 4);
    var leg = new THREE.Mesh(legGeo, frameMat);
    leg.position.copy(start).add(dir.multiplyScalar(0.5));
    leg.lookAt(end);
    leg.rotateX(Math.PI / 2);
    scene.add(leg);
  });
}

// BSC (Biological Safety Cabinet)
export function makeBSC(x, z, name, desc) {
  var group = new THREE.Group();
  group.position.set(x, 0.9, z);
  group.userData = { name: name, desc: desc };

  // Main body
  var bodyGeo = new THREE.BoxGeometry(1.8, 1.2, 0.7);
  group.add(new THREE.Mesh(bodyGeo, wireMat.clone()));
  group.add(new THREE.Mesh(bodyGeo, solidMat.clone()));

  // Glass sash (front, slightly transparent)
  var sashGeo = new THREE.BoxGeometry(1.7, 0.5, 0.02);
  var sashMat = new THREE.MeshBasicMaterial({ color: 0x4ec9b0, transparent: true, opacity: 0.15 });
  var sash = new THREE.Mesh(sashGeo, sashMat);
  sash.position.set(0, 0.3, 0.36);
  sash.rotation.x = -0.15;
  group.add(sash);

  // 4 legs
  var legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.6, 4);
  [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(function(c) {
    var leg = new THREE.Mesh(legGeo, pipeMat.clone());
    leg.position.set(c[0] * 0.8, -0.9, c[1] * 0.3);
    group.add(leg);
  });

  scene.add(group);
  equipment.push(group);
  return group;
}

// Wall-mounted utility panel (PRO STAINLESS style — gas lines + power outlets)
export function makeUtilityPanel(x, z, name, desc) {
  var group = new THREE.Group();
  group.position.set(x, 1.2, z);
  group.userData = { name: name, desc: desc };

  // Backplate (recessed stainless)
  var plateGeo = new THREE.BoxGeometry(1.2, 1.4, 0.08);
  group.add(new THREE.Mesh(plateGeo, wireMat.clone()));
  group.add(new THREE.Mesh(plateGeo, solidMat.clone()));

  // 7 vertical pipe stubs (VACUUM, TGS, TGR, PCA, CO2, O2, N2)
  for (var i = 0; i < 7; i++) {
    var pipeGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 4);
    var pipe = new THREE.Mesh(pipeGeo, pipeMat.clone());
    pipe.position.set(-0.45 + i * 0.15, 0, 0.05);
    group.add(pipe);
  }

  // Power outlet panel below
  var outletGeo = new THREE.BoxGeometry(1.1, 0.3, 0.06);
  var outlet = new THREE.Mesh(outletGeo, wireMat.clone());
  outlet.position.y = -0.85;
  group.add(outlet);

  scene.add(group);
  equipment.push(group);
  return group;
}

// Mobile stainless steel trolley/rack
export function makeTrolley(x, z, name, desc) {
  var group = new THREE.Group();
  group.position.set(x, 0.6, z);
  group.userData = { name: name, desc: desc };

  // Frame (open shelving)
  var frameGeo = new THREE.BoxGeometry(0.8, 1.0, 0.5);
  group.add(new THREE.Mesh(frameGeo, wireMat.clone()));

  // Shelf
  var shelfGeo = new THREE.BoxGeometry(0.75, 0.02, 0.45);
  var shelf = new THREE.Mesh(shelfGeo, solidMat.clone());
  shelf.position.y = -0.2;
  group.add(shelf);

  // 4 caster wheels
  [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(function(c) {
    var wheelGeo = new THREE.SphereGeometry(0.04, 6, 4);
    var wheel = new THREE.Mesh(wheelGeo, pipeMat.clone());
    wheel.position.set(c[0] * 0.35, -0.5, c[1] * 0.2);
    group.add(wheel);
  });

  scene.add(group);
  equipment.push(group);
  return group;
}
