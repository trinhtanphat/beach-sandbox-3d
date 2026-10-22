/**
 * Tropical palms on the dry edge of the beach.
 * Two GPU instanced meshes and a bent eight-sided frond profile, no textures.
 */
export const PALM_COUNT=25;
export function createPalmGrove(THREE,scene,shoreline,terrainHeight,seed=44411){
  let s=seed>>>0;const rand=()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);
  const trunkGeo=new THREE.CylinderGeometry(.024,.052,.83,7,4);
  const trunkMat=new THREE.MeshStandardMaterial({color:'#946c4f',roughness:1,flatShading:true});
  const bladeGeo=new THREE.BufferGeometry();
  bladeGeo.setAttribute('position',new THREE.Float32BufferAttribute([
    0,0,0, .31,.07,-.115, .73,-.16,0,
    0,0,0, .73,-.16,0, .31,.07,.115
  ],3));
  bladeGeo.computeVertexNormals();
  const leafMat=new THREE.MeshStandardMaterial({color:'#508c42',roughness:.94,flatShading:true,side:THREE.DoubleSide});
  const trunk=new THREE.InstancedMesh(trunkGeo,trunkMat,PALM_COUNT);
  const leaf=new THREE.InstancedMesh(bladeGeo,leafMat,PALM_COUNT*6);
  const helper=new THREE.Object3D();
  const places=[];
  for(let i=0;i<PALM_COUNT;i++){
    const z=-4.7+i/(PALM_COUNT-1)*9.4+(rand()-.5)*.28;
    const x=shoreline(z)-.70-rand()*.78;
    const y=terrainHeight(x,z);
    const scale=.68+rand()*.42,lean=.11+rand()*.18;
    places.push({x,z,y,scale});
    helper.position.set(x+lean*.4,y+.42*scale,z);
    helper.rotation.set(0,rand()*6.28,-lean);
    helper.scale.set(scale,scale,scale);
    helper.updateMatrix();trunk.setMatrixAt(i,helper.matrix);
    for(let j=0;j<6;j++){
      helper.position.set(x+lean*.8,y+.83*scale,z);
      helper.rotation.set(.13,Math.PI*2*j/6+(i%3)*.2,.07);
      helper.scale.set(scale*(.7+rand()*.18),scale,scale);
      helper.updateMatrix();leaf.setMatrixAt(i*6+j,helper.matrix);
    }
  }
  trunk.instanceMatrix.needsUpdate=true;leaf.instanceMatrix.needsUpdate=true;
  leaf.castShadow=false;trunk.castShadow=false;
  scene.add(trunk,leaf);
  return {count:places.length,drawCalls:2};
}
