import test from 'node:test';
import assert from 'node:assert/strict';
import {createSeaDynamics} from '../src/sea-dynamics.js';
import {oceanHeight,boatPose} from '../src/ocean-surface.js';
import {oceanVertexShader,oceanFragmentShader} from '../src/waves.js';
import {shoreline} from '../src/simulation.js';

test('new wave and foam targets approach smoothly without overshoot',()=>{
 const d=createSeaDynamics({wave:.4,foam:.3});
 const readings=[];
 for(let i=0;i<60;i++)readings.push(d.advance(1/60,{wave:1.6,foam:1.8}));
 assert.ok(readings[0].wave>.4&&readings[0].wave<.47,'avoid instant wave jump');
 assert.ok(readings[0].foam>.3&&readings[0].foam<.40);
 for(let i=1;i<readings.length;i++){
   assert.ok(readings[i].wave>=readings[i-1].wave);
   assert.ok(readings[i].foam>=readings[i-1].foam);
 }
 assert.ok(readings.at(-1).wave<1.6&&readings.at(-1).wave>1.4);
 assert.ok(readings.at(-1).foam<1.8&&readings.at(-1).foam>1.65);
});
test('interpolation independent of frame rate; pause freezes motion and conditions',()=>{
 const a=createSeaDynamics({wave:1.5,foam:1.7});
 const b=createSeaDynamics({wave:1.5,foam:1.7});
 let r;
 for(let i=0;i<60;i++)r=a.advance(1/60,{wave:.2,foam:.4});
 const other=b.advance(1,{wave:.2,foam:.4});
 assert.ok(Math.abs(r.wave-other.wave)<1e-10);
 assert.ok(Math.abs(r.foam-other.foam)<1e-10);
 const before=a.snapshot();
 a.advance(.08,{wave:1.6,foam:1.8,paused:true});
 assert.deepEqual(a.snapshot(),before);
 a.reset({wave:.9,foam:.7});
 assert.deepEqual(a.snapshot(),{wave:.9,foam:.7});
 assert.throws(()=>a.advance(9,{wave:.3,foam:.3}),RangeError);
 assert.throws(()=>a.advance(NaN,{wave:.3,foam:.3}),RangeError);
 assert.throws(()=>createSeaDynamics({waveResponse:0}),RangeError);
});
test('ocean long-period swells lift actual vertex geometry and shade same raised face',()=>{
 assert.match(oceanVertexShader,/float broadSwell=sin\(uv\.x\*9\.-uTime\*1\.08\+uv\.y\*3\.4\)\*\.018/);
 assert.match(oceanVertexShader,/sin\(uv\.x\*14\.5\+uTime\*\.72-uv\.y\*5\.7\)\*\.011/);
 assert.match(oceanVertexShader,/p\.y\+=uWave\*\(swell\+broadSwell\+shoaling\*/);
 assert.match(oceanFragmentShader,/float swellLight=smoothstep\(-\.020,\.030,vLongSwell\)/);
 assert.match(oceanVertexShader,/vLongSwell=broadSwell/);
 // The directional spectrum produces gentle wave motion far from the coastal breaker.
 const z=2,x=shoreline(z)+6;
 const heights=Array.from({length:20},(_,i)=>oceanHeight(i*.16,x,z,.8));
 assert.ok(Math.max(...heights)-Math.min(...heights)>.012);
 for(const time of [0,1.2,4,14]) {
   const pose=boatPose(time,x,z,{wave:.8});
   assert.ok(Math.abs(pose.y-(oceanHeight(time,x,z,.8)-.065))<1e-9);
 }
});

test('all ocean subsystems consume the same smoothed sea state on every frame',async()=>{
 const {readFileSync}=await import('node:fs');
 const {fileURLToPath}=await import('node:url');
 const {resolve,dirname}=await import('node:path');
 const source=readFileSync(resolve(dirname(fileURLToPath(import.meta.url)),'../src/main.js'),'utf8');
 assert.match(source,/const sea=seaDynamics\.advance\(dt,\{wave:waveHeight,foam:foamIntensity,paused\}\)/);
 for(const expr of [
   'surfSpray.update(elapsed,sea.wave,sea.foam)',
   'breakingLip.update(elapsed,sea.wave,daylight(hours),sea.foam)',
   'oceanAudio.update(elapsed,sea.wave,paused)',
   'waveUniforms.uWave.value=sea.wave',
   'waveUniforms.uFoam.value=sea.foam',
   'wave:sea.wave'
 ])assert.ok(source.includes(expr),'unsynchronized sea layer: '+expr);
 assert.match(source,/seaDynamics\.reset\(\{wave:waveHeight,foam:foamIntensity\}\)/);
});
