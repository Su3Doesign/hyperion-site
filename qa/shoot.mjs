// Visual QA: screenshots of every story beat at desktop and phone sizes.
//   node qa/shoot.mjs http://localhost:4173/ out-dir [desktop|mobile|both] [filter]
import { chromium } from 'playwright';
import fs from 'node:fs';

const [, , base = 'http://localhost:4173/', out = '.work/qa', which = 'both', filter = ''] = process.argv;
fs.mkdirSync(out, { recursive: true });

const BEATS = [
  ['hero', 0], ['hero', 0.7], ['ignition', 0.25], ['ignition', 0.6], ['ignition', 0.97], ['walkaround', 0.5],
  ['notes', 0.1], ['notes', 0.38], ['notes', 0.64], ['notes', 0.92], ['anatomy', 0.2], ['anatomy', 0.55], ['anatomy', 0.97],
  ['renders', 0.02], ['renders', 0.12], ['renders', 0.5], ['clients', 0.35], ['contact', 1],
];
const VIEWS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844, isMobile: true, hasTouch: true } };

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const [name, vp] of Object.entries(VIEWS)) {
  if (which !== 'both' && which !== name) continue;
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  const t0 = Date.now();
  await page.goto(base + '?qa', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__hy?.ready, null, { timeout: 180000 }).catch(() => logs.push('[qa] model never became ready'));
  console.log(name, 'ready in', ((Date.now() - t0) / 1000).toFixed(1), 's', await page.evaluate(() => JSON.stringify(window.__hy?.stats)));
  await page.waitForTimeout(2500);
  for (const [id, p] of BEATS) {
    const tag = `${id}-${String(Math.round(p * 100)).padStart(3, '0')}`;
    if (filter && !tag.includes(filter)) continue;
    const y = await page.evaluate(([id, p]) => {
      const el = document.getElementById(id);
      const top = el.getBoundingClientRect().top + window.scrollY;
      const span = Math.max(1, el.offsetHeight - innerHeight);
      const yy = Math.round(top + p * span);
      if (window.__hy?.lenis) window.__hy.lenis.scrollTo(yy, { immediate: true, force: true });
      else window.scrollTo(0, yy);
      return yy;
    }, [id, p]);
    await page.waitForTimeout(2200);
    await page.screenshot({ path: `${out}/${name}-${tag}.png` });
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (overflow > 0) logs.push(`[qa] horizontal overflow ${overflow}px`);
  fs.writeFileSync(`${out}/${name}-console.txt`, logs.join('\n'));
  console.log(name, 'logs:', logs.length ? '\n  ' + logs.slice(0, 15).join('\n  ') : 'clean');
  await ctx.close();
}
await browser.close();
