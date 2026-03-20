// ── Facility nav: camera views ──
import * as THREE from 'three';
import { camera, controls } from './scene.js';

var FACILITY_VIEWS = {
  overview:    { cam: [0, 40, 55],    target: [0, 1.5, 5] },
  mfg61:       { cam: [-18, 25, 30],  target: [-18, 1.5, 5] },
  mfg62:       { cam: [18, 25, 30],   target: [18, 1.5, 5] },
  upstream62:  { cam: [18, 12, 18],   target: [18, 2, 8] },
  upstream61:  { cam: [-18, 12, 18],  target: [-18, 2, 8] },
  seed62:      { cam: [24, 12, 2],    target: [18, 1.5, -5] },
  seed61:      { cam: [-24, 12, 2],   target: [-18, 1.5, -5] },
  dsp62:       { cam: [22, 10, 26],   target: [18, 1.5, 16] },
  dsp61:       { cam: [-22, 10, 26],  target: [-18, 1.5, 16] },
  shared:      { cam: [0, 15, 28],    target: [0, 1.5, 18] },
  media:       { cam: [-30, 10, 26],  target: [-30, 1.5, 16] }
};

var _camTransition = null; // { from, to, targetFrom, targetTo, t }

export function flyToView(viewName) {
  var view = FACILITY_VIEWS[viewName];
  if (!view) return;
  controls.autoRotate = false;
  _camTransition = {
    from: camera.position.clone(),
    to: new THREE.Vector3(view.cam[0], view.cam[1], view.cam[2]),
    targetFrom: controls.target.clone(),
    targetTo: new THREE.Vector3(view.target[0], view.target[1], view.target[2]),
    t: 0
  };
  // Update active button
  document.querySelectorAll('.facility-nav-btn').forEach(function (btn) {
    btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
  });
}

export function getCamTransition() {
  return _camTransition;
}

export function clearCamTransition() {
  _camTransition = null;
}

document.getElementById('facilityNav').addEventListener('click', function (e) {
  var btn = e.target.closest('.facility-nav-btn');
  if (!btn) return;
  flyToView(btn.getAttribute('data-view'));
});
