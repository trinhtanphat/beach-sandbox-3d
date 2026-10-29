# Beach v26 production release — 2026-10-29

## Scope and versions

- App: independent procedural Three.js beach sandbox; Facebook screenshot was a visual reference, no original video/third-party assets were copied.
- Feature PR: https://github.com/trinhtanphat/beach-sandbox-3d/pull/25
- Feature commit: `64ee1fbd9e1f84852e0add6ca83548b334071309`
- Main merge commit: `c6ffce7d8da655411cceba2e3c6e2e1da6efa515`
- v25 rollback baseline: `3d350dc4434fc24178830e79df8fd6b7d7d379d1`
- Cloudflare production Worker: `shoreline-sandbox-3d`, account `trinhtanphat2403`; site https://beach.qs3d.site/
- Independent preview Worker: `shoreline-sandbox-3d-v26-qa`; https://shoreline-sandbox-3d-v26-qa.mamspa.workers.dev/

## Implemented

- Four-neighbour, sea-connected flooding of low-lying terrain: excavated closed pits stay dry until a contiguous submerged channel reaches the sea. Raised sand dams cut the connection.
- Full landward-coast water surface, updated on sculpt completion, Undo, Reset, Import and Load. Existing offshore surf remains unchanged.
- Dynamic lagoon connection status; floating inland boats require enough sea-connected depth. Previously planted trees and procedural trees are hidden when submerged and restored on dry land.
- Dig tool extends down to the same bounded floor depth as preset lagoon; Save/Load v1 remains compatible.

## Acceptance and release evidence

- Local WIN11-181 `npm run check` passed **105 of 105 Node tests**, Vite build passed; 4 Worker static assets passed packaging, gzip integrity, HEAD, ETag, caching, 404 and 405 validation.
- V26 JavaScript asset: `/assets/index-BCWicTWf.js` (replaced v25 `/assets/index-M7Sl_KPF.js`).
- Before production: isolated QA Worker deployed and returned HTTP 200 for index and JS.
- Real headless Chrome on QA: WebGL2 initialized with 1440×900 canvas, `255 trees`, `Sea-connected` inlet, 19,729 terrain vertices serialized, Save/Load round trip, help dialog, mobile Tools open/close and tool selection PASS. 0 page errors and 0 HTTP asset errors.
- Production preflight: Admin account-scoped Wrangler verification PASS; code matched origin/main at release; existing production Worker had 10 listed deployment IDs; dry-run passed.
- Production deployment receipt: `deployed=true,siteOk=true,ok=true`; independent post-deploy Wrangler readback confirmed an ID absent before deployment. Deployment list is capped to the most recent 10 IDs, so do not compare counts alone.
- External HTTPS from Proxmox 161 and 182: both returned HTTP 200 and the **v26 JavaScript asset**. That asset returned HTTP 200 itself.
- Real Chrome on **production** repeated WebGL, island, Save/Load and mobile tests with zero page/HTTP asset errors.
- No DNS, tunnel, other Workers, production game or browser Session 2 changes made. GitHub Actions were not used.

## Operational boundaries and rollback

- This simulates a fixed-level coastal water connection and visual foam/ripples; it is **not** a mass-conserving water/groundwater/tide/sediment/CFD model. GPU FPS on hardware has not been benchmarked.
- If a user loads a v1 island made before the lagoon, the saved terrain is authoritative. Reset restores procedural defaults and discards unsaved changes/placed objects; export first.
- Rollback: in a separate worktree, checkout v25 main `3d350dc4434fc24178830e79df8fd6b7d7d379d1`, run `npm ci && npm run check`, build the isolated Worker, verify account `trinhtanphat2403`, deploy **only** `shoreline-sandbox-3d`, then verify public asset `index-M7Sl_KPF.js` and Chrome smoke. Preserve current v26 Worker and QA deployment until rollback is confirmed; no DNS or tunnel edits.
