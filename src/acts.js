/**
 * acts.js v3 — Uses Cockpit_Steering position to anchor interior camera for Acts 3 & 4
 * Act 2 pulled back, Act 3 drops camera height and looks at actual dashboard
 */

import * as THREE from 'three';
import { getSceneObjects } from './scene.js';

const ACT_COUNT = 6;
const ACT_RANGE = 1 / ACT_COUNT;

const HINGE_CONFIG = {
  EngineCover_Rear: { axis: 'z', sign: -1, amount: Math.PI / 4 },
  Door_L:           { axis: 'z', sign: +1, amount: Math.PI / 3 },
  Door_R:           { axis: 'z', sign: -1, amount: Math.PI / 3 },
};

let carRoot, camera, scene, sceneObjects;
let currentAct = 0;
let keyframes = [];

const _camPos = new THREE.Vector3();
const _camTgt = new THREE.Vector3();
let clientElements = [];
let actSections = [];

export function initActs(car, cam, scn) {
  carRoot = car;
  camera = cam;
  scene = scn;
  sceneObjects = getSceneObjects();

  clientElements = Array.from(document.querySelectorAll('.client'));
  actSections = Array.from(document.querySelectorAll('.act'));

  cacheOriginalRotations();
  computeKeyframes();

  console.log('[Acts] Initialized with', keyframes.length, 'keyframes');
}

function cacheOriginalRotations() {
  ['EngineCover_Rear', 'Door_L', 'Door_R'].forEach((n) => {
    const part = sceneObjects.parts[n];
    if (part) part.userData.initialRotation = part.rotation.clone();
  });
}

// ============================================
// KEYFRAMES — now using real interior part positions
// ============================================
function computeKeyframes() {
  const size = sceneObjects.carSize;
  const center = sceneObjects.carCenter;

  const L = size.x;
  const W = size.z;
  const H = size.y;
  const cx = center.x;
  const cy = center.y;
  const cz = center.z;

  console.log(`[Acts] Car — L:${L.toFixed(2)} W:${W.toFixed(2)} H:${H.toFixed(2)}`);

  const lengthIsX = size.x >= size.z;
  const LEN = lengthIsX ? size.x : size.z;
  const WID = lengthIsX ? size.z : size.x;
  const front = lengthIsX ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
  const side  = lengthIsX ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);

  console.log(`[Acts] Length axis: ${lengthIsX ? 'X' : 'Z'}`);

  // Fetch cockpit anchor from Cockpit_Steering world position if available
  let interiorAnchor = null;
  const steering = sceneObjects.parts['Cockpit_Steering'];
  const dashScreen = sceneObjects.parts['Cockpit_Screen_Infotainment'];
  if (steering) {
    interiorAnchor = new THREE.Vector3();
    steering.getWorldPosition(interiorAnchor);
    console.log('[Acts] Interior anchor (steering):', interiorAnchor);
  }

  const pos = (fwd, sdw, upw) => new THREE.Vector3(
    cx + front.x * fwd + side.x * sdw,
    cy + upw,
    cz + front.z * fwd + side.z * sdw
  );
  const tgt = (fwd, sdw, upw) => new THREE.Vector3(
    cx + front.x * fwd + side.x * sdw,
    cy + upw,
    cz + front.z * fwd + side.z * sdw
  );

  keyframes = [
    // ACT 0 — Wide establishing shot, front 3/4
    { pos: pos(LEN * 1.3, WID * 1.5, H * 1.2), tgt: tgt(0, 0, 0) },

    // ACT 1 — Rear engine reveal: orbit behind, dolly close
    { pos: pos(-LEN * 0.85, WID * 0.5, H * 1.1), tgt: tgt(-LEN * 0.3, 0.3, 0) },

    // ACT 2 — Front lights: PULLED BACK (was too tight), centered, low
    { pos: pos(LEN * 1.7, WID * 0.2, H * 0.6), tgt: tgt(0, 0, 0) },

    // ACT 3 — Approach driver-side window, camera lower (dashboard height)
    { pos: pos(LEN * 0.1, WID * 0.9, H * 0.25),
      tgt: interiorAnchor
        ? interiorAnchor.clone()
        : tgt(-LEN * 0.05, 0, H * 0.25) },

    // ACT 4 — INSIDE the cabin looking forward (uses steering position if available)
    {
      pos: interiorAnchor
        ? new THREE.Vector3(
            interiorAnchor.x - front.x * LEN * 0.03 - side.x * WID * 0.15,
            interiorAnchor.y + 0.05,
            interiorAnchor.z - front.z * LEN * 0.03 - side.z * WID * 0.15
          )
        : pos(0, -WID * 0.15, H * 0.55),
      tgt: pos(LEN * 10, 0, H * 0.35), // far forward infinity
    },

    // ACT 5 — Pull back high, dark finale
    { pos: pos(LEN * 1.1, WID * 1.8, H * 2.5), tgt: tgt(0, 0, 0) },
  ];
}

export function updateActs(progress, delta) {
  const actFloat = progress * ACT_COUNT;
  const actIndex = Math.min(Math.floor(actFloat), ACT_COUNT - 1);
  const actProgress = actFloat - actIndex;

  updateCamera(actFloat);
  updateEngineCover(progress);
  updateDoors(progress);
  updateLights(progress, actIndex, actProgress);
  syncActDOM(actIndex);

  if (actIndex !== currentAct) {
    currentAct = actIndex;
    console.log(`[Acts] Entered Act ${actIndex}`);
  }

  return actIndex;
}

function updateCamera(actFloat) {
  if (keyframes.length === 0) return;
  const i = Math.min(Math.floor(actFloat), keyframes.length - 2);
  const t = Math.min(Math.max(actFloat - i, 0), 1);
  const easeT = easeInOutCubic(t);

  const a = keyframes[i];
  const b = keyframes[Math.min(i + 1, keyframes.length - 1)];

  _camPos.lerpVectors(a.pos, b.pos, easeT);
  _camTgt.lerpVectors(a.tgt, b.tgt, easeT);

  camera.position.copy(_camPos);
  camera.lookAt(_camTgt);
}

function applyHinge(partName, openAmount01) {
  const part = sceneObjects.parts[partName];
  const cfg = HINGE_CONFIG[partName];
  if (!part || !cfg || !part.userData.initialRotation) return;

  const init = part.userData.initialRotation;
  const delta = cfg.sign * cfg.amount * openAmount01;

  part.rotation.x = init.x;
  part.rotation.y = init.y;
  part.rotation.z = init.z;
  part.rotation[cfg.axis] = init[cfg.axis] + delta;
}

function updateEngineCover(progress) {
  let openAmount = 0;
  if (progress < ACT_RANGE) {
    openAmount = smoothstep(0.5, 1.0, progress / ACT_RANGE) * 0.3;
  } else if (progress < ACT_RANGE * 2) {
    const t = (progress - ACT_RANGE) / ACT_RANGE;
    openAmount = 0.3 + smoothstep(0, 0.4, t) * 0.7;
  } else if (progress < ACT_RANGE * 2.5) {
    const t = (progress - ACT_RANGE * 2) / (ACT_RANGE * 0.5);
    openAmount = 1.0 - smoothstep(0, 1, t);
  }
  applyHinge('EngineCover_Rear', openAmount);
}

// ============================================
// DOORS — TIGHTER WINDOW: only open during Act 3
// ============================================
function updateDoors(progress) {
  const open_start = ACT_RANGE * 2.8;
  const open_end   = ACT_RANGE * 3.2;
  const close_start = ACT_RANGE * 3.7;
  const close_end   = ACT_RANGE * 4.0;

  let t = 0;
  if (progress < open_start) {
    t = 0;
  } else if (progress < open_end) {
    t = smoothstep(open_start, open_end, progress);
  } else if (progress < close_start) {
    t = 1;
  } else if (progress < close_end) {
    t = 1 - smoothstep(close_start, close_end, progress);
  } else {
    t = 0;
  }

  applyHinge('Door_L', t);
  applyHinge('Door_R', t);
}

const COLOR_HEADLIGHT = new THREE.Color(0xfff4d8);
const COLOR_TAIL = new THREE.Color(0xff2030);
const COLOR_INDICATOR = new THREE.Color(0xffa500);

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
  if (actIndex === 0) {
    const wake = smoothstep(0.3, 0.9, actProgress);
    setEmissive('Light_Headlight_DRL_L', COLOR_HEADLIGHT, wake * 1.2);
    setEmissive('Light_Headlight_DRL_R', COLOR_HEADLIGHT, wake * 1.2);
    setEmissive('Light_Tail', COLOR_TAIL, wake * 0.8);
    setEmissive('Light_Headlight_Top', COLOR_HEADLIGHT, 0);
    setEmissive('Light_Headlight_Bottom', COLOR_HEADLIGHT, 0);
    setEmissive('Light_Tail_Ind_L', COLOR_INDICATOR, 0);
    setEmissive('Light_Tail_Ind_R', COLOR_INDICATOR, 0);
  } else if (actIndex === 1) {
    setEmissive('Light_Headlight_DRL_L', COLOR_HEADLIGHT, 1.2);
    setEmissive('Light_Headlight_DRL_R', COLOR_HEADLIGHT, 1.2);
    setEmissive('Light_Tail', COLOR_TAIL, 0.5);
  } else if (actIndex === 2) {
    setEmissive('Light_Headlight_DRL_L', COLOR_HEADLIGHT, 0.8);
    setEmissive('Light_Headlight_DRL_R', COLOR_HEADLIGHT, 0.8);
    const phases = [
      { name: 'Light_Headlight_Top', trigger: 0.15 },
      { name: 'Light_Headlight_Bottom', trigger: 0.4 },
      { name: 'Light_Headlight_DRL_L', trigger: 0.65, boost: true },
      { name: 'Light_Headlight_DRL_R', trigger: 0.9, boost: true },
    ];
    phases.forEach((phase, i) => {
      const active = actProgress >= phase.trigger;
      const intensity = active ? (phase.boost ? 3.5 : 2.8) : (phase.name.includes('DRL') ? 0.8 : 0);
      setEmissive(phase.name, COLOR_HEADLIGHT, intensity);
      if (clientElements[i]) {
        clientElements[i].classList.toggle('active', active);
      }
    });
  } else if (actIndex === 3) {
    setEmissive('Light_Headlight_DRL_L', COLOR_HEADLIGHT, 0.5);
    setEmissive('Light_Headlight_DRL_R', COLOR_HEADLIGHT, 0.5);
    setEmissive('Light_Headlight_Top', COLOR_HEADLIGHT, 0);
    setEmissive('Light_Headlight_Bottom', COLOR_HEADLIGHT, 0);
    setEmissive('Light_Tail', COLOR_TAIL, 0.3);
  } else if (actIndex === 4) {
    const beam = smoothstep(0, 0.4, actProgress);
    setEmissive('Light_Headlight_Top', COLOR_HEADLIGHT, beam * 4);
    setEmissive('Light_Headlight_Bottom', COLOR_HEADLIGHT, beam * 3);
    setEmissive('Light_Headlight_DRL_L', COLOR_HEADLIGHT, 1.5);
    setEmissive('Light_Headlight_DRL_R', COLOR_HEADLIGHT, 1.5);
    setEmissive('Light_Tail', COLOR_TAIL, 0.4);
  } else if (actIndex === 5) {
    const dim = 1 - smoothstep(0, 0.7, actProgress);
    setEmissive('Light_Headlight_Top', COLOR_HEADLIGHT, dim * 2);
    setEmissive('Light_Headlight_Bottom', COLOR_HEADLIGHT, dim * 1.5);
    setEmissive('Light_Headlight_DRL_L', COLOR_HEADLIGHT, dim * 1.5 + 0.3);
    setEmissive('Light_Headlight_DRL_R', COLOR_HEADLIGHT, dim * 1.5 + 0.3);
    setEmissive('Light_Tail', COLOR_TAIL, 0.8 + Math.sin(performance.now() * 0.002) * 0.2);
    const pulse = (Math.sin(performance.now() * 0.004) + 1) * 0.5;
    setEmissive('Light_Tail_Ind_L', COLOR_INDICATOR, pulse * 0.4);
    setEmissive('Light_Tail_Ind_R', COLOR_INDICATOR, pulse * 0.4);
  }
}

function syncActDOM(actIndex) {
  actSections.forEach((el, i) => {
    el.classList.toggle('in-view', i === actIndex);
  });
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
