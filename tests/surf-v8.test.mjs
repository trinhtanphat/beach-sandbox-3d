import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {DEPTH,HALF_DEPTH,shoreline,HALF_WIDTH} from '../src/simulation.js';
import {frontWarp,breakerPhase,breakerPosition,waveEnvelope,oceanVertexShader,oceanFragmentShader} from '../src/waves.js';
import {createBreakerLip,lipSample,LIP_TRAINS,breakerLipVertexShader} from '../src/breaker-lip.js';
import {createSurfSpray,surfSprayPoint,sprayVertexShader} from '../src/surf-spray.js';

test('scalloped fronts share the same wiggle and remain within sensible bounds',()=>{
 for(const time of [0,.25,1,2.5,4])for(let v=0;v<=1.0001;v+=.05){
   const w=frontWarp(time,v);
   assert.ok(Math.abs(w)<=.02701,'front noise is too large');
   const p=breakerPosition(time,v);
   assert.ok(Math.abs(p-(.34-.33*breakerPhase(time,v)+w))<1e-9);
 }
 assert.match(oceanVertexShader,/\.016\*sin\(uv\.y\*22/);
 assert.match(oceanFragmentShader,/\.016\*sin\(uv\.y\*22/);
 assert.match(breakerLipVertexShader,/\.016\*sin\(v\*22/);
 assert.match(sprayVertexShader,/\.016\*sin\(v\*22/);
});
test('second curling lip is real geometry within same single mesh/draw call',()=>{
 const scene=new THREE.Scene();
 const obj=createBreakerLip(THREE,scene);
 try{
  assert.equal(scene.children.length,1);
  assert.equal(LIP_TRAINS,2);
  const shift=obj.mesh.geometry.getAttribute('aPhaseShift');
  const strength=obj.mesh.geometry.getAttribute('aStrength');
  const perTrain=obj.vertexCount/2;
  assert.equal(shift.getX(0),0);
  assert.ok(Math.abs(shift.getX(perTrain)-.56)<1e-5);
  assert.ok(Math.abs(strength.getX(perTrain)-.68)<1e-5);
  assert.equal(obj.mesh.geometry.getAttribute('position').count,obj.vertexCount);
  for(const time of [.4,1,2])for(const z of [-3,0,4]){
   const a=lipSample(time,z,.5,.9,0);
   const b=lipSample(time,z,.5,.9,.56);
   assert.ok(Number.isFinite(a.x)&&Number.isFinite(b.x));
   assert.ok(a.y>=.104 && b.y>=.104);
   assert.ok(a.life>=0&&b.life>=0);
  }
 } finally {obj.dispose();}
});
test('spray shares two phase trains and stays coupled to lip',()=>{
 const scene=new THREE.Scene();
 const spray=createSurfSpray(THREE,scene);
 try{
  const shifts=spray.points.geometry.getAttribute('aPhaseShift');
  assert.ok(Math.abs(shifts.getX(0)-.56)<1e-6);
  assert.equal(shifts.getX(1),0);
  for(const shift of [0,.56])for(const time of [.5,1.3,3.1])for(const z of [-3,0,3]){
   const a=lipSample(time,z,.5,.7,shift);
   const s=surfSprayPoint(time,z,7,.7,shift);
   assert.ok(Math.abs(s.x-a.x)<.95,'disconnected foam flecks');
   assert.ok(Math.abs(s.life-waveEnvelope(breakerPhase(time,(z+HALF_DEPTH)/DEPTH,shift))*(shift>.1?.68:1))<1e-10);
  }
 }finally{spray.dispose();}
});
