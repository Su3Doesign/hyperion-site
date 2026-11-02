import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { live, target } from '../three/stage.js';

const TAU = Math.PI * 2;
const STEP = Math.PI / 12; // 15° per arrow key

// 360° turntable: drag / swipe / arrow keys turn the car under fixed lights, with inertia.
// touch-action: pan-y keeps vertical swipes scrolling the page on phones.
export default function Walkaround() {
  const pad = useRef(null);
  const deg = useRef(null);
  const needle = useRef(null);

  useEffect(() => {
    const el = pad.current;
    let lastX = 0, lastT = 0, vel = 0;
    const down = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      live.dragging = true;
      lastX = e.clientX; lastT = performance.now(); vel = 0;
      el.setPointerCapture?.(e.pointerId);
      el.dataset.dragging = 'true';
    };
    const move = (e) => {
      if (!live.dragging) return;
      const now = performance.now();
      const dx = e.clientX - lastX;
      const k = 0.0085 * (window.innerWidth < 700 ? 1.6 : 1);
      live.userYaw += dx * k;
      vel = (dx * k) / Math.max(0.008, (now - lastT) / 1000);
      lastX = e.clientX; lastT = now;
    };
    const up = () => {
      if (!live.dragging) return;
      live.dragging = false;
      live.userVel = Math.max(-6, Math.min(6, vel));
      el.dataset.dragging = 'false';
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);

    let raf = 0;
    const loop = () => {
      const a = (((target.yaw + live.userYaw) % TAU) + TAU) % TAU;
      const d = Math.round((a / TAU) * 360) % 360;
      if (deg.current) deg.current.textContent = String(d).padStart(3, '0');
      if (needle.current) needle.current.style.transform = `rotate(${d}deg)`;
      el.setAttribute('aria-valuenow', String(d));
      el.setAttribute('aria-valuetext', `${d} degrees`);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  }, []);

  const turn = (by) => {
    live.userVel = 0;
    gsap.to(live, { userYaw: live.userYaw + by, duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1.1, ease: 'sine.inOut' });
  };
  const reset = () => {
    live.userVel = 0;
    const nearest = Math.round(live.userYaw / TAU) * TAU;
    gsap.to(live, { userYaw: nearest, duration: 1.4, ease: 'sine.inOut' });
  };
  const key = (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); turn(-STEP); }
    if (e.key === 'ArrowRight') { e.preventDefault(); turn(STEP); }
    if (e.key === 'Home') { e.preventDefault(); reset(); }
  };

  return (
    <section id="walkaround" aria-labelledby="walk-title" className="relative h-[210vh]">
      <div className="sticky top-0 h-[100svh]">
        <div
          ref={pad}
          role="slider"
          tabIndex={0}
          aria-label="Rotate the car"
          aria-valuemin={0}
          aria-valuemax={359}
          onKeyDown={key}
          data-cursor="Drag"
          className="absolute inset-0 cursor-grab select-none data-[dragging=true]:cursor-grabbing"
          style={{ touchAction: 'pan-y' }}
        />
        <div className="pointer-events-none relative flex h-full flex-col justify-between gutter" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 96px)', paddingBottom: 'max(32px, env(safe-area-inset-bottom, 0px))' }}>
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 md:col-span-5">
              <p className="t-eyebrow">Walkaround · 360°</p>
              <h2 id="walk-title" className="t-h2 mt-5">Every angle, resolved.</h2>
              <p className="t-body mt-6">Drag, swipe or use the arrow keys. The car turns under fixed studio lights, so the reflections travel across the bodywork the way they would on a turntable.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <div className="flex items-center gap-5">
              {/* dial: compass ticks with a needle at the car's heading */}
              <svg width="76" height="76" viewBox="0 0 76 76" aria-hidden="true" className="text-bone">
                <circle cx="38" cy="38" r="34" fill="none" stroke="currentColor" strokeOpacity="0.18" />
                {Array.from({ length: 36 }, (_, i) => (
                  <line key={i} x1="38" y1={i % 9 === 0 ? 5 : 7} x2="38" y2="11" stroke="currentColor" strokeOpacity={i % 9 === 0 ? 0.7 : 0.25} transform={`rotate(${i * 10} 38 38)`} />
                ))}
                <g ref={needle} style={{ transformOrigin: '38px 38px' }}>
                  <line x1="38" y1="38" x2="38" y2="13" stroke="var(--color-ion)" strokeWidth="1.5" />
                  <circle cx="38" cy="38" r="2.5" fill="var(--color-ion)" />
                </g>
              </svg>
              <div>
                <p className="font-display font-light tabular-nums leading-none" style={{ fontSize: 'clamp(2.4rem, 5vw, 3.6rem)' }}>
                  <span ref={deg}>000</span><span className="text-bronze text-[0.45em] align-top">°</span>
                </p>
                <p className="t-meta mt-2 hidden sm:block">Heading · 0° faces the nose to camera left</p>
              </div>
            </div>
            <div className="pointer-events-auto flex gap-2">
              <button type="button" className="btn" onClick={() => turn(-Math.PI / 4)} aria-label="Turn left 45 degrees">←<span className="hidden sm:inline"> 45°</span></button>
              <button type="button" className="btn" onClick={() => turn(Math.PI / 4)} aria-label="Turn right 45 degrees"><span className="hidden sm:inline">45° </span>→</button>
              <button type="button" className="btn hidden sm:inline-flex" onClick={reset}>Reset</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
