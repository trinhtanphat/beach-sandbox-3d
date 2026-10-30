import test from 'node:test';
import assert from 'node:assert/strict';
import {canPlace,SEA_LEVEL} from '../src/world-layout.js';
import {landDistance} from '../src/simulation.js';
import {LAGOON_CENTER} from '../src/lagoon-physics.js';
import {createCoastalFlow} from '../src/inland-hydraulics.js';

const x=LAGOON_CENTER.x,z=LAGOON_CENTER.z;
test('dammed but wet inland pond can receive a new floating boat',()=>{
 assert.ok(landDistance(x,z)>0,'lagoon test position should be inland');
 assert.equal(canPlace('boat',x,z,-.20,false,.18),true);
 assert.equal(canPlace('boat',x,z,SEA_LEVEL+.07,false,.18),true,
  'raised dry-looking bed can hold trapped surface water');
 assert.equal(canPlace('boat',x,z,-.20,false,.045),false,'minimum float depth');
});
test('newly excavated dry hole refuses a boat even when its trench reaches the sea',()=>{
 assert.equal(canPlace('boat',x,z,-.20,true,0),false);
 assert.equal(canPlace('boat',x,z,-.20,false,0),false);
 assert.equal(canPlace('boat',x,z,-.20,true,.04501),true);
 assert.equal(canPlace('boat',x,z,-.20,true,NaN),false);
 assert.equal(canPlace('boat',x,z,-.20,true,-1),false);
});
test('historical boat placement callers and offshore placement remain compatible',()=>{
 assert.equal(canPlace('boat',x,z,-.20,false),false);
 assert.equal(canPlace('boat',x,z,-.20,true),true);
 assert.equal(canPlace('boat',x,z,-.20),true);
 assert.equal(canPlace('boat',x,z,.20,true,.30),true);
 assert.equal(canPlace('boat',200,z,-.20,true,.30),false);
});
test('real finite-volume pond remains boat-eligible after closing an inlet',()=>{
 const c=16,r=5,n=c*r,bed=new Float32Array(n).fill(.4),res=new Uint8Array(n);
 for(let row=0;row<r;row++){const i=row*c+c-1;bed[i]=-.18;res[i]=1;}
 for(let row=1;row<4;row++)for(let col=1;col<5;col++)bed[row*c+col]=-.20;
 for(let col=5;col<c-1;col++)bed[2*c+col]=-.15;
 const f=createCoastalFlow({columns:c,rows:r,heights:bed,reservoir:res,dx:.1,dz:.1});
 const center=2*c+2;
 assert.ok(f.depth[center]>.25);
 const dam=Float32Array.from(bed);
 dam[2*c+9]=.40;
 f.setTerrain(dam);
 for(let i=0;i<140;i++)f.advance(.12);
 assert.ok(f.depth[center]>.08);
 assert.equal(canPlace('boat',x,z,dam[center],false,f.depth[center]),true);
 // The boat becomes ineligible only if the pond is actually dry.
 assert.equal(canPlace('boat',x,z,dam[center],false,0),false);
});
