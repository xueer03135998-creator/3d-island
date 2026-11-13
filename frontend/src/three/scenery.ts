import * as THREE from 'three';
import { Builder } from './builder.ts';
import { BUILDING_SITES, PALETTE, coastRadius, groundHeight, mulberry32 } from './palette.ts';
import type { Collider } from './buildings/index.ts';
import { PLAZA_RADIUS } from './paths.ts';
import type { TreeSpot } from './leafFall.ts';

const FLOWERS = [0xf2a7b8, 0xfdf6e8, 0xc4b0e0, 0xffd873];

type Rand = () => number;

function distToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax;
  const dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

export function isClear(x: number, z: number, doors: THREE.Vector3[], margin: number): boolean {
  if (Math.hypot(x, z) < PLAZA_RADIUS + 1.8) {
    return false;
  }
  if (BUILDING_SITES.some(s => Math.hypot(x - s.x, z - s.z) < 9.5 + margin)) {
    return false;
  }
  return doors.every(d => distToSegment(x, z, 0, 0, d.x, d.z) > 2.6 + margin);
}

export function pick(rand: Rand, tMin: number, tMax: number): { x: number; z: number } {
  const a = rand() * Math.PI * 2;
  const t = tMin + rand() * (tMax - tMin);
  const r = t * coastRadius(a);
  return { x: Math.cos(a) * r, z: Math.sin(a) * r };
}

function cypress(b: Builder, x: number, z: number, s: number, rand: Rand): TreeSpot {
  const y = groundHeight(x, z) - 0.05;
  const c = rand() > 0.5 ? PALETTE.cypress : PALETTE.cypressLight;
  b.cyl(0.14 * s, 0.2 * s, 0.9 * s, 5, PALETTE.woodDark, x, y, z);
  b.cone(1.0 * s, 3.2 * s, 7, c, x, y + 0.7 * s, z);
  b.cone(0.75 * s, 2.6 * s, 7, PALETTE.cypressLight, x, y + 2.5 * s, z, { ry: 0.5 });
  b.cone(0.45 * s, 1.5 * s, 7, c, x, y + 4.2 * s, z);
  b.cone(0.24 * s, 0.9 * s, 7, PALETTE.cypressLight, x, y + 5.1 * s, z);
  // 层间小叶簇与树冠暗斑，增加层次
  b.sph(0.16 * s, c, x + 0.5 * s, y + 1.4 * s, z + 0.15 * s, { sy: 0.7 }, 1);
  b.sph(0.14 * s, PALETTE.cypressLight, x - 0.45 * s, y + 3.0 * s, z - 0.1 * s, { sy: 0.7 }, 1);
  b.sph(0.12 * s, c, x + 0.15 * s, y + 4.6 * s, z - 0.25 * s, { sy: 0.7 }, 1);
  return { x, y: y + 2.1 * s, z, r: 0.9 * s, kind: 'cypress' };
}

function shrub(b: Builder, x: number, z: number, s: number, rand: Rand): void {
  const y = groundHeight(x, z);
  b.sph(0.7 * s, rand() > 0.5 ? PALETTE.leaf : PALETTE.leafDark, x, y + 0.3 * s, z, { sy: 0.75 }, 1);
  if (rand() > 0.45) {
    b.sph(0.45 * s, PALETTE.leaf, x + 0.5 * s, y + 0.2 * s, z + 0.2 * s, { sy: 0.8 }, 1);
  }
  if (rand() > 0.6) {
    b.sph(0.4 * s, PALETTE.leafDark, x - 0.5 * s, y + 0.25 * s, z - 0.25 * s, { sy: 0.8 }, 1);
  }
  const n = Math.floor(rand() * 4);
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    b.sph(0.1, FLOWERS[Math.floor(rand() * 4)], x + Math.cos(a) * 0.55 * s, y + 0.55 * s, z + Math.sin(a) * 0.55 * s, {}, 0);
  }
}

const CANOPY = [0x9cc87a, 0xb4d68a, 0x86b872, 0xc5dc8c];
const BLOSSOM = [0xf3b6c6, 0xf7cbd5, 0xeaa3bb];

function broadleaf(b: Builder, x: number, z: number, s: number, rand: Rand, blossom: boolean): { canopy: THREE.Vector3; tree: TreeSpot } {
  const y = groundHeight(x, z) - 0.05;
  // 同一棵树只取一个叶色，避免多色度拼贴显得突兀
  const pal = blossom ? BLOSSOM : CANOPY;
  const base = pal[Math.floor(rand() * pal.length)];
  b.cyl(0.16 * s, 0.26 * s, 1.9 * s, 6, PALETTE.woodDark, x, y, z);
  // 粗壮分叉枝干
  b.cyl(0.07 * s, 0.11 * s, 1.0 * s, 5, PALETTE.woodDark, x + 0.55 * s, y + 1.35 * s, z + 0.35 * s, { rx: 0.35 });
  b.cyl(0.07 * s, 0.11 * s, 0.9 * s, 5, PALETTE.woodDark, x - 0.6 * s, y + 1.5 * s, z - 0.3 * s, { rx: -0.32 });
  b.sph(1.35 * s, base, x, y + 2.5 * s, z, { sy: 0.88 }, 1);
  b.sph(0.95 * s, base, x + 0.85 * s, y + 2.1 * s, z + 0.3 * s, { sy: 0.85 }, 1);
  b.sph(0.9 * s, base, x - 0.75 * s, y + 2.3 * s, z - 0.35 * s, { sy: 0.85 }, 1);
  b.sph(0.8 * s, base, x + 0.1 * s, y + 3.3 * s, z - 0.2 * s, { sy: 0.85 }, 1);
  // 外圈小树冠，轮廓更自然
  b.sph(0.72 * s, base, x - 0.95 * s, y + 1.95 * s, z + 0.5 * s, { sy: 0.82 }, 1);
  b.sph(0.66 * s, base, x + 0.75 * s, y + 2.85 * s, z - 0.72 * s, { sy: 0.82 }, 1);
  b.sph(0.5 * s, base, x + 0.05 * s, y + 2.05 * s, z - 0.85 * s, { sy: 0.8 }, 1);
  // 樱树开花/结果的细小花点（与主色同色系）
  if (blossom) {
    for (let i = 0; i < 9; i++) {
      const a = rand() * Math.PI * 2;
      const r = (0.85 + rand() * 0.65) * s;
      const dy = y + (2.0 + rand() * 1.15) * s;
      b.sph(0.065 * s, base, x + Math.cos(a) * r, dy, z + Math.sin(a) * r, {}, 0);
    }
  }
  return {
    canopy: new THREE.Vector3(x, y + 2.4 * s, z),
    tree: { x, y: y + 2.5 * s, z, r: 1.5 * s, kind: blossom ? 'blossom' : 'leafy' },
  };
}

const ROCK_COLORS = [PALETTE.rock, PALETTE.rockLight];

function rock(b: Builder, x: number, z: number, s: number, rand: Rand): void {
  const bed = groundHeight(x, z) - 0.15;
  const top = Math.max(bed + 1.3 * s, 0.12 + 0.35 * s);
  const half = (top - bed) / 2;
  b.sph(s, ROCK_COLORS[rand() > 0.5 ? 0 : 1], x, bed + half, z, {
    sy: half / s,
    sx: 1 + rand() * 0.3,
    ry: rand() * 3,
  }, 0);
}

export interface Scenery {
  mesh: THREE.Mesh;
  colliders: Collider[];
  canopies: THREE.Vector3[];
  trees: TreeSpot[];
}

export function createScenery(doors: THREE.Vector3[]): Scenery {
  const rand = mulberry32(2024);
  const b = new Builder();
  const colliders: Collider[] = [];
  const canopies: THREE.Vector3[] = [];
  const trees: TreeSpot[] = [];
  const place = (count: number, tMin: number, tMax: number, margin: number, draw: (x: number, z: number) => void): void => {
    let placed = 0;
    for (let guard = 0; placed < count && guard < 600; guard++) {
      const p = pick(rand, tMin, tMax);
      if (isClear(p.x, p.z, doors, margin)) {
        draw(p.x, p.z);
        placed++;
      }
    }
  };
  place(8, 0.25, 0.78, 1.5, (x, z) => {
    trees.push(cypress(b, x, z, 0.9 + rand() * 0.5, rand));
    colliders.push({ x, z, r: 0.7 });
  });
  const leafy = (x: number, z: number, scale: number, blossom: boolean): void => {
    const t = broadleaf(b, x, z, scale, rand, blossom);
    canopies.push(t.canopy);
    trees.push(t.tree);
    colliders.push({ x, z, r: 0.6 });
  };
  place(9, 0.3, 0.8, 2, (x, z) => leafy(x, z, 0.9 + rand() * 0.45, false));
  place(3, 0.35, 0.75, 2, (x, z) => leafy(x, z, 1 + rand() * 0.3, true));
  place(30, 0.2, 0.84, 0.5, (x, z) => shrub(b, x, z, 0.8 + rand() * 0.6, rand));
  const stone = (x: number, z: number, s: number): void => {
    rock(b, x, z, s, rand);
    colliders.push({ x, z, r: s * 1.1 });
  };
  place(26, 0.84, 0.98, 0, (x, z) => stone(x, z, 0.35 + rand() * 0.6));
  place(12, 1.0, 1.14, 0, (x, z) => stone(x, z, 0.5 + rand() * 0.8));
  return { mesh: b.mesh(), colliders, canopies, trees };
}
