import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  createBreakerLip, lipSample, LIP_COLS,LIP_ROWS,breakerLipVertexShader
} from '../src/breaker-lip.js';
import {
  createSurfSpray, SPRAY_PARTICLES, surfSprayPoint, sprayVertexShader
} from '../src/surf-spray.js';

test('GPU crest stays statically anchored while uniforms animate',()=>{
  const scene=new THREE.Scene();
  const lip=createBreakerLip(THREE,scene);
  try{
    const position=lip.mesh.geometry.getAttribute('position');
    const original=Float32Array.from(position.array);
    const version=position.version;
    assert.equal(lip.vertexCount,(LIP_ROWS+1)*(LIP_COLS+1));
    assert.equal(lip.mesh.geometry.getAttribute('aWaterWidth').count,lip.vertexCount);
    for(let i=0;i<350;i++)lip.update(i/60,.1+(i%15)*.1,.75);
    assert.equal(position.version,version,'geometry uploaded again every frame');
    assert.deepEqual(Array.from(position.array),Array.from(original));
    assert.equal(lip.mesh.material.uniforms.uTime.value,349/60);
    assert.match(breakerLipVertexShader,/aWaterWidth\*front/);
    assert.match(breakerLipVertexShader,/uWave/);
    assert.ok(lip.mesh.geometry.index.count>10000);
    const shape=lipSample(.7,0,.5,.6);
    assert.ok(Number.isFinite(shape.x)&&Number.isFinite(shape.y));
  }finally{lip.dispose();}
  assert.equal(scene.children.length,0);
});
test('GPU sea spray uploads static anchors once, uses timer uniforms only',()=>{
  const scene=new THREE.Scene();
  const spray=createSurfSpray(THREE,scene);
  try{
    const geo=spray.points.geometry;
    const pos=geo.getAttribute('position');
    const original=Float32Array.from(pos.array);
    const version=pos.version;
    assert.equal(spray.count,SPRAY_PARTICLES);
    for(const name of ['aWaterWidth','aAlong','aSeed','aRandom']){
      assert.equal(geo.getAttribute(name).count,SPRAY_PARTICLES);
    }
    for(let i=0;i<350;i++)spray.update(i/60,1.2);
    assert.equal(pos.version,version);
    assert.deepEqual(Array.from(pos.array),Array.from(original));
    assert.equal(spray.points.material.uniforms.uTime.value,349/60);
    assert.equal(spray.points.material.uniforms.uWave.value,1.2);
    assert.match(sprayVertexShader,/vLife/);
    assert.match(sprayVertexShader,/aRandom/);
    const p=surfSprayPoint(.55,2,3,.6);
    assert.ok(p.life>=0&&p.life<=1);
  }finally{spray.dispose();}
  assert.equal(scene.children.length,0);
});
