import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {inlandBoatHeight} from '../src/inland-boat.js';
import {createLagoonSurface} from '../src/lagoon-surface.js';
import {terrainHeight,shoreline} from '../src/simulation.js';
import {LAGOON_CENTER,LAGOON_SEA_LEVEL} from '../src/lagoon-physics.js';

test('moored inland boat tracks its own pond waterline, not a global sea level',()=>{
 const bed=-.2;
 const deeper=.28,shallower=.12;
 assert.ok(Math.abs(inlandBoatHeight(bed,deeper)-.145)<1e-9);
 assert.ok(Math.abs(inlandBoatHeight(bed,shallower)-(-.015))<1e-9);
 assert.ok(Math.abs(inlandBoatHeight(bed,deeper,.006)-inlandBoatHeight(bed,deeper)-.006)<1e-10);
 assert.throws(()=>inlandBoatHeight(bed,-1),RangeError);
 assert.throws(()=>inlandBoatHeight(Number.NaN,.3),RangeError);
});
test('lagoon buoyancy responds to actual edited water height and respects pause',()=>{
 const scene=new THREE.Scene(),w=createLagoonSurface(THREE,scene,terrainHeight,shoreline,
  {uTime:{value:0},uWave:{value:1},uDay:{value:1}});
 try{
  const bed=terrainHeight(LAGOON_CENTER.x,LAGOON_CENTER.z);
  const oldHeight=inlandBoatHeight(bed,w.waterDepth(LAGOON_CENTER.x,LAGOON_CENTER.z));
  assert.ok(Math.abs(oldHeight-(LAGOON_SEA_LEVEL+.065))<.018);
  assert.equal(w.advance(0),0);
  assert.equal(inlandBoatHeight(bed,w.waterDepth(LAGOON_CENTER.x,LAGOON_CENTER.z)),oldHeight);
 }finally{w.dispose();}
});
test('water physics steps run independently of throttled GPU-geometry uploads',()=>{
 const scene=new THREE.Scene(),w=createLagoonSurface(THREE,scene,terrainHeight,shoreline,
  {uTime:{value:0},uWave:{value:1},uDay:{value:1}});
 try{
  const baseline=w.geometryRefreshes;
  let steps=0;
  for(let i=0;i<120;i++)steps+=w.advance(1/60);
  const uploads=w.geometryRefreshes-baseline;
  assert.ok(steps>=30,'physical simulation should run each substep');
  assert.ok(uploads>=12&&uploads<=20,'water geometry should refresh at ~10 Hz: '+uploads);
  assert.ok(uploads<steps,'render throttling must not reduce hydraulic timesteps');
  const beforeRefresh=w.geometryRefreshes;
  w.refresh();
  assert.equal(w.geometryRefreshes,beforeRefresh+1,'sculpt finish redraws immediately');
  const center=w.waterDepth(LAGOON_CENTER.x,LAGOON_CENTER.z);
  assert.ok(Math.abs(center-(LAGOON_SEA_LEVEL-terrainHeight(LAGOON_CENTER.x,LAGOON_CENTER.z)))<.003);
 }finally{w.dispose();}
});
