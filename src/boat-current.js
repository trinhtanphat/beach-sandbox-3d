/**
 * Deterministic motion of a loosely moored small boat around its saved anchor.
 * Uses the same alongshore and return-flow fields as visible whitewater,
 * but oscillates rather than accumulating displacement so exports never creep.
 */
import {DEPTH,HALF_DEPTH,HALF_WIDTH,shoreline,clamp} from './simulation.js';
import {COASTAL_ZONES} from './world-layout.js';
import {longshoreSpeed,ripOutflowSpeed} from './coastal-flow.js';

export function boatCurrentPosition(time,anchorX,anchorZ,phase=0){
 if(![time,anchorX,anchorZ,phase].every(Number.isFinite))throw new RangeError('Invalid boat current inputs');
 const v=clamp((anchorZ+HALF_DEPTH)/DEPTH,0,1);
 const coast=shoreline(anchorZ)-COASTAL_ZONES.seaOverlap;
 const width=HALF_WIDTH+.06-coast;
 const u=clamp((anchorX-coast)/width,0,1);
 // Current speed is converted from normalized UV/second to world units.
 // Gentle pendular mooring permits a small visible longshore drift.
 const zMotion=DEPTH*longshoreSpeed(u,v)*.72*
   (Math.sin(time*.18+phase)-Math.sin(phase))/.18;
 const z=clamp(anchorZ+zMotion,-HALF_DEPTH+.2,HALF_DEPTH-.2);
 const offshore=(width*ripOutflowSpeed(u,v)*1.2)*
   (1-Math.cos(time*.20))/.20;
 const x=clamp(anchorX+offshore,
   shoreline(z)+COASTAL_ZONES.boatMinOffshore,HALF_WIDTH-.2);
 return {x,z,alongshore:z-anchorZ,offshore:x-anchorX};
}
