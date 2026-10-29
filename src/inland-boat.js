/** Local inland boat displacement: sample the actual bathymetric water surface. */
export function inlandBoatHeight(floor,depth,waveOffset=0,clearance=.065){
 if(![floor,depth,waveOffset,clearance].every(Number.isFinite)||
    depth<0||clearance<0)throw new RangeError('Invalid boat waterline');
 return floor+depth+clearance+waveOffset;
}
