import * as THREE from 'three';
import type { Fx } from './particles.ts';

const POOL = 10;
const LIFE = 1.8;

interface Note {
  sprite: THREE.Sprite;
  age: number;
  delay: number;
  drift: number;
  active: boolean;
}

export interface Notes extends Fx {
  emit: (origin: THREE.Vector3, count: number) => void;
}

function noteTexture(glyph: string, color: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.font = 'bold 50px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(glyph, 32, 34);
    ctx.fillStyle = color;
    ctx.fillText(glyph, 32, 34);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createNotes(): Notes {
  const group = new THREE.Group();
  const textures = [noteTexture('♪', '#e0607e'), noteTexture('♫', '#4f9fd8'), noteTexture('♪', '#f0a23c')];
  const items: Note[] = [];
  for (let i = 0; i < POOL; i++) {
    const mat = new THREE.SpriteMaterial({ map: textures[i % textures.length], transparent: true, depthWrite: false, fog: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.55, 0.55, 1);
    sprite.renderOrder = 27;
    sprite.visible = false;
    group.add(sprite);
    items.push({ sprite, age: 0, delay: 0, drift: 0, active: false });
  }
  let cursor = 0;
  const origins = items.map(() => new THREE.Vector3());

  return {
    object: group,
    emit: (origin, count) => {
      for (let n = 0; n < count; n++) {
        const i = cursor;
        cursor = (cursor + 1) % POOL;
        origins[i].copy(origin);
        items[i].age = 0;
        items[i].delay = n * 0.28;
        items[i].drift = (Math.random() - 0.5) * 1.4;
        items[i].active = true;
      }
    },
    update: dt => {
      items.forEach((it, i) => {
        if (!it.active) {
          return;
        }
        if (it.delay > 0) {
          it.delay -= dt;
          return;
        }
        it.age += dt;
        const k = it.age / LIFE;
        if (k >= 1) {
          it.active = false;
          it.sprite.visible = false;
          return;
        }
        it.sprite.visible = true;
        it.sprite.position.set(origins[i].x + it.drift * k + Math.sin(it.age * 5) * 0.12, origins[i].y + k * 1.8, origins[i].z);
        (it.sprite.material as THREE.SpriteMaterial).opacity = Math.min(1, (1 - k) * 2.2);
      });
    },
  };
}
