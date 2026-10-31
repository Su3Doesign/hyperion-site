import car from '../cars/index.js';
import { useStage } from '../lib/stageContext.js';
import Still from '../ui/Still.jsx';

const mm = (v) => v.toLocaleString('en-GB');

export default function Hero({ ready }) {
  const { webgl } = useStage();
  return (
    <section id="hero" aria-labelledby="hero-title" className="relative h-[170vh]">
      {/* the Cycles still holds the frame until the live car takes over */}
      <div className="pointer-events-none fixed inset-0 z-[-1] transition-opacity duration-[1600ms]" style={{ opacity: webgl && ready ? 0 : 1 }} aria-hidden="true">
        <picture>
          <source media="(max-width: 820px)" srcSet={`${car.renders}hero_tall-800.webp 800w, ${car.renders}hero_tall-1600.webp 1080w`} sizes="100vw" />
          <Still name="hero" alt="" loading="eager" className="h-full w-full object-cover" />
        </picture>
      </div>

      <div className="sticky top-0 flex h-[100svh] flex-col justify-end gutter" style={{ paddingBottom: 'max(28px, env(safe-area-inset-bottom, 0px))' }}>
        <div className="scrim-b pointer-events-none absolute inset-x-0 bottom-0 h-[62%]" />
        <div className="relative grid grid-cols-12 items-end gap-x-6 gap-y-8">
          <div className="col-span-12 md:col-span-7 lg:col-span-6">
            <p className="t-eyebrow">{car.hero.eyebrow}</p>
            <h1 id="hero-title" className="sr-only">{car.hero.h1}</h1>
            <p className="t-lede mt-5 max-w-[19ch] text-bone">{car.hero.lede}</p>
            <p className="t-body mt-5">{car.hero.body}</p>
          </div>
          <dl className="spec col-span-12 sm:col-span-6 md:col-span-4 md:col-start-9 lg:col-span-3 lg:col-start-10">
            <dt>Length</dt><dd>{mm(car.dims.length)} mm</dd>
            <dt>Width</dt><dd>{mm(car.dims.width)} mm</dd>
            <dt>Height</dt><dd>{mm(car.dims.height)} mm</dd>
            <dt>Engine</dt><dd>{car.hero.engine}</dd>
          </dl>
        </div>
        <div className="relative mt-10 flex items-center gap-4" aria-hidden="true">
          <span className="t-meta uppercase tracking-[0.2em]">Scroll</span>
          <span className="relative h-px w-24 overflow-hidden bg-bone/15">
            <span className="absolute inset-y-0 left-0 w-8 bg-bronze motion-safe:animate-[cue_2.8s_cubic-bezier(.22,.61,.24,1)_infinite]" />
          </span>
        </div>
      </div>
      <style>{`@keyframes cue { from { transform: translateX(-100%) } to { transform: translateX(300%) } }`}</style>
    </section>
  );
}
