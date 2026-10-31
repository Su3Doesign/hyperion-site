// The single fixed WebGL stage behind the page. Sections never touch three.js directly: the scroll
// director writes numbers into `target`, and every frame the stage eases `cur` toward them.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildStudioEnv } from './env.js';
import { createMeadow, buildDuskEnv } from './meadow.js';
import car from '../cars/index.js';
import { loadCar, anchorOf } from './car.js';
import { createContactShadow } from './shadow.js';

export const INK = 0x0b0a09;

export const DEFAULTS = {
  camX: 5.5, camY: 1.1, camZ: -4.3, tgtX: 0.15, tgtY: 0.48, tgtZ: 0, hfov: 42,
  yaw: 0, explode: 0, ptExplode: 0, doors: 0, clam: 0, spin: 0,
  env: 1, key: 1, uv: 0, uvX: 2.9, head: 0.55, tail: 0.3, screens: 0,
  word: 1, bloom: 0.35, shadow: 1, parallax: 1, visible: 1,
  grass: 0, dusk: 0,
  liftY: 0, // portrait only: shifts the look-at point so the car clears the copy on phones
};

export const target = { ...DEFAULTS };
const cur = { ...DEFAULTS };

// interaction state written by UI (not scroll)
export const live = { userYaw: 0, userVel: 0, dragging: false, highlight: null, mx: 0, my: 0, smx: 0, smy: 0 };

export function createStage(canvas, { mobile = false, reducedMotion = false, instant = false, manual = false, onProgress } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false });
  const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(INK, 1);
  renderer.toneMapping = THREE.AgXToneMapping; // same view transform as the Cycles stills
  renderer.toneMappingExposure = 1.12;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(INK);
  const studioEnv = buildStudioEnv(renderer);
  const duskEnv = buildDuskEnv(renderer);
  scene.environment = studioEnv;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 120);
  camera.layers.enable(1);

  const key = new THREE.DirectionalLight(0xfff1e4, 1.2);
  key.position.set(2, 6, -3);
  scene.add(key);

  // --- UV-C inspection lamp: a real point light plus a glow sprite so the source itself reads
  const ION = new THREE.Color(0x8f7bff);
  const uvLight = new THREE.PointLight(ION, 0, 0, 2);
  scene.add(uvLight);
  const glowTex = radialTexture();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: ION, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.setScalar(1.1);
  glow.layers.set(1);
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xe9e4ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  core.scale.setScalar(0.16);
  core.layers.set(1);
  scene.add(glow, core);

  // --- the giant word behind the car (decorative; the real h1 is in the DOM)
  const word = makeWord();
  word.layers.set(1);
  scene.add(word);

  // --- floor: contact shadow + a faint pool of light under the car
  const shadow = createContactShadow({ size: mobile ? 256 : 512, blur: mobile ? 1.6 : 2.2 });
  scene.add(shadow.group);

  // --- the portal meadow for the last scene
  const meadow = createMeadow({ count: mobile ? 42000 : 72000, shadowTexture: shadow.texture, bladeWidth: mobile ? 0.72 : 1, under: car.meadow.under });
  scene.add(meadow.group);
  const STUDIO_KEY = new THREE.Color(0xfff1e4);
  const SUN = meadow.uniforms.uSunColor.value;
  const studioKeyPos = new THREE.Vector3(2, 6, -3);
  const sunKeyPos = meadow.uniforms.uSunDir.value.clone().multiplyScalar(10);
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(7, 64).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: poolTexture(), transparent: true, depthWrite: false, opacity: 1 })
  );
  pool.position.y = 0.001;
  pool.layers.set(1);
  pool.renderOrder = -2;
  scene.add(pool);

  // --- post
  const size = new THREE.Vector2();
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: mobile ? 2 : 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.35, 0.55, 0.9);
  if (!mobile) composer.addPass(bloom);
  composer.addPass(new OutputPass());

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    size.set(w, h);
  }
  resize();
  window.addEventListener('resize', resize);

  const onMove = (e) => {
    live.mx = (e.clientX / window.innerWidth) * 2 - 1;
    live.my = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener('pointermove', onMove, { passive: true });

  let model = null;
  const frameHooks = new Set();
  const ext = import.meta.env.VITE_MODEL_WRAP ? '.glb.b64.json' : '.glb';
  const ready = loadCar(`${car.model}${mobile ? '-mobile' : ''}${ext}`, onProgress).then((m) => {
    model = m;
    scene.add(m.car);
    m.car.traverse((o) => o.layers.set(0));
    return m;
  });

  const tmpTgt = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  let last = performance.now();
  let frame = 0;
  let raf = 0;
  let running = true;

  function tick(now) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!running || manual) return;
    step(dt);
  }

  // one frame of work; QA calls it directly (manual mode) so software GPUs never queue frames up
  function step(dt) {

    // ease toward the scroll targets; reduced motion jumps straight there
    const k = reducedMotion || instant ? 1 : 1 - Math.exp(-dt * 4.2);
    for (const key in target) cur[key] += (target[key] - cur[key]) * k;
    live.smx += (live.mx - live.smx) * (reducedMotion ? 1 : 1 - Math.exp(-dt * 2.5));
    live.smy += (live.my - live.smy) * (reducedMotion ? 1 : 1 - Math.exp(-dt * 2.5));

    // turntable inertia from drag
    if (!live.dragging) {
      live.userYaw += live.userVel * dt;
      live.userVel *= Math.exp(-dt * 2.2);
    }

    canvas.style.opacity = cur.visible.toFixed(3);
    if (cur.visible < 0.01) return; // nothing on screen: skip the GPU work entirely

    // camera with a little cursor parallax around its look direction
    const portrait = camera.aspect < 0.8;
    tmpTgt.set(cur.tgtX, cur.tgtY + (portrait ? cur.liftY : 0), cur.tgtZ);
    camera.position.set(cur.camX, cur.camY, cur.camZ);
    camera.lookAt(tmpTgt);
    if (!reducedMotion && cur.parallax > 0) {
      right.setFromMatrixColumn(camera.matrix, 0);
      const dist = camera.position.distanceTo(tmpTgt);
      camera.position.addScaledVector(right, live.smx * 0.045 * dist * cur.parallax);
      camera.position.addScaledVector(up, -live.smy * 0.02 * dist * cur.parallax);
      camera.lookAt(tmpTgt);
    }
    const vf = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(cur.hfov) / 2) / camera.aspect);
    camera.fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(vf), 14, 74);
    camera.updateProjectionMatrix();

    // studio -> dusk: swap the environment at the midpoint, where its intensity dips to zero
    const d = THREE.MathUtils.clamp(cur.dusk, 0, 1);
    scene.environment = d > 0.5 ? duskEnv : studioEnv;
    scene.environmentIntensity = cur.env * (d > 0.001 && d < 0.999 ? Math.abs(d - 0.5) * 2 : 1);
    key.intensity = 1.2 * cur.key + 0.9 * d;
    key.color.copy(STUDIO_KEY).lerp(SUN, d);
    key.position.lerpVectors(studioKeyPos, sunKeyPos, d);
    meadow.update(dt, { grow: THREE.MathUtils.clamp(cur.grass, 0, 1), tail: cur.tail });
    uvLight.intensity = 9 * cur.uv;
    uvLight.position.set(cur.uvX, car.uv.y, car.uv.z);
    glow.position.copy(uvLight.position);
    core.position.copy(uvLight.position);
    glow.material.opacity = 0.85 * cur.uv;
    core.material.opacity = cur.uv;
    word.material.opacity = cur.word;
    word.scale.setScalar(portrait ? 0.8 : 1);
    word.visible = cur.word > 0.005;
    bloom.strength = cur.bloom;
    pool.material.opacity = 0.55 * cur.env * (1 - cur.grass);

    if (model) {
      model.car.rotation.y = cur.yaw + live.userYaw;
      model.pose({ ...cur, highlight: live.highlight }, dt);
      shadow.opacity = cur.shadow * (1 - Math.min(1, cur.grass * 1.5));
      if (!mobile || frame % 2 === 0) shadow.update(renderer, scene);
    }
    composer.render(dt);
    frame++;
    for (const f of frameHooks) f(dt);
  }
  raf = requestAnimationFrame(tick);

  const proj = new THREE.Vector3();
  return {
    ready,
    renderer,
    get model() { return model; },
    onFrame(f) { frameHooks.add(f); return () => frameHooks.delete(f); },
    /** screen position (CSS px) of an assembly or powertrain part centre */
    project(node) {
      anchorOf(node, proj);
      proj.project(camera);
      return { x: (proj.x * 0.5 + 0.5) * size.x, y: (-proj.y * 0.5 + 0.5) * size.y, z: proj.z };
    },
    pause(v) { running = !v; },
    renderNow(frames = 2) {
      for (let i = 0; i < frames; i++) step(1 / 30);
      renderer.getContext().finish();
    },
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      renderer.dispose();
    },
  };
}

function radialTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.18, 'rgba(255,255,255,0.55)');
  gr.addColorStop(0.5, 'rgba(255,255,255,0.12)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function poolTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(58,52,46,0.55)');
  gr.addColorStop(0.45, 'rgba(30,27,24,0.25)');
  gr.addColorStop(1, 'rgba(11,10,9,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeWord() {
  const c = document.createElement('canvas');
  c.width = 4096;
  c.height = 900;
  const mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, opacity: 1 });
  const W = car.word.width;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(W, W * (900 / 4096)), mat);
  // sits behind the car as seen from the hero camera, facing it
  mesh.position.set(...car.word.pos);
  mesh.lookAt(...car.word.look);
  mesh.renderOrder = -3;
  const draw = () => {
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = '#d9cfbf';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    try { g.fontStretch = 'expanded'; } catch { /* older engines ignore this */ }
    let px = 640;
    g.font = `200 ${px}px "Archivo", "Arial Narrow", sans-serif`;
    if ('letterSpacing' in g) g.letterSpacing = '-0.03em';
    px *= (c.width * 0.94) / Math.max(1, g.measureText(car.word.text).width); // fit whatever face loaded
    g.font = `200 ${Math.round(px)}px "Archivo", "Arial Narrow", sans-serif`;
    g.fillText(car.word.text, c.width / 2, c.height / 2 + 20);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    mat.map?.dispose();
    mat.map = t;
    mat.needsUpdate = true;
  };
  draw();
  document.fonts?.load('200 640px "Archivo"').then(draw).catch(() => {});
  document.fonts?.ready.then(draw);
  return mesh;
}
