import {WIDTH,DEPTH} from './simulation.js';
import {LAGOON_SEA_LEVEL,lagoonWetness,connectedSeaMask} from './lagoon-physics.js';
import {floodedInlandMetrics} from './coastal-metrics.js';
import {createCoastalFlow} from './inland-hydraulics.js';

/**
 * Finite-volume animated inlet. A fixed-height offshore reservoir supplies the
 * water. Low inland cells fill via neighbouring wetted faces over elapsed time.
 * Flooded pockets retain water when an inlet is dammed.
 */
export function createLagoonSurface(THREE,scene,groundHeight,coast,uniforms){
 const NX=184,NZ=120,COLS=NX+1,ROWS=NZ+1;
 const minX=-WIDTH/2,maxX=2.8,minZ=-DEPTH/2,maxZ=DEPTH/2;
 const dx=(maxX-minX)/NX,dz=(maxZ-minZ)/NZ;
 const positions=[],uv=[],indices=[],samples=new Float32Array(COLS*ROWS);
 const reservoir=new Uint8Array(samples.length);
 const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t)};
 for(let iz=0;iz<=NZ;iz++){
  const z=minZ+iz*dz;
  for(let ix=0;ix<=NX;ix++){
   const x=minX+ix*dx,index=iz*COLS+ix;
   const floor=groundHeight(x,z);
   samples[index]=floor;
   reservoir[index]=(ix===NX||x>coast(z)+.16)&&floor<LAGOON_SEA_LEVEL-.004?1:0;
   positions.push(x,LAGOON_SEA_LEVEL+.015,z);
   uv.push(ix/NX,iz/NZ);
   if(ix<NX&&iz<NZ){const a=iz*COLS+ix,b=a+COLS;indices.push(a,b,a+1,b,b+1,a+1);}
  }
 }
 // Even entirely dry mock terrain needs an ocean boundary for consistent tests.
 for(let iz=0;iz<=NZ;iz++)reservoir[iz*COLS+NX]=1;
 const fluid=createCoastalFlow({columns:COLS,rows:ROWS,heights:samples,reservoir,dx,dz});
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 geometry.setAttribute('aWet',new THREE.Float32BufferAttribute(new Float32Array(samples.length),1));
 geometry.setAttribute('aDepth',new THREE.Float32BufferAttribute(new Float32Array(samples.length),1));
 geometry.setIndex(indices);
 const material=new THREE.ShaderMaterial({
  uniforms,side:THREE.DoubleSide,transparent:true,depthWrite:false,
  vertexShader:`
   attribute float aWet;attribute float aDepth;
   varying float vWet;varying float vDepth;varying vec2 vUv;
   void main(){
    vWet=aWet;vDepth=aDepth;vUv=uv;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
   }`,
  fragmentShader:`
   uniform float uTime;uniform float uWave;uniform float uDay;
   varying float vWet;varying float vDepth;varying vec2 vUv;
   void main(){
    if(vWet<.025)discard;
    vec2 p=vUv*vec2(9.,7.);
    float ripple=sin(p.x*19.+uTime*1.45+p.y*2.)*.5+
                 sin(p.y*32.-uTime*1.03-p.x*1.7)*.5;
    float sheltered=sin(p.x*5.-uTime*.38+p.y*2.)*.5+.5;
    vec3 shallow=vec3(.18,.74,.71);
    vec3 deep=vec3(.035,.37,.48);
    float depthFactor=smoothstep(.035,.29,vDepth);
    vec3 c=mix(shallow,deep,depthFactor*.72);
    c+=vec3(.017,.04,.04)*(ripple*.50+sheltered*.25)*clamp(uWave,.1,1.6);
    float shoal=1.-smoothstep(.01,.09,vDepth);
    float edgeFoam=shoal*(.15+.16*(sin(uTime*1.7+p.x*21.+p.y*13.)*.5+.5));
    c=mix(c,vec3(.82,.93,.84),edgeFoam);
    c*=.74+.26*uDay;
    gl_FragColor=vec4(c,vWet*(.64+.14*depthFactor));
   }`
 });
 const mesh=new THREE.Mesh(geometry,material);
 mesh.renderOrder=5;mesh.frustumCulled=false;scene.add(mesh);
 let connection=new Uint8Array(samples.length),floodedCount=0;
 let metrics={floodedCells:0,area:0,capacity:0,meanDepth:0};
 function gridIndex(x,z){
  if(x<minX||x>maxX||z<minZ||z>maxZ)return -1;
  return Math.max(0,Math.min(NZ,Math.round((z-minZ)/dz)))*COLS+
    Math.max(0,Math.min(NX,Math.round((x-minX)/dx)));
 }
 function isConnected(x,z){const i=gridIndex(x,z);return i>=0&&connection[i]===1;}
 function waterDepth(x,z){const i=gridIndex(x,z);return i>=0?fluid.depth[i]:0;}
 function updateDisplay(){
  const pos=geometry.getAttribute('position'),wet=geometry.getAttribute('aWet');
  const depthAttr=geometry.getAttribute('aDepth');
  floodedCount=0;
  for(let i=0;i<samples.length;i++){
   const depth=fluid.depth[i],x=positions[i*3],z=positions[i*3+2];
   const coastalFade=1-smooth(coast(z)-.06,coast(z)+.27,x);
   // Cell has volume only if hydraulic flux delivered it, not merely a
   // global reachability lookup. The surface rises as that volume grows.
   pos.setY(i,samples[i]+depth+.012);
   wet.setX(i,smooth(.002,.03,depth)*coastalFade);
   depthAttr.setX(i,depth);
   if(depth>.003)floodedCount++;
  }
  pos.needsUpdate=true;wet.needsUpdate=true;depthAttr.needsUpdate=true;
  metrics=floodedInlandMetrics(samples,fluid.wet,COLS,ROWS,
    {minX,maxX,minZ,maxZ},coast,LAGOON_SEA_LEVEL,fluid.depth);
 }
 function refresh({reset=false}={}){
  for(let i=0;i<samples.length;i++)samples[i]=groundHeight(positions[i*3],positions[i*3+2]);
  fluid.setTerrain(samples,{reset});
  connection=connectedSeaMask(samples,COLS,ROWS,LAGOON_SEA_LEVEL).connected;
  updateDisplay();
  return floodedCount;
 }
 function advance(dt){
  const steps=fluid.advance(dt);
  if(steps>0)updateDisplay();
  return steps;
 }
 refresh({reset:true});
 return {mesh,refresh,advance,isConnected,waterDepth,get floodedCount(){return floodedCount;},
  get metrics(){return {...metrics};},get fluid(){return fluid;},
  dispose(){scene.remove(mesh);geometry.dispose();material.dispose()}};
}
