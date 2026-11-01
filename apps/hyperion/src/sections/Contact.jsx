import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { studio } from '../content.js';
import Monogram from '../ui/Monogram.jsx';
import car, { other, otherHref } from '../cars/index.js';
import { live, target } from '../three/stage.js';

gsap.registerPlugin(ScrollTrigger);

// Last scene: the studio floor opens into the car's own finale (Hyperion: a meadow, three/meadow.js;
// F1: a night pit lane, three/pitlane.js), then the invitation rises over it. At the very end the
// visitor can drag to orbit the camera around the car, inside fixed limits.
const YAW = 1.15, PITCH_MIN = -0.12, PITCH_MAX = 0.55;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export default function Contact({ stats, mobile }) {
  const root = useRef(null);
  const copyRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const links = studio.links.filter((l) => l.href);
  const hint = useRef(null);
  const drag = useRef(null);

  // the drag hint shows once the orbit is live
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (hint.current) hint.current.style.opacity = target.orbit > 0.6 ? '1' : '0';
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onDown = (e) => {
    if (target.orbit < 0.3 || e.target.closest('a,button')) return;
    drag.current = { x: e.clientX, y: e.clientY, mouse: e.pointerType === 'mouse' };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    live.orbitYaw = clamp(live.orbitYaw - (e.clientX - d.x) * 0.0055, -YAW, YAW);
    // touch keeps vertical swipes for scrolling; only a mouse tilts the camera
    if (d.mouse) live.orbitPitch = clamp(live.orbitPitch + (e.clientY - d.y) * 0.004, PITCH_MIN, PITCH_MAX);
    d.x = e.clientX;
    d.y = e.clientY;
  };
  const onUp = () => { drag.current = null; };
  const nudge = (a) => () => { live.orbitYaw = clamp(live.orbitYaw + a, -YAW, YAW); };

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(copyRef.current, { opacity: 0.001, y: 40 }, {
        opacity: 1, y: 0, ease: 'none',
        scrollTrigger: { trigger: root.current, start: () => `top+=${window.innerHeight * 0.55} top`, end: () => `top+=${window.innerHeight * 1.05} top`, scrub: true },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  const copy = async () => {
    try { await navigator.clipboard.writeText(studio.email); setCopied(true); setTimeout(() => setCopied(false), 2200); }
    catch { const r = document.createRange(); r.selectNodeContents(document.getElementById('email-text')); getSelection().removeAllRanges(); getSelection().addRange(r); }
  };

  return (
    <section id="contact" ref={root} aria-labelledby="contact-title" className="relative h-[250vh]">
      <div className="sticky top-0 flex h-[100svh] select-none flex-col justify-between gutter" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 96px)', paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))', touchAction: 'pan-y' }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} data-cursor="Drag">
        <div className="flex items-start justify-between gap-6">
          <p className="t-eyebrow">{car.finale.eyebrow}</p>
          <p className="t-meta hidden text-right sm:block">{car.finale.meta(mobile)}</p>
        </div>
        <div ref={hint} className="pointer-events-none flex items-center gap-3 self-center transition-opacity duration-700" style={{ opacity: 0 }}>
          <button type="button" className="btn pointer-events-auto !min-h-[40px] !px-3" onClick={nudge(-0.35)} aria-label="Turn the view left">←</button>
          <span className="t-meta uppercase tracking-[0.16em]">{car.finale.hint}</span>
          <button type="button" className="btn pointer-events-auto !min-h-[40px] !px-3" onClick={nudge(0.35)} aria-label="Turn the view right">→</button>
        </div>

        <div>
          <div className="scrim-b pointer-events-none absolute inset-x-0 bottom-0 h-[70%]" />
          <div ref={copyRef} className="relative grid grid-cols-12 gap-x-6 gap-y-8">
            <div className="col-span-12 lg:col-span-8">
              <h2 id="contact-title" className="font-display font-medium leading-[0.9] tracking-[-0.045em]" style={{ fontSize: 'clamp(3rem, 9vw, 8.5rem)' }}>Let’s build <span className="t-hollow">the next one.</span></h2>
              <p className="t-body mt-5">Commissions for product visualisation, environments and hard-surface work.</p>
            </div>
            <div className="col-span-12 flex flex-wrap items-center gap-3">
              {studio.email && (
                <div className="flex flex-wrap items-center gap-3">
                  <span id="email-text" className="select-all font-display text-[clamp(1.1rem,2vw,1.5rem)]">{studio.email}</span>
                  <button type="button" className="btn" onClick={copy}>{copied ? 'Copied' : 'Copy email'}</button>
                </div>
              )}
              <a className="btn" href={studio.pitwall} target="_blank" rel="noopener">Ask the studio <span aria-hidden="true">↗</span></a>
              <a className="btn" href={studio.teardown} target="_blank" rel="noopener">Read the build story <span aria-hidden="true">↗</span></a>
              {links.map((l) => (
                <a key={l.label} className="btn" href={l.href} target="_blank" rel="noopener">{l.label} <span aria-hidden="true">↗</span></a>
              ))}
            </div>
            <div className="col-span-12">
          {/* the other car, one tap away */}
          <a href={otherHref} className="next-car group relative flex items-center gap-5 border-t border-bone/10 pt-5" data-cursor="Open">
            <img src={`${other.renders}hero-800.webp`} alt="" width="160" height="90" loading="lazy" className="h-[54px] w-[96px] shrink-0 object-cover opacity-80 transition-opacity duration-500 group-hover:opacity-100 sm:h-[72px] sm:w-[128px]" />
            <span className="min-w-0">
              <span className="t-eyebrow block">Next car</span>
              <span className="mt-1 block font-display text-[clamp(1.2rem,2.4vw,1.9rem)] font-medium leading-tight tracking-[-0.02em]">{other.title} <span aria-hidden="true" className="inline-block transition-transform duration-500 group-hover:translate-x-1">→</span></span>
              <span className="t-meta mt-1 block">{other.pitch}</span>
            </span>
          </a>
            </div>
          </div>
          <footer className="relative mt-6 grid grid-cols-12 gap-4 border-t border-bone/10 pt-5">
            <div className="col-span-12 flex items-center gap-3 md:col-span-5">
              <Monogram size={18} className="text-bronze" />
              <p className="t-meta">{car.credit}</p>
            </div>
            <p className="t-meta col-span-12 md:col-span-7 md:text-right">
              Live car: three.js, {stats ? `${stats.meshes} meshes, ${(stats.tris / 1000).toFixed(0)}k triangles` : 'meshopt glTF'} · Stills: Blender Cycles · Type: Clash Display, Satoshi and Panchang (Fontshare), JetBrains Mono
            </p>
          </footer>
        </div>
      </div>
    </section>
  );
}
