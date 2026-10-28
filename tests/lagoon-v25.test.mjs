import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {landDistance,shoreline,terrainHeight} from '../src/simulation.js';
import {SEA_LEVEL,planForest,canPlace} from '../src/world-layout.js';
import {LAGOON_CENTER,lagoonProfile,excavateLagoon,lagoonWaterDepth,lagoonWetness,lagoonWaterMotion} from '../src/lagoon-physics.js';
import {createLagoonSurface} from '../src/lagoon-surface.js';

test('lagoon is a real submerged excavation with dry banks and bounded floor',()=>{
 const {x,z}=LAGOON_CENTER;
 assert.ok(landDistance(x,z)>1,'basin must be inland');
 const basin=terrainHeight(x,z);
 assert.ok(basin<SEA_LEVEL-.20,'lagoon floor needs navigable depth');
 assert.ok(basin>=-.258,'lagoon must not pierce the board');
 assert.ok(terrainHeight(x-3,z)>SEA_LEVEL,'dry inland bank');
 assert.ok(terrainHeight(x,z+2.7)>SEA_LEVEL,'dry lateral bank');
 assert.ok(lagoonProfile(x,z).basin>.9);
 assert.equal(excavateLagoon(8,5,-.3),-.3,'unmodified offshore floor');
});
test('continuous wet channel reaches open sea without a raised dam',()=>{
 const z=.55;
 for(let x=-1.8;x<=shoreline(z)+.4;x+=.12){
   assert.ok(terrainHeight(x,z)<SEA_LEVEL-.015,'channel blocked at x='+x);
 }
});
test('lagoon wetness has a bounded smooth bank and zero dry water opacity',()=>{
 for(const h of [-.30,-.1,.02,.11,.15,.4]){
   assert.ok(lagoonWetness(h)>=0&&lagoonWetness(h)<=1);
   assert.ok(lagoonWaterDepth(h)>=0);
 }
 assert.equal(lagoonWetness(.4),0);
 assert.ok(lagoonWetness(-.1)>.95);
 assert.ok(lagoonWaterDepth(-.1)>lagoonWaterDepth(.09));
});
test('forest and interactions obey the new waterline; lagoon boat has sufficient draft',()=>{
 const {x,z}=LAGOON_CENTER;
 assert.equal(canPlace('tree',x,z),false);
 assert.equal(canPlace('boat',x,z),true);
 assert.equal(canPlace('boat',x,z,SEA_LEVEL+.1),false,'cannot put boat on filled bank');
 assert.equal(canPlace('tree',x,z,SEA_LEVEL+.15),true,'after reclamation plant is valid');
 for(const p of planForest())assert.ok(terrainHeight(p.x,p.z)>=SEA_LEVEL+.034);
});
test('bounded tidal exchange and moored boat ripple without long-distance drift',()=>{
 for(let t=0;t<1000;t+=7.17){
   const m=lagoonWaterMotion(-3.25,.55,t,1.6);
   assert.ok(Number.isFinite(m.height)&&Math.abs(m.height)<.02);
   assert.ok(Math.abs(m.vx)<.017&&Math.abs(m.vz)<.007);
 }
});
test('lagoon surface refresh responds to raised terrain and disposes resources',()=>{
 const scene=new THREE.Scene();
 const uniforms={uTime:{value:0},uWave:{value:1},uDay:{value:1}};
 let floor=-.15;
 const water=createLagoonSurface(THREE,scene,()=>floor,()=>8,uniforms);
 const a=water.mesh.geometry.getAttribute('aWet');
 const before=a.getX(0);
 assert.ok(before>.99);
 floor=.3;water.refresh();
 assert.equal(a.getX(0),0);
 floor=-.1;water.refresh();
 assert.ok(a.getX(0)>.99);
 assert.ok(water.mesh.material.fragmentShader.includes('uDay'));
 water.dispose();assert.equal(scene.children.length,0);
});
