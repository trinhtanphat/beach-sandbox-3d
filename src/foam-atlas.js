/**
 * Four deterministic, organic bubble clusters in a 2 x 2 atlas.
 * 32 px per variant, 64 x 64 RGBA8, no network image dependency.
 * A transparent gutter is maintained around every tile for linear filtering.
 */
export const FOAM_ATLAS_TILE=32;
export const FOAM_VARIANTS=4;

const clusterShapes=[
  [[-.31,-.06,.44,1.0],[.21,.20,.36,.88],[.26,-.33,.29,.60]],
  [[-.36,.18,.36,.84],[-.06,-.19,.33,1.0],[.35,-.07,.37,.72]],
  [[-.21,-.28,.34,.85],[-.14,.26,.30,.76],[.30,.11,.40,.94]],
  [[-.34,-.16,.33,.80],[.10,-.34,.32,.79],[.32,.23,.28,.70],[-.23,.35,.24,.55]]
];
const clamp=x=>Math.max(0,Math.min(1,x));
export function createOrganicFoamAtlas(){
  const tile=FOAM_ATLAS_TILE,size=tile*2;
  const pixels=new Uint8Array(size*size*4);
  for(let variant=0;variant<FOAM_VARIANTS;variant++){
    const ox=variant%2*tile,oy=Math.floor(variant/2)*tile;
    for(let y=0;y<tile;y++)for(let x=0;x<tile;x++){
      const nx=((x+.5)/tile-.5)*2;
      const ny=((y+.5)/tile-.5)*2;
      let density=0;
      for(const [cx,cy,r,weight] of clusterShapes[variant]){
        const r2=((nx-cx)**2+(ny-cy)**2)/(r*r);
        density+=weight*Math.exp(-2.3*r2);
      }
      // Sculpt irregular edges and tiny holes instead of repeating discs.
      const breakup=.83+.15*Math.sin(nx*11+variant*1.4)*Math.sin(ny*9-variant*2.1);
      const edge=Math.min(1,(1-Math.abs(nx))*8,(1-Math.abs(ny))*8);
      const alpha=clamp((density*breakup-.10)*1.55)*clamp(edge);
      const index=((oy+y)*size+ox+x)*4;
      pixels[index]=245;
      pixels[index+1]=253;
      pixels[index+2]=247;
      pixels[index+3]=Math.round(alpha*245);
    }
  }
  return {size,pixels,variants:FOAM_VARIANTS,tile};
}
