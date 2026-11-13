import * as THREE from 'three';
import { Builder, getSwayMaterial } from './builder.ts';
import type { Collider } from './buildings/index.ts';
import { SHORE_T, groundHeight, mulberry32 } from './palette.ts';
import { isClear, pick } from './scenery.ts';

type Rand = () => number;

const BLOOMS = [0xff6f91, 0xffc84a, 0xffffff, 0xb583f2, 0xff9a4d, 0x6ec6ff];
const CAPS = [0xe84a3c, 0xf2a03b, 0xf6e7c8];

function flowerCluster(b: Builder, x: number, z: number, rand: Rand): void {
  const color = BLOOMS[Math.floor(rand() * BLOOMS.length)];
  const n = 3 + Math.floor(rand() * 4);
  for (let i = 0; i < n; i++) {
    const fx = x + (rand() - 0.5) * 1.1;
    const fz = z + (rand() - 0.5) * 1.1;
    const y = groundHeight(fx, fz) - 0.05;
    const h = 0.35 + rand() * 0.3;
    b.cyl(0.015, 0.02, h, 4, 0x4f9d47, fx, y, fz);
    b.sph(0.09 + rand() * 0.04, color, fx, y + h + 0.03, fz, { sy: 0.7 }, 0);
    b.sph(0.04, 0xffe16a, fx, y + h + 0.08, fz, {}, 0);
  }
  b.sph(0.22, 0x5aa84c, x, groundHeight(x, z), z, { sy: 0.6 }, 0);
}

function mushroom(b: Builder, x: number, z: number, rand: Rand): void {
  const y = groundHeight(x, z) - 0.04;
  const s = 0.7 + rand() * 0.7;
  b.cyl(0.07 * s, 0.1 * s, 0.28 * s, 6, 0xf4ecd8, x, y, z);
  b.add(
    new THREE.SphereGeometry(0.22 * s, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2),
    CAPS[Math.floor(rand() * CAPS.length)],
    x,
    y + 0.26 * s,
    z
  );
  b.sph(0.035 * s, 0xffffff, x + 0.08 * s, y + 0.42 * s, z + 0.05 * s, {}, 0);
}

function rock(b: Builder, x: number, z: number, rand: Rand, cols: Collider[]): void {
  const y = groundHeight(x, z);
  const s = 0.25 + rand() * 0.45;
  const tone = 0x9c9a94 + Math.floor(rand() * 5) * 0x050505;
  b.sph(s, tone, x, y + s * 0.15, z, { sy: 0.65, sx: 1.2, ry: rand() * 3, rz: rand() * 0.3 }, 0);
  cols.push({ x, z, r: s * 1.15 });
  if (rand() > 0.5) {
    b.sph(s * 0.5, tone + 0x0a0a0a, x + s * 0.9, y, z + s * 0.3, { sy: 0.7 }, 0);
  }
}

function shell(b: Builder, x: number, z: number, rand: Rand): void {
  const y = groundHeight(x, z);
  const color = rand() > 0.5 ? 0xffd7c2 : 0xfff1e6;
  b.cone(0.1, 0.12, 7, color, x, y, z, { rx: Math.PI / 2, ry: rand() * 6, sy: 0.5 });
}

function reeds(b: Builder, x: number, z: number, rand: Rand): void {
  const n = 5 + Math.floor(rand() * 4);
  for (let i = 0; i < n; i++) {
    const rx = x + (rand() - 0.5) * 0.9;
    const rz = z + (rand() - 0.5) * 0.9;
    const h = 0.9 + rand() * 0.8;
    b.cone(0.05, h, 4, 0x7fb04f, rx, groundHeight(rx, rz) - 0.05, rz, { rz: (rand() - 0.5) * 0.25 });
    if (rand() > 0.6) {
      b.cyl(0.045, 0.045, 0.22, 5, 0x8a5a2f, rx, groundHeight(rx, rz) + h * 0.85, rz);
    }
  }
}

function steppingStones(b: Builder, x: number, z: number, rand: Rand): void {
  const a = rand() * Math.PI * 2;
  for (let i = 0; i < 4; i++) {
    const sx = x + Math.cos(a) * i * 0.85;
    const sz = z + Math.sin(a) * i * 0.85;
    b.cyl(0.32, 0.36, 0.1, 7, 0xb4b0a6, sx, groundHeight(sx, sz) - 0.03, sz, { ry: rand() * 3 });
  }
}

function scatter(
  rand: Rand,
  doors: THREE.Vector3[],
  count: number,
  tMin: number,
  tMax: number,
  minH: number,
  place: (x: number, z: number) => void
): void {
  let placed = 0;
  for (let tries = 0; tries < count * 12 && placed < count; tries++) {
    const p = pick(rand, tMin, tMax);
    if (groundHeight(p.x, p.z) < minH || !isClear(p.x, p.z, doors, 0.6)) {
      continue;
    }
    place(p.x, p.z);
    placed++;
  }
}

export function createDecor(doors: THREE.Vector3[]): { group: THREE.Group; colliders: Collider[] } {
  const rand = mulberry32(2024);
  const swaying = new Builder();
  const still = new Builder();
  const colliders: Collider[] = [];
  scatter(rand, doors, 26, 0.25, 0.8, 0.3, (x, z) => flowerCluster(swaying, x, z, rand));
  scatter(rand, doors, 12, 0.3, 0.78, 0.3, (x, z) => mushroom(still, x, z, rand));
  scatter(rand, doors, 14, 0.2, 0.9, 0.3, (x, z) => rock(still, x, z, rand, colliders));
  scatter(rand, doors, 30, SHORE_T - 0.02, 0.97, 0.06, (x, z) => shell(still, x, z, rand));
  scatter(rand, doors, 14, SHORE_T - 0.1, SHORE_T, 0.1, (x, z) => reeds(swaying, x, z, rand));
  scatter(rand, doors, 4, 0.35, 0.7, 0.3, (x, z) => steppingStones(still, x, z, rand));
  const group = new THREE.Group();
  const flowers = swaying.mesh(getSwayMaterial());
  flowers.receiveShadow = true;
  group.add(flowers, still.mesh());
  return { group, colliders };
}
