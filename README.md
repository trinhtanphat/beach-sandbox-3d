# Shoreline — living 3D beach sandbox

A standalone, interactive, real-time beach sandbox, inspired by a reference screenshot but implemented independently with custom procedural content.

![Three.js](https://img.shields.io/badge/Three.js-WebGL-159f9a) ![Vite](https://img.shields.io/badge/Vite-7-ffad80)

## Features

- Original 3D diorama with curved sandy shoreline, forest of 840 procedurally placed trees, rock reefs and sailing boats.
- **Animated surf v2**: shoreward-travelling wave trains, shallow-water crest steepening, turbulent breaking foam, sunlight caustics, run-up and retreating swash generated in GLSL. No static water background, external textures or paid assets.
- **Continuous coastal bathymetry**: sea floor now joins the beach without a vertical seam; surf overlays the sloped shore.
- Editor raycasts against the actual terrain surface. Newly placed trees and rocks follow the deformed land when sculpted.
- Dynamic sun, time-of-day display and wave-height/simulation-speed controls.
- Orbit, zoom, build sand, dig, rake, plant a tree, add rocks, launch a boat, erase, undo and reset.
- Mobile/desktop adaptive overlay UI and keyboard shortcuts 1–8, Space, Ctrl+Z.
- Repeatable terrain/vegetation generation with deterministic randomness.

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
- `src/style.css` — UI and responsive layout.

## Performance and security

- Trees use GPU instancing, water is one combined indexed mesh, pixel ratio is capped at 1.8.
- Scene generation is local to the browser; no login, tracking, backend or uploaded assets.
- A machine without a GPU can host the Vite dev server or built static files; GPU rendering happens on the viewer's browser/device.

## Scope

This is a visual/gameplay prototype, not a CFD fluid simulator or physically accurate coastal erosion system. Sand edits do not yet feed back into the wave boundary; tree instancing is fixed after terrain edits. Node-side tests cover geometry, smooth coastal continuity, wave movement, wave amplitude and GLSL shader wiring. The Vite build passes, but a **real browser WebGL render, visual comparison and FPS audit are still required** before claiming production-grade visuals. On the Windows 181 service session, Microsoft Edge headless exited with code 1002; HTTP 200 is not proof that the GPU output is correct.