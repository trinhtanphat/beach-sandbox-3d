# Staging acceptance — 2026-10-22

## Scope

Repository: `trinhtanphat/beach-sandbox-3d` on Windows 181.
Baseline: `167800463f3f562043ad36e8739f8cc3847720fd` on `main`.
Dedicated preview: https://shoreline-sandbox-3d-stage.hikvision.workers.dev/
Cloudflare account: 6666; Worker: `shoreline-sandbox-3d-stage`.
This preview is not a custom-domain production deploy.

## Work performed

1. Use shared GPU geometry and materials for user-placed trees, rocks and boats.
2. Instance the approximately 90 decorative rocks and up to 325 shells (5 draw-call groups rather than separate mesh submissions).
3. Resample foam, forest, rocks and shells after terrain brush changes, undo, reset and island import.
4. Add portable JSON Export / Import controls alongside browser-local Save / Load.
5. Limit newly placed interactive objects to 400; retain the original versioned save format.
6. Reduce DPR cap to 1.45 and shadow map to 1024 x 1024; avoid representing these software-rendered results as a hardware benchmark.
7. On narrow screens, show a collapsible Tools button to keep the sea visible and separate the bottom tool control from the simulation controls.
8. Add isolated `scripts/build-preview-worker.mjs` to gzip-build Vite assets into a standalone staging Worker. The generated Worker is gitignored.

## Evidence

- Node-side test suite: 18 passing, 0 failing.
- `node --check src/main.js`: pass.
- `node --check scripts/visual-smoke.mjs`: pass.
- `npm run build`: pass; current Vite bundle still reports a non-blocking >500 kB chunk warning.
- Cloudflare staging Worker upload: HTTP 200.
- Windows 181 external staging URL probe: HTTP 200.
- Cloudflare Browser Rendering real page snapshot: 3D scene visible; `life-count` = `840 trees`, no WebGL error panel.
- Cloudflare Browser Rendering scripted Save / Load interaction: pass; local snapshot contains 19,729 terrain vertices.
- Cloudflare Browser Rendering mobile interaction: pass; Tools button opens and closes after tool selection; 13 px gap between Tools and bottom control bar at 390 px viewport width.
- Software/headless renderer reported only a few FPS (varied by viewport and render pass). Do not present these figures as performance on GPU-equipped devices.

## Remaining release blockers

- Confirm hardware WebGL2 FPS and shader quality on a real GPU device (e.g. user's local desktop). Windows 181 currently exposes Microsoft Remote Display Adapter / Microsoft Basic Display Adapter.
- Run complete automated visual smoke on an actual browser with Playwright if installed.
- Improve the visual resemblance to the user's reference shot using manual screenshot comparison.
- No custom DNS change and no production traffic cutover performed.

## Rollback

Git rollback reference: `1678004` (do not force-reset a dirty checkout).
The staging Worker is isolated from all other sites; redeploy the previous dist if an urgent preview rollback is needed. Do not touch existing farm/game Workers.
