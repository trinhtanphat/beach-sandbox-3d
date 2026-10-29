# Beach v29 production release — 2026-10-29

## Release ID and rollout
- Feature PR: https://github.com/trinhtanphat/beach-sandbox-3d/pull/31
- Feature commit: `8b3833777da303283b121e563d0ea189cc9023ef`
- Source main merge: `99dde359d7486d1ce6d662d66410adb13c55b675`
- Rollback baseline, previous v28 main: `a0fdfbc5fc56cade6889deb107e92741cda1a96d`
- Production: https://beach.qs3d.site/ — Cloudflare Worker `shoreline-sandbox-3d` in account `trinhtanphat2403`
- Independent staging: https://shoreline-sandbox-3d-v29-qa.mamspa.workers.dev/
- v29 JavaScript: `/assets/index-DnM1IfQd.js`; old v28: `/assets/index-WAlnRwrn.js`

## User-visible physics bug fixed
- The old finite-volume flux formula moved too much water across faces compared with small free-surface level differences. At startup, a sampled lagoon center at ~0.313 units deep collapsed to 0 depth after 4.8 simulated seconds, even with no terrain edits. This also created visually impossible steep water triangles (~3.19 scene-unit maximum sampled delta in the diagnostic).
- The solver now clamps each face transfer to 16% of the hydraulic-head-difference cell volume in addition to existing donor-volume conservation. A hydrostatic lagoon remains almost unchanged over time, while an actually newly excavated channel still fills progressively from an external ocean reservoir.
- Dry shoreline vertices in the lagoon water mesh are placed at adjacent free-surface level for invisible vertices rather than following high dry sand. This removes upright triangles forming an apparent wall or waterfall. The water edge now clips more decisively.
- Building a submerged sandbar keeps the existing local water volume, raises its local surface pressure and redistributes it to neighbors over subsequent steps rather than deleting it. Digging does not create water.
- Dams continue to trap an existing inland pond; isolated below-sea-level holes remain dry until connected to the sea.
- Scene water statistics reflect the actual volume stored on a bounded mesh; Save/Load v1 JSON remains compatible.

## Test evidence (WIN11-181)
- `npm run check`: **117/117 Node tests PASS**; Vite production build PASS; isolated Worker bundle 4 assets passed gzip equality, HEAD, cache, ETag, 404/405.
- New regression holds the default lagoon hydrostatic for 14+ simulated seconds, rejects steep adjacent water-surface differences, and tests flat-channel equilibrium. Existing regression covers initial dry pit, progressive sea-connected trench filling, dam retention and donor-volume conservation. Sandbar-edit test conserves water without an ocean exchange.
- New QA Worker deployed with `index-DnM1IfQd.js` and returned HTTPS 200. Chrome WebGL browser smoke on staging: 1440×900, 255 trees, `Sea-connected`, ~14.0 stylized area units, ~0.15 depth units, Save/Load 19,729 heights, help/mobile controls; **no page errors or failed HTTP assets**. Screenshot inspected: the former upright inlet water wall was absent.
- Source tree matched GitHub `origin/main` before release; Cloudflare Admin preflight verified account 2403, existing Worker and dry-run PASS. Deployment receipt: `deployed=true;siteOk=true;ok=true`.
- External independent HTTPS probes from Proxmox 161 and 182 both served v29 HTML; JS HEAD 200.
- Production Chrome WebGL browser smoke repeated desktop, mobile, Save/Load, Help and page-error/network checks PASS. Wrangler post-deploy readback confirmed a new deployment ID compared with the original list.
- QA used 181 locally without GitHub Actions. Existing DNS, production tunnel, farm and other Workers were untouched. Temporary deployment scheduled tasks were cleaned after confirmation.

## Physics boundaries and performance
- The model is a **stabilized stylized 2.5D diffusive-wave/finite-volume approximation**, **not** full incompressible Navier–Stokes, turbulence/erosion simulation or experimentally validated CFD. The ocean is a fixed-head water source; scenes use arbitrary units rather than real SI lengths and times. Flow appearance is partly animated shaders and is not a calibrated velocity visualization.
- Headless Chrome using a software/remote display adapter has been observed to report around 3 FPS in this scene; this is **not** a real-hardware performance benchmark. Monitor interactive FPS and optimize geometry/GPU separately.
- Loading an old island uses its saved terrain; Reset rebuilds the current procedural default, not user-saved changes. Export JSON before Reset.

## Rollback
If necessary create a fresh isolated v28 worktree at `a0fdfbc5fc56cade6889deb107e92741cda1a96d`, run `npm ci && npm run check`, rebuild the v28 static Worker and deploy **only** `shoreline-sandbox-3d` to account 2403. Verify public HTML references `index-WAlnRwrn.js`, with HTTPS 200, real WebGL browser smoke and Cloudflare deployment readback. Leave unrelated DNS, tunnel and Workers untouched.
