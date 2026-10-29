# Beach v30 production release — 2026-10-29

## Identity
- Feature PR: https://github.com/trinhtanphat/beach-sandbox-3d/pull/33
- Feature commit: `1e0aca1969c13407b044fefcdd5eb5146ee57804`
- Main merge commit: `dd65f0a73deb6193a054d5c4de5dfacbc5ad17d6`
- v29 rollback baseline: `4c185eb68d536df4fc88c29563427afd20ad8810`
- Production https://beach.qs3d.site/ — existing Cloudflare Worker `shoreline-sandbox-3d` in account `trinhtanphat2403`
- v30 independent QA https://shoreline-sandbox-3d-v30-qa.mamspa.workers.dev/
- Production asset `/assets/index-BPfWG0PS.js` (previous v29 `index-DnM1IfQd.js`)

## Changes
- Inland moored boats use the locally sampled water depth plus current terrain bed height for their rendered buoyancy, rather than the offshore sea-level constant. This handles temporary inland level differences and retains small oscillatory boat motion.
- The inland finite-volume hydraulic solver keeps its 0.06-scene-second steps independent of the water mesh GPU geometry update cadence (approximately 10 updates/s). An edit, Undo, Reset and Load immediately refreshes the water surface. The water shader ripples are animated independently as before.
- Static shoreline opacity data is computed once during geometry initialization, and per-dry-node neighbour-array allocations were removed. This reduces geometry refresh CPU churn, but does **not** establish a measured real-GPU FPS increase.
- No change to hydraulic boundary conditions, v29 stabilizing head flux limiter, fixed ocean reservoir or JSON island v1 save format.

## Acceptance and deployment evidence
- On WIN11-181: `npm run check` **120/120 tests pass**, production Vite build passes, 4 Worker asset bundle tests pass for gzip integrity, HEAD, ETag, caching, 404 and 405.
- Tests cover boat buoyancy changing with local depth, Pause invariance, fixed-step solver rate independent of fewer mesh updates, and immediate refresh after sculpt.
- New isolated staging Worker `shoreline-sandbox-3d-v30-qa` passed Cloudflare account verification, dry-run and deployment. HTML HTTP 200 and v30 JavaScript HEAD 200.
- Headless Chrome staged smoke: WebGL 1440×900, 255 visible trees, `Sea-connected` lagoon status, flooded area 14.0 scene units² and depth 0.15 scene units, 19,729 terrain points Save/Load, Help and mobile tools PASS; no page errors or failed HTTP assets. Screenshot visually inspected for the absent previous vertical water-wall regression.
- Feature PR merged into main and 181 source tree matched `origin/main`. Preflight confirmed the intended account and exact Worker, and Wrangler dry-run succeeded.
- Production Worker deployment receipt `deployed=true, siteOk=true, ok=true`; fresh deployment ID confirmed independently in Wrangler history compared with predeploy IDs.
- Proxmox 161 and 182 returned HTTP 200 HTML referencing `index-BPfWG0PS.js`; JS HEAD 200. Production Chrome WebGL, Save/Load, Help, mobile QA passed with no JavaScript or asset errors.
- No GitHub Actions, DNS, tunnel, browser Session 2, farm or unrelated Workers modified.

## Limitations / rollback
- Water is a stylized stabilized 2.5D diffusive-wave approximation, not calibrated Navier–Stokes CFD or physical sea tides. Scene units are not SI.
- The remote/headless Chrome used in QA was observed to show low FPS (~3), which is not a physical-GPU benchmark. Only CPU update frequency was reduced; no hardware FPS improvement is claimed.
- To roll back, build and validate v29 from isolated commit `4c185eb68d536df4fc88c29563427afd20ad8810`, verify Cloudflare account 2403, deploy **only** Worker `shoreline-sandbox-3d` and check public index references `index-DnM1IfQd.js` plus fresh WebGL smoke and deployment readback. Do not change DNS or the tunnel.
