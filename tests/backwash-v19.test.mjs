import test from 'node:test';
import assert from 'node:assert/strict';
import {backwashRivulet,runupPosition,swashFrontWarp,swashFragmentShader,SURF_CYCLE_RATE} from '../src/waves.js';

const phaseTime=(phase,v)=>(phase-.23-Math.sin(v*9+.3)*.027-v*.012)/SURF_CYCLE_RATE;

test('retreating foam rivulets are localized, bounded and vanish at cycle seams',()=>{
 let found=0;
 for(const v of [0,.17,.34,.51,.68,.85,1]){
  for(const height of [.1,.6,1.2,1.6]){
   const t=phaseTime(.80,v);
   const front=runupPosition(t,v,height);
   const peak=.84-(.38+.26*height/1.6);
   for(let i=0;i<=100;i++){
     const x=peak+i/100*(front-peak);
     const foam=backwashRivulet(t,v,x,height);
     assert.ok(Number.isFinite(foam)&&foam>=0&&foam<=.231);
     if(foam>.035)found++;
     assert.ok(Math.abs(foam-backwashRivulet(t+1/SURF_CYCLE_RATE,v,x,height))<1e-9);
   }
   assert.ok(backwashRivulet(phaseTime(.28,v),v,(peak+front)/2,height)<.00001);
   assert.ok(backwashRivulet(phaseTime(.995,v),v,(peak+front)/2,height)<.00001);
   assert.ok(backwashRivulet(t,v,peak-.08,height)<.00001);
   assert.ok(backwashRivulet(t,v,front+.13,height)<.00001);
  }
 }
 assert.ok(found>50,'new effect is invisible across the shore');
});
test('GPU rivulet mask follows the physical backwash instead of permanent streaks',()=>{
 assert.match(swashFragmentShader,/float rivulets=\.23\*streams\*exposed\*withdrawing/);
 assert.match(swashFragmentShader,/foamAlpha\+=rivulets/);
 assert.match(swashFragmentShader,/float turn=uTime\*1\.44513262/);
 assert.match(swashFragmentShader,/sin\(vUv\.y\*117\.\+split\+vUv\.x\*15\.-turn\*2\.\)/);
 assert.match(swashFragmentShader,/foamAlpha\*=uFoam\*shoreFade/);
 assert.doesNotMatch(swashFragmentShader,/wetAlpha\*=uFoam/);
});
