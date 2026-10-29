import test from 'node:test';
import assert from 'node:assert/strict';
import {createSnapshot,parseSnapshot,SAVE_VERSION} from '../src/island-state.js';
import {createCoastalFlow} from '../src/inland-hydraulics.js';

function topology({blocked=false}={}){
 const columns=16,rows=5,bed=new Float32Array(columns*rows).fill(.4);
 const reservoir=new Uint8Array(bed.length);
 for(let y=0;y<rows;y++){const p=y*columns+columns-1;bed[p]=-.18;reservoir[p]=1;}
 for(let y=1;y<4;y++)for(let x=1;x<=4;x++)bed[y*columns+x]=-.2;
 for(let x=5;x<columns-1;x++)bed[2*columns+x]=-.15;
 if(blocked)bed[2*columns+9]=.5;
 return {columns,rows,heights:bed,reservoir,dx:.1,dz:.1};
}
test('closed pond water survives island save and reload instead of vanishing',()=>{
 const initial=createCoastalFlow(topology());
 const center=2*16+2;
 assert.ok(initial.depth[center]>.25);
 const edited=topology({blocked:true});
 initial.setTerrain(edited.heights);
 for(let i=0;i<200;i++)initial.advance(.12);
 const originalVolume=initial.totalVolume();
 const originalDepth=initial.depth[center];
 const snapshot=createSnapshot({
   heights:new Float32Array([.4,.12,.18,.09]),
   objects:[],water:initial.depth
 });
 assert.equal(snapshot.version,SAVE_VERSION);
 assert.equal(snapshot.water.length,80);
 const parsed=parseSnapshot(JSON.stringify(snapshot),4,80);
 const restored=createCoastalFlow(edited);
 assert.equal(restored.depth[center],0,'legacy reload used to drain isolated pond');
 restored.restoreDepth(parsed.water);
 assert.ok(Math.abs(restored.depth[center]-originalDepth)<.00012,'trapped water changed');
 assert.ok(Math.abs(restored.totalVolume()-originalVolume)<.00003,'pond volume changed after reload');
 for(let i=0;i<30;i++)restored.advance(.12);
 assert.ok(restored.depth[center]>.05,'reloaded pond disappeared');
});
test('old v1 island saves without water remain readable',()=>{
 const old=createSnapshot({heights:[.1,.2],objects:[]});
 assert.ok(!('water' in old));
 const revived=parseSnapshot(JSON.stringify(old),2,80);
 assert.equal(revived.water,undefined);
});
test('corrupt, oversized or mismatched saved fluid fields are rejected',()=>{
 const base=createSnapshot({heights:[.1,.2],objects:[],water:[0,.3,.4]});
 assert.deepEqual(parseSnapshot(JSON.stringify(base),2,3).water,[0,.3,.4]);
 assert.throws(()=>parseSnapshot(JSON.stringify(base),2,2),/Incompatible water grid/);
 const bad={...base,water:[0,-.1,.4]};
 assert.throws(()=>parseSnapshot(JSON.stringify(bad),2,3),/Invalid water depth/);
 bad.water=[0,null,.4];
 assert.throws(()=>parseSnapshot(JSON.stringify(bad),2,3),/Invalid water depth/);
 assert.throws(()=>createSnapshot({heights:[0],water:new Float32Array(40001)}),/Invalid water grid/);
});
test('restore validates atomically, resets ocean boundary and does not teleport dry pit water',()=>{
 const f=createCoastalFlow(topology({blocked:true}));
 const src=f.snapshot(),center=2*16+2,sea=2*16+15;
 assert.equal(f.depth[center],0);
 const newWater=Float32Array.from(f.depth);
 newWater[center]=.22;
 newWater[sea]=0;
 f.restoreDepth(newWater);
 assert.ok(Math.abs(f.depth[center]-.22)<1e-7);
 assert.ok(f.depth[sea]>.2,'open ocean should remain sea-level reservoir');
 const before=f.snapshot();
 const corrupted=Float32Array.from(newWater);corrupted[40]=NaN;
 assert.throws(()=>f.restoreDepth(corrupted),/Invalid saved water depth/);
 assert.deepEqual([...f.depth],[...before.depth],'partial invalid input changed water state');
});
test('snapshot water array is isolated from later fluid mutations',()=>{
 const water=new Float32Array([0,.33331,.10689]);
 const s=createSnapshot({heights:[.1],water});
 water[1]=0;
 assert.equal(s.water[1],.3333);
});
