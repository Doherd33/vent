// ── Interaction: raycaster hover/click, equipment selection ──
import * as THREE from 'three';
import { container, label, camera, renderer, controls, equipment, highlightWire, highlightSolid } from './scene.js';
import { renderDetail, hideDetailPanel } from './ui.js';

var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
var hoveredGroup = null;
var selectedGroup = null;

// Collect meshes from equipment
function collectMeshes() {
  var meshes = [];
  equipment.forEach(function (grp) {
    grp.traverse(function (child) {
      if (child.isMesh) {
        child.userData.parentGroup = grp;
        meshes.push(child);
      }
    });
  });
  return meshes;
}

// Highlight a group
function highlightGroup(grp) {
  grp.traverse(function (child) {
    if (child.isMesh) {
      child.userData._origMat = child.material;
      child.material = child.material.wireframe ? highlightWire : highlightSolid;
    }
  });
}

// Unhighlight a group
function unhighlightGroup(grp) {
  grp.traverse(function (child) {
    if (child.isMesh && child.userData._origMat) {
      child.material = child.userData._origMat;
    }
  });
}

container.addEventListener('mousemove', function (e) {
  var rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  var intersects = raycaster.intersectObjects(collectMeshes());

  // Reset previous hover highlight (but keep selected highlight)
  if (hoveredGroup && hoveredGroup !== selectedGroup) {
    unhighlightGroup(hoveredGroup);
    hoveredGroup = null;
    label.classList.remove('visible');
  }

  if (intersects.length > 0) {
    var grp = intersects[0].object.userData.parentGroup;
    if (grp && grp.userData.name && grp !== selectedGroup) {
      hoveredGroup = grp;
      highlightGroup(grp);

      label.textContent = grp.userData.name + ' — ' + grp.userData.desc;
      label.style.left = e.clientX - container.getBoundingClientRect().left + 12 + 'px';
      label.style.top = e.clientY - container.getBoundingClientRect().top - 20 + 'px';
      label.classList.add('visible');

      controls.autoRotate = false;
    }
  } else if (!selectedGroup) {
    controls.autoRotate = true;
    label.classList.remove('visible');
  }
});

function deselectEquipment() {
  if (selectedGroup) {
    unhighlightGroup(selectedGroup);
    selectedGroup = null;
  }
  hideDetailPanel();
  controls.autoRotate = true;
}

// Wire up the close button callback in ui.js
renderDetail._onClose = deselectEquipment;

// Track pointer movement to distinguish clicks from drags
var pointerStart = { x: 0, y: 0 };
container.addEventListener('pointerdown', function (e) {
  pointerStart.x = e.clientX;
  pointerStart.y = e.clientY;
});

// Click handler
container.addEventListener('click', function (e) {
  var dx = e.clientX - pointerStart.x;
  var dy = e.clientY - pointerStart.y;
  if (Math.sqrt(dx * dx + dy * dy) > 5) return;

  var rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  var intersects = raycaster.intersectObjects(collectMeshes());

  if (intersects.length > 0) {
    var grp = intersects[0].object.userData.parentGroup;
    if (grp && grp.userData.name) {
      if (selectedGroup && selectedGroup !== grp) {
        unhighlightGroup(selectedGroup);
      }
      selectedGroup = grp;
      highlightGroup(grp);
      controls.autoRotate = false;
      renderDetail(grp);
    }
  } else {
    deselectEquipment();
  }
});

// ── Programmatic equipment selection (used by Charlie AI) ──
export function getSelectedEquipment() {
  return selectedGroup;
}

export function selectEquipmentByName(name) {
  if (!name) return false;
  var lower = name.toLowerCase();
  var target = equipment.find(function (grp) {
    return grp.userData.name && grp.userData.name.toLowerCase().indexOf(lower) !== -1;
  });
  if (!target) return false;
  if (selectedGroup && selectedGroup !== target) {
    unhighlightGroup(selectedGroup);
  }
  selectedGroup = target;
  highlightGroup(target);
  controls.autoRotate = false;
  renderDetail(target);
  return true;
}

export { deselectEquipment };

// ESC also closes detail panel
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && selectedGroup) {
    e.stopPropagation();
    deselectEquipment();
  }
}, true);
