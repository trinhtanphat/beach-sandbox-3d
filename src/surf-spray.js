/**
 * One batched spray cloud that rides the same fronts as the ocean shader.
 * Deterministic particles, no texture fetch and no object-per-particle costs.
 */
import { DEPTH, HALF_WIDTH, shoreline, seededRandom } from './simulation.js';
import { breakerPhase, waveEnvelope } from './waves.js';
const PARTICLES = 460;
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
export function createSurfSpray(THREE,scene) {
  const rand=seededRandom(77822);
  const seeds=Array.from({length:PARTICLES},(_,i)=>({
    id:i+1,z:(rand()-.5)*(DEPTH-.35),jitter:(rand()-.5)*.10
  }));
  const array=new Float32Array(PARTICLES*3);
  const lifeArray=new Float32Array(PARTICLES);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(array,3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aLife',new THREE.BufferAttribute(lifeArray,1).setUsage(THREE.DynamicDrawUsage));
  // Soft, round splashes rather than GL_POINTS square pixels.
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
    uniforms:{uMap:{value:foamTexture},uPointSize:{value:6.2},uWave:{value:.6}},
    vertexShader:`
      attribute float aLife;
      varying float vLife;
      uniform float uPointSize;uniform float uWave;
      void main(){
        vLife=aLife;
        vec4 view=modelViewMatrix*vec4(position,1.);
        gl_Position=projectionMatrix*view;
        gl_PointSize=clamp(uPointSize*(.76+.30*uWave),1.,11.);
      }`,
    fragmentShader:`
      uniform sampler2D uMap;
      varying float vLife;
      void main(){
        vec4 foam=texture2D(uMap,gl_PointCoord);
        foam.a*=vLife*.85;
        if(foam.a<.018)discard;
        gl_FragColor=foam;
      }`,
    transparent:true,depthWrite:false
  });
  const points=new THREE.Points(geometry,material);
  points.frustumCulled=false;
  points.renderOrder=7;
  scene.add(points);
  function update(time,strength) {
    material.uniforms.uWave.value=strength;
    for(let i=0;i<PARTICLES;i++){
      const s=seeds[i];
      const p=surfSprayPoint(time,s.z,s.id,strength);
      array[i*3]=p.x;
      array[i*3+1]=p.y;
      array[i*3+2]=p.z+s.jitter;
      lifeArray[i]=p.life;
    }
    geometry.attributes.position.needsUpdate=true;
    geometry.attributes.aLife.needsUpdate=true;
  }
  update(0,.6);
  return {points,update,count:PARTICLES,dispose(){scene.remove(points);geometry.dispose();material.dispose();foamTexture.dispose();}};
}
