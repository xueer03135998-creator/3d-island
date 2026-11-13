import * as THREE from 'three';
import { Builder } from '../builder.ts';
import { PALETTE } from '../palette.ts';
import { hipGeometry } from '../shapes.ts';

const LANTERN = 0xe58f7c;
const CELADON = [0xa9d0c0, 0xb9d6e4, 0xe6d3a3];
const PAPER = [0xf2b8a6, 0xf7e2a6, 0xb9cfe6];
const PLANK = 0x8f6a4f;

function lantern(b: Builder, x: number, z: number): void {
  b.cyl(0.03, 0.03, 0.35, 5, PALETTE.woodDark, x, 2.15, z);
  b.sph(0.3, LANTERN, x, 1.85, z, { sy: 1.2 }, 1);
  b.cyl(0.14, 0.14, 0.06, 6, PALETTE.gold, x, 2.2, z);
  b.cyl(0.1, 0.1, 0.06, 6, PALETTE.gold, x, 1.48, z);
}

function pottery(b: Builder, x: number, z: number): void {
  b.box(2.2, 0.08, 0.9, PALETTE.woodLight, x, 0.85, z);
  [-0.95, 0.95].forEach(dx => {
    [-0.35, 0.35].forEach(dz => b.box(0.1, 0.55, 0.1, PALETTE.woodMid, x + dx, 0.3, z + dz));
  });
  CELADON.forEach((c, i) => {
    const px = x - 0.7 + i * 0.7;
    b.sph(0.22 + (i % 2) * 0.05, c, px, 1.22, z, { sy: 1.2 }, 1);
    b.cyl(0.1, 0.12, 0.1, 8, c, px, 1.45 + (i % 2) * 0.04, z);
  });
}

function umbrella(b: Builder, x: number, z: number, i: number): void {
  b.cyl(0.03, 0.03, 1.7, 5, PALETTE.woodDark, x, 0.3, z);
  b.cone(0.85, 0.45, 10, PAPER[i % 3], x, 1.7, z);
}

function roofAndEaves(b: Builder): void {
  b.box(8.2, 0.2, 6.2, PALETTE.woodDark, 0, 3.3, 0);
  b.add(hipGeometry(4.6, 3.6, 2.0), PALETTE.roofTeal, 0, 3.5 + 1.0, 0);
  b.box(1.6, 0.16, 0.9, PALETTE.roofSlate, 0, 5.5, 0);
  [-1, 1].forEach(sx => {
    [-1, 1].forEach(sz => {
      b.cone(0.36, 1.1, 4, PALETTE.roofTeal, sx * 4.35, 3.6, sz * 3.4, {
        rz: -sx * 0.55,
        rx: sz * 0.55,
        ry: Math.PI / 4,
      });
    });
  });
}

function walls(b: Builder): void {
  b.box(7.4, 0.3, 5.8, PALETTE.stone, 0, 0, 0);
  b.box(7, 3, 5, PALETTE.woodMid, 0, 0.3, 0);
  for (let i = 0; i < 6; i++) {
    b.box(0.06, 3, 0.06, PLANK, -3 + i * 1.2, 0.3, 2.52);
  }
  [-1, 1].forEach(sx => {
    [-1, 1].forEach(sz => b.box(0.3, 3.1, 0.3, PALETTE.woodDark, sx * 3.5, 0.3, sz * 2.5));
  });
}

function door(b: Builder): void {
  b.box(2.2, 2.5, 0.14, PALETTE.woodDark, 0, 0.3, 2.52);
  b.box(1.9, 2.2, 0.16, 0x2f2838, 0, 0.4, 2.56);
  b.box(2.8, 0.14, 0.9, PALETTE.roofSlate, 0, 2.85, 2.95, { rx: 0.2 });
  lantern(b, -1.5, 2.95);
  lantern(b, 1.5, 2.95);
}

function windows(b: Builder): void {
  [-2.2, 2.2].forEach(x => {
    b.box(1.3, 1.1, 0.1, PALETTE.woodDark, x, 1.2, 2.52);
    b.box(1.1, 0.9, 0.12, PALETTE.glassDark, x, 1.3, 2.54);
    b.box(0.06, 0.9, 0.14, PALETTE.woodLight, x, 1.3, 2.56);
    b.box(1.1, 0.06, 0.14, PALETTE.woodLight, x, 1.75, 2.56);
  });
  [-1, 1].forEach(s => {
    b.add(new THREE.CylinderGeometry(0.75, 0.75, 0.1, 16), PALETTE.woodDark, s * 3.5, 1.9, 0, { rz: Math.PI / 2 });
    b.add(new THREE.CylinderGeometry(0.6, 0.6, 0.12, 16), PALETTE.glassDark, s * 3.53, 1.9, 0, { rz: Math.PI / 2 });
  });
}

export function buildHeritage(): Builder {
  const b = new Builder();
  walls(b);
  roofAndEaves(b);
  door(b);
  windows(b);
  pottery(b, -2.4, 4.2);
  umbrella(b, 2.2, 4.4, 0);
  umbrella(b, 3.1, 3.7, 1);
  b.box(0.12, 1.2, 0.12, PALETTE.woodDark, -3.9, 0, 3.6);
  b.box(1.0, 0.6, 0.1, PALETTE.cream, -3.9, 1.1, 3.6);
  return b;
}
