import {connectedSeaMask,LAGOON_SEA_LEVEL} from './lagoon-physics.js';

/**
 * Bounded explicit, finite-volume diffusive-wave coastal flow.
 * Conserves the amount in non-reservoir cells (apart from exchanges with a
 * constant-height open-ocean reservoir). No inertial/Navier-Stokes claims.
 * Positive flux uses the hydraulic head above the face's higher bottom.
 */
export function createCoastalFlow({columns,rows,heights,reservoir,dx,dz,
 seaLevel=LAGOON_SEA_LEVEL,conductance=1.65,gravity=4.8}){
 const count=columns*rows;
 if(!Number.isInteger(columns)||columns<2||!Number.isInteger(rows)||rows<2||
   !heights||heights.length!==count||!reservoir||reservoir.length!==count||
   ![dx,dz,seaLevel,conductance,gravity].every(Number.isFinite)||
   dx<=0||dz<=0||conductance<=0||gravity<=0)
   throw new RangeError('Invalid coastal flow grid');
 const bed=Float32Array.from(heights);
 if(!bed.every(Number.isFinite))throw new RangeError('Non-finite coastal floor');
 const source=Uint8Array.from(reservoir);
 if(!source.some(Boolean))throw new RangeError('No open-ocean reservoir');
 const depth=new Float32Array(count);
 const wet=new Uint8Array(count);
 const cellArea=dx*dz;
 const outgoing=new Float64Array(count),change=new Float64Array(count);
 const edgeFrom=new Int32Array(count*2),edgeTo=new Int32Array(count*2);
 const edgeVolume=new Float64Array(count*2);
 const maxDt=.06;
 let elapsed=0;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function equilibrate(){
  // Connected low areas are full on first load. Later trench excavation
  // never teleports water: advance() must deliver the new water volume.
  const mask=connectedSeaMask(bed,columns,rows,seaLevel).connected;
  for(let i=0;i<count;i++)depth[i]=mask[i]?Math.max(0,seaLevel-bed[i]):0;
  enforceOcean();
  updateWet();
 }
 function enforceOcean(){
  for(let i=0;i<count;i++)if(source[i])depth[i]=Math.max(0,seaLevel-bed[i]);
 }
 function updateWet(){
  for(let i=0;i<count;i++)wet[i]=depth[i]>.003?1:0;
 }
 function setTerrain(heights,{reset=false}={}){
  if(!heights||heights.length!==count)throw new RangeError('Invalid terrain size');
  for(let i=0;i<count;i++)if(!Number.isFinite(heights[i]))throw new RangeError('Non-finite terrain');
  // Digging lowers the bottom without inventing water. Building sand
  // raises the bottom while conserving the water column's volume; its newly
  // elevated free surface drives flux to neighbours on subsequent steps.
  // Never delete pond volume merely because the terrain underneath rose.
  bed.set(heights);
  if(reset){elapsed=0;equilibrate();}
  else {enforceOcean();updateWet();}
 }
 function pair(i,j,faceWidth,edgeCount){
  const iSurface=bed[i]+depth[i],jSurface=bed[j]+depth[j];
  const headDiff=iSurface-jSurface;
  if(Math.abs(headDiff)<1e-6)return edgeCount;
  const from=headDiff>0?i:j,to=headDiff>0?j:i;
  const sill=Math.max(bed[i],bed[j]),head=bed[from]+depth[from]-sill;
  if(head<=.001||depth[from]<=.0001)return edgeCount;
  const hydraulicDepth=Math.min(depth[from],head);
  // Face-based volume transfer; flow in a shallow connecting trench is
  // throttled by its wetted depth rather than jumping the far basin up.
  const rawVolume=conductance*faceWidth*hydraulicDepth*
    Math.sqrt(2*gravity*Math.abs(headDiff))*maxDt;
  // A numerical CFL bound is essential: the original pressure formula could
  // move more water across a face than the head difference permits, even in a
  // perfectly level lake. Repeated overshoots drained the lagoon and produced
  // tall artificial sheets of water. Each cell has <= four faces; limiting
  // face exchange to 16% of its head-difference volume prevents overshoot.
  const headLimitedVolume=.16*Math.abs(headDiff)*cellArea;
  const volume=Math.min(rawVolume,headLimitedVolume);
  if(volume<=0)return edgeCount;
  edgeFrom[edgeCount]=from;edgeTo[edgeCount]=to;
  edgeVolume[edgeCount]=volume;
  if(!source[from])outgoing[from]+=volume;
  return edgeCount+1;
 }
 function singleStep(){
  enforceOcean();
  outgoing.fill(0);change.fill(0);
  let edges=0;
  for(let row=0;row<rows;row++){
   const offset=row*columns;
   for(let col=0;col<columns;col++){
    const a=offset+col;
    if(col<columns-1)edges=pair(a,a+1,dz,edges);
    if(row<rows-1)edges=pair(a,a+columns,dx,edges);
   }
  }
  for(let k=0;k<edges;k++){
   const from=edgeFrom[k],to=edgeTo[k];
   const desired=edgeVolume[k];
   const available=Math.max(0,depth[from])*cellArea;
   const fraction=source[from]?1:Math.min(1,available/(outgoing[from]||1));
   const volume=desired*fraction;
   if(!source[from])change[from]-=volume/cellArea;
   if(!source[to])change[to]+=volume/cellArea;
  }
  for(let i=0;i<count;i++)if(!source[i])
   depth[i]=Math.max(0,depth[i]+change[i]);
  enforceOcean();
  updateWet();
 }
 function advance(dt){
  if(!Number.isFinite(dt)||dt<0)throw new RangeError('Invalid flow delta');
  elapsed=Math.min(.5,elapsed+dt);
  let steps=0;
  while(elapsed>=maxDt&&steps<8){singleStep();elapsed-=maxDt;steps++;}
  return steps;
 }
 function snapshot(){
  return {bed:Float32Array.from(bed),depth:Float32Array.from(depth),wet:Uint8Array.from(wet)};
 }
 function totalVolume({includeReservoir=false}={}){
  let v=0;
  for(let i=0;i<count;i++)if(includeReservoir||!source[i])v+=depth[i]*cellArea;
  return v;
 }
 equilibrate();
 return {depth,wet,bed,source,dx,dz,cellArea,advance,setTerrain,snapshot,totalVolume,
  // Reports local water surface, allowing partial basin filling.
  surfaceAt(index){return bed[index]+depth[index];}
 };
}
