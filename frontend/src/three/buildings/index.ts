import * as THREE from 'three';
import { getSwayMaterial, type Builder } from '../builder.ts';
import { BUILDING_SITES, ISLAND_TOP, type BuildingSite } from '../palette.ts';
import { buildArchive } from './archive.ts';
import { bambooGrove } from './bamboo.ts';
import { LOCAL_COLLIDERS } from './colliders.ts';
import { buildCanteen } from './canteen.ts';
import { buildDivination } from './divination.ts';
import { DETAILS } from './details.ts';
import { buildHeritage } from './heritage.ts';
import { createDoor, type DoorRig } from './doors.ts';

export type BuildingId = BuildingSite['id'];

export interface Collider {
  x: number;
  z: number;
  r: number;
  hx?: number;
  hz?: number;
  rot?: number;
}

export interface BuildingEntry {
  id: BuildingId;
  name: string;
  subtitle: string;
  group: THREE.Group;
  labelAnchor: THREE.Vector3;
  doorPoint: THREE.Vector3;
  doorMouth: THREE.Vector3;
  doorInside: THREE.Vector3;
  door: DoorRig;
  colliders: Collider[];
}

interface Spec {
  name: string;
  subtitle: string;
  build: () => Builder;
  doorDist: number;
  labelY: number;
}

const SPECS: Record<BuildingId, Spec> = {
  divination: { name: '易经占卜馆', subtitle: '易经六爻 · 在线起卦解读', build: buildDivination, doorDist: 10.5, labelY: 10 },
  canteen: { name: '食堂小屋', subtitle: '午餐助手 · 帮你决定吃什么', build: buildCanteen, doorDist: 7.4, labelY: 9.5 },
  archive: { name: '个人档案馆', subtitle: '', build: buildArchive, doorDist: 7.2, labelY: 11.5 },
  heritage: { name: '非遗体验馆', subtitle: '非遗互动小故事', build: buildHeritage, doorDist: 6.2, labelY: 8.4 },
};

const HIT_MATERIAL = new THREE.MeshBasicMaterial({ visible: false });

function localToWorld(site: BuildingSite, yaw: number, lx: number, lz: number): { x: number; z: number } {
  const s = Math.sin(yaw);
  const c = Math.cos(yaw);
  return { x: site.x + lx * c + lz * s, z: site.z - lx * s + lz * c };
}

function addHitBox(group: THREE.Group, id: BuildingId): void {
  const hit = new THREE.Mesh(new THREE.BoxGeometry(9, 9, 7.6), HIT_MATERIAL);
  hit.position.set(0, 4.5, 0);
  hit.userData.buildingId = id;
  group.add(hit);
}

function createEntry(site: BuildingSite): BuildingEntry {
  const spec = SPECS[site.id];
  const yaw = Math.atan2(-site.x, -site.z);
  const group = new THREE.Group();
  group.position.set(site.x, ISLAND_TOP - 0.02, site.z);
  group.rotation.y = yaw;
  const builder = spec.build();
  DETAILS[site.id](builder);
  const body = builder.mesh();
  body.userData.buildingId = site.id;
  group.add(body);
  addHitBox(group, site.id);
  const colliders: Collider[] = LOCAL_COLLIDERS[site.id].map(lc => {
    const p = localToWorld(site, yaw, lc.lx, lc.lz);
    if (lc.hx !== undefined && lc.hz !== undefined) {
      return { x: p.x, z: p.z, r: 0, hx: lc.hx, hz: lc.hz, rot: yaw + (lc.ry ?? 0) };
    }
    return { x: p.x, z: p.z, r: lc.r ?? 0.3 };
  });
  if (site.id === 'heritage') {
    const grove = bambooGrove(7, 22, 2.4, 2.8).mesh(getSwayMaterial());
    grove.position.set(7.2, 0, -0.5);
    grove.userData.buildingId = site.id;
    group.add(grove);
    const p = localToWorld(site, yaw, 7.2, -0.5);
    colliders.push({ x: p.x, z: p.z, r: 3 });
  }
  const rig = createDoor(site.id);
  group.add(rig.group);
  const door = localToWorld(site, yaw, 0, spec.doorDist);
  const mouth = localToWorld(site, yaw, 0, rig.mouthZ);
  const inside = localToWorld(site, yaw, 0, rig.insideZ);
  return {
    id: site.id,
    name: spec.name,
    subtitle: spec.subtitle,
    group,
    labelAnchor: new THREE.Vector3(site.x, spec.labelY, site.z),
    doorPoint: new THREE.Vector3(door.x, ISLAND_TOP, door.z),
    doorMouth: new THREE.Vector3(mouth.x, ISLAND_TOP, mouth.z),
    doorInside: new THREE.Vector3(inside.x, ISLAND_TOP, inside.z),
    door: rig,
    colliders,
  };
}

export function createBuildings(): BuildingEntry[] {
  return BUILDING_SITES.map(createEntry);
}
