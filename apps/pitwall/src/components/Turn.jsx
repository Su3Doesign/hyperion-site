import { useState } from 'react';
import { Markdown } from '../lib/markdown.jsx';

// One line of the transcript. The visitor's words sit indented under a small label; the studio's
// answer runs full width with a copy control. No bubbles.
export default function Turn({ turn, streaming }) {
  const [copied, setCopied] = useState(false);
  if (turn.role === 'user') {
    return (
      <div className="pl-[12%]">
        <p className="label mb-1 text-right">You</p>
        <p className="whitespace-pre-wrap text-right" style={{ color: 'var(--ink)' }}>{turn.content}</p>
      </div>
    );
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(turn.content); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard refused; text stays selectable */ }
  };
  return (
    <div>
      <p className="label mb-1">Pit Wall</p>
      {turn.content ? (
        <div className={`answer ${streaming ? 'caret' : ''}`}><Markdown text={turn.content} /></div>
      ) : (
        <p className="mono" style={{ color: 'var(--muted)' }} aria-live="polite">Thinking…</p>
      )}
      {turn.note && <p className="mono mt-2" style={{ color: 'var(--muted)' }}>{turn.note}</p>}
      {!streaming && turn.content && (
        <button type="button" onClick={copy} className="mono mt-2 rounded px-1 -ml-1" style={{ color: 'var(--muted)' }}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      )}
    </div>
  );
}
