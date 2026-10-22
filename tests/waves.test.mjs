import test from 'node:test';
import assert from 'node:assert/strict';
import { shoreline, terrainHeight, landDistance } from '../src/simulation.js';
import {
  waveFront, runupPosition, oceanVertexShader, oceanFragmentShader,
  swashVertexShader, swashFragmentShader
} from '../src/waves.js';

test('seabed meets sandy shore without a vertical seam', () => {
  for (let z=-5.3;z<=5.3;z+=.53) {
    const x=shoreline(z);
    const land=terrainHeight(x-.0001,z);
    const sea=terrainHeight(x+.0001,z);
    assert.ok(Math.abs(land-sea)<.003, 'terrain discontinuity at '+z);
    assert.ok(landDistance(x-.2,z)>0);
    assert.ok(landDistance(x+.2,z)<0);
  }
});
test('seabed slopes deeper offshore in a repeatable way', () => {
  for(const z of [-4,0,4]) {
    const coast=shoreline(z);
    assert.ok(terrainHeight(coast+3,z)<terrainHeight(coast+.75,z));
  }
});
test('wave front moves inland through each wash cycle', () => {
  for(const height of [.1,.6,1.6]) {
    const a=runupPosition(.3,0,height);
    const b=runupPosition(2,0,height);
    assert.ok(b<a, 'swash should advance toward land');
  }
});
test('wave phase repeats and is bounded',()=>{
  const period=1/.23;
  for(const time of [0,.5,1,2.5]) {
    assert.ok(Math.abs(waveFront(time,0)-waveFront(time+period,0))<1e-8);
    assert.ok(waveFront(time,3)>=0 && waveFront(time,3)<1);
  }
});
test('wave height affects shoreline runup reach',()=>{
  assert.ok(runupPosition(2,0,1.5)<runupPosition(2,0,.2));
  for(let time=0;time<5;time+=.1){
    const x=runupPosition(time,0,.6);
    assert.ok(x>=.15 && x<=.9);
  }
});
test('GLSL wave uniforms and animated surf stages are present',()=>{
  assert.match(oceanVertexShader,/uniform float uTime/);
  assert.match(oceanVertexShader,/uniform float uWave/);
  assert.match(oceanFragmentShader,/uniform float uDay/);
  assert.match(oceanFragmentShader,/surfSheet/);
  assert.match(oceanFragmentShader,/foam/);
  assert.match(swashVertexShader,/uniform float uTime/);
  assert.match(swashFragmentShader,/uniform float uWave/);
  assert.match(swashFragmentShader,/front/);
});
