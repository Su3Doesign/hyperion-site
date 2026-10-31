// One scrubbed GSAP timeline for the whole page. Each key pins a full stage state to a point
// inside a section (0 = section top reaches viewport top, 1 = section bottom reaches viewport
// bottom). Between keys the stage interpolates, so the camera never cuts unless reduced motion asks.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { target, DEFAULTS } from '../three/stage.js';

gsap.registerPlugin(ScrollTrigger);

const TAU = Math.PI * 2;

// three.js coordinates: +x forward, +y up, the car's left side faces -z
const S = {
  hero: { camX: 5.5, camY: 1.1, camZ: -4.3, tgtX: 0.15, tgtY: 0.5, tgtZ: 0, hfov: 42, env: 1, key: 1, word: 1, head: 0.55, tail: 0.3, bloom: 0.35, shadow: 1, uv: 0 },
  heroOut: { camX: 4.6, camY: 0.95, camZ: -4.9, tgtX: 0.1, tgtY: 0.5, hfov: 44, word: 0.0 },
  ignIn: { camX: 1.6, camY: 0.92, camZ: -6.6, tgtX: 0.0, tgtY: 0.5, tgtZ: 0, hfov: 52, env: 0.05, key: 0, word: 0, uv: 1, uvX: 3.0, head: 0, tail: 0, bloom: 0.85, shadow: 0.45, parallax: 0.4 },
  ignOut: { camX: -0.9, camY: 0.92, camZ: -6.6, tgtX: -0.4, uvX: -2.9, uv: 1 },
  ignWake: { uv: 0, head: 1, env: 0.35, key: 0.35, bloom: 0.7 },
  walk: { camX: 5.6, camY: 1.75, camZ: -5.1, tgtX: 0, tgtY: 0.45, tgtZ: 0, hfov: 46, env: 1, key: 1, head: 0.6, tail: 0.35, bloom: 0.3, shadow: 1, parallax: 0.2, yaw: 0 },
  walkEnd: { yaw: TAU },
  light: { camX: 3.7, camY: 0.74, camZ: -2.15, tgtX: 1.85, tgtY: 0.6, tgtZ: -0.5, hfov: 34, head: 1, doors: 0, clam: 0, bloom: 0.55, parallax: 0.6 },
  doors: { camX: 4.5, camY: 1.75, camZ: -5.0, tgtX: 0.35, tgtY: 0.75, tgtZ: -0.4, hfov: 46, doors: 1, head: 0.6, bloom: 0.3 },
  clam: { camX: -5.4, camY: 2.7, camZ: -4.0, tgtX: -0.8, tgtY: 0.7, tgtZ: 0, hfov: 46, doors: 0, clam: 1, tail: 0.9 },
  wheel: { camX: 2.5, camY: 0.5, camZ: -3.05, tgtX: 1.28, tgtY: 0.37, tgtZ: -0.86, hfov: 32, clam: 0, spin: 7, tail: 0.3 },
  anaIn: { camX: 6.2, camY: 3.4, camZ: -5.6, tgtX: -0.1, tgtY: 0.8, tgtZ: 0, hfov: 46, explode: 0, ptExplode: 0, spin: 0, head: 0.4, tail: 0.3, bloom: 0.25, parallax: 0.5 },
  anaOpen: { explode: 1 },
  anaPt: { camX: 0.2, camY: 2.45, camZ: -3.5, tgtX: -1.15, tgtY: 0.85, tgtZ: 0, hfov: 44, ptExplode: 1 },
  hide: { visible: 0 },
  reset: { explode: 0, ptExplode: 0, yaw: TAU },
  clients: { visible: 1, camX: 6.4, camY: 0.72, camZ: -0.35, tgtX: 0, tgtY: 0.55, tgtZ: 0, hfov: 40, env: 0.16, key: 0.1, head: 1, tail: 0, bloom: 0.9, shadow: 0.7, word: 0, parallax: 0.8 },
  contact: { camX: -6.3, camY: 0.95, camZ: 3.3, tgtX: -0.3, tgtY: 0.55, tgtZ: 0, hfov: 40, env: 0.2, key: 0.1, head: 0.15, tail: 1, bloom: 0.85, shadow: 0.8 },
};

// [section id, progress within the section, state]
const KEYS = [
  ['hero', 0, S.hero],
  ['hero', 1, S.heroOut],
  ['ignition', 0.0, S.ignIn],
  ['ignition', 0.86, S.ignOut],
  ['ignition', 1, S.ignWake],
  ['walkaround', 0.12, S.walk],
  ['walkaround', 0.92, S.walkEnd],
  ['notes', 0.04, S.light],
  ['notes', 0.18, S.light],
  ['notes', 0.32, S.doors],
  ['notes', 0.44, S.doors],
  ['notes', 0.58, S.clam],
  ['notes', 0.7, S.clam],
  ['notes', 0.84, S.wheel],
  ['notes', 1, S.wheel],
  ['anatomy', 0.0, S.anaIn],
  ['anatomy', 0.42, S.anaOpen],
  ['anatomy', 0.55, {}],
  ['anatomy', 0.82, S.anaPt],
  ['anatomy', 1, {}],
  ['renders', 0.04, S.hide],
  ['renders', 0.6, S.reset],
  ['clients', 0.0, S.clients],
  ['clients', 1, {}],
  ['contact', 0.3, S.contact],
];

let tl = null;

export function buildDirector({ reducedMotion = false } = {}) {
  const make = () => {
    tl?.scrollTrigger?.kill();
    tl?.kill();
    const max = ScrollTrigger.maxScroll(window);
    const vh = window.innerHeight;
    // resolve every key to an absolute scroll position + a complete state
    let state = { ...DEFAULTS };
    const resolved = [];
    for (const [id, p, s] of KEYS) {
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
      scrub: reducedMotion ? true : 0.6,
      animation: tl,
    });
  };
  let busy = false;
  const rebuild = () => { if (busy) return; busy = true; make(); busy = false; };
  rebuild();
  ScrollTrigger.addEventListener('refresh', rebuild);
  return () => { ScrollTrigger.removeEventListener('refresh', rebuild); tl?.scrollTrigger?.kill(); tl?.kill(); };
}
