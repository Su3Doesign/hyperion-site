import { useEffect, useRef } from 'react';

// Docked composer. Enter sends, Shift+Enter adds a line, Esc stops a reply in progress.
export default function Composer({ value, onChange, onSend, onStop, busy, disabled }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);
  useEffect(() => { if (!busy) ref.current?.focus({ preventScroll: true }); }, [busy]);

  const key = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (!busy) onSend(); }
    if (e.key === 'Escape' && busy) { e.preventDefault(); onStop(); }
  };
  const canSend = value.trim().length > 0 && !busy && !disabled;

  return (
    <form className="flex items-end gap-2 rounded-2xl border p-2 pl-4" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }} onSubmit={(e) => { e.preventDefault(); if (canSend) onSend(); }}>
      <label htmlFor="message" className="sr-only">Message</label>
      <textarea
        id="message"
        ref={ref}
        rows={1}
        value={value}
        maxLength={2000}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={key}
        placeholder="Ask about Hyperion, the work, or a commission"
        className="max-h-[200px] min-h-[40px] flex-1 resize-none bg-transparent py-2 outline-none placeholder:text-[var(--muted)]"
        style={{ color: 'var(--ink)' }}
      />
      {busy ? (
        <button type="button" onClick={onStop} className="h-10 shrink-0 rounded-xl border px-4 text-[14px] font-medium" style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}>
          Stop
        </button>
      ) : (
        <button type="submit" disabled={!canSend} className="h-10 shrink-0 rounded-xl px-4 text-[14px] font-medium transition-opacity disabled:opacity-35" style={{ background: 'var(--amber)', color: 'var(--on-amber)' }}>
          Send
        </button>
      )}
    </form>
  );
}
