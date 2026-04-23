/**
 * scroll.js — Smooth scroll using Lenis. Exposes total progress [0..1].
 */

import Lenis from 'lenis';

let lenis;
let scrollProgress = 0;

export function initScroll() {
  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    smoothTouch: false, // keep native touch on mobile
  });

  lenis.on('scroll', ({ scroll, limit }) => {
    scrollProgress = limit > 0 ? scroll / limit : 0;
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

export function getLenis() {
  return lenis;
}
