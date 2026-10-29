import test from 'node:test';
import assert from 'node:assert/strict';
import {frameSimulationDelta} from '../src/frame-simulation-time.js';
import {createCoastalFlow} from '../src/inland-hydraulics.js';

test('visible ~3 FPS simulation no longer moves four times slower than elapsed time',()=>{
 let progress=0;
 for(let frame=0;frame<3;frame++)
   progress+=frameSimulationDelta(1/3);
 assert.ok(Math.abs(progress-1)<1e-10);
 // v30 capped each .333 frame at .08, yielding .24s for each actual second
 assert.ok(progress>.24*4);
});
test('60Hz, 30Hz, and 3Hz advance the same simulated one-second interval',()=>{
 for(const fps of [3,12,30,60,120]){
  let total=0;
  for(let frame=0;frame<fps;frame++)total+=frameSimulationDelta(1/fps);
  assert.ok(Math.abs(total-1)<1e-8,'FPS '+fps+' advanced '+total);
 }
});
test('pause, hidden tab and suspend-time leaps never sneak into the water solver',()=>{
 assert.equal(frameSimulationDelta(.4,{paused:true}),0);
 assert.equal(frameSimulationDelta(.4,{hidden:true}),0);
 assert.equal(frameSimulationDelta(900),0);
 assert.equal(frameSimulationDelta(.25,{speed:0}),0);
 assert.equal(frameSimulationDelta(0),0);
});
test('large visible frames and accelerated speed are clamped to finite safe steps',()=>{
 assert.equal(frameSimulationDelta(.5),.45);
 assert.equal(frameSimulationDelta(.4,{speed:4}),.45);
 assert.equal(frameSimulationDelta(.03,{speed:4}),.12);
 for(const dt of [-.1,NaN,Infinity])assert.throws(()=>frameSimulationDelta(dt),RangeError);
 assert.throws(()=>frameSimulationDelta(.1,{speed:-1}),RangeError);
 assert.throws(()=>frameSimulationDelta(.1,{maxStep:1}),RangeError);
});
test('real hydraulic volume is conserved through slow-frame catch-up, with no dry pit teleportation',()=>{
 const cols=16,rows=5,n=cols*rows;
 const h=new Float32Array(n).fill(.35),ocean=new Uint8Array(n);
 for(let z=0;z<rows;z++){h[z*cols+cols-1]=-.18;ocean[z*cols+cols-1]=1;}
 for(let z=1;z<4;z++)for(let x=1;x<5;x++)h[z*cols+x]=-.2;
 const fluid=createCoastalFlow({columns:cols,rows,heights:h,reservoir:ocean,dx:.1,dz:.1});
 assert.equal(fluid.depth[2*cols+2],0);
 for(let i=0;i<3;i++)fluid.advance(frameSimulationDelta(1/3));
 assert.equal(fluid.depth[2*cols+2],0,'disconnected pit must stay dry after actual elapsed second');
 for(let x=5;x<cols-1;x++)h[2*cols+x]=-.15;
 fluid.setTerrain(h);
 const previous=fluid.totalVolume();
 fluid.advance(frameSimulationDelta(1/3));
 assert.ok(fluid.depth[2*cols+2]===0,'new faraway basin must not teleport water after one low-FPS frame');
 for(let i=0;i<60;i++)fluid.advance(frameSimulationDelta(1/3));
 assert.ok(fluid.depth[2*cols+2]>.005,'connected basin eventually floods at low frame rate');
 assert.ok(fluid.totalVolume()>previous,'ocean is the external inflow reservoir');
});
