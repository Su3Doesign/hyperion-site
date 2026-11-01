// The single fixed WebGL stage behind the page. Sections never touch three.js directly: the scroll
// director writes numbers into `target`, and every frame the stage eases `cur` toward them.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildStudioEnv } from './env.js';
import { createMeadow, buildDuskEnv } from './meadow.js';
import { createPitlane, buildNightEnv } from './pitlane.js';
import { createTunnel } from './tunnel.js';
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
  flow: 0, flowX: 4, // F1 wind tunnel: smoke amount and the smoke front's x
  lights: 0, lightsOut: 0, // F1 finale: start lights lit (0..5), then out
  orbit: 0, // finale: how much the visitor's own orbit applies
  liftY: 0, // portrait only: shifts the look-at point so the car clears the copy on phones
};

export const target = { ...DEFAULTS };
const cur = { ...DEFAULTS };

// interaction state written by UI (not scroll)
export const live = { userYaw: 0, userVel: 0, dragging: false, highlight: null, mx: 0, my: 0, smx: 0, smy: 0,
  orbitYaw: 0, orbitPitch: 0, sOrbitYaw: 0, sOrbitPitch: 0 };

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

  // --- kinetic type behind the car (decorative; the real h1 is in the DOM)
  const type = makeTypeBands(renderer);
  scene.add(type.group);

  // --- floor: contact shadow + a faint pool of light under the car
  const shadow = createContactShadow({ size: mobile ? 256 : 512, blur: mobile ? 1.6 : 2.2 });
  scene.add(shadow.group);

  // --- the last scene: Hyperion's portal meadow, or the F1's night pit lane
  let finale, finaleEnv, SUN, sunKeyPos, keepShadow = false, keyGain = 1;
  if (car.finale?.kind === 'pitlane') {
    const pl = createPitlane({ mobile });
    pl.group.traverse((o) => o.layers.set(1)); // never in the contact-shadow pass
    finale = { group: pl.group, update: (dt, c) => pl.update(dt, { grow: c.grass, lights: c.lights, out: c.lightsOut, camera }) };
    finaleEnv = buildNightEnv(renderer);
    SUN = pl.keyColor;
    sunKeyPos = pl.keyDir.clone().multiplyScalar(10);
    keepShadow = true;
    keyGain = pl.keyGain;
  } else {
    const meadow = createMeadow({ count: mobile ? 42000 : 72000, shadowTexture: shadow.texture, bladeWidth: mobile ? 0.72 : 1, under: car.meadow.under });
    finale = { group: meadow.group, update: (dt, c) => meadow.update(dt, { grow: THREE.MathUtils.clamp(c.grass, 0, 1), tail: c.tail }) };
    finaleEnv = buildDuskEnv(renderer);
    SUN = meadow.uniforms.uSunColor.value;
    sunKeyPos = meadow.uniforms.uSunDir.value.clone().multiplyScalar(10);
  }
  scene.add(finale.group);
  const STUDIO_KEY = new THREE.Color(0xfff1e4);
  const studioKeyPos = new THREE.Vector3(2, 6, -3);
  // the F1's wind tunnel (smoke lines + rolling road), attached to the car once it loads
  const tunnel = car.ignition?.mode === 'tunnel' ? createTunnel({ mobile }) : null;
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
    if (tunnel) {
      tunnel.build(m.car);
      m.car.add(tunnel.group);
      tunnel.group.traverse((o) => o.layers.set(1));
    }
    return m;
  });

  const tmpTgt = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const off = new THREE.Vector3();
  const sph = new THREE.Spherical();
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
    // finale: the visitor orbits the camera around the car, inside fixed limits
    const ko = reducedMotion || instant ? 1 : 1 - Math.exp(-dt * 4);
    live.sOrbitYaw += (live.orbitYaw - live.sOrbitYaw) * ko;
    live.sOrbitPitch += (live.orbitPitch - live.sOrbitPitch) * ko;
    if (cur.orbit > 0.001) {
      off.subVectors(camera.position, tmpTgt);
      sph.setFromVector3(off);
      sph.theta += live.sOrbitYaw * cur.orbit;
      sph.phi = THREE.MathUtils.clamp(sph.phi - live.sOrbitPitch * cur.orbit, 0.62, 1.53);
      off.setFromSpherical(sph);
      camera.position.copy(tmpTgt).add(off);
    }
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
    scene.environment = d > 0.5 ? finaleEnv : studioEnv;
    scene.environmentIntensity = cur.env * (d > 0.001 && d < 0.999 ? Math.abs(d - 0.5) * 2 : 1);
    key.intensity = 1.2 * cur.key + 0.9 * d * keyGain;
    key.color.copy(STUDIO_KEY).lerp(SUN, d);
    key.position.lerpVectors(studioKeyPos, sunKeyPos, d);
    finale.update(dt, cur);
    tunnel?.update(dt, { amount: cur.flow, front: cur.flowX, speed: cur.spin });
    uvLight.intensity = 9 * cur.uv;
    uvLight.position.set(cur.uvX, car.uv.y, car.uv.z);
    glow.position.copy(uvLight.position);
    core.position.copy(uvLight.position);
    glow.material.opacity = 0.85 * cur.uv;
    core.material.opacity = cur.uv;
    type.update(dt, { amount: cur.word, portrait, still: reducedMotion });
    bloom.strength = cur.bloom;
    pool.material.opacity = 0.55 * cur.env * (1 - cur.grass);

    if (model) {
      model.car.rotation.y = cur.yaw + live.userYaw;
      model.pose({ ...cur, highlight: live.highlight }, dt);
      shadow.opacity = cur.shadow * (keepShadow ? 1 : 1 - Math.min(1, cur.grass * 1.5));
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

// --- kinetic type behind the car: seamless marquee bands of wide display type, one CanvasTexture tile
// each, scrolled through texture offset. Decorative (aria-hidden by nature); the real h1 is in the DOM.
const SPAN = 44; // plane width in metres, wider than any frame that sees the bands
const BAND_KINDS = {
  fill: { px: 360, weight: 800, family: '"Panchang", "Clash Display", sans-serif', color: 0xddd3c3, track: 0.01 },
  outline: { px: 360, weight: 800, family: '"Panchang", "Clash Display", sans-serif', color: 0xddd3c3, track: 0.01 },
  mono: { px: 96, weight: 500, family: '"JetBrains Mono", ui-monospace, monospace', color: car.theme?.bandMono ?? 0xb08a62, track: 0.14 },
};

function bandTile(kind, text) {
  const K = BAND_KINDS[kind];
  const H = Math.round(K.px * 1.25);
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  let px = K.px;
  const setFont = () => {
    g.font = `${K.weight} ${px}px ${K.family}`;
    if ('letterSpacing' in g) g.letterSpacing = `${(K.track * px).toFixed(1)}px`;
  };
  setFont();
  const gap = kind === 'mono' ? px * 2.1 : px * 0.9;
  let w = g.measureText(text).width + gap;
  if (w > 8192) { px *= 8192 / w; w = 8192; } // stay under texture limits on long strings
  c.width = Math.ceil(w);
  c.height = H;
  setFont(); // resizing a canvas resets its context state
  g.textBaseline = 'middle';
  g.fillStyle = g.strokeStyle = '#fff';
  const y = H / 2 + (kind === 'mono' ? 0 : px * 0.04);
  if (kind === 'outline') {
    g.lineWidth = Math.max(2, px * 0.014);
    g.lineJoin = 'round';
    g.strokeText(text, gap / 2, y);
  } else {
    g.fillText(text, gap / 2, y);
  }
  // a small marker on the seam between repeats; drawn on both edges so the halves meet when tiled
  const r = kind === 'mono' ? px * 0.11 : px * 0.07;
  for (const x of [0, c.width]) {
    g.beginPath();
    g.arc(x, H / 2, r, 0, Math.PI * 2);
    if (kind === 'outline') g.stroke(); else g.fill();
  }
  return { canvas: c, aspect: c.width / H };
}

function makeTypeBands(renderer) {
  const cfg = car.word;
  const group = new THREE.Group();
  group.position.set(...cfg.pos);
  group.lookAt(...cfg.look); // planes face the hero camera, sitting behind the car
  const tilt = new THREE.Group(); // scroll-speed lean, kept apart from the facing rotation
  group.add(tilt);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const bands = cfg.bands.map((b, i) => {
    const mat = new THREE.MeshBasicMaterial({ color: BAND_KINDS[b.kind].color, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(SPAN, b.h), mat);
    mesh.position.set(0, b.y, -0.02 * i);
    mesh.renderOrder = -3;
    mesh.layers.set(1);
    tilt.add(mesh);
    return { ...b, mesh, mat, tileW: b.h, phase: (i * 0.37) % 1 };
  });
  const draw = () => {
    for (const b of bands) {
      const { canvas, aspect } = bandTile(b.kind, b.text);
      const t = new THREE.CanvasTexture(canvas);
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = THREE.RepeatWrapping;
      t.anisotropy = aniso;
      b.tileW = b.h * aspect;
      t.repeat.set(SPAN / b.tileW, 1);
      t.offset.x = b.phase;
      b.mat.map?.dispose();
      b.mat.map = t;
      b.mat.needsUpdate = true;
    }
  };
  draw();
  // redraw once the self-hosted faces arrive (canvas text never triggers a font load by itself)
  Promise.all([
    document.fonts?.load('800 100px "Panchang"'),
    document.fonts?.load('500 100px "JetBrains Mono"'),
  ]).then(draw).catch(() => {});

  let lastY = window.scrollY;
  let vel = 0;
  let dir = 1;
  return {
    group,
    update(dt, { amount, portrait, still }) {
      group.visible = amount > 0.005;
      // phones: a bigger stack, lifted into the space above the car
      group.scale.setScalar(portrait ? cfg.portrait.scale : cfg.scale ?? 1);
      group.position.y = cfg.pos[1] + (portrait ? cfg.portrait.dy : 0);
      const y = window.scrollY;
      const v = dt > 0 ? (y - lastY) / dt : 0;
      lastY = y;
      vel += (v - vel) * (1 - Math.exp(-dt * 5));
      // scrolling back up runs the bands the other way; the turn eases through zero
      const want = vel < -40 ? -1 : vel > 40 ? 1 : dir;
      dir += (want - dir) * (1 - Math.exp(-dt * 3));
      const boost = 1 + Math.min(7, Math.abs(vel) / 260);
      for (const b of bands) {
        b.mat.opacity = b.alpha * amount;
        // as the hero hands over, the stack opens up a little
        b.mesh.position.y = b.y * (1 + (1 - amount) * 0.35);
        if (still || !b.mat.map) continue;
        b.mat.map.offset.x = (b.mat.map.offset.x + (dt * b.speed * dir * boost) / b.tileW) % 1;
      }
      tilt.rotation.z = still ? 0 : THREE.MathUtils.clamp(-vel * 0.000025, -0.03, 0.03);
    },
  };
}
