/**
 * Apply a brush only to the terrain grid rectangle intersecting its circle.
 *
 * The original scene scanned all 19,729 terrain vertices on every pointer
 * event. This produces the same per-vertex results while visiting only the
 * region under the brush; it deliberately preserves the legacy height bounds.
 */
export function sculptGridRegion({
  positions, columns, rows, width, depth, point, radius, tool,
  landDistance, terrainHeight, brushInfluence, clamp
}) {
  if (!positions || !Number.isInteger(columns) || columns < 2 ||
      !Number.isInteger(rows) || rows < 2 || positions.count !== columns * rows ||
      !Number.isFinite(width) || width <= 0 || !Number.isFinite(depth) || depth <= 0 ||
      !point || !Number.isFinite(point.x) || !Number.isFinite(point.z) ||
      !Number.isFinite(radius) || radius <= 0 ||
      !['raise','lower','smooth'].includes(tool) ||
      typeof landDistance !== 'function' || typeof terrainHeight !== 'function' ||
      typeof brushInfluence !== 'function' || typeof clamp !== 'function')
    throw new RangeError('Invalid sculpt grid');

  const cellX=width/(columns-1), cellZ=depth/(rows-1);
  // One-node margin accommodates Float32 PlaneGeometry coordinate rounding.
  const x0=Math.max(0,Math.floor((point.x-radius+width/2)/cellX)-1);
  const x1=Math.min(columns-1,Math.ceil((point.x+radius+width/2)/cellX)+1);
  const z0=Math.max(0,Math.floor((point.z-radius+depth/2)/cellZ)-1);
  const z1=Math.min(rows-1,Math.ceil((point.z+radius+depth/2)/cellZ)+1);
  if(x0>x1||z0>z1)return {visited:0,changed:0};
  let visited=0,changed=0;
  for(let zi=z0;zi<=z1;zi++)for(let xi=x0;xi<=x1;xi++){
    const i=zi*columns+xi;
    const x=positions.getX(i),z=positions.getZ(i);
    visited++;
    const distance=Math.hypot(point.x-x,point.z-z);
    if(distance>=radius||landDistance(x,z)<0)continue;
    const influence=brushInfluence(distance,radius);
    const h=positions.getY(i);
    let next=h;
    if(tool==='raise')next=clamp(h+.017*influence,-.12,1.25);
    if(tool==='lower')next=clamp(h-.017*influence,-.258,1.25);
    if(tool==='smooth')next=h+(terrainHeight(x,z)-h)*.035*influence;
    if(next!==h){positions.setY(i,next);changed++;}
  }
  return {visited,changed};
}
