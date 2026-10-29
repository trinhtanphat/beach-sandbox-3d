import {LAGOON_SEA_LEVEL} from './lagoon-physics.js';

/**
 * Spatially sampled, fixed-level inland water footprint.
 * Surface area and below-water capacity are in scene units, NOT physical m²/m³.
 */
export function floodedInlandMetrics(heights,seaMask,columns,rows,bounds,shoreline,seaLevel=LAGOON_SEA_LEVEL){
 if(!Number.isInteger(columns)||columns<2||!Number.isInteger(rows)||rows<2||
   !heights||!seaMask||heights.length!==columns*rows||seaMask.length!==columns*rows||
   ![bounds.minX,bounds.maxX,bounds.minZ,bounds.maxZ,seaLevel].every(Number.isFinite)||
   bounds.maxX<=bounds.minX||bounds.maxZ<=bounds.minZ||typeof shoreline!=='function')
   throw new RangeError('Invalid flooded area grid');
 const dx=(bounds.maxX-bounds.minX)/(columns-1),dz=(bounds.maxZ-bounds.minZ)/(rows-1);
 let floodedCells=0,depthSum=0;
 for(let zIndex=0;zIndex<rows;zIndex++){
  const z=bounds.minZ+zIndex*dz,shore=shoreline(z);
  for(let xIndex=0;xIndex<columns;xIndex++){
   const i=zIndex*columns+xIndex;
   const x=bounds.minX+xIndex*dx;
   if(x>=shore||!seaMask[i]||!Number.isFinite(heights[i]))continue;
   const depth=seaLevel-heights[i];
   if(depth<=0)continue;
   floodedCells++;
   depthSum+=depth;
  }
 }
 const area=floodedCells*dx*dz;
 return {floodedCells,area,capacity:depthSum*dx*dz,meanDepth:floodedCells?depthSum/floodedCells:0};
}

/**
 * Rock center follows actual excavated ground instead of being reset
 * to the dry-land offset after a terrain edit.
 */
export function rockHeightOnEditedGround(floor,scale,submergedCenter,seaLevel=LAGOON_SEA_LEVEL){
 if(!Number.isFinite(floor)||!Number.isFinite(scale)||scale<=0||
  !Number.isFinite(seaLevel)||typeof submergedCenter!=='function')
  throw new RangeError('Invalid rock placement');
 return floor>seaLevel+.035?floor+.1*scale:submergedCenter(floor,.19*scale,seaLevel);
}
