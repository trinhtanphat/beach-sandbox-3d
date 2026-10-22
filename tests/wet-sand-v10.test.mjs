import test from 'node:test';
import assert from 'node:assert/strict';
import {swashPhase,runupPosition,SURF_CYCLE_RATE,swashFragmentShader} from '../src/waves.js';

const smooth=x=>{const v=Math.max(0,Math.min(1,x));return v*v*(3-2*v);};
const wrap=v=>((v%1)+1)%1;

test('swash model exactly matches GLSL phase at every alongshore location',()=>{
 for(const t of [-4,-.5,0,.01,.8,1.9,5.1,80]){
  for(let uv=0;uv<=1;uv+=.05){
   const expected=wrap(t*.23+.23+Math.sin(uv*9+.3)*.027+uv*.012);
   assert.ok(Math.abs(swashPhase(t,uv)-expected)<1e-11);
   assert.ok(Math.abs(swashPhase(t+1/SURF_CYCLE_RATE,uv)-expected)<1e-11);
  }
 }
 assert.match(swashFragmentShader,/uTime\*\.23\+\.23\+sin\(vUv\.y\*9\.\+\.3\)\*\.027\+vUv\.y\*\.012/);
});
test('wet shore advances and retreats at same phase as shader',()=>{
 for(const wave of [.1,.6,1.2,1.6]){
  for(const t of [0,.2,.8,1.7,2.6,3.6,4]){
   for(const y of [0,.4,.8,1]){
    const p=swashPhase(t,y);
    const wet=p<.65?smooth(p/.65):1-smooth((p-.65)/.35);
    const expected=.84-(.38+.26*wave/1.6)*wet;
    assert.ok(Math.abs(runupPosition(t,y,wave)-expected)<1e-10);
   }
  }
 }
});
test('wet sand film remains independent of whitewater intensity',()=>{
 assert.match(swashFragmentShader,/float wetAlpha=\.32\*exposed\*withdrawing/);
 assert.match(swashFragmentShader,/foamAlpha\*=uFoam\*shoreFade/);
 assert.match(swashFragmentShader,/wetAlpha\*=shoreFade/);
 assert.doesNotMatch(swashFragmentShader,/wetAlpha\*=uFoam/);
 assert.match(swashFragmentShader,/mix\(wetColor,foamColor,whiteFraction\)/);
});
