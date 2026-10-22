import test from 'node:test';
import assert from 'node:assert/strict';
import {SURF_CYCLE_RATE,swashPhase,runupPosition,exposedSandBand,swashFragmentShader} from '../src/waves.js';

function phaseTime(phase,along=.5) {
  return (phase-.23-Math.sin(along*9+.3)*.027-along*.012)/SURF_CYCLE_RATE;
}

test('only withdrawing water exposes damp sand inland of the retreating front',()=>{
  for(const v of [0,.2,.5,.8,1]){
    for(const wave of [.1,.6,1.2,1.6]){
      const strength=Math.max(.1,Math.min(1.6,wave));
      const peak=.84-(.38+.26*strength/1.6);
      const time=phaseTime(.80,v);
      const retreatFront=runupPosition(time,v,wave);
      const between=(peak+retreatFront)/2;
      assert.ok(retreatFront>peak+.08);
      assert.ok(exposedSandBand(time,v,between,wave)>.7);
      assert.ok(exposedSandBand(time,v,peak-.07,wave)<.001);
      assert.ok(exposedSandBand(time,v,retreatFront+.09,wave)<.001);
      assert.ok(exposedSandBand(phaseTime(.30,v),v,between,wave)<.001);
    }
  }
});
test('wet sand footprint returns to zero at the end of the breaking cycle',()=>{
  const period=1/SURF_CYCLE_RATE;
  for(const v of [0,.15,.45,.73,.99]){
    for(const x of [.15,.3,.47,.6,.79]){
      const a=phaseTime(.79,v);
      const b=phaseTime(.995,v);
      assert.ok(exposedSandBand(b,v,x,.8)<.001);
      assert.ok(Math.abs(exposedSandBand(a,v,x,.8)-exposedSandBand(a+period,v,x,.8))<1e-10);
    }
  }
});
test('swash shader shades retreating exposed sand on the correct side of the waterline',()=>{
  assert.match(swashFragmentShader,/float maximumReach=\.84-run;/);
  assert.match(swashFragmentShader,/float exposed=smoothstep\(maximumReach-\.018,maximumReach\+\.04,vUv\.x\)/);
  assert.match(swashFragmentShader,/1\.-smoothstep\(front-\.05,front\+\.03,vUv\.x\)/);
  assert.match(swashFragmentShader,/float withdrawing=smoothstep\(\.64,\.72,phase\)/);
  assert.match(swashFragmentShader,/backwashLines=pow/);
  assert.match(swashFragmentShader,/backwashScatter=smoothstep/);
  assert.match(swashFragmentShader,/foamAlpha\*=uFoam\*shoreFade/);
  assert.doesNotMatch(swashFragmentShader,/wetAlpha\*=uFoam/);
});
