import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {coastalFlowGLSL,longshoreSpeed,foamTravel,foamReturnTravel} from '../src/coastal-flow.js';
import {breakerPhase,frontWarp,waveEnvelope,oceanFragmentShader} from '../src/waves.js';
import {surfSprayPoint,sprayVertexShader,createSurfSpray,SPRAY_PARTICLES} from '../src/surf-spray.js';
import {breakerLipFragmentShader} from '../src/breaker-lip.js';
import {DEPTH,shoreline} from '../src/simulation.js';

test('longshore flow is bounded, preferentially shallow and dissipates at board edges',()=>{
 for(let ui=0;ui<=25;ui++)for(let vi=0;vi<=100;vi++){
  const u=ui/25,v=vi/100,s=longshoreSpeed(u,v);
  assert.ok(Number.isFinite(s)&&s>=0&&s<=.00501);
  const drift=foamTravel(u,v,.999);
  assert.ok(drift>=0&&drift<=.022);
  assert.ok(drift<=.022);
 }
 assert.equal(longshoreSpeed(.2,0),0);
 assert.equal(longshoreSpeed(.2,1),0);
 assert.equal(longshoreSpeed(1,.5),0);
 assert.ok(longshoreSpeed(.1,.5)>longshoreSpeed(.65,.5));
 assert.ok(foamTravel(.1,.5,.8)>foamTravel(.1,.5,.2));
 assert.throws(()=>longshoreSpeed(NaN,.5),RangeError);
 assert.throws(()=>foamTravel(.5,.5,Infinity),RangeError);
});
test('all GPU whitewater layers reuse one flow field and each own swell-train age',()=>{
 for(const shader of [oceanFragmentShader,sprayVertexShader,breakerLipFragmentShader]){
  assert.ok(shader.includes(coastalFlowGLSL.trim()),'GPU current formula differs between layers');
  assert.match(shader,/foamTravel\(/);
 }
 assert.match(oceanFragmentShader,/foamA=surfSheet\(uv\.x,frontA,strand,uv,0\.\)/);
 assert.match(oceanFragmentShader,/foamB=surfSheet\(uv\.x,frontB,micro,uv,\.56\)/);
 assert.match(breakerLipFragmentShader,/vPhaseShift\)/);
 assert.match(sprayVertexShader,/p\.z\+=10\.8\*foamTravel\(front,v,cycle\)/);
});
test('spray particle CPU reference follows the same alongshore drift, one draw call',()=>{
 for(const t of [0,.1,.55,1,1.7,2.9,5])for(const z of [-4.7,-2,0,2,4.7]){
  const v=(z+DEPTH/2)/DEPTH,coast=shoreline(z)-.1;
  const w=9.06-coast;
  for(const shift of [0,.56]){
    const sample=surfSprayPoint(t,z,3,.8,shift);
    const phase=breakerPhase(t,v,shift);
    const front=.34-.33*phase+frontWarp(t,v);
    const r=Math.sin(3*127.1+z*311.7)*43758.5453;
    const random=r-Math.floor(r);
    assert.ok(Math.abs(sample.x-(coast+w*(front+.004+.065*random+foamReturnTravel(front,v,phase))))<1e-9);
    assert.ok(Math.abs(sample.z-z-DEPTH*foamTravel(front,v,phase))<1e-9);
    assert.ok(sample.z-z>=0&&sample.z-z<=.24);
    // A particle becomes invisible at the wrap, hiding bounded age reset.
    if(phase>.995)assert.ok(waveEnvelope(phase)<.001);
  }
 }
 const scene=new THREE.Scene(),gpu=createSurfSpray(THREE,scene);
 try{
  assert.equal(scene.children.length,1);
  assert.equal(gpu.points.geometry.getAttribute('position').count,SPRAY_PARTICLES);
  const initialVersion=gpu.points.geometry.getAttribute('position').version;
  for(let frame=0;frame<200;frame++)gpu.update(frame/60,1,1.4);
  assert.equal(gpu.points.geometry.getAttribute('position').version,initialVersion);
 }finally{gpu.dispose();}
});
