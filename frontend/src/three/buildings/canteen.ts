import { Builder } from '../builder.ts';
import { PALETTE } from '../palette.ts';
import { gableGeometry } from '../shapes.ts';

const FLOWERS = [0xf2a7b8, 0xfdf6e8, 0xc4b0e0, 0xffd873];
const STOOLS = [0x9bbbd9, 0xe0b4c4, 0xa9cfa0, 0xf2c97c];

function table(b: Builder, x: number, z: number, withUmbrella: boolean): void {
  b.cyl(0.8, 0.8, 0.1, 10, PALETTE.woodLight, x, 0.8, z);
  b.cyl(0.1, 0.14, 0.8, 6, PALETTE.woodMid, x, 0, z);
  b.cyl(0.09, 0.09, 0.07, 8, PALETTE.cream, x + 0.2, 0.9, z - 0.1);
  b.cyl(0.14, 0.14, 0.16, 8, PALETTE.glass, x - 0.25, 0.9, z + 0.15);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    b.cyl(0.3, 0.27, 0.5, 8, STOOLS[i], x + Math.cos(a) * 1.3, 0, z + Math.sin(a) * 1.3);
  }
  if (withUmbrella) {
    b.cyl(0.05, 0.05, 2.5, 5, PALETTE.woodDark, x, 0, z);
    b.cone(1.9, 0.7, 8, 0xf7e2a6, x, 2.45, z);
    b.cone(1.9, 0.12, 8, PALETTE.roofMauve, x, 2.4, z);
  }
}

function flowerBed(b: Builder, x: number, z: number, seed: number): void {
  b.box(2.3, 0.4, 0.75, PALETTE.woodMid, x, 0, z);
  b.box(2.1, 0.06, 0.55, PALETTE.woodDark, x, 0.4, z);
  for (let i = 0; i < 7; i++) {
    const fx = x - 0.9 + i * 0.3;
    const fz = z + (((i + seed) % 3) - 1) * 0.13;
    b.sph(0.17, PALETTE.leaf, fx, 0.55, fz, { sy: 0.8 }, 0);
    b.sph(0.12, FLOWERS[(i + seed) % 4], fx, 0.82 + ((i * 5) % 3) * 0.06, fz, {}, 0);
  }
}

export function buildCanteen(): Builder {
  const b = new Builder();
  b.box(7.4, 0.3, 5.9, PALETTE.stoneWarm, 0, 0, 0);
  b.box(7, 3, 5.5, PALETTE.warmYellow, 0, 0.3, 0);
  b.box(7.1, 0.25, 5.6, PALETTE.cream, 0, 0.3, 0);
  b.add(gableGeometry(7, 5.5, 1.5, 0.7, 0.8), PALETTE.roofMauve, 0, 3.3, 0);
  b.box(7.9, 0.14, 0.14, PALETTE.cream, 0, 3.26, 3.55);
  b.box(1.3, 2.2, 0.14, 0x2f2838, 0, 0.3, 2.78);
  b.box(1.5, 2.4, 0.1, PALETTE.cream, 0, 0.3, 2.76);
  b.box(2.2, 0.12, 1.0, PALETTE.roofMauve, 0, 2.75, 3.25, { rx: 0.25 });
  [-2.15, 2.15].forEach(x => {
    b.box(1.5, 1.3, 0.08, PALETTE.cream, x, 1.0, 2.76);
    b.box(1.2, 1.0, 0.1, PALETTE.glass, x, 1.15, 2.8);
    b.box(0.07, 1.0, 0.12, PALETTE.cream, x, 1.15, 2.82);
  });
  [-0.9, 0.9].forEach(z => {
    b.box(0.08, 1.0, 1.2, PALETTE.glass, 3.52, 1.15, z);
    b.box(0.08, 1.0, 1.2, PALETTE.glass, -3.52, 1.15, z);
  });
  b.box(0.9, 1.9, 0.9, 0xe9d6c0, 2.3, 3.2, -1.0);
  b.box(1.1, 0.18, 1.1, PALETTE.stoneLilac, 2.3, 5.0, -1.0);
  table(b, -3.2, 6.4, true);
  table(b, 3.2, 5.6, false);
  flowerBed(b, -2.15, 3.4, 0);
  flowerBed(b, 2.15, 3.4, 2);
  b.box(0.9, 0.5, 0.5, PALETTE.woodMid, -4.3, 0, 0.5);
  b.sph(0.4, PALETTE.leafDark, -4.3, 0.75, 0.5, { sy: 0.9 }, 1);
  return b;
}
