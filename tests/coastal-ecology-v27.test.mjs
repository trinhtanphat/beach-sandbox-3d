import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {floodedInlandMetrics,rockHeightOnEditedGround} from '../src/coastal-metrics.js';
import {submergedCenter,SEA_LEVEL} from '../src/world-layout.js';
import {createLagoonSurface} from '../src/lagoon-surface.js';

test('inland flooded metrics exclude offshore cells and disconnected pits',()=>{
 const c=5,r=3,h=new Float32Array(c*r).fill(-.1);
 const m=new Uint8Array(c*r).fill(1);
 // Grid x values -2,-1,0,1,2; only x<0 should count as inland.
 // Disconnect first inland node.
 m[0]=0;m[5]=0;m[10]=0;
 const result=floodedInlandMetrics(h,m,c,r,
  {minX:-2,maxX:2,minZ:-1,maxZ:1},()=>0);
 assert.equal(result.floodedCells,3);
 assert.equal(result.area,3);
 assert.ok(Math.abs(result.capacity-3*(SEA_LEVEL+.1))<1e-5);
 assert.ok(Math.abs(result.meanDepth-(SEA_LEVEL+.1))<1e-5);
});
test('inland metrics are zero without connected low nodes, reject bad grids',()=>{
 const h=new Float32Array(9).fill(.3),mask=new Uint8Array(9).fill(1);
 const bounds={minX:0,maxX:2,minZ:0,maxZ:2};
 const result=floodedInlandMetrics(h,mask,3,3,bounds,()=>2,SEA_LEVEL);
 assert.equal(result.floodedCells,0);
 assert.equal(result.area,0);
 assert.equal(result.capacity,0);
 assert.equal(result.meanDepth,0);
 assert.throws(()=>floodedInlandMetrics(h,mask,4,3,bounds,()=>2),RangeError);
 assert.throws(()=>floodedInlandMetrics(h,mask,3,3,{...bounds,maxX:-1},()=>2),RangeError);
});
test('rocks stay below connected water and restore to dry land elevation',()=>{
 const sc=.8;
 const wet=rockHeightOnEditedGround(-.20,sc,submergedCenter);
 const dry=rockHeightOnEditedGround(.30,sc,submergedCenter);
 assert.ok(wet<SEA_LEVEL-.05,'submerged rock remains under sea surface');
 assert.ok(wet<=-.20+.05,'submerged center stays close to seafloor');
 assert.ok(Math.abs(dry-(.30+.08))<1e-10);
 assert.throws(()=>rockHeightOnEditedGround(0,0,submergedCenter),RangeError);
});
test('water surface exposes stable nonnegative inland metrics after sculpt reload',()=>{
 const scene=new THREE.Scene();
 let level=-.12;
 const model=createLagoonSurface(THREE,scene,()=>level,()=>100,
  {uTime:{value:0},uWave:{value:1},uDay:{value:1}});
 try{
  assert.ok(model.metrics.area>0);
  assert.ok(model.metrics.meanDepth>0);
  const before=model.metrics.capacity;
  level=-.22; model.refresh();
  assert.ok(model.metrics.capacity>before);
  level=.6; model.refresh();
  assert.equal(model.metrics.area,0);
  assert.equal(model.metrics.meanDepth,0);
 }finally{model.dispose()}
});
