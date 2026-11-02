import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createStage } from './three/stage.js';
import { buildDirector } from './lib/director.js';
import { startScroll, prefersReducedMotion } from './lib/scroll.js';
import { StageContext } from './lib/stageContext.js';
import Nav from './ui/Nav.jsx';
import Cursor from './ui/Cursor.jsx';
import Loader from './ui/Loader.jsx';
import Hero from './sections/Hero.jsx';
import Ignition from './sections/Ignition.jsx';
import Walkaround from './sections/Walkaround.jsx';
import Notes from './sections/Notes.jsx';
import Anatomy from './sections/Anatomy.jsx';
import Renders from './sections/Renders.jsx';
import Studio from './sections/Studio.jsx';
import Contact from './sections/Contact.jsx';

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch { return false; }
}

export default function App() {
  const canvas = useRef(null);
  const [stage, setStage] = useState(null);
  const [model, setModel] = useState(null);
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });
  const [failed, setFailed] = useState(false);
  const reduced = useMemo(prefersReducedMotion, []);
  const mobile = useMemo(() => matchMedia('(max-width: 820px), (pointer: coarse)').matches, []);

  useEffect(() => {
    const qa = location.search.includes('qa');
    const lenis = startScroll();
    window.__hy = { lenis, ready: false };
    const stopDirector = buildDirector({ reducedMotion: reduced, instant: qa });
    if (!webglAvailable()) { setFailed(true); return stopDirector; }
    let st;
    try {
      let lastSet = 0;
      st = createStage(canvas.current, {
        mobile,
        reducedMotion: reduced,
        instant: qa,
        manual: qa,
        onProgress: (loaded, total) => {
          const now = performance.now();
          if (now - lastSet > 80 || loaded === total) { lastSet = now; setProgress({ loaded, total }); }
        },
      });
    } catch (e) {
      console.error(e);
      setFailed(true);
      return stopDirector;
    }
    setStage(st);
    window.__hy.pause = (v) => st.pause(v);
    window.__hy.renderNow = (n) => st.renderNow(n);
    st.ready.then((m) => {
      setModel(m);
      Object.assign(window.__hy, { ready: true, stats: m.stats });
      // fonts and the model can both shift layout; re-measure every trigger once they land
      document.fonts?.ready.then(() => ScrollTrigger.refresh());
      requestAnimationFrame(() => ScrollTrigger.refresh());
    }).catch((e) => { console.error(e); setFailed(true); });
    return () => { stopDirector(); st.dispose(); };
  }, [mobile, reduced]);

  const ctx = useMemo(() => ({ stage, model, webgl: !failed, reduced, mobile }), [stage, model, failed, reduced, mobile]);

  return (
    <StageContext.Provider value={ctx}>
      <a href="#main" className="skip btn">Skip to content</a>
      <canvas ref={canvas} className="fixed inset-0 z-0 h-[100lvh] w-full" aria-hidden="true" style={{ opacity: failed ? 0 : 1 }} />
      <Loader loaded={progress.loaded} total={progress.total} ready={!!model} failed={failed} />
      <Nav />
      <Cursor />
      <main id="main" className="relative z-[1]">
        <Hero ready={!!model} />
        <Ignition />
        <Walkaround />
        <Notes />
        <Anatomy />
        <Renders />
        <Studio />
        <Contact stats={model?.stats} mobile={mobile} />
      </main>
    </StageContext.Provider>
  );
}
