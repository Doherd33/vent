// ── Main: orchestrator — imports all modules, starts animation loop ──
import { scene, container, camera, renderer, controls, bioreactors } from './scene.js';
import './facility.js';     // side-effect: builds all 3D equipment
import './interaction.js';  // side-effect: sets up click/hover handlers
import { getCamTransition, clearCamTransition } from './nav.js';
import './export.js';       // side-effect: GLTF export button + model loader
import './charlie.js';      // side-effect: Charlie AI voice assistant
import { updateAvatar } from './avatar.js';
import { toggleHeatmap } from './heatmap.js';

// ── Heatmap toggle button ──
document.getElementById('heatmapToggle').addEventListener('click', toggleHeatmap);

// ── Resize handler ──
function resize() {
  var w = container.clientWidth;
  var h = container.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', resize);
resize();

// ── Animation loop ──
function animate() {
  requestAnimationFrame(animate);

  // Smooth camera fly-to transition
  var trans = getCamTransition();
  if (trans) {
    trans.t += 0.02;
    var t = trans.t;
    // Ease-in-out cubic
    var ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    camera.position.lerpVectors(trans.from, trans.to, ease);
    controls.target.lerpVectors(trans.targetFrom, trans.targetTo, ease);
    if (t >= 1) clearCamTransition();
  }

  controls.update();

  // Charlie AI avatar animation (breathing, head tracking, state poses)
  updateAvatar();

  // Gentle impeller rotation on all bioreactors
  bioreactors.forEach(function (br) {
    br.children.forEach(function (child) {
      if (child.userData._isBlade) {
        child.rotation.y += 0.01;
      }
    });
  });

  renderer.render(scene, camera);
}
animate();
