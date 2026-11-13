import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { BuildingEntry } from './buildings/index.ts';
import { LIGHT_SPECS, type PaneSpec } from './buildings/lightSpecs.ts';
import { groundHeight } from './palette.ts';
import type { Fx, FxEnv } from './particles.ts';

const WARM = 0xffc46a;
const LAMP_DAY = 0xf0cf8c;
const SPILL_COLOR = 0xffb45c;
const SPILL_POWER = 22;
const SPILL_DIST = 30;

function smooth(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

function haloTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,214,140,1)');
    g.addColorStop(0.35, 'rgba(255,190,100,0.45)');
    g.addColorStop(1, 'rgba(255,170,80,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function paneGeometry(p: PaneSpec, grow: number, push: number): THREE.BufferGeometry {
  const geo = p.round
    ? new THREE.CircleGeometry((p.w / 2) * grow, 20)
    : new THREE.PlaneGeometry(p.w * grow, p.h * grow);
  geo.rotateY(p.ry ?? 0);
  const ry = p.ry ?? 0;
  geo.translate(p.x + Math.sin(ry) * push, p.y, p.z + Math.cos(ry) * push);
  return geo;
}

function mergedMesh(geos: THREE.BufferGeometry[], mat: THREE.Material, order: number): THREE.Mesh | null {
  const merged = geos.length ? mergeGeometries(geos) : null;
  if (!merged) {
    return null;
  }
  const mesh = new THREE.Mesh(merged, mat);
  mesh.renderOrder = order;
  mesh.frustumCulled = false;
  return mesh;
}

export function createNightLights(buildings: BuildingEntry[], env: FxEnv): Fx {
  const root = new THREE.Group();
  const halo = haloTexture();
  const paneMat = new THREE.MeshBasicMaterial({ color: WARM, transparent: true, opacity: 0, depthWrite: false, fog: false });
  const haloMat = new THREE.MeshBasicMaterial({
    map: halo,
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const lampMat = new THREE.MeshBasicMaterial({ color: LAMP_DAY, fog: false });
  const spriteMat = new THREE.SpriteMaterial({ map: halo, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const poolGeo = new THREE.CircleGeometry(1, 28);
  poolGeo.rotateX(-Math.PI / 2);
  const poolMat = new THREE.MeshBasicMaterial({
    map: halo,
    color: 0xffb45c,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const lampGeo = new THREE.SphereGeometry(0.2, 10, 8);
  lampGeo.scale(1, 1.25, 1);
  const spills: Array<{ light: THREE.PointLight; phase: number }> = [];

  buildings.forEach((b, bi) => {
    const spec = LIGHT_SPECS[b.id];
    const g = new THREE.Group();
    g.position.copy(b.group.position);
    g.rotation.y = b.group.rotation.y;
    const panes = mergedMesh(spec.panes.map(p => paneGeometry(p, 1, 0.02)), paneMat, 8);
    const halos = mergedMesh(spec.panes.map(p => paneGeometry(p, 2.3, 0.06)), haloMat, 9);
    [panes, halos].forEach(m => m && g.add(m));
    const yaw = g.rotation.y;
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    spec.lamps.forEach(([x, y, z]) => {
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.set(x, y, z);
      // 灯头柔和光晕（小而不抢眼，配合 Bloom 形成自然辉光）
      const glow = new THREE.Sprite(spriteMat);
      glow.position.set(x, y, z);
      glow.scale.setScalar(0.85);
      glow.renderOrder = 10;
      g.add(lamp, glow);
      // 地面光池：把光照"落"到地上，替代悬浮光团
      const wx = b.group.position.x + x * cy + z * sy;
      const wz = b.group.position.z - x * sy + z * cy;
      const pool = new THREE.Mesh(poolGeo, poolMat);
      pool.position.set(wx, groundHeight(wx, wz) + 0.035, wz);
      pool.scale.setScalar(1.6 + Math.max(0, y - 2.4) * 0.7);
      pool.renderOrder = 6;
      g.add(pool);
    });
    spec.spill.forEach(([x, y, z], i) => {
      const light = new THREE.PointLight(SPILL_COLOR, 0, SPILL_DIST, 2);
      light.position.set(x, y, z);
      g.add(light);
      spills.push({ light, phase: bi * 1.7 + i * 2.3 });
    });
    root.add(g);
  });

  const dayLamp = new THREE.Color(LAMP_DAY);
  const nightLamp = new THREE.Color(0xffe3a0);
  return {
    object: root,
    update: (_dt, time) => {
      const k = smooth(0.2, 0.8, Math.min(1, env.night + env.rain * 0.25 * env.night));
      paneMat.opacity = 0.6 * k;
      haloMat.opacity = 0.2 * k;
      spriteMat.opacity = 0.2 * k;
      poolMat.opacity = 0.3 * k;
      lampMat.color.copy(dayLamp).lerp(nightLamp, k);
      spills.forEach(s => {
        const flicker = 1 + Math.sin(time * 3.1 + s.phase) * 0.05 + Math.sin(time * 7.3 + s.phase * 2) * 0.03;
        s.light.intensity = SPILL_POWER * k * flicker;
      });
    },
  };
}
