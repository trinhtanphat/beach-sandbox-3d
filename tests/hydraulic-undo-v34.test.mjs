import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {captureTerrainUndo,restoreTerrainUndo} from '../src/hydraulic-undo.js';
import {createCoastalFlow} from '../src/inland-hydraulics.js';

function terrain(){
 const geometry=new THREE.PlaneGeometry(18,10.8,180,108);
 geometry.rotateX(-Math.PI/2);
 const p=geometry.attributes.position;
 for(let i=0;i<p.count;i++)p.setY(i,.1);
 return {geometry,p};
}
test('Undo captures all 19,729 sand heights and 22,385 water cells without retaining references',()=>{
 const {geometry,p}=terrain(),water=new Float32Array(22385).fill(.24);
 const state=captureTerrainUndo(p,water);
 assert.equal(state.heights.length,19729);
 assert.equal(state.water.length,22385);
 p.setY(40,.8);water[12]=0;
 assert.ok(Math.abs(state.heights[40]-.1)<1e-7);
 assert.ok(Math.abs(state.water[12]-.24)<1e-7);
 restoreTerrainUndo(p,state,22385);
 assert.ok(Math.abs(p.getY(40)-.1)<1e-7);
 assert.ok(Math.abs(state.water[12]-.24)<1e-7);
 geometry.dispose();
});
test('Malformed undo record cannot corrupt the height field before validation',()=>{
 const {geometry,p}=terrain(),state=captureTerrainUndo(p,new Float32Array(5).fill(.2));
 const baseline=p.getY(22);
 for(const bad of [{...state,water:new Float32Array(4)},{...state,heights:[NaN]},{...state,water:[0,0,0,-1,0]}])
  assert.throws(()=>restoreTerrainUndo(p,bad,5),RangeError);
 assert.equal(p.getY(22),baseline);
 geometry.dispose();
});
test('Undo a sand dam restores both the original terrain and trapped water volume',()=>{
 const cols=16,rows=5,n=cols*rows;
 const heights=new Float32Array(n).fill(.4);
 const ocean=new Uint8Array(n);
 for(let z=0;z<rows;z++){
  const edge=z*cols+cols-1;heights[edge]=-.18;ocean[edge]=1;
 }
 for(let z=1;z<4;z++)for(let x=1;x<5;x++)heights[z*cols+x]=-.2;
 for(let x=5;x<cols-1;x++)heights[2*cols+x]=-.15;
 const hyd=createCoastalFlow({columns:cols,rows,heights,reservoir:ocean,dx:.1,dz:.1});
 const land={count:n,data:Float32Array.from(heights),getY(i){return this.data[i]},setY(i,y){this.data[i]=y}};
 const initial=captureTerrainUndo(land,hyd.depth),volumeBefore=hyd.totalVolume();
 land.setY(2*cols+9,.48);
 hyd.setTerrain(land.data);
 for(let k=0;k<120;k++)hyd.advance(.12);
 const waterAfter=hyd.totalVolume();
 assert.ok(Math.abs(waterAfter-volumeBefore)>.0000001,'a dam should affect flow before undo');
 const restoredWater=restoreTerrainUndo(land,initial,n);
 hyd.setTerrain(land.data);
 hyd.restoreDepth(restoredWater);
 assert.ok(Math.abs(hyd.totalVolume()-volumeBefore)<1e-9,'Undo should restore exact water volume');
 assert.equal(land.getY(2*cols+9),initial.heights[2*cols+9]);
 assert.ok(Math.abs(hyd.depth[2*cols+2]-initial.water[2*cols+2])<1e-6);
});
