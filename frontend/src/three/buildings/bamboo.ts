import { Builder } from '../builder.ts';
import { PALETTE, mulberry32 } from '../palette.ts';

export function bambooGrove(seed: number, count: number, rx: number, rz: number): Builder {
  const rand = mulberry32(seed);
  const b = new Builder();
  const placed: Array<[number, number]> = [];
  let guard = 0;
  while (placed.length < count && guard++ < 400) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand());
    const x = Math.cos(a) * r * rx;
    const z = Math.sin(a) * r * rz;
    if (placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < 0.55)) {
      continue;
    }
    placed.push([x, z]);
    const h = 4.2 + rand() * 2.6;
    const lx = (rand() - 0.5) * 0.1;
    const lz = (rand() - 0.5) * 0.1;
    const seg = 3;
    for (let s = 0; s < seg; s++) {
      const y0 = (s / seg) * h;
      const sh = h / seg;
      const bend = (px: number): number => px * (y0 + sh / 2);
      b.cyl(0.085, 0.095, sh, 6, s % 2 ? PALETTE.bamboo : 0xb4d694, x + bend(lx), y0, z + bend(lz), {
        rx: lz * 0.9,
        rz: -lx * 0.9,
      });
      b.cyl(0.115, 0.115, 0.06, 6, 0x93b873, x + bend(lx), y0 + sh - 0.03, z + bend(lz));
    }
    const tx = x + lx * h;
    const tz = z + lz * h;
    for (let k = 0; k < 4; k++) {
      const a2 = k * 1.7 + rand();
      const y = h - 0.2 - k * 0.55;
      b.cone(0.5, 1.4, 4, k % 2 ? PALETTE.bambooLeaf : 0x9fd391, tx + Math.cos(a2) * 0.5, y, tz + Math.sin(a2) * 0.5, {
        rz: Math.cos(a2) * 0.9,
        rx: -Math.sin(a2) * 0.9,
        ry: a2,
      });
    }
  }
  return b;
}
