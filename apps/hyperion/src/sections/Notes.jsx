import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { notes } from '../content.js';
import { useStage } from '../lib/stageContext.js';
import Still from '../ui/Still.jsx';

gsap.registerPlugin(ScrollTrigger);

const FALLBACK = { light: 'light', doors: 'rear_open', clam: 'engine', wheels: 'wheel' };

// The car holds still on the fixed stage while the copy scrolls past it. A GSAP pin keeps the
// spec readout locked beside it; each note moves the camera to its detail (see director.js).
export default function Notes() {
  const { webgl } = useStage();
  const root = useRef(null);
  const hud = useRef(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({ trigger: root.current, start: 'top top', end: 'bottom bottom', pin: hud.current, pinSpacing: false });
      gsap.utils.toArray('[data-note]').forEach((el, i) => {
        ScrollTrigger.create({ trigger: el, start: 'top 55%', end: 'bottom 55%', onToggle: (s) => s.isActive && setActive(i) });
        gsap.fromTo(el.querySelectorAll('[data-reveal]'), { y: 28, opacity: 0.001 }, {
          y: 0, opacity: 1, duration: 1.2, ease: 'power2.out', stagger: 0.08,
          scrollTrigger: { trigger: el, start: 'top 80%', toggleActions: 'play none none reverse' },
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  const n = notes[active];
  return (
    <section id="notes" ref={root} aria-labelledby="notes-title" className="relative">
      <div ref={hud} className="pointer-events-none absolute top-0 hidden h-[100svh] w-[19rem] items-center md:flex" style={{ right: 'calc(var(--gutter-r) + 2vw)' }} aria-hidden="true">
        <div className="w-full">
          <div className="w-full rounded-sm border border-bone/12 bg-ink/55 p-5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <p className="t-eyebrow">Spec · {n.title}</p>
              <p className="t-meta">{active + 1}/{notes.length}</p>
            </div>
            <div className="mt-3 flex gap-1">
              {notes.map((x, i) => (
                <span key={x.id} className="h-[2px] flex-1 transition-colors duration-700" style={{ background: i === active ? 'var(--color-ion)' : 'rgb(236 229 216 / .14)' }} />
              ))}
            </div>
            <dl className="spec mt-4">
              {n.spec.map(([k, v]) => (
                <div key={k} className="contents"><dt>{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      <h2 id="notes-title" className="sr-only">Design notes</h2>
      {notes.map((x) => (
        <article key={x.id} data-note className="relative flex min-h-[105svh] items-start pt-[104px] md:items-center md:pt-0 gutter">
          <div className="scrim-l pointer-events-none absolute inset-0 hidden md:block" />
          <div className="relative w-full max-w-[30rem] md:ml-[3vw]">
            <p className="t-eyebrow" data-reveal>Design note</p>
            <h3 className="t-h2 mt-4" data-reveal>{x.title}</h3>
            <p className="t-body mt-6" data-reveal>{x.body}</p>
            <dl className="spec mt-6 max-w-[17rem] md:hidden" data-reveal>
              {x.spec.map(([k, v]) => (<div key={k} className="contents"><dt>{k}</dt><dd>{v}</dd></div>))}
            </dl>
            {!webgl && <Still name={FALLBACK[x.id]} alt={x.title} className="mt-8 w-full rounded-sm" sizes="(min-width: 768px) 30rem, 100vw" />}
          </div>
        </article>
      ))}
    </section>
  );
}
