import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { WIDTH, DEPTH, HALF_WIDTH, HALF_DEPTH, clamp, smoothstep, shoreline, landDistance, noise, terrainHeight, forestWeight, seededRandom, brushInfluence, daylight, clockLabel } from './simulation.js';
import { oceanVertexShader, oceanFragmentShader, swashVertexShader, swashFragmentShader } from './waves.js';
import './style.css';

const canvas = document.getElementById('world');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.65;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#e6e5e2');
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
const ambient = new THREE.HemisphereLight('#fff9e8', '#94b0a9', 2.45);
scene.add(ambient);
const sunlight = new THREE.DirectionalLight('#fff0d2', 3.2);
sunlight.position.set(-5, 17, 11);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(2048, 2048);
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
const boxMat = new THREE.MeshStandardMaterial({ color: '#c6b491', roughness: 1 });
const base = new THREE.Mesh(new THREE.BoxGeometry(WIDTH + .07, .57, DEPTH + .07), boxMat);
base.position.y = -.66;
base.receiveShadow = true;
scene.add(base);
const oceanBase = new THREE.Mesh(new THREE.BoxGeometry(WIDTH + .01, .1, DEPTH + .01), new THREE.MeshStandardMaterial({ color: '#2c8d95', roughness: 1 }));
oceanBase.position.y = -.33;
scene.add(oceanBase);

function terrainColor(x, z) {
  const distance = landDistance(x, z);
  const n = noise(x,z) * .05 + (rand()-.5)*.042;
  const shoreSand = new THREE.Color('#f3dcaa');
  const inlandSand = new THREE.Color('#d6c58f');
  const sand = shoreSand.clone().lerp(inlandSand, smoothstep(.15, 5.5, distance));
  const green = new THREE.Color('#76a65a').lerp(new THREE.Color('#3d7c37'), rand()*.7);
  if (distance <= -.1) return new THREE.Color('#65b2a6').lerp(new THREE.Color('#277585'), smoothstep(.5,7,-distance));
  if (distance <= .04) return new THREE.Color('#c9dcc1');
  return sand.lerp(green, forestWeight(x,z)*smoothstep(1,2.6,distance)*(.42+.45*rand())).offsetHSL(0,0,n);
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
  const coast=shoreline(z)-.1;
  for(let col=0;col<=SEA_STEPS;col++) {
    const u=col/SEA_STEPS;
    const x=coast+(HALF_WIDTH+.06-coast)*u;
    seaPositions.push(x,.047,z);
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
const waveUniforms={uTime:{value:0},uWave:{value:.6},uDay:{value:1}};
const waterMaterial = new THREE.ShaderMaterial({
  uniforms:waveUniforms,side:THREE.DoubleSide,transparent:true,depthWrite:false,
  vertexShader:oceanVertexShader,fragmentShader:oceanFragmentShader
});
const water = new THREE.Mesh(seaGeometry,waterMaterial);
water.renderOrder = 4;
scene.add(water);

// A thin transparent swash reaches above the beach edge, and advances then
// retreats. The motion is drawn on the actual curved coastline (not a PNG).
const foamPositions=[],foamUV=[],foamIndices=[];
const FOAM_ROWS=200,FOAM_COLS=8;
for(let iz=0;iz<=FOAM_ROWS;iz++){
  const z=-HALF_DEPTH+iz/FOAM_ROWS*DEPTH;
  const coast=shoreline(z);
  for(let j=0;j<=FOAM_COLS;j++){
    const t=j/FOAM_COLS;
    const x=coast-.86+t*1.25;
    foamPositions.push(x,Math.max(.067,terrainHeight(x,z)+.022),z);
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

const sandRockMaterial=new THREE.MeshStandardMaterial({color:'#95877a',roughness:1,flatShading:true});
const underRockMaterial=new THREE.MeshStandardMaterial({color:'#747971',roughness:1,flatShading:true});
const trunkMaterial=new THREE.MeshStandardMaterial({color:'#6d7153',roughness:1});
const leafMaterial=new THREE.MeshStandardMaterial({color:'#6ba44a',roughness:1,flatShading:true});
function createTree(x,z,scale=1) {
  const g=new THREE.Group();
  const y=editedHeight(x,z);
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.055*scale,.087*scale,.36*scale,5),trunkMaterial);
  trunk.position.y=.18*scale;trunk.castShadow=true;g.add(trunk);
  const leafColors=['#568b36','#75aa44','#a3bb62','#3e8039','#89a64b'];
  const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(.29*scale,1),new THREE.MeshStandardMaterial({color:leafColors[Math.floor(rand()*leafColors.length)],roughness:1,flatShading:true}));
  crown.position.y=.48*scale;crown.scale.set(1.1,.87,1.05);crown.castShadow=true;g.add(crown);
  const crown2=new THREE.Mesh(new THREE.IcosahedronGeometry(.21*scale,1),crown.material);
  crown2.position.set(.13*scale,.48*scale,.13*scale);g.add(crown2);
  g.position.set(x,y,z);
  g.userData.kind='tree';scene.add(g);return g;
}
const FOREST_COUNT=840;
const treeGeo=new THREE.IcosahedronGeometry(.28,1);
const trunkGeo=new THREE.CylinderGeometry(.05,.075,.34,5);
const leaves=new THREE.InstancedMesh(treeGeo,leafMaterial,FOREST_COUNT);
const smallLeaves=new THREE.InstancedMesh(treeGeo,leafMaterial,FOREST_COUNT);
const trunks=new THREE.InstancedMesh(trunkGeo,trunkMaterial,FOREST_COUNT);
const tempObject=new THREE.Object3D();
const foliagePalette=['#4d8d39','#80ad4a','#a8bc69','#649d3a','#5c973e','#7da83c','#3e7c35','#b1b66a'];
for(let i=0;i<FOREST_COUNT;i++) {
 let x,z, tries=0;
 do { z=(rand()-.5)*(DEPTH-.72);x=-8.7+rand()*9.2;tries++; } while(tries<45 && (landDistance(x,z)<1.5 || rand()>forestWeight(x,z)));
 if(landDistance(x,z)<.5)x=shoreline(z)-.85;
 const y=terrainHeight(x,z), sc=.6+rand()*.85;
 tempObject.position.set(x,y+.17*sc,z);tempObject.scale.set(sc,sc,sc);tempObject.rotation.set(0,rand()*6,0);tempObject.updateMatrix();trunks.setMatrixAt(i,tempObject.matrix);
 tempObject.position.set(x,y+.40*sc,z);tempObject.scale.set(sc*(.9+rand()*.28),sc*(.8+rand()*.22),sc*(.9+rand()*.3));tempObject.updateMatrix();leaves.setMatrixAt(i,tempObject.matrix);
 tempObject.position.set(x+.1*sc,y+.43*sc,z+.1*sc);tempObject.scale.set(sc*.6,sc*.62,sc*.62);tempObject.updateMatrix();smallLeaves.setMatrixAt(i,tempObject.matrix);
 const color=new THREE.Color(foliagePalette[Math.floor(rand()*foliagePalette.length)]);
 leaves.setColorAt(i,color);smallLeaves.setColorAt(i,color.clone().offsetHSL(.007,.02,.028));
}
for(const mesh of [leaves,smallLeaves,trunks]) {mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=false;scene.add(mesh);}
leaves.instanceColor.needsUpdate=true;smallLeaves.instanceColor.needsUpdate=true;

function createRock(x,z,sc=1,rockMaterial=sandRockMaterial){
 const baseY=landDistance(x,z)>0?editedHeight(x,z):-.10;
 const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(1,0),rockMaterial);
 rock.position.set(x,baseY+.10*sc,z);
 rock.scale.set(.27*sc,.19*sc,.32*sc);rock.rotation.set(rand()*.25,rand()*6,rand()*.25);rock.castShadow=true;rock.receiveShadow=true;
 rock.userData.kind='rock';rock.userData.baseOffset=.10*sc;scene.add(rock);return rock;
}
for(let i=0;i<94;i++){
 const z=(rand()-.5)*10.1;
 const x=shoreline(z)+(rand()*9.8)-1;
 if(x>8.8||x<-8.8) continue;
 createRock(x,z,.24+rand()*1.1,landDistance(x,z)<0?underRockMaterial:sandRockMaterial);
}
// Tiny shells, flowers and sunlit specks create detail without texture downloads.
const shellMaterials=[new THREE.MeshStandardMaterial({color:'#f7f1d4',roughness:1}),new THREE.MeshStandardMaterial({color:'#f8bda2',roughness:1}),new THREE.MeshStandardMaterial({color:'#f4b665',roughness:1})];
const shellGeo=new THREE.IcosahedronGeometry(.038,0);
for(let i=0;i<325;i++){
 const z=(rand()-.5)*10.3;
 const x=shoreline(z)-.14-rand()*2.45;
 if(x<-8.8 || forestWeight(x,z)>.75)continue;
 const shell=new THREE.Mesh(shellGeo,shellMaterials[Math.floor(rand()*shellMaterials.length)]);
 shell.position.set(x,terrainHeight(x,z)+.037,z);shell.scale.set(1,.4,1.3);scene.add(shell);
}
const boats=[];
function createBoat(x,z,scale=1) {
 const boat=new THREE.Group();
 const hull=new THREE.Mesh(new THREE.SphereGeometry(.30*scale,10,7),new THREE.MeshStandardMaterial({color:'#bd7c45',roughness:.85}));
 hull.scale.set(.67,.43,1.18);hull.position.y=.07*scale;hull.castShadow=true;boat.add(hull);
 const deck=new THREE.Mesh(new THREE.BoxGeometry(.31*scale,.02*scale,.43*scale),new THREE.MeshStandardMaterial({color:'#fae0a5',roughness:1}));deck.position.y=.15*scale;boat.add(deck);
 const mast=new THREE.Mesh(new THREE.CylinderGeometry(.014*scale,.014*scale,.56*scale,6),new THREE.MeshStandardMaterial({color:'#725e42'}));mast.position.y=.4*scale;boat.add(mast);
 const sailGeometry=new THREE.BufferGeometry();
 sailGeometry.setAttribute('position',new THREE.Float32BufferAttribute([0,.67*scale,0,0,.22*scale,0,.27*scale,.22*scale,0],3));
 sailGeometry.computeVertexNormals();
 const sail=new THREE.Mesh(sailGeometry,new THREE.MeshStandardMaterial({color:'#fff8dc',side:THREE.DoubleSide,roughness:1}));boat.add(sail);
 boat.position.set(x,.08,z);boat.rotation.y=rand()*6.28;boat.userData.kind='boat';boat.userData.phase=rand()*6.28;
 scene.add(boat);boats.push(boat);return boat;
}
createBoat(4.35,-2.05,1.0);
createBoat(6.0,2.1,.7);
createBoat(2.65,2.8,.47);

// Brush visual floats above the land as a hint when an editing tool is active.
const brushRing=new THREE.Mesh(new THREE.RingGeometry(.63,.7,64),new THREE.MeshBasicMaterial({color:'#f7a66e',transparent:true,opacity:.85,side:THREE.DoubleSide,depthWrite:false}));
brushRing.rotation.x=-Math.PI/2;brushRing.visible=false;scene.add(brushRing);
const interactiveItems=[];
const history=[];
let tool='explore', isPainting=false, waveHeight=.6, speed=1, paused=false, elapsed=0, hours=10, brushSize=.7, zoomBase=1;
const raycaster=new THREE.Raycaster(),pointerNdc=new THREE.Vector2(),landPlane=new THREE.Plane(new THREE.Vector3(0,1,0),-.1),hit=new THREE.Vector3();
function editedHeight(x,z){
 const ix=clamp(Math.round((x+HALF_WIDTH)*SEG_X/WIDTH),0,SEG_X);
 const iz=clamp(Math.round((z+HALF_DEPTH)*SEG_Z/DEPTH),0,SEG_Z);
 return terrainPositions.getY(iz*(SEG_X+1)+ix);
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
function captureTerrain(){history.push({type:'terrain',heights:Float32Array.from(terrainPositions.array.filter((_,i)=>i%3===1))});if(history.length>18)history.shift();}
function handleBrush(point){
 if(['raise','lower','smooth'].includes(tool)){sculpt(point);return;}
 if(tool==='plant'&&landDistance(point.x,point.z)>.25){const m=createTree(point.x,point.z,.65+rand()*.85);interactiveItems.push(m);history.push({type:'added',object:m});}
 if(tool==='rock'){const m=createRock(point.x,point.z,.6+rand()*1.4);interactiveItems.push(m);history.push({type:'added',object:m});}
 if(tool==='boat'&&landDistance(point.x,point.z)<-.25){const m=createBoat(point.x,point.z,.6+rand()*.6);interactiveItems.push(m);history.push({type:'added',object:m});}
 if(tool==='erase'){
   let closest=null,best=brushSize;
   for(const o of interactiveItems){const d=Math.hypot(o.position.x-point.x,o.position.z-point.z);if(d<best){best=d;closest=o;}}
   if(closest){scene.remove(closest);interactiveItems.splice(interactiveItems.indexOf(closest),1);history.push({type:'removed',object:closest});}
 }
 updateLife();
}
function updateLife(){document.getElementById('life-count').textContent=`${FOREST_COUNT+interactiveItems.filter(o=>o.userData.kind==='tree').length} trees`;}
function undo(){const state=history.pop();if(!state)return;
 if(state.type==='terrain'){for(let i=0;i<terrainPositions.count;i++)terrainPositions.setY(i,state.heights[i]);updateGeometry();}
 else if(state.type==='added'){scene.remove(state.object);interactiveItems.splice(interactiveItems.indexOf(state.object),1);}
 else if(state.type==='removed'){scene.add(state.object);interactiveItems.push(state.object);}
 updateLife();
}
function reset(){while(interactiveItems.length)scene.remove(interactiveItems.pop());
 for(let i=0;i<terrainPositions.count;i++)terrainPositions.setY(i,initialHeights[i]);
 updateGeometry();history.length=0;updateLife();}
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
function release(event){isPainting=false;if(event?.pointerId!==undefined&&canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);}
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
canvas.addEventListener('pointerleave',()=>{brushRing.visible=false;isPainting=false;});
for(const b of document.querySelectorAll('[data-tool]'))b.addEventListener('click',()=>setTool(b.dataset.tool));
document.getElementById('brush').addEventListener('input',e=>{brushSize=Number(e.target.value);document.getElementById('brush-value').textContent=brushSize.toFixed(1);});
document.getElementById('btn-undo').addEventListener('click',undo);
document.getElementById('btn-reset').addEventListener('click',()=>{if(confirm('Restore the island to its original landscape?'))reset();});
document.getElementById('wave').addEventListener('input',e=>{waveHeight=Number(e.target.value);document.getElementById('wave-height').textContent=`${waveHeight.toFixed(1)} m`;document.querySelector('.status-dot').textContent=waveHeight>1?'● Energetic':'● Calm';});
document.getElementById('speed').addEventListener('input',e=>{speed=Number(e.target.value);document.getElementById('speed-label').textContent=`${speed.toFixed(1)}×`;});
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
function animate(){requestAnimationFrame(animate);
 const dt=Math.min(watch.getDelta(),.08);
 if(!paused){elapsed+=dt*speed;hours=(hours+dt*speed*.052)%24;}
 waveUniforms.uTime.value=elapsed;
 waveUniforms.uWave.value=waveHeight;
 waveUniforms.uDay.value=daylight(hours);
 const day=daylight(hours);
 ambient.intensity=1.2+1.25*day;
 sunlight.intensity=.85+2.35*day;
 sunlight.position.set(12*Math.cos((hours-6)/12*Math.PI),9+10*day,10);
 sunlight.color.set(day>.35?'#fff4d8':'#fbcba9');
 scene.background.set(day>.4?'#e6e5e2':'#b8b3b1');
 document.getElementById('clock').textContent=clockLabel(hours);
 const dayPhase=clamp((hours-6)/12,0,1);
 const sunPosition=document.getElementById('sun-position');
 sunPosition.style.left=`${dayPhase*93}%`;
 sunPosition.style.top=`${-4-34*Math.sin(dayPhase*Math.PI)}px`;
 for(const b of boats){if(!b.parent)continue;b.position.y=.06+Math.sin(elapsed*2.1+b.userData.phase)*.025*waveHeight;b.rotation.z=Math.sin(elapsed*1.45+b.userData.phase)*.05*waveHeight;}
 controls.update();renderer.render(scene,camera);
}
animate();