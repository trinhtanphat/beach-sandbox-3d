# Beach v26 — sea-connected excavations and dynamic lagoon logic

## User-visible improvements
- Dig a low basin inland: it stays dry unless a submerged four-neighbour channel connects to the open sea.
- Dig a continuous channel to the coast: the basin now floods automatically. Building a sand dam across the channel disconnects it on the next completed sculpt action.
- The water mesh now samples the full landward coastal strip (not just the prebuilt lagoon rectangle), so new user-created inlets can visibly fill.
- The **Lagoon inlet** readout in the weather panel shows `Sea-connected` or `Inlet blocked` after land changes, Undo, Reset, or Import.
- Natural trees and newly placed trees are hidden below water once their terrain is submerged, and restored when raised back onto dry ground.
- Boats in the lagoon become hidden if their anchors are on dry/isolated land, and reappear when there is enough connected water; placing new boats requires sea-connected water.
- The Dig brush can lower inland terrain to the same bounded seabed depth as the preset lagoon (-0.258 simulation units).

## Physics and performance boundaries
- Water connectivity uses a bounded 4-neighbour flood-fill grid of 185 by 121 nodes sampled from edited terrain. Diagonal-only gaps do not transmit water. A slightly faded shoreline band is drawn *only* next to flooded nodes.
- Water level remains constant at `0.104`; effects are visually motivated, not volumetric/CFD calculations. There is no dynamic mass transport, groundwater, tide schedule, sediment conservation, or real-time backwater model.
- Rebuild is performed on sculpt completion and loading, **not** on every animation frame; the existing v24 surf shaders are unchanged.
- Old V1 save files retain terrain and placements. User exports should be kept before Reset; Reset intentionally reverts the island to the procedural default and removes placed objects.
- The full-coast surface adds roughly 22k lightweight vertices; WebGL performance depends on the device. Measure on real hardware before claiming performance improvements.

## Local validation
`npm run check` includes Node geometry tests, Vite build and isolated Worker asset integrity/ETag/HEAD tests. Target is 105/105 Node tests.

## Release safety
- Develop in `feat/beach-v26-water-physics` from the production v25 `main` head.
- Deploy a **new staging Worker** `shoreline-sandbox-3d-v26-qa` first.
- If Chrome/WebGL and HTTP checks pass, merge PR into `main`. Then update only existing production Worker `shoreline-sandbox-3d` in account 2403, leaving DNS, other projects and tunnel sessions untouched.
- Preserve v25 main commit `3d350dc4434fc24178830e79df8fd6b7d7d379d1` as rollback baseline.
