/**
 * Isolated CPU work benchmark; NOT an interactive GPU FPS measurement.
 * Compare the previous JS per-vertex/per-spray recomputation work
 * against the new per-frame shader uniform update path.
 */
import * as THREE from 'three';
import {performance} from 'node:perf_hooks';
import {createBreakerLip,lipSample,LIP_ROWS,LIP_COLS} from '../src/breaker-lip.js';
import {createSurfSpray,surfSprayPoint,SPRAY_PARTICLES} from '../src/surf-spray.js';
import {DEPTH,HALF_DEPTH} from '../src/simulation.js';

const frames=300;
const lip=createBreakerLip(THREE,new THREE.Scene());
const spray=createSurfSpray(THREE,new THREE.Scene());
let checksum=0;
function oldCpuWork(){
  for(let frame=0;frame<frames;frame++){
    const time=frame/60;
    for(let row=0;row<=LIP_ROWS;row++){
      const z=-HALF_DEPTH+row/LIP_ROWS*DEPTH;
      for(let col=0;col<=LIP_COLS;col++){
        const p=lipSample(time,z,col/LIP_COLS,.6);
        checksum+=p.y*.000001;
      }
    }
    for(let i=0;i<SPRAY_PARTICLES;i++){
      const z=(i/SPRAY_PARTICLES-.5)*(DEPTH-.35);
      const p=surfSprayPoint(time,z,i+1,.6);
      checksum+=p.x*.000001;
    }
  }
}
function newCpuWork(){
  for(let frame=0;frame<frames;frame++){
    lip.update(frame/60,.6,1);
    spray.update(frame/60,.6);
    checksum+=lip.mesh.material.uniforms.uTime.value*.000001;
  }
}
function bench(fn){
  const start=performance.now();
  fn();
  return Math.round((performance.now()-start)*100)/100;
}
try{
  const warmup=Math.min(30,frames);
  for(let i=0;i<warmup;i++){lip.update(i/60,.6,1);spray.update(i/60,.6);}
  const oldMs=bench(oldCpuWork);
  const newMs=bench(newCpuWork);
  console.log(JSON.stringify({type:'CPU-only microbenchmark, not GPU FPS',
    frames,oldRecalculationMs:oldMs,newUniformMs:newMs,
    oldPerFrameMs:Math.round(oldMs/frames*10000)/10000,
    newPerFrameMs:Math.round(newMs/frames*10000)/10000,
    checksum},null,2));
}finally{lip.dispose();spray.dispose();}
