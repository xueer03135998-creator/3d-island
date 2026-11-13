import * as THREE from 'three';
import { groundHeight, mulberry32 } from './palette.ts';

export interface Fx {
  object: THREE.Object3D;
  update: (dt: number, time: number) => void;
}

export interface FxEnv {
  wind: THREE.Vector2;
  night: number;
  rain: number;
}

const LEAF_COLORS = [0xa7d17a, 0xc4dc82, 0xe3d46e, 0xf0b25c, 0xe58f6a, 0xf3b6c6];
const LEAF_COUNT = 90;

export function leafGeometry(): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.13, 0, 0.075, 0, 0, 0, -0.13, 0, -0.075, 0, 0], 3));
  g.setIndex([0, 2, 1, 0, 3, 2]);
  g.computeVertexNormals();
  return g;
}

interface Leaf {
  x: number;
  y: number;
  z: number;
  fall: number;
  phase: number;
  spin: number;
  rest: number;
}

export function createLeaves(sources: THREE.Vector3[], env: FxEnv): Fx {
  const rand = mulberry32(909);
  const mat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(leafGeometry(), mat, LEAF_COUNT);
  mesh.frustumCulled = false;
  const color = new THREE.Color();
  const leaves: Leaf[] = [];
  const spawn = (l: Leaf, scatter: boolean): void => {
    const s = sources[Math.floor(rand() * sources.length)];
    l.x = s.x + (rand() - 0.5) * 3;
    l.z = s.z + (rand() - 0.5) * 3;
    l.y = scatter ? 0.5 + rand() * (s.y + 1) : s.y + rand() * 1.5;
    l.fall = 0.35 + rand() * 0.45;
    l.phase = rand() * 6.28;
    l.spin = 1.5 + rand() * 3;
    l.rest = -1;
  };
  for (let i = 0; i < LEAF_COUNT; i++) {
    const leaf: Leaf = { x: 0, y: 0, z: 0, fall: 0, phase: 0, spin: 0, rest: -1 };
    spawn(leaf, true);
    leaves.push(leaf);
    color.setHex(LEAF_COLORS[Math.floor(rand() * LEAF_COLORS.length)]);
    mesh.setColorAt(i, color);
  }
  const dummy = new THREE.Object3D();
  return {
    object: mesh,
    update: (dt, time) => {
      leaves.forEach((l, i) => {
        let scale = 1;
        if (l.rest >= 0) {
          l.rest += dt;
          scale = Math.max(0, 1 - l.rest / 3.5);
          if (l.rest > 3.5) {
            spawn(l, false);
          }
        } else {
          const flutter = Math.sin(time * 2.1 + l.phase);
          l.x += (env.wind.x * 1.7 + flutter * 0.55) * dt;
          l.z += (env.wind.y * 1.7 + Math.cos(time * 1.7 + l.phase) * 0.45) * dt;
          l.y -= (l.fall + Math.abs(flutter) * 0.18) * dt;
          const floor = Math.max(0.06, groundHeight(l.x, l.z) + 0.05);
          if (l.y <= floor) {
            l.y = floor;
            l.rest = 0;
          }
        }
        dummy.position.set(l.x, l.y, l.z);
        const resting = l.rest >= 0;
        dummy.rotation.set(resting ? -Math.PI / 2 : time * l.spin * 0.6 + l.phase, l.phase + (resting ? 0 : time * 0.8), resting ? 0 : Math.sin(time * l.spin) * 0.8);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

interface Bird {
  group: THREE.Group;
  wingL: THREE.Mesh;
  wingR: THREE.Mesh;
  radius: number;
  height: number;
  speed: number;
  phase: number;
}

function wingGeometry(side: number): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.18, 0, 0, -0.14, side * 0.9, 0.05, -0.06], 3));
  g.computeVertexNormals();
  return g;
}

export function createBirds(env: FxEnv): Fx {
  const rand = mulberry32(31);
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xf4f1ee });
  const birds: Bird[] = [];
  for (let i = 0; i < 7; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), bodyMat);
    body.scale.set(0.8, 0.7, 1.5);
    const wingL = new THREE.Mesh(wingGeometry(-1), mat);
    const wingR = new THREE.Mesh(wingGeometry(1), mat);
    g.add(body, wingL, wingR);
    g.scale.setScalar(1.6);
    group.add(g);
    birds.push({ group: g, wingL, wingR, radius: 34 + rand() * 30, height: 15 + rand() * 9, speed: (0.07 + rand() * 0.05) * (i % 2 ? 1 : -1), phase: rand() * 6.28 });
  }
  return {
    object: group,
    update: (_dt, time) => {
      const vis = (1 - env.night) * (1 - env.rain);
      group.visible = vis > 0.05;
      birds.forEach(b => {
        const a = b.phase + time * b.speed;
        const x = Math.cos(a) * b.radius;
        const z = Math.sin(a) * b.radius;
        b.group.position.set(x, b.height + Math.sin(time * 0.8 + b.phase) * 1.2, z);
        b.group.rotation.y = Math.atan2(-Math.sin(a) * Math.sign(b.speed), Math.cos(a) * Math.sign(b.speed));
        const flap = Math.sin(time * 7 + b.phase * 3) * 0.55;
        b.wingL.rotation.z = flap;
        b.wingR.rotation.z = -flap;
        b.group.scale.setScalar(1.6 * Math.min(1, vis * 2));
      });
    },
  };
}
