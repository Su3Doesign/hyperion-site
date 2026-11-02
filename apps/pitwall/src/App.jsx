import { useEffect, useRef, useState } from 'react';
import Composer from './components/Composer.jsx';
import Turn from './components/Turn.jsx';
import { connect, explain } from './lib/transport.js';
import { SUGGESTIONS, STUDIO } from './lib/knowledge.js';

const DRAFT_KEY = 'pitwall:draft';
const readDraft = () => { try { return localStorage.getItem(DRAFT_KEY) || ''; } catch { return ''; } };
const saveDraft = (v) => { try { localStorage.setItem(DRAFT_KEY, v); } catch { /* storage blocked */ } };

export default function App() {
  const [transport, setTransport] = useState(null);
  const [turns, setTurns] = useState([]);
  const [draft, setDraft] = useState(readDraft);
  const [busy, setBusy] = useState(false);
  const ctl = useRef(null);
  const end = useRef(null);

  useEffect(() => { let live = true; connect().then((t) => live && setTransport(t)); return () => { live = false; }; }, []);
  useEffect(() => { saveDraft(draft); }, [draft]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }, [turns]);

  const send = async (text = draft) => {
    const q = text.trim();
    if (!q || busy || !transport) return;
    const history = [...turns.filter((t) => t.content), { role: 'user', content: q }];
    setTurns([...history, { role: 'assistant', content: '' }]);
    setDraft('');
    setBusy(true);
    ctl.current = new AbortController();
    const patch = (fields) => setTurns((ts) => { const n = ts.slice(); n[n.length - 1] = { ...n[n.length - 1], ...fields }; return n; });
    try {
      const reply = await transport.send(history.map(({ role, content }) => ({ role, content })), {
        signal: ctl.current.signal,
        onText: (t) => patch({ content: t }),
      });
      patch({ content: reply });
    } catch (e) {
      patch({ content: e?.text || '', note: explain(e?.code) || (e?.text ? 'Stopped.' : '') });
      if (e?.code === 'cancelled' && !e?.text) setTurns((ts) => ts.slice(0, -1));
    } finally {
      setBusy(false);
    }
  };
  const stop = () => ctl.current?.abort();
  const reset = () => { stop(); setTurns([]); };

  const live = transport?.kind === 'claude';
  return (
    <div className="flex h-full flex-col">
      <header className="gutter" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 14px)' }}>
        <div className="mx-auto flex max-w-[42rem] items-center justify-between gap-4 pb-3" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="flex items-center gap-3">
            <span className="dot" data-live={live} aria-hidden="true" />
            <h1 className="text-[15px] font-semibold tracking-[-0.01em]">Pit Wall</h1>
            <span className="mono" style={{ color: 'var(--muted)' }} aria-live="polite">{transport ? transport.label : 'Connecting…'}</span>
          </div>
          {turns.length > 0 && (
            <button type="button" onClick={reset} className="mono rounded px-2 py-1" style={{ color: 'var(--muted)' }}>New chat</button>
          )}
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto gutter" aria-live="polite" aria-busy={busy}>
        <div className="mx-auto flex max-w-[42rem] flex-col gap-8 py-8">
          {turns.length === 0 ? (
            <section aria-labelledby="intro" className="pt-[6vh]">
              <p className="label">The studio’s radio channel</p>
              <h2 id="intro" className="mt-3 text-[clamp(1.6rem,4vw,2.2rem)] font-medium leading-[1.15] tracking-[-0.02em]">Ask {STUDIO.name}’s studio about Hyperion, the work, or a commission.</h2>
              <p className="mt-4 max-w-[34rem]" style={{ color: 'var(--muted)' }}>Answers come from Claude, using only what the studio has published. Anything it does not know, it will say so.</p>
              <ul className="mt-8 flex flex-wrap gap-2" aria-label="Suggested questions">
                {SUGGESTIONS.map((s) => (
                  <li key={s}>
                    <button type="button" onClick={() => send(s)} disabled={!transport} className="rounded-full border px-3.5 py-2 text-[14px] transition-colors hover:border-[var(--amber)] disabled:opacity-40" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>{s}</button>
                  </li>
                ))}
              </ul>
              {transport?.kind === 'demo' && (
                <p className="mono mt-6" style={{ color: 'var(--muted)' }}>Demo mode: this copy is not connected to Claude and answers the four suggestions only.</p>
              )}
            </section>
          ) : (
            turns.map((t, i) => <Turn key={i} turn={t} streaming={busy && i === turns.length - 1} />)
          )}
          <div ref={end} />
        </div>
      </main>

      <footer className="gutter" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)' }}>
        <div className="mx-auto max-w-[42rem]">
          <Composer value={draft} onChange={setDraft} onSend={() => send()} onStop={stop} busy={busy} disabled={!transport} />
          <p className="mono mt-2 text-center" style={{ color: 'var(--muted)' }}>Enter to send · Shift+Enter for a new line · Esc to stop</p>
        </div>
      </footer>
    </div>
  );
}
