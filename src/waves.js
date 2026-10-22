/**
 * Procedural surf: a continuous sea surface with travelling wave trains,
 * shallow-water shoaling, turbulent foam and a beach swash layer.
 *
 * All geometry and shading is generated at runtime. No external textures.
 * +time phase makes crests travel toward decreasing x (the shoreline).
 */
export function waveFront(time, alongShore = 0) {
  // 0 is the seaward edge of one swash cycle; 1 is the landward edge.
  const v = (time * .23 + alongShore * .035) % 1;
  return (v + 1) % 1;
}
export function runupPosition(time, alongShore = 0, strength = 0.6) {
  const p = waveFront(time, alongShore);
  const reach = Math.max(0.05, Math.min(1.6, strength));
  return .87 - (.30 + .23 * reach) * p;
}
export const oceanVertexShader = `
uniform float uTime;
uniform float uWave;
varying vec2 vUv;
varying vec3 vLocal;
varying float vCrest;

void main() {
  vUv = uv;
  vec3 p = position;
  // Sea ripples progressively steepen and break in the surf zone.
  float alongshore = sin(uv.y * 31.0 + sin(uv.y * 17.0) * .8);
  float phase = uv.x * 48.0 + uTime * 4.15 + alongshore * .74;
  float rolling = pow(max(0.0, sin(phase)), 5.0);
  float surf = (1.0 - smoothstep(.08, .37, uv.x)) * smoothstep(.003, .055, uv.x);
  float swell = .032 * sin(uv.x * 24.0 + uTime * 2.15 + uv.y * 11.0);
  float cross = .012 * sin(uv.x * 74.0 + uTime * 3.1 + uv.y * 47.0);
  float crest = .080 * rolling * surf;
  p.y += uWave * (swell + cross + crest);
  vCrest = rolling * surf;
  vLocal = p;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

export const oceanFragmentShader = `
uniform float uTime;
uniform float uWave;
uniform float uDay;
varying vec2 vUv;
varying vec3 vLocal;
varying float vCrest;
float hash21(vec2 p) {
  p = fract(p * vec2(123.34,345.45));
  p += dot(p,p + 34.345);
  return fract(p.x*p.y);
}
float wavelet(vec2 p) {
  return sin(p.x + sin(p.y * 1.38) * .7) * sin(p.y + sin(p.x * 1.63) * .5);
}
void main() {
  float depth = smoothstep(.0,.92,vUv.x);
  vec3 pale = vec3(.21,.79,.76);
  vec3 mid = vec3(.055,.64,.68);
  vec3 deep = vec3(.012,.32,.43);
  vec3 sea = mix(mix(pale,mid,smoothstep(.03,.42,depth)),deep,smoothstep(.27,1.0,depth));
  float caustic1 = wavelet(vUv*vec2(152.,126.) + uTime*vec2(.86,-.44));
  float caustic2 = wavelet(vUv*vec2(207.,151.) + uTime*vec2(-.57,.3));
  float light = pow(max(0.0,(caustic1+caustic2)*.5),4.0);
  sea += vec3(.29,.39,.23) * light * (.24 + .76*(1.0-depth));

  // Wave trains move from offshore to the beach, grow as they enter the
  // shallow zone, and collapse into irregular white aerated foam.
  float surf = 1.0 - smoothstep(.035,.31,vUv.x);
  float phase = vUv.x*48.0+uTime*4.15 + sin(vUv.y*31.0+sin(vUv.y*17.0)*.8)*.74;
  float breaker = pow(max(0.0,sin(phase)),9.0);
  float ribbons = pow(max(0.0,sin(vUv.x*129.0 + uTime*7.3 +
            sin(vUv.y*51.0+uTime*.45)*1.7)),13.0);
  float freckles = smoothstep(.65,.94,hash21(floor(vUv*vec2(740.,230.) +
            vec2(uTime*2.0,0.0))));
  float foam = breaker * surf * (.57 + .36*freckles) +
               ribbons * surf *.30*(.6+freckles*.4);
  foam *= .52 + uWave*.49;
  float coastWash = (1.0-smoothstep(.0,.018,vUv.x)) *
                    (.18+.19*sin(uTime*3.4+vUv.y*37.0));
  foam = clamp(foam+coastWash,0.,.88);
  sea = mix(sea,vec3(.93,.99,.92),foam);
  float sparkle = pow(max(0.,sin(vUv.x*198.+uTime*1.6) *
                     sin(vUv.y*137.-uTime*.8)),16.) * (.05+.14*depth);
  sea += vec3(.45,.55,.48)*sparkle*uDay;
  sea *= .74 + uDay*.26;
  gl_FragColor = vec4(sea, .93);
}`;

export const swashVertexShader = `
uniform float uTime;
uniform float uWave;
varying vec2 vUv;
void main() {
  vUv=uv;
  vec3 p=position;
  // Small longshore oscillation breaks up the otherwise straight wave fronts.
  p.x += .015*uWave*sin(uTime*2.4+uv.y*36.0);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
}`;
export const swashFragmentShader = `
uniform float uTime;
uniform float uWave;
uniform float uDay;
varying vec2 vUv;
float hash21(vec2 p) {
  p=fract(p*vec2(234.34,435.345));
  p+=dot(p,p+23.45);
  return fract(p.x*p.y);
}
void main() {
  // vUv.x increases offshore. Successive wave fronts run up the beach
  // and recede; the lacy foam edge follows their dynamically moving front.
  float phase=fract(uTime*.23+vUv.y*.378);
  float front=.87-(.30+.23*uWave)*phase;
  front+=.020*sin(vUv.y*76.+uTime*.7)+.012*sin(vUv.y*144.-uTime);
  float d=vUv.x-front;
  float thinEdge = exp(-pow(d/(.023+.007*uWave),2.0));
  float bubbly = sin(vUv.y*640.+sin(vUv.x*110.)*4.0+uTime*2.3);
  float grain = .52+.48*hash21(floor(vUv*vec2(225.,710.)+vec2(0.,uTime*2.)));
  float trails = (1.0-smoothstep(.015,.24,d))*smoothstep(-.025,.03,d);
  float wash = smoothstep(front-.04,front+.055,vUv.x) *
               (1.0-smoothstep(.91,1.0,vUv.x));
  float alpha = thinEdge*(.48+.27*bubbly*bubbly+.22*grain) +
                trails*grain*.12;
  // The water film behind a breaker wets the sand, then fades.
  vec3 color=mix(vec3(.27,.71,.67),vec3(.97,1.0,.91),
                 clamp(alpha*1.5,0.,1.));
  alpha=clamp(alpha*(.55+.35*uWave)+wash*.10,0.,.78);
  alpha*=smoothstep(.005,.035,vUv.x) *
         (1.0-smoothstep(.965,1.0,vUv.x));
  gl_FragColor=vec4(color*(.8+.2*uDay),alpha);
}`;
