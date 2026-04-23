# HYPERION GEN.1

A scroll-driven 3D portfolio for Sumanth Richie, built on Three.js.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Structure

```
/src/
  main.js    — Entry point, loader, render loop
  scene.js   — Three.js setup, lighting, HDRI, model loading, bloom
  scroll.js  — Lenis smooth scroll controller
  acts.js    — Scroll-driven choreography for all 6 Acts

/assets/
  models/hyperion_trial_v1.glb
  hdri/studio_dark.hdr
```

## Controls

- **Scroll** — advance through Acts
- **D** — toggle debug HUD

## Acts

| # | Name | Focus |
|---|------|-------|
| 0 | Ignition | Opening wide shot, car wakes up |
| 1 | The Engine | Rear deck lifts, engine reveal |
| 2 | The Headlights | Clients illuminate in sequence |
| 3 | The Dashboard | Portfolio works on infotainment |
| 4 | The Horizon | Windshield POV, dawn |
| 5 | The Garage | Finale, contact |
