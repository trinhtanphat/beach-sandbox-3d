import {LAGOON_LIMITS,LAGOON_SEA_LEVEL,lagoonWetness,lagoonWaterDepth} from './lagoon-physics.js';
/**
 * Flat bathymetry-clipped lagoon surface. Terrain always occludes the mesh;
 * vertices are refreshed on sculpt commit, Undo, Reset and Load.
 * Shared sea-state uniforms ensure Pause/Sun/Wave remain coherent.
 */
export function createLagoonSurface(THREE,scene,groundHeight,coast,uniforms){
 const NX=116,NZ=94,{minX,maxX,minZ,maxZ}=LAGOON_LIMITS;
 const values=[],uvs=[],depths=[],wet=[],indices=[];
 const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t)};
 for(let iz=0;iz<=NZ;iz++){
  const z=minZ+(maxZ-minZ)*iz/NZ;
  for(let ix=0;ix<=NX;ix++){
   const x=minX+(maxX-minX)*ix/NX;
   values.push(x,LAGOON_SEA_LEVEL+.015,z);
   uvs.push(ix/NX,iz/NZ);
   depths.push(0);wet.push(0);
   if(ix<NX&&iz<NZ){
    const a=iz*(NX+1)+ix,b=a+NX+1;
    indices.push(a,b,a+1,b,b+1,a+1);
   }
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(values,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 geometry.setAttribute('aWet',new THREE.Float32BufferAttribute(wet,1));
 geometry.setAttribute('aDepth',new THREE.Float32BufferAttribute(depths,1));
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
 function refresh(){
  const wetAttr=geometry.getAttribute('aWet'),depthAttr=geometry.getAttribute('aDepth');
  for(let i=0;i<wetAttr.count;i++){
   const x=values[i*3],z=values[i*3+2];
   const h=groundHeight(x,z);
   const coastalFade=1-smooth(coast(z)-.06,coast(z)+.27,x);
   wetAttr.setX(i,lagoonWetness(h)*coastalFade);
   depthAttr.setX(i,lagoonWaterDepth(h));
  }
  wetAttr.needsUpdate=true;depthAttr.needsUpdate=true;
 }
 refresh();
 return {mesh,refresh,dispose(){scene.remove(mesh);geometry.dispose();material.dispose()}};
}
