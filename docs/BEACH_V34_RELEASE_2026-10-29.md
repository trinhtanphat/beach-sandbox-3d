# Beach v34 — hydraulic Undo production release (2026-10-29)

## Identification
- Feature PR https://github.com/trinhtanphat/beach-sandbox-3d/pull/41
- Feature commit `20031c5dc2859d844ceb308d472304db06baa606`
- Source main merge `65ff5a74e2bbce0ff347d68dca8098c40fb3dda6`
- Rollback v33 main `60a70f70e16ec07af9955497351b3ca0e9e29d86`
- Production https://beach.qs3d.site/ — existing Worker `shoreline-sandbox-3d` in account `trinhtanphat2403`
- Isolated staging https://shoreline-sandbox-3d-v34-qa.mamspa.workers.dev/
- JS `/assets/index-DILq439F.js`; prior v33 `index-CeNodyXs.js`

## Corrected behavior
Undo of Dig/Build/Rake previously restored only the 19,729 terrain vertex elevations. The 22,385-cell inland water volume was left in the *post-stroke* state, allowing cancelled canals or sand dams to leave logically inconsistent water behind.

Now the pre-stroke Undo record snapshots both height and water Float32 arrays independently. Undo validates the whole record before editing heights, restores terrain, samples the bathymetry, restores the matching saved water-depth field, and refreshes inlet status, lagoon surface, vegetation and water metrics. The open-ocean cells still obey the fixed reservoir boundary.

No change was made to the portable island Save/Load version 1 format, wave shaders, hydraulic conductance or unrelated systems.

## Verified local and live QA
- WIN11-181 `npm run check`: **136/136 Node tests PASS**, Vite build PASS and 4 Worker assets passed gzip integrity, HEAD/ETag caching and 404/405 checks.
- New tests validate independent snapshots of 19,729 height samples and 22,385 water samples; invalid history cannot mutate terrain; dam Undo restores pre-stroke inland water volume.
- Independent v34 staging Worker deployed and served HTML 200, new JS HEAD 200.
- Chrome staging full smoke: WebGL 1440×900, 255 trees, Save/Load 19,729 points, mobile tools and Help passed; no page JS or failed asset errors.
- Chrome staging real Dig + Undo: imported dammed island, paused simulation, saved exact baseline, held mouse and excavated a 76-vertex breach, inlet changed to `Sea-connected` before mouseup. Then clicked Undo: **every** terrain and water value matched the baseline saved snapshot; no errors.
- Feature PR merged; WIN11-181 source files matched the GitHub main commit before deployment.
- Cloudflare Admin preflight verified account 2403, correct Worker and successful dry-run. Production receipt `verifiedAccount=true,dryrun=true,deployed=true,siteOk=true,ok=true`.
- Independent PVE161 and 182 HTTP probes 200 with the new `index-DILq439F.js`; JS HEAD 200.
- Chrome production smoke passed real WebGL, Save/Load, mobile/Help and zero page/network asset errors.
- Independent Cloudflare deployment readback `newDeployment=true` (10-entry history limit), not just an edge cache hit.
- An additional full UI Undo integration test against **production** also PASSED: the mouse-based Dig stroke reopened the canal (76 terrain vertices), and Undo restored all 19,729 terrain and 22,385 fluid values exactly to the paused pre-stroke save; no page JS errors, process exit 0.
- No GitHub Actions, production tunnel, DNS, unrelated Workers, farm or active desktop browser Session 2 touched.

## Limits, tradeoffs and rollback
The simulation is **stylized 2.5D diffusive-wave hydrology**, not a calibrated full-CFD solution. Undo is a transaction rollback of the sand + water at the beginning of the edit: it also reverses any water that flowed during that gesture, by design. The history holds at most 18 records; capturing additional 22,385 Float32 water samples costs around 90 KB per terrain edit, bounded by that existing undo cap.

For rollback use isolated v33 main commit `60a70f70e16ec07af9955497351b3ca0e9e29d86`, run local checks and rebuild the Worker, then deploy **only** `shoreline-sandbox-3d` under account 2403. Verify public HTML references `index-CeNodyXs.js`, WebGL Chrome health and Cloudflare new deployment ID. Leave DNS/tunnels and other Workers untouched.
