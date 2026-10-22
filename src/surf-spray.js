/**
 * Foam spray animated on the GPU. All 460 particle anchor positions and seeds
 * are uploaded only once. CPU sample remains available for deterministic tests.
 */
import { DEPTH, HALF_WIDTH, shoreline, seededRandom } from './simulation.js';
import { breakerPhase, breakerPosition, frontWarp, waveEnvelope, sectionBreak, breakSectionGLSL } from './waves.js';
import { createOrganicFoamAtlas, FOAM_VARIANTS } from './foam-atlas.js';
export const SPRAY_PARTICLES=460;

export function surfSprayPoint(time, z, seed=0, strength=.6, shift=0) {
  const v=(z+DEPTH/2)/DEPTH;
  const phase=breakerPhase(time,v,shift);
  const life=waveEnvelope(phase)*(shift>.1?.68:1);
  const front=.34-.33*phase+frontWarp(time,v);
  const rand=Math.sin(seed*127.1+z*311.7)*43758.5453;
  const r=rand-Math.floor(rand);
  const coast=shoreline(z)-.1;
  const waterWidth=HALF_WIDTH+.06-coast;
  return {
    x: coast+waterWidth*(front+(.004+.065*r)),
    y: .155+.012*Math.sin(time*2.4+seed)+r*.055*strength,
    z,life,section:sectionBreak(time,v,shift),visibleLife:life*sectionBreak(time,v,shift)
  };
}

export const sprayVertexShader = `
attribute float aWaterWidth;
attribute float aAlong;
attribute float aSeed;
attribute float aRandom;
attribute float aPhaseShift;
attribute float aFoamVariant;
uniform float uTime;
uniform float uWave;
varying float vLife;
varying float vFoamVariant;
${breakSectionGLSL}
void main(){
  float v=aAlong;
  vFoamVariant=aFoamVariant;
  float cycle=fract(uTime*.23+sin(v*9.+.3)*.027+v*.012+aPhaseShift);
  vLife=smoothstep(0.,.12,cycle)*(1.-smoothstep(.77,1.,cycle))*(aPhaseShift>.1?.68:1.)*breakingSections(v,uTime,aPhaseShift);
  float front=.34-.33*cycle
      +.016*sin(v*22.+uTime*1.44513262)
      +.007*sin(v*49.-uTime*2.89026524)
      +.004*sin(v*94.+uTime*4.33539786);
  vec3 p=position;
  p.x+=aWaterWidth*(front+.004+.065*aRandom);
  p.y=.155+.012*sin(uTime*2.4+aSeed)+aRandom*.055*uWave;
  vec4 view=modelViewMatrix*vec4(p,1.);
  gl_Position=projectionMatrix*view;
  gl_PointSize=clamp(6.2*(.76+.30*uWave),1.,11.);
}`;

export const sprayFragmentShader = `
uniform sampler2D uMap;
uniform float uFoam;
varying float vLife;
varying float vFoamVariant;
void main(){
  vec2 tile=vec2(mod(vFoamVariant,2.),floor(vFoamVariant*.5));
  // Tile gutters prevent visible neighbor-bleeding under linear sampling.
  vec2 atlasUV=(tile+mix(vec2(.045),vec2(.955),gl_PointCoord))*.5;
  vec4 foam=texture2D(uMap,atlasUV);
  foam.a*=vLife*.85*uFoam;
  if(foam.a<.018)discard;
  gl_FragColor=foam;
}`;

export function createSurfSpray(THREE,scene) {
  const rand=seededRandom(77822);
  const positions=new Float32Array(SPRAY_PARTICLES*3);
  const widths=new Float32Array(SPRAY_PARTICLES);
  const along=new Float32Array(SPRAY_PARTICLES);
  const seeds=new Float32Array(SPRAY_PARTICLES);
  const randoms=new Float32Array(SPRAY_PARTICLES);
  const phaseShifts=new Float32Array(SPRAY_PARTICLES);
  const foamVariants=new Float32Array(SPRAY_PARTICLES);
  for(let i=0;i<SPRAY_PARTICLES;i++){
    const seed=i+1;
    const z=(rand()-.5)*(DEPTH-.35);
    const jitter=(rand()-.5)*.10;
    const coast=shoreline(z)-.1;
    const r=Math.sin(seed*127.1+z*311.7)*43758.5453;
    positions[i*3]=coast;
    positions[i*3+1]=0;
    positions[i*3+2]=z+jitter;
    widths[i]=HALF_WIDTH+.06-coast;
    along[i]=(z+DEPTH/2)/DEPTH;
    seeds[i]=seed;
    randoms[i]=r-Math.floor(r);
    phaseShifts[i]=(i%3===0)?.56:0;
    foamVariants[i]=i%FOAM_VARIANTS;
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('aWaterWidth',new THREE.BufferAttribute(widths,1));
  geometry.setAttribute('aAlong',new THREE.BufferAttribute(along,1));
  geometry.setAttribute('aSeed',new THREE.BufferAttribute(seeds,1));
  geometry.setAttribute('aRandom',new THREE.BufferAttribute(randoms,1));
  geometry.setAttribute('aPhaseShift',new THREE.BufferAttribute(phaseShifts,1));
  geometry.setAttribute('aFoamVariant',new THREE.BufferAttribute(foamVariants,1));
  // Four distinct foamy clusters in a single GPU texture atlas.
  const {size:texSize,pixels}=createOrganicFoamAtlas();
  const foamTexture=new THREE.DataTexture(pixels,texSize,texSize,THREE.RGBAFormat);
  foamTexture.magFilter=THREE.LinearFilter;
  foamTexture.minFilter=THREE.LinearFilter;
  foamTexture.needsUpdate=true;
  const material=new THREE.ShaderMaterial({
    uniforms:{uMap:{value:foamTexture},uTime:{value:0},uWave:{value:.6},uFoam:{value:1}},
    vertexShader:sprayVertexShader,
    fragmentShader:sprayFragmentShader,
    transparent:true,depthWrite:false
  });
  const points=new THREE.Points(geometry,material);
  points.frustumCulled=false;
  points.renderOrder=7;
  scene.add(points);
  function update(time,strength,foam=1){
    material.uniforms.uTime.value=time;
    material.uniforms.uWave.value=strength;
    material.uniforms.uFoam.value=foam;
  }
  update(0,.6);
  return {points,update,count:SPRAY_PARTICLES,
    dispose(){scene.remove(points);geometry.dispose();material.dispose();foamTexture.dispose();}};
}
