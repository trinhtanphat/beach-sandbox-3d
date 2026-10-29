# Beach v27 — seabed anchoring, flooded footprint, and visible ecosystem

## User-facing changes
- The Ocean Conditions card reports **Inland flooded area** (in stylized scene units²) and **Mean water depth** (scene units) for connected water on the landward side of the procedural shore.
- Digging or filling an inlet updates those metrics only after the sculpt gesture finishes, to avoid recomputing 22k coastal samples on every pointer event.
- Player-placed rocks and natural rocks retain seabed-aware placement after edits, Undo, Reset, Import and Load; no dry-land elevation snap after flooding.
- Natural trees and planted trees that have been submerged are excluded from the *visible* Island life count, with restored totals after the ground is raised again.

## Model scope
- The water level remains fixed at 0.104 scene units. Flooded footprint is an **approximation based on a finite grid**; mean depth and capacity use vertex samples, not a mass-conserving water simulation.
- This is a physically motivated stylized 3D sandbox, not measured real-world m², m³, tide forecasting, erosion or CFD.
- Save/Load v1 compatibility is unchanged, and no remotely stored user data is created.
- The independent Cloudflare staging Worker is tested before updating production. Preserve v26 main as rollback.

## Test intent
- Validate inland/ocean separation, disconnected/dry grid exclusion, area and volume arithmetic, invalid input handling.
- Validate seabed-anchored rock placement under different terrain heights.
- Validate updated lagoon mesh metrics when terrain becomes deeper or dry again.
