import * as THREE from 'three';
import { Builder } from './builder.ts';

const INK = 0x14100e;
const EYE = 0x120d12;
const BLUSH = 0xf4a6ae;
const BLUSH_DARK = 0xe58290;
const CREAM: [number, number, number] = [245 / 255, 233 / 255, 198 / 255];

const BROW_PTS: Array<[number, number]> = [
  [0.173, 0.055],
  [0.136, 0.11],
  [0.109, 0.125],
  [0.078, 0.138],
];
const MOUTH_PTS: Array<[number, number]> = [
  [-0.034, -0.096],
  [-0.024, -0.109],
  [-0.012, -0.108],
  [0, -0.097],
  [0.012, -0.108],
  [0.024, -0.109],
  [0.034, -0.096],
];

interface Surface {
  z: number;
  yaw: number;
}

const ray = new THREE.Raycaster();

function scrubPaint(root: THREE.Object3D): void {
  root.traverse(o => {
    const m = o as THREE.Mesh;
    const col = m.isMesh ? (m.geometry.getAttribute('color') as THREE.BufferAttribute | undefined) : undefined;
    if (!col) {
      return;
    }
    const pos = m.geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      if (pos.getZ(i) < -0.12 || Math.abs(x) > 0.3 || y < -0.2 || y > 0.16) {
        continue;
      }
      const d = Math.abs(col.getX(i) - CREAM[0]) + Math.abs(col.getY(i) - CREAM[1]) + Math.abs(col.getZ(i) - CREAM[2]);
      if (d > 0.12) {
        col.setXYZW(i, CREAM[0], CREAM[1], CREAM[2], 1);
      }
    }
    col.needsUpdate = true;
  });
}

function surfaceAt(root: THREE.Object3D, x: number, y: number): Surface {
  ray.set(new THREE.Vector3(x, y, 1), new THREE.Vector3(0, 0, -1));
  const hit = ray.intersectObject(root, true)[0];
  if (!hit) {
    return { z: -0.01, yaw: 0 };
  }
  const n = hit.face ? hit.face.normal : new THREE.Vector3(0, 0, 1);
  return { z: hit.point.z, yaw: Math.atan2(n.x, n.z) };
}

function tube(b: Builder, root: THREE.Object3D, pts: Array<[number, number]>, radius: number, sx: number, lift: number): void {
  const v = pts.map(([px, py]) => new THREE.Vector3(px * sx, py, surfaceAt(root, px * sx, py).z + lift));
  const curve = new THREE.CatmullRomCurve3(v);
  b.add(new THREE.TubeGeometry(curve, 14, radius, 5, false), INK, 0, 0, 0, {});
}

function eye(root: THREE.Object3D, side: number): THREE.Mesh {
  const cx = side * 0.099;
  const cy = -0.022;
  const s = surfaceAt(root, cx, cy);
  const e = new Builder();
  e.sph(1, EYE, 0, 0, 0, { sx: 0.045, sy: 0.05, sz: 0.012 }, 2);
  e.sph(1, 0xffffff, -0.012, 0.016, 0.0075, { sx: 0.014, sy: 0.015, sz: 0.005 }, 2);
  e.sph(1, 0xffffff, 0.014, -0.017, 0.0075, { sx: 0.006, sy: 0.006, sz: 0.004 }, 1);
  const m = e.mesh();
  m.position.set(cx, cy, s.z - 0.004);
  m.rotation.y = s.yaw;
  return m;
}

function cheek(root: THREE.Object3D, side: number): THREE.Mesh {
  const cx = side * 0.197;
  const cy = -0.093;
  const s = surfaceAt(root, cx, cy);
  const c = new Builder();
  c.sph(1, BLUSH, 0, 0, 0, { sx: 0.058, sy: 0.04, sz: 0.006 }, 2);
  [-0.025, 0, 0.025].forEach(dx => {
    c.box(0.006, 0.028, 0.004, BLUSH_DARK, dx, -0.014, 0.005, { rz: 0.5 });
  });
  const m = c.mesh();
  m.position.set(cx, cy, s.z - 0.002);
  m.rotation.y = s.yaw;
  return m;
}

function faceLines(root: THREE.Object3D): THREE.Mesh {
  const f = new Builder();
  [-1, 1].forEach(side => tube(f, root, BROW_PTS, 0.007, side, 0.0015));
  tube(f, root, MOUTH_PTS, 0.0062, 1, 0.0015);
  tube(
    f,
    root,
    [
      [0, -0.082],
      [0, -0.09],
      [0, -0.097],
    ],
    0.005,
    1,
    0.0015
  );
  return f.mesh();
}

export function addUsagiFace(root: THREE.Object3D): void {
  root.updateMatrixWorld(true);
  scrubPaint(root);
  const parts = [eye(root, 1), eye(root, -1), cheek(root, 1), cheek(root, -1), faceLines(root)];
  parts.forEach(p => {
    p.castShadow = false;
    root.add(p);
  });
}
