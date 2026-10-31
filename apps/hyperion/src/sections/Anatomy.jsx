import { useEffect, useMemo, useRef, useState } from 'react';
import { useStage } from '../lib/stageContext.js';
import { target, live } from '../three/stage.js';
import Still from '../ui/Still.jsx';
import car from '../cars/index.js';

const { asm: ASM, pt: PT } = car.anatomy;

// Which labels to show. Mirrored pairs (doors, wheels) get one label so the view stays readable.

const fmt = (n) => n.toLocaleString('en-GB');

export default function Anatomy() {
  const { stage, model, mobile, webgl } = useStage();
  const layer = useRef(null);
  const [hover, setHover] = useState(null);

  const items = useMemo(() => {
    if (!model) return [];
    const a = (mobile ? ASM.mobile : ASM.desktop).filter((k) => model.asm[k]).map((k) => ({ key: k, node: model.asm[k], kind: 'asm' }));
    const p = (mobile ? PT.mobile : PT.desktop).filter((k) => model.parts[k]).map((k) => ({ key: 'PT_' + k, node: model.parts[k], kind: 'pt' }));
    return [...a, ...p];
  }, [model, mobile]);

  useEffect(() => {
    if (!stage || !items.length) return;
    const els = [...layer.current.querySelectorAll('[data-label]')];
    const cx = () => window.innerWidth / 2;
    return stage.onFrame(() => {
      const ex = target.explode;
      const pt = target.ptExplode;
      // assembly labels fade in as the car opens, then hand over to powertrain labels
      const asmA = Math.max(0, Math.min(1, (ex - 0.55) / 0.3)) * (1 - Math.max(0, Math.min(1, (pt - 0.15) / 0.35)));
      const ptA = Math.max(0, Math.min(1, (pt - 0.45) / 0.4));
      els.forEach((el, i) => {
        const it = items[i];
        if (!it) return;
        const a = it.kind === 'asm' ? asmA : ptA;
        if (a < 0.01) { el.style.opacity = '0'; el.style.visibility = 'hidden'; return; }
        const s = stage.project(it.node);
        el.style.visibility = s.z < 1 ? 'visible' : 'hidden';
        el.style.opacity = a.toFixed(3);
        el.style.setProperty('--x', `${s.x.toFixed(1)}px`);
        el.style.setProperty('--y', `${s.y.toFixed(1)}px`);
        // put the card on whichever side has room, so nothing runs off a phone screen
        const room = window.innerWidth - s.x;
        el.dataset.side = room < 170 ? 'left' : s.x < 170 ? 'right' : s.x < cx() ? 'left' : 'right';
      });
    });
  }, [stage, items]);

  const enter = (k) => { live.highlight = k; setHover(k); };
  const leave = () => { live.highlight = null; setHover(null); };

  return (
    <section id="anatomy" aria-labelledby="anatomy-title" className="relative h-[420vh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div ref={layer} className="pointer-events-none absolute inset-0 z-10" role="list" aria-label="Labelled assemblies">
          {items.map((it) => {
            const d = it.node.userData;
            return (
              <div
                key={it.key}
                role="listitem"
                data-label
                data-active={hover === it.key}
                className="label3d group"
                tabIndex={0}
                onPointerEnter={() => enter(it.key)}
                onPointerLeave={leave}
                onFocus={() => enter(it.key)}
                onBlur={leave}
                style={{ opacity: 0 }}
              >
                <div className="dot" />
                <div className="card left-3 top-[-9px] group-data-[side=left]:left-auto group-data-[side=left]:right-3 group-data-[side=left]:text-right">
                  <p className="name font-display text-[13px] leading-tight text-bone transition-colors" style={{ fontStretch: '112%' }}>{d.label}</p>
                  <p className="note t-meta mt-0.5 text-[11px]">{d.note}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="relative flex h-full flex-col justify-between gutter" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 96px)', paddingBottom: 'max(32px, env(safe-area-inset-bottom, 0px))' }}>
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 md:col-span-6 lg:col-span-4">
              <p className="t-eyebrow">Anatomy</p>
              <h2 id="anatomy-title" className="t-h2 mt-5">{car.anatomy.title}</h2>
              <p className="t-body mt-6">{car.anatomy.body}</p>
            </div>
          </div>
          <dl className="grid max-w-xl grid-cols-3 gap-6">
            {[
              ['Assemblies', model ? fmt(model.stats.assemblies) : '—'],
              ['Meshes', model ? fmt(model.stats.meshes) : '—'],
              ['Triangles', model ? `${(model.stats.tris / 1000).toFixed(0)}k` : '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="t-meta uppercase tracking-[0.14em]">{k}</dt>
                <dd className="mt-1 font-display font-extralight tabular-nums leading-none" style={{ fontStretch: '125%', fontSize: 'clamp(1.8rem, 3.6vw, 3rem)' }}>{v}</dd>
              </div>
            ))}
          </dl>
          {!webgl && <Still name="exploded" alt="Exploded view of Hyperion with every assembly separated" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-80" />}
        </div>
      </div>
      <div className="sr-only">
        <h3>{car.anatomy.srTitle}</h3>
        <p>{car.anatomy.srBody}</p>
      </div>
    </section>
  );
}
