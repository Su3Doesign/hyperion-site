import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { studio } from '../content.js';
import Monogram from '../ui/Monogram.jsx';
import car from '../cars/index.js';

gsap.registerPlugin(ScrollTrigger);

// Last scene: the studio floor opens into a meadow under the car (see three/meadow.js), then the
// invitation rises over it.
export default function Contact({ stats, mobile }) {
  const root = useRef(null);
  const copyRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const links = studio.links.filter((l) => l.href);

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
      <div className="sticky top-0 flex h-[100svh] flex-col justify-between gutter" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 96px)', paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))' }}>
        <div className="flex items-start justify-between gap-6">
          <p className="t-eyebrow">Out of the studio</p>
          <p className="t-meta hidden text-right sm:block">Portal open · {(mobile ? 24000 : 72000).toLocaleString('en-GB')} blades of grass, all moving</p>
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
          </div>
          <footer className="relative mt-12 grid grid-cols-12 gap-4 border-t border-bone/10 pt-5">
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
