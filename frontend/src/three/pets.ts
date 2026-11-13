import * as THREE from 'three';
import { Builder } from './builder.ts';
import type { Collider } from './buildings/index.ts';
import { groundHeight, mulberry32 } from './palette.ts';
import type { Fx } from './particles.ts';
import { isWater } from './walk.ts';

export interface PetPoint {
  x: number;
  z: number;
}

export interface Pets extends Fx {
  targets: THREE.Object3D[];
  react: (index: number) => void;
  positionOf: (index: number) => THREE.Vector3;
}

type Kind = 'cat' | 'dog';
type Mode = 'idle' | 'wander' | 'chase' | 'orbit' | 'fetch';

interface Look {
  kind: Kind;
  fur: number;
  belly: number;
  ear: number;
  scale: number;
}

const LOOKS: Look[] = [
  { kind: 'cat', fur: 0xf3a45a, belly: 0xfff1de, ear: 0xffb6a0, scale: 1 },
  { kind: 'cat', fur: 0x8c93a6, belly: 0xf2f4f8, ear: 0xf2b3c0, scale: 0.95 },
  { kind: 'dog', fur: 0xd9a05b, belly: 0xfff0d6, ear: 0x8a5a34, scale: 1.1 },
  { kind: 'dog', fur: 0xf6efe4, belly: 0xffffff, ear: 0x3d3430, scale: 1.0 },
];

interface Pet {
  root: THREE.Group;
  body: THREE.Group;
  tail: THREE.Group;
  legs: THREE.Group[];
  look: Look;
  x: number;
  z: number;
  heading: number;
  mode: Mode;
  timer: number;
  tx: number;
  tz: number;
  gait: number;
  hop: number;
  orbit: number;
  amp: number;
  px: number;
  pz: number;
  watch: number;
  jams: number;
}

interface Ball {
  mesh: THREE.Mesh;
  x: number;
  z: number;
  vx: number;
  vz: number;
  cool: number;
  roll: number;
  carrier: Pet | null;
}

const TAU = Math.PI * 2;
const LAND_MIN = 0.32;

function hits(c: Collider, x: number, z: number, pad: number): boolean {
  const dx = x - c.x;
  const dz = z - c.z;
  if (c.hx === undefined || c.hz === undefined) {
    const rr = c.r + pad;
    return dx * dx + dz * dz < rr * rr;
  }
  const rot = c.rot ?? 0;
  const cs = Math.cos(rot);
  const sn = Math.sin(rot);
  const lx = dx * cs - dz * sn;
  const lz = dx * sn + dz * cs;
  return Math.abs(lx) < c.hx + pad && Math.abs(lz) < c.hz + pad;
}

const DARK = 0x2a2230;
const NOSE = 0xff8fa3;

function legPivot(look: Look, x: number, z: number, h: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, h, z);
  const b = new Builder();
  b.cyl(0.05, 0.045, h, 6, look.fur, 0, -h, 0);
  b.sph(0.058, look.belly, 0, -h + 0.02, 0.012, { sy: 0.6, sz: 1.2 }, 0);
  g.add(b.mesh());
  return g;
}

function buildPet(look: Look): { root: THREE.Group; body: THREE.Group; tail: THREE.Group; legs: THREE.Group[] } {
  const isCat = look.kind === 'cat';
  const root = new THREE.Group();
  const body = new THREE.Group();
  const b = new Builder();
  const legH = isCat ? 0.26 : 0.3;
  const lift = legH + 0.14;
  b.sph(0.27, look.fur, 0, lift, 0, { sz: isCat ? 1.55 : 1.7, sy: 0.85, sx: 0.88 }, 1);
  b.sph(0.2, look.belly, 0, lift - 0.1, 0.06, { sz: 1.5, sy: 0.6, sx: 0.8 }, 1);
  const hy = lift + 0.2;
  const hz = isCat ? 0.4 : 0.46;
  b.sph(isCat ? 0.2 : 0.21, look.fur, 0, hy, hz, { sy: 0.92 }, 1);
  b.sph(0.1, look.belly, 0, hy - 0.06, hz + 0.14, { sz: 0.9 }, 1);
  b.sph(0.032, NOSE, 0, hy - 0.02, hz + 0.23, {}, 0);
  b.sph(0.03, DARK, 0.085, hy + 0.05, hz + 0.17, {}, 0);
  b.sph(0.03, DARK, -0.085, hy + 0.05, hz + 0.17, {}, 0);
  if (isCat) {
    b.cone(0.075, 0.16, 4, look.fur, 0.11, hy + 0.14, hz - 0.02, { rz: -0.2 });
    b.cone(0.075, 0.16, 4, look.fur, -0.11, hy + 0.14, hz - 0.02, { rz: 0.2 });
    b.cone(0.04, 0.09, 4, look.ear, 0.11, hy + 0.15, hz + 0.02, { rz: -0.2 });
    b.cone(0.04, 0.09, 4, look.ear, -0.11, hy + 0.15, hz + 0.02, { rz: 0.2 });
  } else {
    b.box(0.09, 0.2, 0.13, look.ear, 0.2, hy + 0.0, hz - 0.02, { rz: -0.35 });
    b.box(0.09, 0.2, 0.13, look.ear, -0.2, hy + 0.0, hz - 0.02, { rz: 0.35 });
    b.box(0.12, 0.08, 0.14, look.belly, 0, hy - 0.08, hz + 0.2, {});
    b.sph(0.045, DARK, 0, hy - 0.03, hz + 0.28, { sy: 0.8 }, 0);
  }
  body.add(b.mesh());
  const legs = [
    legPivot(look, 0.11, 0.24, legH),
    legPivot(look, -0.11, 0.24, legH),
    legPivot(look, 0.11, -0.24, legH),
    legPivot(look, -0.11, -0.24, legH),
  ];
  legs.forEach(l => body.add(l));
  const tail = new THREE.Group();
  tail.position.set(0, lift + 0.05, -0.38);
  const tb = new Builder();
  if (isCat) {
    tb.cyl(0.035, 0.045, 0.42, 5, look.fur, 0, 0, 0);
    tb.sph(0.045, look.belly, 0, 0.43, 0, {}, 0);
  } else {
    tb.cone(0.06, 0.3, 5, look.fur, 0, 0, 0);
  }
  tail.add(tb.mesh());
  tail.rotation.x = isCat ? -0.5 : -0.9;
  body.add(tail);
  root.add(body);
  root.scale.setScalar(look.scale);
  return { root, body, tail, legs };
}

export function createPets(colliders: Collider[], getPlayer: () => PetPoint, zones: Collider[] = []): Pets {
  const rand = mulberry32(2024);
  const group = new THREE.Group();
  const free = (x: number, z: number, pad: number): boolean => {
    if (Math.hypot(x, z) > 19 || groundHeight(x, z) < LAND_MIN || isWater(x, z)) {
      return false;
    }
    return !colliders.some(c => hits(c, x, z, pad)) && !zones.some(c => hits(c, x, z, 0));
  };
  const findSpot = (r0: number, r1: number, pad: number): PetPoint => {
    for (let i = 0; i < 80; i++) {
      const a = rand() * TAU;
      const r = r0 + rand() * (r1 - r0);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (free(x, z, pad)) {
        return { x, z };
      }
    }
    return { x: 0, z: 8.8 };
  };
  const nearestFree = (x: number, z: number, pad: number): PetPoint => {
    for (let r = 0.6; r <= 9; r += 0.6) {
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * TAU + r;
        const nx = x + Math.cos(a) * r;
        const nz = z + Math.sin(a) * r;
        if (free(nx, nz, pad)) {
          return { x: nx, z: nz };
        }
      }
    }
    return findSpot(5, 12, pad);
  };

  const ballSpot = findSpot(5, 9, 0.5);
  const ball: Ball = {
    mesh: new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshLambertMaterial({ color: 0xff6b6b })),
    x: ballSpot.x,
    z: ballSpot.z,
    vx: 0,
    vz: 0,
    cool: 0,
    roll: 0,
    carrier: null,
  };
  ball.mesh.castShadow = true;
  group.add(ball.mesh);

  const hitGeo = new THREE.SphereGeometry(0.75, 8, 6);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const pets: Pet[] = LOOKS.map((look, i) => {
    const parts = buildPet(look);
    const s = findSpot(7, 14, 0.7);
    parts.root.userData.petId = i;
    const hit = new THREE.Mesh(hitGeo, hitMat);
    hit.position.y = 0.45;
    parts.root.add(hit);
    group.add(parts.root);
    return {
      ...parts,
      look,
      x: s.x,
      z: s.z,
      heading: rand() * TAU,
      mode: 'idle' as Mode,
      timer: rand() * 2,
      tx: s.x,
      tz: s.z,
      gait: rand() * TAU,
      hop: 0,
      orbit: 0,
      amp: 0,
      px: s.x,
      pz: s.z,
      watch: 0,
      jams: 0,
    };
  });

  const decide = (p: Pet): void => {
    const pl = getPlayer();
    const dog = p.look.kind === 'dog';
    const dPlayer = Math.hypot(pl.x - p.x, pl.z - p.z);
    const dBall = Math.hypot(ball.x - p.x, ball.z - p.z);
    const r = rand();
    if (dPlayer < 7 && r < (dog ? 0.45 : 0.3)) {
      p.mode = 'orbit';
      p.timer = 4 + rand() * 3;
      p.orbit = rand() * TAU;
      return;
    }
    if (dog && !ball.carrier && dBall < 22 && r < 0.92) {
      p.mode = 'chase';
      p.timer = 8;
      return;
    }
    if (dBall < 12 && r < (dog ? 0.85 : 0.5) && !ball.carrier) {
      p.mode = 'chase';
      p.timer = 5;
      return;
    }
    if (r < 0.35) {
      p.mode = 'idle';
      p.timer = 1.5 + rand() * 2.5;
      return;
    }
    for (let i = 0; i < 12; i++) {
      const a = rand() * TAU;
      const d = 2 + rand() * 6;
      const x = p.x + Math.cos(a) * d;
      const z = p.z + Math.sin(a) * d;
      if (free(x, z, 0.5)) {
        p.tx = x;
        p.tz = z;
        p.mode = 'wander';
        p.timer = 9;
        return;
      }
    }
    p.mode = 'idle';
    p.timer = 1.2;
  };

  const step = (p: Pet, dt: number, tx: number, tz: number, speed: number): boolean => {
    const want = Math.atan2(tx - p.x, tz - p.z);
    let diff = want - p.heading;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    p.heading += Math.min(Math.abs(diff), dt * 7) * Math.sign(diff);
    const mv = speed * dt * (Math.abs(diff) > 1.2 ? 0.25 : 1);
    const nx = p.x + Math.sin(p.heading) * mv;
    const nz = p.z + Math.cos(p.heading) * mv;
    if (free(nx, nz, 0.32)) {
      p.x = nx;
      p.z = nz;
      return true;
    }
    if (free(nx, p.z, 0.32)) {
      p.x = nx;
      return true;
    }
    if (free(p.x, nz, 0.32)) {
      p.z = nz;
      return true;
    }
    return false;
  };

  const kick = (vx: number, vz: number): void => {
    ball.vx = vx;
    ball.vz = vz;
    ball.cool = 0.5;
  };

  const updateBall = (d: number): void => {
    const pl = getPlayer();
    ball.cool -= d;
    if (ball.carrier) {
      const c = ball.carrier;
      ball.x = c.x + Math.sin(c.heading) * 0.5 * c.look.scale;
      ball.z = c.z + Math.cos(c.heading) * 0.5 * c.look.scale;
      ball.vx = 0;
      ball.vz = 0;
      ball.roll += d * 4;
      ball.mesh.position.set(ball.x, groundHeight(c.x, c.z) + 0.42 * c.look.scale, ball.z);
      return;
    }
    const dx = ball.x - pl.x;
    const dz = ball.z - pl.z;
    const dd = Math.hypot(dx, dz);
    if (dd < 0.75 && ball.cool <= 0) {
      kick((dx / (dd || 1)) * 6.5, (dz / (dd || 1)) * 6.5);
      pets.forEach(p => {
        if (p.look.kind === 'dog' && (p.mode === 'idle' || p.mode === 'wander')) {
          p.mode = 'chase';
          p.timer = 10;
          p.hop = 0.5;
        }
      });
    }
    const sp = Math.hypot(ball.vx, ball.vz);
    if (sp > 0.05) {
      const nx = ball.x + ball.vx * d;
      const nz = ball.z + ball.vz * d;
      if (free(nx, nz, 0.18)) {
        ball.x = nx;
        ball.z = nz;
      } else {
        ball.vx *= -0.6;
        ball.vz *= -0.6;
      }
      const f = Math.exp(-d * 1.6);
      ball.vx *= f;
      ball.vz *= f;
      ball.roll += sp * d * 3;
    } else {
      ball.vx = 0;
      ball.vz = 0;
    }
    const bounce = Math.min(0.3, sp * 0.05) * Math.abs(Math.sin(ball.roll));
    ball.mesh.position.set(ball.x, groundHeight(ball.x, ball.z) + 0.16 + bounce, ball.z);
  };

  const pickUp = (p: Pet): void => {
    ball.carrier = p;
    ball.vx = 0;
    ball.vz = 0;
    p.mode = 'fetch';
    p.timer = 14;
    p.hop = 0.6;
  };

  const dropBall = (p: Pet): void => {
    if (ball.carrier !== p) {
      return;
    }
    let bx = p.x + Math.sin(p.heading) * 0.5;
    let bz = p.z + Math.cos(p.heading) * 0.5;
    if (!free(bx, bz, 0.18)) {
      const s = nearestFree(p.x, p.z, 0.4);
      bx = s.x;
      bz = s.z;
    }
    const pl = getPlayer();
    const dx = pl.x - bx;
    const dz = pl.z - bz;
    const len = Math.hypot(dx, dz) || 1;
    ball.carrier = null;
    ball.x = bx;
    ball.z = bz;
    ball.vx = (dx / len) * 1.4;
    ball.vz = (dz / len) * 1.4;
    ball.cool = 1.5;
    if (p.mode === 'fetch') {
      p.mode = 'idle';
      p.timer = 2.2;
      p.hop = 1;
    }
  };

  const tick = (p: Pet, d: number, time: number, index: number): void => {
    const dog = p.look.kind === 'dog';
    const run = dog ? 3.4 : 2.8;
    const walk = 1.1;
    let spd = 0;
    let moving = false;
    let tried = false;
    p.timer -= d;
    p.hop = Math.max(0, p.hop - d / 0.7);
    if (p.mode === 'idle') {
      if (p.timer <= 0) {
        decide(p);
      }
    } else if (p.mode === 'wander') {
      if (Math.hypot(p.tx - p.x, p.tz - p.z) < 0.4 || p.timer <= 0) {
        decide(p);
      } else {
        spd = walk;
        moving = step(p, d, p.tx, p.tz, spd);
        tried = true;
      }
    } else if (p.mode === 'chase') {
      const dist = Math.hypot(ball.x - p.x, ball.z - p.z);
      if ((ball.carrier && ball.carrier !== p) || p.timer <= 0) {
        decide(p);
      } else {
        if (dist < 0.55 && ball.cool <= 0 && !ball.carrier) {
          if (dog && rand() < 0.65) {
            pickUp(p);
          } else {
            const a = p.heading + (rand() - 0.5) * 0.9;
            kick(Math.sin(a) * (4 + rand() * 2), Math.cos(a) * (4 + rand() * 2));
          }
        }
        if (p.mode === 'chase') {
          spd = dist > 1.2 ? run : walk;
          moving = step(p, d, ball.x, ball.z, spd);
          tried = true;
          if (!moving && dist < 3 && !ball.carrier) {
            const s = nearestFree(ball.x, ball.z, 0.6);
            ball.x = s.x;
            ball.z = s.z;
            ball.vx = 0;
            ball.vz = 0;
          }
        }
      }
    } else if (p.mode === 'fetch') {
      const pl = getPlayer();
      if (Math.hypot(pl.x - p.x, pl.z - p.z) < 1.9 || p.timer <= 0) {
        dropBall(p);
      } else {
        spd = run;
        moving = step(p, d, pl.x, pl.z, spd);
        tried = true;
      }
    } else {
      const pl = getPlayer();
      p.orbit += d * (dog ? 1.8 : 1.0);
      const rad = dog ? 2.2 : 1.7;
      spd = run;
      moving = step(p, d, pl.x + Math.cos(p.orbit) * rad, pl.z + Math.sin(p.orbit) * rad, spd);
      tried = true;
      if (p.timer <= 0 || Math.hypot(pl.x - p.x, pl.z - p.z) > 10) {
        decide(p);
        tried = false;
      }
    }
    if (tried && !moving) {
      p.mode = 'idle';
      p.timer = 0.6;
    }
    if (ball.carrier === p && p.mode !== 'fetch') {
      dropBall(p);
    }
    if (!free(p.x, p.z, 0.05)) {
      const s = nearestFree(p.x, p.z, 0.4);
      p.x = s.x;
      p.z = s.z;
      p.jams = 0;
    }
    if (tried) {
      p.watch += d;
      if (p.watch > 0.8) {
        const moved = Math.hypot(p.x - p.px, p.z - p.pz);
        p.watch = 0;
        p.px = p.x;
        p.pz = p.z;
        if (moved < 0.25) {
          p.jams += 1;
          if (p.jams >= 3) {
            const s = findSpot(4, 16, 0.8);
            p.x = s.x;
            p.z = s.z;
            p.px = s.x;
            p.pz = s.z;
            p.jams = 0;
            p.mode = 'idle';
            p.timer = 0.8;
          } else {
            const far = findSpot(6, 15, 0.6);
            p.tx = far.x;
            p.tz = far.z;
            p.mode = 'wander';
            p.timer = 9;
          }
        } else {
          p.jams = 0;
        }
      }
    }
    p.gait += d * (moving ? spd * 3.4 : 0);
    p.amp += ((moving ? Math.min(0.85, spd * 0.28) : 0) - p.amp) * Math.min(1, d * 10);
    const swing = Math.sin(p.gait) * p.amp;
    p.legs[0].rotation.x = swing;
    p.legs[3].rotation.x = swing;
    p.legs[1].rotation.x = -swing;
    p.legs[2].rotation.x = -swing;
    const jump = Math.sin(p.hop * Math.PI);
    p.body.position.y = Math.abs(Math.sin(p.gait)) * 0.05 * p.amp + jump * 0.55;
    p.body.rotation.x = -jump * 0.3;
    p.tail.rotation.z = Math.sin(time * (dog ? 9 : 3) + index) * (dog ? 0.55 : 0.22) * (moving || jump > 0 ? 1 : 0.6);
    p.root.position.set(p.x, groundHeight(p.x, p.z), p.z);
    p.root.rotation.y = p.heading;
  };

  const nudge = (p: Pet, dx: number, dz: number): void => {
    if (free(p.x + dx, p.z + dz, 0.3)) {
      p.x += dx;
      p.z += dz;
    } else if (free(p.x + dx, p.z, 0.3)) {
      p.x += dx;
    } else if (free(p.x, p.z + dz, 0.3)) {
      p.z += dz;
    }
  };

  const separate = (): void => {
    const pl = getPlayer();
    pets.forEach((a, i) => {
      const px = a.x - pl.x;
      const pz = a.z - pl.z;
      const pd = Math.hypot(px, pz);
      if (pd < 1.0) {
        const k = (1.0 - pd) / (pd || 1);
        nudge(a, pd === 0 ? 0.3 : px * k, pd === 0 ? 0 : pz * k);
      }
      for (let j = i + 1; j < pets.length; j++) {
        const b = pets[j];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const dd = Math.hypot(dx, dz);
        if (dd < 0.8) {
          const k = (0.8 - dd) / (dd || 1) / 2;
          const ox = dd === 0 ? 0.2 : dx * k;
          const oz = dd === 0 ? 0 : dz * k;
          nudge(a, -ox, -oz);
          nudge(b, ox, oz);
        }
      }
    });
  };

  const place = (p: Pet): void => {
    p.root.position.set(p.x, groundHeight(p.x, p.z), p.z);
  };

  const update = (dt: number, time: number): void => {
    const d = Math.min(dt, 0.05);
    updateBall(d);
    pets.forEach((p, i) => tick(p, d, time, i));
    separate();
    pets.forEach(place);
  };

  const react = (index: number): void => {
    const p = pets[index];
    if (!p || p.hop > 0.3) {
      return;
    }
    const pl = getPlayer();
    dropBall(p);
    p.hop = 1;
    p.mode = 'idle';
    p.timer = 1.6;
    p.heading = Math.atan2(pl.x - p.x, pl.z - p.z);
  };

  const positionOf = (index: number): THREE.Vector3 => {
    const p = pets[index];
    return new THREE.Vector3(p.x, groundHeight(p.x, p.z) + 0.7, p.z);
  };

  return { object: group, update, targets: pets.map(p => p.root), react, positionOf };
}
