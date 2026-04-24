/**
 * HYPERION GEN.1 — Main entry point v2
 * Adds letterstagger reveal on loader text
 */

import { initScene, loadCar, loadHDRI, getSceneObjects } from './scene.js';
import { initScroll, getScrollProgress } from './scroll.js';
import { initActs, updateActs } from './acts.js';

const DEBUG = true;

const loaderEl = document.getElementById('loader');
const loaderFill = document.querySelector('.loader-fill');
const loaderStatus = document.querySelector('.loader-status');
const loaderText = document.querySelector('.loader-text');

// ============================================
// LETTERSTAGGER — ink-stamp physics reveal on loader title
// ============================================
function stampLoaderTitle() {
  if (!loaderText) return;
  const raw = loaderText.textContent;
  loaderText.textContent = '';
  loaderText.setAttribute('aria-label', raw);
  // Wrap each character in a span with random micro-rotation & stagger
  [...raw].forEach((char, i) => {
    const span = document.createElement('span');
    span.className = 'stamp-letter';
    span.textContent = char === ' ' ? '\u00A0' : char;
    const rot = (Math.random() - 0.5) * 1.4;       // ±0.7°
    const scale = 0.99 + Math.random() * 0.02;      // 99–101%
    const dx = (Math.random() - 0.5) * 2;           // ±1px
    const dy = (Math.random() - 0.5) * 2;
    span.style.setProperty('--stamp-rot', `${rot}deg`);
    span.style.setProperty('--stamp-scale', `${scale}`);
    span.style.setProperty('--stamp-dx', `${dx}px`);
    span.style.setProperty('--stamp-dy', `${dy}px`);
    span.style.animationDelay = `${0.05 * i + 0.2}s`;
    loaderText.appendChild(span);
  });
}

function updateLoader(progress, status) {
  loaderFill.style.width = `${progress * 100}%`;
  if (status) loaderStatus.textContent = status;
}

function hideLoader() {
  loaderEl.classList.add('hidden');
  setTimeout(() => loaderEl.style.display = 'none', 1200);
}

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
    if (e.key === 'd' || e.key === 'D') hud.classList.toggle('hidden');
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

async function boot() {
  setupDebugHUD();
  stampLoaderTitle();

  updateLoader(0.1, 'INITIALIZING SCENE');
  const { scene, camera, renderer, composer } = initScene();

  updateLoader(0.25, 'LOADING ENVIRONMENT');
  await loadHDRI('/assets/hdri/studio_dark.hdr');

  updateLoader(0.4, 'LOADING HYPERION');
  const car = await loadCar('/assets/models/hyperion_trial_v1.glb', (p) => {
    updateLoader(0.4 + p * 0.5, 'LOADING HYPERION');
  });

  updateLoader(0.95, 'CALIBRATING');
  initActs(car, camera, scene);

  initScroll();

  updateLoader(1.0, 'READY');
  setTimeout(hideLoader, 800);

  let lastTime = performance.now();
  let frameCount = 0;
  let fpsDisplay = 0;
  let fpsLastUpdate = performance.now();

  function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const delta = (now - lastTime) / 1000;
    lastTime = now;

    frameCount++;
    if (now - fpsLastUpdate > 500) {
      fpsDisplay = Math.round((frameCount * 1000) / (now - fpsLastUpdate));
      frameCount = 0;
      fpsLastUpdate = now;
    }

    const progress = getScrollProgress();
    const activeAct = updateActs(progress, delta);

    updateDebugHUD(activeAct, progress, fpsDisplay);
    composer.render();
  }

  animate();
}

window.addEventListener('error', (e) => {
  console.error('[Hyperion error]', e.message);
  updateLoader(1.0, 'ERROR — CHECK CONSOLE');
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
