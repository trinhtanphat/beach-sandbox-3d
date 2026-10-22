/**
 * Shoreline surf v4.
 *
 * Foam and actual wave elevation share the SAME breaker-front function.
 * Two staggered swells travel offshore -> shore; coherent curved ribbons
 * leave a dissipating aerated-water wake. The separately meshed swash
 * rises onto the dry sand and then retreats within the same cycle.
 *
 * Every shader is self contained: no licensed textures or external assets.
 */
export const SURF_CYCLE_RATE = .23;
export function waveFront(time, alongShore = 0) {
  const v = (time * SURF_CYCLE_RATE + alongShore * .035) % 1;
  return (v + 1) % 1;
}
const clamp = (x,a,b)=>Math.max(a,Math.min(b,x));
const ease = x=>{const a=clamp(x,0,1);return a*a*(3-2*a);};
export function runupPosition(time, alongShore = 0, strength = .6) {
  // Swash begins as the offshore breaker approaches land and then drains back.
  const p=waveFront(time+.23/SURF_CYCLE_RATE,alongShore);
  const run=.38+.26*clamp(strength,.1,1.6)/1.6;
  const wet=p<.65?ease(p/.65):1-ease((p-.65)/.35);
  return .84-run*wet;
}
export function breakerPhase(time, alongShore=0, shift=0) {
  const raw=time*SURF_CYCLE_RATE + Math.sin(alongShore*9+.3)*.027
    + alongShore*.012+shift;
  return ((raw%1)+1)%1;
}
export function waveEnvelope(phase) {
  // Birth at deep-water side and dissolution at shore happen invisibly.
  const p=((phase%1)+1)%1;
  const born=ease(p/.12);
  const spent=1-ease((p-.77)/.23);
  return born*spent;
}
export function breakerPosition(time, alongShore=0) {
  return .34-.33*breakerPhase(time,alongShore);
}
// All shader phases remain consistent with this deterministic JS model.
// Because y-perturbations are in GLSL, the CPU check is for the centre line.
export const oceanVertexShader = `
uniform float uTime;
uniform float uWave;
varying vec2 vUv;
varying float vRise;
varying float vWash;
float phaseAt(vec2 uv) {
  return fract(uTime * .23 + sin(uv.y*9.0+.3)*.027 + uv.y*.012);
}
float frontAt(vec2 uv, float phaseShift) {
  float phase=fract(phaseAt(uv)+phaseShift);
  return .34-.33*phase+.005*sin(uv.y*64.0+uTime*.60)
                   +.004*sin(uv.y*151.0-uTime*.47);
}
void main() {
  vUv = uv;
  vec3 p = position;
  float frontA=frontAt(uv,0.);
  float frontB=frontAt(uv,.56);
  float width=.019+.011*clamp(uWave/1.6,0.,1.);
  float crestA=exp(-pow((uv.x-frontA)/width,2.));
  float crestB=exp(-pow((uv.x-frontB)/(width*.84),2.));
  float lifeA=smoothstep(0.,.12,phaseAt(uv))*(1.-smoothstep(.77,1.,phaseAt(uv)));
  float lifeB=smoothstep(0.,.12,fract(phaseAt(uv)+.56))*(1.-smoothstep(.77,1.,fract(phaseAt(uv)+.56)));
  crestA*=lifeA;
  crestB*=lifeB;
  float offshore=(smoothstep(.08,.45,uv.x));
  float swell=sin(uv.x*27.0+uTime*2.3+uv.y*8.0)*.025
             +sin(uv.x*62.0+uTime*3.6-uv.y*22.0)*.007;
  float shoaling=.020+(.065*(1.0-smoothstep(.12,.6,uv.x)));
  p.y+=uWave*(swell+shoaling*(crestA*.90+crestB*.64));
  vRise=clamp(crestA*.95+crestB*.73,0.,1.);
  vWash=clamp(crestA+crestB*.7,0.,1.);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
}`;

export const oceanFragmentShader = `
uniform float uTime;
uniform float uWave;
uniform float uDay;
varying vec2 vUv;
varying float vRise;
varying float vWash;
float hash21(vec2 p) {
  p=fract(p*vec2(123.34,345.45));
  p+=dot(p,p+34.345);
  return fract(p.x*p.y);
}
float snoise(vec2 p){
  vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  float a=hash21(i),b=hash21(i+vec2(1.,0.));
  float c=hash21(i+vec2(0.,1.)),d=hash21(i+vec2(1.,1.));
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}
float frontAt(vec2 uv,float shift){
  float cycle=fract(uTime*.23+sin(uv.y*9.0+.3)*.027+uv.y*.012+shift);
  return .34-.33*cycle+.005*sin(uv.y*64.+uTime*.60)
                +.004*sin(uv.y*151.-uTime*.47);
}
float surfSheet(float x,float front,float n) {
  float thin=exp(-pow((x-front)/(.018+.009*uWave),2.));
  // Turbulent, lacy spray trails BEHIND the inward-moving break.
  float back=smoothstep(front+.008,front+.030,x)
             *(1.-smoothstep(front+.090,front+.170,x));
  float bubbles=smoothstep(.27,.77,n);
  float filament=pow(max(0.,sin(x*126.0+uTime*1.6+n*5.0)),10.0);
  return thin*(.93+.07*n)+back*(bubbles*.30+filament*.12);
}
void main(){
  vec2 uv=vUv;
  float d=smoothstep(.0,.94,uv.x);
  vec3 lagoon=vec3(.19,.84,.78);
  vec3 turquoise=vec3(.036,.64,.68);
  vec3 abyss=vec3(.01,.29,.45);
  vec3 sea=mix(lagoon,turquoise,smoothstep(.065,.48,d));
  sea=mix(sea,abyss,smoothstep(.36,1.0,d));
  // Refraction and sunlit cellular caustics, concentrated over pale sand.
  float c1=snoise(uv*vec2(154.,105.)+vec2(uTime*.6,-uTime*.4));
  float c2=snoise(uv*vec2(229.,181.)-vec2(uTime*.42,-uTime*.61));
  float caustic=pow(clamp(1.-abs(c1-c2)*3.0,0.,1.),5.0);
  sea+=vec3(.055,.12,.09)*caustic*(1.-smoothstep(.23,.81,d));
  float reef=snoise(uv*vec2(22.,37.));
  sea=mix(sea,vec3(.035,.40,.37),smoothstep(.73,.93,reef)*.25*d);
  // Whitewater sheets follow the displaced wave crests, not unrelated sine stripes.
  float strand=snoise(uv*vec2(157.,57.)+vec2(-uTime*.23,uTime*.31));
  float micro=snoise(uv*vec2(405.,165.)+vec2(uTime*.34,0.));
  float frontA=frontAt(uv,0.0);
  float frontB=frontAt(uv,.56);
  float cycleA=fract(uTime*.23+sin(uv.y*9.+.3)*.027+uv.y*.012);
  float cycleB=fract(cycleA+.56);
  float lifeA=smoothstep(0.,.12,cycleA)*(1.-smoothstep(.77,1.,cycleA));
  float lifeB=smoothstep(0.,.12,cycleB)*(1.-smoothstep(.77,1.,cycleB));
  float foamA=surfSheet(uv.x,frontA,strand)*lifeA;
  float foamB=surfSheet(uv.x,frontB,micro)*.43*lifeB;
  float foam=clamp(foamA+foamB,0.,1.);
  float shorewash=(1.-smoothstep(.008,.030,uv.x))*(.25+.10*snoise(uv*vec2(20.,61.)+uTime));
  foam=clamp((foam+shorewash)*(.46+.54*clamp(uWave/.8,0.,1.5)),0.,1.);
  sea=mix(sea,vec3(.97,1.,.99),foam*.98);
  float spec=pow(max(0.,sin(uv.x*195.+uTime*1.8)*sin(uv.y*220.-uTime)),24.);
  sea+=vec3(.26,.30,.21)*spec*uDay*(1.-foam);
  sea*=.74+.26*uDay;
  gl_FragColor=vec4(sea,.91);
}`;

export const swashVertexShader = `
uniform float uTime;
uniform float uWave;
varying vec2 vUv;
void main(){
  vUv=uv;
  vec3 p=position;
  p.x+=.010*sin(uv.y*42.+uTime*.48);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
}`;
export const swashFragmentShader = `
uniform float uTime;
uniform float uWave;
uniform float uDay;
varying vec2 vUv;
float hash21(vec2 p){
  p=fract(p*vec2(234.34,435.345));
  p+=dot(p,p+23.45);
  return fract(p.x*p.y);
}
float snoise(vec2 p){
  vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash21(i),hash21(i+vec2(1.,0.)),f.x),
             mix(hash21(i+vec2(0.,1.)),hash21(i+vec2(1.,1.)),f.x),f.y);
}
void main(){
  // The swash's advance starts when the offshore crest enters shallow water.
  float phase=fract(uTime*.23+.23+sin(vUv.y*9.+.3)*.027+vUv.y*.012);
  float strength=clamp(uWave/1.6,0.,1.);
  float run=.38+.26*strength;
  float attack=clamp(phase/.65,0.,1.);
  attack=attack*attack*(3.-2.*attack);
  float retreat=clamp((phase-.65)/.35,0.,1.);
  retreat=retreat*retreat*(3.-2.*retreat);
  float wet=phase<.65?attack:1.-retreat;
  float front=.84-run*wet;
  float lace=snoise(vUv*vec2(11.,80.)+vec2(uTime*.21,-uTime*.19));
  front+=.017*(lace-.5)+.008*sin(vUv.y*119.+uTime*.45);
  float d=vUv.x-front;
  // Foam is thick at the advancing front and breaks into lace behind it.
  float white=exp(-pow(d/(.028+.011*uWave),2.));
  float tail=smoothstep(.006,.028,d)*(1.-smoothstep(.16,.28,d));
  float bubbles=smoothstep(.39,.77,snoise(vUv*vec2(110.,153.)+uTime*.24));
  float spray=smoothstep(.62,.9,snoise(vUv*vec2(240.,319.)-uTime*.44));
  float trailingFront=front+.115+.012*sin(vUv.y*49.+uTime*.7);
  float lingering=exp(-pow((vUv.x-trailingFront)/.025,2.));
  float alpha=white*(.81+.17*bubbles)+tail*(bubbles*.28+spray*.18);
  alpha+=lingering*(.18+.29*bubbles)*(.40+.60*wet);
  // Thin clear water film after crest passage darkens sand without an opaque
  // cyan rectangle. Fade the whole film as the breaker drains.
  float wetFilm=smoothstep(front-.015,front+.09,vUv.x)
                 *(1.-smoothstep(front+.26,front+.42,vUv.x));
  float retreatFade=1.-smoothstep(.75,.99,phase);
  alpha+=wetFilm*.15*retreatFade;
  alpha*=smoothstep(.008,.050,vUv.x)*(1.-smoothstep(.975,1.,vUv.x));
  vec3 foamColor=mix(vec3(.32,.72,.69),vec3(.98,1.,.97),
                      clamp(max(white*.96,lingering*.88)+bubbles*.28,0.,1.));
  gl_FragColor=vec4(foamColor*(.75+.25*uDay),clamp(alpha*(.82+.18*uWave),0.,.94));
}`;
