import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { WIDTH, DEPTH, HALF_WIDTH, HALF_DEPTH, clamp, smoothstep, shoreline, landDistance, noise, terrainHeight, forestWeight, seededRandom, brushInfluence, daylight, clockLabel } from './simulation.js';
import { oceanVertexShader, oceanFragmentShader, swashVertexShader, swashFragmentShader } from './waves.js';
import { createSnapshot, parseSnapshot, SAVE_KEY } from './island-state.js';
import { BIRD_COUNT, createSeagulls, createOceanAudio } from './ambience.js';
import { makeReefField } from './reefs.js';
import { createPalmGrove } from './palms.js';
import { createSurfSpray } from './surf-spray.js';
import { createBreakerLip } from './breaker-lip.js';
import { createFrameMetrics } from './frame-metrics.js';
import { createAdaptiveResolution } from './adaptive-resolution.js';
import { boatPose } from './ocean-surface.js';
import { boatCurrentPosition } from './boat-current.js';
import { lagoonWaterMotion } from './lagoon-physics.js';
import { createLagoonSurface } from './lagoon-surface.js';
import { createSeaDynamics } from './sea-dynamics.js';
import { FOREST_COUNT, SEA_LEVEL, COASTAL_ZONES, planForest, submergedCenter, canPlace } from './world-layout.js';
import './style.css';

const canvas = document.getElementById('world');
let renderer;
try {
 renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
} catch (error) {
 const warning=document.createElement('div');
 warning.className='webgl-error';
 warning.innerHTML='<strong>3D rendering unavailable</strong>Your browser cannot start WebGL. Try an updated browser with hardware acceleration enabled.';
 document.querySelector('.app-shell').append(warning);
 throw error;
}
const initialDprCap=Math.min(window.devicePixelRatio || 1, window.innerWidth<650?1.35:1.65);
renderer.setPixelRatio(initialDprCap);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.65;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#edeae3');
scene.fog = new THREE.FogExp2('#f3ede1', .008);
const aspect = innerWidth / innerHeight;
const VIEW_SIZE = 13.9;
const camera = new THREE.OrthographicCamera(-VIEW_SIZE * aspect / 2, VIEW_SIZE * aspect / 2, VIEW_SIZE / 2, -VIEW_SIZE / 2, 0.1, 150);
camera.position.set(17, 16, 21);
camera.lookAt(0, 0, 0);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = .065;
controls.minPolarAngle = .45;
controls.maxPolarAngle = 1.33;
controls.enablePan = false;
controls.minZoom = .6;
controls.maxZoom = 2.8;
controls.update();
const ambient = new THREE.HemisphereLight('#fff9e8', '#94b0a9', 1.90);
scene.add(ambient);
const sunlight = new THREE.DirectionalLight('#fff0d2', 2.65);
const atmosphere = new THREE.DirectionalLight('#a8eeef', .48);
atmosphere.position.set(7,8,-9);
scene.add(atmosphere);
sunlight.position.set(-5, 17, 11);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(1024, 1024);
sunlight.shadow.camera.left = -15;
sunlight.shadow.camera.right = 15;
sunlight.shadow.camera.top = 15;
sunlight.shadow.camera.bottom = -15;
sunlight.shadow.camera.near = 1;
sunlight.shadow.camera.far = 52;
sunlight.shadow.bias = -.0002;
sunlight.shadow.normalBias = .018;
scene.add(sunlight);

const rand = seededRandom(20261021);
const gulls=createSeagulls(THREE,scene);
const oceanAudio=createOceanAudio();
const soundButton=document.getElementById('btn-sound');
soundButton.addEventListener('click',async()=>{
 try{const enabled=await oceanAudio.toggle();soundButton.textContent=enabled?'♫ Sound on':'♪ Sound off';soundButton.setAttribute('aria-pressed',String(enabled));}
 catch(error){toast('Ocean audio unavailable: '+error.message);}
});
document.getElementById('ambient-volume').addEventListener('input',event=>{
 const v=Number(event.target.value)/100;
 oceanAudio.setVolume(v);
 document.getElementById('ambient-volume-value').textContent=Math.round(v*100)+'%';
});
const boxMat = new THREE.MeshStandardMaterial({ color: '#cbb898', roughness: 1 });
const base = new THREE.Mesh(new THREE.BoxGeometry(WIDTH + .07, .57, DEPTH + .07), boxMat);
base.position.y = -.66;
base.receiveShadow = true;
scene.add(base);
const oceanBase = new THREE.Mesh(new THREE.BoxGeometry(WIDTH + .01, .1, DEPTH + .01), new THREE.MeshStandardMaterial({ color: '#4b9d99', roughness: 1 }));
oceanBase.position.y = -.33;
scene.add(oceanBase);

function terrainColor(x, z) {
  const distance = landDistance(x, z);
  if(distance>0&&terrainHeight(x,z)<SEA_LEVEL-.018)return new THREE.Color('#ccbda0');
  const n = noise(x,z) * .05 + (rand()-.5)*.042;
  const shoreSand = new THREE.Color('#f8e5b9');
  const inlandSand = new THREE.Color('#dccb9d');
  const sand = shoreSand.clone().lerp(inlandSand, smoothstep(.15, 5.5, distance));
  const green = new THREE.Color('#76a65a').lerp(new THREE.Color('#3d7c37'), rand()*.7);
  if (distance <= -.1) return new THREE.Color('#e5d5ad').lerp(new THREE.Color('#839f96'),smoothstep(.5,7,-distance));
  if (distance <= .04) return new THREE.Color('#e7d7af');
  return sand.lerp(green, forestWeight(x,z)*smoothstep(1.5,4.2,distance)*(.27+.32*rand())).offsetHSL(0,0,n);
}
const SEG_X = 180, SEG_Z = 108;
const terrainGeometry = new THREE.PlaneGeometry(WIDTH, DEPTH, SEG_X, SEG_Z);
terrainGeometry.rotateX(-Math.PI/2);
const terrainPositions = terrainGeometry.attributes.position;
const terrainColors = [];
const initialHeights = new Float32Array(terrainPositions.count);
for (let i=0;i<terrainPositions.count;i++) {
  const x=terrainPositions.getX(i), z=terrainPositions.getZ(i);
  const h=terrainHeight(x,z);
  terrainPositions.setY(i,h);
  initialHeights[i]=h;
  const c=terrainColor(x,z);
  terrainColors.push(c.r,c.g,c.b);
}
terrainGeometry.setAttribute('color',new THREE.Float32BufferAttribute(terrainColors,3));
terrainGeometry.computeVertexNormals();
const terrain = new THREE.Mesh(terrainGeometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.99,metalness:0,side:THREE.DoubleSide}));
terrain.receiveShadow = true;
scene.add(terrain);

// Water is real tessellated geometry. The shader moves its vertices and computes
// moving wave fronts, refracted caustics and whitewash from shoreline distance.
const SEA_STEPS = 210, SEA_ROWS = 112;
const seaPositions = [], seaUV=[],seaIndices=[];
for(let row=0;row<=SEA_ROWS;row++) {
  const z=-HALF_DEPTH + row/SEA_ROWS*DEPTH;
  const coast=shoreline(z)-COASTAL_ZONES.seaOverlap;
  for(let col=0;col<=SEA_STEPS;col++) {
    const u=col/SEA_STEPS;
    const x=coast+(HALF_WIDTH+.06-coast)*u;
    seaPositions.push(x,SEA_LEVEL,z);
    seaUV.push(u,row/SEA_ROWS);
    if(row<SEA_ROWS && col<SEA_STEPS) {
      const a=row*(SEA_STEPS+1)+col,b=a+SEA_STEPS+1;
      seaIndices.push(a,b,a+1,b,b+1,a+1);
    }
  }
}
const seaGeometry=new THREE.BufferGeometry();
seaGeometry.setAttribute('position',new THREE.Float32BufferAttribute(seaPositions,3));
seaGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(seaUV,2));
seaGeometry.setIndex(seaIndices);
seaGeometry.computeVertexNormals();
const reefField=makeReefField(THREE,scene,terrainHeight,shoreline);
const waveUniforms={uTime:{value:0},uWave:{value:1.0},uDay:{value:1},uFoam:{value:1}};
const waterMaterial = new THREE.ShaderMaterial({
  uniforms:waveUniforms,side:THREE.DoubleSide,transparent:true,depthWrite:false,
  vertexShader:oceanVertexShader,fragmentShader:oceanFragmentShader
});
const water = new THREE.Mesh(seaGeometry,waterMaterial);
water.renderOrder = 4;
scene.add(water);
const breakingLip=createBreakerLip(THREE,scene);

// A thin transparent swash reaches above the beach edge, and advances then
// retreats. The motion is drawn on the actual curved coastline (not a PNG).
const foamPositions=[],foamUV=[],foamIndices=[];
const FOAM_ROWS=220,FOAM_COLS=32;
for(let iz=0;iz<=FOAM_ROWS;iz++){
  const z=-HALF_DEPTH+iz/FOAM_ROWS*DEPTH;
  const coast=shoreline(z);
  for(let j=0;j<=FOAM_COLS;j++){
    const t=j/FOAM_COLS;
    const x=coast-COASTAL_ZONES.swashInland+t*(COASTAL_ZONES.swashInland+COASTAL_ZONES.swashSeaward);
    foamPositions.push(x,Math.max(.119,terrainHeight(x,z)+.032),z);
    foamUV.push(t,iz/FOAM_ROWS);
    if(iz<FOAM_ROWS&&j<FOAM_COLS){const a=iz*(FOAM_COLS+1)+j,b=a+FOAM_COLS+1;foamIndices.push(a,a+1,b,b,a+1,b+1);}
  }
}
const foamGeo=new THREE.BufferGeometry();foamGeo.setAttribute('position',new THREE.Float32BufferAttribute(foamPositions,3));foamGeo.setAttribute('uv',new THREE.Float32BufferAttribute(foamUV,2));foamGeo.setIndex(foamIndices);
const foamMat=new THREE.ShaderMaterial({
  uniforms:waveUniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,
  vertexShader:swashVertexShader,fragmentShader:swashFragmentShader
});
const foamMesh=new THREE.Mesh(foamGeo,foamMat);foamMesh.renderOrder=6;scene.add(foamMesh);
const surfSpray=createSurfSpray(THREE,scene);

const sandRockMaterial=new THREE.MeshStandardMaterial({color:'#95877a',roughness:1,flatShading:true});
const underRockMaterial=new THREE.MeshStandardMaterial({color:'#747971',roughness:1,flatShading:true});
const trunkMaterial=new THREE.MeshStandardMaterial({color:'#6d7153',roughness:1});
const leafMaterial=new THREE.MeshStandardMaterial({color:'#6ba44a',roughness:1,flatShading:true});
const handTreeTrunkGeo=new THREE.CylinderGeometry(.055,.087,.36,5);
const handTreeCrownGeo=new THREE.IcosahedronGeometry(.29,1);
const handTreeSmallCrownGeo=new THREE.IcosahedronGeometry(.21,1);
const handTreeColors=['#568b36','#75aa44','#a3bb62','#3e8039','#89a64b'];
const handTreeMaterials=handTreeColors.map(color=>new THREE.MeshStandardMaterial({color,roughness:1,flatShading:true}));
function createTree(x,z,scale=1) {
  const g=new THREE.Group();
  g.scale.setScalar(scale);
  const y=editedHeight(x,z);
  const trunk=new THREE.Mesh(handTreeTrunkGeo,trunkMaterial);
  trunk.position.y=.18;trunk.castShadow=true;g.add(trunk);
  const crown=new THREE.Mesh(handTreeCrownGeo,handTreeMaterials[Math.floor(rand()*handTreeMaterials.length)]);
  crown.position.y=.48;crown.scale.set(1.1,.87,1.05);crown.castShadow=true;g.add(crown);
  const crown2=new THREE.Mesh(handTreeSmallCrownGeo,crown.material);
  crown2.position.set(.13,.48,.13);g.add(crown2);
  g.position.set(x,y,z);
  g.userData.kind='tree';g.userData.scale=scale;scene.add(g);return g;
}
const treeGeo=new THREE.IcosahedronGeometry(.28,1);
const trunkGeo=new THREE.CylinderGeometry(.05,.075,.34,5);
const leaves=new THREE.InstancedMesh(treeGeo,leafMaterial,FOREST_COUNT);
const smallLeaves=new THREE.InstancedMesh(treeGeo,leafMaterial,FOREST_COUNT);
const trunks=new THREE.InstancedMesh(trunkGeo,trunkMaterial,FOREST_COUNT);
const tempObject=new THREE.Object3D();
const forestLocations=[];
const foliagePalette=['#4f8c46','#6ba852','#8eb96c','#5d9c55','#79ad63','#a7bb79','#3f8151','#b5c58a'];
const forestPlan=planForest();
for(let i=0;i<forestPlan.length;i++) {
 const {x,z,scale:sc}=forestPlan[i];
 const y=terrainHeight(x,z);
 forestLocations.push({x,z,y});
 tempObject.position.set(x,y+.17*sc,z);tempObject.scale.set(sc,sc,sc);tempObject.rotation.set(0,rand()*6,0);tempObject.updateMatrix();trunks.setMatrixAt(i,tempObject.matrix);
 tempObject.position.set(x,y+.40*sc,z);tempObject.scale.set(sc*(.9+rand()*.28),sc*(.8+rand()*.22),sc*(.9+rand()*.3));tempObject.updateMatrix();leaves.setMatrixAt(i,tempObject.matrix);
 tempObject.position.set(x+.1*sc,y+.43*sc,z+.1*sc);tempObject.scale.set(sc*.6,sc*.62,sc*.62);tempObject.updateMatrix();smallLeaves.setMatrixAt(i,tempObject.matrix);
 const color=new THREE.Color(foliagePalette[Math.floor(rand()*foliagePalette.length)]);
 leaves.setColorAt(i,color);smallLeaves.setColorAt(i,color.clone().offsetHSL(.007,.02,.028));
}
for(const mesh of [leaves,smallLeaves,trunks]) {mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=false;scene.add(mesh);}
leaves.instanceColor.needsUpdate=true;smallLeaves.instanceColor.needsUpdate=true;
const palmGrove=createPalmGrove(THREE,scene,shoreline,terrainHeight);

const rockGeometry=new THREE.DodecahedronGeometry(1,0);
function createRock(x,z,sc=1,rockMaterial=sandRockMaterial){
 const aboveShore=editedHeight(x,z)>SEA_LEVEL+.035;
 const baseY=aboveShore?editedHeight(x,z)+.10*sc:submergedCenter(editedHeight(x,z),.19*sc);
 const rock=new THREE.Mesh(rockGeometry,rockMaterial);
 rock.position.set(x,baseY,z);
 rock.scale.set(.27*sc,.19*sc,.32*sc);rock.rotation.set(rand()*.25,rand()*6,rand()*.25);rock.castShadow=true;rock.receiveShadow=true;
 rock.userData.kind='rock';rock.userData.scale=sc;rock.userData.baseOffset=.10*sc;scene.add(rock);return rock;
}
// Instanced native rock field: two draw calls instead of ~90.
const NATURAL_ROCK_LIMIT=70;
const naturalRockSets=[sandRockMaterial,underRockMaterial].map(material=>({
 mesh:new THREE.InstancedMesh(rockGeometry,material,NATURAL_ROCK_LIMIT),points:[]
}));
const rockObject=new THREE.Object3D();
for(let i=0;i<NATURAL_ROCK_LIMIT;i++){
 const z=(rand()-.5)*10.1;
 const offshore=rand()>.63;
 const x=offshore?shoreline(z)+COASTAL_ZONES.reefMinOffshore+rand()*5.8:shoreline(z)-.5-rand()*2.8;
 if(x>8.7||x<-8.7)continue;
 const sc=.27+rand()*.75;
 const group=naturalRockSets[offshore?1:0];
 const y=offshore?submergedCenter(terrainHeight(x,z),.19*sc):terrainHeight(x,z)+.10*sc;
 rockObject.position.set(x,y,z);
 rockObject.scale.set(.27*sc,.19*sc,.32*sc);
 rockObject.rotation.set(rand()*.25,rand()*6,rand()*.25);
 rockObject.updateMatrix();
 group.mesh.setMatrixAt(group.points.length,rockObject.matrix);
 group.points.push({x,z,y,sc});
}
for(const set of naturalRockSets){
 set.mesh.count=set.points.length;
 set.mesh.instanceMatrix.needsUpdate=true;
 set.mesh.castShadow=true;
 set.mesh.receiveShadow=true;
 scene.add(set.mesh);
}
// Tiny shells, flowers and sunlit specks create detail without texture downloads.
const shellMaterials=[new THREE.MeshStandardMaterial({color:'#f7f1d4',roughness:1}),new THREE.MeshStandardMaterial({color:'#f8bda2',roughness:1}),new THREE.MeshStandardMaterial({color:'#f4b665',roughness:1})];
const shellGeo=new THREE.IcosahedronGeometry(.038,0);
const shellGroups=shellMaterials.map(mat=>({mesh:new THREE.InstancedMesh(shellGeo,mat,325),points:[]}));
const shellObject=new THREE.Object3D();
for(let i=0;i<325;i++){
 const z=(rand()-.5)*10.3;
 const x=shoreline(z)-.14-rand()*2.45;
 if(x<-8.8 || forestWeight(x,z)>.75)continue;
 const group=shellGroups[Math.floor(rand()*shellGroups.length)];
 const y=terrainHeight(x,z)+.037;
 shellObject.position.set(x,y,z);
 shellObject.rotation.set(0,0,0);
 shellObject.scale.set(1,.4,1.3);
 shellObject.updateMatrix();
 group.mesh.setMatrixAt(group.points.length,shellObject.matrix);
 group.points.push({x,z,y});
}
for(const group of shellGroups){
 group.mesh.count=group.points.length;
 group.mesh.instanceMatrix.needsUpdate=true;
 scene.add(group.mesh);
}
const boats=[];
const boatHullGeo=new THREE.SphereGeometry(.30,10,7),boatDeckGeo=new THREE.BoxGeometry(.31,.02,.43),boatMastGeo=new THREE.CylinderGeometry(.014,.014,.56,6);
const boatHullMat=new THREE.MeshStandardMaterial({color:'#bd7c45',roughness:.85});
const boatDeckMat=new THREE.MeshStandardMaterial({color:'#fae0a5',roughness:1});
const boatMastMat=new THREE.MeshStandardMaterial({color:'#725e42'});
const boatSailMat=new THREE.MeshStandardMaterial({color:'#fff8dc',side:THREE.DoubleSide,roughness:1});
const boatSailGeo=new THREE.BufferGeometry();
boatSailGeo.setAttribute('position',new THREE.Float32BufferAttribute([0,.67,0,0,.22,0,.27,.22,0],3));
boatSailGeo.computeVertexNormals();
function createBoat(x,z,scale=1) {
 const boat=new THREE.Group();
 boat.scale.setScalar(scale);
 const hull=new THREE.Mesh(boatHullGeo,boatHullMat);
 hull.scale.set(.67,.43,1.18);hull.position.y=.07;hull.castShadow=true;boat.add(hull);
 const deck=new THREE.Mesh(boatDeckGeo,boatDeckMat);deck.position.y=.15;boat.add(deck);
 const mast=new THREE.Mesh(boatMastGeo,boatMastMat);mast.position.y=.4;boat.add(mast);
 const sail=new THREE.Mesh(boatSailGeo,boatSailMat);boat.add(sail);
 boat.position.set(x,.08,z);boat.rotation.y=rand()*6.28;boat.userData.kind='boat';boat.userData.scale=scale;boat.userData.phase=rand()*6.28;
 boat.userData.heading=boat.rotation.y;
 boat.userData.anchorX=x;boat.userData.anchorZ=z;
 scene.add(boat);boats.push(boat);return boat;
}
createBoat(4.35,-2.05,1.0);
createBoat(6.0,2.1,.7);
createBoat(2.65,2.8,.47);
createBoat(-3.25,.55,.52); // Sheltered lagoon boat.

// Brush visual floats above the land as a hint when an editing tool is active.
const brushRing=new THREE.Mesh(new THREE.RingGeometry(.63,.7,64),new THREE.MeshBasicMaterial({color:'#f7a66e',transparent:true,opacity:.85,side:THREE.DoubleSide,depthWrite:false}));
brushRing.rotation.x=-Math.PI/2;brushRing.visible=false;scene.add(brushRing);
const interactiveItems=[];
const history=[];
const MAX_PLACED_OBJECTS=400;
function rememberChange(change){history.push(change);if(history.length>18)history.shift();}
function mayPlaceObject(){
 if(interactiveItems.length<MAX_PLACED_OBJECTS)return true;
 toast('Island is full (400 added objects). Remove some to continue.');
 return false;
}
function discardObject(object){
 scene.remove(object);
 if(object.userData.kind==='boat'){
  const index=boats.indexOf(object);
  if(index>=0)boats.splice(index,1);
 }
}
function restoreObject(object){
 scene.add(object);
 if(object.userData.kind==='boat'&&!boats.includes(object))boats.push(object);
}
let tool='explore', isPainting=false, waveHeight=1.0, foamIntensity=1, speed=1, paused=false, elapsed=0, hours=10, brushSize=.7, zoomBase=1;
const seaDynamics=createSeaDynamics({wave:waveHeight,foam:foamIntensity});
const raycaster=new THREE.Raycaster(),pointerNdc=new THREE.Vector2(),landPlane=new THREE.Plane(new THREE.Vector3(0,1,0),-.1),hit=new THREE.Vector3();
function editedHeight(x,z){
 const ix=clamp(Math.round((x+HALF_WIDTH)*SEG_X/WIDTH),0,SEG_X);
 const iz=clamp(Math.round((z+HALF_DEPTH)*SEG_Z/DEPTH),0,SEG_Z);
 return terrainPositions.getY(iz*(SEG_X+1)+ix);
}
// Bilinear sampling prevents stair-step shoreline artefacts.
function sampleGroundHeight(x,z){
 const gx=clamp((x+HALF_WIDTH)*SEG_X/WIDTH,0,SEG_X),gz=clamp((z+HALF_DEPTH)*SEG_Z/DEPTH,0,SEG_Z);
 const ix=Math.min(SEG_X-1,Math.floor(gx)),iz=Math.min(SEG_Z-1,Math.floor(gz));
 const tx=gx-ix,tz=gz-iz;
 const a=iz*(SEG_X+1)+ix,b=a+SEG_X+1;
 const top=terrainPositions.getY(a)*(1-tx)+terrainPositions.getY(a+1)*tx;
 const bottom=terrainPositions.getY(b)*(1-tx)+terrainPositions.getY(b+1)*tx;
 return top*(1-tz)+bottom*tz;
}
const lagoonSurface=createLagoonSurface(THREE,scene,sampleGroundHeight,shoreline,waveUniforms);
function syncFoamElevation(){
  const pos=foamGeo.attributes.position;
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),z=pos.getZ(i);
    pos.setY(i,Math.max(.119,editedHeight(x,z)+.032));
  }
  pos.needsUpdate=true;
  foamGeo.computeBoundingSphere();
  syncInstancedGroundDetails();
  lagoonSurface.refresh();
}
function syncInstancedGroundDetails(){
 const matrix=new THREE.Matrix4();
 for(const group of [...naturalRockSets,...shellGroups]){
  let changed=false;
  for(let i=0;i<group.points.length;i++){
   const record=group.points[i];
   if(landDistance(record.x,record.z)<=0)continue;
   const nextY=editedHeight(record.x,record.z)+(record.sc ? .1*record.sc : .037);
   const diff=nextY-record.y;
   if(Math.abs(diff)<.0005)continue;
   group.mesh.getMatrixAt(i,matrix);
   matrix.elements[13]+=diff;
   group.mesh.setMatrixAt(i,matrix);
   record.y=nextY;
   changed=true;
  }
  if(changed)group.mesh.instanceMatrix.needsUpdate=true;
 }
}
function pointerWorld(event){
 const rect=canvas.getBoundingClientRect();
 pointerNdc.set((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2);
 raycaster.setFromCamera(pointerNdc,camera);
 const intersection=raycaster.intersectObject(terrain,false)[0];
 const point=intersection ? intersection.point : raycaster.ray.intersectPlane(landPlane,hit);
 if(!point)return null;
 if(point.x<-HALF_WIDTH||point.x>HALF_WIDTH||point.z<-HALF_DEPTH||point.z>HALF_DEPTH)return null;
 return point.clone();
}
function syncForestElevation(){
 const m=new THREE.Matrix4();
 let changed=false;
 for(let i=0;i<forestLocations.length;i++){
  const record=forestLocations[i], y=editedHeight(record.x,record.z);
  const diff=y-record.y;
  if(Math.abs(diff)<.0005)continue;
  for(const mesh of [trunks,leaves,smallLeaves]){
   mesh.getMatrixAt(i,m);
   m.elements[13]+=diff;
   mesh.setMatrixAt(i,m);
  }
  record.y=y;
  changed=true;
 }
 if(changed)for(const mesh of [trunks,leaves,smallLeaves])mesh.instanceMatrix.needsUpdate=true;
}
function updateGeometry(){
 terrainPositions.needsUpdate=true;terrainGeometry.computeVertexNormals();
 for(const o of interactiveItems){
  if(landDistance(o.position.x,o.position.z)<=0)continue;
  if(o.userData.kind==='tree')o.position.y=editedHeight(o.position.x,o.position.z);
  if(o.userData.kind==='rock')o.position.y=editedHeight(o.position.x,o.position.z)+(o.userData.baseOffset||0);
 }
}
function sculpt(point){
 if(landDistance(point.x,point.z)<.0)return;
 const radius=brushSize;
 for(let i=0;i<terrainPositions.count;i++){
   const x=terrainPositions.getX(i),z=terrainPositions.getZ(i);
   const d=Math.hypot(point.x-x,point.z-z);
   if(d>=radius || landDistance(x,z)<0) continue;
   const influence=brushInfluence(d,radius);
   const h=terrainPositions.getY(i);
   if(tool==='raise')terrainPositions.setY(i,clamp(h+.017*influence,-.12,1.25));
   if(tool==='lower')terrainPositions.setY(i,clamp(h-.017*influence,-.12,1.25));
   if(tool==='smooth')terrainPositions.setY(i,h+(terrainHeight(x,z)-h)*.035*influence);
 }
 updateGeometry();
}
function captureTerrain(){rememberChange({type:'terrain',heights:Float32Array.from(terrainPositions.array.filter((_,i)=>i%3===1))});}
function handleBrush(point){
 if(['raise','lower','smooth'].includes(tool)){sculpt(point);return;}
 if(tool==='plant'&&canPlace('tree',point.x,point.z,editedHeight(point.x,point.z))&&mayPlaceObject()){const m=createTree(point.x,point.z,.65+rand()*.85);interactiveItems.push(m);rememberChange({type:'added',object:m});}
 if(tool==='rock'&&canPlace('rock',point.x,point.z)&&mayPlaceObject()){const m=createRock(point.x,point.z,.6+rand()*1.4);interactiveItems.push(m);rememberChange({type:'added',object:m});}
 if(tool==='boat'&&canPlace('boat',point.x,point.z,editedHeight(point.x,point.z))&&mayPlaceObject()){const m=createBoat(point.x,point.z,.6+rand()*.6);interactiveItems.push(m);rememberChange({type:'added',object:m});}
 if(tool==='erase'){
   let closest=null,best=brushSize;
   for(const o of interactiveItems){const d=Math.hypot(o.position.x-point.x,o.position.z-point.z);if(d<best){best=d;closest=o;}}
   if(closest){discardObject(closest);interactiveItems.splice(interactiveItems.indexOf(closest),1);rememberChange({type:'removed',object:closest});}
 }
 updateLife();
}
function updateLife(){document.getElementById('life-count').textContent=`${FOREST_COUNT+interactiveItems.filter(o=>o.userData.kind==='tree').length} trees`;}
function undo(){const state=history.pop();if(!state)return;
 if(state.type==='terrain'){for(let i=0;i<terrainPositions.count;i++)terrainPositions.setY(i,state.heights[i]);updateGeometry();syncForestElevation();syncFoamElevation();}
 else if(state.type==='added'){discardObject(state.object);interactiveItems.splice(interactiveItems.indexOf(state.object),1);}
 else if(state.type==='removed'){restoreObject(state.object);interactiveItems.push(state.object);}
 updateLife();
}
function reset(){while(interactiveItems.length)discardObject(interactiveItems.pop());
 for(let i=0;i<terrainPositions.count;i++)terrainPositions.setY(i,initialHeights[i]);
 updateGeometry();syncForestElevation();syncFoamElevation();history.length=0;updateLife();}
function toast(message) {
 const node=document.getElementById('status-toast');
 node.textContent=message;
 node.hidden=false;
 clearTimeout(toast.timer);
 toast.timer=setTimeout(()=>{node.hidden=true;},4000);
}
function snapshotIsland() {
 const heights=new Float32Array(terrainPositions.count);
 for(let i=0;i<heights.length;i++)heights[i]=terrainPositions.getY(i);
 const objects=interactiveItems.map(o=>({
  kind:o.userData.kind,
  x:o.userData.kind==='boat'?o.userData.anchorX:o.position.x,
  z:o.userData.kind==='boat'?o.userData.anchorZ:o.position.z,
  scale:o.userData.scale||1
 }));
 return createSnapshot({heights,objects,wave:waveHeight,foam:foamIntensity,speed,hours});
}
function saveIsland(){
 try {
  const state=snapshotIsland();
  localStorage.setItem(SAVE_KEY,JSON.stringify(state));
  toast('Island saved to this browser.');
 } catch(e) {toast('Unable to save island: '+e.message);}
}
function applyIsland(saved){
 reset();
 for(let i=0;i<saved.heights.length;i++)terrainPositions.setY(i,saved.heights[i]);
 updateGeometry();
 syncForestElevation();
 syncFoamElevation();
 for(const item of saved.objects){
  const o=item.kind==='tree'?createTree(item.x,item.z,item.scale):
   item.kind==='rock'?createRock(item.x,item.z,item.scale):
   createBoat(item.x,item.z,item.scale);
  interactiveItems.push(o);
 }
 waveHeight=saved.wave;
 foamIntensity=saved.foam;
 seaDynamics.reset({wave:waveHeight,foam:foamIntensity});
 speed=saved.speed;
 hours=saved.hours;
 document.getElementById('wave').value=String(waveHeight);
 document.getElementById('foam').value=String(foamIntensity);
 document.getElementById('foam-label').textContent=Math.round(foamIntensity*100)+'%';
 document.getElementById('speed').value=String(speed);
 document.getElementById('wave-height').textContent=waveHeight.toFixed(1)+' m';
 document.getElementById('speed-label').textContent=speed.toFixed(1)+'×';
 document.querySelector('.status-dot').textContent=waveHeight>1?'● Energetic':'● Calm';
 history.length=0;
 updateLife();
 toast('Island restored: '+saved.objects.length+' placed objects.');
}
function loadIsland(){
 try{
  const data=localStorage.getItem(SAVE_KEY);
  if(!data){toast('No saved island yet. Use Save first.');return;}
  applyIsland(parseSnapshot(data,terrainPositions.count));
 }catch(e){toast('Unable to load island: '+e.message);}
}
function downloadIslandJSON(){
 try{
  const payload=JSON.stringify(snapshotIsland());
  const url=URL.createObjectURL(new Blob([payload],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='shoreline-island.json';
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast('Portable island JSON exported.');
 }catch(e){toast('Export failed: '+e.message);}
}
async function importIslandJSON(event){
 const input=event.currentTarget, file=input.files?.[0];
 if(!file)return;
 try{
  if(file.size>1600000)throw new Error('The selected file is too large');
  const state=parseSnapshot(await file.text(),terrainPositions.count);
  applyIsland(state);
  toast('Island JSON imported successfully.');
 }catch(e){toast('Import failed: '+e.message);}
 finally{input.value='';}
}
function exportImage(){
 try {
  renderer.render(scene,camera);
  const url=renderer.domElement.toDataURL('image/png');
  if(url.length<1000)throw new Error('canvas has no image');
  const a=document.createElement('a');
  a.href=url;
  a.download='shoreline-beach-sandbox.png';
  document.body.append(a);
  a.click();
  a.remove();
  toast('PNG screenshot exported.');
 } catch(e){toast('Unable to export screenshot: '+e.message);}
}
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();toast('3D context lost. Reload to resume rendering.');});
function setTool(next){tool=next;controls.enabled=tool==='explore';brushRing.visible=false;
 for(const b of document.querySelectorAll('[data-tool]'))b.classList.toggle('active',b.dataset.tool===tool);
 canvas.style.cursor=tool==='explore'?'grab':'crosshair';
}
canvas.addEventListener('pointerdown',event=>{
 if(event.button!==0 || tool==='explore')return;
 const point=pointerWorld(event);if(!point)return;
 isPainting=true;canvas.setPointerCapture(event.pointerId);
 if(['raise','lower','smooth'].includes(tool))captureTerrain();
 handleBrush(point);
});
let lastDraw=0;
canvas.addEventListener('pointermove',event=>{
 if(tool==='explore')return;
 const point=pointerWorld(event);
 brushRing.visible=Boolean(point);
 if(!point)return;
 brushRing.scale.setScalar(brushSize/.7);
 brushRing.position.set(point.x,Math.max(.11,point.y+.065),point.z);
 if(isPainting && ['raise','lower','smooth'].includes(tool)&&performance.now()-lastDraw>25){handleBrush(point);lastDraw=performance.now();}
});
function release(event){if(isPainting&&['raise','lower','smooth'].includes(tool)){syncForestElevation();syncFoamElevation();}isPainting=false;if(event?.pointerId!==undefined&&canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);}
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
canvas.addEventListener('pointerleave',()=>{brushRing.visible=false;if(isPainting&&['raise','lower','smooth'].includes(tool)){syncForestElevation();syncFoamElevation();}isPainting=false;});
const toolPanel=document.getElementById('tools-panel');
const mobileToolsButton=document.getElementById('btn-mobile-tools');
const mobileLayout=window.matchMedia('(max-width:620px)');
function closeMobileTools(){
 toolPanel.classList.add('mobile-collapsed');
 mobileToolsButton.setAttribute('aria-expanded','false');
}
function syncMobileLayout(){
 if(mobileLayout.matches)closeMobileTools();
 else {toolPanel.classList.remove('mobile-collapsed');mobileToolsButton.setAttribute('aria-expanded','false');}
}
mobileLayout.addEventListener('change',syncMobileLayout);
syncMobileLayout();
mobileToolsButton.addEventListener('click',()=>{
 const opened=toolPanel.classList.toggle('mobile-collapsed')===false;
 mobileToolsButton.setAttribute('aria-expanded',String(opened));
});
for(const b of document.querySelectorAll('[data-tool]'))b.addEventListener('click',()=>{
 setTool(b.dataset.tool);
 if(mobileLayout.matches)closeMobileTools();
});
document.getElementById('brush').addEventListener('input',e=>{brushSize=Number(e.target.value);document.getElementById('brush-value').textContent=brushSize.toFixed(1);});
document.getElementById('btn-undo').addEventListener('click',undo);
document.getElementById('btn-save').addEventListener('click',saveIsland);
document.getElementById('btn-load').addEventListener('click',loadIsland);
document.getElementById('btn-export-json').addEventListener('click',downloadIslandJSON);
document.getElementById('btn-import-json').addEventListener('click',()=>document.getElementById('island-file').click());
document.getElementById('island-file').addEventListener('change',importIslandJSON);
document.getElementById('btn-shot').addEventListener('click',exportImage);
document.getElementById('btn-reset').addEventListener('click',()=>{if(confirm('Restore the island to its original landscape?'))reset();});
document.getElementById('wave').addEventListener('input',e=>{waveHeight=Number(e.target.value);document.getElementById('wave-height').textContent=`${waveHeight.toFixed(1)} m`;document.querySelector('.status-dot').textContent=waveHeight>1?'● Energetic':'● Calm';});
document.getElementById('foam').addEventListener('input',e=>{foamIntensity=Number(e.target.value);document.getElementById('foam-label').textContent=Math.round(foamIntensity*100)+'%';});
document.getElementById('speed').addEventListener('input',e=>{speed=Number(e.target.value);document.getElementById('speed-label').textContent=`${speed.toFixed(1)}×`;});
document.getElementById('sun-hour').addEventListener('input',e=>{hours=Number(e.target.value);});
document.getElementById('bird-count').textContent=BIRD_COUNT+' flying';
function togglePause(){paused=!paused;document.getElementById('btn-pause').textContent=paused?'▶':'Ⅱ';document.getElementById('btn-pause').setAttribute('aria-label',paused?'Resume simulation':'Pause simulation');}
document.getElementById('btn-pause').addEventListener('click',togglePause);
function resetCamera(){camera.position.set(17,16,21);controls.target.set(0,0,0);camera.zoom=1;camera.updateProjectionMatrix();controls.update();document.getElementById('zoom-label').textContent='100%';}
document.getElementById('btn-camera').addEventListener('click',resetCamera);
function adjustZoom(multiple){camera.zoom=clamp(camera.zoom*multiple,.6,2.8);camera.updateProjectionMatrix();document.getElementById('zoom-label').textContent=`${Math.round(camera.zoom*100)}%`;}
document.getElementById('zoom-in').addEventListener('click',()=>adjustZoom(1.2));
document.getElementById('zoom-out').addEventListener('click',()=>adjustZoom(1/1.2));
document.getElementById('dismiss-hint').addEventListener('click',()=>document.getElementById('hint').remove());
const help=document.getElementById('help');document.getElementById('btn-help').addEventListener('click',()=>help.showModal());document.getElementById('close-help').addEventListener('click',()=>help.close());
const toolNames=['explore','raise','lower','smooth','plant','rock','boat','erase'];
document.addEventListener('keydown',e=>{if(help.open||e.target instanceof HTMLInputElement)return;if(e.key===' '){e.preventDefault();togglePause();}if(e.key>='1'&&e.key<='8')setTool(toolNames[Number(e.key)-1]);if(e.key==='z'&&(e.ctrlKey||e.metaKey)){e.preventDefault();undo();}});
function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;
 camera.left=-VIEW_SIZE*w/h/2;camera.right=VIEW_SIZE*w/h/2;
 camera.top=VIEW_SIZE/2;camera.bottom=-VIEW_SIZE/2;
 camera.updateProjectionMatrix();renderer.setSize(w,h,false);
}
window.addEventListener('resize',resize);
updateLife();resize();
const watch = new THREE.Clock();
// Opt-in diagnostic: open /?perf=1. No telemetry is sent or stored.
const showFrameMetrics=new URLSearchParams(window.location.search).get('perf')==='1';
const frameMetrics=showFrameMetrics?createFrameMetrics():null;
let perfPanel=null,perfText=null,perfRefreshElapsed=0;
if(showFrameMetrics){
  perfPanel=document.createElement('section');
  perfPanel.id='perf-panel';
  perfPanel.className='perf-panel';
  perfPanel.setAttribute('aria-label','Local frame-pacing diagnostics');
  perfPanel.innerHTML='<strong>Frame pacing (local only)</strong><span id="perf-readout">Measuring…</span><small>12 s rolling RAF timings · not GPU timer data</small>';
  document.querySelector('.app-shell').append(perfPanel);
  perfText=perfPanel.querySelector('#perf-readout');
}
const clockNode=document.getElementById('clock'),sunPosition=document.getElementById('sun-position');
let sunPalette=null,uiRefreshElapsed=.3;
const adaptiveResolution=createAdaptiveResolution({cap:initialDprCap,min:Math.min(.85,initialDprCap)});
let fpsSeconds=0,fpsFrames=0;
function animate(){requestAnimationFrame(animate);
 const rawDelta=watch.getDelta();
 const dt=Math.min(rawDelta,.08);
 if(frameMetrics){
   frameMetrics.addFrame(rawDelta,{hidden:document.hidden});
   perfRefreshElapsed+=rawDelta;
   if(perfRefreshElapsed>=2.5){
     perfRefreshElapsed=0;
     const stats=frameMetrics.snapshot();
     perfPanel.dataset.ready=stats.ready?'true':'false';
     perfPanel.dataset.frames=String(stats.frames);
     perfText.textContent=stats.ready
       ?`Average ${stats.meanFps.toFixed(1)} FPS · p95 ${stats.p95Ms.toFixed(1)} ms · p99 ${stats.p99Ms.toFixed(1)} ms · ${stats.frames} frames · DPR ${renderer.getPixelRatio().toFixed(2)}`
       :'Collecting visible frames…';
   }
 }
 if(document.hidden||rawDelta>1.5){
   fpsSeconds=0;fpsFrames=0;
   adaptiveResolution.observe({fps:0,dpr:renderer.getPixelRatio(),hidden:true});
   if(frameMetrics)frameMetrics.reset();
 }else{
   fpsSeconds+=rawDelta;fpsFrames++;
 }
 if(fpsSeconds>=1){
  const measuredFps=fpsFrames/fpsSeconds;
  document.getElementById('fps-label').textContent=Math.round(measuredFps)+' FPS';
  // Only resize after sustained poor/good frame rates. Ignore hidden tab stalls.
  const nextDpr=adaptiveResolution.observe({fps:measuredFps,seconds:fpsSeconds,dpr:renderer.getPixelRatio()});
  if(nextDpr!==null){renderer.setPixelRatio(nextDpr);resize();}
  fpsSeconds=0;fpsFrames=0;
 }
 if(!paused){elapsed+=dt*speed;hours=(hours+dt*speed*.052)%24;}
 // All sea layers transition to new conditions at the same physical rate.
 // Pause freezes both ocean time and its current sea-state interpolation.
 const sea=seaDynamics.advance(dt,{wave:waveHeight,foam:foamIntensity,paused});
 waveUniforms.uTime.value=elapsed;
 surfSpray.update(elapsed,sea.wave,sea.foam);
 breakingLip.update(elapsed,sea.wave,daylight(hours),sea.foam);
 gulls.update(elapsed);
 oceanAudio.update(elapsed,sea.wave,paused);
 waveUniforms.uWave.value=sea.wave;
 waveUniforms.uFoam.value=sea.foam;
 waveUniforms.uDay.value=daylight(hours);
 const day=daylight(hours);
 ambient.intensity=1.2+1.25*day;
 sunlight.intensity=.85+2.35*day;
 sunlight.position.set(12*Math.cos((hours-6)/12*Math.PI),9+10*day,10);
 const palette=day>.45?'day':day>.4?'transition':'dusk';
 if(palette!==sunPalette){
   sunlight.color.set(day>.45?'#fff4d8':'#ffba84');
   atmosphere.color.set(day>.45?'#a3eff2':'#ffa7a1');
   scene.fog.color.set(day>.4?'#edece5':'#d7b1ab');
   scene.background.set(day>.4?'#eeece6':'#d9beb6');
   sunPalette=palette;
 }
 atmosphere.intensity=.35+day*.48;
 renderer.toneMappingExposure=1.18+.27*day;
 // Time labels and decorative sun position do not need a DOM write at 60Hz.
 uiRefreshElapsed+=rawDelta;
 if(uiRefreshElapsed>=.25){
   uiRefreshElapsed=0;
   clockNode.textContent=clockLabel(hours);
   const dayPhase=clamp((hours-6)/12,0,1);
   sunPosition.style.left=`${dayPhase*93}%`;
   sunPosition.style.top=`${-4-34*Math.sin(dayPhase*Math.PI)}px`;
 }
 for(const b of boats){
   if(!b.parent)continue;
   const anchorX=b.userData.anchorX,anchorZ=b.userData.anchorZ;
   if(landDistance(anchorX,anchorZ)>0 && sampleGroundHeight(anchorX,anchorZ)<SEA_LEVEL-.045){
     const motion=lagoonWaterMotion(anchorX,anchorZ,elapsed,sea.wave);
     b.position.x=anchorX+motion.vx;
     b.position.z=anchorZ+motion.vz;
     b.position.y=SEA_LEVEL+.065+motion.height;
     b.rotation.x=Math.sin(elapsed*1.02+b.userData.phase)*.018*sea.wave;
     b.rotation.z=Math.cos(elapsed*.91+b.userData.phase)*.022*sea.wave;
     continue;
   }
   const current=boatCurrentPosition(elapsed,
     b.userData.anchorX,b.userData.anchorZ,b.userData.phase||0);
   b.position.x=current.x;b.position.z=current.z;
   const pose=boatPose(elapsed,current.x,current.z,{
     scale:b.userData.scale||1,yaw:b.userData.heading||0,wave:sea.wave
   });
   b.position.y=pose.y;
   b.rotation.x=pose.pitch;
   b.rotation.z=pose.roll;
 }
 controls.update();renderer.render(scene,camera);
}
animate();