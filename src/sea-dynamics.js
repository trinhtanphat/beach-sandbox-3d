/**
 * Stable, frame-rate-independent transition of user requested sea conditions.
 * Rendering, boat flotation, spray, whitewater and audio consume the same
 * effective state. No periodic timers, extra GPU draw calls, or persistence.
 */
import {clamp} from './simulation.js';

export function createSeaDynamics({wave=1,foam=1,waveResponse=.45,foamResponse=.35}={}){
  if(![wave,foam,waveResponse,foamResponse].every(Number.isFinite)||
    waveResponse<=0||foamResponse<=0)throw new RangeError('Invalid sea-state settings');
  let currentWave=clamp(wave,.1,1.6),currentFoam=clamp(foam,.1,1.8);
  function reset(next={wave:currentWave,foam:currentFoam}){
    if(!Number.isFinite(next.wave)||!Number.isFinite(next.foam))throw new RangeError('Invalid sea state');
    currentWave=clamp(next.wave,.1,1.6);currentFoam=clamp(next.foam,.1,1.8);
    return snapshot();
  }
  function snapshot(){return {wave:currentWave,foam:currentFoam};}
  function advance(dt,{wave:targetWave,foam:targetFoam,paused=false}={}){
    if(!Number.isFinite(dt)||dt<0||dt>1)throw new RangeError('Invalid timestep');
    if(paused||dt===0)return snapshot();
    if(!Number.isFinite(targetWave)||!Number.isFinite(targetFoam))throw new RangeError('Invalid target');
    const w=clamp(targetWave,.1,1.6),f=clamp(targetFoam,.1,1.8);
    // Independent time constants; stable across uneven browser frame rates.
    currentWave+= (w-currentWave)*(-Math.expm1(-dt/waveResponse));
    currentFoam+= (f-currentFoam)*(-Math.expm1(-dt/foamResponse));
    if(Math.abs(w-currentWave)<1e-5)currentWave=w;
    if(Math.abs(f-currentFoam)<1e-5)currentFoam=f;
    return snapshot();
  }
  return {advance,reset,snapshot};
}
