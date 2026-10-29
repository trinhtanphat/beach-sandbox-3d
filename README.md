# Shoreline — living 3D beach sandbox

A standalone, interactive, real-time beach sandbox, inspired by a reference screenshot but implemented independently with custom procedural content.

![Three.js](https://img.shields.io/badge/Three.js-WebGL-159f9a) ![Vite](https://img.shields.io/badge/Vite-7-ffad80)

## Features

- Rebuilt 3D diorama with a coherent coastal biome: a broader pale-sand strand, 255 deliberately spaced tropical trees, shallow turquoise reef water, submerged coral and boats.
- **Low-FPS hydraulic time correction v31:** keep water and world elapsed-time progression consistent at 3–120 visible FPS rather than slowing water to 24% of elapsed time at 3 FPS. Bounded catch-up keeps Pause, hidden tabs and long suspend gaps safe. See [v31 frame-time notes](docs/BEACH_V31_FRAME_TIME_2026-10-29.md).
- **Local boat flotation and lightweight lagoon surface v30:** moored inland boats follow their actual local waterline instead of a fixed sea height; lagged visual mesh uploads run near 10 Hz independently of fixed-step hydraulic flow. Cached shore masks avoid repeated calculations. See [v30 technical notes](docs/BEACH_V30_FLOW_RENDER_2026-10-29.md).
- **Stable lagoon water surface v29:** limit each face transfer by available hydraulic-head volume to prevent the default lagoon from draining and forming vertical water sheets; preserve pond volume when building underwater sandbars and keep dry-shore water mesh vertices at the local waterline. See [v29 stability notes](docs/BEACH_V29_HYDROSTATIC_STABILITY_2026-10-29.md).
- **Progressive inlet hydraulics v28:** inland water now propagates cell by cell from the sea through real open trenches instead of appearing at full depth instantly. Fluxes are donor-volume-limited, water behind a dam is retained, Pause freezes flow, and flood metrics reflect current depth. See [v28 hydrology notes](docs/BEACH_V28_PROGRESSIVE_HYDRAULICS_2026-10-29.md).
- **Seabed-aware ecology v27:** inland flooded footprint and sampled mean water depth are visible in Ocean Conditions, coastal rocks correctly rest underwater after terraforming, and Island life reflects only visible trees. See [v27 coastal ecology](docs/BEACH_V27_COASTAL_ECOLOGY_2026-10-29.md).
- **Sea-connected excavation v26:** water only fills a dug basin when a continuous submerged channel reaches the open sea; dams stop the flow. Dynamic coastal water geometry now follows edited ground across the landward board, the UI shows lagoon inlet connection, and trees/boats respond to flooding. See [v26 physics notes](docs/BEACH_V26_WATER_CONNECTIVITY_2026-10-29.md).
- **Inland lagoon v25:** a real excavated sandy lagoon with a narrow open-sea inlet, terrain-clipped shaded water, sheltered ripples, lagoon-safe forest/boat placement and moored boat motion. Terrain edits refresh water on completion, Undo, Reset and Load; old local island saves remain supported. See [release verification](docs/BEACH_V25_RELEASE_2026-10-29.md).
- **Return-current channels and moored boats v24**: two narrow, bounded seaward return-flow lanes gently stretch the visible whitewater textures and 460 spray particles, sharing the same current field across ocean, raised breaker and spray shaders. Boats drift and bob near their original anchors under the same longshore and return-current model; the editor saves **original anchor coordinates** rather than animated boat positions to prevent Save/Load drift. Preserves v23 shoreward breakers, long swells, audio, bird flock, adaptive DPR and all user island data. Still an artistic procedural current model, not a conservation-law hydrodynamic solver.
- **Living ecosystem**: 14 animated seabirds in a single GPU draw call, and up to 360 seeded reef objects kept beneath the water surface (4 instanced batches).
- **Generative ambient audio**: ocean surf noise shaped to match wave height and occasional synthetic seabird calls. User must click Sound to start; no autoplay, uploaded audio, or copyrighted media samples.
- **Dynamic cinematic lighting**: adjustable sun-time slider, warmer golden-hour atmosphere, blue rim light and enhanced tropical colors.
- **Continuous coastal bathymetry**: sea floor now joins the beach without a vertical seam; surf overlays the sloped shore.
- Editor raycasts against the actual terrain surface. Placed trees and rocks, and the instanced forest canopy/trunks, follow deformed land when sculpting ends.
- Browser-local Save / Load for full island terrain, added objects and sim controls. Portable JSON Export / Import works between devices; screenshot export to PNG. No backend or account required.
- Clear error panel when WebGL cannot be initialized, instead of an unexplained empty scene.
- Dynamic sun, time-of-day display, wave height, whitewater foam intensity and simulation-speed controls.
- Orbit, zoom, build sand, dig, rake, plant a tree, add rocks, launch a boat, erase, undo and reset.
- Desktop/mobile adaptive UI: on phones, the tool palette collapses into a compact Tools button to keep the island visible; keyboard shortcuts 1–8, Space and Ctrl+Z remain available on desktop.
- Repeatable terrain/vegetation generation with deterministic randomness. Centralized `COASTAL_ZONES` keeps surf overlap, wet beach, planting, forest, boat and reef positions consistent; 125 automated tests cover legacy simulation, lagoon geometry, stable water transfer, sandbar displacement, low-FPS simulation clock, dynamic boat buoyancy, visual update throttling, pause and coastal ecology.
- JavaScript code splitting keeps the ~42 kB application chunk separate from the ~511 kB Three.js vendor chunk. The isolated Cloudflare Worker now caches content-hashed static assets for one year and makes HTML revalidate, with a self-test verifying exact decompressed bytes, HEAD, ETags, 404 and 405. The vendor chunk still triggers Vite's non-blocking size warning.

## Public demo

Cloudflare Worker: [beach.qs3d.site](https://beach.qs3d.site/) — independent static Worker deployment, no project DB or API credentials. Previous staging is [shoreline-sandbox-3d-stage.hikvision.workers.dev](https://shoreline-sandbox-3d-stage.hikvision.workers.dev/). The isolated **v25 preview** is [shoreline-sandbox-3d-v25-qa.mamspa.workers.dev](https://shoreline-sandbox-3d-v25-qa.mamspa.workers.dev/), and the separate **v26 preview** is [shoreline-sandbox-3d-v26-qa.mamspa.workers.dev](https://shoreline-sandbox-3d-v26-qa.mamspa.workers.dev/). See [v26 production release verification](docs/BEACH_V26_RELEASE_2026-10-29.md).

The **v27 QA Worker** is [shoreline-sandbox-3d-v27-qa.mamspa.workers.dev](https://shoreline-sandbox-3d-v27-qa.mamspa.workers.dev/). The matching [v27 production release report](docs/BEACH_V27_RELEASE_2026-10-29.md) documents staging and live verification, model limitations and a v26 rollback.

The **v28 progressive-hydraulics QA Worker** is [shoreline-sandbox-3d-v28-qa.mamspa.workers.dev](https://shoreline-sandbox-3d-v28-qa.mamspa.workers.dev/). See the [v28 production release and rollback report](docs/BEACH_V28_RELEASE_2026-10-29.md) for the verified GitHub commit, 114/114 tests and live HTTP/WebGL checks.

The **v29 stabilized hydraulics QA Worker** is [shoreline-sandbox-3d-v29-qa.mamspa.workers.dev](https://shoreline-sandbox-3d-v29-qa.mamspa.workers.dev/). See the [v29 production verification and rollback](docs/BEACH_V29_RELEASE_2026-10-29.md) documenting the original numerical instability, corrected waterline geometry and 117/117 tests.

The **v30 boat-buoyancy and water-mesh QA Worker** is [shoreline-sandbox-3d-v30-qa.mamspa.workers.dev](https://shoreline-sandbox-3d-v30-qa.mamspa.workers.dev/). See the [v30 production release verification](docs/BEACH_V30_RELEASE_2026-10-29.md), including local 120/120 QA, deployed asset hash, limitations and v29 rollback.

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
- `src/waves.js` — ocean/swash GLSL shaders sharing a wave-cycle model, repeatable breaker-front and swash run-up/retreat.
- `src/surf-spray.js` — 460 GPU-animated soft-edged droplets, divided between two consistent wave trains, generated from a procedural 32×32 alpha texture; static coast anchors and random seeds, time/wave uniforms only.
- `src/breaker-lip.js` — one GPU mesh contains two 200×9-segment curling crests with phase offsets 0 / 0.56 and relative strength 1 / 0.68; no per-frame vertex upload, two waves in one draw call.
- `src/island-state.js` — versioned, bounded save format with validation and round-trip tests.
- `src/ambience.js` — deterministic seagull animation and gesture-triggered synthesized surf/chirp Web Audio.
- `src/reefs.js` — GPU-instanced coral and reef rocks.
- `scripts/visual-smoke.mjs` — optional real-browser screenshot, JS-error and frame-timing verification using Playwright.
- `scripts/build-preview-worker.mjs` — package Vite dist into an isolated, compressed Workers staging module. Does not deploy by itself.
- `src/style.css` — UI and responsive layout.

## Performance and security

- Trees, seabirds, underwater reefs, background rocks and shells use GPU instancing (reducing hundreds of draw calls to a handful); ocean is one indexed mesh and the foam lip and spray use static buffers with GPU vertex animation. DPR starts at up to 1.65 on desktop or 1.35 on mobile, and adapts downward only after sustained low FPS, gradually returning to full sharpness if FPS recovers. Shadow map is 1024×1024.
- Scene generation is local to the browser; no login, tracking, backend or uploaded assets.
- A machine without a GPU can host the Vite dev server or built static files; GPU rendering happens on the viewer's browser/device.

## Scope

This is a visual/gameplay prototype, not a CFD fluid simulator or physically accurate coastal erosion system. Lagoon water responds to sand edits when a sculpting gesture ends, but the existing open-ocean surf wave-boundary mesh does not yet dynamically recalculate from excavation. Node tests cover geometry, coastal continuity, wave animation, save/restore validation and GLSL shader wiring.

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