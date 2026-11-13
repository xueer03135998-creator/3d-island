import * as THREE from 'three';
import type { Fx, FxEnv } from './particles.ts';

const RADIUS = 420;
const SLOTS = 3;
const SPAN = 0.75;

interface Meteor {
  active: boolean;
  t: number;
  dur: number;
  az: number;
  el: number;
  phi: number;
  tail: number;
}

function onSphere(az: number, el: number, out: THREE.Vector3): THREE.Vector3 {
  return out.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).multiplyScalar(RADIUS);
}

export function createMeteors(camera: THREE.Camera, env: FxEnv): Fx {
  const positions = new Float32Array(SLOTS * 9);
  const colors = new Float32Array(SLOTS * 9);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -9;
  const items: Meteor[] = [];
  for (let i = 0; i < SLOTS; i++) {
    items.push({ active: false, t: 0, dur: 1, az: 0, el: 0, phi: 0, tail: 0 });
  }
  let wait = 0.6;
  const head = new THREE.Vector3();
  const tail = new THREE.Vector3();
  const side = new THREE.Vector3();
  const dir = new THREE.Vector3();

  const spawn = (m: Meteor): void => {
    camera.getWorldDirection(dir);
    const view = Math.atan2(dir.x, dir.z);
    m.active = true;
    m.t = 0;
    m.dur = 0.9 + Math.random() * 0.7;
    m.az = view + (Math.random() - 0.5) * 1.6;
    m.el = 0.35 + Math.random() * 0.8;
    m.phi = Math.PI + (Math.random() - 0.5) * 0.9 - 0.45;
    m.tail = 0.16 + Math.random() * 0.12;
    if (Math.random() > 0.5) {
      m.phi = -m.phi;
    }
  };

  const write = (m: Meteor, i: number, fade: number): void => {
    const k = m.t / m.dur;
    const s = k * SPAN;
    const tailLen = m.tail * Math.min(1, k * 5);
    onSphere(m.az + Math.cos(m.phi) * s, m.el + Math.sin(m.phi) * s, head);
    onSphere(m.az + Math.cos(m.phi) * (s - tailLen), m.el + Math.sin(m.phi) * (s - tailLen), tail);
    side.crossVectors(head.clone().sub(tail), head).normalize().multiplyScalar(0.9);
    const b = i * 9;
    positions.set([head.x + side.x, head.y + side.y, head.z + side.z], b);
    positions.set([head.x - side.x, head.y - side.y, head.z - side.z], b + 3);
    positions.set([tail.x, tail.y, tail.z], b + 6);
    colors.set([fade, fade, fade, fade, fade, fade, 0, 0, 0], b);
  };

  return {
    object: mesh,
    update: dt => {
      const night = env.night;
      mesh.visible = night > 0.55;
      if (!mesh.visible) {
        items.forEach(m => {
          m.active = false;
        });
        return;
      }
      wait -= dt;
      if (wait <= 0) {
        const free = items.find(m => !m.active);
        if (free) {
          spawn(free);
        }
        wait = 0.7 + Math.random() * 1.6;
      }
      items.forEach((m, i) => {
        if (!m.active) {
          colors.fill(0, i * 9, i * 9 + 9);
          return;
        }
        m.t += dt;
        if (m.t >= m.dur) {
          m.active = false;
          colors.fill(0, i * 9, i * 9 + 9);
          return;
        }
        const k = m.t / m.dur;
        write(m, i, Math.min(1, k * 6, (1 - k) * 3) * Math.min(1, (night - 0.55) * 4));
      });
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
  };
}
