# Beach v32 release — physically consistent trapped-pond Save/Load (2026-10-29)

## Release identity
- Feature PR: https://github.com/trinhtanphat/beach-sandbox-3d/pull/37
- Feature commit: `78744a5e4a5f562dc31115f1e8d2b782acbc5e25`
- Source main merge: `ae724af752ddb1ff9e0dc271845315486870f27e`
- Rollback baseline: v31 main `f2fbe48e2403fb4d58e74ff844a84c9943d9b330`
- Public website: https://beach.qs3d.site/; Cloudflare Worker `shoreline-sandbox-3d` in account `trinhtanphat2403`
- Isolated QA Worker: https://shoreline-sandbox-3d-v32-qa.mamspa.workers.dev/
- New JavaScript bundle: `/assets/index-3uG5qE3Q.js`; previous v31: `index-5g24q2ZP.js`

## Concrete issue and fix

Before v32, a sea-connected pond remained full after closing an inlet with sand as long as the browser kept running. But saving the island to local storage or exported JSON omitted the dynamic water volumes; loading reset all water to a sea-connected equilibrium. Trapped water in the newly enclosed inland pond could suddenly vanish even though no terrain had changed.

v32 adds an optional `water` array with 22,385 bounded depth samples to the **existing v1** JSON format. Save/Export write actual depth and Load/Import restore it after the 19,729 terrain vertices. Restoring ocean reservoir cells still enforces fixed sea level, while enclosed inland water keeps its saved volume. Existing v1 save files without `water` remain compatible; they initialize with the previous sea-level equilibrium rule. Reject invalid depths, mismatched grids and unreasonable values atomically.

The new optional water array makes files somewhat larger but remains under the existing 1.6 MB import limit for normal cases. The numeric grid layout is now part of the save contract; future changes to grid dimensions require explicit compatibility/migration handling.

## Verified testing and evidence
- WIN11-181 `npm run check`: **130/130 tests pass**, Vite build PASS, packaged Cloudflare Worker passes four static asset integrity/gzip/HEAD/ETag/404/405 tests.
- Finite-volume regression: open pond → raise impermeable dam → advance water → save → load with dam still shut. Center depth and total water volume survive within the 4-decimal save quantization. Invalid water samples and wrong grid dimensions are rejected; legacy v1 saves without water remain readable.
- Isolated staging Worker HTTP 200; v32 JS asset HEAD 200.
- Chrome staging **full UI Save/Load test**: imported a walled-lagoon terrain with retained water. Visible inlet status `Dam closed · pond retained`; center water depth: 0.3139 initially, 0.3139 on Save, 0.3172 after Load and resumed simulated flow. A legacy file lacking the water field initialized the disconnected pond to depth 0. No page errors or failed HTTP assets. Screenshot reviewed.
- Chrome staging **real Dig mouse interaction**: created a modest sand dam, selected the genuine Dig tool, performed in-browser drag strokes. Seventy-six dam terrain vertices were lowered; the indicator changed from `Dam closed` to `Sea-connected`, verifying the physical canal reopened through mouse edits. The final terrain had a minimum height of -0.2206 near the breach. No JS errors. Screenshot reviewed.
- PR #37 merged into `main`; local application tree matched the exact main SHA. Cloudflare account-scope production preflight: account verified, 10 prior deployment entries, dry-run PASS.
- Production receipt: `verifiedAccount=true,dryrun=true,deployed=true,siteOk=true,ok=true`. Independent Wrangler history readback verified a new deployment ID compared with the predeploy list (provider list is capped to 10).
- Proxmox 161 and 182 each returned HTTPS 200 and the new v32 bundle hash; JS HEAD 200.
- Real Chrome production smoke: WebGL, 1440×900 scene, Save/Load, Help and mobile Tools PASS; no failed assets or JS exceptions.
- No GitHub Actions used. No DNS, tunnel, farm/other Workers, active browser Session 2 or unrelated services were changed.

## Limits and rollback

This is still an approximate, stylized 2.5D finite-volume/diffusive-wave model driven by a fixed open-ocean reservoir, **not a CFD solver with calibrated real-world units**. This change repairs fluid persistence in closed basins, not groundwater, erosion, tidal flow, GPU rendering FPS or physically accurate turbulence.

If rollback is needed, use isolated v31 main `f2fbe48e2403fb4d58e74ff844a84c9943d9b330`, run local checks, then update **only** Cloudflare Worker `shoreline-sandbox-3d` under account 2403. Independently verify public HTML references `index-5g24q2ZP.js`, Chrome WebGL and the new deployment ID. Do not alter the production tunnel or DNS.
