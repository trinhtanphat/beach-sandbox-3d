/** Keep undo water and sculpted terrain in the same snapshot. */
export function captureTerrainUndo(positions,water){
 if(!positions||!Number.isInteger(positions.count)||positions.count<1||
    typeof positions.getY!=='function'||!water||!Number.isInteger(water.length)||water.length<1)
   throw new RangeError('Invalid undo source');
 const heights=new Float32Array(positions.count);
 for(let i=0;i<heights.length;i++){
  const h=positions.getY(i);
  if(!Number.isFinite(h))throw new RangeError('Invalid terrain');
  heights[i]=h;
 }
 const depths=new Float32Array(water.length);
 for(let i=0;i<depths.length;i++){
  const v=water[i];
  if(!Number.isFinite(v)||v<0||v>2)throw new RangeError('Invalid water');
  depths[i]=v;
 }
 return {type:'terrain',heights,water:depths};
}
export function restoreTerrainUndo(positions,state,waterCells){
 if(!positions||!state||state.type!=='terrain'||
    !state.heights||state.heights.length!==positions.count||
    !state.water||state.water.length!==waterCells)throw new RangeError('Invalid undo');
 for(let i=0;i<state.heights.length;i++)
  if(!Number.isFinite(state.heights[i]))throw new RangeError('Invalid height');
 for(let i=0;i<state.water.length;i++)
  if(!Number.isFinite(state.water[i])||state.water[i]<0||state.water[i]>2)
   throw new RangeError('Invalid water');
 for(let i=0;i<positions.count;i++)positions.setY(i,state.heights[i]);
 return state.water;
}
