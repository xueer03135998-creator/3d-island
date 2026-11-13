import * as THREE from 'three';
import { sound } from './audio.ts';
import { Builder } from './builder.ts';
import type { BuildingEntry, BuildingId } from './buildings/index.ts';
import type { Character } from './character.ts';
import type { Effects, BurstOptions } from './effects.ts';
import { NEXT_DAY_HOUR, NIGHT_HOUR, SUNSET_HOUR } from './environment.ts';
import type { Environment } from './environment.ts';
import type { LeafFall, TreeSpot } from './leafFall.ts';
import type { Notes } from './notes.ts';
import { SEA_LEVEL, groundHeight } from './palette.ts';
import type { SeatSpot } from './ride.ts';
import type { TimeMagic } from './timeMagic.ts';

export type EggKind = 'nature' | 'boat' | 'hero' | 'plaza' | 'sea';

export interface InteractionDeps {
  scene: THREE.Scene;
  camera: THREE.Camera;
  effects: Effects;
  character: Character;
  buildings: BuildingEntry[];
  boats: THREE.Object3D[];
  env: Environment;
  leaves: LeafFall;
  trees: TreeSpot[];
  notes: Notes;
  magic: TimeMagic;
}

const TIME_STOPS = [SUNSET_HOUR, NIGHT_HOUR, NEXT_DAY_HOUR];
const TIME_SECONDS = 3;

interface Theme {
  colors: number[];
  ring: number;
  burst: Partial<BurstOptions>;
}

const THEMES: Record<BuildingId, Theme> = {
  divination: { colors: [0xffd86a, 0xfff2b0, 0xffc04a, 0xffffff], ring: 0xffd86a, burst: { shell: true, speed: 4.2, up: 1.5, gravity: 2.4 } },
  canteen: { colors: [0xffffff, 0xfff0d8, 0xffd9a0, 0xffb878], ring: 0xffd9a0, burst: { speed: 1.6, up: 3.2, gravity: -0.6, life: 1.7 } },
  archive: { colors: [0xfdf6e8, 0xf0e4c8, 0xcfe0f4, 0xffffff], ring: 0xcfe0f4, burst: { speed: 3.4, up: 3.4, gravity: 1.3, life: 1.8 } },
  heritage: { colors: [0xff5a4a, 0xffc24a, 0xff8a5a, 0xffe7a0], ring: 0xff7a5a, burst: { shell: true, speed: 4.6, up: 1.4, gravity: 2.6 } },
};

const TOTAL_EGGS = 5;
const RAINBOW = [0xff5a5a, 0xff9a4a, 0xffd84a, 0x6fd16a, 0x4ab8f0, 0x5a6ae8, 0xa56ae0];

function fishMesh(): THREE.Group {
  const b = new Builder();
  b.sph(0.34, 0xff9a6a, 0, 0, 0, { sz: 1.9, sy: 0.85 }, 1);
  b.sph(0.3, 0xffe2c8, 0, -0.1, 0.05, { sz: 1.6, sy: 0.5 }, 1);
  b.cone(0.26, 0.55, 4, 0xff7a4a, 0, 0, -0.78, { rx: Math.PI / 2 });
  b.cone(0.16, 0.3, 3, 0xff7a4a, 0, 0.3, -0.1, { rz: 0.2 });
  b.sph(0.05, 0x2a2a3a, 0.17, 0.08, 0.38, {}, 0);
  b.sph(0.05, 0x2a2a3a, -0.17, 0.08, 0.38, {}, 0);
  const g = new THREE.Group();
  g.add(b.mesh(undefined, false));
  g.rotation.order = 'YXZ';
  g.visible = false;
  return g;
}

function rainbowMesh(): THREE.Group {
  const g = new THREE.Group();
  RAINBOW.forEach((c, i) => {
    const r1 = 36 - i * 1.5;
    const m = new THREE.Mesh(
      new THREE.RingGeometry(r1 - 1.5, r1, 64, 1, 0, Math.PI),
      new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, fog: false })
    );
    g.add(m);
  });
  g.renderOrder = 3;
  g.visible = false;
  return g;
}
export class Interactions {
  private readonly found = new Set<EggKind>();
  private readonly fish = fishMesh();
  private readonly rainbow = rainbowMesh();
  private fishBusy = false;
  private stage = 0;

  constructor(private readonly d: InteractionDeps) {
    this.rainbow.children.forEach(c => {
      c.renderOrder = 3;
    });
    d.scene.add(this.fish, this.rainbow);
  }

  splash(x: number, z: number, enter: boolean): void {
    const fx = this.d.effects;
    const p = new THREE.Vector3(x, SEA_LEVEL + 0.12, z);
    fx.ring(p, 0xffffff, enter ? 3.4 : 2.6);
    p.y = SEA_LEVEL + 0.3;
    fx.burst(p, {
      count: enter ? 26 : 16,
      colors: [0xffffff, 0xcfeeff, 0x8fd4f4],
      speed: enter ? 2.2 : 1.6,
      up: enter ? 3.6 : 2.8,
      gravity: 7,
      life: 0.9,
      spread: 0.7,
    });
  }

  welcome(id: BuildingId): void {
    const e = this.d.buildings.find(b => b.id === id);
    if (!e) {
      return;
    }
    sound.pop();
    const p = e.doorPoint.clone();
    p.y = groundHeight(p.x, p.z) + 1.2;
    this.d.effects.burst(p, { count: 12, colors: THEMES[id].colors, speed: 0.9, up: 1.6, gravity: -0.2, life: 1.2, spread: 1.2 });
  }

  enter(id: BuildingId): void {
    const e = this.d.buildings.find(b => b.id === id);
    if (!e) {
      return;
    }
    sound.chime();
    const t = THEMES[id];
    const g = e.group;
    this.d.effects.tween(
      0.55,
      k => {
        const w = Math.sin(k * Math.PI * 3) * (1 - k) * 0.06;
        g.scale.set(1 + w, 1 - w * 1.4, 1 + w);
      },
      () => g.scale.set(1, 1, 1)
    );
    const top = e.labelAnchor.clone();
    top.y -= 3;
    this.d.effects.burst(top, { count: 46, colors: t.colors, speed: 2.8, up: 3, gravity: 2, life: 1.3, spread: 1.5, ...t.burst });
    const door = e.doorPoint.clone();
    door.y = groundHeight(door.x, door.z) + 0.15;
    this.d.effects.ring(door, t.ring, 5);
  }

  /** Returns false when the click hit scenery that is not a tree, so the caller can treat it as a ground click. */
  egg(kind: EggKind, p: THREE.Vector3): boolean {
    if (kind === 'nature' && !this.shakeTree(p)) {
      return false;
    }
    const first = !this.found.has(kind);
    this.found.add(kind);
    this.play(kind, p);
    sound.chime();
    const n = this.found.size;
    if (first && n === TOTAL_EGGS) {
      this.showRainbow();
    }
    return true;
  }

  private shakeTree(p: THREE.Vector3): boolean {
    let best: TreeSpot | null = null;
    let bd = Infinity;
    for (const t of this.d.trees) {
      const d = Math.hypot(p.x - t.x, p.z - t.z);
      if (d <= t.r + 0.9 && d < bd) {
        best = t;
        bd = d;
      }
    }
    if (!best) {
      return false;
    }
    this.d.leaves.spawnCrown(best, 34);
    return true;
  }

  private play(kind: EggKind, p: THREE.Vector3): void {
    const fx = this.d.effects;
    const ch = this.d.character;
    if (kind === 'boat') {
      let best: THREE.Object3D | undefined;
      let bd = Infinity;
      for (const b of this.d.boats) {
        const dd = b.position.distanceToSquared(p);
        if (dd < bd) {
          bd = dd;
          best = b;
        }
      }
      if (best) {
        best.userData.wob = 1;
        const o = best.position.clone();
        o.y = SEA_LEVEL + 0.4;
        fx.burst(o, { count: 24, colors: [0xffffff, 0xcfeeff, 0x8fd4f4], speed: 2.2, up: 3.4, gravity: 7, life: 1, spread: 1.4 });
        o.y = SEA_LEVEL + 0.12;
        fx.ring(o, 0xcfeeff, 4.5);
      }
    } else if (kind === 'hero') {
      ch.hop();
      fx.after(0.12, () => {
        const o = ch.group.position.clone();
        o.y += 2.6;
        fx.burst(o, { count: 14, colors: [0xff8fb0, 0xffb6c8, 0xffffff], speed: 0.9, up: 1.8, gravity: -0.3, life: 1.6, spread: 0.8 });
      });
    } else if (kind === 'plaza') {
      this.cycleTime();
    } else if (kind === 'sea') {
      fx.burst(p, { count: 20, colors: [0xffffff, 0xcfeeff, 0x7fd0f0], speed: 1.8, up: 3.4, gravity: 7, life: 0.9, spread: 0.8 });
      fx.ring(p, 0xffffff, 3.2);
      this.jumpFish(p);
    }
  }

  private cycleTime(): void {
    const env = this.d.env;
    const magic = this.d.magic;
    if (env.transitioning || magic.active) {
      return;
    }
    const target = TIME_STOPS[this.stage];
    this.stage = (this.stage + 1) % TIME_STOPS.length;
    sound.magic();
    const y = groundHeight(0, 0);
    this.d.effects.ring(new THREE.Vector3(0, y + 0.15, 0), 0xffe08a, 5.2);
    magic.cast(new THREE.Vector3(0, y, 0), () => env.goTo(target, TIME_SECONDS));
  }

  poke(seat: SeatSpot): void {
    const fx = this.d.effects;
    const g = this.d.character.group;
    fx.tween(
      1.2,
      k => {
        g.rotation.z = Math.sin(k * Math.PI * 5) * (1 - k) * 0.14;
      },
      () => {
        g.rotation.z = 0;
      }
    );
    this.d.notes.emit(new THREE.Vector3(seat.x, seat.y + 2.3, seat.z), 4);
  }

  private jumpFish(p: THREE.Vector3): void {
    if (this.fishBusy) {
      return;
    }
    this.fishBusy = true;
    const fx = this.d.effects;
    const heading = Math.random() * Math.PI * 2;
    const dx = Math.sin(heading);
    const dz = Math.cos(heading);
    const len = 4.2;
    const h = 2.4;
    const fish = this.fish;
    fish.visible = true;
    fx.tween(
      1.15,
      k => {
      fish.position.set(p.x + dx * (k - 0.5) * len, SEA_LEVEL + 0.2 + 4 * h * k * (1 - k), p.z + dz * (k - 0.5) * len);
      fish.rotation.y = heading;
      fish.rotation.x = -Math.atan2(4 * h * (1 - 2 * k), len);
      fish.scale.setScalar(Math.min(1, 8 * k, 8 * (1 - k)) + 0.001);
    },
    () => {
      const o = fish.position.clone();
      o.y = SEA_LEVEL + 0.2;
      fx.burst(o, { count: 18, colors: [0xffffff, 0xcfeeff, 0x7fd0f0], speed: 1.6, up: 3, gravity: 7, life: 0.8, spread: 0.6 });
      fx.ring(o, 0xffffff, 2.6);
        fish.visible = false;
        this.fishBusy = false;
      }
    );
  }

  private showRainbow(): void {
    const ch = this.d.character.group.position;
    const cam = this.d.camera.position;
    const dir = new THREE.Vector3(ch.x - cam.x, 0, ch.z - cam.z);
    if (dir.lengthSq() < 0.0001) {
      dir.set(0, 0, -1);
    }
    dir.normalize();
    const rb = this.rainbow;
    rb.position.set(ch.x + dir.x * 70, -4, ch.z + dir.z * 70);
    rb.rotation.y = Math.atan2(-dir.x, -dir.z);
    rb.visible = true;
    const total = 22;
    this.d.effects.tween(
      total,
      k => {
        const t = k * total;
        const o = 0.7 * Math.max(0, Math.min(1, t / 2.5, (total - t) / 4));
        rb.children.forEach(c => {
          const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial;
          m.opacity = o;
        });
      },
      () => {
        rb.visible = false;
      }
    );
  }

  dispose(): void {
    this.d.scene.remove(this.fish, this.rainbow);
    this.rainbow.traverse(o => {
      const m = (o as THREE.Mesh).material;
      if (m && !Array.isArray(m)) {
        m.dispose();
      }
    });
  }
}
