# HANDOVER — Sumanth Richie car studio (Hyperion GEN.2 + F1 study)

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

Later requests, in order:
- Put a second, more detailed car through the same treatment, from the owner's Drive folder
  (https://drive.google.com/drive/folders/1t-RBZB6Tu7vkDsCnPFRBCpLisMTIfHFJ). Keep its brand
  marks, show it dismantled (exploded). Chosen: `F1_Alpine_livery.blend`.
- Keep **both** cars. Fix Hyperion: doors opened wrong, the engine showed through the rear, removed
  badges left holes into the interior.
- Modern type (Awwwards free fonts, no serif), and a more playful landing: modern type behind the car.
- Round 3: no client names; a drag-to-orbit camera in both finales; the Hyperion front logo (a
  shield-shaped hole) fixed; F1 wheels wobbled and the tyre livery looked wrong (use real Pirelli);
  show wheel speed; link the two cars both ways with Hyperion as the primary page; make the F1
  page feel custom (floodlit track scene with pit equipment instead of grass, its own moments).

## 2. Deliverables and status

| Folder | Name | Identity | Status | Preview (private, owner can share) |
|---|---|---|---|---|
| `apps/hyperion/index.html` | **Hyperion GEN.2** — the primary page | Warm studio black, bone, bronze; UV-C violet. Clash Display / Satoshi / Panchang / JetBrains Mono. UV-C sweep, portal meadow | Done, QA'd desktop + phone | https://claude.ai/artifact/UmU3hbbVi82xkS4FRkM1vW (opens on Hyperion, F1 one tap away) |
| `apps/hyperion/f1.html` | **Alpine F1 Study** | Same type system; signal red + telemetry cyan. Wind tunnel, timing tower, night pit lane | Done, QA'd desktop + phone | https://claude.ai/artifact/YCB31TVnR3ayfnipSRF3DU (opens on F1, Hyperion one tap away) |
| `apps/teardown` | **Teardown** — case study | Engineering dossier: drafting vellum, graphite, redline markup; light + dark. Clash Display / Satoshi | Done | https://claude.ai/artifact/5U9ZjUJav93rqtKW1v3tuy |
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
3. **F1 marks**: the F1 car keeps its team and sponsor liveries as asked. The site credits them
   ("team and sponsor marks belong to their owners"); fine for a portfolio, not for paid promotion.
4. **Repos**: the owner wants one repo per deliverable. Each `apps/*` folder is self-contained
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
  f1_bake.py                  F1 stage A: decimate, multi-object UV atlases, bake the procedural livery
  f1_rebuild.py               F1 stage B: 210 CAD parts -> 23 assemblies, steering + DRS hinges, PU, GLB
  f1_powertrain.py            procedural 1.6 L V6 split-turbo hybrid (21 labelled parts)
  f1_stills.py                11 Cycles shots of the F1 car
  f1_inspect.py, f1_look*.py, f1_mats.py, f1_bsdf.py, f1_bay.py, f1_test_rig.py   F1 dev tools
  test_*.py, dump_*.py, export_images.py, inspect_model.py   dev/inspection tools
apps/hyperion/src/
  cars/{f1,hyperion}.js       one profile per car: shots + scroll keys, copy, dims, labels, type bands,
                              finale, facts, theme. cars/index.js reads <html data-car data-other>
  fonts/                      self-hosted Fontshare woff2 + fonts.css (ITF Free Font License)
  three/stage.js              one fixed WebGL stage; `target` (written by scroll) -> eased `cur` each frame;
                              kinetic type bands (CanvasTexture tiles scrolled by texture offset)
  three/car.js                GLB load (meshopt; base64-JSON fallback), rig from extras, lights, label anchors
  three/env.js                runtime studio environment (PMREM) mirroring the Blender rig
  three/shadow.js             dynamic contact shadow (depth from below, blurred); texture shared with grass
  three/meadow.js             Hyperion finale: instanced grass + ring + soil + pollen, dusk env
  three/pitlane.js            F1 finale: start lights, floodlight towers, garage, pit box, tyre sets, night env
  three/tunnel.js             F1 wind tunnel: streamlines traced from the car's height field, rolling road
  lib/director.js             ONE scrubbed GSAP timeline: section keys -> stage state (camera, rig, light)
  lib/scroll.js               Lenis wired into GSAP ticker; reduced motion = native scroll
  sections/*.jsx              Hero, Ignition (UV lamp or tunnel), Walkaround, Notes (GSAP pin), Anatomy, Renders,
                              Studio (build sheet / timing tower), Contact (finale, orbit, next car)
  content.js                  studio details shared by both cars (email, links)
qa/
  shoot.mjs                   Playwright beat-by-beat screenshots (desktop + phone), `?qa` manual-render mode
  artifact_html.py            two-page dist -> artifact (primary car + second page) + base64-JSON models
  orbit.mjs                   drags the finale camera and screenshots before/after
```

Key design decision: sections never call three.js. They (via `director.js`) write numbers into
`target` (camera position/target, horizontal FOV, explode, ptExplode, doors, clam, spin, env, key,
uv, uvX, head, tail, word, bloom, shadow, grass, dusk, liftY, visible). `stage.js` eases toward them.
To add a beat: add a key to `KEYS` in the car profile (`src/cars/*.js`).

Rig extras both sides read: `hy_asm`, `hy_part`, `explode`, `centre`, `label`, `note`, `hinge_axis`,
`hinge_angle`, `hinge_drive` (which pose value opens it: `doors` or `clam`), `hinge_offset` (slide
applied with the hinge, used by Hyperion's synchro-helix doors), `spin_axis`. The F1 car drives its
steering from `doors` and its DRS flap from `clam`, so the same scroll keys work for both cars.

Coordinates: Blender (x fwd, y left, z up) -> glTF/three (x fwd, y up, z = -left). The car's left
side faces -z in three.js.

## 5. How to run

```bash
npm install                                  # root workspaces: apps/* + pipeline
npm run dev                                  # Hyperion at http://localhost:5173/, F1 at /f1.html
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

Hyperion fixes live in `rebuild.py` (doors: `DOOR_PIVOT`, `DOOR_AXIS`, `DOOR_ANGLE`, `DOOR_SLIDE`
env vars; badges kept as dark `Badge_Blank` graphite instead of deleted) and `powertrain.py`
(silencer and tailpipe moved inside the body).

### Rebuild the F1 car

```bash
# F1_Alpine_livery.blend from the owner's Drive folder -> .work/f1/
BLEND=.work/f1/F1_Alpine_livery.blend ~/bpyenv/bin/python blender/f1_inspect.py > .work/f1_inspect.txt
BLEND=.work/f1/F1_Alpine_livery.blend OUT=.work/f1/f1_baked.blend BAKE=.work/f1/bake ~/bpyenv/bin/python blender/f1_bake.py
BLEND=.work/f1/f1_baked.blend INSPECT=.work/f1_inspect.txt OUT=.work/f1/f1_rig.blend GLB=.work/f1/f1_raw.glb ~/bpyenv/bin/python blender/f1_rebuild.py
ROUGH_MAX=1024 node pipeline/optimize.mjs .work/f1/f1_raw.glb apps/hyperion/public/models/f1.glb 4096
Q=80 ROUGH_MAX=512 node pipeline/optimize.mjs .work/f1/f1_raw.glb apps/hyperion/public/models/f1-mobile.glb 2048 0.6
BLEND=.work/f1/f1_rig.blend OUT=.work/f1/stills SPP=48 ~/bpyenv/bin/python blender/f1_stills.py      # ~30 min on 4 CPUs
python3 pipeline/publish_renders.py --f1
```

Fonts for debrand: TTFs from github.com/google/fonts (`ofl/archivo`, `ofl/jetbrainsmono`), renamed
as above. `CAR_PNG` (default `.work/test_side.png`) is the render drawn into the infotainment screen.

### Host on GitHub Pages

Pages serves `main` from the repo root. `npm run deploy:pages` (scripts/deploy-pages.mjs) builds all
three apps and writes `index.html`, `f1.html`, `assets/`, `models/`, `renders/`, `teardown/`, `pitwall/`
and `.nojekyll` at the root. Commit and merge to `main`; https://su3doesign.github.io/hyperion-site/
updates a minute later. On Pages the chat runs its labelled demo answers (no server there).

### Publish previews (claude.ai artifacts)

```bash
cd apps/hyperion && VITE_MODEL_WRAP=1 npx vite build --outDir dist-artifact && cd ../..
cp -r apps/hyperion/dist-artifact apps/hyperion/dist-f1
python3 qa/artifact_html.py apps/hyperion/dist-artifact hyperion   # primary Hyperion + f1.html
python3 qa/artifact_html.py apps/hyperion/dist-f1 f1               # primary F1 + hyperion.html
```
Publish each `artifact.html` with its `files.json` as the supporting files (about 48 MB, both cars).
Fonts are inlined into the CSS in this build only (the artifact CSP blocks self-hosted font files).

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
- **Artifact pages** get their own doctype/head/body; `qa/artifact_html.py` strips Vite's and restores
  the `<html data-car data-other>` attributes with an inline script. The second page ships whole.
- **Wheel camber**: the F1 CAD wheels sit at ~2°; spinning about pure +Y made them wobble. The axle
  comes from a PCA of each wheel nut. Positive `spin` now rolls the car forward (+x).
- **Fake volumetric cones** around the camera veil the whole frame; the F1 keeps haze cones only on
  distant masts. Bright garage panels bloom: the F1 finale runs bloom at 0.1.
- **Position-driven shaders** (the F1 livery is tri-planar on world position): bake in the original
  coordinates, then move the mesh. Baking after the rotation paints the livery in the wrong place.
- **Source .blend render settings leak**: the F1 file ships at 75% resolution; `hy_studio.cycles`
  now forces 100%.
- **bpy collections after `open_mainfile`**: module-level references die with the old file;
  `f1_rebuild.py` re-points `powertrain.COL` at the new scene collection.
- **Canvas text never triggers a font load**: `stage.js` calls `document.fonts.load()` for Panchang
  and JetBrains Mono, then redraws the band tiles.
- **Clash Display has no italic**: never set it in italic (the browser fakes a slant); use colour or
  the `.t-hollow` outline style for emphasis.
- **Portrait framing**: horizontal FOV is held constant so the car fills phone width; `liftY` moves
  the look-at point per shot so the car clears the copy on phones only.

## 7. Remaining plan (in order)

1. Owner: contact details + asset licence confirmation (section 3).
1b. A small landing that links both car sites (or a car switcher in the nav) once both are hosted.
2. Real reflective floor for studio scenes (half-res mirror render target + blur), desktop only.
3. Cycles turntable/door-opening animation (24 fps, 6 s) for social; reuse `pose.py` with keyframes.
4. Cycles still of the car in the meadow (particle grass in Blender) to match the web finale.
5. KTX2/Basis textures to cut GPU memory on phones (glTF-Transform `toktx` needs the KTX CLI).
6. Live-test Pit Wall's server path with an API key; tune `RULES` in `apps/pitwall/src/lib/knowledge.js`.
7. Split into one repo per deliverable once the owner creates them.
