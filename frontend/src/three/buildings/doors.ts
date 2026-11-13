import * as THREE from 'three';
import { Builder } from '../builder.ts';
import { PALETTE } from '../palette.ts';

export type DoorId = 'divination' | 'canteen' | 'archive' | 'heritage';

export interface DoorRig {
  group: THREE.Group;
  mouthZ: number;
  insideZ: number;
  setOpen: (k: number) => void;
}

interface Leaf {
  hingeX: number;
  dir: 1 | -1;
  z: number;
  open: number;
  build: (b: Builder, w: number) => void;
  w: number;
}

function plank(color: number, h: number, y0: number, knobAt: number, knobY: number): (b: Builder, w: number) => void {
  return (b, w) => {
    b.box(w, h, 0.08, color, w / 2, y0, 0);
    b.sph(0.06, PALETTE.gold, knobAt, knobY, 0.07, {}, 0);
  };
}

function heritageLeaf(inner: number): (b: Builder, w: number) => void {
  return (b, w) => {
    b.box(w, 2.1, 0.08, PALETTE.woodLight, w / 2, 0.5, 0);
    [0.9, 1.5, 2.1].forEach(y => b.box(w, 0.05, 0.1, PALETTE.woodDark, w / 2, y, 0.02));
    [0.2, 0.5, 0.8].forEach(x => b.box(0.05, 2.1, 0.1, PALETTE.woodDark, w * x * 1.2, 0.5, 0.02));
    b.sph(0.06, PALETTE.gold, inner, 1.3, 0.08, {}, 0);
  };
}

function gateLeaf(b: Builder, w: number): void {
  [0.45, 0.85].forEach(y => b.box(w, 0.07, 0.07, PALETTE.woodLight, w / 2, y, 0));
  for (let i = 0; i <= 6; i++) {
    b.cyl(0.05, 0.06, 1.05 + (i % 3) * 0.06, 5, PALETTE.bamboo, (w * i) / 6, 0.05, 0);
  }
}

const LEAVES: Record<DoorId, Leaf[]> = {
  divination: [
    { hingeX: -1.5, dir: 1, z: 9.0, open: 1.6, w: 1.45, build: gateLeaf },
    { hingeX: 1.5, dir: -1, z: 9.0, open: -1.6, w: 1.45, build: gateLeaf },
  ],
  canteen: [{ hingeX: -0.65, dir: 1, z: 2.88, open: -1.75, w: 1.3, build: plank(PALETTE.woodMid, 2.2, 0.3, 1.05, 1.3) }],
  archive: [{ hingeX: -0.65, dir: 1, z: 3.27, open: -1.75, w: 1.3, build: plank(PALETTE.woodDark, 2.1, 0.35, 1.1, 1.3) }],
  heritage: [
    { hingeX: -0.97, dir: 1, z: 2.66, open: -1.75, w: 0.95, build: heritageLeaf(0.84) },
    { hingeX: 0.97, dir: -1, z: 2.66, open: 1.75, w: 0.95, build: heritageLeaf(0.84) },
  ],
};

const DEPTH: Record<DoorId, { mouthZ: number; insideZ: number }> = {
  divination: { mouthZ: 9.0, insideZ: 6.4 },
  canteen: { mouthZ: 2.9, insideZ: 1.6 },
  archive: { mouthZ: 3.3, insideZ: 2.0 },
  heritage: { mouthZ: 2.7, insideZ: 1.4 },
};

export function createDoor(id: DoorId): DoorRig {
  const group = new THREE.Group();
  const pivots = LEAVES[id].map(leaf => {
    const pivot = new THREE.Group();
    pivot.position.set(leaf.hingeX, 0, leaf.z);
    const b = new Builder();
    leaf.build(b, leaf.w);
    const mesh = b.mesh();
    mesh.scale.x = leaf.dir;
    pivot.add(mesh);
    group.add(pivot);
    return { pivot, open: leaf.open };
  });
  return {
    group,
    ...DEPTH[id],
    setOpen: k => {
      const e = Math.min(1, Math.max(0, k));
      pivots.forEach(p => {
        p.pivot.rotation.y = p.open * e;
      });
    },
  };
}
