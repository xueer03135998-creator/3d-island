import type * as THREE from 'three';
import type { Collider } from './buildings/index.ts';
import { pushOut } from './character.ts';
import type { Character } from './character.ts';
import { isOnPier, isWater, withinSwimArea } from './walk.ts';

export interface SeatSpot {
  x: number;
  y: number;
  z: number;
  heading: number;
  reach: number;
  kind: 'chair';
}

export type RideMode = 'none' | 'sit' | 'boat';

export interface RideState {
  mode: RideMode;
  boatNear: boolean;
  canLand: boolean;
}

export interface RideOptions {
  character: Character;
  seats: SeatSpot[];
  boat: THREE.Object3D;
  boatCollider: Collider;
  colliders: Collider[];
  onPoke: (id: number) => void;
  onChange: (s: RideState) => void;
}

const BOAT_SEAT_Z = 0.1;
const BOAT_SEAT_Y = 0.42;
const BLEND = 0.35;
const TURN = 2.4;
const SPEED_WALK = 3.0;
const SPEED_RUN = 4.8;
const BOAT_HALF_LEN = 1.1;
const BOAT_HALF_W = 0.55;
const LAND_RINGS = [1.9, 2.4, 2.9, 3.3];

function wrap(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

export class Ride {
  mode: RideMode = 'none';
  seatId = -1;
  readonly seats: SeatSpot[];
  readonly boardReach = 3.4;
  private readonly o: RideOptions;
  private blend = 1;
  private from = { x: 0, y: 0, z: 0, h: 0 };
  private speed = 0;
  private heading: number;
  private power = 0;
  private timer = 0;
  private last = '';

  constructor(options: RideOptions) {
    this.o = options;
    this.seats = options.seats;
    this.heading = options.boat.rotation.y;
  }

  boatDistance(): number {
    const { character: ch, boat } = this.o;
    return Math.hypot(ch.x - boat.position.x, ch.z - boat.position.z);
  }

  get speedNow(): number {
    return this.speed;
  }

  boardSpot(): { x: number; z: number } {
    const { boat } = this.o;
    if (isOnPier(boat.position.x, boat.position.z, 1.1)) {
      return { x: 0, z: boat.position.z };
    }
    return { x: boat.position.x, z: boat.position.z };
  }

  sit(id: number): void {
    if (this.mode !== 'none' || !this.seats[id]) {
      return;
    }
    this.beginBlend();
    this.mode = 'sit';
    this.seatId = id;
    this.publish(true);
  }

  poke(): void {
    if (this.mode === 'sit') {
      this.o.onPoke(this.seatId);
    }
  }

  stand(): void {
    if (this.mode !== 'sit') {
      return;
    }
    const seat = this.seats[this.seatId];
    const { character: ch } = this.o;
    this.mode = 'sit';
    let spot: { x: number; z: number } | null = null;
    const offs = [0, 0.6, -0.6, 1.2, -1.2, 1.9, -1.9, 2.6, -2.6, Math.PI];
    for (const r of [1.0, 1.4, 1.9]) {
      for (const off of offs) {
        const a = seat.heading + off;
        const x = seat.x + Math.sin(a) * r;
        const z = seat.z + Math.cos(a) * r;
        if (this.landFree(x, z)) {
          spot = { x, z };
          break;
        }
      }
      if (spot) {
        break;
      }
    }
    const target = spot ?? { x: seat.x, z: seat.z };
    ch.turnTo(seat.heading);
    ch.standAt(target.x, target.z);
    this.mode = 'none';
    this.seatId = -1;
    this.blend = 1;
    this.publish(true);
  }

  board(): void {
    if (this.mode !== 'none' || this.boatDistance() >= this.boardReach) {
      return;
    }
    this.beginBlend();
    this.mode = 'boat';
    this.speed = 0;
    this.heading = this.o.boat.rotation.y;
    this.publish(true);
  }

  dismount(): boolean {
    if (this.mode !== 'boat') {
      return false;
    }
    const spot = this.landing();
    if (!spot) {
      return false;
    }
    const { character: ch, boat } = this.o;
    ch.turnTo(Math.atan2(spot.x - boat.position.x, spot.z - boat.position.z));
    ch.standAt(spot.x, spot.z);
    this.mode = 'none';
    this.speed = 0;
    this.power = 0;
    this.blend = 1;
    this.publish(true);
    return true;
  }

  drive(dt: number, dir: THREE.Vector2, run: boolean): void {
    const { boat, boatCollider } = this.o;
    const mag = Math.min(1, dir.length());
    const px = boat.position.x;
    const pz = boat.position.z;
    let align = 0;
    if (mag > 0.05) {
      const want = Math.atan2(dir.x, dir.y);
      const diff = wrap(want - this.heading);
      const step = Math.min(Math.abs(diff), TURN * dt * (0.5 + 0.5 * mag));
      const nh = this.heading + Math.sign(diff) * step;
      if (this.boatFree(px, pz, nh)) {
        this.heading = nh;
      }
      align = Math.max(0, Math.cos(wrap(want - this.heading)));
    }
    const top = run ? SPEED_RUN : SPEED_WALK;
    const target = mag > 0.05 ? top * mag * (0.35 + 0.65 * align) : 0;
    this.speed += (target - this.speed) * Math.min(1, dt * 2.2);
    const h = this.heading;
    const nx = px + Math.sin(h) * this.speed * dt;
    const nz = pz + Math.cos(h) * this.speed * dt;
    if (this.boatFree(nx, nz, h)) {
      boat.position.x = nx;
      boat.position.z = nz;
    } else if (this.boatFree(nx, pz, h)) {
      boat.position.x = nx;
    } else if (this.boatFree(px, nz, h)) {
      boat.position.z = nz;
    } else {
      this.speed *= 0.4;
    }
    boat.rotation.y = this.heading;
    boatCollider.x = boat.position.x;
    boatCollider.z = boat.position.z;
    boatCollider.rot = this.heading;
    this.power += (Math.min(1, this.speed / SPEED_RUN) - this.power) * Math.min(1, dt * 4);
  }

  tick(dt: number, _time: number): void {
    if (this.mode !== 'none') {
      this.place(dt);
    }
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 0.2;
      this.publish(false);
    }
  }

  private beginBlend(): void {
    const { character: ch } = this.o;
    this.from = { x: ch.x, y: ch.group.position.y + 0.4, z: ch.z, h: ch.facing };
    this.blend = 0;
  }

  private place(dt: number): void {
    const { character: ch, boat } = this.o;
    let tx: number;
    let ty: number;
    let tz: number;
    let th: number;
    if (this.mode === 'sit') {
      const s = this.seats[this.seatId];
      tx = s.x;
      ty = s.y;
      tz = s.z;
      th = s.heading;
    } else {
      th = boat.rotation.y;
      tx = boat.position.x + Math.sin(th) * BOAT_SEAT_Z;
      tz = boat.position.z + Math.cos(th) * BOAT_SEAT_Z;
      ty = boat.position.y + BOAT_SEAT_Y;
    }
    let x = tx;
    let y = ty;
    let z = tz;
    let h = th;
    if (this.blend < 1) {
      this.blend = Math.min(1, this.blend + dt / BLEND);
      const u = this.blend;
      const e = u * u * (3 - 2 * u);
      x = this.from.x + (tx - this.from.x) * e;
      z = this.from.z + (tz - this.from.z) * e;
      y = this.from.y + (ty - this.from.y) * e + Math.sin(u * Math.PI) * 0.3;
      h = this.from.h + wrap(th - this.from.h) * e;
    }
    if (this.mode === 'sit') {
      ch.sitAt(x, y, z, h);
    } else {
      ch.rideAt(x, y, z, h, this.power);
    }
  }

  private boatFree(x: number, y: number, h: number): boolean {
    const { colliders, boatCollider } = this.o;
    const fx = Math.sin(h);
    const fz = Math.cos(h);
    const pts: Array<[number, number]> = [
      [0, 0],
      [BOAT_HALF_LEN, 0],
      [-BOAT_HALF_LEN, 0],
      [0, BOAT_HALF_W],
      [0, -BOAT_HALF_W],
    ];
    for (const [f, s] of pts) {
      const px = x + fx * f + fz * s;
      const pz = y + fz * f - fx * s;
      if (!isWater(px, pz) || !withinSwimArea(px, pz)) {
        return false;
      }
      for (const c of colliders) {
        if (c === boatCollider || (c.hx === undefined && c.r < 0.25)) {
          continue;
        }
        const [qx, qz] = pushOut(c, px, pz);
        if (qx !== px || qz !== pz) {
          return false;
        }
      }
    }
    return true;
  }

  private landFree(x: number, z: number): boolean {
    if (isWater(x, z) || !withinSwimArea(x, z)) {
      return false;
    }
    for (const c of this.o.colliders) {
      const [qx, qz] = pushOut(c, x, z);
      if (qx !== x || qz !== z) {
        return false;
      }
    }
    return true;
  }

  private landing(): { x: number; z: number } | null {
    const { boat } = this.o;
    let best: { x: number; z: number } | null = null;
    let bestD = Infinity;
    for (const r of LAND_RINGS) {
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2;
        const x = boat.position.x + Math.sin(a) * r;
        const z = boat.position.z + Math.cos(a) * r;
        if (r < bestD && this.landFree(x, z)) {
          best = { x, z };
          bestD = r;
        }
      }
    }
    return best;
  }

  private publish(force: boolean): void {
    const boatNear = this.mode === 'none' && this.boatDistance() < this.boardReach;
    const canLand = this.mode === 'boat' && this.landing() !== null;
    const key = `${this.mode}|${boatNear}|${canLand}`;
    if (!force && key === this.last) {
      return;
    }
    this.last = key;
    this.o.onChange({ mode: this.mode, boatNear, canLand });
  }
}
