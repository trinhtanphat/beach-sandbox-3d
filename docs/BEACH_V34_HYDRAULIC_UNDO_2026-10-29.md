# Beach v34 — Undo restores the exact pre-stroke water state

## Root cause
In v33, pressing **Undo** after a Dig/Build/Rake stroke restored the terrain height array but *not* the hydraulic depth grid. The lagoon could therefore remain flooded after undoing a canal, or lose/retain water inconsistently after undoing a dam, despite the visible sand reverting.

## Fix
- Capture both the 19,729-node terrain height array and the 22,385-cell inland water-depth array as immutable Float32 snapshots when a sculpt stroke starts.
- Undo validates the stored record, restores terrain, refreshes terrain-dependent water geometry, then restores the exact corresponding water state and refreshes the inlet status, tree visibility, and wetland metrics.
- Record validation is atomic: malformed snapshots cannot partially mutate terrain.
- Ordinary Saved/Exported island JSON remains unchanged; this is solely the in-memory Undo history, already limited to 18 actions.

## Verification
- Unit tests check all terrain/water points are captured independently, invalid history records are rejected, and a sand-dam water-volume scenario restores the initial volume after Undo.
- Browser integration imports an island with a closed, retained-water pond, pauses simulation, saves the baseline, excavates the dam using real Dig mouse events, confirms the inlet becomes connected **before mouseup**, then presses Undo and compares *every* 19,729 terrain height and 22,385 water depth values to the baseline save.
- Keep the previous v33 main `60a70f70e16ec07af9955497351b3ca0e9e29d86` available for rollback.

## Limitations
Undo reverts the edited sand and fluid volume to the start of the stroke, including any flow that occurred during that particular editing gesture; this is intentional transaction-style Undo. The water engine remains stylized fixed-head 2.5D diffusive-wave hydraulics, not calibrated full CFD. No DNS/tunnel or unrelated services are affected.
