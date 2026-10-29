# Beach v33 — live water feedback while sculpting (2026-10-29)

## Problem
Previously, the 19,729-point terrain mesh was scanned for every Dig/Build/Rake pointer event. Although the solid terrain moved immediately, the lagoon's water grid was recomputed **only on mouseup**. A long slow excavation could appear dry until the brush was released, which contradicted the desired water behavior.

## Change
- Use `sculptGridRegion` to evaluate only the vertex rectangle overlapping the circular brush, retaining identical per-vertex height math and old limits. No global terrain scan per pointer move.
- When height is changed, refresh the coastal water model and conditions panel during the stroke at most once every 180 ms of visible wall time. The original full foam/instanced updates and final exact water refresh still run when the brush is released.
- No changes to the finite-volume numerical solver, water-volume persistence, ocean reservoir, lagoon grid, v1 island Save/Load, shaders or API.
- Sampling terrain while sculpting may cause a small delay of up to ~180 ms for water refresh at normal interactive FPS. Slow software-rendered FPS remains a separate problem.

## Acceptance
- Compare localized brush with the original full-grid formula for Dig, Build and Rake across many points, brush radii and island edges; verify results are **exactly the same** after every operation and no-op edits leave vertices untouched.
- Verify fewer than 400 terrain vertices are tested for a representative radius-0.7 stroke instead of 19,729.
- Run local `npm run check` on WIN11-181 and Chrome WebGL stage. In an isolated browser, load a sand dam, perform real Dig pointer strokes and verify the inlet becomes sea-connected **before mouseup**, then Save/Load still retains proper terrain and water.
- Deploy only a new staging Worker first; keep production v32 SHA `3a228c833b143ef888e289e0205e649a0f15b573` as rollback. Merge to GitHub main and deploy only Cloudflare Worker `shoreline-sandbox-3d` if stage and exact-account preflight pass.
