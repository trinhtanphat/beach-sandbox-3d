# Beach v30 — local floating waterline and lighter lagoon mesh updates

## Improvement
- Inland boats now float at the water surface computed from their actual local terrain elevation plus simulated water depth, instead of assuming the fixed offshore sea-level elevation. This matters for a cut-off pond or other temporary local water-level difference; the existing restrained oscillating boat bob is retained.
- The finite-volume water solver still advances in its existing 0.06 simulated-second substeps. Refresh of the full coastal 3D vertex/color/depth buffers is separately capped to approximately 10 times per simulated second while time continues, reducing full mesh attribute uploads. Edits, Load, Reset and Undo still refresh the surface immediately.
- Precompute unchanged shore masking values once at mesh construction; no repeated shoreline function evaluations or four-element temporary array allocations per dry water-grid node on every render update.
- Tests assert water physics does not lose time steps and that geometry uploads are fewer than physical steps, that boat height responds to actual pond water height, and that zero-delta/Pause is inert.

## Scope, risk and limits
- This remains a stylized finite-volume/diffusive-wave approximation, not full CFD. At lower visual frame rates the water mesh lags the solver by up to about 0.1 simulated seconds; the surface shader itself continues animating between updates.
- Rendering performance gains are unverified on physical GPU hardware; this change reduces CPU/GPU attribute update work, not Three.js scene draw calls or vendor bundle size.
- No data migration: JSON island version 1, water source, hydrostatic-stability and conservation rules unchanged. No DNS, tunnel, Session 2 or unrelated services touched.

## Acceptance
- `npm run check` locally on WIN11-181 (target: 120 tests), Vite, Worker package self-test.
- Independent staging Worker `shoreline-sandbox-3d-v30-qa`, real Chrome WebGL, desktop/mobile Save/Load and asset error checks.
- GitHub feature PR and merge, exact-main preflight, production Worker deployment and 161/182 independent HTTP readback only after staging passes.
