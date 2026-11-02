import { useEffect, useRef } from 'react';

// Ring that trails the pointer and names what a region does ("Drag", "Open").
export default function Cursor() {
  const el = useRef(null);
  const lbl = useRef(null);
  useEffect(() => {
    if (matchMedia('(pointer: coarse)').matches) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let x = -100, y = -100, tx = -100, ty = -100, raf = 0;
    const move = (e) => {
      tx = e.clientX; ty = e.clientY;
      const hit = e.target.closest?.('[data-cursor], a, button');
      const name = hit?.getAttribute('data-cursor') || '';
      el.current.style.setProperty('--s', hit ? (name ? '1.9' : '1.45') : '1');
      if (lbl.current.textContent !== name) lbl.current.textContent = name;
    };
    const leave = () => { tx = ty = -100; };
    const loop = () => {
      const k = reduced ? 1 : 0.18;
      x += (tx - x) * k; y += (ty - y) * k;
      el.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', leave);
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', move); document.removeEventListener('pointerleave', leave); };
  }, []);
  return (
    <div ref={el} className="cursor" aria-hidden="true">
      <div className="ring" />
      <span ref={lbl} className="lbl" />
    </div>
  );
}
