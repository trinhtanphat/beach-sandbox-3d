import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {terrainHeight,shoreline} from '../src/simulation.js';
import {LAGOON_CENTER,LAGOON_SEA_LEVEL} from '../src/lagoon-physics.js';
import {createLagoonSurface} from '../src/lagoon-surface.js';
import {createCoastalFlow} from '../src/inland-hydraulics.js';

test('an initially calm sea-connected lagoon never drains or creates spikes over time',()=>{
 const scene=new THREE.Scene();
 const water=createLagoonSurface(THREE,scene,terrainHeight,shoreline,
  {uTime:{value:0},uWave:{value:1},uDay:{value:1}});
 try {
  const startDepth=water.waterDepth(LAGOON_CENTER.x,LAGOON_CENTER.z);
  const startArea=water.metrics.area;
  assert.ok(startDepth>.22);
  for(let i=0;i<240;i++)water.advance(.06);
  const endDepth=water.waterDepth(LAGOON_CENTER.x,LAGOON_CENTER.z);
  assert.ok(Math.abs(endDepth-startDepth)<.002,'lake drained unexpectedly: '+startDepth+' => '+endDepth);
  assert.ok(Math.abs(water.metrics.area-startArea)<.2);
  const y=water.mesh.geometry.attributes.position;
  const wet=water.mesh.geometry.attributes.aWet;
  const cols=185;
  let maxGradient=0;
  for(let z=0;z<120;z++)for(let x=0;x<184;x++){
   const a=z*cols+x,b=a+1;
   // A shoreline water/zero-opacity boundary may not create an upright wall.
   maxGradient=Math.max(maxGradient,Math.abs(y.getY(a)-y.getY(b)));
   if(wet.getX(a)>.9 && wet.getX(b)>.9){
    assert.ok(Math.abs(y.getY(a)-y.getY(b))<.025,'unphysical water surface jump');
   }
  }
  assert.ok(maxGradient<.08,'vertically distorted water triangles: '+maxGradient);
 }finally{water.dispose()}
});
test('a nearly flat wet channel maintains a horizontal free surface for 30 seconds',()=>{
 const c=12,r=3,h=new Float32Array(c*r).fill(-.15);
 const src=new Uint8Array(c*r);
 for(let row=0;row<r;row++)src[row*c+c-1]=1;
 const f=createCoastalFlow({columns:c,rows:r,heights:h,reservoir:src,dx:.1,dz:.1});
 for(let i=0;i<500;i++)f.advance(.06);
 let worst=0;
 for(let i=0;i<h.length;i++)worst=Math.max(worst,Math.abs(f.bed[i]+f.depth[i]-LAGOON_SEA_LEVEL));
 assert.ok(worst<.0003,'hydrostatic instability: '+worst);
});

test('building an underwater sandbar pushes water outward without destroying volume',()=>{
 const c=9,r=5,bed=new Float32Array(c*r).fill(.5);
 const ocean=new Uint8Array(c*r);
 for(let z=0;z<r;z++){ocean[z*c+c-1]=1;}
 // Shallow inland pool; ocean reservoir is separated by high solid ground.
 for(let x=1;x<6;x++)for(let z=1;z<4;z++)bed[z*c+x]=-.18;
 const flow=createCoastalFlow({columns:c,rows:r,heights:bed,reservoir:ocean,dx:.1,dz:.1});
 for(let x=1;x<6;x++)for(let z=1;z<4;z++)flow.depth[z*c+x]=.2;
 const initial=flow.totalVolume(),edge=2*c+4;
 const edit=Float32Array.from(bed);edit[edge]=.12;
 flow.setTerrain(edit);
 assert.ok(Math.abs(initial-flow.totalVolume())<1e-8,'terrain edit should preserve stored water volume');
 for(let step=0;step<140;step++)flow.advance(.06);
 assert.ok(Math.abs(initial-flow.totalVolume())<1e-7,'flowing water was lost after building a dam');
 assert.ok(flow.depth[edge]<.2,'elevated water should disperse into lower neighbours');
});
