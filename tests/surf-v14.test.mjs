import test from 'node:test';
import assert from 'node:assert/strict';
import {swashCrestHeight,swashVertexShader,swashFragmentShader,SURF_CYCLE_RATE} from '../src/waves.js';

function tForPhase(p,v){
 return (p-.23-Math.sin(v*9+.3)*.027-v*.012)/SURF_CYCLE_RATE;
}
test('advancing shore wave physically lifts a narrow 3D ridge, independent of wet sand',()=>{
 for(const v of [0,.25,.5,.75,1]){
  const t=tForPhase(.48,v);
  // Find peak ridge among all plausible shore locations.
  const sample=Array.from({length:121},(_,i)=>swashCrestHeight(t,v,i/120,1.2));
  assert.ok(Math.max(...sample)>.04,'crest has no physical height');
  assert.ok(Math.min(...sample)>=0);
  assert.ok(swashCrestHeight(t,v,.05,1.2)<.008);
  assert.ok(swashCrestHeight(t,v,.95,1.2)<.008);
 }
});
test('after wave impact 3D crest flattens during retreat and at period seam',()=>{
 for(const v of [0,.25,.5,.75,1]){
  for(const wave of [.1,.6,1.2,1.6]){
   const crestT=tForPhase(.45,v),retreatT=tForPhase(.89,v),endT=tForPhase(.995,v);
   for(let x=.2;x<=.8;x+=.1){
    assert.ok(swashCrestHeight(retreatT,v,x,wave)<.00001);
    assert.ok(swashCrestHeight(endT,v,x,wave)<.00001);
    const period=1/SURF_CYCLE_RATE;
    assert.ok(Math.abs(swashCrestHeight(crestT,v,x,wave)-swashCrestHeight(crestT+period,v,x,wave))<1e-9);
   }
  }
 }
});
test('GPU swash vertex shader carries matching wave ridge, retreat fade, and foam timing',()=>{
 assert.match(swashVertexShader,/p\.y\+=\.05\*clamp\(uWave,\.1,1\.6\)\*ridge\*life/);
 assert.match(swashVertexShader,/float front=\.84-run\*wet/);
 assert.match(swashVertexShader,/smoothstep\(\.64,\.86,phase\)/);
 assert.match(swashFragmentShader,/float advancing=1\.-smoothstep\(\.64,\.86,phase\)/);
 assert.match(swashFragmentShader,/float white=exp\(-pow\(d\/\(\.028\+\.011\*uWave\),2\.\)\)\*advancing/);
});
