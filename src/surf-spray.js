/**
 * Foam spray animated on the GPU. All 460 particle anchor positions and seeds
 * are uploaded only once. CPU sample remains available for deterministic tests.
 */
import { DEPTH, HALF_WIDTH, shoreline, seededRandom } from './simulation.js';
import { breakerPhase, waveEnvelope } from './waves.js';
export const SPRAY_PARTICLES=460;

export function surfSprayPoint(time, z, seed=0, strength=.6) {
  const v=(z+DEPTH/2)/DEPTH;
  const phase=breakerPhase(time,v);
  const life=waveEnvelope(phase);
  const front=.34-.33*phase+.005*Math.sin(v*64+time*.6)
            +.004*Math.sin(v*151-time*.47);
  const rand=Math.sin(seed*127.1+z*311.7)*43758.5453;
  const r=rand-Math.floor(rand);
  const coast=shoreline(z)-.1;
  const waterWidth=HALF_WIDTH+.06-coast;
  return {
    x: coast+waterWidth*(front+(.004+.065*r)),
    y: .155+.012*Math.sin(time*2.4+seed)+r*.055*strength,
    z,life
  };
}

export const sprayVertexShader = `
attribute float aWaterWidth;
attribute float aAlong;
attribute float aSeed;
attribute float aRandom;
uniform float uTime;
uniform float uWave;
varying float vLife;
void main(){
  float v=aAlong;
  float cycle=fract(uTime*.23+sin(v*9.+.3)*.027+v*.012);
  vLife=smoothstep(0.,.12,cycle)*(1.-smoothstep(.77,1.,cycle));
  float front=.34-.33*cycle+.005*sin(v*64.+uTime*.6)
              +.004*sin(v*151.-uTime*.47);
  vec3 p=position;
  p.x+=aWaterWidth*(front+.004+.065*aRandom);
  p.y=.155+.012*sin(uTime*2.4+aSeed)+aRandom*.055*uWave;
  vec4 view=modelViewMatrix*vec4(p,1.);
  gl_Position=projectionMatrix*view;
  gl_PointSize=clamp(6.2*(.76+.30*uWave),1.,11.);
}`;

export const sprayFragmentShader = `
uniform sampler2D uMap;
varying float vLife;
void main(){
  vec4 foam=texture2D(uMap,gl_PointCoord);
  foam.a*=vLife*.85;
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
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('aWaterWidth',new THREE.BufferAttribute(widths,1));
  geometry.setAttribute('aAlong',new THREE.BufferAttribute(along,1));
  geometry.setAttribute('aSeed',new THREE.BufferAttribute(seeds,1));
  geometry.setAttribute('aRandom',new THREE.BufferAttribute(randoms,1));
  // Procedurally generated circular alpha — no external image request.
  const texSize=32;
  const pixels=new Uint8Array(texSize*texSize*4);
  for(let y=0;y<texSize;y++)for(let x=0;x<texSize;x++){
    const nx=(x+.5)/texSize*2-1, ny=(y+.5)/texSize*2-1;
    const radius=Math.sqrt(nx*nx+ny*ny);
    const softness=Math.max(0,Math.min(1,(1-radius)/.48));
    const a=softness*softness*(3-2*softness);
    const offset=(y*texSize+x)*4;
    pixels[offset]=245;pixels[offset+1]=253;pixels[offset+2]=247;
    pixels[offset+3]=Math.round(a*245);
  }
  const foamTexture=new THREE.DataTexture(pixels,texSize,texSize,THREE.RGBAFormat);
  foamTexture.magFilter=THREE.LinearFilter;
  foamTexture.minFilter=THREE.LinearFilter;
  foamTexture.needsUpdate=true;
  const material=new THREE.ShaderMaterial({
    uniforms:{uMap:{value:foamTexture},uTime:{value:0},uWave:{value:.6}},
    vertexShader:sprayVertexShader,
    fragmentShader:sprayFragmentShader,
    transparent:true,depthWrite:false
  });
  const points=new THREE.Points(geometry,material);
  points.frustumCulled=false;
  points.renderOrder=7;
  scene.add(points);
  function update(time,strength){
    material.uniforms.uTime.value=time;
    material.uniforms.uWave.value=strength;
  }
  update(0,.6);
  return {points,update,count:SPRAY_PARTICLES,
    dispose(){scene.remove(points);geometry.dispose();material.dispose();foamTexture.dispose();}};
}
