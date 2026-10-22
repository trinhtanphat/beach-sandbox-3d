import test from 'node:test';
import assert from 'node:assert/strict';
import {BIRD_COUNT,birdPose,surfBreath,createOceanAudio} from '../src/ambience.js';
import {REEF_CAPACITY} from '../src/reefs.js';
test('flock has bounded deterministic flight trajectories',()=>{
 assert.equal(BIRD_COUNT,14);
 for(let i=0;i<BIRD_COUNT;i++)for(const t of [0,.5,5,50,900]){
  const a=birdPose(t,i),b=birdPose(t,i);
  assert.deepEqual(a,b);
  for(const k of ['x','z','y','flap','scale'])assert.ok(Number.isFinite(a[k]));
  assert.ok(a.y>1&&a.y<5);
  assert.ok(Math.abs(a.flap)<=1);
 }
});
test('tide ambience envelope is bounded and depends on wave energy',()=>{
 for(let t=0;t<200;t+=.1){
  for(const h of [.1,.6,1,1.6]){
   const e=surfBreath(t,h);
   assert.ok(e>=0&&e<=1);
  }
  assert.ok(surfBreath(t,1.6)>=surfBreath(t,.1));
 }
});
test('Web Audio initializes lazily only on a user action',()=>{
 const audio=createOceanAudio();
 assert.equal(audio.enabled,false);
 audio.setVolume(10);
 audio.update(1,.6);
 assert.equal(audio.enabled,false);
 assert.equal(REEF_CAPACITY,360);
});
