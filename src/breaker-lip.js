/**
 * Geometry-backed curling breaker lip. Unlike a white color stripe this is an
 * actual raised 3D foam sheet rolling along the curved coastline. It shares
 * shoreline coordinates and the same wave-front phase as the water shader.
 * One mesh/draw-call; no external textures.
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

export function createBreakerLip(THREE,scene) {
  const count=(LIP_ROWS+1)*(LIP_COLS+1);
  const vertices=new Float32Array(count*3),uvs=new Float32Array(count*2);
  const indices=[];
  for(let row=0;row<=LIP_ROWS;row++){
    for(let col=0;col<=LIP_COLS;col++){
      const i=row*(LIP_COLS+1)+col;
      uvs[i*2]=col/LIP_COLS;
      uvs[i*2+1]=row/LIP_ROWS;
      if(row<LIP_ROWS&&col<LIP_COLS){
        const a=i,b=a+LIP_COLS+1;
        indices.push(a,b,a+1,b,b+1,a+1);
      }
    }
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(vertices,3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('uv',new THREE.BufferAttribute(uvs,2));
  geo.setIndex(indices);
  const mat=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,
    uniforms:{uTime:{value:0},uWave:{value:.6},uDay:{value:1}},
    vertexShader:`
      varying vec2 vUv;
      void main(){
        vUv=uv;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
      }`,
    fragmentShader:`
      uniform float uTime;uniform float uWave;uniform float uDay;
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
        vec3 water=vec3(.48,.86,.83);
        vec3 bright=vec3(.96,1.,.985);
        vec3 color=mix(water,bright,pow(dome,.45));
        float alpha=clamp(edge*(.66+.19*uWave)*shoreFade,0.,.87);
        gl_FragColor=vec4(color*(.82+.18*uDay),alpha);
      }`
  });
  const mesh=new THREE.Mesh(geo,mat);
  mesh.frustumCulled=false;
  mesh.renderOrder=5;
  scene.add(mesh);
  function update(time,wave,day=1){
    mat.uniforms.uTime.value=time;
    mat.uniforms.uWave.value=wave;
    mat.uniforms.uDay.value=day;
    for(let row=0;row<=LIP_ROWS;row++){
      const z=-HALF_DEPTH+row/LIP_ROWS*DEPTH;
      for(let col=0;col<=LIP_COLS;col++){
        const i=(row*(LIP_COLS+1)+col)*3;
        const p=lipSample(time,z,col/LIP_COLS,wave);
        vertices[i]=p.x;vertices[i+1]=p.y;vertices[i+2]=z;
      }
    }
    geo.attributes.position.needsUpdate=true;
  }
  update(0,.6,1);
  return {mesh,update,vertexCount:count,dispose(){scene.remove(mesh);geo.dispose();mat.dispose();}};
}
