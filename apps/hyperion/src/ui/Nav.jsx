import { useEffect, useRef } from 'react';
import Monogram from './Monogram.jsx';
import { scrollToId } from '../lib/scroll.js';
import car from '../cars/index.js';

const LINKS = [
  ['anatomy', 'Anatomy'],
  ['renders', 'Renders'],
  ['contact', 'Contact'],
];

export default function Nav() {
  const bar = useRef(null);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      if (bar.current) bar.current.style.transform = `scaleX(${p.toFixed(4)})`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const go = (id) => (e) => { e.preventDefault(); scrollToId(id); };

  return (
    <header className="fixed inset-x-0 top-0 z-40 gutter" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 18px)' }}>
      <div className="absolute inset-x-0 top-0 h-px bg-bone/10" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
        <div ref={bar} className="h-px origin-left bg-bronze" style={{ transform: 'scaleX(0)' }} />
      </div>
      <nav aria-label="Primary" className="flex items-center justify-between gap-6">
        <a href="#hero" onClick={go('hero')} className="flex items-center gap-3 text-bone" data-cursor="Top">
          {car.nav.mark && <Monogram size={26} />}
          <span className="font-wide font-bold text-[11px] tracking-[0.2em] uppercase">{car.nav.name}</span>
          <span className="t-meta hidden sm:inline">{car.nav.tag}</span>
        </a>
        <ul className="flex items-center gap-6">
          {LINKS.map(([id, label]) => (
            <li key={id} className={id === 'contact' ? '' : 'hidden md:block'}>
              <a href={`#${id}`} onClick={go(id)} className="t-meta uppercase tracking-[0.16em] text-bone/80 transition-colors duration-500 hover:text-bone">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
