/** Low-poly tropical reef scatter, batched into a few InstancedMesh calls. */
export const REEF_CAPACITY=360;
export function makeReefField(THREE,scene,terrainHeight,shoreline,seed=20261022){
 let state=seed>>>0;
 const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
 const geo=new THREE.IcosahedronGeometry(.17,1);
 const variants=[
   {c:'#dd986d',count:0,mesh:null},
   {c:'#f3c19b',count:0,mesh:null},
   {c:'#768f71',count:0,mesh:null},
   {c:'#a4a78c',count:0,mesh:null}
 ];
 for(const item of variants){
   const mat=new THREE.MeshStandardMaterial({color:item.c,roughness:1,flatShading:true});
   item.mesh=new THREE.InstancedMesh(geo,mat,REEF_CAPACITY);
 }
 const m=new THREE.Object3D();
 const cells=[];
 for(let i=0;i<REEF_CAPACITY;i++){
   const z=(random()-.5)*9.7;
   const x=shoreline(z)+1+random()*6.2;
   if(x>8.7)continue;
   // Keep the nearshore shoal clear to read the surf.
   if(random()<.36 && x<4.4)continue;
   const floor=terrainHeight(x,z);
   const size=.30+random()*1.2;
   const v=variants[Math.floor(random()*variants.length)];
   m.position.set(x,Math.min(-.08,floor+.075*size),z);
   m.rotation.set(random()*.9,random()*Math.PI*2,random()*.55);
   m.scale.set(size*(.65+random()*.4),size*(.4+random()*.7),size*(.65+random()*.45));
   m.updateMatrix();
   v.mesh.setMatrixAt(v.count++,m.matrix);
   cells.push({x,z});
 }
 for(const v of variants){
   v.mesh.count=v.count;
   v.mesh.instanceMatrix.needsUpdate=true;
   v.mesh.receiveShadow=true;
   scene.add(v.mesh);
 }
 return {count:cells.length,drawCalls:variants.length,dispose(){
   variants.forEach(v=>{scene.remove(v.mesh);v.mesh.material.dispose();});
   geo.dispose();
 }};
}
