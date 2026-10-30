# Beach v36 production release — 2026-10-30

## Release identity and rollback
- Feature PR: https://github.com/trinhtanphat/beach-sandbox-3d/pull/45
- Feature commit `2c0633266f56a66ac6f02e09e9d65029a8c4282a`
- Source merge main `47c977fff494baf7c506da2d3674d7ad2bec1299`
- Rollback baseline v35 main `07a6eb4988144c0854d2d324d5ca40c5dca79210`
- Production https://beach.qs3d.site/ — existing Cloudflare Worker `shoreline-sandbox-3d`, account `trinhtanphat2403`
- Isolated staging https://shoreline-sandbox-3d-v36-qa.mamspa.workers.dev/
- v36 JS `/assets/index-CyLFzdSY.js`, prior v35 `index-DVDnUR21.js`

## Reproducible physics/vegetation inconsistency

Prior v35 interactive planting checked only that ground elevation was greater than the fixed ocean-level threshold, even where a closed inland basin retained positive water above that altitude. New trees could be placed in standing water, then later be hidden on a simulation refresh. Also, when importing an island saved with trees standing in water, the saved water grid was restored before objects, but newly recreated trees were immediately visible because their visibility was not resynchronized after the object import loop.

v36 uses actual sampled inland depth for interactive tree placement: when provided, the water depth must be finite, nonnegative and **less than 0.045 stylized depth units**. Retains legacy no-depth layout callers and other land-band conditions. After importing all objects, it immediately synchronizes their visibility with the already-restored water grid, preserving hidden trees in saved data until their roots are dry again. Help text documents the dry-root requirement.

The finite-volume hydraulic solver, ocean boundary, floatable boats, Undo and portable JSON v1 save format are unchanged. There was no user-data migration or service configuration change.

## Verified acceptance
- WIN11-181 `npm run check`: **143/143 Node tests PASS**; production Vite build PASS; four static Worker bundle assets pass gzip integrity, caching, HEAD, ETag 304 and 404/405 tests.
- Pure tests cover dry inland planting, submerged trapped pond refusing trees, an exact depth threshold and invalid nonfinite input, along with existing conservation, connectivity, Undo, boat, Save/Load and shader regressions.
- Isolated staging `shoreline-sandbox-3d-v36-qa` deployed with account-scoped Wrangler dry-run; HTTPS GET 200 and new JS HEAD 200.
- Chrome staging UI E2E: imported artificially flooded land at x=-6, z=2 without a planted tree (255 visible); imported same terrain/water with a saved flooded tree (still 255); an extra Plant action at that location was correctly denied; imported a dry variant and planted a new tree (256 visible). No page JavaScript errors or failed assets. Screenshot reviewed.
- Chrome staging general WebGL: canvas 1440×900, 255 initial trees, Save/Load 19,729 terrain points, Help and mobile tools PASS with zero JS/HTTP asset errors.
- PR #45 merged, and 181 application source exactly matched GitHub origin/main before release. Production preflight confirmed Cloudflare account 2403, existing Worker target, prior deployment history and successful dry-run.
- Production deploy receipt `verifiedAccount=true,dryrun=true,deployed=true,siteOk=true,ok=true`. Independent Wrangler history readback `newDeployment=true,ok=true`.
- Independent HTTPS probes from 161 and 182: 200 HTML referencing `index-CyLFzdSY.js`; new JS HEAD 200.
- Chrome **production** wet-tree UI E2E repeated and PASS: wet saved tree hidden (255 visible), planting submerged tree refused, dry terrain planted tree visible (256), no JS/network errors.
- Chrome production WebGL, Save/Load, Help and mobile smoke PASS; 19,729 points saved, zero page/network errors.
- No GitHub Actions; no changes to DNS, tunnel, farm game, unrelated Cloudflare Workers or the user's active Windows Session 2 browser tabs.

## Limits and safe rollback
This is a stylized stabilized **2.5D diffusive-wave** island hydrology simulation, not experimentally calibrated Navier–Stokes CFD. The tree wetness threshold is a user-interface/visual rule, not a real ecological survival model. Actual physical GPU FPS and full real-world fluid fidelity have not been certified.

To roll back, create an isolated worktree from v35 main `07a6eb4988144c0854d2d324d5ca40c5dca79210`, run local Node/Vite/Worker checks, verify Cloudflare account 2403, deploy **only** existing Worker `shoreline-sandbox-3d`, and verify production HTML again references `index-DVDnUR21.js` plus Chrome smoke and new deployment readback. Do not alter DNS, tunnel or other Workers.
