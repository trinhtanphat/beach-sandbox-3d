import {WIDTH,DEPTH,shoreline} from './simulation.js';
import {LAGOON_SEA_LEVEL,lagoonWetness,lagoonWaterDepth,connectedSeaMask} from './lagoon-physics.js';
import {floodedInlandMetrics} from './coastal-metrics.js';

/**
 * Sea-connected water, sampled on a full-coast grid. Digging an isolated pit
 * does not magically fill it; opening a continuous trench floods it at the
 * fixed sea level. The existing offshore surf mesh stays unchanged.
 */
export function createLagoonSurface(THREE,scene,groundHeight,coast,uniforms){
 const NX=184,NZ=120,COLS=NX+1,ROWS=NZ+1;
 const minX=-WIDTH/2,maxX=2.8,minZ=-DEPTH/2,maxZ=DEPTH/2;
 const positions=[],uv=[],indices=[];
 const samples=new Float32Array(COLS*ROWS);
 const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t)};
 for(let iz=0;iz<=NZ;iz++){
  const z=minZ+(maxZ-minZ)*iz/NZ;
  for(let ix=0;ix<=NX;ix++){
   const x=minX+(maxX-minX)*ix/NX;
   positions.push(x,LAGOON_SEA_LEVEL+.015,z);
   uv.push(ix/NX,iz/NZ);
   if(ix<NX&&iz<NZ){
    const a=iz*COLS+ix,b=a+COLS;
    indices.push(a,b,a+1,b,b+1,a+1);
   }
  }
 }
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
    float shoal=1.-smoothstep(.01,.090,vDepth);
    float edgeFoam=shoal*(.15+.16*(sin(uTime*1.7+p.x*21.+p.y*13.)*.5+.5));
    c=mix(c,vec3(.82,.93,.84),edgeFoam);
    c*=.74+.26*uDay;
    gl_FragColor=vec4(c,vWet*(.64+.14*depthFactor));
   }`
 });
 const mesh=new THREE.Mesh(geometry,material);
 mesh.renderOrder=5;mesh.frustumCulled=false;scene.add(mesh);
 let waterMask=new Uint8Array(samples.length);
 let floodedCount=0;
 let coastalMetrics={floodedCells:0,area:0,capacity:0,meanDepth:0};
 function gridIndex(x,z){
  if(x<minX||x>maxX||z<minZ||z>maxZ)return -1;
  const ix=Math.max(0,Math.min(NX,Math.round((x-minX)/(maxX-minX)*NX)));
  const iz=Math.max(0,Math.min(NZ,Math.round((z-minZ)/(maxZ-minZ)*NZ)));
  return iz*COLS+ix;
 }
 function isConnected(x,z){
  const index=gridIndex(x,z);
  return index>=0&&waterMask[index]===1;
 }
 function refresh(){
  const wetAttr=geometry.getAttribute('aWet'),depthAttr=geometry.getAttribute('aDepth');
  for(let i=0;i<samples.length;i++){
   samples[i]=groundHeight(positions[i*3],positions[i*3+2]);
  }
  const result=connectedSeaMask(samples,COLS,ROWS,LAGOON_SEA_LEVEL);
  waterMask=result.connected;
  floodedCount=result.count;
  coastalMetrics=floodedInlandMetrics(samples,waterMask,COLS,ROWS,{minX,maxX,minZ,maxZ},coast,LAGOON_SEA_LEVEL);
  for(let i=0;i<samples.length;i++){
   const x=positions[i*3],z=positions[i*3+2];
   const h=samples[i];
   // A thin connected wet-sand border softens the bank but cannot cross a dam.
   const iy=Math.floor(i/COLS),ix=i%COLS;
   const touchesWater=(ix>0&&waterMask[i-1])||(ix<NX&&waterMask[i+1])||
      (iy>0&&waterMask[i-COLS])||(iy<NZ&&waterMask[i+COLS]);
   const coastalFade=1-smooth(coast(z)-.06,coast(z)+.27,x);
   const flooded=waterMask[i]||(h<LAGOON_SEA_LEVEL+.018&&touchesWater);
   wetAttr.setX(i,flooded?lagoonWetness(h)*coastalFade:0);
   depthAttr.setX(i,lagoonWaterDepth(h));
  }
  wetAttr.needsUpdate=true;depthAttr.needsUpdate=true;
  return floodedCount;
 }
 refresh();
 return {mesh,refresh,isConnected,get floodedCount(){return floodedCount;},get metrics(){return {...coastalMetrics};},
  dispose(){scene.remove(mesh);geometry.dispose();material.dispose()}};
}
