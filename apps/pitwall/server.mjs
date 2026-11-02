// Pit Wall server: serves the built app and streams Claude's replies to it as server-sent events.
//   npm run build && ANTHROPIC_API_KEY=... npm run serve     (or sign in once with `ant auth login`)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { RULES } from './src/lib/knowledge.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(here, 'dist');
const PORT = Number(process.env.PORT || 8787);
const client = new Anthropic(); // ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN or an `ant auth login` profile
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.json': 'application/json' };

function readBody(req, limit = 64_000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// keep only well-formed turns, starting and ending on the visitor, at most 16 of them
function cleanTurns(raw) {
  const turns = (Array.isArray(raw) ? raw : [])
    .filter((t) => (t?.role === 'user' || t?.role === 'assistant') && typeof t.content === 'string' && t.content.trim())
    .map((t) => ({ role: t.role, content: t.content.slice(0, 4000) }))
    .slice(-16);
  while (turns.length && turns[0].role !== 'user') turns.shift();
  return turns.length && turns[turns.length - 1].role === 'user' ? turns : null;
}

async function chat(req, res) {
  let messages;
  try { messages = cleanTurns(JSON.parse(await readBody(req)).messages); } catch { messages = null; }
  if (!messages) { res.writeHead(400, { 'content-type': 'application/json' }).end('{"error":"bad request"}'); return; }

  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  const stream = client.beta.messages.stream({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    output_config: { effort: 'low' }, // short conversational answers; raise for deeper questions
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default', // if a reply is declined, the API retries it on a fallback model in the same call
    system: [{ type: 'text', text: RULES, cache_control: { type: 'ephemeral' } }],
    messages,
  });
  req.on('close', () => stream.abort());
  stream.on('text', (delta) => send('text', { delta }));
  try {
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') send('error', { code: 'refused' });
    send('done', { stop_reason: final.stop_reason });
  } catch (err) {
    if (!res.writableEnded) {
      const code = err instanceof Anthropic.RateLimitError ? 'rate_limited'
        : err instanceof Anthropic.AuthenticationError ? 'sampling_disabled'
        : err instanceof Anthropic.APIUserAbortError ? 'cancelled' : 'upstream_error';
      send('error', { code });
    }
  }
  res.end();
}

function serveStatic(req, res) {
  const url = new URL(req.url, 'http://x');
  let file = path.normalize(path.join(DIST, decodeURIComponent(url.pathname)));
  if (!file.startsWith(DIST)) { res.writeHead(403).end(); return; }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

http.createServer((req, res) => {
  const p = new URL(req.url, 'http://x').pathname;
  if (p.endsWith('/api/health')) { res.writeHead(200, { 'content-type': 'application/json' }).end('{"ok":true}'); return; }
  if (p.endsWith('/api/chat') && req.method === 'POST') { chat(req, res); return; }
  serveStatic(req, res);
}).listen(PORT, () => console.log(`Pit Wall on http://localhost:${PORT}`));
