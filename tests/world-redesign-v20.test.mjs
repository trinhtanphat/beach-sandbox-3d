import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {planForest,FOREST_COUNT,SEA_LEVEL,COASTAL_ZONES,submergedCenter,canPlace} from '../src/world-layout.js';
import {landDistance,terrainHeight,shoreline} from '../src/simulation.js';
import {makeReefField,REEF_CAPACITY} from '../src/reefs.js';
import {oceanFragmentShader} from '../src/waves.js';

test('forest is dispersed, deterministic, land-only, and reserves a visible sand belt',()=>{
 const a=planForest(),b=planForest();
 assert.deepEqual(a,b);
 assert.equal(a.length,FOREST_COUNT);
 assert.ok(FOREST_COUNT>=220&&FOREST_COUNT<=550);
 for(const t of a){
   assert.ok(landDistance(t.x,t.z)>=2.10,'tree on active surf or wet shoreline');
   assert.ok(t.x>=-8.7&&t.x<=.3&&Math.abs(t.z)<=5.025);
   assert.ok(t.scale>=.46&&t.scale<=.94);
   assert.ok(Number.isFinite(terrainHeight(t.x,t.z)));
 }
 for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++){
   assert.ok(Math.hypot(a[i].x-a[j].x,a[i].z-a[j].z)>=.389999,'overcrowded canopy');
 }
 assert.ok(a.some(t=>landDistance(t.x,t.z)>4),'inland grove missing');
 assert.ok(a.some(t=>landDistance(t.x,t.z)<3),'forest-to-beach fringe missing');
});
test('rock and coral heights remain under the surface rather than floating as islands',()=>{
 for(const z of [-5.1,-2.5,0,2.5,5.1]){
  for(const distance of [1.8,3,5,7]){
   const x=shoreline(z)+distance,floor=terrainHeight(x,z);
   for(const extent of [.025,.08,.14,.21]){
    const y=submergedCenter(floor,extent);
    assert.ok(y+extent<=SEA_LEVEL-.05499,'reef penetrates sea surface');
    assert.ok(Number.isFinite(y));
   }
  }
 }
 assert.throws(()=>submergedCenter(0,-2),RangeError);
 const scene=new THREE.Scene();
 const field=makeReefField(THREE,scene,terrainHeight,shoreline);
 try{
  assert.ok(field.count>100&&field.count<=REEF_CAPACITY);
  assert.equal(scene.children.length,4);
  const matrix=new THREE.Matrix4(),pos=new THREE.Vector3(),quat=new THREE.Quaternion(),scale=new THREE.Vector3();
  for(const mesh of scene.children)for(let i=0;i<mesh.count;i++){
   mesh.getMatrixAt(i,matrix);matrix.decompose(pos,quat,scale);
   assert.ok(pos.y+.17*scale.y<=SEA_LEVEL-.05);
   assert.ok(pos.x>=shoreline(pos.z)+1.85,'corals on the beach');
  }
 }finally{field.dispose();}
 assert.equal(scene.children.length,0);
});
test('ocean has a single progressive shelf color and retains whitewater shader',()=>{
 assert.match(oceanFragmentShader,/vec3 lagoon=vec3\(\.24,\.83,\.77\)/);
 assert.match(oceanFragmentShader,/vec3 outerShelf=vec3\(\.026,\.46,\.57\)/);
 assert.match(oceanFragmentShader,/sea=mix\(sea,outerShelf,smoothstep\(\.30,1\.0,d\)\*\.84\)/);
 assert.match(oceanFragmentShader,/vec4\(sea,\.78\)/);
 assert.match(oceanFragmentShader,/foam=clamp\(/);
});

test('interactive tools honor wet beach, deep water, and world bounds',()=>{
 for(const z of [-4,-1,0,2.7,4.5]){
  const coast=shoreline(z);
  assert.equal(canPlace('tree',coast-2,z),true);
  assert.equal(canPlace('tree',coast-.20,z),false);
  assert.equal(canPlace('boat',coast+.95,z),true);
  assert.equal(canPlace('boat',coast-.3,z),false);
  assert.equal(canPlace('rock',coast+.7,z),true);
  assert.equal(canPlace('rock',coast-.8,z),true);
 }
 assert.equal(canPlace('tree',1e10,0),false);
 assert.equal(canPlace('boat',Infinity,0),false);
 assert.equal(canPlace('rock',0,99),false);
 assert.equal(canPlace('mystery',0,0),false);
});

test('all ecological bands form one consistent beach-to-sea cross section',()=>{
 const z=COASTAL_ZONES;
 assert.ok(Object.isFrozen(z));
 assert.ok(z.forestMinLand>z.plantMinLand);
 assert.ok(z.plantMinLand>0);
 assert.ok(z.reefMinOffshore>z.boatMinOffshore);
 assert.ok(z.swashInland>z.plantMinLand);
 assert.ok(z.swashInland+z.swashSeaward>2);
 assert.ok(z.seaOverlap>=0&&z.seaOverlap<.2);
 assert.equal(SEA_LEVEL,.104);
});
