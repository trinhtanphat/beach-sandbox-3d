import {WIDTH,DEPTH,landDistance,forestWeight,noise,seededRandom,terrainHeight} from './simulation.js';
import {lagoonProfile} from './lagoon-physics.js';

export const FOREST_COUNT=255;
export const SEA_LEVEL=.104;
export const COASTAL_ZONES=Object.freeze({
  seaOverlap:.10,
  swashInland:1.35,
  swashSeaward:.80,
  plantMinLand:1.05,
  forestMinLand:2.10,
  boatMinOffshore:.45,
  reefMinOffshore:1.90
});

/** Deterministic dispersed groves with a continuous sand-to-forest transition. */
export function planForest({count=FOREST_COUNT,seed=20261021,spacing=.39}={}){
  if(!Number.isInteger(count)||count<0||count>1800||spacing<=0)throw new RangeError('Invalid forest settings');
  const random=seededRandom(seed),trees=[],occupied=new Map();
  const key=(i,j)=>i+':'+j;
  const cell=v=>Math.floor(v/spacing);
  const attempts=Math.max(300,count*1200);
  for(let attempt=0;attempt<attempts&&trees.length<count;attempt++){
    const z=(random()-.5)*(DEPTH-.75);
    const x=-WIDTH/2+.30+random()*(WIDTH*.50);
    const d=landDistance(x,z);
    if(d<COASTAL_ZONES.forestMinLand||d>9.5||terrainHeight(x,z)<SEA_LEVEL+.035)continue;
    const woodland=forestWeight(x,z);
    const mosaic=.53+.26*noise(x*.39,z*.54)+.15*Math.sin(x*.77+z*.36);
    if(random()>Math.min(.91,Math.max(.12,.22+woodland*.58+mosaic*.13)))continue;
    const gx=cell(x),gz=cell(z);
    let blocked=false;
    for(let dx=-1;dx<=1&&!blocked;dx++)for(let dz=-1;dz<=1&&!blocked;dz++){
      const others=occupied.get(key(gx+dx,gz+dz))||[];
      for(const existing of others)if((existing.x-x)**2+(existing.z-z)**2<spacing**2){blocked=true;break;}
    }
    if(blocked)continue;
    const scale=.46+random()*.48;
    const item={x,z,scale};
    trees.push(item);
    const id=key(gx,gz);if(!occupied.has(id))occupied.set(id,[]);
    occupied.get(id).push(item);
  }
  if(trees.length!==count)throw new Error('Insufficient forest planting space: '+trees.length+'/'+count);
  return trees;
}

/** Coral and rocks should be beneath the water surface, not white stones floating on top. */
export function submergedCenter(floor,verticalExtent,waterLevel=SEA_LEVEL){
  if(![floor,verticalExtent,waterLevel].every(Number.isFinite)||verticalExtent<0)throw new RangeError('Invalid seabed placement');
  return Math.min(floor+.04,waterLevel-.055-verticalExtent);
}

/** Consistent biome rules for interactive placement as well as natural scatter. */
export function canPlace(kind,x,z,groundY=null){
  if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>WIDTH/2-.2||Math.abs(z)>DEPTH/2-.2)return false;
  if(groundY===null)groundY=terrainHeight(x,z);
  if(!Number.isFinite(groundY))return false;
  const d=landDistance(x,z);
  if(kind==='tree')return d>=COASTAL_ZONES.plantMinLand&&groundY>SEA_LEVEL+.035; // dry roots
  if(kind==='boat')return groundY<SEA_LEVEL-.045&&
    (d<=-COASTAL_ZONES.boatMinOffshore||lagoonProfile(x,z).wetland>.43);
  if(kind==='rock')return true; // reef rock underwater or beach rock on land
  return false;
}
