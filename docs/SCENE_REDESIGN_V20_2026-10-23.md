# Scene redesign v20 — coherent beach, ecology and ocean geometry
Date: 2026-10-23

## Goal
Revisit the user-provided beach diorama reference as a coherent natural environment rather than adding disconnected shader effects. v19 production is the rollback baseline. The rebuild preserves editing, saves, sound, birds, waves and mobile controls.

## Diagnosis from actual v19 browser screenshot
- **Overcrowded forest:** 840 relatively large crowns made a solid green mass on the left side, obscuring sand.
- **Conflicting biomes:** forest, reefs, rocks and player-planted items used unrelated distance checks and could intrude into surf or sit too high above seawater.
- **Harsh water colors:** nearshore turquoise shifted to abrupt, dark-blue outer water, visually dividing the diorama.
- **Bright rock artifacts:** underwater reef stones were sometimes positioned near the surface and read as floating white boulders.
- **Scene readability:** UI panels at desktop resolution occupied unnecessary horizontal space; startup wave height was too low to show the intended surf.

## Rebuilt world rules
- New pure `src/world-layout.js` defines **COASTAL_ZONES** for water overlap, landward swash, seaward swash, planting, natural forest, boat distance and coral distance. The same constants are used by main world geometry, reef scatter, the wave crest and foam spray.
- Natural tree scatter uses deterministic occupancy separation and woodland patches, with **255 modestly sized trees**, at least 0.39 world units apart, no natural trees within 2.10 world units of shoreline. The forest remains lively, but the open sand belt is broader.
- Underwater coral and rocks use `submergedCenter` to stay below the ocean surface. Reef batches still use instancing, capped at 360 objects.
- Player-placed trees now require land at least 1.05 units inland. Boats require at least 0.45 units offshore. Rocks can be placed on land or as submerged stones, anchored to corresponding terrain. All placements are bounded to the island board.
- Ocean water colors now progress through a single shallow-to-shelf gradient. Alpha was lowered to 0.78 so seabed detail is visible; underwater terrain colors, forest greens and scene lighting were adjusted accordingly.
- Start wave height now **1.0 m** instead of 0.6 m, and HTML label/input values match application state.
- Desktop floating panels were narrowed/shifted to leave more of the island visible. Mobile panel behavior stays unchanged.
- Saved island JSON structure and 19,729 terrain vertices remain compatible with previous schema. The procedural default vegetation layout is intentionally different; personal user-placed trees/rocks and terrain edits are preserved on reload.

## Acceptance
- **78/78 automated tests PASS** with the world plan, coral/rock submersion, coherent coastal bands, terrain and interactive-placement boundaries, and preexisting wave/audio/save/UI logic.
- Vite production build PASS; all four packaged Cloudflare Worker resources verified against decompressed files, HEAD, ETag/304 in local Worker simulation, 404/405.
- Isolated staging: https://shoreline-sandbox-3d-stage.hikvision.workers.dev/; browser screenshot inspected at 800×510. New landscape visibly has a more open coastline and a unified ocean palette.
- Cloudflare Browser Rendering desktop WebGL initialized; no fallback. 255 natural trees and 14 flying seabirds reported.
- Mobile 390×720 controls PASS on the earlier v20 staging revision: open Tools, adjust wave to 1.2 m / foam to 160%, select Plant, Tools auto-collapses; no WebGL fallback. The last check after consolidating shared coast constants was rate-limited (Cloudflare HTTP 429), although no mobile UI files or event handlers were changed since the successful run. Final-release mobile visual QA remains a qualification.
- Browser-local Save/Load PASS with localStorage key `shoreline.island.v1`, containing 19,729 height values; visual editor saves retained.
- Current physical GPU A/B FPS comparison v19 versus v20 has **not** been collected. Cloud software-rendered screenshots are not FPS benchmarks.

## Boundaries and limitations
- This is a coherent **stylized** Three.js environment, not a physically solved Navier–Stokes ocean or a pixel-identical recreation of the user video. Real-time GPU performance varies.
- Three.js vendor code remains ~511 kB minified and triggers the preexisting nonblocking Vite chunk-size warning.
- The source already had optional browser `?perf=1` diagnostics and adaptive DPR; both are preserved, not independently proof of a speedup.
- Only repo `trinhtanphat/beach-sandbox-3d` and isolated staging Worker were modified before release. Release should update only Worker `shoreline-sandbox-3d` on beach.qs3d.site, no DNS or other Worker changes.
- Rollback Git commit: `8787c12301714fd7adb3eec7ffb39da6334e05f7` (v19).
