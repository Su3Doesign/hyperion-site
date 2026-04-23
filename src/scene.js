/**
 * scene.js — Three.js scene, lighting, HDRI, model loading, post-processing
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// ============================================
// GLOBAL REFERENCES
// ============================================
let scene, camera, renderer, composer;
let carRoot = null;

// Exposed object map so acts.js can access named parts
const sceneObjects = {
  car: null,
  parts: {},           // mesh name → Object3D
  emissiveMats: {},    // purpose label → material (unique instance per mesh)
  lights: {},          // light objects
};

// ============================================
// INIT SCENE
// ============================================
export function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050507);

  // Camera — framed on car
  camera = new THREE.PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.set(6, 2.5, 8);
  camera.lookAt(0, 0.6, 0);

  // Renderer
  const canvas = document.getElementById('scene-canvas');
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = false; // Off for performance; we fake shadows with lighting

  // Lighting rig — the cinematic garage
  setupLighting();

  // Post-processing — bloom is what makes emissive lights GLOW
  setupPostProcessing();

  // Resize handler
  window.addEventListener('resize', onResize);

  return { scene, camera, renderer, composer };
}

// ============================================
// LIGHTING — garage aesthetic
// ============================================
function setupLighting() {
  // Ambient fill — very subtle
  const ambient = new THREE.AmbientLight(0x404050, 0.15);
  scene.add(ambient);

  // Key light — overhead, slightly angled, cool white
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(4, 8, 3);
  scene.add(key);
  sceneObjects.lights.key = key;

  // Rim light — behind car, warm
  const rim = new THREE.DirectionalLight(0xffd4a0, 0.8);
  rim.position.set(-5, 3, -6);
  scene.add(rim);
  sceneObjects.lights.rim = rim;

  // Left stripe (RectAreaLight — simulates LED wall strip)
  const stripeLeft = new THREE.RectAreaLight(0xffffff, 8, 12, 0.08);
  stripeLeft.position.set(-6, 1.5, 0);
  stripeLeft.lookAt(0, 1.5, 0);
  scene.add(stripeLeft);
  sceneObjects.lights.stripeLeft = stripeLeft;

  // Right stripe
  const stripeRight = new THREE.RectAreaLight(0xffffff, 8, 12, 0.08);
  stripeRight.position.set(6, 1.5, 0);
  stripeRight.lookAt(0, 1.5, 0);
  scene.add(stripeRight);
  sceneObjects.lights.stripeRight = stripeRight;

  // Top stripe (front)
  const stripeTop = new THREE.RectAreaLight(0xffffff, 6, 10, 0.06);
  stripeTop.position.set(0, 4, 4);
  stripeTop.lookAt(0, 0.5, 0);
  scene.add(stripeTop);
  sceneObjects.lights.stripeTop = stripeTop;

  // Floor plane — polished concrete, catches reflections
  const floorGeo = new THREE.PlaneGeometry(40, 40);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a0c,
    roughness: 0.35,
    metalness: 0.2,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);
}

// ============================================
// POST-PROCESSING — BLOOM makes emissives glow
// ============================================
function setupPostProcessing() {
  composer = new EffectComposer(renderer);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // Bloom — this is the magic that makes emissive materials look like real lights
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.55,   // strength
    0.85,   // radius
    0.8     // threshold (lower = more bloom)
  );
  composer.addPass(bloomPass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);
}

// ============================================
// HDRI LOADER — environment reflections
// ============================================
export function loadHDRI(path) {
  return new Promise((resolve, reject) => {
    new RGBELoader()
      .load(
        path,
        (texture) => {
          texture.mapping = THREE.EquirectangularReflectionMapping;
          scene.environment = texture;
          // Do NOT set as background — we want dark garage, HDRI only for reflections
          resolve(texture);
        },
        undefined,
        (err) => {
          console.warn('[HDRI] load failed, continuing without env map:', err);
          resolve(null); // non-fatal
        }
      );
  });
}

// ============================================
// CAR LOADER — GLB with Draco support
// ============================================
export function loadCar(path, onProgress) {
  return new Promise((resolve, reject) => {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      path,
      (gltf) => {
        carRoot = gltf.scene;
        scene.add(carRoot);
        sceneObjects.car = carRoot;

        // Center and ground the car
        const box = new THREE.Box3().setFromObject(carRoot);
        const size = box.getSize(new THREE.Vector3());
        const centerXZ = box.getCenter(new THREE.Vector3());
        carRoot.position.x -= centerXZ.x;
        carRoot.position.z -= centerXZ.z;
        carRoot.position.y -= box.min.y; // sit on floor

        // Walk the tree — index named parts, clone shared materials for independent control
        indexNamedParts(carRoot);

        console.log('[Hyperion] Car loaded. Bounds:', size);
        console.log('[Hyperion] Indexed parts:', Object.keys(sceneObjects.parts));
        console.log('[Hyperion] Emissive materials:', Object.keys(sceneObjects.emissiveMats));

        resolve(carRoot);
      },
      (xhr) => {
        if (xhr.lengthComputable && onProgress) {
          onProgress(xhr.loaded / xhr.total);
        }
      },
      (err) => reject(err)
    );
  });
}

// ============================================
// INDEX NAMED PARTS
// Walks the tree, finds our named meshes, clones shared emissive materials
// so each light unit can be controlled independently.
// ============================================
const TARGET_NAMES = [
  // Animated parts
  'EngineCover_Rear',
  'Door_L',
  'Door_R',
  // Lights — headlights
  'Light_Headlight_Top',
  'Light_Headlight_Bottom',
  'Light_Headlight_DRL_L',
  'Light_Headlight_DRL_R',
  // Lights — tail
  'Light_Tail',
  'Light_Tail_Ind_L',
  'Light_Tail_Ind_R',
  // Cockpit
  'Cockpit_Screen_Infotainment',
  'Cockpit_Steering',
];

function indexNamedParts(root) {
  root.traverse((obj) => {
    // Match top-level named parts
    if (TARGET_NAMES.includes(obj.name)) {
      sceneObjects.parts[obj.name] = obj;
    }

    // For any mesh with a material, if its name is a light, clone material for independence
    if (obj.isMesh) {
      const looksLikeLight = obj.name.startsWith('Light_');
      if (looksLikeLight && obj.material) {
        // Handle material arrays
        if (Array.isArray(obj.material)) {
          obj.material = obj.material.map((m) => m.clone());
        } else {
          obj.material = obj.material.clone();
        }

        // Prime emissive properties — start dark
        const setDark = (mat) => {
          if (!mat) return;
          if (!mat.emissive) mat.emissive = new THREE.Color(0x000000);
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0;
          mat.needsUpdate = true;
        };
        if (Array.isArray(obj.material)) obj.material.forEach(setDark);
        else setDark(obj.material);

        // Store reference by part name for acts.js to access
        sceneObjects.emissiveMats[obj.name] = obj.material;
      }
    }
  });
}

// ============================================
// EXPOSE SCENE OBJECTS
// ============================================
export function getSceneObjects() {
  return sceneObjects;
}

// ============================================
// RESIZE HANDLER
// ============================================
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
}
