import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ── DOM refs ──
export const container = document.getElementById('viewport3d');
export const label = document.getElementById('vpLabel');

// ── Scene setup ──
export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
camera.position.set(0, 35, 55);

export const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x000000, 0);
container.insertBefore(renderer.domElement, container.firstChild);

// ── Orbit controls ──
export const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.8;
controls.minDistance = 6;
controls.maxDistance = 120;
controls.target.set(0, 1.5, 0);

// ── Zoom-towards-cursor: shift orbit target on scroll ──
const zoomRay = new THREE.Raycaster();
const zoomMouse = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const zoomHit = new THREE.Vector3();

renderer.domElement.addEventListener('wheel', function (e) {
  const rect = renderer.domElement.getBoundingClientRect();
  zoomMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  zoomMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  zoomRay.setFromCamera(zoomMouse, camera);

  if (zoomRay.ray.intersectPlane(groundPlane, zoomHit)) {
    // Shift target 15% towards the cursor point on each scroll
    const factor = 0.15;
    controls.target.lerp(zoomHit, factor);
  }
  controls.autoRotate = false;
}, { passive: true });

// ── Materials ──
export const wireMat = new THREE.MeshBasicMaterial({
  color: 0x4ec9b0,
  wireframe: true,
  transparent: true,
  opacity: 0.35
});
export const solidMat = new THREE.MeshBasicMaterial({
  color: 0x4ec9b0,
  transparent: true,
  opacity: 0.08
});
export const pipeMat = new THREE.MeshBasicMaterial({
  color: 0x4ec9b0,
  wireframe: true,
  transparent: true,
  opacity: 0.5
});
export const highlightWire = new THREE.MeshBasicMaterial({
  color: 0x80ffd4,
  wireframe: true,
  transparent: true,
  opacity: 0.7
});
export const highlightSolid = new THREE.MeshBasicMaterial({
  color: 0x80ffd4,
  transparent: true,
  opacity: 0.15
});
export const redHighlightWire = new THREE.MeshBasicMaterial({
  color: 0xff4444,
  wireframe: true,
  transparent: true,
  opacity: 0.7
});
export const redHighlightSolid = new THREE.MeshBasicMaterial({
  color: 0xff4444,
  transparent: true,
  opacity: 0.15
});

// ── Grid floor ──
const grid = new THREE.GridHelper(120, 240, 0x2a2a2a, 0x1a1a1a);
scene.add(grid);

// ── Equipment registry (for hover labels) ──
export const equipment = [];

// ── Bioreactors registry ──
export const bioreactors = [];
