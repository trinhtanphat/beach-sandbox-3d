import test from 'node:test';
import assert from 'node:assert/strict';
import {createCoastalFlow} from '../src/inland-hydraulics.js';

function channel({open=true,raised=false}={}){
 const c=16,r=5,n=c*r;
 const h=new Float32Array(n).fill(.35);
 const sources=new Uint8Array(n);
 for(let z=0;z<r;z++){
  const i=z*c+c-1;h[i]=-.18;sources[i]=1;
 }
 // Very low inland reservoir, dry until an inlet is dug.
 for(let x=1;x<5;x++)for(let z=1;z<4;z++)h[z*c+x]=-.20;
 if(open)for(let x=5;x<c-1;x++)h[2*c+x]=-.15;
 if(raised)h[2*c+9]=.4;
 return {columns:c,rows:r,heights:h,reservoir:sources,dx:.1,dz:.1};
}
test('closed pit stays dry even when its floor is below the sea level',()=>{
 const f=createCoastalFlow(channel({open:false}));
 for(let i=0;i<100;i++)f.advance(.12);
 assert.equal(f.depth[2*16+2],0);
});
test('opening a channel fills progressively, not by instantaneous teleportation',()=>{
 const setup=channel({open:false}),f=createCoastalFlow(setup);
 assert.equal(f.depth[2*16+2],0);
 f.setTerrain(channel({open:true}).heights);
 assert.equal(f.depth[2*16+2],0);
 const afterEdit=f.totalVolume();
 f.advance(.18);
 assert.equal(f.depth[2*16+2],0,'distant pool cannot fill immediately');
 for(let i=0;i<550;i++)f.advance(.12);
 assert.ok(f.depth[2*16+2]>.02,'water must reach basin through open trench');
 assert.ok(f.totalVolume()>afterEdit,'extra water came from the ocean reservoir');
});
test('raised impermeable dam holds an already flooded inland pool',()=>{
 const f=createCoastalFlow(channel({open:true}));
 const n=2*16+2,before=f.depth[n];
 assert.ok(before>.2,'initial equilibrium already wet');
 f.setTerrain(channel({open:true,raised:true}).heights);
 for(let i=0;i<250;i++)f.advance(.12);
 assert.ok(f.depth[n]>.06,'trapped pond water should not disappear');
});
test('finite-volume transfers conserve water without an ocean exchange',()=>{
 const p=channel({open:false});
 // Keep reservoir cells above sea level so they cannot exchange mass.
 for(let z=0;z<5;z++)p.heights[z*16+15]=.50;
 const f=createCoastalFlow(p);
 f.depth[2*16+2]=.3;f.depth[2*16+3]=.08;
 const initial=f.totalVolume();
 for(let i=0;i<150;i++)f.advance(.12);
 const current=f.totalVolume();
 assert.ok(Math.abs(current-initial)<1e-7,'mass lost or created: '+(current-initial));
 assert.ok([...f.depth].every(Number.isFinite));
 assert.ok([...f.depth].every(v=>v>=0),'negative water depth');
});
test('pause dt=0 is inert and depth obeys terrain refilling rules',()=>{
 const f=createCoastalFlow(channel({open:true}));
 const before=f.snapshot();
 assert.equal(f.advance(0),0);
 assert.deepEqual([...f.depth],[...before.depth]);
 assert.throws(()=>f.advance(-1),RangeError);
 assert.throws(()=>f.advance(NaN),RangeError);
 const terrain=Float32Array.from(f.bed);
 terrain[2*16+2]-=.1;
 f.setTerrain(terrain);
 assert.equal(f.depth[2*16+2],before.depth[2*16+2],'digging must not invent water');
 const volumeBeforeFill=f.totalVolume();
 terrain[2*16+2]+=.3;
 f.setTerrain(terrain);
 assert.ok(Math.abs(f.totalVolume()-volumeBeforeFill)<1e-7,'adding sand must displace, not destroy water');
 assert.equal(f.depth[2*16+2],before.depth[2*16+2],'bottom elevation changes the surface, not stored volume');
});
