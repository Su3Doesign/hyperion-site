import { useCallback, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { renders } from '../content.js';
import Still from '../ui/Still.jsx';

gsap.registerPlugin(ScrollTrigger);

const COPIES = 3; // the rail holds three copies and quietly re-centres, so it never runs out

export default function Renders() {
  const root = useRef(null);
  const frame = useRef(null);
  const caption = useRef(null);
  const rail = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      // image expansion: a framed print grows into a full-bleed frame as you scroll
      gsap.fromTo(frame.current,
        { clipPath: 'inset(22% 24% 22% 24% round 6px)', scale: 1.06 },
        { clipPath: 'inset(0% 0% 0% 0% round 0px)', scale: 1, ease: 'none', scrollTrigger: { trigger: '#renders-expand', start: 'top top', end: 'bottom bottom', scrub: reduced ? true : 0.8 } });
      gsap.fromTo(caption.current, { opacity: 0.001, y: 16 }, { opacity: 1, y: 0, scrollTrigger: { trigger: '#renders-expand', start: '55% center', toggleActions: 'play none none reverse' } });
    }, root);
    return () => ctx.revert();
  }, []);

  // keep the rail inside its middle copy
  const recentre = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    const set = el.scrollWidth / COPIES;
    if (el.scrollLeft < set * 0.5) el.scrollLeft += set;
    else if (el.scrollLeft > set * 1.5) el.scrollLeft -= set;
  }, []);

  useEffect(() => {
    const el = rail.current;
    const start = () => { el.scrollLeft = el.scrollWidth / COPIES; };
    start();
    const imgs = el.querySelectorAll('img');
    imgs.forEach((i) => i.addEventListener('load', start, { once: true }));
    let t = 0;
    const onScroll = () => { clearTimeout(t); t = setTimeout(recentre, 140); };
    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('scrollend', recentre);
    return () => { el.removeEventListener('scroll', onScroll); el.removeEventListener('scrollend', recentre); };
  }, [recentre]);

  const step = (dir) => {
    const el = rail.current;
    const item = el.querySelector('figure');
    const w = item ? item.getBoundingClientRect().width + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * w, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  const onKey = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  };

  const all = Array.from({ length: COPIES }, (_, c) => renders.map((r, i) => ({ ...r, k: `${c}-${i}`, clone: c !== 1 }))).flat();

  return (
    <section id="renders" ref={root} aria-labelledby="renders-title" className="relative bg-ink">
      <div id="renders-expand" className="relative h-[230vh]">
        <div className="sticky top-0 flex h-[100svh] items-center justify-center overflow-hidden">
          <div className="absolute inset-x-0 top-0 gutter" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 96px)' }}>
            <p className="t-eyebrow">Cycles · path-traced</p>
            <h2 id="renders-title" className="t-h2 mt-5 max-w-[14ch]">Twelve frames, rendered offline.</h2>
          </div>
          <div ref={frame} className="absolute inset-0 will-change-[clip-path,transform]">
            <Still name="side" alt="Hyperion in side profile on a black infinity cove" className="h-full w-full object-cover" sizes="100vw" />
          </div>
          <p ref={caption} className="t-meta absolute bottom-0 left-0 gutter" style={{ paddingBottom: 'max(28px, env(safe-area-inset-bottom, 0px))' }}>
            Side profile · 70 mm · 2400 × 1000 · Blender Cycles, AgX, 64 samples + denoise
          </p>
        </div>
      </div>

      <div className="relative" style={{ paddingBlock: 'clamp(72px, 12vw, 160px)' }}>
        <div className="gutter grid grid-cols-12 items-end gap-6">
          <div className="col-span-12 md:col-span-7">
            <p className="t-eyebrow">Studio frames</p>
            <p className="t-lede mt-4 max-w-[22ch]">The same model, materials and rig as the live car, lit like a press shoot.</p>
          </div>
          <div className="col-span-12 flex gap-2 md:col-span-5 md:justify-end">
            <button type="button" className="btn" onClick={() => step(-1)} aria-label="Previous render">←</button>
            <button type="button" className="btn" onClick={() => step(1)} aria-label="Next render">→</button>
          </div>
        </div>
        <div
          ref={rail}
          className="rail mt-10 flex gap-4 overflow-x-auto"
          tabIndex={0}
          onKeyDown={onKey}
          role="region"
          aria-roledescription="carousel"
          aria-label="Cycles renders. Use the arrow keys to browse."
          data-cursor="Drag"
          style={{ paddingInline: 'max(16px, env(safe-area-inset-left, 0px))' }}
        >
          {all.map((r) => (
            <figure key={r.k} className="group relative shrink-0 w-[84vw] sm:w-[64vw] lg:w-[46vw] max-w-[980px]" aria-hidden={r.clone || undefined}>
              <div className="overflow-hidden rounded-[3px] bg-ink-2">
                <Still name={r.file} alt={r.clone ? '' : r.title} className="aspect-[4/3] w-full object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(.22,.61,.24,1)] group-hover:scale-[1.035]" sizes="(min-width: 1024px) 46vw, 84vw" />
              </div>
              <figcaption className="mt-3 flex items-baseline justify-between gap-4">
                <span className="font-display text-[15px]" style={{ fontStretch: '112%' }}>{r.title}</span>
                <span className="t-meta">{r.meta}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
