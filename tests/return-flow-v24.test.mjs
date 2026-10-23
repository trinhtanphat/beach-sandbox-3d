import test from 'node:test';
import assert from 'node:assert/strict';
import {foamReturnTravel,ripOutflowSpeed,coastalFlowGLSL} from '../src/coastal-flow.js';
import {boatCurrentPosition} from '../src/boat-current.js';
import {shoreline,DEPTH,HALF_DEPTH,HALF_WIDTH} from '../src/simulation.js';
import {COASTAL_ZONES} from '../src/world-layout.js';
import {surfSprayPoint,sprayVertexShader} from '../src/surf-spray.js';
import {oceanFragmentShader} from '../src/waves.js';
import {breakerLipFragmentShader} from '../src/breaker-lip.js';
import {oceanHeight,boatPose} from '../src/ocean-surface.js';
import {readFileSync} from 'node:fs';

test('return flow forms narrow, bounded channels, vanishes offshore and at edges',()=>{
 let peak=0;
 for(let i=0;i<=120;i++)for(let j=0;j<=120;j++){
   const u=i/120,v=j/120,value=ripOutflowSpeed(u,v);
   assert.ok(Number.isFinite(value)&&value>=0&&value<.005);
   const drift=foamReturnTravel(u,v,.9);
   assert.ok(drift>=0&&drift<.021);
   peak=Math.max(peak,value);
 }
 assert.ok(peak>.0025);
 assert.equal(ripOutflowSpeed(.5,0),0);
 assert.equal(ripOutflowSpeed(.5,1),0);
 assert.equal(ripOutflowSpeed(.9,.34),0);
 assert.ok(ripOutflowSpeed(.18,.34)>ripOutflowSpeed(.18,.53)*10);
 assert.equal(foamReturnTravel(.18,.34,0),0);
 assert.ok(foamReturnTravel(.18,.34,.8)>foamReturnTravel(.18,.34,.2));
 assert.throws(()=>ripOutflowSpeed(Infinity,.5),RangeError);
 assert.throws(()=>foamReturnTravel(.2,.4,NaN),RangeError);
});
test('GPU foam, lip, spray consume exactly the shared current and return-flow shader',()=>{
 for(const shader of [sprayVertexShader,oceanFragmentShader,breakerLipFragmentShader]){
  assert.ok(shader.includes(coastalFlowGLSL.trim()));
  assert.match(shader,/foamReturnTravel\(/);
 }
 assert.match(sprayVertexShader,/p\.x\+=aWaterWidth\*\(front\+\.004\+\.065\*aRandom\+foamReturnTravel\(front,v,cycle\)\)/);
 assert.match(oceanFragmentShader,/uv\.x-foamReturnTravel\(front,uv\.y,phase\)/);
 assert.match(breakerLipFragmentShader,/vUv\.x-foamReturnTravel\(front,vUv\.y,phase\)/);
 const a=surfSprayPoint(.8,0,8,1),b=surfSprayPoint(.8,0,8,1,.56);
 assert.ok(Number.isFinite(a.x)&&Number.isFinite(b.x));
});
test('moored boat stays within board and offshore, no time-step cumulative drift',()=>{
 for(const z of [-4.9,-3,0,2,4.9]){
  for(const offset of [.5,1.3,3.8,6.5]){
   const anchorX=shoreline(z)+offset;
   if(anchorX>8.8)continue;
   const initial=boatCurrentPosition(0,anchorX,z,0);
   assert.ok(Math.abs(initial.x-anchorX)<1e-9);
   assert.ok(Math.abs(initial.z-z)<1e-9);
   let changed=false;
   for(const t of [1,2,3,6,10,21,37,120]){
    const current=boatCurrentPosition(t,anchorX,z,0);
    assert.ok(current.x>=shoreline(current.z)+COASTAL_ZONES.boatMinOffshore-1e-10);
    assert.ok(current.x<=HALF_WIDTH-.2+1e-10);
    assert.ok(Math.abs(current.z)<=HALF_DEPTH-.2+1e-10);
    assert.ok(Math.abs(current.x-anchorX)<.35,'unmoored offshore runaway');
    assert.ok(Math.abs(current.z-z)<.43,'unmoored longshore runaway');
    const repeated=boatCurrentPosition(t,anchorX,z,0);
    assert.deepEqual(repeated,current,'position must not depend on update frame count');
    const pose=boatPose(t,current.x,current.z,{wave:1.2});
    assert.ok(Math.abs(pose.y-oceanHeight(t,current.x,current.z,1.2)+.065)<1e-9);
    changed ||= Math.abs(current.x-anchorX)+Math.abs(current.z-z)>1e-5;
   }
   assert.ok(changed,'no perceptible current motion');
  }
 }
 assert.throws(()=>boatCurrentPosition(NaN,3,0),RangeError);
});
test('save/export use stationary boat anchors while runtime uses drifted position',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/boat\.userData\.anchorX=x;boat\.userData\.anchorZ=z/);
 assert.match(main,/o\.userData\.kind==='boat'\?o\.userData\.anchorX:o\.position\.x/);
 assert.match(main,/o\.userData\.kind==='boat'\?o\.userData\.anchorZ:o\.position\.z/);
 assert.match(main,/boatCurrentPosition\(elapsed,/);
 assert.match(main,/b\.position\.x=current\.x;b\.position\.z=current\.z/);
 assert.match(main,/boatPose\(elapsed,current\.x,current\.z/);
});
