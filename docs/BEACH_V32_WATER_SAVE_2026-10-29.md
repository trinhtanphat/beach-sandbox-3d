# Beach v32 — preserve trapped pond water in island Save/Load

## Reproducible physics inconsistency

The inland solver correctly retains water when a user raises a dam across the channel. But the portable island snapshot previously contained only 19,729 terrain elevations and object/settings data. Loading the **same closed pond** discarded the existing 22,385 water-depth samples and reset water to ocean-connected equilibrium. This could instantly drain a pond trapped behind an otherwise impermeable sand dam.

## Fix and compatibility
- The existing island JSON `version: 1` remains unchanged. Add an **optional** `water` float-array field holding 185 × 121 water-depth samples. The simulation persists finite nonnegative depths, validated within a bounded 0–2 stylized-units range and rounded to four decimals.
- `Save`/`Export` writes terrain + local dynamic water; `Load`/`Import` restores terrain first, then the saved hydraulic depth field, then updates the actual 3D surface, wetland metrics and tree visibility.
- Existing v1 files with **no** water field still load and use their previous equilibrium-from-sea initialization. New files must have the exact expected depth-array length; malformed or huge fluid inputs are rejected before editing the scene. Source ocean cells always reset to their safe fixed sea-level boundary.
- No change to the finite-volume flux model, ocean waves, hydraulic rate, save key or user-authentication logic.

## Tests and risk
- Simulate a sea-connected pond, raise an impermeable dam, let water settle, save, reload behind the same dam, and confirm center depth and total inland volume remain within four-decimal quantization. A legacy file without water must still open with its old behavior.
- Reject mismatched water grid lengths, negative/NaN/nonfinite or unbounded values atomically; validate independence of saved data from subsequent fluid mutations.
- Browser QA imports a representative blocked-inlet island and exercises Save/Load plus a legacy v1 import, checking visible status and real water volumes. It uses its own isolated Chrome profile, never the user's active Session 2 tabs.
- This is still stylized 2.5D diffusive-wave flow, not measured CFD. The current water grid resolution is part of snapshot compatibility; a future water-grid change needs an explicit migration or legacy fallback.
- Deploy staging Worker `shoreline-sandbox-3d-v32-qa` in a separate name. After local and WebGL QA, merge feature PR, preflight exact GitHub main and update only Worker `shoreline-sandbox-3d` in Cloudflare account 2403. Preserve prior v31 main `f2fbe48e2403fb4d58e74ff844a84c9943d9b330` for rollback.
