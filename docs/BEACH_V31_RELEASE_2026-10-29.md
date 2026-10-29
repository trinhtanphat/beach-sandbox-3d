# Beach v31 production release — 2026-10-29

## Version and deployment identity
- Feature PR: https://github.com/trinhtanphat/beach-sandbox-3d/pull/35
- Feature commit: `100fd44f48d806433d6bc83e0d7cc11fea1644b8`
- Source main merge: `db00fa822645a649d738fb35ea32473974fac933`
- Rollback baseline (previous v30 main): `66d8676444456bf3081c32f989c38c5cc65855a2`
- Production: https://beach.qs3d.site/ — Cloudflare Worker `shoreline-sandbox-3d` in account `trinhtanphat2403`
- Isolated staging: https://shoreline-sandbox-3d-v31-qa.mamspa.workers.dev/
- v31 JavaScript: `/assets/index-5g24q2ZP.js` (previous v30: `/assets/index-BPfWG0PS.js`)

## Bug addressed
Previous v30 code clipped the `requestAnimationFrame` delta to 0.08 s *before* the hydraulic solver and island time progression. At 3 FPS, one actual second moved water only 0.24 simulation seconds, slowing apparent inlet filling and making water appear to respond inconsistently to real elapsed time.

v31 introduces a shared frame-simulation timing policy that advances a bounded real elapsed interval (up to 0.45 scene seconds per render), retaining conservative 0.06-second hydraulic substeps (maximum eight per call). 3, 12, 30, 60 and 120 FPS reproduce approximately one second of simulated time per visible second when simulation speed is 1. Paused/hidden frames and long suspended-tab gaps over 1.5 seconds do not cause delayed fast-forward. High speed or very low FPS intentionally caps simulation progress to protect stability.

This is **not a physics-engine rewrite**, nor a claim that GPU rendering FPS improved. The hydrology remains a stabilized, stylized, fixed-ocean-boundary 2.5D diffusive-wave model; still not measured physical CFD. The existing v29 flood stability, v30 local boat flotation and JSON v1 save format are unchanged.

## Verified QA
- WIN11-181 `npm run check`: **125/125 Node tests passed**, Vite production build passed, isolated Cloudflare Worker bundle 4 static resources passed gzip integrity, HEAD, ETag/cache, 404/405 checks.
- Added test vectors: 3, 12, 30, 60, 120 FPS timing, Pause/hidden/long suspends and safety caps, plus an actual inland fluid solver scenario where a dry enclosed basin stays dry until a sea trench opens and then fills progressively at 3 FPS.
- Independent Worker `shoreline-sandbox-3d-v31-qa` created/deployed after Cloudflare account-scoped dry-run; HTTPS index HTTP 200 and new JavaScript HEAD 200.
- Chrome staging WebGL2 smoke: canvas 1440×900, 255 visible trees, `Sea-connected`, ~14.0 scene units² flooded land, ~0.15 scene units mean depth, Save/Load 19,729 terrain heights, Help and mobile Tools PASS, no page JS errors or failed assets. Screenshot inspected and no vertical lagoon water wall observed.
- Feature PR #35 merged into main; WIN11-181 source tree identical to `origin/main` for checked application paths. Preflight confirmed Cloudflare account 2403, existing Worker, correct bundle and dry-run passed.
- Production Cloudflare deployment result `verifiedAccount=true,dryrun=true,deployed=true,siteOk=true,ok=true`.
- Proxmox 161 and 182 returned HTTPS HTTP 200 HTML referencing the new `index-5g24q2ZP.js`, and JS HEAD returned HTTP 200.
- Chrome production WebGL, Save/Load, Help, mobile QA passed, with zero browser JS and HTTP asset errors.
- Independent Wrangler history readback confirmed **a new deployment ID** versus pre-release. The history response caps the record count at 10.
- GitHub Actions not used. Existing DNS, production tunnel, farm/other Workers and user Chrome Session 2 were not modified.

## Known limits and rollback
- Remote/headless Chrome uses a software/limited graphics path and showed ~2–3 FPS in this scene. The v31 simulation clock now follows real time better under that load, but GPU draw performance remains low and is not benchmarked on the physical GPU.
- At FPS below about 2.22 or high simulation speed, the 0.45-second per-frame cap may still slow simulation relative to wall-clock time by design. An abrupt browser suspension >1.5 seconds causes no catch-up.
- Water is not a full physically calibrated CFD/shallow-water model; no sediment, infiltration, real ocean tides, or measured SI units.

Rollback: checkout previous v30 main `66d8676444456bf3081c32f989c38c5cc65855a2` into a separate worktree; locally run `npm ci && npm run check`, create Worker bundle, confirm account `trinhtanphat2403`, deploy **only** existing Worker `shoreline-sandbox-3d`, and verify public JS `index-BPfWG0PS.js` plus Chrome WebGL QA and new Cloudflare readback. Do not change DNS or tunnels.
