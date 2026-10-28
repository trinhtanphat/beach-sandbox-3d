# Beach v25 — production release verification (2026-10-29)

## Release identity
- Source feature PR: https://github.com/trinhtanphat/beach-sandbox-3d/pull/23
- Feature commit: `e12f099da923d8898c89b7d6dee80fb4d4a3a68a`
- GitHub main merge commit: `5251c2d50c4e4e7359a31436105f42c69c543e74`
- Previous main baseline for rollback: `ab27a1b24a327409956b2c502a126e0d0843d87e` (v24)
- Cloudflare account: trinhtanphat2403; production Worker: `shoreline-sandbox-3d`
- Public site: https://beach.qs3d.site/
- Separate v25 QA Worker: https://shoreline-sandbox-3d-v25-qa.mamspa.workers.dev/
- Existing 6666-account staging and the farm game were not deployed or changed.

## What went live
- Deterministic inland lagoon excavation with a connected narrow inlet, sloped beaches and sampled bathymetry.
- Transparent lagoon-water surface with depth tint, shallow ripples, shore wash, and shared sun/wave/pause state.
- Lagoon-safe forest spawning, dry-ground planting, boat draught rule, anchored lagoon boat motion.
- Terrain-to-water refresh after sculpt commit, Undo, Reset, Load and Import.
- Existing ocean v24 surf, whitewater and return-current model retained. Version-1 local island JSON remains compatible.

## Validation evidence (WIN11-181 and independent hosts)
- Local `npm run check`: **98/98 Node tests passed**, Vite production build passed, four compressed static Worker assets passed HEAD/cache/ETag/404/405 integrity tests.
- Built app chunk: `/assets/index-M7Sl_KPF.js`; old production chunk was `/assets/index-DgcL58uf.js`.
- Unique QA Worker deployed; public QA HTML and app script returned HTTP 200.
- Headless Chrome on 181 loaded staging and production with WebGL context initialized, 1440×900 canvas, `255 trees`, no WebGL error panel, no JavaScript exceptions and no failed HTTP requests during direct page-load diagnostics.
- Desktop browser smoke generated a screenshot; its full interaction pass reported an intermittent 404-resource console warning, so a clean **full visual regression pass is not claimed**. GPU FPS on physical hardware has not been established.
- Production `beach.qs3d.site` returned HTTP 200 with the v25 chunk from both Proxmox 161 and 182; the chunk itself returned HTTP 200.
- A fresh Cloudflare deployment ID was independently observed in `wrangler deployments list` compared with pre-deploy IDs. The command wrapper reported a warning about prior Script API deployment, but the new public bundle and new deployment ID verify the update took effect.
- The production Worker name and existing public hostname were preserved; no tunnel or DNS configuration was changed.

## Rollback / caveats
- Keep v24 baseline `ab27a1b` available. Use an isolated worktree of that commit to build the v24 Worker and deploy **only** `shoreline-sandbox-3d`, after checking account `trinhtanphat2403`. Confirm the v24 chunk from the public hostname and its health. Do not switch unrelated Workers or DNS.
- Browser-local Save/Load remains authoritative: importing an old island can restore a pre-lagoon terrain. Use Reset only when the user wants to regenerate the new default shape; Reset clears in-browser placements.
- Lagoon flow and erosion are **bounded artistic approximations**, not a mass-conserving Navier–Stokes/CFD or sediment-transport solver.
