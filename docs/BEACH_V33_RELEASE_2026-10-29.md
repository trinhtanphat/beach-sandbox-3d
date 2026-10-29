# Beach v33 production release — 2026-10-29

## Identity
- Feature PR https://github.com/trinhtanphat/beach-sandbox-3d/pull/39
- Feature SHA `0ab4b6d8a4d9cd9abfe52e19e02f21fd9f9bfa6e`
- Source merge commit `8bdf3cbba5c856014bcc54864c125a51f5fd1732`
- Rollback baseline: v32 main `3a228c833b143ef888e289e0205e649a0f15b573`
- Production URL https://beach.qs3d.site/; Worker `shoreline-sandbox-3d` in Cloudflare account `trinhtanphat2403`
- Independent staging Worker: https://shoreline-sandbox-3d-v33-qa.mamspa.workers.dev/
- v33 JS bundle `/assets/index-CeNodyXs.js` (previous v32 `index-3uG5qE3Q.js`)

## Improvement
- Before this release, Dig, Build sand and Rake scanned **19,729 terrain vertices** for each pointer movement; the water connectivity and surface only updated after releasing the mouse. Long excavation strokes looked dry until mouseup.
- Localize brush work to a bounding rectangle around its radius. Preserve **exact same height change, brush falloff and clamps** as v32 for all three tools. A representative radius-0.7 brush visits fewer than 400 candidate vertices.
- Refresh the simulated water surface, flooded metrics and inlet connectivity during continuous strokes, throttled to one update per 180 ms. The existing full foam/instanced geometry refresh still runs when the gesture ends.
- No change to the finite-volume solver, ocean source, water persistence, v1 Save/Load, ocean wave shaders or user data.

## QA and acceptance
- On WIN11-181, `npm run check`: **133/133 tests PASS**, Vite production build and Worker static asset checks for compression, byte integrity, HEAD, ETag, 404/405 PASS.
- Localized brush regression compared the entire modified 181×109 terrain height field **exactly** to the old full-grid loop after multiple strokes for Dig, Build sand and Rake at different radii and inland, shoreline and boundary points; validation failures are atomic.
- Separate v33 staging Worker deployed and HTML/JS HTTP 200/HEAD 200.
- Real Chrome staging browser Dig test imported a closed sand dam, held the mouse and excavated 76 terrain points. The inlet status changed to `Sea-connected` **before pointerup**, satisfying an explicit assertion. No JS errors. Screenshot archived locally in isolated QA workspace.
- Chrome staging generic smoke: WebGL initialized, 1440×900 canvas, 255 trees, Save/Load 19,729 terrain points, Help and mobile tools PASS, no JavaScript exceptions or failed HTTP assets.
- PR #39 merged into main; compared local application source tree with exact main SHA before upload.
- Cloudflare Admin preflight verified target account, Worker identity and dry-run; production receipt confirmed `verifiedAccount=true,dryrun=true,deployed=true,siteOk=true,ok=true`.
- Production publicly served the new JS chunk from Proxmox 161 and 182, HTTP 200.
- Chrome **production** smoke confirmed WebGL, Save/Load, Help, mobile UI and zero page/asset errors.
- Independent Wrangler deployment readback compared the provider's 10-entry history with the predeploy snapshot and confirmed `newDeployment=true`, `ok=true` at 15:15 local time.
- No GitHub Actions or changes to production tunnel, DNS, farm, unrelated Workers or active Session 2 tabs.

## Known model limitations and rollback
- Water physics remain a stabilized, stylized 2.5D diffusive-wave approximation driven by a fixed-head open-ocean reservoir, not calibrated real-world CFD. The v33 change targets interactive fidelity and brush CPU work, not a measured GPU FPS gain.
- Browser headless or software-rendered FPS observed near 3–4; treat as a QA rendering constraint, not a benchmark for the workstation's actual GPU.
- Rollback: create an isolated v32 worktree at `3a228c833b143ef888e289e0205e649a0f15b573`, run local checks, update only the existing `shoreline-sandbox-3d` Worker under account 2403, and verify `index-3uG5qE3Q.js` together with Chrome WebGL health. Do not alter DNS, tunnel or unrelated Workers.
