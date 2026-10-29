# Beach v28 — progressive inland hydraulic release (2026-10-29)

## Release identity
- Feature PR: https://github.com/trinhtanphat/beach-sandbox-3d/pull/29
- Feature commit: `32a42ccd27ea0157f79f1bd5e442b8f2fa72908e`
- Source main merge commit: `4e059f241654fb701b5a7ee5b9a9756313b4c997`
- Rollback baseline (v27 main): `a9e3b5cf8de5b00218b489080632f2152cdedc7c`
- Production: https://beach.qs3d.site/ (Cloudflare Worker `shoreline-sandbox-3d`, account `trinhtanphat2403`)
- Isolated QA preview: https://shoreline-sandbox-3d-v28-qa.mamspa.workers.dev/
- Asset bundle: `/assets/index-WAlnRwrn.js` (prior v27: `index-HT-NFOd8.js`)

## Root issue and fix
- v27 connected ocean water to all below-sea-level terrain at once, so digging a trench seemed to teleport water throughout an inland depression.
- v28 replaces that render-only flood switch with a bounded finite-volume, diffusive-wave exchange across neighbouring wet grid faces. Flux depends on hydraulic head, wetted depth and the higher shared bed, and cannot exceed a non-reservoir donor cell's available volume.
- Water arrives gradually from the offshore reservoir. A disconnected depression stays dry until a real channel is dug. Blocking the channel stops exchange but retains the water already trapped behind the dam.
- The lagoon mesh's vertical water surface and alpha use **current depth**, not an assumed global level. Inland flooded-area and mean-depth readouts now evolve with the simulated water.
- Pause freezes hydraulic transfer. The flow module remains separate from the original v23/v24 offshore wave/current shaders. Trees and boats react to actual local water depth.
- Save/Load and Reset retain backward-compatible v1 island JSON and initialize connected ocean water to equilibrium when loading; in-progress water simulation state itself is not saved.

## Verified acceptance
- WIN11-181 `npm run check`: **114/114 tests PASS**, Vite production build PASS, 4 Cloudflare static resources verified for compression bytes, ETag, HEAD, cache behavior, 404/405.
- New regression tests: disconnected pit stays dry; long trench fills progressively; dam retains pond; donor-volume-limited transfer conserves water away from ocean source; nonnegative finite depths; Pause/dt=0 freezes water.
- Separate `shoreline-sandbox-3d-v28-qa` Worker deployed, returned HTTP 200 for HTML and new JavaScript bundle.
- Headless Chrome staging: WebGL2 initialized, 1440x900 canvas, 255 trees, lagoon controls, Save/Load 19,729 terrain heights, Help and mobile tools PASS; no JavaScript exceptions or failed HTTP asset requests.
- Feature PR merged into main. Source tree on 181 matched `origin/main` before deploy.
- Cloudflare Admin release preflight confirmed correct account, existing `shoreline-sandbox-3d` Worker, and successful dry-run. Deploy receipt: `deployed=true,siteOk=true,ok=true`.
- Independent Wrangler deployment readback: a new deployment ID compared with pre-deploy records; list is capped to ten records.
- Proxmox 161 and 182 both received HTTP 200 HTML referencing the **v28 bundle**; JS HEAD 200.
- Headless Chrome production verification passed WebGL, Save/Load, Help, mobile layout and no failed JS/network resources; readouts at default island: 11.2 scene units² flooded, 0.18 scene units mean depth. These are not physical SI units.
- DNS, production tunnel, other Workers, farm and current desktop tabs were unchanged. QA used local 181; GitHub Actions were not run.

## Modeling limits and rollback
- This is **stylized 2.5D diffusive-wave** simulation, not calibrated full Navier–Stokes or CFD. The ocean is an infinite constant-head boundary. There is no groundwater, turbulence inertia, tidal forcing, explicit erosion or physically calibrated meter/second. Flux is conservative between edits; terraforming can displace/remove local water, so the entire editing experience is not a closed mass-conservation experiment.
- If rollback is required, create an isolated worktree from v27 main `a9e3b5c`, run npm checks, build the previous Worker package, deploy **only** `shoreline-sandbox-3d` in account 2403, and verify `index-HT-NFOd8.js` at the public hostname with real Chrome. Do not change DNS, tunnel or unrelated Workers.
