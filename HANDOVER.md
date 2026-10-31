# HANDOVER — Hyperion GEN.2 studio

Everything needed to continue this project cold. Branch: `claude/vigilant-ritchie-l8plot`.

## 1. Brief (from the owner)

Redo the Hyperion car portfolio site (GEN.1, built earlier with an older model) as finished,
portfolio-grade work: Blender for realism, React + Vite + Tailwind, GSAP + ScrollTrigger + Lenis,
three.js with no heavy plugins. Required techniques: fullscreen hero, layered parallax, premium
minimal type, fades/reveals/image expansion, subtle hover and cursor, slow motion, a 360° rotatable
product, a scroll-reactive UV-C point-light glow, a CSS scroll-snap infinite horizontal gallery, a
GSAP-pinned product while copy scrolls, exploded/labelled views, dark backdrops, accessibility and
reduced motion. Also: landing sections + headlines, React/Tailwind components, a storytelling case
study, a UX audit (top 5 + fixes), and a minimal AI chat UI. Later request: replace the plain floor
at the end with realistic moving grass, "like a portal".

## 2. Deliverables and status

| Folder | Name | Identity | Status | Preview (private, owner can share) |
|---|---|---|---|---|
| `apps/hyperion` | **Hyperion GEN.2** — the portfolio site | Warm studio black, bone, bronze; one accent (UV-C violet). Archivo / Instrument Serif / JetBrains Mono | Done, QA'd desktop + phone | https://claude.ai/artifact/UmU3hbbVi82xkS4FRkM1vW |
| `apps/teardown` | **Teardown** — case study | Engineering dossier: drafting vellum, graphite, redline markup; light + dark. Newsreader / IBM Plex | Done | https://claude.ai/artifact/5U9ZjUJav93rqtKW1v3tuy |
| `apps/pitwall` | **Pit Wall** — AI chat UI | One radio channel: cool white, navy ink, one amber on-air light; light + dark. Geist | Done; real-Claude path untested here (no API key in this environment) | https://claude.ai/artifact/63Bzikf32mBaq292tNQCBC |
| `docs/landing-copy.md` | Landing sections + headline options | — | Done | — |
| `docs/ux-audit-gen1.md` | UX audit of GEN.1, top 5 + fixes | — | Done (also inside Teardown §07) | — |
| `blender/`, `pipeline/` | Reproducible asset pipeline | — | Done | — |

## 3. Owner actions (blocking for a public launch)

1. **Contact details**: fill `email` and `links[].href` in `apps/hyperion/src/content.js`. Empty
   fields are hidden on purpose, so the contact section currently shows only the Pit Wall and
   Teardown buttons.
2. **Asset licence**: the source model is a kitbash. Material and node names (`jeskf_*`,
   `Koenigsegg_JeskoAbsolut_2021…`, `Attack:*`, `Nilu27_*`) show parts came from third-party
   models of a real car. GEN.2 removes every visible mark, but the silhouette is still derived from
   that car. Confirm the licences before commercial use.
3. **Repos**: the owner wants one repo per deliverable. Each `apps/*` folder is self-contained
   (own `package.json`, `vite.config.js`); split with `git subtree split -P apps/<name>` or copy the
   folder. The Blender pipeline belongs with `hyperion`.

## 4. Architecture

```
source/                       original GLB (50.1 MB, Draco) + GEN.1 HDR
pipeline/
  decode.mjs                  Draco -> plain GLB (pip bpy has no Draco bridge)
  debrand.py                  Pillow: redraws 15 textures with Hyperion marks
  textures.py                 procedural carbon twill, heat foil, cast alu, paint flakes
  optimize.mjs                glTF-Transform: dedup/prune/weld, WebP textures, meshopt (+simplify for phones)
  publish_renders.py          Cycles PNG masters -> WebP 800/1600/2400 into apps
blender/
  hy_studio.py                shared helpers: import, studio cove, strip-light rig, Cycles settings
  rebuild.py                  flatten -> mirror FR wheel to FL -> classify into 20 assemblies -> pivots,
                              explode vectors, labels as node extras -> powertrain -> materials -> export
  powertrain.py               procedural HC-8 V8, turbos, intercoolers, transaxle, suspension, exhaust (22 parts)
  pose.py                     poses the .blend from the same extras the website reads
  render_stills.py            12 Cycles shots (dark studio), SCALE/SPP/ONLY env vars
  test_*.py, dump_*.py, export_images.py, inspect_model.py   dev/inspection tools
apps/hyperion/src/
  three/stage.js              one fixed WebGL stage; `target` (written by scroll) -> eased `cur` each frame
  three/car.js                GLB load (meshopt; base64-JSON fallback), rig from extras, lights, label anchors
  three/env.js                runtime studio environment (PMREM) mirroring the Blender rig
  three/shadow.js             dynamic contact shadow (depth from below, blurred); texture shared with grass
  three/meadow.js             portal meadow: instanced grass + ring + soil + pollen, dusk env
  lib/director.js             ONE scrubbed GSAP timeline: section keys -> stage state (camera, rig, light)
  lib/scroll.js               Lenis wired into GSAP ticker; reduced motion = native scroll
  sections/*.jsx              Hero, Ignition, Walkaround, Notes (GSAP pin), Anatomy, Renders, Clients, Contact
  content.js                  all copy, studio details, renders list
qa/
  shoot.mjs                   Playwright beat-by-beat screenshots (desktop + phone), `?qa` manual-render mode
  artifact_html.py            Vite dist -> artifact page + base64-JSON model wrapping
```

Key design decision: sections never call three.js. They (via `director.js`) write numbers into
`target` (camera position/target, horizontal FOV, explode, ptExplode, doors, clam, spin, env, key,
uv, uvX, head, tail, word, bloom, shadow, grass, dusk, liftY, visible). `stage.js` eases toward them.
To add a beat: add a key to `KEYS` in `director.js`.

Coordinates: Blender (x fwd, y left, z up) -> glTF/three (x fwd, y up, z = -left). The car's left
side faces -z in three.js.

## 5. How to run

```bash
npm install                                  # root workspaces: apps/* + pipeline
npm run dev                                  # Hyperion at http://localhost:5173
npm run dev:teardown                         # case study
npm run dev:pitwall                          # chat UI (demo mode without the server)
npm run build                                # builds every app into apps/*/dist

# Pit Wall with real Claude, self-hosted:
cd apps/pitwall && npm run build && ANTHROPIC_API_KEY=... npm run serve   # http://localhost:8787
```

Pit Wall picks its transport at runtime: the artifact viewer's `sample` capability (viewer's own
Claude, quick tier), else `POST /api/chat` on `server.mjs` (model `claude-opus-5-5`, effort low,
server-side refusal fallback `fallbacks: "default"` on beta `server-side-fallback-2026-07-01`,
system prompt cached), else a labelled demo that answers the four suggestions only.

### Rebuild the car from source

```bash
python3 -m venv ~/bpyenv && ~/bpyenv/bin/pip install bpy fonttools brotli   # Blender 5.2 as a module
node pipeline/decode.mjs source/hyperion_trial_v1.glb .work/hyperion_decoded.glb
SRC=.work/hyperion_decoded.glb OUT=.work/images ~/bpyenv/bin/python blender/export_images.py
FONTS=<dir with Archivo-VF.ttf, Archivo-Italic-VF.ttf, JetBrainsMono-VF.ttf> python3 pipeline/debrand.py
python3 pipeline/textures.py
SRC=.work/hyperion_decoded.glb ~/bpyenv/bin/python blender/rebuild.py      # -> .work/hyperion_gen2.blend + _raw.glb
node pipeline/optimize.mjs .work/hyperion_gen2_raw.glb apps/hyperion/public/models/hyperion.glb 1024
Q=80 node pipeline/optimize.mjs .work/hyperion_gen2_raw.glb apps/hyperion/public/models/hyperion-mobile.glb 768 0.5
BLEND=.work/hyperion_gen2.blend OUT=.work/stills SPP=64 ~/bpyenv/bin/python blender/render_stills.py   # ~40 min on 4 CPUs
python3 pipeline/publish_renders.py
```

Fonts for debrand: TTFs from github.com/google/fonts (`ofl/archivo`, `ofl/jetbrainsmono`), renamed
as above. `CAR_PNG` (default `.work/test_side.png`) is the render drawn into the infotainment screen.

### Publish previews (claude.ai artifacts)

```bash
cd apps/hyperion && VITE_MODEL_WRAP=1 npx vite build --outDir dist-artifact && cd ../..
python3 qa/artifact_html.py apps/hyperion/dist-artifact     # writes artifact.html, wraps GLBs as .glb.b64.json
```
Then publish `dist-artifact/artifact.html` with every file in that folder as supporting files.

### QA

```bash
cd apps/hyperion && npx vite build && npx vite preview --port 4173 &
node qa/shoot.mjs http://localhost:4173/ .work/qa both      # 22 beats x desktop/phone + console log
```

## 6. Gotchas learned

- **pip `bpy`**: no Draco or meshopt bridges (decode first, compress after). Never name a script
  after a stdlib module (`inspect.py` broke the import with a double glog init). Pass paths via env
  vars; `--` in argv trips Blender's logger.
- **Packed images ignore `filepath` changes**: load the new file and `user_remap` it (`rebuild.py`).
- **Parenting in bpy**: call `view_layer.update()` after creating an empty, before adopting children,
  or children get the parent offset twice.
- **Debrand orientation**: caliper script is mirrored in UV space; the replacement is rotated + flipped
  to match. Check in a render, not the atlas.
- **`p { text-wrap: pretty }`** overrides inherited `white-space: nowrap` (text-wrap is the longhand
  of white-space). Labels need an explicit `text-wrap: nowrap`.
- **Headless WebGL** (SwiftShader) queues frames faster than it draws them; screenshots hang. QA runs
  with `?qa`: manual rendering (`__hy.renderNow`), instant damping, scrub without lag.
- **GSAP pin** of an element whose position depends on flex parents lands in the wrong place; pin a
  self-positioned block (Notes HUD uses explicit `right` + width).
- **Environment swap without a pop**: studio -> dusk env is swapped at dusk = 0.5 where the env
  intensity multiplier `|dusk - 0.5| * 2` is zero.
- **Artifacts don't serve `.glb`**: the preview build wraps each GLB as base64 inside JSON
  (14.4 MB desktop, under the 16 MB text-file cap); `car.js` decodes and `GLTFLoader.parse`s it.
- **Artifact pages** get their own doctype/head/body; `qa/artifact_html.py` strips Vite's.
- **Portrait framing**: horizontal FOV is held constant so the car fills phone width; `liftY` moves
  the look-at point per shot so the car clears the copy on phones only.

## 7. Remaining plan (in order)

1. Owner: contact details + asset licence confirmation (section 3).
2. Real reflective floor for studio scenes (half-res mirror render target + blur), desktop only.
3. Cycles turntable/door-opening animation (24 fps, 6 s) for social; reuse `pose.py` with keyframes.
4. Cycles still of the car in the meadow (particle grass in Blender) to match the web finale.
5. KTX2/Basis textures to cut GPU memory on phones (glTF-Transform `toktx` needs the KTX CLI).
6. Live-test Pit Wall's server path with an API key; tune `RULES` in `apps/pitwall/src/lib/knowledge.js`.
7. Split into one repo per deliverable once the owner creates them.
