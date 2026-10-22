# Shoreline — living 3D beach sandbox

A standalone, interactive, real-time beach sandbox, inspired by a reference screenshot but implemented independently with custom procedural content.

![Three.js](https://img.shields.io/badge/Three.js-WebGL-159f9a) ![Vite](https://img.shields.io/badge/Vite-7-ffad80)

## Features

- Original 3D diorama with curved sandy shoreline, forest of 840 procedurally placed trees, rock reefs and sailing boats.
- **Animated surf v3**: layered whitewater breakers, foamy swash, sparkling caustics, reef shadows, shoaling swell, tide run-up and retreat generated in GLSL. No static water background, external textures or paid assets.
- **Living ecosystem**: a 14-bird animated seabird flock in a single GPU draw call, and 360 procedurally placed colorful underwater reef objects (4 instanced batches).
- **Generative ambient audio**: ocean surf noise shaped to match wave height and occasional synthetic seabird calls. User must click Sound to start; no autoplay, uploaded audio, or copyrighted media samples.
- **Dynamic cinematic lighting**: adjustable sun-time slider, warmer golden-hour atmosphere, blue rim light and enhanced tropical colors.
- **Continuous coastal bathymetry**: sea floor now joins the beach without a vertical seam; surf overlays the sloped shore.
- Editor raycasts against the actual terrain surface. Placed trees and rocks, and the instanced forest canopy/trunks, follow deformed land when sculpting ends.
- Browser-local Save / Load for full island terrain, added objects and sim controls. Portable JSON Export / Import works between devices; screenshot export to PNG. No backend or account required.
- Clear error panel when WebGL cannot be initialized, instead of an unexplained empty scene.
- Dynamic sun, time-of-day display and wave-height/simulation-speed controls.
- Orbit, zoom, build sand, dig, rake, plant a tree, add rocks, launch a boat, erase, undo and reset.
- Desktop/mobile adaptive UI: on phones, the tool palette collapses into a compact Tools button to keep the island visible; keyboard shortcuts 1–8, Space and Ctrl+Z remain available on desktop.
- Repeatable terrain/vegetation generation with deterministic randomness.

## Public demo

Cloudflare Worker: [beach.qs3d.site](https://beach.qs3d.site/) — independent static Worker deployment, no project DB or API credentials. Preview staging remains [shoreline-sandbox-3d-stage.hikvision.workers.dev](https://shoreline-sandbox-3d-stage.hikvision.workers.dev/).

## Quickstart

Requires Node.js 20.19+ or 22.12+ (Node 24 works too).

```sh
npm install
npm run dev
```

Open `http://localhost:5178`. To build and test:

```sh
npm run check
npm run preview
```

## Architecture

- `src/simulation.js` — small deterministic geometry/math API, tested with Node's test runner.
- `src/main.js` — procedural terrain and vegetation generation, 3D object placement, island editing, playback controls.
- `src/waves.js` — ocean and swash GLSL shaders, deterministic wave-front/run-up model used by tests.
- `src/island-state.js` — versioned, bounded save format with validation and round-trip tests.
- `src/ambience.js` — deterministic seagull animation and gesture-triggered synthesized surf/chirp Web Audio.
- `src/reefs.js` — GPU-instanced coral and reef rocks.
- `scripts/visual-smoke.mjs` — optional real-browser screenshot, JS-error and frame-timing verification using Playwright.
- `scripts/build-preview-worker.mjs` — package Vite dist into an isolated, compressed Workers staging module. Does not deploy by itself.
- `src/style.css` — UI and responsive layout.

## Performance and security

- Trees, seabirds, underwater reefs, background rocks and shells use GPU instancing (reducing hundreds of draw calls to a handful); water is one combined indexed mesh. DPR is capped at 1.65 on desktop and 1.35 on mobile, and the shadow map is 1024×1024.
- Scene generation is local to the browser; no login, tracking, backend or uploaded assets.
- A machine without a GPU can host the Vite dev server or built static files; GPU rendering happens on the viewer's browser/device.

## Scope

This is a visual/gameplay prototype, not a CFD fluid simulator or physically accurate coastal erosion system. Sand edits do not yet feed back into the procedural shoreline/wave-boundary mesh. Node tests cover geometry, coastal continuity, wave animation, save/restore validation and GLSL shader wiring.

### Isolated staging deployment

The live staging worker can be viewed at https://shoreline-sandbox-3d-stage.hikvision.workers.dev/ (Cloudflare account 6666). This is a public **staging demo**, independent of qs3d.site DNS and unrelated production Workers. Worker source is generated from local dist by `npm run build && node scripts/build-preview-worker.mjs`.

### Visual acceptance still pending

Cloudflare Browser Rendering captured a real software-rendered WebGL preview from staging (it showed the island and 840 trees). Browser QA also verified Save/Load (19,729 terrain vertices) and a mobile layout screenshot. Cloud rendering has been measured at just a few FPS, which is not a hardware-GPU benchmark. This does not replace a **real hardware-GPU frame-rate measurement and side-by-side comparison** before claiming production-grade visuals. VM 181 reports Microsoft Basic Display Adapter / Microsoft Remote Display Adapter; its service-session Edge headless previously exited with code 1002. HTTP 200 and a successful Vite build do **not** prove visual quality or functionality.

Optional QA on a GPU-equipped machine:

```sh
npm install --no-save playwright
npm run preview
node scripts/visual-smoke.mjs
```

The QA script produces an ignored screenshot under `.edge-qa/`, checks WebGL2 availability, browser errors, Save/Load and the measured average frame duration. Browser-local saves remain on the current device. The exported PNG only captures the 3D canvas, not the surrounding toolbar UI.