import * as THREE from 'three';
import { groundHeight, mulberry32 } from './palette.ts';
import { leafGeometry } from './particles.ts';
import type { Fx } from './particles.ts';

const COLORS: Record<TreeKind, number[]> = {
  blossom: [0xf3b6c6, 0xf7cbd5, 0xeaa3bb, 0xffd6e0],
  leafy: [0xa7d17a, 0xc4dc82, 0xe3d46e, 0xf0b25c],
  cypress: [0x5f9a6a, 0x78b27a, 0x4f8a5e],
};
const COUNT = 90;
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

interface Piece {
  active: boolean;
  delay: number;
  x: number;
  y: number;
  z: number;
  fall: number;
  phase: number;
  spin: number;
  rest: number;
}

export type TreeKind = 'blossom' | 'leafy' | 'cypress';

export interface TreeSpot {
  x: number;
  y: number;
  z: number;
  r: number;
  kind: TreeKind;
}

export interface LeafFall extends Fx {
  spawnCrown: (tree: TreeSpot, count: number) => void;
}

export function createLeafFall(): LeafFall {
  const rand = mulberry32(4242);
  const mesh = new THREE.InstancedMesh(leafGeometry(), new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), COUNT);
  mesh.frustumCulled = false;
  const color = new THREE.Color();
  const pieces: Piece[] = [];
  for (let i = 0; i < COUNT; i++) {
    pieces.push({ active: false, delay: 0, x: 0, y: 0, z: 0, fall: 1, phase: 0, spin: 1, rest: 0 });
    color.setHex(COLORS.leafy[0]);
    mesh.setColorAt(i, color);
    mesh.setMatrixAt(i, HIDDEN);
  }
  mesh.instanceMatrix.needsUpdate = true;
  const dummy = new THREE.Object3D();
  let cursor = 0;

  const spawnCrown = (tree: TreeSpot, count: number): void => {
    const palette = COLORS[tree.kind];
    for (let n = 0; n < count; n++) {
      const idx = cursor;
      const p = pieces[idx];
      cursor = (cursor + 1) % COUNT;
      color.setHex(palette[Math.floor(rand() * palette.length)]);
      mesh.setColorAt(idx, color);
      const a = rand() * Math.PI * 2;
      const rad = tree.r * (0.35 + rand() * 0.6);
      p.active = true;
      p.delay = rand() * 0.8;
      p.x = tree.x + Math.cos(a) * rad;
      p.z = tree.z + Math.sin(a) * rad;
      p.y = tree.y - tree.r * (0.1 + rand() * 0.45);
      p.fall = 0.7 + rand() * 0.5;
      p.phase = rand() * 6.28;
      p.spin = 2 + rand() * 3;
      p.rest = -1;
    }
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  };

  const update = (dt: number, time: number): void => {
    pieces.forEach((p, i) => {
      if (!p.active) {
        return;
      }
      if (p.delay > 0) {
        p.delay -= dt;
        return;
      }
      let scale = 1;
      if (p.rest >= 0) {
        p.rest += dt;
        scale = Math.max(0, 1 - Math.max(0, p.rest - 2) / 1.2);
        if (p.rest > 3.2) {
          p.active = false;
          mesh.setMatrixAt(i, HIDDEN);
          mesh.instanceMatrix.needsUpdate = true;
          return;
        }
      } else {
        const flutter = Math.sin(time * 2.6 + p.phase);
        p.x += flutter * 0.5 * dt;
        p.z += Math.cos(time * 2.1 + p.phase) * 0.4 * dt;
        p.y -= (p.fall + Math.abs(flutter) * 0.2) * dt;
        const floor = Math.max(0.06, groundHeight(p.x, p.z) + 0.05);
        if (p.y <= floor) {
          p.y = floor;
          p.rest = 0;
        }
      }
      dummy.position.set(p.x, p.y, p.z);
      if (p.rest >= 0) {
        dummy.rotation.set(-Math.PI / 2, 0, p.phase);
      } else {
        dummy.rotation.set(Math.sin(time * p.spin + p.phase) * 1.1, p.phase + time * 0.8, Math.cos(time * p.spin) * 0.9);
      }
      dummy.scale.setScalar(scale * 1.3);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.instanceMatrix.needsUpdate = true;
    });
  };

  return { object: mesh, update, spawnCrown };
}
