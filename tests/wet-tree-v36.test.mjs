import test from 'node:test';
import assert from 'node:assert/strict';
import {canPlace,SEA_LEVEL} from '../src/world-layout.js';
import {landDistance,terrainHeight} from '../src/simulation.js';

const x=-6,z=2,ground=terrainHeight(x,z);
test('dry inland sand still permits tree planting',()=>{
 assert.ok(landDistance(x,z)>1.05);
 assert.ok(ground>SEA_LEVEL+.035);
 assert.equal(canPlace('tree',x,z,ground,null,0),true);
 assert.equal(canPlace('tree',x,z,ground),true,'old no-depth callers compatible');
});
test('trapped inland water forbids planting through submerged roots',()=>{
 assert.equal(canPlace('tree',x,z,ground,false,.2),false);
 assert.equal(canPlace('tree',x,z,ground,true,.05),false);
 assert.equal(canPlace('tree',x,z,ground,false,.045),false);
 assert.equal(canPlace('tree',x,z,ground,false,.044),true);
});
test('nonfinite water and offshore/dry bank reject trees',()=>{
 assert.equal(canPlace('tree',x,z,ground,null,NaN),false);
 assert.equal(canPlace('tree',x,z,ground,null,Infinity),false);
 assert.equal(canPlace('tree',x,z,ground,null,-1),false);
 assert.equal(canPlace('tree',x,z,SEA_LEVEL-.04,null,0),false);
 assert.equal(canPlace('tree',2,2,.3,null,0),false);
});
