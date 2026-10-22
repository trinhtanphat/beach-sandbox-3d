import test from 'node:test';
import assert from 'node:assert/strict';
import { surfSprayPoint } from '../src/surf-spray.js';
import { waveFront, runupPosition, breakerPosition, oceanVertexShader,
         oceanFragmentShader, swashVertexShader, swashFragmentShader,
         SURF_CYCLE_RATE } from '../src/waves.js';

test('breaking crests travel from outer shallow water to shoreline',()=>{
  const times=[0,.55,1.15,2.15,3.45,4];
  const locations=times.map(t=>breakerPosition(t));
  for(let i=1;i<locations.length;i++)assert.ok(locations[i]<locations[i-1],
      'crest moved offshore instead of landward');
  assert.ok(locations[0]>.33);
  assert.ok(locations.at(-1)<.065);
});
test('breaker and swash repeat predictably with finite range',()=>{
 const period=1/SURF_CYCLE_RATE;
 for(let i=0;i<30;i++){
  const t=i*.13;
  assert.ok(Math.abs(breakerPosition(t)-breakerPosition(t+period))<1e-8);
  const w=runupPosition(t,0,.6);
  assert.ok(w>=.2&&w<=.84);
  assert.ok(Math.abs(w-runupPosition(t+period,0,.6))<1e-8);
 }
});
test('swash advances then retreats, with stronger wave reaching farther inland',()=>{
 const early=runupPosition(.3,0,.6), peak=runupPosition(1.82,0,.6);
 const draining=runupPosition(3.4,0,.6);
 assert.ok(early>peak,'advancing swash did not run up');
 assert.ok(draining>peak,'swash never retreated');
 assert.ok(runupPosition(1.82,0,1.6)<runupPosition(1.82,0,.1));
});
test('both shaders describe the same physical breaker timing',()=>{
 for(const shader of [oceanVertexShader,oceanFragmentShader,swashFragmentShader]){
  assert.match(shader,/uTime\s*\*\s*\.23/);
  assert.match(shader,/uWave/);
 }
 assert.match(oceanVertexShader,/crestA/);
 assert.match(oceanFragmentShader,/surfSheet/);
 assert.match(oceanFragmentShader,/back/);
 assert.match(oceanFragmentShader,/whitewater|Whitewater/i);
 assert.match(swashFragmentShader,/retreat/);
 assert.match(swashFragmentShader,/wetFilm/);
 assert.match(swashVertexShader,/uTime/);
});

test('foam mist follows the shoaling wave and remains above ocean surface',()=>{
 for(const z of [-5,-2,0,3,5]){
  const a=surfSprayPoint(.1,z,13,.6);
  const b=surfSprayPoint(.65,z,13,.6);
  assert.ok(b.x<a.x,'sea spray moved away from shore');
  for(const p of [a,b]){
    assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z));
    assert.ok(p.y>=.115 && p.y<=.25);
  }
 }
});
