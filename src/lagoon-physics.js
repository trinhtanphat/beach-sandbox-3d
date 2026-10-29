/**
 * Coastal lagoon v25: deterministic shallow-water geomorphology.
 * The inlet is a real excavation of the terrain mesh (not a painted hole).
 * Values are artistic metres; not a mass-conserving CFD simulation.
 */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ease=t=>{const q=clamp(t,0,1);return q*q*(3-2*q)};
const fall=(value,inner,outer)=>1-ease((value-inner)/(outer-inner));
export const LAGOON_CENTER=Object.freeze({x:-3.25,z:.55});
export const LAGOON_LIMITS=Object.freeze({minX:-6.1,maxX:1.45,minZ:-2.9,maxZ:3.1});
export const LAGOON_SEA_LEVEL=.104;

export function lagoonProfile(x,z){
 const basin=fall(Math.hypot((x-LAGOON_CENTER.x)/1.85,(z-LAGOON_CENTER.z)/1.48),.32,1.2);
 const axis=.55+.14*Math.sin((x+1.7)*1.25);
 const channel=fall(Math.abs(z-axis),.14,.52)
             *ease((x+2.5)/.9)*(1-ease((x-1)/.55));
 return {basin,channel,wetland:Math.max(basin,channel)};
}
export function excavateLagoon(x,z,baseHeight){
 if(!Number.isFinite(baseHeight))throw new RangeError('Invalid terrain elevation');
 const {basin,channel}=lagoonProfile(x,z);
 if(basin===0&&channel===0)return baseHeight; // Never flatten the deep-water seabed.
 return Math.max(-.258,baseHeight-.40*basin-.32*channel*(1-.7*basin));
}
export function lagoonWaterDepth(terrainY,seaLevel=LAGOON_SEA_LEVEL){
 return Math.max(0,seaLevel-terrainY);
}
export function lagoonWetness(terrainY,seaLevel=LAGOON_SEA_LEVEL){
 return ease((seaLevel-terrainY+.004)/.075);
}
/**
 * A low spot only floods if a continuous 4-connected submerged route reaches
 * the seaward edge. Diagonal contacts cannot leak through a one-cell sand dam.
 * Heights use the terrain mesh's sampled physical elevations, not colors.
 */
export function connectedSeaMask(heights,columns,rows,seaLevel=LAGOON_SEA_LEVEL){
 if(!Number.isInteger(columns)||columns<2||!Number.isInteger(rows)||rows<2||
    !heights||heights.length!==columns*rows||!Number.isFinite(seaLevel))
   throw new RangeError('Invalid coastal water grid');
 const size=columns*rows,connected=new Uint8Array(size),queue=new Int32Array(size);
 const wet=k=>Number.isFinite(heights[k])&&heights[k]<seaLevel-.004;
 let tail=0;
 // The right-hand grid edge overlaps the known open ocean.
 for(let row=0;row<rows;row++){
  const idx=row*columns+columns-1;
  if(wet(idx)){connected[idx]=1;queue[tail++]=idx;}
 }
 for(let head=0;head<tail;head++){
  const at=queue[head],x=at%columns,y=(at-x)/columns;
  const neighbors=[x>0?at-1:-1,x<columns-1?at+1:-1,y>0?at-columns:-1,y<rows-1?at+columns:-1];
  for(const next of neighbors){
   if(next>=0&&!connected[next]&&wet(next)){
    connected[next]=1;queue[tail++]=next;
   }
  }
 }
 return {connected,count:tail};
}

export function lagoonWaterMotion(x,z,time,wave=1){
 // Shore-friction attenuates swell inside the sheltered basin.
 const {basin,channel}=lagoonProfile(x,z);
 const sheltered=clamp(.22+.30*channel-.10*basin,.09,.55);
 const t=time*.8;
 return {height:(Math.sin(t*1.7+x*2.2+z*.8)*.006
          +Math.sin(t*1.03-z*2.4)*.003)*sheltered*clamp(wave,.1,1.6),
         // Oscillating tidal exchange, fading to zero at the closed-end bank.
         vx:Math.sin(time*.22)*.016*channel,
         vz:Math.cos(time*.22)*.006*channel};
}
