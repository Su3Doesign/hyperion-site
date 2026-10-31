import { useState } from 'react';
import { studio } from '../content.js';
import Monogram from '../ui/Monogram.jsx';

export default function Contact({ stats }) {
  const [copied, setCopied] = useState(false);
  const links = studio.links.filter((l) => l.href);
  const copy = async () => {
    try { await navigator.clipboard.writeText(studio.email); setCopied(true); setTimeout(() => setCopied(false), 2200); }
    catch { const r = document.createRange(); r.selectNodeContents(document.getElementById('email-text')); getSelection().removeAllRanges(); getSelection().addRange(r); }
  };
  return (
    <section id="contact" aria-labelledby="contact-title" className="relative flex min-h-[130vh] flex-col justify-end gutter" style={{ paddingBottom: 'max(28px, env(safe-area-inset-bottom, 0px))' }}>
      <div className="scrim-b pointer-events-none absolute inset-x-0 bottom-0 h-[75%]" />
      <div className="relative grid grid-cols-12 gap-x-6 gap-y-10">
        <div className="col-span-12 lg:col-span-8">
          <p className="t-eyebrow">The garage</p>
          <h2 id="contact-title" className="mt-5 font-serif italic leading-[0.95] tracking-[-0.02em]" style={{ fontSize: 'clamp(3rem, 9vw, 8.5rem)' }}>Let’s build the next one.</h2>
          <p className="t-body mt-6">Commissions for product visualisation, environments and hard-surface work.</p>
        </div>
        <div className="col-span-12 flex flex-wrap items-center gap-3">
          {studio.email && (
            <div className="flex flex-wrap items-center gap-3">
              <span id="email-text" className="select-all font-display text-[clamp(1.1rem,2vw,1.5rem)]" style={{ fontStretch: '112%' }}>{studio.email}</span>
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
      <footer className="relative mt-20 grid grid-cols-12 gap-6 border-t border-bone/10 pt-6">
        <div className="col-span-12 flex items-center gap-3 md:col-span-4">
          <Monogram size={20} className="text-bronze" />
          <p className="t-meta">Hyperion GEN.2 · designed and modelled by {studio.name}</p>
        </div>
        <p className="t-meta col-span-12 md:col-span-8 md:text-right">
          Live car: three.js, {stats ? `${stats.meshes} meshes, ${(stats.tris / 1000).toFixed(0)}k triangles` : 'meshopt-compressed glTF'} · Stills: Blender Cycles · Type: Archivo, Instrument Serif, JetBrains Mono
        </p>
      </footer>
    </section>
  );
}
