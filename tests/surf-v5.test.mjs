import test from 'node:test';
import assert from 'node:assert/strict';
import { HALF_DEPTH, HALF_WIDTH, DEPTH, shoreline } from '../src/simulation.js';
import { breakerPosition, SURF_CYCLE_RATE } from '../src/waves.js';
import { lipSample, LIP_BASE_Y, LIP_ROWS, LIP_COLS } from '../src/breaker-lip.js';
import { surfSprayPoint } from '../src/surf-spray.js';

test('raised breaker lip physically follows the curved shoreline',()=>{
  for(const z of [-5,-3,-1,0,2,4,5]){
    const coast=shoreline(z)-.1;
    const width=HALF_WIDTH+.06-coast;
    const uv=(z+HALF_DEPTH)/DEPTH;
    const p=lipSample(.6,z,.5,.6);
    const projected=(p.x-coast)/width;
    const front=breakerPosition(.6,uv);
    assert.ok(Math.abs(projected-front)<.03, 'lip diverges from water surface crest');
    assert.ok(p.x>coast-.3 && p.x<HALF_WIDTH+.06);
    assert.ok(p.y>LIP_BASE_Y+.05);
  }
});
test('breaker lip actually rises in 3D and gains height with larger swells',()=>{
  const at=(t,u,w)=>lipSample(t,0,u,w);
  assert.ok(at(.5,.5,1.2).y>at(.5,.5,.2).y+.09);
  assert.ok(at(.5,.5,.6).y>at(.5,0,.6).y+.05);
  assert.ok(at(.5,.5,.6).y>at(.5,1,.6).y+.05);
  assert.equal(LIP_ROWS,200);
  assert.equal(LIP_COLS,9);
});
test('crest geometry follows continuous landward motion without detached spray',()=>{
  const wave=.6, z=2.4;
  for(let time=.1;time<.9;time+=.11){
    const a=lipSample(time,z,.5,wave);
    const b=lipSample(time+.06,z,.5,wave);
    assert.ok(b.x<a.x+.06, 'lip unexpectedly jumps offshore');
    const spray=surfSprayPoint(time,z,3,wave);
    assert.ok(Math.abs(spray.x-a.x)<1.15,'spray no longer tracks breaker');
  }
});
test('phase remains periodic despite natural small-scale surface ripples',()=>{
  const period=1/SURF_CYCLE_RATE;
  for(const z of [-4,-2,0,3,5]){
    const uv=(z+HALF_DEPTH)/DEPTH;
    for(const t of [.2,.6,1.5,3]){
      assert.ok(Math.abs(breakerPosition(t,uv)-breakerPosition(t+period,uv))<1e-8);
    }
  }
});
