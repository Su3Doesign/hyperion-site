# Hyperion studio

Hyperion GEN.2: a hypercar design study by Sumanth Richie, rebuilt as a rigged, debranded car with
an engine, rendered in Blender Cycles and shown live in three.js.

| Folder | What it is |
|---|---|
| `apps/hyperion` | The portfolio site: scroll story with a live 3D car, UV-C inspection sweep, 360° turntable, pinned design notes, exploded anatomy, Cycles gallery, portal-meadow finale |
| `apps/teardown` | Case study: how the kitbash became a car, including the UX audit of GEN.1 |
| `apps/pitwall` | Minimal AI chat for visitors, answered by Claude from the studio's facts |
| `blender/`, `pipeline/` | Scripts that rebuild every asset from `source/` |
| `docs/` | Landing copy and headline options, GEN.1 UX audit |
| `legacy/gen1` | The previous site, kept for reference |

```bash
npm install
npm run dev        # http://localhost:5173
npm run build
```

Full architecture, rebuild steps, publishing and known gaps: [HANDOVER.md](HANDOVER.md).

## Live site (GitHub Pages)

https://su3doesign.github.io/hyperion-site/ serves the built site from the repo root:
`index.html` (Hyperion GEN.2), `f1.html` (Alpine F1 study), `teardown/` (case study), `pitwall/` (chat UI).
Rebuild that output with `npm run deploy:pages`, commit, and merge to `main`. Sources live in `apps/`,
`blender/` and `pipeline/`; the original GEN.1 site is kept in `legacy/gen1/`.
