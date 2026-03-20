// ════════════════════════════════════════════════
//  GLTF EXPORT — download current scene for Blender
// ════════════════════════════════════════════════
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { scene, renderer, equipment } from './scene.js';

document.getElementById('exportGltfBtn').addEventListener('click', function () {
  var btn = this;
  btn.textContent = 'EXPORTING...';
  btn.disabled = true;

  var exporter = new GLTFExporter();
  exporter.parse(scene, function (result) {
    var blob = new Blob([JSON.stringify(result)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'vent-facility.gltf';
    a.click();
    URL.revokeObjectURL(url);
    btn.textContent = 'EXPORT GLTF';
    btn.disabled = false;
  }, function (err) {
    console.error('GLTF export error:', err);
    btn.textContent = 'EXPORT GLTF';
    btn.disabled = false;
  }, { binary: false });
});

// ════════════════════════════════════════════════
//  GLTF LOADER — load Blender models back in
// ════════════════════════════════════════════════

// PBR lighting (needed for Blender materials to render)
var ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

var dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 20, 15);
scene.add(dirLight);

var fillLight = new THREE.DirectionalLight(0x4ec9b0, 0.3);
fillLight.position.set(-10, 5, -10);
scene.add(fillLight);

// Enable tone mapping for PBR materials
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

// Model loader
var gltfLoader = new GLTFLoader();

// Equipment name → GLB file mapping
// Drop .glb files in /hub/models/ and add entries here.
// Each entry: key = equipment name substring, value = { file, scale, yOffset }
var MODEL_MAP = {
  // Example entries (uncomment when you have models):
  // 'BR-1 · 1000L':  { file: '/hub/models/biostat-str-1000.glb', scale: 1.0, yOffset: 0 },
  // 'BR-2 · 1000L':  { file: '/hub/models/biostat-str-1000.glb', scale: 1.0, yOffset: 0 },
  // 'BR-3 · 1000L':  { file: '/hub/models/biostat-str-1000.glb', scale: 1.0, yOffset: 0 },
  // 'REPLIGEN':       { file: '/hub/models/atf-unit.glb', scale: 1.0, yOffset: 0 },
  // 'MEDIA PREP · 4000L': { file: '/hub/models/flexsafe-4000.glb', scale: 1.0, yOffset: 0 },
  // 'BELIMED':        { file: '/hub/models/belimed-washer.glb', scale: 1.0, yOffset: 0 },
  // 'GETINGE':        { file: '/hub/models/getinge-autoclave.glb', scale: 1.0, yOffset: 0 },
  // 'HERASAFE':       { file: '/hub/models/herasafe-bsc.glb', scale: 1.0, yOffset: 0 },
};

// Load models and replace wireframes
function loadBlenderModels() {
  equipment.forEach(function (group) {
    var name = group.userData.name || '';
    var modelDef = null;

    // Find matching model definition
    Object.keys(MODEL_MAP).forEach(function (key) {
      if (name.indexOf(key) !== -1 && !modelDef) {
        modelDef = MODEL_MAP[key];
      }
    });

    if (!modelDef) return;

    gltfLoader.load(modelDef.file, function (gltf) {
      var model = gltf.scene;
      model.scale.setScalar(modelDef.scale || 1.0);
      model.position.y = modelDef.yOffset || 0;

      // Remove wireframe children but keep userData
      var userData = group.userData;
      var pos = group.position.clone();

      // Clear wireframe geometry
      while (group.children.length > 0) {
        group.remove(group.children[0]);
      }

      // Add Blender model
      group.add(model);
      group.position.copy(pos);
      group.userData = userData;
      group.userData._hasModel = true;

      console.log('Loaded model for:', name);
    }, undefined, function (err) {
      // Silently skip missing models — wireframe stays
    });
  });
}

// Auto-load any configured models
if (Object.keys(MODEL_MAP).length > 0) {
  loadBlenderModels();
}
