import { useEffect, useState } from 'react';
import Monogram from './Monogram.jsx';

const fmt = (b) => (b / 1e6).toFixed(1);

// Covers the page only until the live car is ready. The hero still is already showing behind it.
export default function Loader({ loaded, total, ready, failed }) {
  const [gone, setGone] = useState(false);
  const pct = total ? Math.min(100, Math.round((loaded / total) * 100)) : null;
  useEffect(() => {
    if (ready || failed) { const t = setTimeout(() => setGone(true), 1400); return () => clearTimeout(t); }
  }, [ready, failed]);
  if (gone) return null;
  const done = ready || failed;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end gutter transition-opacity duration-[1200ms]"
      style={{ opacity: done ? 0 : 1, pointerEvents: done ? 'none' : 'auto', background: 'linear-gradient(0deg, rgb(11 10 9 / 0.92), rgb(11 10 9 / 0.55))', paddingBottom: 'max(32px, env(safe-area-inset-bottom, 0px))' }}
      role="status"
      aria-live="polite"
    >
      <div className="w-full grid grid-cols-12 gap-6 items-end">
        <div className="col-span-12 md:col-span-6 flex items-center gap-4">
          <Monogram size={34} className="text-bone" />
          <div>
            <p className="t-eyebrow">Ignition</p>
            <p className="t-meta mt-1">{failed ? 'Live 3D unavailable, showing renders' : ready ? 'Ready' : 'Loading the car'}</p>
          </div>
        </div>
        <div className="col-span-12 md:col-span-6 md:text-right">
          <p className="font-display font-extralight leading-none tabular-nums text-bone" style={{ fontStretch: '125%', fontSize: 'clamp(3.5rem, 9vw, 8rem)', letterSpacing: '-0.04em' }}>
            {pct === null ? '··' : String(pct).padStart(2, '0')}<span className="text-bronze text-[0.35em] align-top ml-2">%</span>
          </p>
          <p className="t-meta mt-2">{total ? `${fmt(loaded)} / ${fmt(total)} MB · meshopt + WebP` : 'Streaming geometry'}</p>
        </div>
        <div className="col-span-12 h-px bg-bone/10 overflow-hidden">
          <div className="h-px bg-bronze origin-left transition-transform duration-300" style={{ transform: `scaleX(${(pct ?? 8) / 100})` }} />
        </div>
      </div>
    </div>
  );
}
