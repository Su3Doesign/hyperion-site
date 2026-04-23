/**
 * HYPERION GEN.1 — Portfolio of Sumanth Richie
 * Main entry point
 */

import { initScene, loadCar, loadHDRI, getSceneObjects } from './scene.js';
import { initScroll, getScrollProgress } from './scroll.js';
import { initActs, updateActs } from './acts.js';

// ============================================
// DEBUG MODE — press 'D' to toggle HUD
// ============================================
const DEBUG = true;

// ============================================
// LOADER UI
// ============================================
const loaderEl = document.getElementById('loader');
const loaderFill = document.querySelector('.loader-fill');
const loaderStatus = document.querySelector('.loader-status');

function updateLoader(progress, status) {
  loaderFill.style.width = `${progress * 100}%`;
  if (status) loaderStatus.textContent = status;
}

function hideLoader() {
  loaderEl.classList.add('hidden');
  setTimeout(() => loaderEl.style.display = 'none', 1200);
}

// ============================================
// DEBUG HUD
// ============================================
function setupDebugHUD() {
  if (!DEBUG) return;
  const hud = document.createElement('div');
  hud.id = 'debug-hud';
  hud.innerHTML = `
    <div>HYPERION GEN.1 — DEV</div>
    <div id="hud-act">Act: —</div>
    <div id="hud-progress">Scroll: 0%</div>
    <div id="hud-fps">FPS: —</div>
  `;
  document.body.appendChild(hud);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'd' || e.key === 'D') {
      hud.classList.toggle('hidden');
    }
  });
}

function updateDebugHUD(act, progress, fps) {
  if (!DEBUG) return;
  const actEl = document.getElementById('hud-act');
  const progEl = document.getElementById('hud-progress');
  const fpsEl = document.getElementById('hud-fps');
  if (actEl) actEl.textContent = `Act: ${act}`;
  if (progEl) progEl.textContent = `Scroll: ${(progress * 100).toFixed(1)}%`;
  if (fpsEl) fpsEl.textContent = `FPS: ${fps}`;
}

// ============================================
// BOOT
// ============================================
async function boot() {
  setupDebugHUD();

  // 1. Initialize Three.js scene
  updateLoader(0.1, 'INITIALIZING SCENE');
  const { scene, camera, renderer, composer } = initScene();

  // 2. Load HDRI environment
  updateLoader(0.25, 'LOADING ENVIRONMENT');
  await loadHDRI('/assets/hdri/studio_dark.hdr');

  // 3. Load car model
  updateLoader(0.4, 'LOADING HYPERION');
  const car = await loadCar('/assets/models/hyperion_trial_v1.glb', (p) => {
    updateLoader(0.4 + p * 0.5, 'LOADING HYPERION');
  });

  // 4. Initialize Acts (part references, lighting controls)
  updateLoader(0.95, 'CALIBRATING');
  initActs(car, camera, scene);

  // 5. Initialize scroll controller
  initScroll();

  // 6. Complete
  updateLoader(1.0, 'READY');
  setTimeout(hideLoader, 600);

  // ============================================
  // RENDER LOOP
  // ============================================
  let lastTime = performance.now();
  let frameCount = 0;
  let fpsDisplay = 0;
  let fpsLastUpdate = performance.now();

  function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const delta = (now - lastTime) / 1000;
    lastTime = now;

    // FPS calculation
    frameCount++;
    if (now - fpsLastUpdate > 500) {
      fpsDisplay = Math.round((frameCount * 1000) / (now - fpsLastUpdate));
      frameCount = 0;
      fpsLastUpdate = now;
    }

    // Get scroll progress and drive Acts
    const progress = getScrollProgress();
    const activeAct = updateActs(progress, delta);

    // Update debug HUD
    updateDebugHUD(activeAct, progress, fpsDisplay);

    // Render with post-processing (bloom)
    composer.render();
  }

  animate();
}

// ============================================
// ERROR HANDLING
// ============================================
window.addEventListener('error', (e) => {
  console.error('[Hyperion error]', e.message);
  updateLoader(1.0, 'ERROR — CHECK CONSOLE');
});

// Boot when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
