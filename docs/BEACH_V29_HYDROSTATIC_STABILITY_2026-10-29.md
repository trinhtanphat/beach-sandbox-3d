# Beach v29 — hydraulic stability and continuous free surface

## Diagnosed regression
A visual screenshot from v28 showed a dark lagoon next to an apparent vertical water wall at the inlet. A reproducible numerical benchmark confirmed that the default basin lost all its water at the center within 4.8 simulation seconds even without user editing: the center started at a depth of ~0.313 scene units and fell to 0, with hundreds of nonphysical steep surface gradients.

The finite-volume solver transferred too much volume across each grid face relative to the small height difference. This is a numerical stability/Courant problem, not a shortcoming that can be solved by increasing flow speed.

## Fixes
- Clamp face flux to a bounded fraction (16%) of the pairwise hydraulic-head difference expressed as a cell volume. The donor's available volume remains a separate hard limit; the offshore boundary remains a constant-head reservoir.
- Still respects physically open, submerged channels; no flow over an impermeable elevated sill. An isolated excavated pit remains dry until connected. A dam traps its existing water.
- For the lagoon's water mesh, **dry sand vertices with zero wetness render at adjacent waterline elevation**, never at their physical sand elevation. This prevents opacity-interpolated triangles from forming vertical sheets or an artificial waterfall along the waterline. Dry sand is still rendered by the underlying solid terrain mesh.
- Fade transparent edge fragments more decisively to avoid a sheet of water over dry land.
- Raising the bed with Build sand keeps the existing water-column volume rather than destroying it; the resulting higher free-surface head pushes water to lower neighbours. Lowering the bed does not generate water.
- Regression tests hold a default lagoon at hydrostatic equilibrium for 14+ s, verify no vertical water walls, and check volume conservation after editing an underwater sandbar, without breaking progressive excavation filling.

## Limitations
This remains a stabilized 2.5D diffusive-wave water model, not real-time full Navier–Stokes. The free surface can change in newly flooded depressions and remains driven by an external ocean reservoir. Full ocean wave crests and inland lagoon flow are separate artistic layers, and this work preserves their current simulation boundaries. Units are stylized, not SI.
