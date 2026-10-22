import test from 'node:test';
import assert from 'node:assert/strict';
import { createSnapshot, parseSnapshot, SAVE_VERSION, SAVE_KEY, describeSave } from '../src/island-state.js';

const sample=()=>({ heights:new Float32Array([.08003,.12,-.25,1.01]), objects:[
 {kind:'tree',x:-4.25,z:1.2,scale:.9},
 {kind:'boat',x:2.8,z:-1.1,scale:1.1},
 {kind:'rock',x:-2,z:3.1,scale:.5}
 ],wave:.7,speed:1.4,hours:13.5 });
test('versioned island snapshot round-trips terrain, objects, and settings',()=>{
 const s=createSnapshot(sample());
 assert.equal(s.version,SAVE_VERSION);
 assert.match(SAVE_KEY,/shoreline/);
 assert.deepEqual(parseSnapshot(JSON.stringify(s),4),s);
 assert.equal(s.objects[0].kind,'tree');
 assert.match(describeSave(s),/3 added objects/);
});
test('saving does not expose mutable input height array',()=>{
 const input=sample();const s=createSnapshot(input);
 input.heights[0]=.99;
 assert.equal(s.heights[0],.08);
});
test('out-of-bounds objects are blocked when loading',()=>{
 const s=createSnapshot(sample());
 s.objects[0].x=999;
 assert.throws(()=>parseSnapshot(JSON.stringify(s),4),/Invalid placed object/);
});
test('invalid terrain and corrupted save are rejected atomically',()=>{
 const s=createSnapshot(sample());
 assert.throws(()=>parseSnapshot('{"version":1',4),/valid JSON/);
 assert.throws(()=>parseSnapshot(JSON.stringify(s),999),/Incompatible/);
 s.heights[2]=null;
 assert.throws(()=>parseSnapshot(JSON.stringify(s),4),/height value/);
});
test('wrong save version and enormous payload are rejected',()=>{
 const s=createSnapshot(sample());s.version=2;
 assert.throws(()=>parseSnapshot(JSON.stringify(s),4),/Incompatible/);
 assert.throws(()=>parseSnapshot(' '.repeat(1600001),4),/too large/);
});
test('simulation settings are clamped into supported ranges',()=>{
 const state=sample();state.wave=4;state.speed=.01;state.hours=-1;
 const s=createSnapshot(state);
 assert.equal(s.wave,1.6);
 assert.equal(s.speed,.2);
 assert.equal(s.hours,23);
});
