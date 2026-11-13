import * as THREE from 'three';
import { Builder, getSwayMaterial } from './builder.ts';
import type { Collider } from './buildings/index.ts';
import { BUILDING_SITES, PALETTE, SEA_LEVEL, groundHeight, mulberry32 } from './palette.ts';
import { isClear, pick } from './scenery.ts';
import { PIER_LEN, PIER_START, PIER_TOP } from './walk.ts';

const BOAT_X = 1.65;
const BOAT_YAW = 0.12;

export interface ExtrasEnv {
  night: number;
  rain: number;
}

export interface Extras {
  group: THREE.Group;
  boats: THREE.Object3D[];
  rowboat: THREE.Object3D;
  rowCollider: Collider;
  colliders: Collider[];
  update: (dt: number, time: number) => void;
}

function glowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,240,190,1)');
    g.addColorStop(0.25, 'rgba(255,214,130,0.55)');
    g.addColorStop(1, 'rgba(255,200,110,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function lampPost(b: Builder, x: number, z: number): THREE.Vector3 {
  const y = groundHeight(x, z);
  b.cyl(0.06, 0.09, 2.3, 6, PALETTE.woodDark, x, y, z);
  b.box(0.34, 0.06, 0.34, PALETTE.woodDark, x, y + 2.3, z);
  b.box(0.26, 0.3, 0.26, 0xfff0c0, x, y + 2.36, z);
  b.cone(0.28, 0.2, 4, PALETTE.woodDark, x, y + 2.66, z, { ry: Math.PI / 4 });
  return new THREE.Vector3(x, y + 2.5, z);
}

function pier(b: Builder): THREE.Vector3 {
  for (let i = 0; i < PIER_LEN; i++) {
    const z = -(PIER_START + i * 1.0);
    b.box(1.9, 0.12, 0.92, i % 2 ? 0xc9a77e : 0xd8b88c, 0, PIER_TOP - 0.12, z - 0.5);
  }
  for (let i = 0; i < PIER_LEN; i += 2) {
    const z = -(PIER_START + i * 1.0) - 0.5;
    b.cyl(0.1, 0.1, 1.5, 6, PALETTE.woodDark, -0.9, -0.5, z);
    b.cyl(0.1, 0.1, 1.5, 6, PALETTE.woodDark, 0.9, -0.5, z);
  }
  const endZ = -(PIER_START + PIER_LEN) + 0.4;
  b.cyl(0.07, 0.07, 1.0, 6, PALETTE.woodDark, 0.9, 0.5, endZ);
  b.cyl(0.07, 0.07, 1.0, 6, PALETTE.woodDark, -0.9, 0.5, endZ);
  b.cyl(0.018, 0.018, 0.8, 5, 0xd8c7a0, 0.92, 0.82, endZ + 0.55, { rz: -Math.PI / 2 });
  return new THREE.Vector3(BOAT_X, 0, -(PIER_START + PIER_LEN - 2));
}

function hullGeo(hw: number, len: number, y0: number, y1: number, holeHw = 0): THREE.BufferGeometry {
  const trace = (p: THREE.Path, w: number, l: number): void => {
    p.moveTo(0, l);
    p.quadraticCurveTo(w * 0.9, l * 0.4, w, -l * 0.15);
    p.quadraticCurveTo(w, -l * 0.7, w * 0.72, -l);
    p.lineTo(-w * 0.72, -l);
    p.quadraticCurveTo(-w, -l * 0.7, -w, -l * 0.15);
    p.quadraticCurveTo(-w * 0.9, l * 0.4, 0, l);
  };
  const shape = new THREE.Shape();
  trace(shape, hw, len);
  if (holeHw > 0) {
    const hole = new THREE.Path();
    trace(hole, holeHw, len - (hw - holeHw) * 1.4);
    shape.holes.push(hole);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false, curveSegments: 6 });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, y1, 0);
  return geo;
}

function rowboat(): THREE.Group {
  const b = new Builder();
  const hw = 0.56;
  const len = 1.45;
  const wood = 0xcfa87c;
  const woodDark = 0x9b7a56;
  b.add(hullGeo(hw * 0.62, len * 0.9, 0, 0.14), 0x8a6a4a, 0, 0, 0);
  b.add(hullGeo(hw * 0.86, len * 0.97, 0.14, 0.3), 0x6fb3c8, 0, 0, 0);
  b.add(hullGeo(hw, len, 0.3, 0.45, hw - 0.1), 0xf4eee0, 0, 0, 0);
  b.add(hullGeo(hw + 0.015, len + 0.015, 0.45, 0.5, hw - 0.11), woodDark, 0, 0, 0);
  b.add(hullGeo(hw - 0.1, len - 0.15, 0.3, 0.33), wood, 0, 0, 0);
  [1.0, 0.96, 0.58].forEach((w, i) => {
    const z = [-0.55, 0.1, 0.75][i];
    b.box(w, 0.05, 0.22, 0xb98f63, 0, 0.36, z);
    [-1, 1].forEach(side => b.box(0.07, 0.07, 0.16, woodDark, side * (w / 2 - 0.1), 0.3, z));
  });
  b.cone(0.1, 0.34, 4, woodDark, 0, 0.32, len - 0.12, { rx: 0.5, ry: Math.PI / 4 });
  b.box(0.3, 0.1, 0.06, woodDark, 0, 0.4, -len + 0.08);
  const drop = Math.tan(0.12);
  [-1, 1].forEach(side => {
    const yAt = (x: number): number => 0.64 - (x - 0.2) * drop;
    b.cyl(0.028, 0.028, 1.4, 5, wood, side * 0.2, 0.64, 0.1, { rz: -side * (Math.PI / 2 + 0.12) });
    b.box(0.42, 0.03, 0.15, wood, side * 1.3, yAt(1.3) - 0.015, 0.1, { rz: -side * 0.12 });
    [0.045, 0.155].forEach(z => b.cyl(0.018, 0.018, 0.2, 5, woodDark, side * 0.52, 0.45, z));
  });
  const g = new THREE.Group();
  g.add(b.mesh());
  return g;
}

function sailboat(): THREE.Group {
  const b = new Builder();
  b.box(1.5, 0.55, 4.0, 0xf6efe0, 0, -0.1, 0);
  b.box(1.4, 0.12, 3.8, 0x9fb4d6, 0, 0.42, 0);
  b.cone(0.75, 1.6, 4, 0xf6efe0, 0, -0.1, 2.5, { rx: Math.PI / 2, ry: Math.PI / 4, sx: 0.9, sy: 0.9, sz: 0.6 });
  b.cyl(0.07, 0.07, 5.2, 6, PALETTE.woodDark, 0, 0.4, 0.2);
  b.cone(1.5, 4.4, 3, 0xfffaf0, 0, 0.9, -0.2, { sz: 0.05, ry: Math.PI / 2 });
  b.cone(1.0, 2.8, 3, 0xf3b6c6, 0, 0.9, 1.2, { sz: 0.05, ry: Math.PI / 2 });
  const g = new THREE.Group();
  g.add(b.mesh());
  return g;
}

const GRASS = [0x8fc07a, 0xa6d084, 0x7db56d, 0xbddb8f];
const GRASS_ROOT = [0x5f9a52, 0x6aa35c];
const BLOOM = [0xf3b6c6, 0xfdf6e8, 0xc4b0e0, 0xffd873];

/** 单根草叶：根部收紧、中段最宽、叶尖收拢，上段向外弯曲（与全岛草丛同形态）。 */
function bladeGeo(h: number, lean: number): THREE.BufferGeometry {
  const widths = [0.014, 0.07, 0.04, 0.0];
  const pos: number[] = [];
  const idx: number[] = [];
  for (let r = 0; r < 4; r++) {
    const t = r / 3;
    const bend = Math.pow(t, 1.6) * lean * h;
    const y = t * h;
    const w = widths[r];
    pos.push(bend, y, w, bend, y, -w);
  }
  for (let r = 0; r < 3; r++) {
    const a0 = r * 2;
    const a1 = r * 2 + 1;
    const b0 = (r + 1) * 2;
    const b1 = (r + 1) * 2 + 1;
    idx.push(a0, b0, a1, a1, b0, b1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function grass(doors: THREE.Vector3[]): THREE.Mesh {
  const rand = mulberry32(808);
  const b = new Builder();
  let placed = 0;
  for (let guard = 0; placed < 170 && guard < 2400; guard++) {
    const p = pick(rand, 0.12, 0.9);
    if (!isClear(p.x, p.z, doors, 0.2)) {
      continue;
    }
    placed++;
    const y = groundHeight(p.x, p.z);
    const s = 0.75 + rand() * 0.7;
    // 每丛 8 片扇形草叶：围绕圆心、高度/外倾对称起伏
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const h = (0.42 + 0.22 * (0.5 + 0.5 * Math.sin(k * 2.1 + 1.3))) * s;
      const lean = 0.22 + 0.12 * (0.5 + 0.5 * Math.sin(k * 1.7 + 2.7));
      const c = rand() > 0.55 ? GRASS[Math.floor(rand() * GRASS.length)] : GRASS_ROOT[Math.floor(rand() * GRASS_ROOT.length)];
      b.add(bladeGeo(h, lean), c, p.x, y - 0.02, p.z, { ry: a });
    }
    if (rand() > 0.82) {
      const fx = p.x + 0.25;
      b.cyl(0.015, 0.015, 0.4 * s, 4, 0x7db56d, fx, y, p.z);
      b.sph(0.09, BLOOM[Math.floor(rand() * BLOOM.length)], fx, y + 0.45 * s, p.z, { sy: 0.8 }, 0);
    }
  }
  return b.mesh(getSwayMaterial(), false);
}

function islets(): THREE.Mesh {
  const rand = mulberry32(64);
  const b = new Builder();
  const spots: Array<[number, number, number]> = [
    [135, -70, 1.0],
    [110, 135, 1.7],
    [-95, 140, 1.1],
  ];
  spots.forEach(([x, z, s]) => {
    b.sph(5 * s, PALETTE.rock, x, -0.6, z, { sy: 0.5, sx: 1.2 }, 1);
    b.sph(3.6 * s, 0xc9dca0, x, 0.6, z, { sy: 0.35 }, 1);
    b.cone(0.9 * s, 3.4 * s, 7, PALETTE.cypress, x + 0.6 * s, 1.2, z - 0.4 * s);
    if (rand() > 0.4) {
      b.sph(1.1 * s, 0xb4d68a, x - 1.4 * s, 2.0, z + 0.6 * s, { sy: 0.9 }, 1);
      b.cyl(0.12, 0.16, 1.2 * s, 5, PALETTE.woodDark, x - 1.4 * s, 0.8, z + 0.6 * s);
    }
  });
  return b.mesh(undefined, false);
}

export function createExtras(env: ExtrasEnv, doors: THREE.Vector3[]): Extras {
  const group = new THREE.Group();
  const lamps = new Builder();
  const glowAt: THREE.Vector3[] = [];
  const colliders: Collider[] = [];

  doors.forEach((d, i) => {
    const site = BUILDING_SITES[i];
    const len = Math.hypot(d.x - site.x, d.z - site.z);
    const dx = (d.x - site.x) / len;
    const dz = (d.z - site.z) / len;
    // 食堂门前有遮阳伞，路灯外移避开伞檐（其余建筑保持原距离）
    const push = site.id === 'canteen' ? 3.2 : 1.0;
    [-2.5, 2.5].forEach(side => {
      const lx = d.x - dx * push - dz * side;
      const lz = d.z - dz * push + dx * side;
      glowAt.push(lampPost(lamps, lx, lz));
      colliders.push({ x: lx, z: lz, r: 0.14 });
    });
  });
  const pierEnd = pier(lamps);
  colliders.push({ x: 0.9, z: -(PIER_START + PIER_LEN) + 0.4, r: 0.08 }, { x: -0.9, z: -(PIER_START + PIER_LEN) + 0.4, r: 0.08 });
  group.add(lamps.mesh(), grass(doors), islets());

  const row = rowboat();
  row.position.set(pierEnd.x, SEA_LEVEL + 0.04, pierEnd.z);
  row.rotation.y = BOAT_YAW;
  const rowCollider: Collider = { x: pierEnd.x, z: pierEnd.z, r: 0, hx: 0.6, hz: 1.45, rot: BOAT_YAW };
  colliders.push(rowCollider);
  const sail = sailboat();
  group.add(row, sail);
  row.userData.egg = 'boat';
  sail.userData.egg = 'boat';
  const boats: THREE.Object3D[] = [row, sail];
  const wobble = (b: THREE.Object3D, dt: number, time: number): number => {
    const w = Math.max(0, (b.userData.wob as number | undefined) ?? 0);
    if (w > 0) {
      b.userData.wob = Math.max(0, w - dt * 0.7);
    }
    return w * Math.sin(time * 9) * 0.22;
  };

  const tex = glowTexture();
  const poolGeo = new THREE.PlaneGeometry(1, 1);
  poolGeo.rotateX(-Math.PI / 2);
  const finePointer =
    typeof window.matchMedia === 'function' && !window.matchMedia('(pointer: coarse)').matches;
  const glows = glowAt.map(p => {
    const mat = new THREE.SpriteMaterial({
      map: tex,
      color: 0xffe2a0,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
      opacity: 0,
    });
    const s = new THREE.Sprite(mat);
    s.position.copy(p);
    s.scale.setScalar(1.0);
    s.renderOrder = 20;
    const poolMat = new THREE.MeshBasicMaterial({
      map: tex,
      color: 0xffd48a,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
      opacity: 0,
    });
    const pool = new THREE.Mesh(poolGeo, poolMat);
    pool.position.set(p.x, groundHeight(p.x, p.z) + 0.07, p.z);
    pool.scale.setScalar(2.3);
    pool.renderOrder = 6;
    const light = new THREE.PointLight(0xffc46a, 0, 26, 2);
    light.position.copy(p);
    group.add(s, pool, light);
    return { mat, poolMat, light, phase: Math.random() * 6 };
  });

  return {
    group,
    boats,
    rowboat: row,
    rowCollider,
    colliders,
    update: (dt, time) => {
      const k = Math.min(1, env.night * 1.4) * (1 - env.rain * 0.3);
      glows.forEach(g => {
        const flick = 0.9 + 0.1 * Math.sin(time * 3 + g.phase);
        g.mat.opacity = k * 0.55 * flick;
        g.poolMat.opacity = k * 0.42 * flick;
        g.light.intensity = finePointer ? k * 9 * flick : 0;
      });
      const rw = wobble(row, dt, time);
      row.position.y = SEA_LEVEL + 0.04 + Math.sin(time * 1.3) * 0.07 + Math.abs(rw) * 0.3;
      row.rotation.z = Math.sin(time * 1.1) * 0.05 + rw;
      row.rotation.x = Math.sin(time * 0.9 + 1) * 0.03;
      const a = time * 0.028;
      const r = 88;
      const sw = wobble(sail, dt, time);
      sail.position.set(Math.cos(a) * r, SEA_LEVEL + 0.1 + Math.sin(time * 1.2) * 0.12 + Math.abs(sw) * 0.3, Math.sin(a) * r);
      sail.rotation.y = -a;
      sail.rotation.z = Math.sin(time * 0.9) * 0.06 + sw;
      sail.rotation.x = Math.sin(time * 0.7) * 0.04;
    },
  };
}
