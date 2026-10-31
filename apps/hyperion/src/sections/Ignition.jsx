import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ignitionCallouts, dims } from '../content.js';
import { target } from '../three/stage.js';

gsap.registerPlugin(ScrollTrigger);

// x positions along the car (three.js metres, nose +2.30 → tail −2.33) mapped to a 0..1 ruler
const NOSE = 2.3, TAIL = -2.33;
const toRuler = (x) => (NOSE - x) / (NOSE - TAIL);

export default function Ignition() {
  const marker = useRef(null);
  const readout = useRef(null);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    let raf = 0;
    let last = -2;
    const loop = () => {
      const p = toRuler(target.uvX);
      const on = target.uv > 0.05;
      if (marker.current) {
        marker.current.style.left = `${(Math.min(1, Math.max(0, p)) * 100).toFixed(2)}%`;
        marker.current.style.opacity = on ? '1' : '0.25';
      }
      if (readout.current) readout.current.textContent = `${Math.round(Math.min(1, Math.max(0, p)) * dims.length).toLocaleString('en-GB').padStart(5, ' ')} mm`;
      let idx = -1;
      ignitionCallouts.forEach((c, i) => { if (on && Math.abs(toRuler(c.x) - p) < 0.09) idx = i; });
      if (idx !== last) { last = idx; setActive(idx); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const c = ignitionCallouts[active];
  return (
    <section id="ignition" aria-labelledby="ignition-title" className="relative h-[290vh]">
      <div className="sticky top-0 flex h-[100svh] flex-col justify-between gutter" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 96px)', paddingBottom: 'max(32px, env(safe-area-inset-bottom, 0px))' }}>
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-6 lg:col-span-5">
            <p className="t-eyebrow">UV-C inspection · 254 nm</p>
            <h2 id="ignition-title" className="t-h2 mt-5">Light finds the truth of a surface.</h2>
            <p className="t-body mt-6">Before a panel is signed off it is swept with a single lamp. A ripple in the reflection is a ripple in the panel. Keep scrolling to move the lamp from nose to tail.</p>
          </div>
        </div>

        <div className="relative">
          <div className="mb-6 min-h-[3.25rem]" aria-live="polite">
            {c && (
              <div key={c.title} className="motion-safe:animate-[fadeUp_.7s_cubic-bezier(.22,.61,.24,1)]">
                <p className="t-h3">{c.title}</p>
                <p className="t-meta mt-1">{c.note}</p>
              </div>
            )}
          </div>
          {/* ruler: the car's length in millimetres with the lamp riding along it */}
          <div className="relative h-10" aria-hidden="true">
            <div className="absolute inset-x-0 top-5 h-px bg-bone/20" />
            {Array.from({ length: 47 }, (_, i) => (
              <span key={i} className="absolute top-5 w-px bg-bone/25" style={{ left: `${(i / 46) * 100}%`, height: i % 5 === 0 ? 10 : 5 }} />
            ))}
            {ignitionCallouts.map((k, i) => (
              <span key={k.title} className="absolute top-[13px] h-[15px] w-px transition-colors duration-500" style={{ left: `${toRuler(k.x) * 100}%`, background: i === active ? 'var(--color-ion)' : 'var(--color-bronze)' }} />
            ))}
            <span ref={marker} className="absolute top-5 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-500">
              <span className="block h-3 w-3 rounded-full bg-ion shadow-[0_0_24px_6px_rgba(154,136,255,.55)]" />
            </span>
          </div>
          <div className="mt-1 flex justify-between t-meta">
            <span>NOSE 0</span>
            <span ref={readout} className="text-bone whitespace-pre" />
            <span>TAIL {dims.length.toLocaleString('en-GB')}</span>
          </div>
        </div>
      </div>
      <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }`}</style>
    </section>
  );
}
