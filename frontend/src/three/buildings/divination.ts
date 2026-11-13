import * as THREE from 'three';
import { Builder } from '../builder.ts';
import { PALETTE } from '../palette.ts';
import { hipGeometry, trigramBars } from '../shapes.ts';

const INK = 0x5b5266;

function bambooFence(b: Builder, x1: number, z1: number, x2: number, z2: number): void {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const len = Math.hypot(dx, dz);
  const n = Math.max(2, Math.round(len / 0.3));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const h = 1.0 + ((i * 7) % 3) * 0.08;
    b.cyl(0.06, 0.07, h, 5, PALETTE.bamboo, x1 + dx * t, 0, z1 + dz * t);
  }
  const ry = -Math.atan2(dz, dx);
  [0.35, 0.78].forEach(y => {
    const rail = new THREE.CylinderGeometry(0.045, 0.045, len, 5);
    b.add(rail, PALETTE.woodLight, (x1 + x2) / 2, y, (z1 + z2) / 2, { rz: Math.PI / 2, ry });
  });
}

function baguaDisc(b: Builder, cx: number, cz: number): void {
  b.cyl(1.85, 1.95, 0.22, 8, PALETTE.stone, cx, 0, cz, { ry: Math.PI / 8 });
  b.cyl(1.25, 1.25, 0.26, 8, PALETTE.stoneLilac, cx, 0, cz, { ry: Math.PI / 8 });
  b.add(new THREE.CylinderGeometry(0.6, 0.6, 0.1, 14, 1, false, 0, Math.PI), INK, cx, 0.31, cz);
  b.add(new THREE.CylinderGeometry(0.6, 0.6, 0.1, 14, 1, false, Math.PI, Math.PI), PALETTE.cream, cx, 0.31, cz);
  for (let k = 0; k < 8; k++) {
    const th = (k / 8) * Math.PI * 2;
    const ry = -th - Math.PI / 2;
    trigramBars(7 - k).forEach((solid, row) => {
      const r = 1.36 + row * 0.16;
      const px = cx + Math.cos(th) * r;
      const pz = cz + Math.sin(th) * r;
      const tx = -Math.sin(th);
      const tz = Math.cos(th);
      if (solid) {
        b.box(0.55, 0.06, 0.08, INK, px, 0.24, pz, { ry });
      } else {
        [-0.17, 0.17].forEach(o => {
          b.box(0.22, 0.06, 0.08, INK, px + tx * o, 0.24, pz + tz * o, { ry });
        });
      }
    });
  }
}

export function buildDivination(): Builder {
  const b = new Builder();
  b.box(7.4, 0.5, 7.4, PALETTE.stone, 0, 0, 0);
  b.box(3.2, 0.28, 1.0, PALETTE.stoneWarm, 0, 0, 4.1);
  b.box(3.0, 0.14, 0.8, PALETTE.stoneWarm, 0, 0, 4.8);
  [-2.7, 2.7].forEach(x => {
    [-2.7, 2.7].forEach(z => {
      b.cyl(0.17, 0.2, 3.0, 6, PALETTE.woodDark, x, 0.5, z);
      b.cyl(0.26, 0.26, 0.12, 6, PALETTE.stoneLilac, x, 0.5, z);
    });
  });
  b.box(6.1, 0.3, 0.32, PALETTE.woodDark, 0, 3.5, 2.7);
  b.box(6.1, 0.3, 0.32, PALETTE.woodDark, 0, 3.5, -2.7);
  b.box(0.32, 0.3, 6.1, PALETTE.woodDark, 2.7, 3.5, 0);
  b.box(0.32, 0.3, 6.1, PALETTE.woodDark, -2.7, 3.5, 0);
  b.box(5.2, 2.5, 0.2, PALETTE.woodLight, 0, 0.5, -2.6);
  b.add(new THREE.CylinderGeometry(0.7, 0.7, 0.08, 16, 1, false, 0, Math.PI), INK, 0, 1.9, -2.46, { rx: Math.PI / 2 });
  b.add(new THREE.CylinderGeometry(0.7, 0.7, 0.08, 16, 1, false, Math.PI, Math.PI), PALETTE.cream, 0, 1.9, -2.46, { rx: Math.PI / 2 });
  [-2.7, 2.7].forEach(x => {
    b.box(0.14, 0.12, 5.4, PALETTE.woodMid, x, 1.35, 0);
    b.box(0.14, 0.1, 5.4, PALETTE.woodMid, x, 0.85, 0);
  });
  b.cyl(0.55, 0.45, 0.5, 8, PALETTE.woodMid, 0, 0.5, -1.2);
  b.cyl(0.5, 0.5, 0.06, 8, PALETTE.gold, 0, 0.98, -1.2);
  b.box(8.4, 0.22, 8.4, PALETTE.woodDark, 0, 3.55, 0);
  b.add(hipGeometry(4.5, 4.5, 2.2), PALETTE.roofCharcoal, 0, 3.77 + 1.1, 0);
  b.add(hipGeometry(3.2, 3.2, 1.5), PALETTE.roofSlate, 0, 4.8 + 0.75, 0);
  b.cyl(0.08, 0.14, 0.6, 6, PALETTE.gold, 0, 6.2, 0);
  b.sph(0.2, PALETTE.gold, 0, 6.9, 0, {}, 1);
  b.box(2.0, 0.5, 0.1, PALETTE.woodDark, 0, 2.7, 2.78);
  b.box(1.8, 0.34, 0.12, PALETTE.gold, 0, 2.78, 2.78);
  baguaDisc(b, 0, 7.3);
  bambooFence(b, -4.4, 3.6, -4.4, 9.0);
  bambooFence(b, 4.4, 3.6, 4.4, 9.0);
  bambooFence(b, -4.4, 9.0, -1.5, 9.0);
  bambooFence(b, 1.5, 9.0, 4.4, 9.0);
  [-1.55, 1.55].forEach(x => {
    b.cyl(0.1, 0.12, 1.5, 6, PALETTE.woodDark, x, 0, 9.0);
    b.sph(0.12, PALETTE.gold, x, 1.55, 9.0, {}, 0);
  });
  return b;
}
