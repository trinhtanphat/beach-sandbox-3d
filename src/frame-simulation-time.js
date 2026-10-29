/**
 * Separate simulation elapsed time from renderer cadence.
 * A slow visible rAF is not a reason to move water ~4x slower than the
 * visible wall clock. A bounded catch-up prevents unstable long jumps.
 * The inland hydraulic solver itself still uses its own fixed 0.06s steps.
 */
export function frameSimulationDelta(rawSeconds,{speed=1,paused=false,hidden=false,maxStep=.45}={}){
 if(!Number.isFinite(rawSeconds)||rawSeconds<0||
    !Number.isFinite(speed)||speed<0||
    !Number.isFinite(maxStep)||maxStep<=0||maxStep>.48)
   throw new RangeError('Invalid simulation frame time');
 // Avoid an overnight tab or suspended browser jumping the entire ocean.
 if(paused||hidden||rawSeconds>1.5)return 0;
 return Math.min(rawSeconds*speed,maxStep);
}
