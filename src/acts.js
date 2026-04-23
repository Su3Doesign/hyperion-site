/**
 * acts.js — Choreography for all 6 Acts (0..5).
 * Drives camera position, target, part rotations, emissive intensities
 * from a single normalized scroll progress value [0..1].
 */

import * as THREE from 'three';
import { getSceneObjects } from './scene.js';

// ============================================
// CONFIG — 6 Acts, each occupying equal scroll range
// ============================================
const ACT_COUNT = 6;
const ACT_RANGE = 1 / ACT_COUNT; // 0.1666...

// ============================================
// CAMERA KEYFRAMES — per Act start position + target
// Each Act lerps smoothly to the next.
// Positions assume car sits at origin, ground plane y=0, ~4-5m long.
// ============================================
const KEYFRAMES = [
  // Act 0 — Opening: wide establishing shot, front 3/4
  {
    pos: new THREE.Vector3(5.5, 2.2, 7.0),
    tgt: new THREE.Vector3(0, 0.7, 0),
  },
  // Act 1 — Engine: orbit to rear, dolly in toward engine bay
  {
    pos: new THREE.Vector3(-2.5, 1.8, -5.5),
    tgt: new THREE.Vector3(0, 0.9, -1.5),
  },
  // Act 2 — Headlights: move to front
  {
    pos: new THREE.Vector3(0, 1.2, 6.5),
    tgt: new THREE.Vector3(0, 0.6, 0),
  },
  // Act 3 — Dashboard: through driver window, looking at dash
  {
    pos: new THREE.Vector3(1.5, 1.3, 0.3),
    tgt: new THREE.Vector3(-0.3, 1.0, 0.8),
  },
  // Act 4 — Windshield POV: driver's seat looking forward
  {
    pos: new THREE.Vector3(0.3, 1.15, 0.2),
    tgt: new THREE.Vector3(0.3, 1.1, 8),
  },
  // Act 5 — Garage finale: pull back, high-angle, dark
  {
    pos: new THREE.Vector3(0, 4, 9),
    tgt: new THREE.Vector3(0, 0.6, 0),
  },
];

// ============================================
// STATE
// ============================================
let carRoot, camera, scene, sceneObjects;
let currentAct = 0;
const _camPos = new THREE.Vector3();
const _camTgt = new THREE.Vector3();
const _tmp = new THREE.Vector3();

// Client DOM elements for Act 2 sync
let clientElements = [];

// Act section elements for in-view styling
let actSections = [];

// ============================================
// INIT — called once after car loaded
// ============================================
export function initActs(car, cam, scn) {
  carRoot = car;
  camera = cam;
  scene = scn;
  sceneObjects = getSceneObjects();

  // Cache DOM references
  clientElements = Array.from(document.querySelectorAll('.client'));
  actSections = Array.from(document.querySelectorAll('.act'));

  // Store original rotations on hinged parts so we can modulate from there
  cacheOriginalRotations();

  console.log('[Acts] Initialized. Parts available:', Object.keys(sceneObjects.parts));
}

function cacheOriginalRotations() {
  const names = ['EngineCover_Rear', 'Door_L', 'Door_R'];
  names.forEach((n) => {
    const part = sceneObjects.parts[n];
    if (part) {
      part.userData.initialRotation = part.rotation.clone();
    }
  });
}

// ============================================
// MAIN UPDATE — called every frame from main.js
// progress: [0..1] total scroll
// returns: current act number for debug HUD
// ============================================
export function updateActs(progress, delta) {
  // Determine current Act (float) and within-act progress
  const actFloat = progress * ACT_COUNT;
  const actIndex = Math.min(Math.floor(actFloat), ACT_COUNT - 1);
  const actProgress = actFloat - actIndex; // 0..1 within current act

  // Update camera (smooth lerp between keyframes)
  updateCamera(actFloat);

  // Update hinged parts
  updateEngineCover(progress);
  updateDoors(progress);

  // Update emissive lights per Act
  updateLights(progress, actIndex, actProgress);

  // Sync DOM Act states
  syncActDOM(actIndex);

  // Current act changed
  if (actIndex !== currentAct) {
    currentAct = actIndex;
    onActEnter(actIndex);
  }

  return actIndex;
}

// ============================================
// CAMERA — smooth lerp between keyframes
// ============================================
function updateCamera(actFloat) {
  const i = Math.min(Math.floor(actFloat), KEYFRAMES.length - 2);
  const t = Math.min(Math.max(actFloat - i, 0), 1);
  const easeT = easeInOutCubic(t);

  const a = KEYFRAMES[i];
  const b = KEYFRAMES[Math.min(i + 1, KEYFRAMES.length - 1)];

  _camPos.lerpVectors(a.pos, b.pos, easeT);
  _camTgt.lerpVectors(a.tgt, b.tgt, easeT);

  camera.position.copy(_camPos);
  camera.lookAt(_camTgt);
}

// ============================================
// ENGINE COVER — opens through Act 0→1, closes Act 1→2
// ============================================
function updateEngineCover(progress) {
  const part = sceneObjects.parts['EngineCover_Rear'];
  if (!part || !part.userData.initialRotation) return;

  // Open during Act 0→1 (progress 0.0 → 0.166 → 0.33)
  // Peak open around middle of Act 1
  let openAmount = 0;
  if (progress < ACT_RANGE) {
    // Act 0: closed → starting to open
    openAmount = smoothstep(0.5, 1.0, progress / ACT_RANGE) * 0.3;
  } else if (progress < ACT_RANGE * 2) {
    // Act 1: fully open
    const t = (progress - ACT_RANGE) / ACT_RANGE;
    openAmount = 0.3 + smoothstep(0, 0.4, t) * 0.7;
  } else if (progress < ACT_RANGE * 2.5) {
    // Act 2 start: closing
    const t = (progress - ACT_RANGE * 2) / (ACT_RANGE * 0.5);
    openAmount = 1.0 - smoothstep(0, 1, t);
  }

  // Rotate on X axis (tune sign if it opens the wrong way)
  const initial = part.userData.initialRotation;
  part.rotation.x = initial.x - openAmount * (Math.PI / 4); // up to 45°
  part.rotation.y = initial.y;
  part.rotation.z = initial.z;
}

// ============================================
// DOORS — open during Act 2→3 transition (for window fly-through entry)
// ============================================
function updateDoors(progress) {
  const doorL = sceneObjects.parts['Door_L'];
  const doorR = sceneObjects.parts['Door_R'];

  // Open during late Act 2 → early Act 3
  const start = ACT_RANGE * 2.7;
  const end = ACT_RANGE * 3.3;
  let t = 0;
  if (progress >= start && progress <= end) {
    t = (progress - start) / (end - start);
  } else if (progress > end && progress < ACT_RANGE * 4) {
    t = 1; // hold open during Act 3
  } else if (progress >= ACT_RANGE * 4) {
    // Close going into Act 4
    const cs = ACT_RANGE * 4;
    const ce = ACT_RANGE * 4.3;
    t = 1 - smoothstep(cs, ce, progress);
  }

  const openAngle = smoothstep(0, 1, t) * (Math.PI / 3); // up to 60°

  // Scissor-style: rotate upward on Z (for scissor) — adjust axis if needed
  if (doorL && doorL.userData.initialRotation) {
    const init = doorL.userData.initialRotation;
    doorL.rotation.x = init.x;
    doorL.rotation.y = init.y;
    doorL.rotation.z = init.z + openAngle; // scissor-up
  }
  if (doorR && doorR.userData.initialRotation) {
    const init = doorR.userData.initialRotation;
    doorR.rotation.x = init.x;
    doorR.rotation.y = init.y;
    doorR.rotation.z = init.z - openAngle; // mirror
  }
}

// ============================================
// LIGHTS — per-Act emissive choreography
// ============================================
const COLOR_HEADLIGHT = new THREE.Color(0xfff4d8);   // warm white
const COLOR_TAIL = new THREE.Color(0xff2030);        // red
const COLOR_INDICATOR = new THREE.Color(0xffa500);   // amber
const COLOR_BLACK = new THREE.Color(0x000000);

function setEmissive(partName, color, intensity) {
  const mat = sceneObjects.emissiveMats[partName];
  if (!mat) return;
  const apply = (m) => {
    if (!m) return;
    if (!m.emissive) m.emissive = new THREE.Color();
    m.emissive.copy(color);
    m.emissiveIntensity = intensity;
    m.needsUpdate = true;
  };
  if (Array.isArray(mat)) mat.forEach(apply);
  else apply(mat);
}

function updateLights(progress, actIndex, actProgress) {
  // Reset baseline each frame — we'll re-apply what should be on
  const allLights = [
    'Light_Headlight_Top',
    'Light_Headlight_Bottom',
    'Light_Headlight_DRL_L',
    'Light_Headlight_DRL_R',
    'Light_Tail',
    'Light_Tail_Ind_L',
    'Light_Tail_Ind_R',
  ];

  // ============ ACT 0 — Ignition ============
  // Dim flicker of DRLs as car "wakes up"
  if (actIndex === 0) {
    const wake = smoothstep(0.3, 0.9, actProgress);
    setEmissive('Light_Headlight_DRL_L', COLOR_HEADLIGHT, wake * 1.2);
    setEmissive('Light_Headlight_DRL_R', COLOR_HEADLIGHT, wake * 1.2);
    setEmissive('Light_Tail', COLOR_TAIL, wake * 0.8);
    setEmissive('Light_Headlight_Top', COLOR_HEADLIGHT, 0);
    setEmissive('Light_Headlight_Bottom', COLOR_HEADLIGHT, 0);
    setEmissive('Light_Tail_Ind_L', COLOR_INDICATOR, 0);
    setEmissive('Light_Tail_Ind_R', COLOR_INDICATOR, 0);
  }

  // ============ ACT 1 — Engine reveal ============
  // DRLs stay on, tail softens
  else if (actIndex === 1) {
    setEmissive('Light_Headlight_DRL_L', COLOR_HEADLIGHT, 1.2);
    setEmissive('Light_Headlight_DRL_R', COLOR_HEADLIGHT, 1.2);
    setEmissive('Light_Tail', COLOR_TAIL, 0.5);
  }

  // ============ ACT 2 — Clients reveal via lights ============
  // 4 headlight units illuminate in sequence, mapped to 4 client names.
  // Each client glows its corresponding light unit.
  else if (actIndex === 2) {
    // Keep DRLs at baseline
    setEmissive('Light_Headlight_DRL_L', COLOR_HEADLIGHT, 0.8);
    setEmissive('Light_Headlight_DRL_R', COLOR_HEADLIGHT, 0.8);

    // Client sequence — 4 phases across Act 2
    const phases = [
      { name: 'Light_Headlight_Top', trigger: 0.15 },
      { name: 'Light_Headlight_Bottom', trigger: 0.4 },
      { name: 'Light_Headlight_DRL_L', trigger: 0.65, boost: true },
      { name: 'Light_Headlight_DRL_R', trigger: 0.9, boost: true },
    ];

    phases.forEach((phase, i) => {
      const active = actProgress >= phase.trigger;
      const intensity = active
        ? phase.boost ? 3.5 : 2.8
        : phase.name.includes('DRL') ? 0.8 : 0;
      setEmissive(phase.name, COLOR_HEADLIGHT, intensity);

      // Sync DOM client element
      if (clientElements[i]) {
        clientElements[i].classList.toggle('active', active);
      }
    });
  }

  // ============ ACT 3 — Dashboard ============
  // Headlights dim, cabin ambient picks up (we'll handle cockpit LEDs here)
  else if (actIndex === 3) {
    setEmissive('Light_Headlight_DRL_L', COLOR_HEADLIGHT, 0.5);
    setEmissive('Light_Headlight_DRL_R', COLOR_HEADLIGHT, 0.5);
    setEmissive('Light_Headlight_Top', COLOR_HEADLIGHT, 0);
    setEmissive('Light_Headlight_Bottom', COLOR_HEADLIGHT, 0);
    setEmissive('Light_Tail', COLOR_TAIL, 0.3);
  }

  // ============ ACT 4 — Dawn / horizon ============
  // Full beams on — heading into the dawn
  else if (actIndex === 4) {
    const beam = smoothstep(0, 0.4, actProgress);
    setEmissive('Light_Headlight_Top', COLOR_HEADLIGHT, beam * 4);
    setEmissive('Light_Headlight_Bottom', COLOR_HEADLIGHT, beam * 3);
    setEmissive('Light_Headlight_DRL_L', COLOR_HEADLIGHT, 1.5);
    setEmissive('Light_Headlight_DRL_R', COLOR_HEADLIGHT, 1.5);
    setEmissive('Light_Tail', COLOR_TAIL, 0.4);
  }

  // ============ ACT 5 — Garage finale ============
  // Everything dims to moody low-key — tail glows as final ember
  else if (actIndex === 5) {
    const dim = 1 - smoothstep(0, 0.7, actProgress);
    setEmissive('Light_Headlight_Top', COLOR_HEADLIGHT, dim * 2);
    setEmissive('Light_Headlight_Bottom', COLOR_HEADLIGHT, dim * 1.5);
    setEmissive('Light_Headlight_DRL_L', COLOR_HEADLIGHT, dim * 1.5 + 0.3);
    setEmissive('Light_Headlight_DRL_R', COLOR_HEADLIGHT, dim * 1.5 + 0.3);
    setEmissive('Light_Tail', COLOR_TAIL, 0.8 + Math.sin(performance.now() * 0.002) * 0.2);
    // Subtle indicator pulse
    const pulse = (Math.sin(performance.now() * 0.004) + 1) * 0.5;
    setEmissive('Light_Tail_Ind_L', COLOR_INDICATOR, pulse * 0.4);
    setEmissive('Light_Tail_Ind_R', COLOR_INDICATOR, pulse * 0.4);
  }
}

// ============================================
// DOM SYNC — mark active Act section for CSS fade-in
// ============================================
function syncActDOM(actIndex) {
  actSections.forEach((el, i) => {
    el.classList.toggle('in-view', i === actIndex);
  });
}

function onActEnter(actIndex) {
  console.log(`[Acts] Entered Act ${actIndex}`);
}

// ============================================
// UTILITIES
// ============================================
function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
