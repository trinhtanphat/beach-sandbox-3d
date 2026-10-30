# Beach v35 production release — 2026-10-30

## Version and deployment
- Feature PR: https://github.com/trinhtanphat/beach-sandbox-3d/pull/43
- Feature SHA: `56eed489246f218168ad3be1fb4da87ced30df5a`
- Source main merge: `804405849cdc5a58a13797df4d7cf61206cd9eec`
- Rollback baseline: v34 main `4ddc47fb203399e70e822787a21aa40a2576df21`
- Production: https://beach.qs3d.site/, Cloudflare Worker `shoreline-sandbox-3d` in account `trinhtanphat2403`
- Isolated staging: https://shoreline-sandbox-3d-v35-qa.mamspa.workers.dev/
- New JS bundle: `/assets/index-DVDnUR21.js` (previous: `index-DILq439F.js`)

## Root cause and change

Existing 2.5D inland fluid simulation retains real water volumes after an inlet is blocked by sand. An existing boat stayed floating in the newly enclosed pond, but the **Place boat** tool refused a new boat because it required a *sea-connected* path, ignoring the stored local water depth.

v35 uses actual dynamic water depth when determining inland boat placement: an enclosed pond with more than 0.045 stylized water-depth units accepts boats; a dry excavated hole does not; a newly connected but not-yet-flooded inlet likewise cannot accept a boat before water actually arrives. Legacy world-layout callers without actual water-depth input remain supported, and open-ocean boat placement remains unchanged.

Inland boats behind a dam cease simulated horizontal tidal inlet drift, while retaining subtle vertical bobbing and their correct local waterline. This is not full physical buoyancy/turbulence CFD.

## QA evidence

- Local WIN11-181 `npm run check`: **140/140 Node tests PASS**; Vite production build PASS; 4 Cloudflare Worker static assets pass gzip-byte consistency, cache, HEAD, ETag 304, 404/405.
- New tests: wet enclosed pond accepts boat; water above global sea reference on raised terrain still counts; blocked dry pit refuses; connected dry pit refuses; newly wetted open area accepts; historical layout defaults and offshore rules remain; test integrates actual diffusive-wave pond retained after building a sand dam.
- Isolated QA Worker `shoreline-sandbox-3d-v35-qa` deployed, HTML and JS HEAD HTTP 200.
- Chrome staging Boat tool E2E: imported a damped/blocked inlet state, placed **one** new boat in the enclosed wet lagoon; imported identical dry blocked depression, **zero** new boats; imported open but not-yet-flooded basin, **zero** new boats. No page JS errors or failed HTTP assets. Screenshot shows extra boat at the lake with `Dam closed · pond retained`.
- Chrome staging full smoke: WebGL2 running 1440×900, 255 trees, Save/Load 19,729 terrain heights, Help and mobile tools passed, zero page/asset errors.
- Feature PR #43 merged. Source tree at WIN11-181 matched exact GitHub main SHA before release; scoped Cloudflare Admin preflight verified account, existing `shoreline-sandbox-3d` Worker and successful dry run.
- Production Cloudflare result `verifiedAccount=true,dryrun=true,deployed=true,siteOk=true,ok=true`. Independent Wrangler deployment readback `newDeployment=true,ok=true` from its ten-entry history.
- Independent HTTPS checks from Proxmox 161 and 182: HTTP 200 HTML referencing `index-DVDnUR21.js`; JavaScript HEAD 200.
- Chrome production Boat tool E2E repeated and passed one wet-pond boat, no dry-pit boats, no JS or HTTP asset errors, exit 0.
- Chrome production full WebGL/Save/Load/mobile smoke passed with zero JS/asset errors.
- No GitHub Actions, active desktop browser Session 2, DNS, existing tunnel, farm or unrelated Workers were changed.

## Known limitations and rollback

The simulator remains a stylized 2.5D bounded diffusive-wave model with a fixed-head ocean reservoir; it is not a mass-calibrated Navier–Stokes CFD system. Boat water draft and drift are in stylized units; a full real-world buoyancy engine or measured real-GPU FPS validation is outside this release. Chrome headless FPS on 181 has been low and should not be conflated with physical-GPU performance.

Rollback: build/test the isolated v34 main SHA `4ddc47fb203399e70e822787a21aa40a2576df21`, deploy only Cloudflare Worker `shoreline-sandbox-3d` in account 2403, and confirm the public index references `index-DILq439F.js` together with fresh Chrome WebGL and Cloudflare deployment readback. Never change DNS, tunnel or other Workers during rollback.
