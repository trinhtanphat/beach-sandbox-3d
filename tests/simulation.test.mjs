import test from 'node:test';
import assert from 'node:assert/strict';
import {shoreline, landDistance, terrainHeight, forestWeight, seededRandom, brushInfluence, clamp, daylight, clockLabel} from '../src/simulation.js';
test('coastline is curved and bounded', () => {const values=Array.from({length:101},(_,i)=>shoreline(-5.4+i*.108));assert.ok(Math.max(...values)-Math.min(...values)>.5);assert.ok(values.every(v=>v>-4&&v<3));});
test('left side is sand, right is underwater',()=>{for(const z of [-5,-2,0,2,5]){assert.ok(landDistance(-8,z)>0);assert.ok(landDistance(8,z)<0);assert.ok(terrainHeight(-8,z)>0);assert.ok(terrainHeight(8,z)<0);}});
test('forest density is highest inland',()=>{assert.ok(forestWeight(-8,0)>forestWeight(-0.5,0));});
test('random generation is deterministic and bounded',()=>{const a=seededRandom(324),b=seededRandom(324);for(let i=0;i<500;i++){const v=a();assert.equal(v,b());assert.ok(v>=0&&v<1);}});
test('brush has smooth compact support',()=>{assert.equal(brushInfluence(0,.7),1);assert.equal(brushInfluence(.7,.7),0);assert.equal(brushInfluence(2,.7),0);assert.ok(brushInfluence(.35,.7)>.4);});
test('day clock and day lighting',()=>{assert.equal(clockLabel(10), '10:00');assert.equal(clockLabel(24.5),'00:30');assert.ok(daylight(12)>daylight(23));assert.equal(clamp(5,0,3),3);});