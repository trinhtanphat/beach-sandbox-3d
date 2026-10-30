# Beach v35 — boats float on actual inland water, including enclosed ponds

## Root cause and behavior

Before v35, an enclosed pond could retain its water after building a sand dam, but the Boat tool refused to place a boat because it also demanded a sea-connected channel. Conversely, a newly excavated sea-connected but still dry basin could be misidentified as boat-accessible by old layout rules before the separate wetness check.

## Fix
- Use the **actual local water depth** to decide if a boat may be placed on the inland surface. At more than 0.045 stylized depth units, a pond supports a boat regardless of direct sea connectivity. A dry hole remains ineligible even when its trench already connects to the ocean, until water physically arrives.
- Preserve the established offshore boat placement rules and backward compatibility for layout checks that do not provide water depth.
- When an existing inland boat is in a disconnected pond, disable horizontal tidal inlet drift while keeping the gentle vertical bobbing. Boats in connected lagoons retain existing motion.
- Preserve save/restore, full hydraulic water state, underwater trees, Undo and existing solver/geometry behavior; no DNS/tunnel changes.

## QA criteria
- Local tests for: sealed wet pond, elevated pond water, just-dug dry basin, newly connected dry pit, sea-connected flooded basin, and legacy callers; integration with conservative finite-volume flow after building a dam.
- WIN11-181 `npm run check`: 140 tests, Vite and Cloudflare Worker integrity.
- New isolated `shoreline-sandbox-3d-v35-qa` Worker, real Chrome WebGL + placement tests, then exact-main source comparison, Cloudflare dry-run, scoped deploy of `shoreline-sandbox-3d` and real production Chrome QA.
- Rollback to the v34 main `4ddc47fb203399e70e822787a21aa40a2576df21`.

## Model limitations
Water movement remains a stabilized, artistic 2.5D diffusive-wave simulation, not calibrated Navier–Stokes CFD. Floating threshold and bob amplitudes are scene units, not validated full-size boat draft specifications. This change corrects user-facing consistency between wetness and placement; it is not a complete physical-accuracy certification.
