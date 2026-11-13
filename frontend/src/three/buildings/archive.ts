import { Builder } from '../builder.ts';
import { PALETTE } from '../palette.ts';
import { hipGeometry } from '../shapes.ts';

const FRAME = 0x3f3b52;
const BOOKS = [0xe0a38c, 0x9bbbd9, 0xc4b0e0, 0xf2c97c];

function windowAt(b: Builder, pos: number, y: number, side: 'front' | 'left' | 'right'): void {
  if (side === 'front') {
    b.box(1.4, 1.75, 0.1, FRAME, pos, y - 0.12, 3.1);
    b.box(1.2, 1.5, 0.12, PALETTE.glassDark, pos, y, 3.13);
    b.box(1.2, 0.08, 0.14, PALETTE.glass, pos, y + 0.7, 3.14);
    return;
  }
  const x = side === 'left' ? -3.5 : 3.5;
  const dir = side === 'left' ? -1 : 1;
  b.box(0.1, 1.75, 1.4, FRAME, x, y - 0.12, pos);
  b.box(0.12, 1.5, 1.2, PALETTE.glassDark, x + dir * 0.03, y, pos);
  b.box(0.14, 0.08, 1.2, PALETTE.glass, x + dir * 0.04, y + 0.7, pos);
}

export function buildArchive(): Builder {
  const b = new Builder();
  b.box(7.5, 0.35, 6.7, PALETTE.stone, 0, 0, 0);
  b.box(7, 6.4, 6.2, 0xf4efe4, 0, 0.35, 0);
  [-1, 1].forEach(sx => {
    [-1, 1].forEach(sz => {
      b.box(0.4, 6.5, 0.4, PALETTE.stoneLilac, sx * 3.5, 0.35, sz * 3.1);
    });
  });
  b.box(7.3, 0.28, 6.5, PALETTE.stoneLilac, 0, 3.55, 0);
  b.box(7.3, 0.3, 6.5, PALETTE.stoneLilac, 0, 6.6, 0);
  b.add(hipGeometry(4.05, 3.75, 1.2), PALETTE.roofSlate, 0, 6.9 + 0.6, 0);
  b.box(1.2, 0.5, 1.2, PALETTE.glass, 0, 8.1, 0);
  b.box(1.4, 0.15, 1.4, PALETTE.roofSlate, 0, 8.6, 0);
  [-2.2, 2.2].forEach(x => windowAt(b, x, 1.6, 'front'));
  [-2.2, 0, 2.2].forEach(x => windowAt(b, x, 4.6, 'front'));
  [-1.3, 1.3].forEach(z => {
    [1.6, 4.6].forEach(y => {
      windowAt(b, z, y, 'left');
      windowAt(b, z, y, 'right');
    });
  });
  b.box(1.5, 2.4, 0.14, FRAME, 0, 0.35, 3.12);
  b.box(1.3, 2.1, 0.16, 0x2f2838, 0, 0.35, 3.15);
  b.box(2.8, 0.16, 1.4, FRAME, 0, 2.95, 3.75);
  [-1.2, 1.2].forEach(x => b.cyl(0.08, 0.08, 2.6, 6, PALETTE.stoneLilac, x, 0.35, 4.3));
  b.box(3.2, 0.2, 1.1, PALETTE.stone, 0, 0.0, 4.35);
  b.box(2.8, 0.14, 0.8, PALETTE.stone, 0, 0.0, 5.1);
  b.box(1.0, 0.4, 0.7, 0xe8e2f0, 3.0, 0, 4.4);
  BOOKS.forEach((c, i) => {
    b.box(0.7, 0.12, 0.5, c, 3.0, 0.4 + i * 0.12, 4.4, { ry: (i - 1.5) * 0.18 });
  });
  [-3.3, 3.3].forEach(x => {
    b.cyl(0.35, 0.28, 0.5, 6, PALETTE.stoneWarm, x, 0, 3.8);
    b.sph(0.55, PALETTE.leafDark, x, 1.05, 3.8, {}, 1);
  });
  b.box(0.12, 1.3, 0.12, PALETTE.woodDark, -3.7, 0, 5.4);
  b.box(1.1, 0.7, 0.1, PALETTE.cream, -3.7, 1.2, 5.4);
  return b;
}
