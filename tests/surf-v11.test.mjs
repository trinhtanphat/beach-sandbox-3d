import test from 'node:test';
import assert from 'node:assert/strict';
import {
 SURF_CYCLE_RATE, sectionBreak, breakSectionGLSL, oceanFragmentShader,
 breakerPhase, waveEnvelope
} from '../src/waves.js';
import {lipSample,breakerLipFragmentShader,breakerLipVertexShader} from '../src/breaker-lip.js';
import {surfSprayPoint,sprayVertexShader} from '../src/surf-spray.js';

test('breaking sections stay finite and repeat across the full swell cycle',()=>{
 const duration=1/SURF_CYCLE_RATE;
 for(const shift of [0,.56])for(const time of [-3,-.1,0,.5,1,2.3,4.2,12]){
  for(let v=0;v<=1;v+=.025){
   const s=sectionBreak(time,v,shift);
   assert.ok(s>=.16-1e-12&&s<=1+1e-12);
   assert.ok(Math.abs(s-sectionBreak(time+duration,v,shift))<1e-10);
  }
 }
});
test('breaking sections vary visibly along the coast, but remain continuous',()=>{
 const samples=Array.from({length:201},(_,i)=>sectionBreak(.8,i/200,0));
 const range=Math.max(...samples)-Math.min(...samples);
 assert.ok(range>.45,'breaker is still a uniform uninterrupted white ribbon');
 assert.ok(Math.max(...samples.slice(1).map((x,i)=>Math.abs(x-samples[i])))<.18,'abrupt section pop');
});
test('ocean, raised crest, foam particles reuse the same GLSL section function',()=>{
 for(const shader of [oceanFragmentShader,breakerLipFragmentShader,sprayVertexShader]){
  assert.ok(shader.includes(breakSectionGLSL.trim()),'section function is out of sync');
  assert.match(shader,/breakingSections\(/);
 }
 assert.match(oceanFragmentShader,/breakingSections\(uv\.y,uTime,\.56\)/);
 assert.match(breakerLipVertexShader,/vPhaseShift=aPhaseShift/);
 assert.match(breakerLipFragmentShader,/breakingSections\(vUv\.y,uTime,vPhaseShift\)/);
 assert.match(sprayVertexShader,/breakingSections\(v,uTime,aPhaseShift\)/);
});
test('CPU references keep lip and spray section strength in phase',()=>{
 for(const shift of [0,.56])for(const time of [.3,1.2,2.8,4.1]){
  for(const z of [-4,-1,0,2.8,4]){
   const lip=lipSample(time,z,.5,.8,shift);
   const spray=surfSprayPoint(time,z,13,.8,shift);
   assert.ok(Math.abs(lip.section-spray.section)<1e-12);
   assert.ok(Math.abs(spray.visibleLife-spray.life*lip.section)<1e-12);
   assert.ok(lip.section>=.16&&lip.section<=1);
   const v=(z+5.4)/10.8;
   assert.ok(Number.isFinite(breakerPhase(time,v,shift)));
   assert.ok(waveEnvelope(breakerPhase(time,v,shift))>=0);
  }
 }
});
