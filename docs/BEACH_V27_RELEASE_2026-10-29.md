# Beach v27 production release — 2026-10-29

## Release identification

- Feature PR: https://github.com/trinhtanphat/beach-sandbox-3d/pull/27
- Feature commit: `0f2dd43805428e7ee1bf3d6546c28866f94a8dcc`
- Main merge commit: `bf294662dc8718448716e8e59f3a7209646fd59c`
- Rollback baseline (previous v26 main): `5273b97bbe2e4c655c99519f0fb4e8987be58f14`
- Cloudflare account: `trinhtanphat2403`; production Worker `shoreline-sandbox-3d`
- Production hostname: https://beach.qs3d.site/
- New isolated QA Worker: https://shoreline-sandbox-3d-v27-qa.mamspa.workers.dev/
- Bundle hash: `/assets/index-HT-NFOd8.js` (prior v26: `/assets/index-BCWicTWf.js`)

## Features delivered

- Display connected inland inundation footprint and mean sampled depth in Ocean Conditions. Values are in **stylized scene units² and scene units** and have no real-world scale.
- Re-anchor placed and natural rocks against edited underwater bathymetry after Dig, Build sand, Undo, Reset and JSON Save/Load, avoiding erroneous dry-land elevation jumps.
- The Island life display counts only currently visible above-water natural/placed trees, restoring as terrain dries.
- Preserve v26 connectivity flood-fill, lagoon, anchored boats, sea state and compatibility with v1 local JSON island files.

## Checks performed on WIN11-181

- `npm run check`: 109/109 Node tests PASS, Vite build PASS, four bundled compressed Cloudflare resources passed byte equality, HEAD, ETag, 404 and 405 checks.
- Stage Worker deployed with a new isolated Worker name; HTTPS 200 for HTML and new JavaScript. Chrome headless WebGL smoke on staging: 1440×900 canvas, `255 trees`, `Sea-connected`, flooded area `14.0 units²`, mean sampled water depth `0.15 units`, Save/Load 19,729 heights, Help and mobile Tools controls PASS with no failed network assets or page exceptions.
- Feature PR #27 merged. Local file tree matched `origin/main` before upload.
- Production Admin release gate verified account 2403, existing deployment records and dry-run. Deployment receipt: `deployed=true;siteOk=true;ok=true`.
- New production deployment ID confirmed by comparing API deployment IDs against pre-release list (the list returns at most 10 records).
- HTTPS response on Proxmox 161 and 182: status 200; same exact v27 bundle. HEAD for the new JS bundle: status 200.
- Chrome production smoke verified WebGL, Save/Load, Help, desktop/mobile and zero page/network asset errors.
- Existing production tunnel, DNS, farm and other Workers were not touched. No GitHub Actions were run.

## Limits and rollback

- Model remains stylized fixed-level coastal water and visibility simulation, **not** finite-volume water mass conservation, tides, sediment transport, groundwater or physically calibrated CFD.
- Grid-sampled inland area is an approximation and should be labeled in scene units, not real-world m².
- v1 Save/Load retains user terrain/placements; exporting JSON before Reset is recommended.
- Roll back using a fresh isolated worktree at v26 main `5273b97`. Run local checks and build, then upload **only** `shoreline-sandbox-3d` under account 2403. Verify public bundle `index-BCWicTWf.js`, site health and Chrome WebGL smoke; do not change DNS or other Workers. Keep QA Worker available as reference.
