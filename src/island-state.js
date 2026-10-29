/**
 * Portable island state (no DOM dependencies).
 * Keep versioned and validate before applying anything to the 3D world.
 */
import { WIDTH, DEPTH, clamp } from './simulation.js';

export const SAVE_KEY = 'shoreline.island.v1';
export const SAVE_VERSION = 1;
const allowedKinds = new Set(['tree', 'rock', 'boat']);
const finite = n => typeof n === 'number' && Number.isFinite(n);

export function createSnapshot({ heights, objects = [], water = null, wave = .6, foam = 1, speed = 1, hours = 10 }) {
  if (!heights || !Number.isInteger(heights.length) || heights.length < 1 || heights.length > 100000) throw new Error('Invalid terrain height data');
  if (!Array.isArray(objects) || objects.length > 1000) throw new Error('Invalid placed objects');
  const safeHeights = Array.from(heights, h => {
    if (!finite(h) || h < -2 || h > 2) throw new Error('Invalid height value');
    return Math.round(h * 10000) / 10000;
  });
  const safeObjects = objects.map(o => {
    if (!allowedKinds.has(o.kind) || !finite(o.x) || !finite(o.z) || !finite(o.scale) ||
        Math.abs(o.x) > WIDTH/2 || Math.abs(o.z) > DEPTH/2 || o.scale < .1 || o.scale > 4) {
      throw new Error('Invalid placed object');
    }
    return { kind: o.kind, x: +o.x.toFixed(3), z: +o.z.toFixed(3), scale: +o.scale.toFixed(3) };
  });
  if (!finite(wave) || !finite(foam) || !finite(speed) || !finite(hours)) throw new Error('Invalid simulation settings');
  // Optional state: old v1 island files without it remain fully compatible.
  // The water column is a separate field because closed lagoons may retain
  // water despite losing their sea connection after a dam is built.
  let safeWater=null;
  if(water!==null){
   if(!water||!Number.isInteger(water.length)||water.length<1||water.length>40000)throw new Error('Invalid water grid');
   safeWater=Array.from(water,d=>{
    if(!finite(d)||d<0||d>2)throw new Error('Invalid water depth');
    return Math.round(d*10000)/10000;
   });
  }
  const result={version:SAVE_VERSION,heights:safeHeights,objects:safeObjects,
    wave:clamp(wave,.1,1.6),foam:clamp(foam,.3,1.8),speed:clamp(speed,.2,3),hours:((hours%24)+24)%24};
  if(safeWater!==null)result.water=safeWater;
  return result;
}

export function parseSnapshot(json, expectedVertices, expectedWaterCells=null) {
  if (typeof json !== 'string' || json.length > 1600000) throw new Error('Save file is too large or invalid');
  let state;
  try { state = JSON.parse(json); } catch { throw new Error('The saved island is not valid JSON'); }
  if (!state || state.version !== SAVE_VERSION || !Array.isArray(state.heights) ||
      state.heights.length !== expectedVertices) throw new Error('Incompatible island save');
  if(state.water!==undefined&&expectedWaterCells!==null&&(!Array.isArray(state.water)||state.water.length!==expectedWaterCells))throw new Error('Incompatible water grid');
  return createSnapshot(state);
}

export function describeSave(snapshot) {
  return `Island saved: ${snapshot.objects.length} added objects, ${snapshot.heights.length} terrain points`;
}
