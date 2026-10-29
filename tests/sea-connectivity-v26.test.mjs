import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {connectedSeaMask,LAGOON_CENTER,LAGOON_SEA_LEVEL} from '../src/lagoon-physics.js';
import {terrainHeight,shoreline} from '../src/simulation.js';
import {canPlace,SEA_LEVEL} from '../src/world-layout.js';
import {createLagoonSurface} from '../src/lagoon-surface.js';

const COLS=6,ROWS=5;
const at=(x,z)=>z*COLS+x;
function landscape(){
 const h=new Float32Array(COLS*ROWS).fill(.4);
 for(let z=0;z<ROWS;z++)h[at(COLS-1,z)]=-.2;
 h[at(1,2)]=-.2;
 return h;
}
test('an isolated dug basin is not flooded by the ocean',()=>{
 const h=landscape();
 const {connected,count}=connectedSeaMask(h,COLS,ROWS);
 assert.equal(connected[at(1,2)],0);
 assert.equal(count,ROWS);
});
test('a continuous trench connects to the ocean and opens the basin',()=>{
 const h=landscape();
 for(let x=2;x<=4;x++)h[at(x,2)]=-.2;
 const {connected,count}=connectedSeaMask(h,COLS,ROWS);
 assert.equal(connected[at(1,2)],1);
 assert.equal(count,ROWS+4);
});
test('raising a sand dam cuts off the basin again, even diagonally',()=>{
 const h=landscape();
 for(let x=2;x<=4;x++)h[at(x,2)]=-.2;
 h[at(3,2)]=.4;
 // Extra diagonal touch must not create a physically nonexistent opening.
 h[at(3,1)]=-.2;
 const {connected}=connectedSeaMask(h,COLS,ROWS);
 assert.equal(connected[at(1,2)],0);
});
test('shallow raised banks do not leak; invalid grids rejected',()=>{
 const h=landscape();
 h[at(2,2)]=SEA_LEVEL+.001;
 assert.equal(connectedSeaMask(h,COLS,ROWS).connected[at(1,2)],0);
 assert.throws(()=>connectedSeaMask(h,0,ROWS),RangeError);
 assert.throws(()=>connectedSeaMask([1,2],COLS,ROWS),RangeError);
});
test('default inland lagoon remains directly connected to seaward grid edge',()=>{
 const scene=new THREE.Scene();
 const water=createLagoonSurface(THREE,scene,terrainHeight,shoreline,
   {uTime:{value:0},uWave:{value:1},uDay:{value:1}});
 try{
  assert.ok(water.isConnected(LAGOON_CENTER.x,LAGOON_CENTER.z),'default lagoon must be sea-connected');
  assert.ok(water.floodedCount>150,'coastal sea should have connected cells');
  assert.equal(water.isConnected(-7.5,-3.5),false,'dry inland land stays dry');
 }finally{water.dispose();}
});
test('interactive boat requires actual sea connection, and trees cannot spawn underwater',()=>{
 const {x,z}=LAGOON_CENTER;
 assert.equal(canPlace('boat',x,z,terrainHeight(x,z),false),false);
 assert.equal(canPlace('boat',x,z,terrainHeight(x,z),true),true);
 assert.equal(canPlace('tree',x,z,terrainHeight(x,z)),false);
});
test('cut-off channels disappear from water mesh after sediment dam is raised',()=>{
 let dam=false;
 const scene=new THREE.Scene();
 const levels=(x,z)=>{
  if(x>1.8)return -.18;   // open sea on the right
  if(Math.abs(z)<.18 && x>-.7)return dam&&x>0&&x<.6?.4:-.18;
  if(x<-.5&&x>-.95&&Math.abs(z)<.3)return -.18; // inland water pocket
  return .4;
 };
 const water=createLagoonSurface(THREE,scene,levels,()=>9,
  {uTime:{value:0},uWave:{value:1},uDay:{value:1}});
 try{
  assert.equal(water.isConnected(-.7,0),true,'initial open channel should flood');
  dam=true;water.refresh();
  assert.equal(water.isConnected(-.7,0),false,'dam should disconnect pool');
  assert.equal(water.mesh.geometry.getAttribute('aWet').needsUpdate,undefined); // buffer flags are renderer-managed
 }finally{water.dispose();}
});
