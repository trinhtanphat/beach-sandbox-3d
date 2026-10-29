# Beach v28 — progressive, volume-limited inlet hydraulics

## The bug and its correction

Earlier versions used a binary connected-to-sea mask and immediately drew the entire inland basin at sea level after the user dug an opening. This appeared as instantaneous water teleportation even through long, narrow channels. A newly closed inlet could also cause the water image to disappear despite water being trapped behind a sand dam.

The new inland model is a **bounded finite-volume diffusive-wave approximation**:

- The ocean on the right acts as a fixed-elevation water reservoir. All other cells store a nonnegative water depth.
- Across each shared wet face, a potential volume exchange occurs only if the donor's local free surface is above the higher bed elevation. Flow depends on hydraulic head difference, wetted cross section and gravity-inspired velocity.
- Fluxes are budgeted against the donor's available volume before updating any cell; finite water in the landward area is conserved by transfers, except explicit exchange with the offshore reservoir.
- Newly excavated but isolated basins remain dry. Once a trench reaches the sea, the shoreline floods first and a wetting front advances into the basin. New water volume is supplied by the offshore reservoir, not created across the inland pool.
- A new raised sand dam blocks further exchange. **Existing trapped water remains** until another spillway/outlet opens; the pool no longer magically vanishes when its ocean connection is cut.
- A separate actual depth field sets each lagoon-water mesh vertex's elevation and transparency. Small depths are smoothly faded, and the mean flooded depth and area use the actual dynamic water depth, not a theoretical instantaneous sea level.
- Pause freezes hydraulic progression; simulation speed scales it with bounded fixed substeps. Recomputations are deliberately bounded for WebGL browsers.
- Save/Load JSON v1 remains unchanged. On Load/Reset, the water state initializes to an equilibrium connected-water approximation rather than attempting to store a fluid simulation snapshot, which has never been part of v1.
- Trees and boats update as the water reaches them; a newly connected but not yet wetted basin cannot immediately receive a boat.

## Physical limitations

This is a stylized **2.5D diffusive-wave** scheme, not full shallow-water Navier–Stokes/CFD. It lacks inertia, sediment erosion, spatially varying sea tide, real-world calibrated units and groundwater. Flow is conserved between terrain edits, but editing the ground displaces/removes local water, so terraforming is not a closed mass-conservation experiment. The offshore sea is an infinite fixed-head boundary reservoir.

Landward flood grid: 185 × 121. Step size: 0.06 simulation seconds, maximum 8 internal substeps per animation call. Strong wave physics offshore remain on the existing shader and are unaffected.

## Safety and validation

- Work in isolated branch `feat/beach-v28-progressive-hydraulics` created from the current main.
- Keep the previous v27 production commit `a9e3b5cf8de5b00218b489080632f2152cdedc7c` for rollback.
- Test a closed pit, opening a long channel, partial filling, an impermeable dam with trapped pond, pause/dt=0, nonnegative depths and volume conservation.
- Run `npm run check` and Chrome WebGL smoke locally against an isolated staging Worker before any production Worker mutation.
- Never change DNS, tunnel or unrelated projects. No GitHub Actions.
