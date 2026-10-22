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
export function swashPhase(time, alongShore=0) {
  // Match exactly the beach GLSL phase so wet sand, foam and run-up stay aligned.
  const phase=time*SURF_CYCLE_RATE+.23+Math.sin(alongShore*9+.3)*.027+alongShore*.012;
  return ((phase%1)+1)%1;
}
export function runupPosition(time, alongShore = 0, strength = .6) {
  // The swash starts when the offshore breaker approaches the beach.
  const p=swashPhase(time,alongShore);
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
export function frontWarp(time,alongShore=0) {
  // Two long and one fine alongshore swell create curved, scalloped crests.
  // Used unchanged in all GPU surf passes to prevent foam/geometry separation.
  const turn=2*Math.PI*SURF_CYCLE_RATE*time;
  return .016*Math.sin(alongShore*22+turn)
       + .007*Math.sin(alongShore*49-2*turn)
       + .004*Math.sin(alongShore*94+3*turn);
}
export function breakerPosition(time, alongShore=0) {
  return .34-.33*breakerPhase(time,alongShore)+frontWarp(time,alongShore);
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
  return .34-.33*phase+.016*sin(uv.y*22.+uTime*1.44513262)
                   +.007*sin(uv.y*49.-uTime*2.89026524)
                   +.004*sin(uv.y*94.+uTime*4.33539786);
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

/**
 * Shared section-break modulation. Crest visibility, lip and airborne foam
 * use exactly the same repeating signal (including the secondary wave).
 */
export function sectionBreak(time, along=0, shift=0) {
  const turn=2*Math.PI*SURF_CYCLE_RATE*time+shift*2*Math.PI;
  const field=.5+.31*Math.sin(along*19+turn)+.19*Math.sin(along*43-2*turn);
  const u=clamp((field-.27)/.50,0,1);
  return .16+.84*ease(u);
}
/**
 * CPU analogue for the trailing wake used in the water fragment shader.
 * Breaker foam grows just behind the lip and disappears as it dissipates.
 */
export function trailingWake(distance) {
  if (!Number.isFinite(distance)) return 0;
  return ease((distance-.008)/.022) * (1-ease((distance-.100)/.085));
}
export function shorewashPulse(time,alongShore=0,shift=0) {
  const phase=breakerPhase(time,alongShore,shift);
  return ease((phase-.56)/.18)*(1-ease((phase-.84)/.16));
}
export const breakSectionGLSL = `
float breakingSections(float along,float time,float shift) {
  float turn=time*1.44513262+shift*6.2831853;
  float field=.5+.31*sin(along*19.+turn)+.19*sin(along*43.-2.*turn);
  return .16+.84*smoothstep(.27,.77,field);
}
`;
export const oceanFragmentShader = `
uniform float uTime;
uniform float uWave;
uniform float uDay;
uniform float uFoam;
varying vec2 vUv;
varying float vRise;
varying float vWash;
${breakSectionGLSL}
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
  return .34-.33*cycle+.016*sin(uv.y*22.+uTime*1.44513262)
                +.007*sin(uv.y*49.-uTime*2.89026524)
                +.004*sin(uv.y*94.+uTime*4.33539786);
}
float surfSheet(float x,float front,float n,vec2 uv) {
  // Narrow white breaking lip and a lacy, dissolving foam wake behind it.
  float d=x-front;
  float thin=exp(-pow(d/(.015+.009*uWave),2.));
  float back=smoothstep(.008,.030,d)*(1.-smoothstep(.100,.185,d));
  // Advect the foam texture shoreward (toward decreasing UV x) while
  // introducing lower-frequency turbulence along the beach.
  vec2 flow=vec2(uv.x*171.+uTime*9.,uv.y*118.-uTime*1.7);
  float cells=snoise(flow);
  float lace=snoise(flow*.48+vec2(14.2,-6.1));
  float filaments=pow(max(0.,sin((d*104.)+lace*8.+uv.y*37.)),12.);
  float bubbles=smoothstep(.36,.72,cells);
  float ribbons=smoothstep(.44,.70,lace);
  float wake=back*(.38*bubbles+.18*ribbons+.20*filaments);
  return thin*(.78+.22*smoothstep(.18,.74,n)) + wake;
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
  float foamA=surfSheet(uv.x,frontA,strand,uv)*lifeA*breakingSections(uv.y,uTime,0.);
  float foamB=surfSheet(uv.x,frontB,micro,uv)*.43*lifeB*breakingSections(uv.y,uTime,.56);
  // The trough on the seaward face of each crest adds depth to the wave;
  // foam remains on the shoreward side and dissolves into the lagoon.
  float troughA=exp(-pow((uv.x-frontA+.032)/.028,2.))*lifeA;
  float troughB=exp(-pow((uv.x-frontB+.025)/.029,2.))*lifeB;
  sea*=1.-(.105*troughA+.05*troughB)*clamp(uWave,0.,1.6);
  // Low-frequency turbulence opens irregular gaps and softens the white edge.
  float breakSection=snoise(uv*vec2(21.,83.)+vec2(uTime*.11,-uTime*.09));
  float foam=clamp((foamA+foamB)*(.66+.52*breakSection),0.,1.);
  // Do not paint a permanent white line on the coastline. Wash flares when
  // the primary/secondary fronts reach the beach, then drains between sets.
  float pulseA=smoothstep(.56,.74,cycleA)*(1.-smoothstep(.84,1.,cycleA));
  float pulseB=smoothstep(.56,.74,cycleB)*(1.-smoothstep(.84,1.,cycleB));
  float splash=clamp(pulseA+.48*pulseB,0.,1.);
  float shorewash=(1.-smoothstep(.008,.030,uv.x))*(.035+.39*splash)
                  *(.84+.16*snoise(uv*vec2(20.,61.)+uTime));
  foam=clamp((foam+shorewash)*(.46+.54*clamp(uWave/.8,0.,1.5))*uFoam,0.,1.);
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
uniform float uFoam;
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
  float laceBands=pow(max(0.,sin((vUv.x-front)*118.+lace*5.-uTime*.36)),8.);
  float softBreak=smoothstep(.31,.69,snoise(vUv*vec2(34.,116.)+vec2(uTime*.14,-uTime*.2)));
  float foamAlpha=white*(.79+.18*bubbles)+tail*(bubbles*.27+spray*.16);
  foamAlpha+=lingering*(.18+.29*bubbles)*(.40+.60*wet);
  foamAlpha+=tail*laceBands*softBreak*.12;
  // Thin clear water film after crest passage darkens sand without an opaque
  // cyan rectangle. Fade the whole film as the breaker drains.
  float wetFilm=smoothstep(front-.015,front+.09,vUv.x)
                 *(1.-smoothstep(front+.26,front+.42,vUv.x));
  float retreatFade=1.-smoothstep(.75,.99,phase);
  // Wet sand must persist even at minimum foam intensity: it is not whitewater.
  float wetAlpha=wetFilm*.21*retreatFade;
  float shoreFade=smoothstep(.008,.050,vUv.x)*(1.-smoothstep(.975,1.,vUv.x));
  foamAlpha*=uFoam*shoreFade;
  wetAlpha*=shoreFade;
  vec3 foamColor=mix(vec3(.32,.72,.69),vec3(.98,1.,.97),
                      clamp(max(white*.96,lingering*.88)+bubbles*.28,0.,1.));
  vec3 wetColor=vec3(.43,.40,.31);
  float totalAlpha=clamp(foamAlpha*(.82+.18*uWave)+wetAlpha,0.,.94);
  float whiteFraction=foamAlpha/(foamAlpha+wetAlpha+.0001);
  vec3 color=mix(wetColor,foamColor,whiteFraction);
  gl_FragColor=vec4(color*(.75+.25*uDay),totalAlpha);
}`;
