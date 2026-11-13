import * as THREE from 'three';
import { createBuildings, type BuildingEntry, type Collider } from './buildings/index.ts';
import { Character } from './character.ts';
import { createDecor } from './decor.ts';
import { Environment } from './environment.ts';
import { createLabel, type BuildingLabel } from './labels.ts';
import type { TreeSpot } from './leafFall.ts';
import { createButterflies } from './life.ts';
import { createExtras } from './nature.ts';
import { createNpc, type Npc } from './npc.ts';
import { PALETTE, groundHeight } from './palette.ts';
import { createBirds, createLeaves, type Fx } from './particles.ts';
import { createPaths } from './paths.ts';
import { createPets, type Pets } from './pets.ts';
import { createScenery } from './scenery.ts';
import { createSea } from './sea.ts';
import { createSeats, type Seats } from './seats.ts';
import { createChimneySmoke } from './smoke.ts';
import { createClouds, createSky, type Clouds } from './sky.ts';
import { createMountains } from './mountains.ts';
import { createGrassClumps } from './grass.ts';
import { createTerrain } from './terrain.ts';
import { createPlazaRune } from './plazaRune.ts';
import { createNightLights } from './nightLights.ts';
import { createFireflies, createRain, type FireflyFx, type RainFx } from './weatherFx.ts';

export const FOG_NEAR = 90;
export const FOG_FAR = 430;

export interface WorldScene {
  scene: THREE.Scene;
  buildings: BuildingEntry[];
  labels: BuildingLabel[];
  env: Environment;
  clouds: Clouds;
  fx: Fx[];
  rain: RainFx;
  fireflies: FireflyFx;
  character: Character;
  colliders: Collider[];
  trees: TreeSpot[];
  pickTargets: THREE.Object3D[];
  eggTargets: THREE.Object3D[];
  boats: THREE.Object3D[];
  sea: THREE.Object3D;
  terrain: THREE.Object3D;
  seats: Seats;
  pets: Pets;
  npc: Npc;
  rowboat: THREE.Object3D;
  rowCollider: Collider;
}

function addLights(scene: THREE.Scene): { hemi: THREE.HemisphereLight; sun: THREE.DirectionalLight } {
  const hemi = new THREE.HemisphereLight(0xe3edf8, 0xc4cfa8, 1.6);
  const sun = new THREE.DirectionalLight(0xffe0ac, 2.3);
  sun.castShadow = true;
  const shadow = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches ? 1024 : 2048;
  sun.shadow.mapSize.set(shadow, shadow);
  const cam = sun.shadow.camera;
  cam.left = -45;
  cam.right = 45;
  cam.top = 45;
  cam.bottom = -45;
  cam.near = 20;
  cam.far = 200;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.05;
  scene.add(hemi, sun, sun.target);
  return { hemi, sun };
}

export function buildScene(): WorldScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.fog);
  scene.fog = new THREE.Fog(PALETTE.fog, FOG_NEAR, FOG_FAR);
  const { hemi, sun } = addLights(scene);

  const sky = createSky();
  const mountains = createMountains();
  const clouds = createClouds();
  const sea = createSea(FOG_NEAR, FOG_FAR);
  const terrain = createTerrain();
  scene.add(sky, mountains, clouds.group, sea.mesh, terrain);
  scene.add(createGrassClumps());

  const env = new Environment({
    scene,
    hemi,
    sun,
    skyMaterial: sky.material as THREE.ShaderMaterial,
    seaMaterial: sea.material,
    cloudMaterial: clouds.material,
    mountainMaterial: mountains.material as THREE.ShaderMaterial,
    setCloudCover: clouds.setCover,
  });

  const buildings = createBuildings();
  const labels = buildings.map(b => createLabel(b.name, b.labelAnchor, b.id, b.subtitle));
  buildings.forEach(b => scene.add(b.group));
  labels.forEach(l => scene.add(l.sprite));

  const doors = buildings.map(b => b.doorPoint);
  const scenery = createScenery(doors);
  scene.add(scenery.mesh, createPaths(buildings));
  const plazaRune = createPlazaRune(env);

  const leaves = createLeaves(scenery.canopies, env);
  const birds = createBirds(env);
  const rain = createRain(env);
  const fireflies = createFireflies(env, scenery.canopies);
  const extras = createExtras(env, doors);
  const butterflies = createButterflies();
  const decor = createDecor(doors);
  scene.add(decor.group);
  const seats = createSeats();
  scene.add(seats.group);
  const npc = createNpc(0, 0, groundHeight(0, 0) + 0.26);
  scene.add(npc.group);
  const fx: Fx[] = [createNightLights(buildings, env), leaves, birds, rain, fireflies, butterflies, plazaRune, { object: extras.group, update: extras.update }];
  const canteen = buildings.find(b => b.id === 'canteen');
  if (canteen) {
    canteen.group.updateMatrixWorld(true);
    const chimney = canteen.group.localToWorld(new THREE.Vector3(2.45, 5.2, -1.0));
    fx.push(createChimneySmoke(chimney, env));
  }

  const colliders: Collider[] = [
    ...buildings.flatMap(b => b.colliders),
    ...scenery.colliders,
    ...extras.colliders,
    ...decor.colliders,
    ...seats.colliders,
    { x: 0, z: 0, r: 0.5 },
  ];
  const character = new Character();
  character.placeAt(0, 7.5);
  scene.add(character.group);
  const zones: Collider[] = buildings.flatMap(b => {
    const body = b.colliders[0];
    return body && body.hx !== undefined && body.hz !== undefined
      ? [{ x: body.x, z: body.z, r: 0, hx: body.hx + 1.4, hz: body.hz + 1.4, rot: body.rot }]
      : [];
  });
  const pets = createPets(colliders, () => character.group.position, zones);
  fx.push(pets);
  fx.forEach(f => scene.add(f.object));

  scenery.mesh.userData.egg = 'nature';
  character.group.userData.egg = 'hero';
  const plazaHit = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.5, 16));
  plazaHit.position.y = groundHeight(0, 0) + 0.2;
  plazaHit.visible = false;
  plazaHit.userData.egg = 'plaza';
  scene.add(plazaHit);

  return {
    scene,
    buildings,
    labels,
    env,
    clouds,
    fx,
    rain,
    fireflies,
    character,
    colliders,
    trees: scenery.trees,
    pickTargets: [...buildings.map(b => b.group), ...labels.map(l => l.sprite)],
    eggTargets: [character.group, plazaHit, scenery.mesh, ...extras.boats],
    boats: extras.boats,
    sea: sea.mesh,
    terrain,
    seats,
    pets,
    npc,
    rowboat: extras.rowboat,
    rowCollider: extras.rowCollider,
  };
}

export function disposeScene(scene: THREE.Scene): void {
  scene.traverse(obj => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
  });
}
