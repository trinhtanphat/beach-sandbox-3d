/**
 * Bounded requestAnimationFrame cadence diagnostics.
 * This is an application frame-pacing measure, not a GPU timer query.
 * Values are never stored, transmitted or collected when diagnostics are off.
 */
export function createFrameMetrics({windowSeconds=12,maxFrames=1200}={}) {
  if(!(windowSeconds>=2&&windowSeconds<=120)||!Number.isInteger(maxFrames)||maxFrames<120)
    throw new RangeError('Invalid frame measurement window');
  const samples=new Float64Array(maxFrames);
  let write=0,count=0,duration=0,invalid=0;
  function reset(){write=0;count=0;duration=0;invalid=0;}
  function addFrame(seconds,{hidden=false}={}) {
    if(hidden){reset();return false;}
    if(!Number.isFinite(seconds)||seconds<=0||seconds>5){invalid++;return false;}
    if(count===maxFrames)duration-=samples[write];
    else count++;
    samples[write]=seconds;duration+=seconds;write=(write+1)%maxFrames;
    // Bound the history by elapsed wall-clock time, not by FPS.
    while(count>1&&duration-samples[(write-count+maxFrames)%maxFrames]>=windowSeconds){
      const oldest=(write-count+maxFrames)%maxFrames;
      duration-=samples[oldest];count--;
    }
    return true;
  }
  function snapshot(){
    const sorted=Array.from({length:count},(_,j)=>samples[(write-count+j+maxFrames)%maxFrames]).sort((a,b)=>a-b);
    const q=p=>count?sorted[Math.max(0,Math.ceil(count*p)-1)]*1000:null;
    return {frames:count,seconds:duration,ready:duration>=Math.min(5,windowSeconds*.65),
      meanFps:count&&duration>0?count/duration:null,p95Ms:q(.95),p99Ms:q(.99),
      slowFrames:sorted.filter(x=>x>1/30).length,invalid};
  }
  return {addFrame,snapshot,reset};
}
