// Three ways to reach Claude, tried in order:
//   1. inside a Claude artifact viewer: the page's `sample` capability (the viewer's own account)
//   2. self-hosted: POST /api/chat on server.mjs, streamed back as server-sent events
//   3. neither: a clearly labelled demo that answers the suggested questions only
import { RULES, SUGGESTIONS } from './knowledge.js';

const MAX_TURNS = 16; // keep the instruction turn plus the most recent exchange

function trim(turns) {
  return turns.slice(-MAX_TURNS);
}

async function artifactTransport() {
  if (typeof window === 'undefined' || !window.claude?.use) return null;
  const sample = await window.claude.use('sample').catch(() => null);
  if (!sample) return null;
  return {
    kind: 'claude',
    label: 'On air · Claude',
    async send(turns, { onText, signal }) {
      try {
        const { text } = await sample([{ role: 'user', content: RULES }, ...trim(turns)], {
          cache: false, modelTier: 'quick', signal, onText: ({ text }) => onText(text),
        });
        return text;
      } catch (e) {
        throw normalise(e);
      }
    },
  };
}

async function httpTransport() {
  try {
    const r = await fetch('api/health', { cache: 'no-store' });
    if (!r.ok) return null;
  } catch { return null; }
  return {
    kind: 'claude',
    label: 'On air · Claude',
    async send(turns, { onText, signal }) {
      const r = await fetch('api/chat', {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal,
        body: JSON.stringify({ messages: trim(turns) }),
      }).catch((e) => { throw signal?.aborted ? { code: 'cancelled' } : { code: 'offline', message: String(e) }; });
      if (!r.ok || !r.body) throw { code: r.status === 429 ? 'rate_limited' : 'upstream_error' };
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      let text = '';
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf('\n\n')) >= 0) {
            const frame = buf.slice(0, i);
            buf = buf.slice(i + 2);
            const ev = /^event: (.*)$/m.exec(frame)?.[1];
            const data = JSON.parse(/^data: (.*)$/m.exec(frame)?.[1] || '{}');
            if (ev === 'text') { text += data.delta; onText(text); }
            if (ev === 'error') throw { code: data.code || 'upstream_error', text };
          }
        }
      } catch (e) {
        if (signal?.aborted) throw { code: 'cancelled', text };
        throw e.code ? e : { code: 'upstream_error', text };
      }
      if (!text.trim()) throw { code: 'empty_completion' };
      return text;
    },
  };
}

const DEMO = {
  [SUGGESTIONS[0]]: 'Hyperion is a hypercar design study by Sumanth Richie. It was never built, but GEN.2 treats it as if it would be: 20 rigged assemblies, dihedral doors, a rear clam that lifts, and an engine modelled from scratch.',
  [SUGGESTIONS[1]]: 'The original engine bay was empty, so the HC-8 was modelled procedurally in Blender: a 4.0 L flat-plane V8 with two turbochargers, intercoolers and a 7-speed transaxle. It has 22 named parts, which is what the exploded view labels.',
  [SUGGESTIONS[2]]: 'Product visualisation, environments and hard-surface work. For availability and pricing, use the contact section on the Hyperion site.',
  [SUGGESTIONS[3]]: 'Out and up. Each door turns 100° about a diagonal hinge at its front corner and slides outward, so it ends upright beside the A-pillar, clear of the kerb.',
};

function demoTransport() {
  return {
    kind: 'demo',
    label: 'Demo · not connected',
    async send(turns, { onText, signal }) {
      const q = turns[turns.length - 1].content.trim();
      const answer = DEMO[q] || 'This preview is not connected to Claude, so it can only answer the suggested questions. Open the published page inside Claude, or run the studio server with an API key, to ask anything.';
      let shown = '';
      for (const word of answer.split(/(\s+)/)) {
        if (signal?.aborted) throw { code: 'cancelled', text: shown };
        shown += word;
        onText(shown);
        await new Promise((r) => setTimeout(r, 18));
      }
      return answer;
    },
  };
}

export async function connect() {
  return (await artifactTransport()) || (await httpTransport()) || demoTransport();
}

function normalise(e) {
  return e && typeof e === 'object' && 'code' in e ? e : { code: 'upstream_error', message: String(e) };
}

// What to tell the visitor for each failure (never retried automatically)
export function explain(code) {
  switch (code) {
    case 'cancelled': return '';
    case 'not_granted': return 'Claude is not allowed on this page yet. Allow it from the prompt to chat.';
    case 'sampling_disabled': return 'Claude is not available on this account.';
    case 'rate_limited': return 'Too many messages in a short time. Wait a moment, then send again.';
    case 'session_expired': return 'Your Claude session ended. Sign in again, then resend.';
    case 'refused': return 'That message could not be answered. Try asking it another way.';
    case 'offline': return 'The studio server did not answer. Check your connection and send again.';
    case 'empty_completion': return 'No answer came back. Try a shorter question.';
    default: return 'The answer was interrupted. Send again to retry.';
  }
}
