// Build every app and lay the output out at the repo root, the folder GitHub Pages serves
// (Settings -> Pages: deploy from branch `main`, folder `/`). After merging to main the site is live at
// https://su3doesign.github.io/hyperion-site/
//   /            Hyperion GEN.2 (index.html) and the Alpine F1 study (f1.html)
//   /teardown/   the case study
//   /pitwall/    the chat UI (demo answers on a static host; real Claude needs apps/pitwall/server.mjs)
// Sources stay in apps/, blender/, pipeline/; the original GEN.1 site is kept in legacy/gen1/.
//   npm run deploy:pages
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const run = (cmd) => execSync(cmd, { cwd: root, stdio: 'inherit' });

// what this script owns at the root; everything else in the repo is left alone
const OWNED = ['index.html', 'f1.html', 'favicon.svg', 'assets', 'models', 'renders', 'teardown', 'pitwall', '.nojekyll'];
for (const p of OWNED) fs.rmSync(path.join(root, p), { recursive: true, force: true });

for (const app of ['hyperion', 'teardown', 'pitwall']) run(`npx vite build apps/${app} --emptyOutDir`);

const copy = (from, to) => fs.cpSync(path.join(root, from), path.join(root, to), { recursive: true });
for (const f of fs.readdirSync(path.join(root, 'apps/hyperion/dist'))) copy(`apps/hyperion/dist/${f}`, f);
copy('apps/teardown/dist', 'teardown');
copy('apps/pitwall/dist', 'pitwall');
// serve files as they are: no Jekyll pass over the repo
fs.writeFileSync(path.join(root, '.nojekyll'), '');
console.log('GitHub Pages output written to the repo root:', OWNED.join(', '));
