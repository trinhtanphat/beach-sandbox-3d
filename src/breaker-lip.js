/**
 * GPU-backed foam crest mesh: coastline is sampled only once on creation.
 * Continuous wave motion now happens in the vertex shader instead of
 * rewriting ~2,010 vertex coordinates in JavaScript every frame.
 */
import { DEPTH, HALF_DEPTH, HALF_WIDTH, shoreline, clamp } from './simulation.js';
import { breakerPosition, breakerPhase, waveEnvelope } from './waves.js';

export const LIP_ROWS = 200;
export const LIP_COLS = 9;
export const LIP_BASE_Y = .104;

export function lipSample(time,z,across=.5,wave=.6) {
  const v=(z+HALF_DEPTH)/DEPTH;
  const coast=shoreline(z)-.1;
  const offshoreWidth=HALF_WIDTH+.06-coast;
  const phase=breakerPosition(time,v)
    +.005*Math.sin(v*64+time*.6)+.004*Math.sin(v*151-time*.47);
  const amp=clamp(wave,.1,1.6);
  const life=waveEnvelope(breakerPhase(time,v));
  const span=.10+.075*amp;
  const rise=Math.pow(Math.max(0,Math.sin(Math.PI*across)),1.75);
  const irregular=.78+.22*Math.sin(v*47+time*.89)*Math.sin(v*19-time*.4);
  const x=coast+offshoreWidth*phase+(across-.5)*span-.037*rise*amp;
  const y=LIP_BASE_Y+(.018+(.20*rise*irregular))*amp*life;
  return {x,y,z,phase,foam:rise*life,life};
}

export const breakerLipVertexShader = `
uniform float uTime;
uniform float uWave;
attribute float aWaterWidth;
varying vec2 vUv;
void main(){
  vUv=uv;
  float v=uv.y;
  float cycle=fract(uTime*.23+sin(v*9.+.3)*.027+v*.012);
  float front=.34-.33*cycle
      +.005*sin(v*64.+uTime*.6)+.004*sin(v*151.-uTime*.47);
  float life=smoothstep(0.,.12,cycle)*(1.-smoothstep(.77,1.,cycle));
  float wave=clamp(uWave,.1,1.6);
  float across=uv.x;
  float span=.10+.075*wave;
  float rise=pow(max(0.,sin(3.14159265*across)),1.75);
  float irregular=.78+.22*sin(v*47.+uTime*.89)*sin(v*19.-uTime*.4);
  vec3 p=position;
  p.x+=aWaterWidth*front+(across-.5)*span-.037*rise*wave;
  p.y=.104+(.018+(.20*rise*irregular))*wave*life;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
}`;

export const breakerLipFragmentShader = `
uniform float uTime;
uniform float uWave;
uniform float uDay;
varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise2(vec2 p){
 vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),
            mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);
}
void main(){
 float across=vUv.x;
 float dome=pow(max(0.,sin(3.14159265*across)),.8);
 float lace=noise2(vUv*vec2(9.,98.)+vec2(uTime*.21,uTime*.15));
 float smaller=noise2(vUv*vec2(18.,175.)+vec2(-uTime*.25,uTime*.29));
 float edge=clamp(dome*(.64+.26*lace+.10*smaller),0.,1.);
 float phase=fract(uTime*.23+sin(vUv.y*9.+.3)*.027+vUv.y*.012);
 float fadeIn=smoothstep(0.,.12,phase);
 float fadeOut=1.-smoothstep(.77,1.,phase);
 float shoreFade=fadeIn*fadeOut;
 vec3 water=vec3(.48,.86,.83),bright=vec3(.96,1.,.985);
 vec3 color=mix(water,bright,pow(dome,.45));
 float alpha=clamp(edge*(.66+.19*uWave)*shoreFade,0.,.87);
 gl_FragColor=vec4(color*(.82+.18*uDay),alpha);
}`;

export function createBreakerLip(THREE,scene) {
  const count=(LIP_ROWS+1)*(LIP_COLS+1);
  const vertices=new Float32Array(count*3);
  const uvs=new Float32Array(count*2);
  const widths=new Float32Array(count);
  const indices=[];
  for(let row=0;row<=LIP_ROWS;row++){
    const z=-HALF_DEPTH+row/LIP_ROWS*DEPTH;
    const coast=shoreline(z)-.1;
    const offshoreWidth=HALF_WIDTH+.06-coast;
    for(let col=0;col<=LIP_COLS;col++){
      const i=row*(LIP_COLS+1)+col;
      vertices[i*3]=coast;
      vertices[i*3+1]=LIP_BASE_Y;
      vertices[i*3+2]=z;
      uvs[i*2]=col/LIP_COLS;
      uvs[i*2+1]=row/LIP_ROWS;
      widths[i]=offshoreWidth;
      if(row<LIP_ROWS&&col<LIP_COLS){
        const a=i,b=a+LIP_COLS+1;
        indices.push(a,b,a+1,b,b+1,a+1);
      }
    }
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(vertices,3));
  geo.setAttribute('uv',new THREE.BufferAttribute(uvs,2));
  geo.setAttribute('aWaterWidth',new THREE.BufferAttribute(widths,1));
  geo.setIndex(indices);
  const mat=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,
    uniforms:{uTime:{value:0},uWave:{value:.6},uDay:{value:1}},
    vertexShader:breakerLipVertexShader,
    fragmentShader:breakerLipFragmentShader
  });
  const mesh=new THREE.Mesh(geo,mat);
  mesh.frustumCulled=false; // animated offset extends beyond the rest bounding box
  mesh.renderOrder=5;
  scene.add(mesh);
  function update(time,wave,day=1){
    mat.uniforms.uTime.value=time;
    mat.uniforms.uWave.value=wave;
    mat.uniforms.uDay.value=day;
  }
  update(0,.6,1);
  return {mesh,update,vertexCount:count,
    dispose(){scene.remove(mesh);geo.dispose();mat.dispose();}};
}
