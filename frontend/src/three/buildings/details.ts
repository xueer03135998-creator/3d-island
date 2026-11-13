import type { Builder } from '../builder.ts';
import type { BuildingId } from './index.ts';

const RED = 0xe0463a;
const GOLD = 0xf2c14e;
const STONE = 0xb9b4a8;
const STONE_DARK = 0x8f8a80;
const WOOD = 0x9a6a43;
const WOOD_DARK = 0x6e4a2d;
const LEAF = 0x5fae56;
const LEAF_LIGHT = 0x86cf6a;
const PINK = 0xf7a8c4;

function hangLantern(b: Builder, x: number, y: number, z: number, color: number, r = 0.28): void {
  b.cyl(0.02, 0.02, 0.5, 4, WOOD_DARK, x, y, z);
  b.cyl(r * 0.5, r * 0.5, 0.08, 8, GOLD, x, y - 0.06, z);
  b.sph(r, color, x, y - 0.34, z, { sy: 1.25 }, 1);
  b.cyl(r * 0.42, r * 0.42, 0.06, 8, GOLD, x, y - 0.68, z);
  b.cyl(0.015, 0.015, 0.3, 4, GOLD, x, y - 0.98, z);
}

function stoneLantern(b: Builder, x: number, z: number): void {
  b.cyl(0.34, 0.4, 0.14, 8, STONE_DARK, x, 0, z);
  b.cyl(0.14, 0.18, 0.7, 8, STONE, x, 0.14, z);
  b.cyl(0.3, 0.26, 0.1, 8, STONE_DARK, x, 0.84, z);
  b.box(0.36, 0.34, 0.36, 0xffe9a6, x, 0.94, z);
  b.cone(0.5, 0.36, 4, STONE, x, 1.28, z, { ry: Math.PI / 4 });
  b.sph(0.08, STONE_DARK, x, 1.7, z, {}, 0);
}

function incenseBurner(b: Builder, x: number, y: number, z: number): void {
  b.cyl(0.38, 0.28, 0.1, 10, WOOD_DARK, x, y, z);
  b.cyl(0.3, 0.42, 0.36, 10, 0xc4573a, x, y + 0.1, z);
  b.cyl(0.4, 0.4, 0.05, 10, GOLD, x, y + 0.46, z);
  b.sph(0.1, 0x4a4a4a, x, y + 0.52, z, { sy: 0.5 }, 0);
  [-0.12, 0, 0.12].forEach(dx => {
    b.cyl(0.012, 0.012, 0.5, 4, WOOD_DARK, x + dx, y + 0.52, z + dx * 0.4);
  });
}

function blossomTree(b: Builder, x: number, z: number): void {
  b.cyl(0.16, 0.28, 1.6, 6, WOOD_DARK, x, 0, z, { rz: 0.06 });
  b.cyl(0.08, 0.14, 1.0, 5, WOOD_DARK, x + 0.35, 1.3, z, { rz: -0.7 });
  b.cyl(0.08, 0.14, 0.9, 5, WOOD_DARK, x - 0.3, 1.4, z + 0.1, { rz: 0.65 });
  // 同一棵树统一一种花色，避免多色拼贴
  const blobs: Array<[number, number, number, number]> = [
    [0, 2.7, 0, 1.15],
    [0.95, 2.3, 0.2, 0.8],
    [-0.9, 2.4, -0.1, 0.85],
    [0.2, 3.35, -0.2, 0.7],
    [-0.3, 2.3, 0.8, 0.65],
  ];
  blobs.forEach(([dx, y, dz, r]) => b.sph(r, PINK, x + dx, y, z + dz, { sy: 0.85 }, 1));
}

function divinationDetails(b: Builder): void {
  [-3.1, -1.9, 1.9, 3.1].forEach((x, i) => hangLantern(b, x, 3.45, 2.95, i % 2 === 0 ? RED : 0xf08a3c));
  stoneLantern(b, -3.3, 5.0);
  stoneLantern(b, 3.3, 5.0);
  incenseBurner(b, 0, 1.0, -1.2);
  blossomTree(b, -2.6, -4.6);
  blossomTree(b, 3.4, -4.2);
  b.box(0.9, 0.12, 0.6, STONE, -2.2, 0, 5.9);
  b.box(0.6, 0.1, 0.5, STONE_DARK, 2.3, 0, 6.2, { ry: 0.3 });
}

const FLAG_COLORS = [0xe8564a, 0xf5c542, 0x4cb5e8, 0x6cc47a, 0xf08ab4];

function bunting(b: Builder, x0: number, x1: number, y: number, z: number, count: number): void {
  b.box(x1 - x0, 0.03, 0.03, WOOD_DARK, (x0 + x1) / 2, y, z);
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const x = x0 + (x1 - x0) * t;
    const sag = Math.sin(t * Math.PI) * 0.12;
    b.cone(0.17, 0.34, 3, FLAG_COLORS[i % FLAG_COLORS.length], x, y - 0.34 - sag, z, { rx: Math.PI, sz: 0.25 });
  }
}

function barrel(b: Builder, x: number, z: number, h = 0.8): void {
  b.cyl(0.42, 0.42, h, 10, WOOD, x, 0, z);
  b.cyl(0.46, 0.46, 0.06, 10, 0x5a5a5a, x, 0.14, z);
  b.cyl(0.46, 0.46, 0.06, 10, 0x5a5a5a, x, h - 0.2, z);
  b.cyl(0.36, 0.36, 0.03, 10, 0xd9b27c, x, h, z);
}

function crate(b: Builder, x: number, z: number, ry: number): void {
  b.box(0.8, 0.6, 0.8, 0xc99a5b, x, 0, z, { ry });
  b.box(0.84, 0.08, 0.84, WOOD_DARK, x, 0.26, z, { ry });
  b.sph(0.17, 0xe34a3a, x - 0.18, 0.66, z + 0.05, {}, 1);
  b.sph(0.17, 0xf59e2e, x + 0.15, 0.66, z - 0.12, {}, 1);
  b.sph(0.15, 0x7cc15a, x + 0.12, 0.64, z + 0.2, {}, 1);
}

function chalkboard(b: Builder, x: number, z: number, ry: number): void {
  b.box(0.06, 1.3, 0.06, WOOD, x - 0.4, 0, z, { ry, rz: 0.08 });
  b.box(0.06, 1.3, 0.06, WOOD, x + 0.4, 0, z, { ry, rz: -0.08 });
  b.box(0.95, 0.7, 0.08, 0x2f4a3f, x, 0.55, z, { ry });
  b.box(0.8, 0.03, 0.02, 0xf4f1e6, x, 1.0, z + 0.05, { ry });
  b.box(0.6, 0.03, 0.02, 0xf4f1e6, x, 0.82, z + 0.05, { ry });
  b.box(0.7, 0.03, 0.02, 0xf5c542, x, 0.66, z + 0.05, { ry });
}

function canteenDetails(b: Builder): void {
  bunting(b, -3.4, 3.4, 3.35, 2.95, 9);
  barrel(b, -4.3, 1.6);
  barrel(b, -4.6, 2.5, 0.65);
  crate(b, 4.3, 2.0, 0.2);
  chalkboard(b, 4.3, 3.8, -0.3);
  b.sph(0.3, 0xf2a93b, -3.9, 0.3, 4.2, { sy: 0.8 }, 1);
  b.cyl(0.03, 0.03, 0.2, 4, LEAF, -3.9, 0.5, 4.2);
  b.cyl(0.14, 0.12, 0.2, 8, 0xe9e2d0, 0.9, 0, 3.4);
  b.cyl(0.14, 0.12, 0.2, 8, 0xe9e2d0, -0.9, 0, 3.4);
}

const FLOWERS = [0xf06a8a, 0xf7d046, 0xffffff, 0xb28cf0];

function hedge(b: Builder, x: number, z: number, len: number): void {
  b.box(0.9, 0.7, len, 0x4e9a4a, x, 0, z);
  const n = Math.max(2, Math.round(len / 0.9));
  for (let i = 0; i < n; i++) {
    const zz = z - len / 2 + ((i + 0.5) * len) / n;
    b.sph(0.14, FLOWERS[i % FLOWERS.length], x + (i % 2 === 0 ? -0.2 : 0.2), 0.78, zz, {}, 0);
  }
}

function bench(b: Builder, x: number, z: number, ry: number): void {
  b.box(1.5, 0.1, 0.5, 0xb98450, x, 0.45, z, { ry });
  b.box(1.5, 0.35, 0.08, 0xb98450, x, 0.72, z - 0.22, { ry });
  const c = Math.cos(ry);
  const s = Math.sin(ry);
  [-0.65, 0.65].forEach(dx => {
    b.box(0.08, 0.45, 0.4, WOOD_DARK, x + dx * c, 0, z - dx * s, { ry });
  });
}

function archiveDetails(b: Builder): void {
  hedge(b, -4.3, 0.2, 4.6);
  hedge(b, 4.3, -0.4, 4.0);
  bench(b, 3.8, 6.2, -0.15);
  [-4.2, 4.4].forEach((x, i) => {
    b.cyl(0.28, 0.2, 0.4, 8, 0xc4573a, x, 0, 4.6);
    b.sph(0.34, LEAF_LIGHT, x, 0.7, 4.6, {}, 1);
    b.sph(0.1, FLOWERS[i], x + 0.1, 0.98, 4.65, {}, 0);
  });
  b.cyl(0.05, 0.05, 2.2, 5, WOOD_DARK, -2.6, 0, 5.9);
  b.box(0.7, 0.45, 0.06, 0xfff4d6, -2.6, 1.9, 5.9);
  b.cone(0.45, 0.22, 4, 0xc2563a, -2.6, 2.35, 5.9, { ry: Math.PI / 4, sz: 0.4 });
}

function jar(b: Builder, x: number, z: number, h: number, color: number): void {
  b.cyl(0.26, 0.2, h, 9, color, x, 0, z);
  b.sph(0.3, color, x, h * 0.62, z, { sy: 0.9 }, 1);
  b.cyl(0.14, 0.2, 0.12, 9, color, x, h * 0.62 + 0.24, z);
  b.cyl(0.25, 0.25, 0.04, 9, 0xf5c542, x, h * 0.62 + 0.34, z);
}

function dryingRack(b: Builder, x: number, z: number, ry: number): void {
  b.box(0.07, 1.5, 0.07, WOOD, x - 0.9, 0, z, { ry });
  b.box(0.07, 1.5, 0.07, WOOD, x + 0.9, 0, z, { ry });
  b.box(1.9, 0.06, 0.06, WOOD_DARK, x, 1.45, z, { ry });
  [0xd1495b, 0x2e86ab, 0xf5c542, 0x6cc47a].forEach((c, i) => {
    b.box(0.34, 0.8, 0.03, c, x - 0.6 + i * 0.4, 0.65, z, { ry });
  });
}

function heritageDetails(b: Builder): void {
  const colors = [0xe34a3a, 0xf5a623, 0xf7d046, 0xe34a3a, 0xf5a623, 0xf7d046, 0xe34a3a];
  colors.forEach((c, i) => {
    const x = -3.3 + i * 1.1;
    const sag = Math.sin((i / (colors.length - 1)) * Math.PI) * 0.1;
    b.sph(0.18, c, x, 2.78 - sag, 3.3, { sy: 1.2 }, 1);
    b.cyl(0.015, 0.015, 0.3, 4, WOOD_DARK, x, 2.95 - sag, 3.3);
  });
  jar(b, 4.3, 2.5, 0.7, 0xc2693c);
  jar(b, 4.9, 3.2, 0.55, 0x3f7fa6);
  jar(b, 3.7, 3.4, 0.45, 0xe0b25a);
  dryingRack(b, -4.7, 1.2, 0.5);
  b.cyl(0.2, 0.2, 0.5, 8, 0x8a5a3a, -3.0, 0, 4.9);
  b.cyl(0.17, 0.17, 0.04, 8, 0x2e86ab, -3.0, 0.5, 4.9);
}

export const DETAILS: Record<BuildingId, (b: Builder) => void> = {
  divination: divinationDetails,
  canteen: canteenDetails,
  archive: archiveDetails,
  heritage: heritageDetails,
};
