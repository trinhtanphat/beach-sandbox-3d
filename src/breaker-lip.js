/**
 * Twin GPU breaker lips: one continuous draw call, no per-frame CPU geometry.
 * Offshore swells form two offset wave trains with naturally curved fronts.
 */
import { DEPTH, HALF_DEPTH, HALF_WIDTH, shoreline, clamp } from './simulation.js';
import { breakerPhase, frontWarp, waveEnvelope, sectionBreak, breakSectionGLSL } from './waves.js';
import { COASTAL_ZONES } from './world-layout.js';
import { coastalFlowGLSL } from './coastal-flow.js';

export const LIP_ROWS=200;
export const LIP_COLS=9;
export const LIP_TRAINS=2;
export const LIP_BASE_Y=.104;

export function lipSample(time,z,across=.5,wave=.6,shift=0) {
  const v=(z+HALF_DEPTH)/DEPTH;
  const coast=shoreline(z)-COASTAL_ZONES.seaOverlap;
  const offshoreWidth=HALF_WIDTH+.06-coast;
  const phase=.34-.33*breakerPhase(time,v,shift)+frontWarp(time,v);
  const amp=clamp(wave,.1,1.6);
  const life=waveEnvelope(breakerPhase(time,v,shift));
  const strength=shift>.1?.68:1;
  const span=(.10+.075*amp)*(.78+.22*strength);
  const rise=Math.pow(Math.max(0,Math.sin(Math.PI*across)),1.75);
  const irregular=.78+.22*Math.sin(v*47+time*.89)*Math.sin(v*19-time*.4);
  const x=coast+offshoreWidth*phase+(across-.5)*span-.037*rise*amp*strength;
  const y=LIP_BASE_Y+(.018+(.20*rise*irregular))*amp*life*strength;
  return {x,y,z,phase,foam:rise*life*strength*sectionBreak(time,v,shift),life,section:sectionBreak(time,v,shift)};
}

export const breakerLipVertexShader = `
attribute float aWaterWidth;
attribute float aPhaseShift;
attribute float aStrength;
uniform float uTime;
uniform float uWave;
varying vec2 vUv;
varying float vLife;
varying float vStrength;
varying float vPhaseShift;
void main(){
  vUv=uv;
  float v=uv.y;
  float cycle=fract(uTime*.23+sin(v*9.+.3)*.027+v*.012+aPhaseShift);
  float front=.34-.33*cycle
    +.016*sin(v*22.+uTime*1.44513262)
    +.007*sin(v*49.-uTime*2.89026524)
    +.004*sin(v*94.+uTime*4.33539786);
  float life=smoothstep(0.,.12,cycle)*(1.-smoothstep(.77,1.,cycle));
  vLife=life;
  vStrength=aStrength;
  vPhaseShift=aPhaseShift;
  float wave=clamp(uWave,.1,1.6);
  float across=uv.x;
  float span=(.10+.075*wave)*(.78+.22*aStrength);
  float rise=pow(max(0.,sin(3.14159265*across)),1.75);
  float irregular=.78+.22*sin(v*47.+uTime*.89)*sin(v*19.-uTime*.4);
  vec3 p=position;
  p.x+=aWaterWidth*front+(across-.5)*span-.037*rise*wave*aStrength;
  p.y=.104+(.018+(.20*rise*irregular))*wave*life*aStrength;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
}`;

export const breakerLipFragmentShader = `
uniform float uTime;
uniform float uWave;
uniform float uDay;
uniform float uFoam;
varying vec2 vUv;
varying float vLife;
varying float vStrength;
varying float vPhaseShift;
${breakSectionGLSL}
${coastalFlowGLSL}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise2(vec2 p){
 vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),
            mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);
}
void main(){
 float across=vUv.x;
 float dome=pow(max(0.,sin(3.14159265*across)),.8);
 // Waves break in softly scalloped sections rather than a hard white ribbon.
 float phase=fract(uTime*.23+sin(vUv.y*9.+.3)*.027+vUv.y*.012+vPhaseShift);
 float front=.34-.33*phase;
 float drift=foamTravel(front,vUv.y,phase);
 vec2 tracerUv=vec2(vUv.x-foamReturnTravel(front,vUv.y,phase),vUv.y-drift);
 float lace=noise2(tracerUv*vec2(7.,60.)+vec2(uTime*.16,uTime*.10));
 float smaller=noise2(tracerUv*vec2(19.,169.)+vec2(-uTime*.25,uTime*.29));
 float breakSections=breakingSections(vUv.y,uTime,vPhaseShift);
 float edge=clamp(dome*(.36+.37*lace+.27*smaller),0.,1.);
 vec3 water=vec3(.48,.86,.83),bright=vec3(.97,1.,.985);
 vec3 color=mix(water,bright,pow(dome,.5)*(.68+.32*breakSections));
 float alpha=clamp(edge*(.68+.18*uWave)*vLife*vStrength*uFoam*breakSections,0.,.92);
 gl_FragColor=vec4(color*(.82+.18*uDay),alpha);
}`;

export function createBreakerLip(THREE,scene) {
  const perTrain=(LIP_ROWS+1)*(LIP_COLS+1);
  const count=perTrain*LIP_TRAINS;
  const vertices=new Float32Array(count*3);
  const uvs=new Float32Array(count*2);
  const widths=new Float32Array(count);
  const shifts=new Float32Array(count);
  const strengths=new Float32Array(count);
  const indices=[];
  for(let train=0;train<LIP_TRAINS;train++){
    for(let row=0;row<=LIP_ROWS;row++){
      const z=-HALF_DEPTH+row/LIP_ROWS*DEPTH;
      const coast=shoreline(z)-COASTAL_ZONES.seaOverlap;
      const offshoreWidth=HALF_WIDTH+.06-coast;
      for(let col=0;col<=LIP_COLS;col++){
        const local=row*(LIP_COLS+1)+col;
        const i=train*perTrain+local;
        vertices[i*3]=coast; vertices[i*3+1]=LIP_BASE_Y;vertices[i*3+2]=z;
        uvs[i*2]=col/LIP_COLS;uvs[i*2+1]=row/LIP_ROWS;
        widths[i]=offshoreWidth;
        shifts[i]=train===0?0:.56;
        strengths[i]=train===0?1:.68;
        if(row<LIP_ROWS&&col<LIP_COLS){
          const a=i,b=a+LIP_COLS+1;
          indices.push(a,b,a+1,b,b+1,a+1);
        }
      }
    }
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(vertices,3));
  geo.setAttribute('uv',new THREE.BufferAttribute(uvs,2));
  geo.setAttribute('aWaterWidth',new THREE.BufferAttribute(widths,1));
  geo.setAttribute('aPhaseShift',new THREE.BufferAttribute(shifts,1));
  geo.setAttribute('aStrength',new THREE.BufferAttribute(strengths,1));
  geo.setIndex(indices);
  const mat=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,
    uniforms:{uTime:{value:0},uWave:{value:.6},uDay:{value:1},uFoam:{value:1}},
    vertexShader:breakerLipVertexShader,
    fragmentShader:breakerLipFragmentShader
  });
  const mesh=new THREE.Mesh(geo,mat);
  mesh.frustumCulled=false;
  mesh.renderOrder=5;
  scene.add(mesh);
  function update(time,wave,day=1,foam=1){
    mat.uniforms.uTime.value=time;
    mat.uniforms.uWave.value=wave;
    mat.uniforms.uDay.value=day;
    mat.uniforms.uFoam.value=foam;
  }
  update(0,.6,1);
  return {mesh,update,vertexCount:count,
    dispose(){scene.remove(mesh);geo.dispose();mat.dispose();}};
}
