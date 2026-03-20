// ── Holographic Core: Jarvis-style AI presence for Charlie ──
// Golden energy core with concentric rotating rings, orbiting particles,
// and a vertical light beam. Replaces the facility wireframe when active.
import * as THREE from 'three';
import { scene, camera, controls, equipment, redHighlightWire, redHighlightSolid } from './scene.js';

var avatar = null;
var avatarVisible = false;
var savedCamPos = null;
var savedCamTarget = null;
var fadeTransition = null;  // { t, direction: 'in'|'out' }
var particles = null;       // THREE.Points
var particleAngles = null;  // Float32Array for orbit angles

// ── Golden hologram materials ──
var coreMat = new THREE.MeshBasicMaterial({
  color: 0xFFAA33, transparent: true, opacity: 0.6
});
var coreGlowMat = new THREE.MeshBasicMaterial({
  color: 0xFFCC44, transparent: true, opacity: 0.15, side: THREE.BackSide
});
var ringMat = new THREE.MeshBasicMaterial({
  color: 0xFFCC44, wireframe: true, transparent: true, opacity: 0.4
});
var ringAccentMat = new THREE.MeshBasicMaterial({
  color: 0xFFDD66, wireframe: true, transparent: true, opacity: 0.25
});
var beamMat = new THREE.MeshBasicMaterial({
  color: 0xFFAA33, transparent: true, opacity: 0.1
});
var particleMat = new THREE.PointsMaterial({
  color: 0xFFDD66, size: 0.06, transparent: true, opacity: 0.6,
  sizeAttenuation: true
});

// ── Build the holographic core ──
export function createAvatar() {
  if (avatar) return avatar;

  avatar = new THREE.Group();
  avatar.position.set(0, 1.8, 0);
  avatar.visible = false;
  avatar.userData = { baseY: 1.8, breathT: 0, speakT: 0, flickerT: 0, ringSpeed: 1 };

  // ── Central energy core (icosahedron for faceted look) ──
  var coreGeo = new THREE.IcosahedronGeometry(0.35, 1);
  var core = new THREE.Mesh(coreGeo, coreMat.clone());
  avatar.add(core);
  avatar.userData.core = core;

  // Outer glow sphere (slightly larger, backside rendered)
  var glowGeo = new THREE.IcosahedronGeometry(0.5, 1);
  var glow = new THREE.Mesh(glowGeo, coreGlowMat.clone());
  avatar.add(glow);
  avatar.userData.glow = glow;

  // ── Inner ring — fast, tilted ──
  var innerRingGeo = new THREE.TorusGeometry(0.8, 0.012, 6, 48);
  var innerRing = new THREE.Mesh(innerRingGeo, ringMat.clone());
  innerRing.rotation.x = Math.PI / 2 + 0.3;
  innerRing.rotation.z = 0.2;
  avatar.add(innerRing);
  avatar.userData.innerRing = innerRing;

  // ── Mid ring — medium speed, different axis ──
  var midRingGeo = new THREE.TorusGeometry(1.2, 0.01, 6, 64);
  var midRing = new THREE.Mesh(midRingGeo, ringMat.clone());
  midRing.rotation.x = Math.PI / 2 - 0.15;
  midRing.rotation.y = 0.4;
  avatar.add(midRing);
  avatar.userData.midRing = midRing;

  // ── Outer ring — slow, slight tilt ──
  var outerRingGeo = new THREE.TorusGeometry(1.7, 0.008, 6, 80);
  var outerRing = new THREE.Mesh(outerRingGeo, ringAccentMat.clone());
  outerRing.rotation.x = Math.PI / 2 + 0.1;
  avatar.add(outerRing);
  avatar.userData.outerRing = outerRing;

  // ── Data arc segments (partial torus arcs — Jarvis data-ring look) ──
  var arc1Geo = new THREE.TorusGeometry(1.0, 0.015, 4, 24, Math.PI * 0.6);
  var arc1 = new THREE.Mesh(arc1Geo, ringAccentMat.clone());
  arc1.rotation.x = Math.PI / 2;
  arc1.rotation.z = 0.8;
  avatar.add(arc1);
  avatar.userData.arc1 = arc1;

  var arc2Geo = new THREE.TorusGeometry(1.45, 0.012, 4, 20, Math.PI * 0.4);
  var arc2 = new THREE.Mesh(arc2Geo, ringAccentMat.clone());
  arc2.rotation.x = Math.PI / 2 + 0.25;
  arc2.rotation.z = -1.2;
  avatar.add(arc2);
  avatar.userData.arc2 = arc2;

  // ── Vertical beam — floor to core ──
  var beamGeo = new THREE.CylinderGeometry(0.08, 0.15, 4, 8);
  var beam = new THREE.Mesh(beamGeo, beamMat.clone());
  beam.position.y = -2; // extends below core to floor
  avatar.add(beam);
  avatar.userData.beam = beam;

  // ── Orbiting particles ──
  var PARTICLE_COUNT = 180;
  var positions = new Float32Array(PARTICLE_COUNT * 3);
  particleAngles = new Float32Array(PARTICLE_COUNT * 3); // angle, radius, yOffset

  for (var i = 0; i < PARTICLE_COUNT; i++) {
    var angle = Math.random() * Math.PI * 2;
    var radius = 0.6 + Math.random() * 1.4;
    var yOff = (Math.random() - 0.5) * 1.2;

    particleAngles[i * 3] = angle;
    particleAngles[i * 3 + 1] = radius;
    particleAngles[i * 3 + 2] = yOff;

    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = yOff;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
  }

  var particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particles = new THREE.Points(particleGeo, particleMat.clone());
  avatar.add(particles);
  avatar.userData.particles = particles;

  scene.add(avatar);
  return avatar;
}

// ── Fade facility equipment ──
function setFacilityOpacity(targetOpacity) {
  equipment.forEach(function (grp) {
    grp.traverse(function (child) {
      if (child.isMesh && child.material) {
        if (child.userData._savedOpacity === undefined) {
          child.userData._savedOpacity = child.material.opacity;
        }
        child.material.opacity = child.userData._savedOpacity * targetOpacity;
      }
    });
  });
}

function restoreFacilityOpacity() {
  equipment.forEach(function (grp) {
    grp.traverse(function (child) {
      if (child.isMesh && child.material && child.userData._savedOpacity !== undefined) {
        child.material.opacity = child.userData._savedOpacity;
      }
    });
  });
}

// ── Set hologram opacity ──
function setAvatarOpacity(opacity) {
  if (!avatar) return;
  avatar.traverse(function (child) {
    if ((child.isMesh || child.isPoints) && child.material) {
      if (child.userData._baseOpacity === undefined) {
        child.userData._baseOpacity = child.material.opacity;
      }
      child.material.opacity = child.userData._baseOpacity * opacity;
    }
  });
}

// ── Show hologram (fade facility out, hologram in, fly camera) ──
export function showAvatar() {
  if (!avatar) createAvatar();
  if (avatarVisible) return;

  avatarVisible = true;
  avatar.visible = true;

  savedCamPos = camera.position.clone();
  savedCamTarget = controls.target.clone();

  fadeTransition = { t: 0, direction: 'in' };
  controls.autoRotate = false;
}

// ── Hide hologram (restore facility, fly camera back) ──
export function hideAvatar() {
  if (!avatarVisible) return;
  avatarVisible = false;
  fadeTransition = { t: 0, direction: 'out' };
}

// ── Animate (called every frame from main.js) ──
export function updateAvatar() {
  if (!avatar) return;

  // ── Fade transitions ──
  if (fadeTransition) {
    fadeTransition.t += 0.025;
    var t = Math.min(fadeTransition.t, 1);
    var ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    if (fadeTransition.direction === 'in') {
      setFacilityOpacity(1 - ease * 0.92);
      setAvatarOpacity(ease);
      var targetPos = new THREE.Vector3(0, 2.8, 5.5);
      var targetLook = new THREE.Vector3(0, 1.8, 0);
      camera.position.lerpVectors(savedCamPos, targetPos, ease);
      controls.target.lerpVectors(savedCamTarget, targetLook, ease);
    } else {
      setFacilityOpacity(0.08 + ease * 0.92);
      setAvatarOpacity(1 - ease);
      if (savedCamPos) {
        var currentPos = camera.position.clone();
        var currentTarget = controls.target.clone();
        camera.position.lerpVectors(currentPos, savedCamPos, ease * 0.5);
        controls.target.lerpVectors(currentTarget, savedCamTarget, ease * 0.5);
      }
    }

    if (t >= 1) {
      if (fadeTransition.direction === 'out') {
        avatar.visible = false;
        restoreFacilityOpacity();
        controls.autoRotate = true;
      }
      fadeTransition = null;
    }
  }

  // ── Idle animations (only when visible) ──
  if (!avatar.visible) return;

  var ud = avatar.userData;
  ud.breathT += 0.015;

  // Determine speed multiplier based on state
  var targetSpeed = 1;
  if (ud.state === 'thinking') targetSpeed = 3;
  else if (ud.state === 'listening') targetSpeed = 1.5;
  else if (ud.state === 'speaking') targetSpeed = 0.7;
  ud.ringSpeed += (targetSpeed - ud.ringSpeed) * 0.03;

  // ── Core pulse ──
  if (ud.core) {
    var pulseScale = 1 + Math.sin(ud.breathT * 1.5) * 0.08;
    if (ud.state === 'speaking') {
      ud.speakT += 0.1;
      pulseScale += Math.sin(ud.speakT * 4) * 0.06;
    }
    ud.core.scale.setScalar(pulseScale);
    ud.core.material.opacity = 0.5 + Math.sin(ud.breathT * 1.2) * 0.15;
  }

  // ── Glow sphere pulse ──
  if (ud.glow) {
    var glowScale = 1 + Math.sin(ud.breathT * 0.8) * 0.1;
    ud.glow.scale.setScalar(glowScale);
    var baseGlow = 0.12;
    if (ud.state === 'listening') baseGlow = 0.2;
    if (ud.state === 'speaking') baseGlow = 0.18 + Math.sin(ud.breathT * 3) * 0.06;
    ud.glow.material.opacity = baseGlow;
  }

  // ── Ring rotations ──
  var speed = ud.ringSpeed;
  if (ud.innerRing) {
    ud.innerRing.rotation.z += 0.012 * speed;
    ud.innerRing.rotation.y += 0.004 * speed;
  }
  if (ud.midRing) {
    ud.midRing.rotation.z -= 0.008 * speed;
    ud.midRing.rotation.x += 0.002 * speed;
  }
  if (ud.outerRing) {
    ud.outerRing.rotation.z += 0.004 * speed;
  }

  // ── Data arc rotations (different axes for visual complexity) ──
  if (ud.arc1) {
    ud.arc1.rotation.z += 0.006 * speed;
    ud.arc1.rotation.y += 0.003 * speed;
  }
  if (ud.arc2) {
    ud.arc2.rotation.z -= 0.009 * speed;
  }

  // ── Beam shimmer ──
  if (ud.beam) {
    ud.beam.material.opacity = 0.08 + Math.sin(ud.breathT * 2) * 0.04;
  }

  // ── Particle orbits ──
  if (particles && particleAngles) {
    var positions = particles.geometry.attributes.position.array;
    var orbitSpeed = 0.003 * speed;

    // Listening: pull particles inward; Thinking: push outward
    var radiusMult = 1;
    if (ud.state === 'listening') radiusMult = 0.7;
    else if (ud.state === 'thinking') radiusMult = 1.3;

    for (var i = 0; i < particleAngles.length / 3; i++) {
      particleAngles[i * 3] += orbitSpeed * (0.5 + Math.random() * 0.5);
      var angle = particleAngles[i * 3];
      var baseR = particleAngles[i * 3 + 1];
      var r = baseR * radiusMult;
      var yOff = particleAngles[i * 3 + 2];

      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = yOff + Math.sin(ud.breathT + i) * 0.05;
      positions[i * 3 + 2] = Math.sin(angle) * r;
    }
    particles.geometry.attributes.position.needsUpdate = true;
  }

  // ── Holographic flicker ──
  ud.flickerT += 0.016;
  if (Math.sin(ud.flickerT * 0.3) > 0.98) {
    setAvatarOpacity(0.5 + Math.random() * 0.3);
  }
}

// ── State control ──
export function setAvatarState(state) {
  if (avatar) {
    avatar.userData.state = state;
    avatar.userData.speakT = 0;
  }
}

// ── Equipment red highlight ──
export function highlightEquipmentRed(name) {
  if (!name) return;
  setFacilityOpacity(0.3);
  setAvatarOpacity(0.5);

  var lower = name.toLowerCase();
  equipment.forEach(function (grp) {
    if (grp.userData.name && grp.userData.name.toLowerCase().indexOf(lower) !== -1) {
      grp.traverse(function (child) {
        if (child.isMesh) {
          child.userData._preRedMat = child.material;
          child.material = child.material.wireframe ? redHighlightWire : redHighlightSolid;
        }
      });
    }
  });
}

export function clearRedHighlights() {
  equipment.forEach(function (grp) {
    grp.traverse(function (child) {
      if (child.isMesh && child.userData._preRedMat) {
        child.material = child.userData._preRedMat;
        delete child.userData._preRedMat;
      }
    });
  });
}

export function getAvatar() {
  return avatar;
}

export function isAvatarVisible() {
  return avatarVisible;
}
