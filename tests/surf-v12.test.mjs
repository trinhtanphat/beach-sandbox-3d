import test from 'node:test';
import assert from 'node:assert/strict';
import { trailingWake, shorewashPulse, SURF_CYCLE_RATE, oceanFragmentShader, swashFragmentShader } from '../src/waves.js';

test('a turbulent foam wake grows behind the break then dissipates', () => {
  for (let i = -40; i <= 250; i++) {
    const x = i / 1000;
    const value = trailingWake(x);
    assert.ok(Number.isFinite(value));
    assert.ok(value >= 0 && value <= 1);
  }
  assert.equal(trailingWake(-.02), 0);
  assert.equal(trailingWake(0), 0);
  assert.ok(trailingWake(.05) > .85);
  assert.ok(trailingWake(.13) > .1);
  assert.equal(trailingWake(.185), 0);
  assert.equal(trailingWake(.3), 0);
  assert.equal(trailingWake(Infinity), 0);
});

test('ocean foam wake is advected with the flow, not a stationary white stripe', () => {
  assert.match(oceanFragmentShader, /float surfSheet\(float x,float front,float n,vec2 uv,float shift\)/);
  assert.match(oceanFragmentShader, /float back=smoothstep\(\.008,\.030,d\)\*\(1\.-smoothstep\(\.100,\.185,d\)\)/);
  assert.match(oceanFragmentShader, /vec2 flow=vec2\(uv\.x\*171\.\+uTime\*9\.,\(uv\.y-drift\)\*118\.-uTime\*1\.7\)/);
  assert.match(oceanFragmentShader, /foamA=surfSheet\(uv\.x,frontA,strand,uv,0\.\)/);
  assert.match(oceanFragmentShader, /foamB=surfSheet\(uv\.x,frontB,micro,uv,\.56\)/);
  assert.match(oceanFragmentShader, /troughA=exp/);
  assert.match(oceanFragmentShader, /sea\*=1\.-/);
});

test('wet sand uses neutral darker tone without changing independent foam control', () => {
  assert.match(swashFragmentShader, /vec3 wetColor=vec3\(\.43,\.40,\.31\)/);
  assert.match(swashFragmentShader, /foamAlpha\*=uFoam\*shoreFade/);
  assert.match(swashFragmentShader, /wetAlpha\*=shoreFade/);
  assert.doesNotMatch(swashFragmentShader, /wetAlpha\*=uFoam/);
});

test('shoreline whitewash appears during impact and fades between incoming sets', () => {
  const period=1/SURF_CYCLE_RATE;
  for (const shift of [0,.56]) {
    for (const v of [0,.25,.5,.75,1]) {
      const alongPhase=Math.sin(v*9+.3)*.027+v*.012+shift;
      const time=phase=>(phase-alongPhase)/SURF_CYCLE_RATE;
      const quiet=shorewashPulse(time(.12),v,shift);
      const impact=shorewashPulse(time(.77),v,shift);
      const drained=shorewashPulse(time(.99),v,shift);
      assert.ok(quiet<.00001);
      assert.ok(impact>.95);
      assert.ok(drained<.03);
      assert.ok(Math.abs(impact-shorewashPulse(time(.77)+period,v,shift))<1e-10);
    }
  }
  assert.match(oceanFragmentShader,/float splash=clamp\(pulseA\+\.48\*pulseB/);
  assert.match(oceanFragmentShader,/shorewash=\(1\.-smoothstep\(\.008,\.030,uv\.x\)\)/);
});
