import type { BuildingId } from './index.ts';

export interface LocalCollider {
  lx: number;
  lz: number;
  r?: number;
  hx?: number;
  hz?: number;
  ry?: number;
}

const ring = (cx: number, cz: number, rad: number, n: number, off: number, r: number): LocalCollider[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + off;
    return { lx: cx + Math.cos(a) * rad, lz: cz + Math.sin(a) * rad, r };
  });

export const LOCAL_COLLIDERS: Record<BuildingId, LocalCollider[]> = {
  divination: [
    { lx: 0, lz: 0, hx: 3.7, hz: 3.7 },
    { lx: -4.4, lz: 6.3, hx: 0.12, hz: 2.7 },
    { lx: 4.4, lz: 6.3, hx: 0.12, hz: 2.7 },
    { lx: -2.95, lz: 9, hx: 1.45, hz: 0.12 },
    { lx: 2.95, lz: 9, hx: 1.45, hz: 0.12 },
    { lx: -3.3, lz: 5.0, r: 0.35 },
    { lx: 3.3, lz: 5.0, r: 0.35 },
    { lx: 0, lz: 6.0, r: 0.45 },
    { lx: -2.6, lz: -4.6, r: 0.3 },
    { lx: 3.4, lz: -4.2, r: 0.3 },
  ],
  canteen: [
    { lx: 0, lz: 0, hx: 3.7, hz: 2.95 },
    { lx: -2.9, lz: 5.1, r: 0.75 },
    { lx: 3.2, lz: 5.6, r: 0.75 },
    ...ring(-2.9, 5.1, 1.3, 4, 0.4, 0.3),
    ...ring(3.2, 5.6, 1.3, 4, 0.4, 0.3),
    { lx: -2.15, lz: 3.4, hx: 1.15, hz: 0.38 },
    { lx: 2.15, lz: 3.4, hx: 1.15, hz: 0.38 },
    { lx: -4.3, lz: 0.5, hx: 0.45, hz: 0.25 },
    { lx: -4.3, lz: 1.6, r: 0.45 },
    { lx: -4.6, lz: 2.5, r: 0.45 },
    { lx: 4.3, lz: 2.0, r: 0.5 },
    { lx: 4.3, lz: 3.8, hx: 0.5, hz: 0.12, ry: -0.3 },
    { lx: -3.9, lz: 4.2, r: 0.3 },
  ],
  archive: [
    { lx: 0, lz: 0, hx: 3.5, hz: 3.1 },
    { lx: -3.3, lz: 3.8, r: 0.35 },
    { lx: 3.3, lz: 3.8, r: 0.35 },
    { lx: 3.0, lz: 4.4, r: 0.4 },
    { lx: -3.7, lz: 5.4, r: 0.4 },
    { lx: -4.3, lz: 0.2, hx: 0.45, hz: 2.3 },
    { lx: 4.3, lz: -0.4, hx: 0.45, hz: 2.0 },
    { lx: 3.8, lz: 6.2, hx: 0.75, hz: 0.3, ry: -0.15 },
    { lx: -4.2, lz: 4.6, r: 0.3 },
    { lx: 4.4, lz: 4.6, r: 0.3 },
    { lx: -2.6, lz: 5.9, r: 0.15 },
  ],
  heritage: [
    { lx: 0, lz: 0, hx: 3.5, hz: 2.5 },
    { lx: -2.4, lz: 4.2, r: 0.7 },
    { lx: 2.2, lz: 4.4, r: 0.25 },
    { lx: 3.1, lz: 3.7, r: 0.25 },
    { lx: -3.9, lz: 3.6, r: 0.35 },
    { lx: 4.3, lz: 2.5, r: 0.3 },
    { lx: 4.9, lz: 3.2, r: 0.3 },
    { lx: 3.7, lz: 3.4, r: 0.3 },
    { lx: -4.7, lz: 1.2, hx: 0.95, hz: 0.12, ry: 0.5 },
    { lx: -3.0, lz: 4.9, r: 0.3 },
  ],
};
