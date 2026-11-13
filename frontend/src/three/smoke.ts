import * as THREE from 'three';
import type { Fx, FxEnv } from './particles.ts';

const PUFFS = 14;
const LIFE = 4.6;
const RISE = 0.85;

function puffTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.45, 'rgba(250,250,252,0.55)');
    g.addColorStop(1, 'rgba(245,247,250,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createChimneySmoke(origin: THREE.Vector3, env: FxEnv): Fx {
  const group = new THREE.Group();
  const tex = puffTexture();
  const puffs = Array.from({ length: PUFFS }, (_, i) => {
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 });
    const sprite = new THREE.Sprite(mat);
    sprite.renderOrder = 8;
    group.add(sprite);
    return { sprite, mat, age: (i / PUFFS) * LIFE, seed: Math.random() * 6.28, size: 0.9 + Math.random() * 0.5 };
  });

  const update = (dt: number, time: number): void => {
    const drift = Math.min(1, Math.hypot(env.wind.x, env.wind.y));
    const wx = drift > 0 ? (env.wind.x / drift) * 0.45 + 0.12 : 0.12;
    const wz = drift > 0 ? (env.wind.y / drift) * 0.45 : 0;
    puffs.forEach(p => {
      p.age += dt;
      if (p.age >= LIFE) {
        p.age -= LIFE;
        p.seed = Math.random() * 6.28;
        p.size = 0.9 + Math.random() * 0.5;
      }
      const u = p.age / LIFE;
      const grow = 1 - Math.pow(1 - u, 2);
      const sway = Math.sin(time * 0.9 + p.seed) * 0.18 * u;
      p.sprite.position.set(
        origin.x + wx * p.age * (0.6 + u) + sway,
        origin.y + RISE * p.age * (1 - u * 0.25),
        origin.z + wz * p.age * (0.6 + u) + sway * 0.6
      );
      p.sprite.scale.setScalar((0.35 + grow * 1.5) * p.size);
      const fadeIn = Math.min(1, u / 0.12);
      p.mat.opacity = 0.62 * fadeIn * Math.pow(1 - u, 1.6);
    });
  };
  update(0, 0);
  return { object: group, update };
}
