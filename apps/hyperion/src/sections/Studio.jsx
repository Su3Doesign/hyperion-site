import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { studio } from '../content.js';
import car from '../cars/index.js';

gsap.registerPlugin(ScrollTrigger);

// The car faces the camera with its lamps on. Left: who made it. Right: what went into this car,
// set as a build sheet (Hyperion) or a timing tower (F1). Each value is lit as the beam crosses it.
export default function Studio() {
  const root = useRef(null);
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray('[data-beam]').forEach((el) => {
        gsap.fromTo(el, { '--beam': -0.25 }, { '--beam': 1.25, ease: 'none', scrollTrigger: { trigger: el, start: 'top 85%', end: 'top 35%', scrub: true } });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  const { facts } = car;
  const tower = facts.style === 'tower';
  return (
    <section id="studio" ref={root} aria-labelledby="studio-title" className="relative min-h-[150vh] gutter" style={{ paddingBlock: 'clamp(120px, 18vh, 200px)' }}>
      <div className="scrim-l pointer-events-none absolute inset-0" />
      <div className="relative grid grid-cols-12 gap-x-6 gap-y-14">
        <div className="col-span-12 md:col-span-5">
          <p className="t-eyebrow">The studio</p>
          <h2 id="studio-title" className="t-h2 mt-5">{studio.name}</h2>
          <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-1 t-meta">
            {studio.disciplines.map((d) => <li key={d}>{d}</li>)}
          </ul>
          <p className="t-body mt-8">{car.blurb}</p>
        </div>
        <div className="col-span-12 md:col-span-6 md:col-start-7">
          <p className="t-eyebrow">{facts.eyebrow}</p>
          <dl className="mt-6">
            {facts.items.map(([k, v, note], i) => (
              <div key={k} className="grid grid-cols-[auto_1fr] items-baseline gap-x-5 border-t border-bone/10 py-5 last:border-b">
                {tower ? (
                  // timing tower: position box and a sector bar, purple for the fastest, green after
                  <span className="flex items-center gap-3 self-center" aria-hidden="true">
                    <span className="grid h-8 w-8 place-items-center bg-bone text-ink font-wide text-[11px] font-bold">{i + 1}</span>
                    <span className="h-8 w-[3px]" style={{ background: i === 0 ? '#b67cff' : '#38e27a' }} />
                  </span>
                ) : (
                  <span className="t-meta self-center tabular-nums" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                )}
                <div className="min-w-0">
                  <dt className="t-eyebrow">{k}</dt>
                  <dd className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span data-beam className={`beam-text block leading-[1.02] ${tower ? 'font-wide font-bold uppercase tracking-[0.01em]' : 'font-display font-light tracking-[-0.03em]'}`} style={{ fontSize: tower ? 'clamp(1.35rem, 2.8vw, 2.4rem)' : 'clamp(1.9rem, 4.4vw, 3.9rem)' }}>{v}</span>
                    <span className="t-meta">{note}</span>
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
