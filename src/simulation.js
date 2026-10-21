/** Pure deterministic pieces of the coastal simulation; shared with tests. */
export const WIDTH = 18;
export const DEPTH = 10.8;
export const HALF_WIDTH = WIDTH / 2;
export const HALF_DEPTH = DEPTH / 2;
export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
export const smoothstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const shoreline = z => -0.6 + 0.85 * Math.sin(z * 0.70) + 0.37 * Math.cos(z * 1.7) + 0.28 * Math.sin(z * 2.1);
export const landDistance = (x, z) => shoreline(z) - x;
export const noise = (x, z) => Math.sin(x * 3.27 + Math.cos(z * 2.73)) * Math.cos(z * 3.41 - x * 1.19);
export const terrainHeight = (x, z) => {
  const distance = landDistance(x, z);
  if (distance < 0) return -0.24 - 0.07 * Math.min(-distance, 7) + 0.045 * noise(x, z);
  return 0.08 + 0.07 * smoothstep(0, 1.5, distance) + 0.033 * noise(x, z) + 0.06 * smoothstep(2, 6, distance);
};
export const forestWeight = (x, z) => {
  const d = landDistance(x, z);
  return smoothstep(1.0, 2.9, d) * (0.66 + 0.34 * noise(x * .7, z * .8));
};
export const daylight = hours => clamp(Math.sin((hours - 6) / 12 * Math.PI), 0.13, 1);
export const clockLabel = hours => {
  const minutes = Math.floor(((hours % 24) + 24) % 24 * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2,'0')}:${String(minutes % 60).padStart(2,'0')}`;
};
export function seededRandom(seed = 42) {
  let a = seed >>> 0;
  return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export const brushInfluence = (distance, radius) => {const t = clamp(1 - distance / radius, 0, 1); return t * t * (3 - 2 * t);};