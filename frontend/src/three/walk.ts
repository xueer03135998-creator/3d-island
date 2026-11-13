import { SEA_LEVEL, coastRadius, groundHeight } from './palette.ts';

export const PIER_START = coastRadius(-Math.PI / 2) * 0.86;
export const PIER_LEN = 11;
export const PIER_TOP = 0.54;
export const PIER_HALF_W = 0.95;
export const SWIM_LIMIT = 1.28;
export const WATER_FLOOR = SEA_LEVEL + 0.1;

export function isOnPier(x: number, z: number, pad = 0): boolean {
  return Math.abs(x) <= PIER_HALF_W + pad && z <= -PIER_START + pad && z >= -(PIER_START + PIER_LEN) - pad;
}

export function walkHeight(x: number, z: number): number {
  return isOnPier(x, z) ? PIER_TOP : groundHeight(x, z);
}

export function withinSwimArea(x: number, z: number): boolean {
  return Math.hypot(x, z) / coastRadius(Math.atan2(z, x)) <= SWIM_LIMIT;
}

export function isWater(x: number, z: number): boolean {
  return !isOnPier(x, z) && groundHeight(x, z) < WATER_FLOOR;
}
