/**
 * scroll.js v2 — Smooth scroll with 2x longer pacing via Lenis.
 * Total scrollable height is driven by CSS (.act min-height: 200vh) so we
 * simply expose the normalized progress here.
 */

import Lenis from 'lenis';

let lenis;
let scrollProgress = 0;
let scrollVelocity = 0; // px/frame — consumed by typography effects

export function initScroll() {
  lenis = new Lenis({
    duration: 1.6,            // slower, more cinematic easing
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 0.75,    // slightly dampen wheel — viewer has to commit
    smoothTouch: false,
    touchMultiplier: 1.5,
  });

  lenis.on('scroll', ({ scroll, limit, velocity }) => {
    scrollProgress = limit > 0 ? scroll / limit : 0;
    scrollVelocity = velocity;
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
}

export function getScrollProgress() {
  return scrollProgress;
}

export function getScrollVelocity() {
  return scrollVelocity;
}

export function getLenis() {
  return lenis;
}
