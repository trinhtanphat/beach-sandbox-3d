/**
 * Stylized, bounded longshore surface-current transport.
 * Foam from each breaking train is released, carried a short distance toward
 * +z along the shallow reef and fades before phase wraps. No moving terrain.
 * Normalized sea coordinates: u=0 at shore, u=1 at outer shelf, v in [0,1].
 */
import {clamp,smoothstep} from './simulation.js';

export function longshoreSpeed(u,v){
 if(!Number.isFinite(u)||!Number.isFinite(v))throw new RangeError('Invalid coastal coordinates');
 const edge=smoothstep(0,.08,v)*(1-smoothstep(.86,1,v));
 const band=1-smoothstep(.2,.75,u);
 return .0050*band*(.75+.25*Math.sin(v*6.2831853+.6))*edge;
}
export function foamTravel(u,v,phase){
 if(!Number.isFinite(phase))throw new RangeError('Invalid foam age');
 return longshoreSpeed(u,v)*clamp(phase,0,1)/.23;
}
export const coastalFlowGLSL=`
float longshoreSpeed(float u,float v){
  float edge=smoothstep(0.,.08,v)*(1.-smoothstep(.86,1.,v));
  float band=1.-smoothstep(.2,.75,u);
  return .0050*band*(.75+.25*sin(v*6.2831853+.6))*edge;
}
float foamTravel(float u,float v,float phase){
  return longshoreSpeed(u,v)*clamp(phase,0.,1.)/.23;
}
`;
