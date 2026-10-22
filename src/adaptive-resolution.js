/**
 * Conservative resolution scaling for integrated GPUs.
 * Consumes visible, one-second FPS samples; never changes scene geometry.
 * Long holds + cooldown prevent a sawtooth in pixel density.
 */
export function createAdaptiveResolution({cap=1.65,min=.85,downFps=36,upFps=56,downHold=6,upHold=18,cooldown=12}={}){
  if(![cap,min,downFps,upFps,downHold,upHold,cooldown].every(Number.isFinite)
     ||cap<=0||min<=0||min>cap||downFps<=0||upFps<=downFps
     ||downHold<=0||upHold<=0||cooldown<0)
    throw new RangeError('Invalid adaptive-resolution settings');
  let low=0,high=0,cool=0;
  function reset(){low=0;high=0;}
  function observe({fps,seconds=1,dpr,hidden=false}){
    if(hidden){reset();return null;}
    if(!Number.isFinite(fps)||fps<=0||!Number.isFinite(seconds)||seconds<=0||seconds>3||
       !Number.isFinite(dpr)||dpr<=0){reset();return null;}
    cool=Math.max(0,cool-seconds);
    if(fps<downFps){low+=seconds;high=0;}
    else if(fps>upFps){high+=seconds;low=0;}
    else reset();
    if(cool>0)return null;
    let next=null;
    if(low>=downHold&&dpr>min+.025)next=Math.max(min,dpr*.90);
    else if(high>=upHold&&dpr<cap-.025)next=Math.min(cap,dpr*1.08);
    if(next===null||Math.abs(next-dpr)<.025)return null;
    next=Math.round(next*1000)/1000;
    reset();cool=cooldown;
    return next;
  }
  return {observe,reset};
}
