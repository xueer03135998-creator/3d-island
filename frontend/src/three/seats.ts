import * as THREE from 'three';
import type { Collider } from './buildings/index.ts';
import { BUILDING_SITES, ISLAND_TOP } from './palette.ts';
import type { SeatSpot } from './ride.ts';

const HIT = new THREE.MeshBasicMaterial({ visible: false });

export interface Seats {
  group: THREE.Group;
  seats: SeatSpot[];
  targets: THREE.Object3D[];
  colliders: Collider[];
}

function hitMesh(geo: THREE.BufferGeometry, id: number): THREE.Mesh {
  const m = new THREE.Mesh(geo, HIT);
  m.userData.seatId = id;
  return m;
}

export function createSeats(): Seats {
  const group = new THREE.Group();
  const seats: SeatSpot[] = [];
  const targets: THREE.Object3D[] = [];
  const colliders: Collider[] = [];
  const add = (spot: SeatSpot, hit: THREE.Mesh): void => {
    seats.push(spot);
    targets.push(hit);
    group.add(hit);
  };

  const archive = BUILDING_SITES.find(s => s.id === 'archive');
  if (archive) {
    const yaw = Math.atan2(-archive.x, -archive.z);
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const lx = 3.8;
    const lz = 6.2;
    const x = archive.x + lx * c + lz * s;
    const z = archive.z - lx * s + lz * c;
    const base = ISLAND_TOP - 0.02;
    const hit = hitMesh(new THREE.BoxGeometry(1.7, 0.9, 0.8), seats.length);
    hit.position.set(x, base + 0.5, z);
    hit.rotation.y = yaw - 0.15;
    add({ x, y: base + 0.54, z, heading: yaw - 0.15, reach: 2.0, kind: 'chair' }, hit);
  }

  return { group, seats, targets, colliders };
}
