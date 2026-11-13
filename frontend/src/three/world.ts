import * as THREE from 'three';
import type { BuildingId } from './buildings/index.ts';
import { sound } from './audio.ts';
import { Controls } from './controls.ts';
import { Effects } from './effects.ts';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { createGradePass } from './grade.ts';
import { TimeMagic } from './timeMagic.ts';
import { createEntry } from './entry.ts';
import { Interactions } from './interactions.ts';
import { disposeLabels, updateLabels } from './labels.ts';
import { swayUniforms } from './builder.ts';
import { createLeafFall } from './leafFall.ts';
import { createMeteors } from './meteors.ts';
import { createNotes } from './notes.ts';
import { Ride, type RideState } from './ride.ts';
import { buildScene, disposeScene } from './scene.ts';

export interface WorldCallbacks {
  onSelect: (id: BuildingId) => void;
  onNear: (id: BuildingId | null) => void;
  onRide: (state: RideState) => void;
  onNpc: () => void;
  onNpcNear: (near: boolean) => void;
  onEdge: () => void;
  onGuide: (v: boolean) => void;
}

export interface World {
  setPaused: (paused: boolean) => void;
  setStick: (x: number, y: number) => void;
  setRun: (run: boolean) => void;
  enter: () => void;
  zoom: (dir: 1 | -1) => void;
  rotate: (dir: 1 | -1) => void;
  /** Boards or leaves the boat. Returns false when the boat cannot be left here. */
  toggleBoat: () => boolean;
  standUp: () => void;
  talk: () => void;
  guideTalk: () => void;
  jump: () => void;
  setNpcTalking: (v: boolean) => void;
  dispose: () => void;
}

const HEART_COLORS = [0xff8fb0, 0xffb6c8, 0xffffff];

function isCoarse(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
}

function createRenderer(container: HTMLElement): THREE.WebGLRenderer {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
  if (!gl) {
    throw new Error('WebGL is not available');
  }
  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isCoarse() ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.28;
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.touchAction = 'none';
  canvas.style.cursor = 'grab';
  container.appendChild(canvas);
  return renderer;
}

export function createWorld(container: HTMLElement, cb: WorldCallbacks): World {
  const renderer = createRenderer(container);
  const world = buildScene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 700);
  // layer 1 供草丛使用：主渲染可见，SSAO pass 忽略（避免细叶被 AO 误判变黑）
  camera.layers.enable(1);

  // 后处理管线：渲染 → SSAO 环境光遮蔽（半分辨率）→ Bloom 辉光 → ACES 色调映射输出
  const coarse = isCoarse();
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(world.scene, camera));
  const ssao = new SSAOPass(world.scene, camera, Math.floor(container.clientWidth / 2), Math.floor(container.clientHeight / 2));
  ssao.kernelRadius = 2.4;
  ssao.minDistance = 0.012;
  ssao.maxDistance = 1.1;
  composer.addPass(ssao);
  // 移动端 Bloom 用半分辨率（辉光本就柔和，视觉无差，帧率更稳）
  const bloomRes = new THREE.Vector2(
    container.clientWidth / (coarse ? 2 : 1),
    container.clientHeight / (coarse ? 2 : 1)
  );
  const bloom = new UnrealBloomPass(bloomRes, 0.4, 0.55, 0.85);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = createGradePass();
  composer.addPass(grade.pass);

  const effects = new Effects();
  world.scene.add(effects.group);
  const magic = new TimeMagic(effects);
  world.scene.add(magic.group);
  const leaves = createLeafFall();
  const notes = createNotes();
  const meteors = createMeteors(camera, world.env);
  world.scene.add(leaves.object, notes.object, meteors.object);
  const interactions = new Interactions({
    scene: world.scene,
    camera,
    effects,
    character: world.character,
    buildings: world.buildings,
    boats: world.boats,
    env: world.env,
    leaves,
    trees: world.trees,
    notes,
    magic,
  });
  world.character.onWater = (x, z, enter) => {
    interactions.splash(x, z, enter);
    sound.splash(enter);
  };
  world.character.onStep = () => {
    const ch = world.character;
    sound.step(ch.swimming ? 'swim' : ch.speedNow > 5.5 ? 'run' : 'walk');
  };
  world.character.onLand = () => sound.step('walk');
  world.character.onEdge = () => cb.onEdge();
  const ride = new Ride({
    character: world.character,
    seats: world.seats.seats,
    boat: world.rowboat,
    boatCollider: world.rowCollider,
    colliders: world.colliders,
    onPoke: id => interactions.poke(world.seats.seats[id]),
    onChange: s => cb.onRide(s),
  });
  const entry = createEntry({
    character: world.character,
    buildings: world.buildings,
    ride,
    setScripted: v => controls.setScripted(v),
    lockDoors: () => controls.lockDoors(),
    burst: id => interactions.enter(id),
    show: id => cb.onSelect(id),
    onDoor: open => sound.door(open),
  });
  const controls = new Controls({
    dom: renderer.domElement,
    camera,
    character: world.character,
    buildings: world.buildings,
    pickTargets: world.pickTargets,
    eggTargets: world.eggTargets,
    seatTargets: world.seats.targets,
    petTargets: world.pets.targets,
    boatTarget: world.rowboat,
    npcTarget: world.npc.group,
    npcPos: { x: world.npc.x, z: world.npc.z },
    sea: world.sea,
    terrain: world.terrain,
    colliders: world.colliders,
    ride,
    onGuide: v => cb.onGuide(v),
    onJump: () => sound.jump(),
    onSelect: id => entry.begin(id),
    onNear: id => {
      if (id) {
        interactions.welcome(id);
      }
      cb.onNear(id);
    },
    onNpc: () => {
      sound.npcTalk();
      world.npc.wave();
      controls.endGuide();
      cb.onNpc();
    },
    onNpcNear: cb.onNpcNear,
    onEgg: (kind, point) => interactions.egg(kind, point),
    onPet: (index, point) => {
      sound.pet();
      world.pets.react(index);
      effects.burst(world.pets.positionOf(index), { count: 9, colors: HEART_COLORS, speed: 1.1, up: 2.2, gravity: -0.5, life: 1.3 });
      effects.ring(point, 0xffb6c8, 0.7, 0.6);
    },
  });
  world.scene.add(controls.markerObject);

  const resize = (): void => {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 1 ? Math.min(75, 45 + (1 - camera.aspect) * 38) : 45;
    camera.updateProjectionMatrix();
    composer.setSize(w, h);
    ssao.setSize(Math.max(1, Math.floor(w / 2)), Math.max(1, Math.floor(h / 2)));
    bloom.setSize(w / (coarse ? 2 : 1), h / (coarse ? 2 : 1));
    grade.setSize(w, h);
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(container);

  // 首次用户交互时解锁音频（浏览器自动播放策略）
  const unlockSound = (): void => sound.unlock();
  renderer.domElement.addEventListener('pointerdown', unlockSound);
  window.addEventListener('keydown', unlockSound);

  let raf = 0;
  let last = performance.now();
  let time = 0;
  let rowT = 0;
  const frame = (now: number): void => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;
    swayUniforms.uTime.value = time;
    entry.update(dt);
    controls.update(dt, time);
    effects.update(dt);
    magic.update(dt);
    world.env.update(dt, time);
    sound.update(dt, { night: world.env.night, rain: world.env.rain, wind: world.env.wind.length() });
    if (ride.mode === 'boat' && ride.speedNow > 0.3) {
      rowT += dt;
      if (rowT >= 0.42) {
        rowT = 0;
        sound.row();
      }
    } else {
      rowT = 0;
    }
    world.clouds.update(dt, world.env.wind);
    world.fx.forEach(f => f.update(dt, time));
    leaves.update(dt, time);
    notes.update(dt, time);
    meteors.update(dt, time);
    world.npc.setTarget(world.character.x, world.character.z);
    world.npc.update(dt, time);
    world.rain.follow(camera);
    world.fireflies.setScale(renderer.domElement.height * 1.207);
    updateLabels(world.labels, time, controls.hoveredId);
    composer.render();
  };
  raf = requestAnimationFrame(frame);

  return {
    setPaused: paused => {
      controls.setEnabled(!paused);
      if (!paused) {
        entry.release();
      }
    },
    setStick: (x, y) => controls.setStick(x, y),
    setRun: run => controls.setRun(run),
    enter: () => controls.enter(),
    zoom: dir => controls.zoomBy(dir),
    rotate: dir => controls.rotateBy(dir),
    toggleBoat: () => {
      if (ride.mode === 'boat') {
        return ride.dismount();
      }
      if (ride.mode === 'sit') {
        ride.stand();
      }
      ride.board();
      return true;
    },
    standUp: () => ride.stand(),
    talk: () => controls.talkToNpc(),
    guideTalk: () => controls.guideTalk(),
    jump: () => {
      sound.jump();
      controls.jump();
    },
    setNpcTalking: v => world.npc.setTalking(v),
    dispose: () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      renderer.domElement.removeEventListener('pointerdown', unlockSound);
      window.removeEventListener('keydown', unlockSound);
      controls.dispose();
      interactions.dispose();
      effects.dispose();
      magic.dispose();
      ssao.dispose();
      bloom.dispose();
      composer.dispose();
      world.npc.dispose();
      disposeLabels(world.labels);
      disposeScene(world.scene);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
