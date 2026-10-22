import test from 'node:test';
import assert from 'node:assert/strict';
import {createFrameMetrics} from '../src/frame-metrics.js';

test('frame monitor reports stable 60Hz average and p95 after warmup',()=>{
 const m=createFrameMetrics({windowSeconds:12,maxFrames:1200});
 for(let i=0;i<600;i++)m.addFrame(1/60);
 const s=m.snapshot();
 assert.equal(s.ready,true);
 assert.ok(Math.abs(s.meanFps-60)<.001);
 assert.ok(Math.abs(s.p95Ms-1000/60)<.001);
 assert.ok(Math.abs(s.p99Ms-1000/60)<.001);
 assert.equal(s.slowFrames,0);
 assert.ok(s.seconds<=12);
});
test('measures slow and uneven frames; ignores invalid or hidden frame stalls',()=>{
 const m=createFrameMetrics({windowSeconds:8,maxFrames:1200});
 for(let i=0;i<240;i++)m.addFrame(i%10===0?.05:1/60);
 assert.ok(m.snapshot().p95Ms>=49.9);
 assert.ok(m.snapshot().slowFrames>=20);
 const a=m.snapshot().frames;
 assert.equal(m.addFrame(0),false);
 assert.equal(m.addFrame(Infinity),false);
 assert.equal(m.addFrame(9),false);
 assert.equal(m.snapshot().frames,a);
 assert.equal(m.snapshot().invalid,3);
 assert.equal(m.addFrame(.9),true,'visible 1 FPS browser frames must be measurable');
 m.addFrame(1/60,{hidden:true});
 assert.equal(m.snapshot().frames,0);
 assert.equal(m.snapshot().invalid,0);
});
test('very slow visible renderers still produce truthful frame cadence',()=>{
 const m=createFrameMetrics();
 for(let i=0;i<8;i++)m.addFrame(1);
 assert.equal(m.snapshot().ready,true);
 assert.ok(Math.abs(m.snapshot().meanFps-1)<.001);
 assert.ok(m.snapshot().p95Ms>=1000);
});
test('time window and sample cap preserve bounded recent history',()=>{
 const m=createFrameMetrics({windowSeconds:3,maxFrames:150});
 for(let i=0;i<1200;i++)m.addFrame(1/120);
 assert.ok(m.snapshot().frames<=150);
 assert.ok(m.snapshot().seconds<=3);
 assert.ok(m.snapshot().meanFps>119.9);
 assert.throws(()=>createFrameMetrics({windowSeconds:0}),RangeError);
 assert.throws(()=>createFrameMetrics({maxFrames:20}),RangeError);
});
test('samples remain frame-cadence metrics, not claims about rendering GPU',()=>{
 const m=createFrameMetrics();
 assert.equal(m.snapshot().ready,false);
 for(let i=0;i<280;i++)m.addFrame(1/60);
 assert.ok(!m.snapshot().ready);
 for(let i=0;i<31;i++)m.addFrame(1/60);
 assert.equal(m.snapshot().ready,true);
});
