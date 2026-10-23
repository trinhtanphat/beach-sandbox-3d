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
/**
 * Narrow seaward return-current lanes between shoaling wave groups.
 * Expressed in normalized ocean-u units/second, bounded and edge-faded.
 */
export function ripOutflowSpeed(u,v){
 if(!Number.isFinite(u)||!Number.isFinite(v))throw new RangeError('Invalid return flow coordinates');
 const band=smoothstep(.015,.095,u)*(1-smoothstep(.28,.67,u));
 const edge=smoothstep(0,.08,v)*(1-smoothstep(.90,1,v));
 const lanes=Math.exp(-Math.pow((v-.34)/.067,2))+
             .8*Math.exp(-Math.pow((v-.68)/.060,2));
 return .0028*band*edge*lanes;
}
export function foamReturnTravel(u,v,phase){
 if(!Number.isFinite(phase))throw new RangeError('Invalid foam age');
 return ripOutflowSpeed(u,v)*clamp(phase,0,1)/.23;
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
float ripOutflowSpeed(float u,float v){
  float band=smoothstep(.015,.095,u)*(1.-smoothstep(.28,.67,u));
  float edge=smoothstep(0.,.08,v)*(1.-smoothstep(.90,1.,v));
  float lanes=exp(-pow((v-.34)/.067,2.))+
              .8*exp(-pow((v-.68)/.060,2.));
  return .0028*band*edge*lanes;
}
float foamReturnTravel(float u,float v,float phase){
  return ripOutflowSpeed(u,v)*clamp(phase,0.,1.)/.23;
}
float foamTravel(float u,float v,float phase){
  return longshoreSpeed(u,v)*clamp(phase,0.,1.)/.23;
}
`;
