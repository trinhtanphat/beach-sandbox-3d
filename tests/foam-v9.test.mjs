import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSnapshot,parseSnapshot} from '../src/island-state.js';
import {oceanFragmentShader,swashFragmentShader} from '../src/waves.js';
import {createBreakerLip,breakerLipFragmentShader} from '../src/breaker-lip.js';
import {createSurfSpray,sprayFragmentShader} from '../src/surf-spray.js';

const island=()=>({heights:new Float32Array([0,.15,-.08,.3]),objects:[],wave:.6,speed:1,hours:12});
test('foam intensity is saved without breaking version 1 island files',()=>{
 const before=createSnapshot(island());
 assert.equal(before.foam,1);
 assert.equal(parseSnapshot(JSON.stringify(before),4).foam,1);
 const old={...before};delete old.foam;
 assert.equal(parseSnapshot(JSON.stringify(old),4).foam,1);
 const high=createSnapshot({...island(),foam:8});
 const low=createSnapshot({...island(),foam:-2});
 assert.equal(high.foam,1.8);
 assert.equal(low.foam,.3);
 assert.throws(()=>createSnapshot({...island(),foam:NaN}),/Invalid simulation settings/);
});
test('whitewater uniform controls sea, beach swash, lip and spray together',()=>{
 for(const shader of [oceanFragmentShader,swashFragmentShader,breakerLipFragmentShader,sprayFragmentShader]){
   assert.match(shader,/uniform float uFoam;/);
   assert.match(shader,/uFoam/);
 }
 const scene=new THREE.Scene(),lip=createBreakerLip(THREE,scene),spray=createSurfSpray(THREE,scene);
 try {
  lip.update(2,.6,.85,1.7);
  spray.update(2,.6,.4);
  assert.equal(lip.mesh.material.uniforms.uFoam.value,1.7);
  assert.equal(spray.points.material.uniforms.uFoam.value,.4);
 } finally {lip.dispose();spray.dispose();}
});
