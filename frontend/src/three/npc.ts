import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Builder } from './builder.ts';
import { addUsagiFace } from './usagiFace.ts';

const MODEL_URL = `${import.meta.env.BASE_URL}models/usagi.glb`;
export const NPC_MODEL_HEIGHT = 2.6;
const MODEL_YAW = 0;

const CREAM = 0xfff3e2;
const PINK = 0xffb3c1;
const RED = 0xd8453a;
/** 深金：颜色更深、饱和度更高，避免亮金发白 */
const GOLD = 0xd18f22;
const ORANGE = 0xf08a2c;
const INK = 0x2a2230;

export interface Npc {
  group: THREE.Group;
  hit: THREE.Mesh;
  x: number;
  z: number;
  distanceTo: (x: number, z: number) => number;
  setTarget: (x: number, z: number) => void;
  wave: (sec?: number) => void;
  setTalking: (v: boolean) => void;
  update: (dt: number, time: number) => void;
  dispose: () => void;
}

function bodyMesh(): THREE.Mesh {
  const b = new Builder();
  b.sph(0.16, CREAM, 0.2, 0.12, 0.12, { sy: 0.6, sz: 1.4 }, 1);
  b.sph(0.16, CREAM, -0.2, 0.12, 0.12, { sy: 0.6, sz: 1.4 }, 1);
  b.cyl(0.42, 0.52, 0.36, 10, ORANGE, 0, 0.2, 0);
  for (let i = 0; i < 5; i++) {
    const a = -0.9 + i * 0.45;
    b.box(0.08, 0.2, 0.04, INK, Math.sin(a) * 0.49, 0.26, Math.cos(a) * 0.49, { ry: a });
  }
  b.cyl(0.36, 0.44, 0.5, 10, RED, 0, 0.55, 0);
  b.cyl(0.47, 0.47, 0.08, 10, GOLD, 0, 0.52, 0);
  b.sph(0.1, GOLD, 0, 0.56, 0.47, {}, 0);
  b.sph(0.16, CREAM, 0, 0.5, -0.46, {}, 1);
  b.cyl(0.04, 0.04, 2.3, 6, GOLD, 0.62, 0.02, 0.14);
  b.cyl(0.065, 0.065, 0.2, 6, GOLD, 0.62, 0.02, 0.14);
  b.cyl(0.065, 0.065, 0.2, 6, GOLD, 0.62, 2.12, 0.14);
  return b.mesh();
}

function headGroup(): { head: THREE.Group; earL: THREE.Group; earR: THREE.Group } {
  const head = new THREE.Group();
  head.position.y = 1.4;
  const f = new Builder();
  f.sph(0.5, CREAM, 0, 0, 0, { sy: 0.92 }, 2);
  f.sph(0.056, INK, 0.19, 0.06, 0.43, {}, 1);
  f.sph(0.056, INK, -0.19, 0.06, 0.43, {}, 1);
  f.sph(0.022, 0xffffff, 0.205, 0.085, 0.475, {}, 0);
  f.sph(0.022, 0xffffff, -0.175, 0.085, 0.475, {}, 0);
  f.sph(0.05, PINK, 0, -0.06, 0.5, {}, 1);
  f.sph(0.08, PINK, 0.3, -0.1, 0.36, { sy: 0.6 }, 1);
  f.sph(0.08, PINK, -0.3, -0.1, 0.36, { sy: 0.6 }, 1);
  f.add(new THREE.TorusGeometry(0.44, 0.04, 6, 20), GOLD, 0, 0.28, 0, { rx: Math.PI / 2 });
  f.sph(0.075, GOLD, 0, 0.3, 0.43, {}, 1);
  f.cone(0.05, 1.0, 5, RED, 0.16, 0.42, -0.1, { rz: -0.45, rx: -0.35 });
  f.cone(0.05, 1.0, 5, RED, -0.16, 0.42, -0.1, { rz: 0.45, rx: -0.35 });
  f.sph(0.045, GOLD, 0.4, 0.95, -0.4, {}, 0);
  f.sph(0.045, GOLD, -0.4, 0.95, -0.4, {}, 0);
  head.add(f.mesh());
  const ears: THREE.Group[] = [1, -1].map(side => {
    const g = new THREE.Group();
    g.position.set(side * 0.2, 0.38, -0.02);
    g.rotation.z = -side * 0.14;
    const e = new Builder();
    e.sph(0.14, CREAM, 0, 0.42, 0, { sy: 3.2 }, 1);
    e.sph(0.085, PINK, 0, 0.42, 0.06, { sy: 3.0, sz: 0.5 }, 1);
    g.add(e.mesh());
    head.add(g);
    return g;
  });
  return { head, earL: ears[1], earR: ears[0] };
}

function armGroup(side: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(side * 0.46, 1.0, 0.1);
  const a = new Builder();
  a.sph(0.11, CREAM, 0, -0.18, 0, { sy: 2.2 }, 1);
  a.sph(0.12, CREAM, 0, -0.4, 0.02, {}, 1);
  g.add(a.mesh());
  return g;
}

function bubbleSprite(): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 96;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#f2c14e';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(8, 8, 112, 60, 22);
    ctx.moveTo(48, 66);
    ctx.lineTo(60, 88);
    ctx.lineTo(74, 66);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#d8453a';
    [38, 64, 90].forEach(x => {
      ctx.beginPath();
      ctx.arc(x, 38, 7, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
  s.scale.set(0.9, 0.675, 1);
  s.renderOrder = 28;
  return s;
}

function prepareModel(root: THREE.Object3D): THREE.Group {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const s = NPC_MODEL_HEIGHT / Math.max(size.y, 0.001);
  const pivot = new THREE.Group();
  root.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
  const fit = new THREE.Group();
  fit.add(root);
  fit.scale.setScalar(s);
  fit.rotation.y = MODEL_YAW;
  pivot.add(fit);
  root.traverse(o => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = false;
      m.userData.npc = true;
    }
  });
  return pivot;
}

/** 将模型中的头箍（gold 材质）与金箍棒（tip 材质）改为亮金属金，避免暗淡发黑。 */
function goldenize(root: THREE.Object3D): void {
  root.traverse(o => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || Array.isArray(m.material)) {
      return;
    }
    const sm = m.material as THREE.MeshStandardMaterial;
    if (sm.name === 'gold' || sm.name === 'tip') {
      sm.color.set(GOLD);
      sm.metalness = 1;
      sm.roughness = 0.24;
      sm.emissive.set(0x7a4c0e);
      sm.emissiveIntensity = 0.5;
      sm.needsUpdate = true;
    }
  });
}

export function createNpc(x: number, z: number, topY: number): Npc {
  const group = new THREE.Group();
  group.position.set(x, topY, z);
  const body = bodyMesh();
  const { head, earL, earR } = headGroup();
  const armL = armGroup(-1);
  const armR = armGroup(1);
  armR.rotation.z = 0.32;
  const bubble = bubbleSprite();
  bubble.position.set(0, 3.1, 0);
  const proc = new THREE.Group();
  proc.add(body, head, armL, armR);
  const holder = new THREE.Group();
  group.add(proc, holder, bubble);
  let model: THREE.Group | null = null;
  let disposed = false;
  new GLTFLoader().load(
    MODEL_URL,
    gltf => {
      if (disposed) {
        return;
      }
      addUsagiFace(gltf.scene);
      goldenize(gltf.scene);
      model = prepareModel(gltf.scene);
      holder.add(model);
      proc.visible = false;
    },
    undefined,
    () => {
      proc.visible = true;
    }
  );
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 3, 8));
  hit.position.y = 1.5;
  hit.visible = false;
  hit.userData.npc = true;
  group.add(hit);
  group.traverse(o => {
    const m = o as THREE.Mesh;
    if (m.isMesh && m !== hit) {
      m.userData.npc = true;
    }
  });

  const target = new THREE.Vector2(x, z + 6);
  let waveT = 0;
  let talking = false;
  let wave = 0;
  const api: Npc = {
    group,
    hit,
    x,
    z,
    distanceTo: (px, pz) => Math.hypot(px - x, pz - z),
    setTarget: (tx, tz) => target.set(tx, tz),
    wave: (sec = 2.4) => {
      waveT = sec;
    },
    setTalking: v => {
      talking = v;
    },
    update: (dt, time) => {
      const want = Math.atan2(target.x - x, target.y - z);
      const diff = Math.atan2(Math.sin(want - group.rotation.y), Math.cos(want - group.rotation.y));
      group.rotation.y += diff * Math.min(1, dt * 3);
      const rest = Math.max(-0.7, Math.min(0.7, diff * 0.5));
      head.rotation.y += (rest - head.rotation.y) * Math.min(1, dt * 6);
      waveT = Math.max(0, waveT - dt);
      wave += ((waveT > 0 ? 1 : 0) - wave) * Math.min(1, dt * 7);
      armL.rotation.z = -0.25 * (1 - wave) + (-2.4 + Math.sin(time * 9) * 0.35) * wave;
      const nod = talking ? Math.sin(time * 10) * 0.05 : 0;
      head.rotation.x += (nod - head.rotation.x) * Math.min(1, dt * 10);
      body.scale.y = 1 + Math.sin(time * 2.2) * 0.012;
      head.position.y = 1.4 + Math.sin(time * 2.2) * 0.012;
      const twitch = Math.max(0, Math.sin(time * 0.9)) ** 12;
      earL.rotation.z = 0.14 + Math.sin(time * 1.6) * 0.04 + twitch * 0.25;
      earR.rotation.z = -0.14 - Math.sin(time * 1.3 + 1) * 0.04;
      bubble.position.y = 3.1 + Math.sin(time * 2.6) * 0.07;
      bubble.visible = !talking;
      if (model) {
        const hop = wave > 0.05 ? Math.abs(Math.sin(time * 6)) * 0.12 * wave : 0;
        model.position.y = hop;
        model.rotation.z = Math.sin(time * 9) * 0.07 * wave;
        const talkSquash = talking ? Math.sin(time * 10) * 0.012 : 0;
        const breathe = 1 + Math.sin(time * 2.2) * 0.012 + talkSquash;
        model.scale.set(1 / Math.sqrt(breathe), breathe, 1 / Math.sqrt(breathe));
      }
    },
    dispose: () => {
      disposed = true;
      group.traverse(o => {
        const m = o as THREE.Mesh;
        if (m.geometry) {
          m.geometry.dispose();
        }
      });
      if (model) {
        model.traverse(o => {
          const m = o as THREE.Mesh;
          if (m.isMesh && !Array.isArray(m.material)) {
            m.material.dispose();
          }
        });
      }
      const bm = bubble.material;
      bm.map?.dispose();
      bm.dispose();
    },
  };
  return api;
}
