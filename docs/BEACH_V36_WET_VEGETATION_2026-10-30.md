# Beach v36 — actual flooded-tree placement and import visibility

## Reproducible issue
The Plant tree tool checked only that sand was above the global sea-level threshold, not actual inland depth. An enclosed or elevated basin could hold trapped water *above* that threshold, allowing the user to place trees in standing water. Likewise, after importing a saved island whose water was restored before recreating its placed trees, newly created imported trees could be visible despite their roots being submerged. A later water refresh sometimes concealed them, but the immediate Load view was inconsistent.

## Changes
- If the caller supplies an inland water depth, Plant tree now accepts only a finite nonnegative depth less than .045 scene units, as well as existing land-distance, sand-height and world bounds. Legacy callers without a water-depth sample preserve their behavior.
- Interactive planting passes the sampled live lagoon depth. Imported objects are checked for flooding *after* the saved water and all user objects have been restored; submerged trees are retained in the file but hidden from view and tree counts, so they can reappear when water recedes.
- Help text explains that trees need dry roots, while boats can float in an enclosed wet pond.
- No change to the finite-volume water solver, offshore reservoir, WebGL shader, JSON v1 schema or object limits.

## Verification / limits
- 143 Node tests, Vite production build, packaged Worker gzip/HEAD/ETag/cache/404/405.
- Browser QA imports a dry terrain location flooded via saved inland water, checks the saved tree is hidden immediately, rejects an additional tree, then reimports the dry variant and verifies a new tree is visible.
- Staging Worker `shoreline-sandbox-3d-v36-qa` before any production change. Promote only exact GitHub main to existing `shoreline-sandbox-3d` under Cloudflare account 2403 after both browser and preflight QA.
- Previous v35 main `07a6eb4988144c0854d2d324d5ca40c5dca79210` remains the rollback baseline.
- The 0.045 stylized depth threshold is an artistic vegetation visibility rule, not a scientific soil-moisture or plant-survival model.
