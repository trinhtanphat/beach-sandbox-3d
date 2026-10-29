# Beach v31 — fluid simulation time independent of low browser FPS

## Problem verified

In v30 the requestAnimationFrame loop clipped every frame delta to 0.08 seconds before calling the inland hydraulic solver and scene animation. At 3 rendered frames/second (as observed in remote headless Chrome), one second of real time advanced only 0.24 seconds of simulated water. This made sea inflow into an excavated depression appear unnaturally slow independently of hydraulic head and channel geometry.

## Implemented

- The scene uses a pure, well-tested bounded frame-time policy. For any ordinary visible frame at 3–120 FPS, accumulated simulation time follows real elapsed time (up to a safe maximum of 0.45 simulation seconds **per render call**). The inland solver continues its 0.06-second conservative fixed substeps and maximum eight steps per call.
- Simulation speed is applied to the bounded elapsed time, never to an already aggressively clipped 0.08-second frame. As a result the simulation remains more consistent when GPU frame rate degrades.
- Pause, hidden tabs and unusually long resume gaps (over 1.5 seconds) do not advance water. Large frames are clamped to avoid unbounded catch-up or renderer freezes.
- Wave animation and lagoon geometry consume a consistent simulation elapsed time, while existing sea-state smooth transitions retain their own bounded progression. No change to the original conservative flux, hydrostatic water stability, island terrain, JSON Save/Load or physics stencil.

## Measurements and scope

- Frame arithmetic tests: 3, 12, 30, 60 and 120 FPS integrate one second of elapsed time into approximately one simulated second with speed 1.
- Old observed behavior at 3 FPS: 3 × 0.08 = 0.24 simulation seconds per real second. New behavior at the same 3 FPS: 3 × (1/3) = 1.0 simulation seconds.
- At very slow (<2.22 FPS) or high-speed simulation settings the 0.45-second per-frame cap intentionally lets simulation time fall behind, rather than risking a sudden unstable jump.
- Not a real GPU benchmark or a claim that framerate improved. The model remains a stylized 2.5D diffusive-wave approximation, not full shallow-water/CFD with calibrated physical units.

## Release gate

- Run `npm run check` on WIN11-181 (125 Node tests), Vite and Worker packaging tests.
- Deploy to isolated QA Worker `shoreline-sandbox-3d-v31-qa`, inspect real WebGL screenshot and desktop/mobile Save/Load smoke.
- Merge feature PR to `main` only if checks pass. Deploy only production Worker `shoreline-sandbox-3d` in account 2403 after exact main SHA verification, independent external HTTPS checks, production Chrome smoke and Cloudflare deployment ID readback.
- Keep v30 main `66d8676444456bf3081c32f989c38c5cc65855a2` as a rollback baseline. Do not modify DNS, active tunnels, other Workers or user browser sessions.
