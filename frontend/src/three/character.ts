import * as THREE from 'three';
import { Builder } from './builder.ts';
import { SEA_LEVEL, groundHeight } from './palette.ts';
import { isWater, walkHeight, withinSwimArea } from './walk.ts';
import type { Collider } from './buildings/index.ts';

const HOODIE = 0xb9a7e0;
const HOODIE_LIGHT = 0xcfc3ec;
const PANTS = 0x9fb4d6;
const PANTS_DARK = 0x7f95bd;
const SKIN = 0xf8d160;
const BEANIE = 0xf6d98a;
const SHOE = 0xfdf6e8;
const INK = 0x3b3547;
const BODY_RADIUS = 0.4;
const SWIM_DEPTH = SEA_LEVEL - 0.35;

export function pushOut(c: Collider, x: number, z: number): [number, number] {
  if (c.hx === undefined || c.hz === undefined) {
    const ox = x - c.x;
    const oz = z - c.z;
    const d = Math.hypot(ox, oz);
    const min = c.r + BODY_RADIUS;
    if (d >= min) {
      return [x, z];
    }
    if (d < 0.0001) {
      return [x + min, z];
    }
    return [c.x + (ox / d) * min, c.z + (oz / d) * min];
  }
  const rot = c.rot ?? 0;
  const s = Math.sin(rot);
  const co = Math.cos(rot);
  const dx = x - c.x;
  const dz = z - c.z;
  const lx = dx * co - dz * s;
  const lz = dx * s + dz * co;
  const qx = Math.max(-c.hx, Math.min(c.hx, lx));
  const qz = Math.max(-c.hz, Math.min(c.hz, lz));
  let nlx = lx;
  let nlz = lz;
  if (qx === lx && qz === lz) {
    const px = c.hx - Math.abs(lx);
    const pz = c.hz - Math.abs(lz);
    if (px < pz) {
      nlx = (lx < 0 ? -1 : 1) * (c.hx + BODY_RADIUS);
    } else {
      nlz = (lz < 0 ? -1 : 1) * (c.hz + BODY_RADIUS);
    }
  } else {
    const ex = lx - qx;
    const ez = lz - qz;
    const d = Math.hypot(ex, ez);
    if (d >= BODY_RADIUS) {
      return [x, z];
    }
    nlx = qx + (ex / d) * BODY_RADIUS;
    nlz = qz + (ez / d) * BODY_RADIUS;
  }
  return [c.x + nlx * co + nlz * s, c.z - nlx * s + nlz * co];
}

function limb(top: number, w: number, len: number, color: number, tip: number, tipColor: number, tipH: number): THREE.Group {
  const pivot = new THREE.Group();
  const b = new Builder();
  b.box(w, len - tipH, w, color, 0, -len + tipH, 0);
  b.box(tip, tipH, tip, tipColor, 0, -len, 0);
  pivot.add(b.mesh());
  pivot.position.y = top;
  return pivot;
}

function normalizeAngle(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

export type Pose = 'walk' | 'sit' | 'row';

export class Character {
  readonly group = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly legL = limb(0.45, 0.25, 0.45, PANTS, 0.27, SHOE, 0.12);
  private readonly legR = limb(0.45, 0.25, 0.45, PANTS, 0.27, SHOE, 0.12);
  private readonly armL = limb(1.04, 0.18, 0.5, HOODIE, 0.17, SKIN, 0.14);
  private readonly armR = limb(1.04, 0.18, 0.5, HOODIE, 0.17, SKIN, 0.14);
  private heading = 0;
  private phase = 0;
  private speed = 0;
  private time = 0;
  private hopT = -1;
  private inWater = false;
  private swimMix = 0;
  private posed: Pose = 'walk';
  private rowPower = 0;
  private readonly ripples: THREE.Mesh[] = [];
  private stepS = 1;
  private crouch = false;
  private crouchMix = 0;
  private hopAmp = 0.8;
  onWater: ((x: number, z: number, enter: boolean) => void) | null = null;
  onEdge: (() => void) | null = null;
  /** 每跨出一步触发一次（走/跑/游泳扑水），供音效挂接。 */
  onStep: (() => void) | null = null;
  /** 跳跃落地时触发，供落地音效挂接。 */
  onLand: (() => void) | null = null;

  constructor() {
    for (let i = 0; i < 2; i++) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.62, 0.78, 32),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: false })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.renderOrder = 6;
      ring.visible = false;
      this.ripples.push(ring);
      this.group.add(ring);
    }
    const t = new Builder();
    t.box(0.58, 0.14, 0.34, PANTS_DARK, 0, 0.4, 0);
    t.box(0.6, 0.56, 0.35, HOODIE, 0, 0.54, 0);
    t.box(0.62, 0.06, 0.37, HOODIE_LIGHT, 0, 0.52, 0);
    t.box(0.36, 0.14, 0.03, HOODIE_LIGHT, 0, 0.62, 0.185);
    t.box(0.03, 0.2, 0.03, 0xfffaf0, -0.07, 0.86, 0.185);
    t.box(0.03, 0.2, 0.03, 0xfffaf0, 0.07, 0.86, 0.185);
    t.box(0.5, 0.12, 0.16, HOODIE_LIGHT, 0, 0.96, -0.2);
    t.cyl(0.1, 0.12, 0.08, 10, SKIN, 0, 1.08, 0);
    t.cyl(0.29, 0.31, 0.44, 18, SKIN, 0, 1.1, 0);
    t.cyl(0.33, 0.33, 0.12, 18, 0xf0c46a, 0, 1.42, 0);
    t.add(new THREE.SphereGeometry(0.32, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2), BEANIE, 0, 1.54, 0, { sy: 0.72 });
    t.sph(0.1, 0xfffaf0, 0, 1.78, 0, {}, 1);
    [-1, 1].forEach(side => {
      t.sph(0.047, INK, side * 0.1, 1.31, 0.283, { sz: 0.38 }, 2);
      t.sph(0.015, 0xffffff, side * 0.1 + 0.014, 1.328, 0.296, { sz: 0.5 }, 1);
      t.sph(0.055, 0xf5a3b0, side * 0.19, 1.2, 0.236, { sy: 0.7, sz: 0.3 }, 1);
    });
    t.add(new THREE.TorusGeometry(0.065, 0.011, 6, 16, Math.PI), INK, 0, 1.25, 0.296, { rz: Math.PI });
    this.body.add(t.mesh());
    this.legL.position.x = -0.14;
    this.legR.position.x = 0.14;
    this.armL.position.x = -0.4;
    this.armR.position.x = 0.4;
    this.body.add(this.legL, this.legR, this.armL, this.armR);
    this.group.add(this.body);
  }

  get x(): number {
    return this.group.position.x;
  }

  get z(): number {
    return this.group.position.z;
  }

  placeAt(x: number, z: number): void {
    this.group.position.set(x, groundHeight(x, z), z);
  }

  get isMoving(): boolean {
    return this.speed > 0.3;
  }

  get speedNow(): number {
    return this.speed;
  }

  get swimming(): boolean {
    return this.inWater;
  }

  get pose(): Pose {
    return this.posed;
  }

  get crouching(): boolean {
    return this.crouch;
  }

  get facing(): number {
    return this.heading;
  }

  sitAt(x: number, y: number, z: number, heading: number): void {
    this.posed = 'sit';
    this.speed = 0;
    this.heading = heading;
    this.group.position.set(x, y - 0.4, z);
    this.group.rotation.y = heading;
  }

  rideAt(x: number, y: number, z: number, heading: number, power: number): void {
    this.posed = 'row';
    this.speed = 0;
    this.heading = heading;
    this.rowPower = power;
    this.group.position.set(x, y - 0.4, z);
    this.group.rotation.y = heading;
  }

  turnTo(heading: number): void {
    this.heading = heading;
    this.group.rotation.y = heading;
  }

  standAt(x: number, z: number): void {
    this.posed = 'walk';
    this.rowPower = 0;
    this.body.rotation.x = 0;
    this.group.position.set(x, walkHeight(x, z), z);
  }

  update(dt: number, dirX: number, dirZ: number, run: boolean, colliders: Collider[]): void {
    this.time += dt;
    if (this.posed !== 'walk') {
      this.setRipples(false);
      this.animateSeated(dt);
      return;
    }
    const mag = Math.min(1, Math.hypot(dirX, dirZ));
    const base = this.inWater ? (run ? 4.0 : 2.9) : run ? 7.5 : this.crouch ? 2.2 : 4.2;
    const target = mag > 0.01 ? base * mag : 0;
    this.speed += (target - this.speed) * Math.min(1, dt * 10);
    if (mag > 0.01) {
      const want = Math.atan2(dirX, dirZ);
      this.heading += normalizeAngle(want - this.heading) * Math.min(1, dt * 12);
      this.move(Math.sin(this.heading) * this.speed * dt, Math.cos(this.heading) * this.speed * dt, colliders);
    }
    const p = this.group.position;
    const wet = isWater(p.x, p.z);
    if (wet !== this.inWater) {
      this.inWater = wet;
      this.onWater?.(p.x, p.z, wet);
    }
    const ty = wet ? SWIM_DEPTH + Math.sin(this.time * 2.2) * 0.05 : walkHeight(p.x, p.z);
    p.y += (ty - p.y) * Math.min(1, dt * (wet ? 6 : 14));
    this.group.rotation.y = this.heading;
    this.animate(dt);
  }

  private move(dx: number, dz: number, colliders: Collider[]): void {
    const p = this.group.position;
    let nx = p.x + dx;
    let nz = p.z + dz;
    if (!withinSwimArea(nx, nz)) {
      this.onEdge?.();
      if (withinSwimArea(nx, p.z)) {
        nz = p.z;
      } else if (withinSwimArea(p.x, nz)) {
        nx = p.x;
      } else {
        nx = p.x;
        nz = p.z;
      }
    }
    for (let pass = 0; pass < 2; pass++) {
      for (const c of colliders) {
        [nx, nz] = pushOut(c, nx, nz);
      }
    }
    if (withinSwimArea(nx, nz)) {
      p.x = nx;
      p.z = nz;
    }
  }

  private setRipples(on: boolean): void {
    this.ripples.forEach(r => {
      r.visible = on;
    });
  }

  private animateSwim(dt: number, moving: boolean, k: number): void {
    const mix = this.swimMix;
    this.phase += dt * (moving ? 5.5 : 2.4);
    if (moving) {
      const s = Math.sin(this.phase);
      if (s * this.stepS < 0) {
        this.onStep?.();
      }
      this.stepS = s;
    }
    const amp = moving ? 1 : 0.35;
    const stroke = Math.sin(this.phase);
    const lean = (moving ? 0.5 : 0.12) * mix;
    this.body.rotation.x += (lean - this.body.rotation.x) * k;
    this.legL.rotation.x += (Math.sin(this.phase * 2) * 0.4 * amp - this.legL.rotation.x) * k;
    this.legR.rotation.x += (-Math.sin(this.phase * 2) * 0.4 * amp - this.legR.rotation.x) * k;
    this.armL.rotation.x += (-2.1 + stroke * 0.9 * amp - this.armL.rotation.x) * k;
    this.armR.rotation.x += (-2.1 - stroke * 0.9 * amp - this.armR.rotation.x) * k;
    this.body.position.y = 0;
    this.setRipples(true);
    const waterY = SEA_LEVEL + 0.07 - this.group.position.y;
    this.ripples.forEach((r, i) => {
      const u = (this.time * 0.7 + i * 0.5) % 1;
      r.position.y = waterY;
      r.scale.setScalar(0.9 + u * 1.9);
      (r.material as THREE.MeshBasicMaterial).opacity = (1 - u) * 0.45 * mix;
    });
  }

  private animate(dt: number): void {
    const moving = this.speed > 0.3;
    const k = 1 - Math.exp(-dt * 14);
    this.swimMix += ((this.inWater ? 1 : 0) - this.swimMix) * Math.min(1, dt * 8);
    if (this.swimMix > 0.02) {
      this.animateSwim(dt, moving, k);
      return;
    }
    this.setRipples(false);
    this.body.rotation.x = 0;
    this.phase += dt * this.speed * 1.9;
    if (moving) {
      const s = Math.sin(this.phase);
      if (s * this.stepS < 0) {
        this.onStep?.();
      }
      this.stepS = s;
    }
    const swing = moving ? Math.sin(this.phase) * Math.min(0.9, this.speed * 0.2) : 0;
    const cheer = this.hopT >= 0 ? -2.7 : null;
    this.legL.rotation.x += (swing - this.legL.rotation.x) * k;
    this.legR.rotation.x += (-swing - this.legR.rotation.x) * k;
    this.armL.rotation.x += ((cheer ?? -swing * 0.9) - this.armL.rotation.x) * k;
    this.armR.rotation.x += ((cheer ?? swing * 0.9) - this.armR.rotation.x) * k;
    const bob = moving ? Math.abs(Math.sin(this.phase)) * 0.07 : Math.sin(this.time * 2) * 0.012;
    let lift = 0;
    if (this.hopT >= 0) {
      this.hopT += dt;
      const u = this.hopT / 0.7;
      if (u >= 1) {
        this.hopT = -1;
        this.onLand?.();
      } else {
        lift = Math.abs(Math.sin(u * Math.PI * 2)) * this.hopAmp * (1 - u * 0.4);
      }
    }
    // 下蹲：压低身形并微缩，平滑过渡
    this.crouchMix += ((this.crouch ? 1 : 0) - this.crouchMix) * Math.min(1, dt * 8);
    const cs = 1 + 0.07 * this.crouchMix;
    const cy = 1 - 0.24 * this.crouchMix;
    this.body.scale.set(cs, cy, cs);
    this.body.position.y = bob + lift - 0.3 * this.crouchMix;
  }

  private animateSeated(dt: number): void {
    const k = 1 - Math.exp(-dt * 12);
    const rowing = this.posed === 'row';
    if (rowing) {
      this.phase += dt * (2 + this.rowPower * 4);
    }
    const stroke = rowing ? Math.sin(this.phase) * (0.25 + this.rowPower * 0.45) : 0;
    const armBase = rowing ? -1.25 : -0.35;
    this.body.rotation.x += ((rowing ? stroke * 0.25 : 0) - this.body.rotation.x) * k;
    this.legL.rotation.x += (-1.5 - this.legL.rotation.x) * k;
    this.legR.rotation.x += (-1.5 - this.legR.rotation.x) * k;
    this.armL.rotation.x += (armBase + stroke - this.armL.rotation.x) * k;
    this.armR.rotation.x += (armBase + stroke - this.armR.rotation.x) * k;
    this.body.position.y = Math.sin(this.time * 2) * 0.012;
  }

  hop(): void {
    this.hopAmp = 0.8;
    this.hopT = 0.0001;
  }

  /** 跳跃：更高更远，落地触发 onLand。 */
  jump(): void {
    this.hopAmp = 1.25;
    this.hopT = 0.0001;
  }

  setCrouch(v: boolean): void {
    this.crouch = v;
  }
}
