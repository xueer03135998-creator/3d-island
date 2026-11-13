import * as THREE from 'three';
import { Builder, getToonMaterial } from './builder.ts';
import { PALETTE, groundHeight, mulberry32 } from './palette.ts';
import type { BuildingEntry } from './buildings/index.ts';
import { isWater } from './walk.ts';

export const PLAZA_RADIUS = 4.2;
const STONE_COLORS = [0xece8de, 0xe1ddd1, 0xf3f0e7, 0xd8d5ca, 0xe8e1d2, 0xdfe2da];
/** 圆台中环与内圈：比草地深一点的绿色（衬托金色魔法阵纹路与中央兔子） */
const RING_GREEN = 0x6d9152;
const STONE_STEP = 1.12;
const STONE_LANE = 0.52;
const STONE_ASPECT: Array<[number, number]> = [[0.98, 0.68], [0.98, 0.68], [0.98, 0.68]];
const MOSS = 0x7fa05c;

function buildPlaza(): THREE.Mesh {
  const b = new Builder();
  b.cyl(PLAZA_RADIUS, PLAZA_RADIUS + 0.1, 0.2, 20, PALETTE.stone, 0, 0, 0);
  b.cyl(3.3, 3.3, 0.24, 20, PALETTE.stoneLilac, 0, 0, 0);
  b.cyl(3.0, 3.0, 0.26, 20, RING_GREEN, 0, 0, 0);
  b.cyl(1.2, 1.3, 0.3, 12, RING_GREEN, 0, 0, 0);
  const mesh = b.mesh();
  mesh.position.y = groundHeight(0, 0) - 0.04;
  return mesh;
}

type PathCurve = THREE.Curve<THREE.Vector3>;

function straightPath(from: THREE.Vector3, to: THREE.Vector3): PathCurve {
  return new THREE.LineCurve3(from, to);
}

interface Piece {
  m: THREE.Matrix4;
  c: THREE.Color;
}

function stoneGeo(seed: number, aspect: [number, number]): THREE.BufferGeometry {
  const rand = mulberry32(seed);
  const hx = aspect[0] / 2;
  const hz = aspect[1] / 2;
  const r = 0.07;
  const j = () => (rand() - 0.5) * 0.12;
  const c: Array<[number, number]> = [
    [-hx + j(), -hz + j()],
    [hx + j(), -hz + j()],
    [hx + j(), hz + j()],
    [-hx + j(), hz + j()],
  ];
  const shape = new THREE.Shape();
  c.forEach((pt, i) => {
    const prev = c[(i + 3) % 4];
    const next = c[(i + 1) % 4];
    const toward = (q: [number, number]): [number, number] => {
      const dx = q[0] - pt[0];
      const dz = q[1] - pt[1];
      const l = Math.hypot(dx, dz);
      return [pt[0] + (dx / l) * r, pt[1] + (dz / l) * r];
    };
    const a = toward(prev);
    const e = toward(next);
    if (i === 0) {
      shape.moveTo(a[0], a[1]);
    } else {
      shape.lineTo(a[0], a[1]);
    }
    shape.quadraticCurveTo(pt[0], pt[1], e[0], e[1]);
  });
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1, curveSegments: 3 });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, 0.035, 0);
  return geo;
}

const UP = new THREE.Vector3(0, 1, 0);

function stoneTransforms(curves: PathCurve[], variants: number): Piece[][] {
  const rand = mulberry32(31);
  const out: Piece[][] = Array.from({ length: variants }, () => []);
  const qYaw = new THREE.Quaternion();
  const qTilt = new THREE.Quaternion();
  const normal = new THREE.Vector3();
  curves.forEach(curve => {
    const len = curve.getLength();
    const rows = Math.max(3, Math.round(len / STONE_STEP));
    const tan = curve.getTangent(0.5);
    const yaw = Math.atan2(-tan.z, tan.x);
    qYaw.setFromAxisAngle(UP, yaw);
    for (let i = 0; i <= rows; i++) {
      [-1, 1].forEach((lane, li) => {
        const shift = (i + (li ? 0.5 : 0)) / (rows + 0.5);
        if (shift > 1) {
          return;
        }
        const p = curve.getPoint(shift);
        p.x += -tan.z * lane * STONE_LANE;
        p.z += tan.x * lane * STONE_LANE;
        const dhdx = (groundHeight(p.x + 0.3, p.z) - groundHeight(p.x - 0.3, p.z)) / 0.6;
        const dhdz = (groundHeight(p.x, p.z + 0.3) - groundHeight(p.x, p.z - 0.3)) / 0.6;
        normal.set(-dhdx, 1, -dhdz).normalize();
        qTilt.setFromUnitVectors(UP, normal);
        qTilt.multiply(qYaw);
        p.y = groundHeight(p.x, p.z) + 0.02;
        const m = new THREE.Matrix4().compose(p, qTilt, new THREE.Vector3(1, 1, 1));
        out[(i + li) % variants].push({ m, c: new THREE.Color(STONE_COLORS[Math.floor(rand() * STONE_COLORS.length)]) });
      });
    }
  });
  return out;
}

function doorCurves(buildings: BuildingEntry[]): PathCurve[] {
  return buildings.map(b => {
    const dir = new THREE.Vector3(b.doorPoint.x, 0, b.doorPoint.z).normalize();
    const from = dir.clone().multiplyScalar(PLAZA_RADIUS - 0.3);
    return straightPath(from, b.doorPoint.clone().setY(0));
  });
}

const EDGE_BLOOM = [0xf3b6c6, 0xfdf6e8, 0xc4b0e0, 0xffd873, 0xff9fb2];

function buildEdging(curves: PathCurve[]): THREE.Mesh {
  const rand = mulberry32(77);
  const b = new Builder();
  curves.forEach(curve => {
    const n = Math.round(curve.getLength() / 1.4);
    for (let i = 2; i < n - 1; i++) {
      const p = curve.getPoint(i / n);
      const tan = curve.getTangent(i / n);
      [-1, 1].forEach(side => {
        const x = p.x - tan.z * 1.35 * side;
        const z = p.z + tan.x * 1.35 * side;
        const y = groundHeight(x, z);
        if (y < 0.3 || isWater(x, z)) {
          return;
        }
        if (i % 2 === 0) {
          const h = 0.3 + rand() * 0.08;
          b.cyl(0.014, 0.014, h, 4, 0x7db56d, x, y, z);
          b.sph(0.085, EDGE_BLOOM[Math.floor(rand() * EDGE_BLOOM.length)], x, y + h, z, { sy: 0.8 }, 0);
        } else {
          b.sph(0.16, MOSS, x, y + 0.05, z, { sy: 0.7 }, 0);
        }
      });
    }
  });
  return b.mesh(undefined, false);
}

function buildInstanced(geo: THREE.BufferGeometry, items: Piece[]): THREE.InstancedMesh {
  const mat = getToonMaterial().clone();
  mat.vertexColors = false;
  const mesh = new THREE.InstancedMesh(geo, mat, items.length);
  items.forEach((it, i) => {
    mesh.setMatrixAt(i, it.m);
    mesh.setColorAt(i, it.c);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  return mesh;
}

function buildStones(curves: PathCurve[]): THREE.Group {
  const g = new THREE.Group();
  const geos = STONE_ASPECT.map((asp, i) => stoneGeo(5 + i * 17, asp));
  stoneTransforms(curves, geos.length).forEach((items, i) => {
    if (items.length) {
      g.add(buildInstanced(geos[i], items));
    }
  });
  return g;
}

export function createPaths(buildings: BuildingEntry[]): THREE.Group {
  const g = new THREE.Group();
  g.add(buildPlaza());
  const curves = doorCurves(buildings);
  g.add(buildStones(curves), buildEdging(curves));
  return g;
}
