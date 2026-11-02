// Reusable dossier parts: numbered figures on dark plates, margin notes, stat rows, a section frame
// with a margin column, and a left-to-right pipeline diagram.
import { Children } from 'react';

let fig = 0;
export const resetFigures = () => { fig = 0; };

export function Plate({ src, alt, caption, wide = false, ratio, sizes = '100vw' }) {
  const n = ++fig;
  return (
    <figure className={wide ? 'col-span-12' : 'col-span-12 lg:col-span-8 lg:col-start-3'}>
      <div className="plate" style={ratio ? { aspectRatio: ratio } : undefined}>
        <img src={src} alt={alt} loading="lazy" decoding="async" sizes={sizes} style={ratio ? { height: '100%', objectFit: 'cover' } : undefined} />
      </div>
      <figcaption className="mt-3 flex gap-3 mono" style={{ color: 'var(--pencil)' }}>
        <span className="red shrink-0">Fig. {n}</span>
        <span>{caption}</span>
      </figcaption>
    </figure>
  );
}

export function PlateRow({ items }) {
  return (
    <div className="col-span-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
      {items.map((it) => {
        const n = ++fig;
        return (
          <figure key={it.src} className="min-w-0">
            <div className="plate"><img src={it.src} alt={it.alt} loading="lazy" decoding="async" /></div>
            <figcaption className="mt-3 flex gap-3 mono" style={{ color: 'var(--pencil)' }}>
              <span className="red shrink-0">Fig. {n}</span><span>{it.caption}</span>
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}

export function Section({ id, kicker, title, children, notes }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="gutter" style={{ paddingBlock: 'clamp(56px, 9vw, 120px)' }}>
      <div className="mx-auto grid max-w-[1240px] grid-cols-12 gap-x-6 gap-y-10">
        <header className="col-span-12 rule pt-5 lg:col-span-3">
          <p className="label">{kicker}</p>
        </header>
        <div className="col-span-12 min-w-0 lg:col-span-6">
          <h2 id={`${id}-h`} className="text-[clamp(1.9rem,3.6vw,2.9rem)] leading-[1.08] tracking-[-0.01em]">{title}</h2>
          <div className="prose measure mt-6">{children}</div>
        </div>
        {notes && (
          <aside className="col-span-12 flex flex-col gap-6 lg:col-span-3 lg:pt-16" aria-label="Annotations">
            {Children.toArray(notes)}
          </aside>
        )}
      </div>
    </section>
  );
}

export function Note({ k, children }) {
  return <p className="note"><b>{k}</b><br />{children}</p>;
}

export function Stats({ items }) {
  return (
    <dl className="col-span-12 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
      {items.map(([k, v, unit]) => (
        <div key={k} className="rule pt-4">
          <dt className="label">{k}</dt>
          <dd className="mt-2 text-[clamp(2rem,4vw,3.2rem)] leading-none tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>
            {v}<span className="mono red ml-1 align-top text-[13px]">{unit}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Flow({ steps }) {
  return (
    <div className="col-span-12 overflow-x-auto">
      <ol className="flex min-w-[860px] items-stretch gap-0" aria-label="Asset pipeline">
        {steps.map(([tool, title, detail], i) => (
          <li key={title} className="relative flex-1 rule pr-5 pt-4">
            <p className="label">{String(i + 1).padStart(2, '0')} · {tool}</p>
            <p className="mt-2 text-[1.15rem] leading-tight" style={{ fontFamily: 'var(--font-display)' }}>{title}</p>
            <p className="mono mt-2" style={{ color: 'var(--pencil)' }}>{detail}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
