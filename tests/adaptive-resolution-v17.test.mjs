import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdaptiveResolution} from '../src/adaptive-resolution.js';

function step(controller,{fps=60,dpr=1.5,seconds=1,hidden=false}={}){
 return controller.observe({fps,dpr,seconds,hidden});
}
test('six seconds of slow visible frames gently reduce DPR without going below floor',()=>{
 const control=createAdaptiveResolution({cap:1.6,min:.85});
 for(let i=0;i<5;i++)assert.equal(step(control,{fps:28}),null);
 const down=step(control,{fps:28});
 assert.ok(down!==null&&down<1.5&&down>1.2);
 // Cooldown and floor protect against a sawtooth during continuous slow rendering.
 for(let i=0;i<11;i++)assert.equal(step(control,{fps:20,dpr:down}),null);
 let dpr=down;
 for(let i=0;i<150;i++){
  const next=step(control,{fps:20,dpr});
  if(next!==null)dpr=next;
 }
 assert.ok(dpr>=.85&&dpr<1);
});
test('recovery requires sustained high FPS and cannot exceed initial pixel ratio cap',()=>{
 const controller=createAdaptiveResolution({cap:1.35,min:.85});
 let dpr=.85;
 for(let i=0;i<17;i++)assert.equal(step(controller,{fps:59,dpr}),null);
 const up=step(controller,{fps:59,dpr});
 assert.ok(up>.85&&up<.98);
 dpr=up;
 for(let i=0;i<160;i++){
  const n=step(controller,{fps:60,dpr});if(n!==null)dpr=n;
 }
 assert.ok(dpr<=1.35);
 assert.ok(dpr>1.2);
});
test('stable midrange FPS, tiny one-off stutters and hidden tabs cannot change DPR',()=>{
 const c=createAdaptiveResolution({cap:1.65});
 for(let i=0;i<250;i++)assert.equal(step(c,{fps:i%17===0?18:43,dpr:1.65}),null);
 for(let i=0;i<5;i++)step(c,{fps:12,dpr:1.65});
 assert.equal(step(c,{fps:0,dpr:1.65,hidden:true}),null);
 assert.equal(step(c,{fps:12,dpr:1.65}),null);
 for(let i=0;i<4;i++)assert.equal(step(c,{fps:12,dpr:1.65}),null);
 assert.ok(step(c,{fps:12,dpr:1.65})<1.65);
});
test('invalid measurements do not trigger an adaptive resize',()=>{
 const c=createAdaptiveResolution({cap:1.5});
 for(const fps of [NaN,Infinity,0,-2])assert.equal(step(c,{fps}),null);
 assert.equal(step(c,{fps:15,seconds:20}),null);
 assert.equal(step(c,{fps:15,dpr:NaN}),null);
 assert.throws(()=>createAdaptiveResolution({cap:.5,min:.85}),RangeError);
 assert.throws(()=>createAdaptiveResolution({downFps:60,upFps:40}),RangeError);
});
