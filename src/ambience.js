/**
 * Shoreline atmosphere: one draw-call seagull flock + self-contained Web Audio.
 * No third-party media or copyrighted audio recordings.
 */
export const BIRD_COUNT = 14;
export function birdPose(time, index) {
  const id=index+1;
  const phase=time*(.16+(index%4)*.022)+id*2.399;
  return {
    x:2.2+Math.sin(phase)*3.2+Math.sin(phase*.39)*.5,
    z:-.8+Math.cos(phase*.72+id*.79)*3.4,
    y:2.15+(index%5)*.19+Math.sin(phase*1.83)*.16,
    flap:Math.sin(time*(4.4+(index%3)*.52)+id*1.7),
    scale:.13+(index%4)*.026
  };
}
export function surfBreath(time,strength=.6) {
  const energy=(Math.sin(time*1.35)+.55*Math.sin(time*2.62-.8)+1.55)/3.1;
  return Math.max(0,Math.min(1,energy))*(.65+.35*Math.max(.1,Math.min(1.6,strength))/1.6);
}
export function createSeagulls(THREE,scene) {
  const vertices=new Float32Array(BIRD_COUNT*6*3);
  const geom=new THREE.BufferGeometry();
  geom.setAttribute('position',new THREE.BufferAttribute(vertices,3).setUsage(THREE.DynamicDrawUsage));
  const mat=new THREE.MeshBasicMaterial({
    color:'#fff4dd',transparent:true,opacity:.93,side:THREE.DoubleSide,
    depthWrite:false,vertexColors:false
  });
  const flock=new THREE.Mesh(geom,mat);
  flock.frustumCulled=false;
  flock.renderOrder=9;
  scene.add(flock);
  const update=t=>{
    for(let i=0;i<BIRD_COUNT;i++){
      const b=birdPose(t,i);
      const wing=b.scale, lift=b.flap*.16;
      const start=i*18;
      // Two swept triangles form a distinctive moving gull silhouette.
      vertices.set([
        b.x,b.y,b.z,
        b.x-wing*1.6,b.y+lift,b.z-wing*.45,
        b.x-wing*.36,b.y-.018,b.z+wing*.58,
        b.x,b.y,b.z,
        b.x+wing*1.6,b.y+lift,b.z-wing*.45,
        b.x+wing*.36,b.y-.018,b.z+wing*.58
      ],start);
    }
    geom.attributes.position.needsUpdate=true;
  };
  update(0);
  return {mesh:flock,update};
}
export function createOceanAudio() {
  let context=null,noise=null,lowpass=null,whisper=null,chirpAt=0;
  let enabled=false,volume=.42;
  const AudioCtor=()=>globalThis.AudioContext||globalThis.webkitAudioContext;
  async function enable(){
    if(!AudioCtor())throw new Error('Web Audio is not supported in this browser');
    if(!context){
      context=new (AudioCtor())();
      const data=context.createBuffer(1,context.sampleRate*3,context.sampleRate);
      const channel=data.getChannelData(0);
      // Deterministic offline noise: the loop does not download samples.
      let seed=134775813;
      for(let i=0;i<channel.length;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;channel[i]=((seed>>>1)/1073741824)-1;}
      noise=context.createBufferSource();noise.buffer=data;noise.loop=true;
      lowpass=context.createBiquadFilter();lowpass.type='lowpass';lowpass.frequency.value=460;
      whisper=context.createGain();whisper.gain.value=.07;
      noise.connect(lowpass);lowpass.connect(whisper);whisper.connect(context.destination);
      noise.start();
    }
    await context.resume();
    enabled=true;
    return true;
  }
  async function disable(){enabled=false;if(context)await context.suspend();}
  async function toggle(){if(enabled){await disable();return false;}await enable();return true;}
  function setVolume(v){volume=Math.max(0,Math.min(1,Number(v)||0));}
  function chirp(){
    if(!context||context.state!=='running')return;
    const when=context.currentTime;
    const o=context.createOscillator(),g=context.createGain();
    o.type='sine';
    o.frequency.setValueAtTime(1160,when);
    o.frequency.exponentialRampToValueAtTime(1510,when+.075);
    o.frequency.exponentialRampToValueAtTime(1020,when+.23);
    g.gain.setValueAtTime(.0001,when);
    g.gain.exponentialRampToValueAtTime(.017*volume+.0001,when+.02);
    g.gain.exponentialRampToValueAtTime(.0001,when+.25);
    o.connect(g);g.connect(context.destination);o.start(when);o.stop(when+.27);
    o.onended=()=>{o.disconnect();g.disconnect();};
  }
  function update(time,strength,paused=false){
    if(!context||!enabled||!whisper||!lowpass)return;
    const pulse=surfBreath(time,strength);
    const target=paused ? .0001 : volume*(.035+pulse*.11);
    whisper.gain.setTargetAtTime(target,context.currentTime,.16);
    lowpass.frequency.setTargetAtTime(330+pulse*1000,context.currentTime,.2);
    if(!paused&&time>chirpAt){
      chirp();
      chirpAt=time+4.8+(Math.sin(time*2.15)+1)*2.7;
    }
  }
  return {enable,disable,toggle,setVolume,update,get enabled(){return enabled;}};
}
