import test from 'node:test';
import assert from 'node:assert/strict';
import {oceanHeight,boatPose} from '../src/ocean-surface.js';
import {SEA_LEVEL} from '../src/world-layout.js';
import {shoreline} from '../src/simulation.js';
import {oceanVertexShader} from '../src/waves.js';
const near=(a,b,t=.00001)=>Math.abs(a-b)<=t;

test('boat surface height follows GPU equation, including two breaker crests',()=>{
 // Independently mirror shader expressions at representative points.
 const frac=n=>n-Math.floor(n);
 const s=(a,b,v)=>{const u=Math.max(0,Math.min(1,(v-a)/(b-a)));return u*u*(3-2*u)};
 for(const time of [0,.1,1,2,3.7,8.25])for(const z of [-4.5,-2,0,3,5]){
  const v=(z+5.4)/10.8,coast=shoreline(z)-.10;
  for(const u of [.08,.14,.26,.34,.48,.7,.92]){
   const x=coast+u*(9.06-coast);
   for(const wave of [.1,.6,1,1.6]){
    const p=frac(time*.23+Math.sin(v*9+.3)*.027+v*.012);
    const turn=time*1.44513262;
    const warp=.016*Math.sin(v*22+turn)+.007*Math.sin(v*49-2*turn)+.004*Math.sin(v*94+3*turn);
    const front=shift=>.34-.33*frac(p+shift)+warp;
    const width=.019+.011*wave/1.6;
    const a=Math.exp(-Math.pow((u-front(0))/width,2))*s(0,.12,p)*(1-s(.77,1,p));
    const pb=frac(p+.56);
    const b=Math.exp(-Math.pow((u-front(.56))/(width*.84),2))*s(0,.12,pb)*(1-s(.77,1,pb));
    const swell=Math.sin(u*27+time*2.3+v*8)*.025+Math.sin(u*62+time*3.6-v*22)*.007;
    const shoal=.020+.065*(1-s(.12,.6,u));
    const expected=SEA_LEVEL+wave*(swell+shoal*(a*.90+b*.64));
    assert.ok(near(oceanHeight(time,x,z,wave),expected,1e-9),'ship detached from ocean mesh');
   }
  }
 }
 assert.match(oceanVertexShader,/float shoaling=\.020\+\(\.065\*\(1\.0-smoothstep\(\.12,\.6,uv\.x\)\)\)/);
 assert.match(oceanVertexShader,/crestA\*\.90\+crestB\*\.64/);
});
test('boat ride is bounded and moves in sync with local wave surface',()=>{
 for(const z of [-3,0,3])for(const x of [shoreline(z)+.5,shoreline(z)+3,7.5]){
  for(const time of [0,.5,1,2.3,5,14]){
   const level=oceanHeight(time,x,z,1.3);
   const a=boatPose(time,x,z,{scale:.7,yaw:1.2,wave:1.3});
   assert.ok(near(a.y,level-.065*.7));
   assert.ok(Math.abs(a.pitch)<=.140001&&Math.abs(a.roll)<=.140001);
   assert.ok(Number.isFinite(a.pitch)&&Number.isFinite(a.roll));
  }
 }
 const a=boatPose(.6,5,0,{wave:0.1});
 const b=boatPose(.6,5,0,{wave:1.6});
 assert.ok(Math.abs(a.y-b.y)>.001,'strength slider must affect flotation');
 assert.throws(()=>boatPose(0,4,0,{scale:-1}),RangeError);
 assert.throws(()=>oceanHeight(NaN,4,0,.6),RangeError);
});
test('yaw rotation changes local tilt while flotation stays unchanged',()=>{
 const a=boatPose(1.4,4,1,{yaw:0});
 const b=boatPose(1.4,4,1,{yaw:Math.PI/2});
 assert.ok(near(a.y,b.y));
 assert.ok(near(Math.abs(a.roll),Math.abs(b.pitch),1e-8));
 assert.ok(near(Math.abs(a.pitch),Math.abs(b.roll),1e-8));
});
