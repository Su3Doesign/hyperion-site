/**
 * scene.js — Three.js scene, lighting, HDRI, model loading, post-processing
 * v2: Dark background, HDRI for reflections only, bounds exposed for acts.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

let scene, camera, renderer, composer;
let carRoot = null;

const sceneObjects = {
  car: null,
  parts: {},
  emissiveMats: {},
  lights: {},
  carBounds: null,
  carSize: null,
  carCenter: null,
};

export function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030305);
  scene.fog = new THREE.Fog(0x030305, 15, 50);

  camera = new THREE.PerspectiveCamera(
    32,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.set(10, 3, 12);
  camera.lookAt(0, 0.5, 0);

  const canvas = document.getElementById('scene-canvas');
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.65;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = false;

  setupLighting();
  setupPostProcessing();

  window.addEventListener('resize', onResize);

  return { scene, camera, renderer, composer };
}

function setupLighting() {
  const ambient = new THREE.AmbientLight(0x1a1a22, 0.25);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(5, 10, 4);
  scene.add(key);
  sceneObjects.lights.key = key;

  const rim = new THREE.DirectionalLight(0xffc070, 0.6);
  rim.position.set(-6, 4, -8);
  scene.add(rim);
  sceneObjects.lights.rim = rim;

  const stripeLeft = new THREE.RectAreaLight(0xffffff, 12, 14, 0.12);
  stripeLeft.position.set(-7, 2, 0);
  stripeLeft.lookAt(0, 1.5, 0);
  scene.add(stripeLeft);
  sceneObjects.lights.stripeLeft = stripeLeft;

  const stripeRight = new THREE.RectAreaLight(0xffffff, 12, 14, 0.12);
  stripeRight.position.set(7, 2, 0);
  stripeRight.lookAt(0, 1.5, 0);
  scene.add(stripeRight);
  sceneObjects.lights.stripeRight = stripeRight;

  const stripeTop = new THREE.RectAreaLight(0xfff0e0, 8, 12, 0.08);
  stripeTop.position.set(0, 5, 6);
  stripeTop.lookAt(0, 0.5, 0);
  scene.add(stripeTop);
  sceneObjects.lights.stripeTop = stripeTop;

  const stripeBack = new THREE.RectAreaLight(0x8090a0, 6, 10, 0.06);
  stripeBack.position.set(0, 3, -6);
  stripeBack.lookAt(0, 0.5, 0);
  scene.add(stripeBack);
  sceneObjects.lights.stripeBack = stripeBack;

  const floorGeo = new THREE.PlaneGeometry(50, 50);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x050507,
    roughness: 0.4,
    metalness: 0.6,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);
  sceneObjects.lights.floor = floor;
}

function setupPostProcessing() {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.8, 0.75, 0.6
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());
}

export function loadHDRI(path) {
  return new Promise((resolve) => {
    new RGBELoader().load(
      path,
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
        resolve(texture);
      },
      undefined,
      (err) => {
        console.warn('[HDRI] load failed:', err);
        resolve(null);
      }
    );
  });
}

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

        const box = new THREE.Box3().setFromObject(carRoot);
        const center = box.getCenter(new THREE.Vector3());
        carRoot.position.x -= center.x;
        carRoot.position.z -= center.z;
        carRoot.position.y -= box.min.y;

        const finalBox = new THREE.Box3().setFromObject(carRoot);
        sceneObjects.carBounds = finalBox;
        sceneObjects.carSize = finalBox.getSize(new THREE.Vector3());
        sceneObjects.carCenter = finalBox.getCenter(new THREE.Vector3());

        indexNamedParts(carRoot);

        console.log('[Hyperion] Car loaded. Bounds:', sceneObjects.carSize);
        console.log('[Hyperion] Center:', sceneObjects.carCenter);
        console.log('[Hyperion] Indexed parts:', Object.keys(sceneObjects.parts));
        console.log('[Hyperion] Emissive materials:', Object.keys(sceneObjects.emissiveMats));

        resolve(carRoot);
      },
      (xhr) => {
        if (xhr.lengthComputable && onProgress) onProgress(xhr.loaded / xhr.total);
      },
      (err) => reject(err)
    );
  });
}

const TARGET_NAMES = [
  'EngineCover_Rear',
  'Door_L', 'Door_R',
  'Light_Headlight_Top', 'Light_Headlight_Bottom',
  'Light_Headlight_DRL_L', 'Light_Headlight_DRL_R',
  'Light_Tail', 'Light_Tail_Ind_L', 'Light_Tail_Ind_R',
  'Cockpit_Screen_Infotainment', 'Cockpit_Steering',
];

function indexNamedParts(root) {
  root.traverse((obj) => {
    if (TARGET_NAMES.includes(obj.name)) {
      sceneObjects.parts[obj.name] = obj;
      if (['EngineCover_Rear', 'Door_L', 'Door_R'].includes(obj.name)) {
        const worldPos = new THREE.Vector3();
        obj.getWorldPosition(worldPos);
        console.log(`[Hyperion] ${obj.name} world origin:`, worldPos);
      }
    }

    if (obj.isMesh) {
      const looksLikeLight = obj.name.startsWith('Light_');
      if (looksLikeLight && obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material = obj.material.map((m) => m.clone());
        } else {
          obj.material = obj.material.clone();
        }
        const setDark = (mat) => {
          if (!mat) return;
          if (!mat.emissive) mat.emissive = new THREE.Color(0x000000);
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0;
          mat.needsUpdate = true;
        };
        if (Array.isArray(obj.material)) obj.material.forEach(setDark);
        else setDark(obj.material);
        sceneObjects.emissiveMats[obj.name] = obj.material;
      }
    }
  });
}

export function getSceneObjects() {
  return sceneObjects;
}

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
}
