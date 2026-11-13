import * as THREE from 'three';
import { groundHeight, mulberry32 } from './palette.ts';
import { pick } from './scenery.ts';
import type { Fx } from './particles.ts';

const WING_COLORS = [0xffa23a, 0xff6f91, 0x6ec6ff, 0xf7e04a, 0xc08cf5];
const COUNT = 14;

interface Flutter {
  root: THREE.Group;
  left: THREE.Mesh;
  right: THREE.Mesh;
  cx: number;
  cz: number;
  base: number;
  rx: number;
  rz: number;
  sx: number;
  sz: number;
  phase: number;
  speed: number;
}

function wingGeometry(side: 1 | -1): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(0.3, 0.24);
  geo.translate(side * 0.15, 0, 0);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

export function createButterflies(): Fx {
  const rand = mulberry32(77);
  const group = new THREE.Group();
  const leftGeo = wingGeometry(1);
  const rightGeo = wingGeometry(-1);
  const bodyGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 4).rotateX(Math.PI / 2);
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x3a2a24 });
  const wingMats = WING_COLORS.map(c => new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide }));
  const flutters: Flutter[] = [];
  for (let i = 0; i < COUNT; i++) {
    const c = pick(rand, 0.25, 0.75);
    const root = new THREE.Group();
    const mat = wingMats[i % wingMats.length];
    const left = new THREE.Mesh(leftGeo, mat);
    const right = new THREE.Mesh(rightGeo, mat);
    root.add(left, right, new THREE.Mesh(bodyGeo, bodyMat));
    root.scale.setScalar(0.9 + rand() * 0.5);
    group.add(root);
    flutters.push({
      root,
      left,
      right,
      cx: c.x,
      cz: c.z,
      base: groundHeight(c.x, c.z) + 1.0 + rand() * 0.9,
      rx: 1.8 + rand() * 2.4,
      rz: 1.8 + rand() * 2.4,
      sx: 0.25 + rand() * 0.25,
      sz: 0.2 + rand() * 0.25,
      phase: rand() * Math.PI * 2,
      speed: 14 + rand() * 6,
    });
  }
  const update = (_dt: number, time: number): void => {
    flutters.forEach(f => {
      const a = time * f.sx + f.phase;
      const b = time * f.sz + f.phase * 1.7;
      const x = f.cx + Math.sin(a) * f.rx;
      const z = f.cz + Math.cos(b) * f.rz;
      const dx = Math.cos(a) * f.rx * f.sx;
      const dz = -Math.sin(b) * f.rz * f.sz;
      f.root.position.set(x, f.base + Math.sin(time * 1.6 + f.phase) * 0.35, z);
      f.root.rotation.y = Math.atan2(dx, dz);
      const flap = Math.sin(time * f.speed + f.phase) * 0.9 + 0.3;
      f.left.rotation.z = flap;
      f.right.rotation.z = -flap;
    });
  };
  return { object: group, update };
}
