# UX audit — Hyperion GEN.1

Audited from the GEN.1 source (now in `legacy/gen1/`) as a first-time visitor would meet it,
desktop and phone. Ranked by how much each issue cost a visitor. Every fix below ships in GEN.2.

| # | Issue | Evidence in GEN.1 | Quick fix | Done in GEN.2 |
|---|---|---|---|---|
| 1 | **Nothing to see until ~56 MB arrived** | `main.js` awaited a 6.3 MB HDR, then a 50.1 MB Draco GLB (decoder fetched from gstatic) before hiding the loader. No poster, so phones saw black for most of a minute. | Show a still at once; stream a compressed model; swap to 3D when ready. | Cycles hero still paints first; meshopt + WebP GLB is 10.8 MB (6.8 MB on phones); runtime studio environment instead of an HDR. |
| 2 | **No orientation or navigation** | Six acts × 200 vh, no nav, no progress, no anchors; reaching contact meant scrolling the whole film. | Fixed nav, progress indicator, anchor jumps. | Fixed nav (Anatomy, Renders, Contact), bronze progress hairline, smooth anchor scrolling. |
| 3 | **Seven typefaces and heavy text effects** | Fraunces, Cormorant Garamond, Cinzel, Mrs Saint Delafield, Great Vibes, Bodoni Moda, JetBrains Mono; ink-bleed SVG filters, chromatic split, shimmer. The name was set in a script face. | Four roles, no filters. | Clash Display (headings), Satoshi (text), Panchang (kinetic hero type), JetBrains Mono (specs). Fontshare, ITF Free Font License. |
| 4 | **Dead contact links** | `mailto:your@email.com` and three `href="#"` links. | Config-driven contact; hide empty fields; copyable email (mail links are unreliable in embeds). | `apps/hyperion/src/content.js`; empty links are not rendered; email gets a Copy button. |
| 5 | **Debug and accessibility gaps** | `DEBUG = true` shipped a HUD; act titles were `div`s, no headings; no focus styles; no reduced-motion handling; nothing keyboard-operable. | Semantic headings, focus ring, reduced motion, keyboard controls, debug off. | Sections with `h1`/`h2`, ion focus ring, reduced motion = native scroll + camera cuts, turntable is a keyboard `slider`, gallery takes arrow keys, skip link. |

## Also found (3D, not UX)

- Doors and the engine cover rotated without their handles, trim, mirrors and wing parts (parented elsewhere).
- Front-left wheel came from a different kit than the other three.
- Engine bay was empty under the cover the "engine reveal" act lifted.
- Third-party marks were baked into 15 textures (tyres, calipers, decals, screens, hub caps).

All four are fixed in the Blender rebuild; see `HANDOVER.md` → Pipeline.
