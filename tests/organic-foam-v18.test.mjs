import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FOAM_ATLAS_TILE,FOAM_VARIANTS,createOrganicFoamAtlas} from '../src/foam-atlas.js';
import {createSurfSpray,SPRAY_PARTICLES,sprayFragmentShader,sprayVertexShader} from '../src/surf-spray.js';

test('all four organic foam types have distinct soft, irregular silhouettes',()=>{
 const {size,pixels,variants,tile}=createOrganicFoamAtlas();
 assert.equal(variants,4);assert.equal(tile,32);assert.equal(size,64);
 assert.equal(pixels.length,size*size*4);
 const masks=[];
 for(let kind=0;kind<4;kind++){
   const mask=[];
   for(let y=0;y<tile;y++)for(let x=0;x<tile;x++){
      const i=((Math.floor(kind/2)*tile+y)*size+(kind%2)*tile+x)*4;
      mask.push(pixels[i+3]);
      if(x===0||y===0||x===tile-1||y===tile-1)assert.ok(pixels[i+3]<12,'atlas gutter must be transparent');
   }
   assert.ok(Math.max(...mask)>90,'foam shape too faint');
   const coverage=mask.filter(v=>v>20).length;
   assert.ok(coverage>35&&coverage<850,'shape overly sparse or solid');
   masks.push(mask.join(','));
 }
 assert.equal(new Set(masks).size,4,'all foam sprites use the same disc');
 assert.deepEqual(createOrganicFoamAtlas().pixels,pixels,'procedural output must be stable');
});
test('one GPU points draw call samples all four atlas quadrants',()=>{
 const scene=new THREE.Scene(),spray=createSurfSpray(THREE,scene);
 try{
   assert.equal(scene.children.length,1);
   assert.ok(scene.children[0].isPoints);
   assert.equal(spray.count,SPRAY_PARTICLES);
   const attr=spray.points.geometry.getAttribute('aFoamVariant');
   assert.equal(attr.count,SPRAY_PARTICLES);
   const found=new Set();
   for(let i=0;i<SPRAY_PARTICLES;i++)found.add(attr.getX(i));
   assert.deepEqual([...found].sort(),[0,1,2,3]);
   assert.equal(spray.points.material.uniforms.uMap.value.image.width,FOAM_ATLAS_TILE*2);
   assert.match(sprayFragmentShader,/atlasUV/);
   assert.match(sprayVertexShader,/vFoamVariant=aFoamVariant/);
   const original=Array.from(attr.array),version=attr.version;
   for(let i=0;i<200;i++)spray.update(i/60,.8,1);
   assert.equal(attr.version,version);
   assert.deepEqual(Array.from(attr.array),original,'atlas selection may not upload on each frame');
 }finally{spray.dispose();}
 assert.equal(scene.children.length,0);
});
