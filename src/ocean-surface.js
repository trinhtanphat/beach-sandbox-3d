/** CPU counterpart to the ocean's tessellated GPU vertex-height field.
 * A boat is supported by the very same two traveling crests and tiny swells.
 * All coordinates are world units; time is the ocean shader's uTime.
 */
import {HALF_WIDTH, HALF_DEPTH, DEPTH, shoreline, clamp, smoothstep} from './simulation.js';
import {SEA_LEVEL, COASTAL_ZONES} from './world-layout.js';
import {SURF_CYCLE_RATE} from './waves.js';

const fract=x=>x-Math.floor(x);
function oceanUV(x,z){
  const v=clamp((z+HALF_DEPTH)/DEPTH,0,1);
  const coast=shoreline(z)-COASTAL_ZONES.seaOverlap;
  const span=HALF_WIDTH+.06-coast;
  return {u:clamp((x-coast)/span,0,1),v};
}
export function oceanHeight(time,x,z,height=1){
  if(![time,x,z,height].every(Number.isFinite))throw new RangeError('Ocean coordinates must be finite');
  const {u,v}=oceanUV(x,z);
  const wave=clamp(height,.1,1.6);
  const phase=fract(time*SURF_CYCLE_RATE+Math.sin(v*9+.3)*.027+v*.012);
  const turn=time*1.44513262;
  const warp=.016*Math.sin(v*22+turn)+.007*Math.sin(v*49-2*turn)+.004*Math.sin(v*94+3*turn);
  const crestFront=s=>.34-.33*fract(phase+s)+warp;
  const width=.019+.011*clamp(wave/1.6,0,1);
  const crestA=Math.exp(-Math.pow((u-crestFront(0))/width,2))*
    smoothstep(0,.12,phase)*(1-smoothstep(.77,1,phase));
  const phaseB=fract(phase+.56);
  const crestB=Math.exp(-Math.pow((u-crestFront(.56))/(width*.84),2))*
    smoothstep(0,.12,phaseB)*(1-smoothstep(.77,1,phaseB));
  const swell=Math.sin(u*27+time*2.3+v*8)*.025+
     Math.sin(u*62+time*3.6-v*22)*.007;
  const shoaling=.020+.065*(1-smoothstep(.12,.6,u));
  return SEA_LEVEL+wave*(swell+shoaling*(crestA*.90+crestB*.64));
}
/** Returns world-space hull flotation and local orientation relative to hull yaw. */
export function boatPose(time,x,z,{scale=1,yaw=0,wave=1}={}){
 if(![scale,yaw].every(Number.isFinite)||scale<=0)throw new RangeError('Invalid boat hull');
 const delta=.19;
 const center=oceanHeight(time,x,z,wave);
 const dx=(oceanHeight(time,x+delta,z,wave)-oceanHeight(time,x-delta,z,wave))/(2*delta);
 const dz=(oceanHeight(time,x,z+delta,wave)-oceanHeight(time,x,z-delta,wave))/(2*delta);
 const along=dx*Math.sin(yaw)+dz*Math.cos(yaw);
 const across=dx*Math.cos(yaw)-dz*Math.sin(yaw);
 return {y:center-.065*scale,
   pitch:clamp(-Math.atan(along),-.14,.14),
   roll:clamp(Math.atan(across),-.14,.14)};
}
