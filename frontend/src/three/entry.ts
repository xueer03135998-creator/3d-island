import * as THREE from 'three';
import type { BuildingEntry, BuildingId } from './buildings/index.ts';
import type { DoorRig } from './buildings/doors.ts';
import type { Character } from './character.ts';
import type { Ride } from './ride.ts';

export interface EntryDeps {
  character: Character;
  buildings: BuildingEntry[];
  ride: Ride;
  setScripted: (v: boolean) => void;
  lockDoors: () => void;
  burst: (id: BuildingId) => void;
  show: (id: BuildingId) => void;
  onDoor: (open: boolean) => void;
}

export interface Entry {
  begin: (id: BuildingId) => void;
  release: () => void;
  update: (dt: number) => void;
}

type Stage = 'idle' | 'walk' | 'wait' | 'shown';

interface DoorState {
  rig: DoorRig;
  k: number;
  goal: number;
}

const OPEN_SECONDS = 0.6;
const WALK_LIMIT = 3.6;
const FAR_DISTANCE = 6;
const FAR_DELAY = 0.38;

export function createEntry(d: EntryDeps): Entry {
  const doors = new Map<BuildingId, DoorState>(d.buildings.map(b => [b.id, { rig: b.door, k: 0, goal: 0 }]));
  const ch = d.character;
  let stage: Stage = 'idle';
  let current: BuildingEntry | null = null;
  let pts: THREE.Vector3[] = [];
  let idx = 0;
  let segLen = 1;
  let clock = 0;
  let wait = 0;

  const reveal = (): void => {
    if (!current) {
      stage = 'idle';
      return;
    }
    stage = 'shown';
    ch.group.visible = false;
    d.burst(current.id);
    d.show(current.id);
  };

  const walk = (dt: number): void => {
    clock += dt;
    if (clock > WALK_LIMIT) {
      reveal();
      return;
    }
    const p = pts[idx];
    const dx = p.x - ch.x;
    const dz = p.z - ch.z;
    const dist = Math.hypot(dx, dz);
    if (idx === pts.length - 1) {
      ch.group.scale.setScalar(0.08 + 0.92 * Math.min(1, dist / segLen));
    }
    if (dist < 0.22) {
      idx += 1;
      if (idx >= pts.length) {
        reveal();
        return;
      }
      const n = pts[idx];
      segLen = Math.max(0.5, Math.hypot(n.x - ch.x, n.z - ch.z));
      return;
    }
    ch.update(dt, dx / dist, dz / dist, false, []);
  };

  const begin = (id: BuildingId): void => {
    if (stage !== 'idle' || d.ride.mode === 'boat') {
      return;
    }
    const b = d.buildings.find(e => e.id === id);
    const state = doors.get(id);
    if (!b || !state) {
      return;
    }
    if (d.ride.mode === 'sit') {
      d.ride.stand();
    }
    current = b;
    state.goal = 1;
    d.onDoor(true);
    d.setScripted(true);
    d.lockDoors();
    const dist = Math.hypot(b.doorPoint.x - ch.x, b.doorPoint.z - ch.z);
    if (dist > FAR_DISTANCE) {
      stage = 'wait';
      wait = FAR_DELAY;
      return;
    }
    pts = [b.doorPoint, b.doorMouth, b.doorInside];
    idx = 0;
    clock = 0;
    segLen = Math.max(0.5, dist);
    stage = 'walk';
  };

  const release = (): void => {
    if (stage !== 'shown' || !current) {
      return;
    }
    const b = current;
    const state = doors.get(b.id);
    if (state) {
      state.goal = 0;
    }
    d.onDoor(false);
    ch.group.visible = true;
    ch.group.scale.setScalar(1);
    ch.standAt(b.doorPoint.x, b.doorPoint.z);
    ch.turnTo(Math.atan2(b.doorPoint.x - b.doorInside.x, b.doorPoint.z - b.doorInside.z));
    d.setScripted(false);
    d.lockDoors();
    current = null;
    stage = 'idle';
  };

  const update = (dt: number): void => {
    doors.forEach(s => {
      if (s.k === s.goal) {
        return;
      }
      const step = dt / OPEN_SECONDS;
      s.k = s.goal > s.k ? Math.min(s.goal, s.k + step) : Math.max(s.goal, s.k - step);
      s.rig.setOpen(s.k * s.k * (3 - 2 * s.k));
    });
    if (stage === 'walk') {
      walk(dt);
    } else if (stage === 'wait') {
      wait -= dt;
      if (wait <= 0) {
        reveal();
      }
    }
  };

  return { begin, release, update };
}
