/**
 * Geometry-backed curling breaker lip. Unlike a white color stripe this is an
 * actual raised 3D foam sheet rolling along the curved coastline. It shares
 * shoreline coordinates and the same wave-front phase as the water shader.
 * One mesh/draw-call; no external textures.
 */
import { DEPTH, HALF_DEPTH, HALF_WIDTH, shoreline, clamp } from './simulation.js';
import { breakerPosition } from './waves.js';

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
  const span=.10+.075*amp;
  const rise=Math.pow(Math.max(0,Math.sin(Math.PI*across)),1.75);
  const irregular=.78+.22*Math.sin(v*47+time*.89)*Math.sin(v*19-time*.4);
  const x=coast+offshoreWidth*phase+(across-.5)*span-.037*rise*amp;
  const y=LIP_BASE_Y+.020*amp+(.24*rise*irregular)*amp;
  return {x,y,z,phase,foam:rise};
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
      void main(){
        float across=vUv.x;
        float dome=pow(max(0.,sin(3.14159265*across)),.8);
        float lace=hash(floor(vUv*vec2(15.,270.)+vec2(uTime*.9,uTime*.25)));
        float edge=clamp(dome*(.72+.20*lace),0.,1.);
        float shoreFade=smoothstep(.015,.075,
            fract(uTime*.23+sin(vUv.y*9.+.3)*.027+vUv.y*.012));
        vec3 water=vec3(.48,.86,.83);
        vec3 bright=vec3(.96,1.,.985);
        vec3 color=mix(water,bright,pow(dome,.45));
        float alpha=clamp(edge*(.73+.20*uWave)*(.36+.64*shoreFade),0.,.92);
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
