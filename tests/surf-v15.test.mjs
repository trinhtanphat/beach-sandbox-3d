import test from 'node:test';
import assert from 'node:assert/strict';
import {SURF_CYCLE_RATE,swashNoiseGLSL,swashFrontWarp,swashCrestHeight,swashVertexShader,swashFragmentShader,runupPosition,swashPhase} from '../src/waves.js';

test('swash ridge and bright whitewater compile the same front-warp GLSL helper',()=>{
  for(const shader of [swashVertexShader,swashFragmentShader]){
    assert.ok(shader.includes(swashNoiseGLSL),'swash noise function missing or duplicated');
    assert.match(shader,/swashFrontWarp\(/);
  }
  assert.match(swashVertexShader,/float front=\.84-run\*wet\+swashFrontWarp\(uv,uTime\)/);
  assert.match(swashFragmentShader,/front\+=swashFrontWarp\(vUv,uTime\)/);
  assert.doesNotMatch(swashVertexShader,/p\.x\+=/,'separate mesh drift detaches ridge');
});
test('CPU front warp is bounded, finite and tracks its GLSL constants',()=>{
  assert.match(swashNoiseGLSL,/\.017\*\(lace-\.5\)\+\.008\*sin\(uv\.y\*119\.\+turn\)/);
  for(const time of [-4,-.001,0,.31,1.6,3.9,8.2]){
    for(let v=0;v<=1;v+=.1)for(const x of [.12,.3,.47,.65,.85]){
      const warp=swashFrontWarp(time,v,x);
      assert.ok(Math.abs(warp-swashFrontWarp(time+1/SURF_CYCLE_RATE,v,x))<1e-9);
      assert.ok(Number.isFinite(warp));
      assert.ok(Math.abs(warp)<=.0171,'too much shoreline distortion');
      const wave=1.2;
      const phase=swashPhase(time,v);
      const life=Math.max(0,Math.min(1,phase/.10));
      const height=swashCrestHeight(time,v,x,wave);
      assert.ok(height>=0 && height<=.06001);
      const center=runupPosition(time,v,wave)+warp;
      if(Math.abs(x-center)>.16)assert.ok(height<.001);
    }
  }
});
