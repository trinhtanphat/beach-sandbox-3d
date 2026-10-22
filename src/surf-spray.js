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
    y: .13+.012*Math.sin(time*2.4+seed)+r*.048*strength,
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
  const material=new THREE.PointsMaterial({
    color:'#f6fff6',size:.055,transparent:true,opacity:.88,
    depthWrite:false,sizeAttenuation:true
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
  return {points,update,count:PARTICLES};
}
