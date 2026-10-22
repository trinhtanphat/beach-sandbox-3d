import test from 'node:test';
import assert from 'node:assert/strict';
import {breakerPhase,waveEnvelope,breakerPosition,SURF_CYCLE_RATE,oceanVertexShader,oceanFragmentShader,swashFragmentShader} from '../src/waves.js';
import {lipSample} from '../src/breaker-lip.js';
import {surfSprayPoint} from '../src/surf-spray.js';

test('wave envelope eliminates hard crest pop at cycle seam',()=>{
  assert.equal(waveEnvelope(0),0);
  assert.equal(waveEnvelope(1),0);
  assert.ok(waveEnvelope(.35)>.99);
  assert.ok(waveEnvelope(.88)<.7);
  assert.ok(waveEnvelope(.05)<.5);
  assert.ok(Math.abs(waveEnvelope(.999999)-waveEnvelope(.000001))<.0001);
});
test('ocean surface, foam, and curling crest fade together',()=>{
  assert.match(oceanVertexShader,/lifeA/);
  assert.match(oceanFragmentShader,/lifeA/);
  assert.match(oceanFragmentShader,/lifeB/);
  for(const v of [0,.25,.5,.75,1]){
    const duration=1/SURF_CYCLE_RATE;
    const t=(1-v*.012-Math.sin(v*9+.3)*.027)/SURF_CYCLE_RATE;
    const z=(v-.5)*10.8;
    const a=lipSample(t,z,.5,1);
    const b=lipSample(t+.00001,z,.5,1);
    assert.ok(Math.abs(a.y-b.y)<.012, 'hard geometry jump near period boundary');
    assert.ok(a.life<.001);
    assert.ok(b.life<.001);
    assert.ok(Number.isFinite(breakerPosition(t,v)));
    assert.ok(Math.abs(breakerPhase(t,v))<.0001);
  }
});
test('crest rises with wave intensity mid-cycle, but fades to baseline at the seam',()=>{
  const z=0,v=.5;
  const offset=Math.sin(v*9+.3)*.027+v*.012;
  const midT=(.37-offset)/SURF_CYCLE_RATE;
  const crest=lipSample(midT,z,.5,1.3);
  const small=lipSample(midT,z,.5,.2);
  assert.ok(crest.y>small.y+.13);
  const seamT=(1-offset)/SURF_CYCLE_RATE;
  const fading=lipSample(seamT,z,.5,1.3);
  assert.ok(fading.y<crest.y-.18);
});

test('foam fringe is attached to the moving swash front, not painted as a static stripe',()=>{
  const shader=swashFragmentShader;
  assert.match(shader,/trailingFront=front\+\.115/);
  assert.match(shader,/lingering=exp/);
  assert.doesNotMatch(shader,/vUv\.x-\(\.63\+/);
});
