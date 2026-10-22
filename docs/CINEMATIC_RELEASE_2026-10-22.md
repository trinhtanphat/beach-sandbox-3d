# Cinematic Shoreline public release — 2026-10-22

## Reference / scope

- User supplied a Facebook reel screenshot of a rectangular 3D tropical island diorama with shoreline surf and a beach editing UI.
- Original, procedural reconstruction; no extracted Facebook video frames, proprietary website assets, copyrighted music, or audio files are embedded.
- Repo: `trinhtanphat/beach-sandbox-3d`.
- Isolated Cloudflare Worker: `shoreline-sandbox-3d`, account `trinhtanphat2403`.
- Public custom hostname: https://beach.qs3d.site/.
- This domain is independent of the previous Cloudflare Workers staging demo and the farm/game websites.

## Implemented

- Layered coastward wave fronts, foam ribbons and streaks, bright light caustics, submerged reef shadows, wet swash, white-crested shoaling surf.
- 14 deterministic seagulls flapping above the coast, with a single batched draw call.
- Synthesized ambient ocean noise and occasional bird calls (Web Audio, requires gesture to start and offers volume / on-off control).
- Time-of-day sunlight adjustment, blue rim lighting, warmer sunset color and brighter warm-neutral atmosphere.
- GPU instanced 25 palm trees along the curved coast and 360 colorful submerged reefs; scene still includes 840 forest trees, rocks, shells and boats.
- Existing sandbox tools, Save/Load, portable JSON import/export, pause/speed, screenshot, Undo and responsive Tools control stay available.

## Testing completed

- `node --check src/ambience.js`, `src/reefs.js`, `src/palms.js`, `src/main.js`: PASS.
- `npm run check`: 21/21 Node tests PASS and Vite production build PASS.
- `node scripts/build-preview-worker.mjs`: successfully packed three static files into a standalone self-contained Worker module.
- Cloudflare Worker upload succeeded and custom domain API attached hostname with active certificate reference.
- Windows 181 external HTTPS GET: 200 OK.
- Cloudflare Browser Rendering desktop screenshot: WebGL island scene rendered with palms, ocean and the controls; DOM reported 840 trees and 14 flying seabirds. No WebGL error panel.
- Cloudflare Browser Rendering mobile screenshot: viewport 390x720, compact toolbar, daylight card, island and coast visible.
- Headless software rendering is slow (around 2 FPS); do not extrapolate to physical GPU hardware.
- Browser audio playback requires an actual user gesture; a screenshot or HTTP check is **not** proof of audibility. Requires physical-browser listening test.
- Vite reports a non-blocking JS bundle size warning (>500 kB).
- Subjective visual similarity to the reel must be evaluated visually; no unsupported "pixel-perfect" claim.

## Release and rollback

- Feature branch: `feat/shoreline-cinematic-audio-birds`. Merge with a PR after passing checks.
- Backup release commit: `a1ac4c3ca2c0eb9c4edfeb8351f1921c03534b98`.
- To roll back, checkout the previous commit in a separate clean worktree, run `npm run check` and rebuild the isolated Worker; do not modify unrelated Workers or DNS.
