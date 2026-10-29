import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {sculptGridRegion} from '../src/sculpt-grid-region.js';
import {WIDTH,DEPTH,landDistance,terrainHeight,brushInfluence,clamp} from '../src/simulation.js';

const cols=181,rows=109;
function geometry(){
 const g=new THREE.PlaneGeometry(WIDTH,DEPTH,cols-1,rows-1);
 g.rotateX(-Math.PI/2);
 const p=g.attributes.position;
 for(let i=0;i<p.count;i++)p.setY(i,terrainHeight(p.getX(i),p.getZ(i)));
 return g;
}
function oldBrush(p,point,radius,tool){
 let changed=0;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),z=p.getZ(i),d=Math.hypot(point.x-x,point.z-z);
  if(d>=radius || landDistance(x,z)<0)continue;
  const inf=brushInfluence(d,radius),h=p.getY(i);
  let next=h;
  if(tool==='raise')next=clamp(h+.017*inf,-.12,1.25);
  if(tool==='lower')next=clamp(h-.017*inf,-.258,1.25);
  if(tool==='smooth')next=h+(terrainHeight(x,z)-h)*.035*inf;
  if(next!==h){p.setY(i,next);changed++;}
 }
 return changed;
}
test('local brush exactly matches legacy global scan for Dig, Build, Rake across edge points',()=>{
 const samples=[
  {x:-3,z:0},{x:-1.9,z:.65},{x:-7.95,z:4.8},
  {x:8.95,z:-5.33},{x:-8.95,z:-5.32},{x:-.12,z:-2.7},
  {x:-4.3,z:3.3},{x:1.23,z:-1.8}
 ];
 for(const tool of ['raise','lower','smooth'])for(const radius of [.2,.7,1.5]){
  const old=geometry(),now=geometry(),a=old.attributes.position,b=now.attributes.position;
  for(const point of samples){
   const changes=oldBrush(a,point,radius,tool);
   const stats=sculptGridRegion({positions:b,columns:cols,rows,width:WIDTH,depth:DEPTH,
    point,radius,tool,landDistance,terrainHeight,brushInfluence,clamp});
   assert.equal(stats.changed,changes,tool+'/'+radius+'/'+JSON.stringify(point));
   for(let i=0;i<a.count;i++)assert.equal(b.getY(i),a.getY(i),'mismatch at vertex '+i);
  }
  old.dispose();now.dispose();
 }
});
test('small brush touches far fewer vertices than the full 19,729-node terrain',()=>{
 const g=geometry(),p=g.attributes.position;
 const changes=sculptGridRegion({positions:p,columns:cols,rows,width:WIDTH,depth:DEPTH,
  point:{x:-2,z:.3},radius:.7,tool:'lower',landDistance,terrainHeight,brushInfluence,clamp});
 assert.ok(changes.changed>0);
 assert.ok(changes.visited<400,'visited '+changes.visited+' vertices');
 assert.ok(changes.visited<p.count/30,'not sufficiently local');
 g.dispose();
});
test('invalid grid, point, radius or tool is rejected with no mutation',()=>{
 const g=geometry(),p=g.attributes.position,baseline=p.getY(33);
 const base={positions:p,columns:cols,rows,width:WIDTH,depth:DEPTH,
 point:{x:-2,z:0},radius:.7,tool:'lower',landDistance,terrainHeight,brushInfluence,clamp};
 for(const bad of [{radius:0},{point:{x:NaN,z:0}},{columns:15},{tool:'erase'}])
  assert.throws(()=>sculptGridRegion({...base,...bad}),RangeError);
 assert.equal(p.getY(33),baseline);
 g.dispose();
});
