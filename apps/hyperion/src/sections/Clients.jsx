import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { studio } from '../content.js';
import car from '../cars/index.js';

gsap.registerPlugin(ScrollTrigger);

// The car faces the camera with its lamps on; each client name is lit as the beam crosses it.
export default function Clients() {
  const root = useRef(null);
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray('[data-beam]').forEach((el) => {
        gsap.fromTo(el, { '--beam': -0.25 }, { '--beam': 1.25, ease: 'none', scrollTrigger: { trigger: el, start: 'top 85%', end: 'top 35%', scrub: true } });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section id="clients" ref={root} aria-labelledby="clients-title" className="relative min-h-[150vh] gutter" style={{ paddingBlock: 'clamp(120px, 18vh, 200px)' }}>
      <div className="scrim-l pointer-events-none absolute inset-0" />
      <div className="relative grid grid-cols-12 gap-x-6 gap-y-14">
        <div className="col-span-12 md:col-span-5">
          <p className="t-eyebrow">The studio</p>
          <h2 id="clients-title" className="t-h2 mt-5">{studio.name}</h2>
          <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-1 t-meta">
            {studio.disciplines.map((d) => <li key={d}>{d}</li>)}
          </ul>
          <p className="t-body mt-8">{car.blurb}</p>
        </div>
        <div className="col-span-12 md:col-span-6 md:col-start-7">
          <p className="t-eyebrow">Selected clients</p>
          <ul className="mt-6">
            {studio.clients.map((c) => (
              <li key={c} className="border-t border-bone/10 py-5 last:border-b">
                <span data-beam className="beam-text block font-display font-light leading-[1.02] tracking-[-0.03em]" style={{ fontSize: 'clamp(1.9rem, 4.4vw, 3.9rem)' }}>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
