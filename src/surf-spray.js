/**
 * One batched spray cloud that rides the same fronts as the ocean shader.
 * Deterministic particles, no texture fetch and no object-per-particle costs.
 */
import { DEPTH, HALF_WIDTH, shoreline, seededRandom } from './simulation.js';
const PARTICLES = 460;
export function surfSprayPoint(time, z, seed=0, strength=.6) {
  const v=(z+DEPTH/2)/DEPTH;
  const phase=(time*.23+Math.sin(v*9+.3)*.027+v*.012)%1;
  const front=.34-.33*((phase+1)%1)+.005*Math.sin(v*64+time*.6)
            +.004*Math.sin(v*151-time*.47);
  const rand=Math.sin(seed*127.1+z*311.7)*43758.5453;
  const r=rand-Math.floor(rand);
  const coast=shoreline(z)-.1;
  const waterWidth=HALF_WIDTH+.06-coast;
  return {
    x: coast+waterWidth*(front+(.004+.065*r)),
    y: .155+.012*Math.sin(time*2.4+seed)+r*.055*strength,
    z
  };
}
export function createSurfSpray(THREE,scene) {
  const rand=seededRandom(77822);
  const seeds=Array.from({length:PARTICLES},(_,i)=>({
    id:i+1,z:(rand()-.5)*(DEPTH-.35),jitter:(rand()-.5)*.10
  }));
  const array=new Float32Array(PARTICLES*3);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(array,3).setUsage(THREE.DynamicDrawUsage));
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
  const material=new THREE.PointsMaterial({
    color:'#f9fff8',map:foamTexture,size:.10,transparent:true,opacity:.82,
    alphaTest:.025,depthWrite:false,sizeAttenuation:true
  });
  const points=new THREE.Points(geometry,material);
  points.frustumCulled=false;
  points.renderOrder=7;
  scene.add(points);
  function update(time,strength) {
    for(let i=0;i<PARTICLES;i++){
      const s=seeds[i];
      const p=surfSprayPoint(time,s.z,s.id,strength);
      array[i*3]=p.x;
      array[i*3+1]=p.y;
      array[i*3+2]=p.z+s.jitter;
    }
    geometry.attributes.position.needsUpdate=true;
  }
  update(0,.6);
  return {points,update,count:PARTICLES,dispose(){scene.remove(points);geometry.dispose();material.dispose();foamTexture.dispose();}};
}
