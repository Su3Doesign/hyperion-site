// One scrubbed GSAP timeline for the whole page. Each key pins a full stage state to a point
// inside a section (0 = section top reaches viewport top, 1 = section bottom reaches viewport
// bottom). Between keys the stage interpolates, so the camera never cuts unless reduced motion asks.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { target, DEFAULTS } from '../three/stage.js';
import car from '../cars/index.js';

gsap.registerPlugin(ScrollTrigger);

// [section id, progress within the section, state]
let tl = null;

export function buildDirector({ reducedMotion = false, instant = false } = {}) {
  const make = () => {
    tl?.scrollTrigger?.kill();
    tl?.kill();
    const max = ScrollTrigger.maxScroll(window);
    const vh = window.innerHeight;
    // resolve every key to an absolute scroll position + a complete state
    let state = { ...DEFAULTS };
    const resolved = [];
    for (const [id, p, s] of car.keys) {
      const el = document.getElementById(id);
      if (!el) continue;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const span = Math.max(1, el.offsetHeight - vh);
      const at = Math.min(max, Math.max(0, top + p * span));
      state = { ...state, ...s };
      resolved.push({ at, state });
    }
    resolved.sort((a, b) => a.at - b.at);
    Object.assign(target, resolved[0].state);

    tl = gsap.timeline({ paused: true, defaults: { ease: reducedMotion ? 'steps(1)' : 'sine.inOut' } });
    for (let i = 0; i < resolved.length - 1; i++) {
      const a = resolved[i];
      const b = resolved[i + 1];
      const d = Math.max(0.001, b.at - a.at);
      tl.fromTo(target, { ...a.state }, { ...b.state, duration: d, immediateRender: false }, a.at);
    }
    tl.set({}, {}, Math.max(max, 1)); // timeline length == scroll length, so time == scrollY
    ScrollTrigger.create({
      start: 0,
      end: () => ScrollTrigger.maxScroll(window),
      scrub: reducedMotion || instant ? true : 0.6,
      animation: tl,
    });
  };
  let busy = false;
  const rebuild = () => { if (busy) return; busy = true; make(); busy = false; };
  rebuild();
  ScrollTrigger.addEventListener('refresh', rebuild);
  return () => { ScrollTrigger.removeEventListener('refresh', rebuild); tl?.scrollTrigger?.kill(); tl?.kill(); };
}
