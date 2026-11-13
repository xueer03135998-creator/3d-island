import * as THREE from 'three';
import type { Effects } from './effects.ts';
import { mulberry32 } from './palette.ts';

const COUNT = 1300;
const TOTAL = 4.4;
const GATHER = 0.38;
const COLORS = [0xffe9a0, 0xffc860, 0xb9a0ff, 0x8fd4ff, 0xffffff, 0xff9fd0];
const tmp = new THREE.Color();
const WHITE = new THREE.Color(0xffffff);

function softTexture(rings: boolean): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (ctx) {
    const mid = size / 2;
    if (rings) {
      ctx.strokeStyle = 'rgba(255,230,160,1)';
      [0.98, 0.9, 0.62, 0.36].forEach((r, i) => {
        ctx.lineWidth = i === 0 ? 5 : 2.5;
        ctx.beginPath();
        ctx.arc(mid, mid, mid * r, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.lineWidth = 3;
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const r0 = mid * (i % 2 ? 0.9 : 0.62);
        ctx.beginPath();
        ctx.moveTo(mid + Math.cos(a) * r0, mid + Math.sin(a) * r0);
        ctx.lineTo(mid + Math.cos(a) * mid * 0.98, mid + Math.sin(a) * mid * 0.98);
        ctx.stroke();
      }
      for (let k = 0; k < 2; k++) {
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2 + k * Math.PI;
          const x = mid + Math.cos(a) * mid * 0.62;
          const y = mid + Math.sin(a) * mid * 0.62;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }
    } else {
      const g = ctx.createRadialGradient(mid, mid, 0, mid, mid, mid);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.3, 'rgba(255,230,170,0.6)');
      g.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function sparkTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.22, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.5, 'rgba(255,240,200,0.35)');
    g.addColorStop(1, 'rgba(255,230,170,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function pillarTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (ctx) {
    const g = ctx.createLinearGradient(0, 128, 0, 0);
    g.addColorStop(0, 'rgba(255,240,190,0.95)');
    g.addColorStop(0.5, 'rgba(255,214,140,0.45)');
    g.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 16, 128);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function additive(map: THREE.Texture, side: THREE.Side = THREE.FrontSide): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ map, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side });
}

/** Particles gather into the central dais, flash, then scatter into the sky while the clock turns. */
export class TimeMagic {
  readonly group = new THREE.Group();
  active = false;
  private t = 0;
  private fired = false;
  private onPeak: (() => void) | null = null;
  private readonly center = new THREE.Vector3();
  private readonly pos = new Float32Array(COUNT * 3);
  private readonly col = new Float32Array(COUNT * 4);
  private readonly posAttr = new THREE.BufferAttribute(this.pos, 3);
  private readonly colAttr = new THREE.BufferAttribute(this.col, 4);
  private readonly r0 = new Float32Array(COUNT);
  private readonly th0 = new Float32Array(COUNT);
  private readonly h0 = new Float32Array(COUNT);
  private readonly om = new Float32Array(COUNT);
  private readonly reach = new Float32Array(COUNT);
  private readonly dir = new Float32Array(COUNT * 3);
  private readonly points: THREE.Points;
  private readonly rune: THREE.Mesh;
  private readonly pillar: THREE.Mesh;
  private readonly flash: THREE.Sprite;
  private readonly textures = [softTexture(true), softTexture(false), pillarTexture(), sparkTexture()];

  constructor(private readonly effects: Effects) {
    this.posAttr.setUsage(THREE.DynamicDrawUsage);
    this.colAttr.setUsage(THREE.DynamicDrawUsage);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', this.posAttr);
    geo.setAttribute('color', this.colAttr);
    const mat = new THREE.PointsMaterial({
      size: 0.3,
      map: this.textures[3],
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 31;
    this.rune = new THREE.Mesh(new THREE.PlaneGeometry(11, 11).rotateX(-Math.PI / 2), additive(this.textures[0]));
    this.rune.renderOrder = 7;
    this.pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.2, 26, 24, 1, true), additive(this.textures[2], THREE.DoubleSide));
    this.pillar.renderOrder = 28;
    this.flash = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.textures[1], transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })
    );
    this.flash.renderOrder = 32;
    this.group.add(this.points, this.rune, this.pillar, this.flash);
    this.group.visible = false;
  }

  /** Starts the spell at `base`; `onPeak` fires once the particles have converged. */
  cast(base: THREE.Vector3, onPeak: () => void): void {
    if (this.active) {
      return;
    }
    this.active = true;
    this.fired = false;
    this.t = 0;
    this.onPeak = onPeak;
    this.center.set(base.x, base.y + 1.6, base.z);
    this.rune.position.set(base.x, base.y + 0.06, base.z);
    this.pillar.position.set(base.x, base.y + 13, base.z);
    this.flash.position.copy(this.center);
    const rand = mulberry32(Math.floor(Math.random() * 1e6));
    for (let i = 0; i < COUNT; i++) {
      this.r0[i] = 5 + rand() * 11;
      this.th0[i] = rand() * Math.PI * 2;
      this.h0[i] = -1 + rand() * rand() * 12;
      this.om[i] = (rand() < 0.5 ? -1 : 1) * (0.9 + rand() * 1.4);
      this.reach[i] = 7 + rand() * 24;
      const u = rand() * 2 - 1;
      const s = Math.sqrt(1 - u * u);
      const a = rand() * Math.PI * 2;
      this.dir.set([Math.cos(a) * s, 0.35 + Math.abs(u) * 0.9 + rand() * 0.5, Math.sin(a) * s], i * 3);
      tmp.setHex(COLORS[Math.floor(rand() * COLORS.length)]).lerp(WHITE, 0.4);
      this.col.set([tmp.r, tmp.g, tmp.b, 0], i * 4);
    }
    this.group.visible = true;
    this.update(0);
  }

  update(dt: number): void {
    if (!this.active) {
      return;
    }
    this.t += dt;
    const s = Math.min(1, this.t / TOTAL);
    this.moveParticles(s);
    this.moveProps(s);
    if (!this.fired && s >= GATHER) {
      this.fired = true;
      const peak = this.center.clone();
      peak.y = this.rune.position.y;
      [0xffe08a, 0xb9a0ff, 0x8fd4ff].forEach((c, i) => this.effects.after(i * 0.18, () => this.effects.ring(peak, c, 9 + i * 7, 1.3)));
      this.onPeak?.();
      this.onPeak = null;
    }
    if (s >= 1) {
      this.active = false;
      this.group.visible = false;
    }
  }

  private moveParticles(s: number): void {
    const c = this.center;
    const g = s < GATHER ? s / GATHER : 1;
    const q = s < GATHER ? 0 : (s - GATHER) / (1 - GATHER);
    const k = Math.pow(g, 2.3);
    const e = 1 - Math.pow(1 - q, 2.6);
    for (let i = 0; i < COUNT; i++) {
      let x: number;
      let y: number;
      let z: number;
      let a: number;
      if (s < GATHER) {
        const ang = this.th0[i] + this.om[i] * this.t * (1 + k * 2.5);
        const r = this.r0[i] * (1 - k) + 0.25 * k;
        x = c.x + Math.cos(ang) * r;
        z = c.z + Math.sin(ang) * r;
        y = c.y + this.h0[i] * (1 - k);
        a = Math.min(1, s / 0.08) * (0.8 + 0.2 * k);
      } else {
        const d = this.reach[i] * e;
        const sw = this.om[i] * q * 1.6;
        const dx = this.dir[i * 3];
        const dz = this.dir[i * 3 + 2];
        x = c.x + (dx * Math.cos(sw) - dz * Math.sin(sw)) * d;
        z = c.z + (dx * Math.sin(sw) + dz * Math.cos(sw)) * d;
        y = c.y + this.dir[i * 3 + 1] * d * 0.9;
        a = Math.max(0, 1 - Math.pow(q, 1.6));
      }
      this.pos[i * 3] = x;
      this.pos[i * 3 + 1] = y;
      this.pos[i * 3 + 2] = z;
      this.col[i * 4 + 3] = a;
    }
    this.posAttr.needsUpdate = true;
    this.colAttr.needsUpdate = true;
  }

  private moveProps(s: number): void {
    const fadeIn = Math.min(1, s / 0.1);
    const fadeOut = 1 - Math.pow(Math.max(0, (s - 0.72) / 0.28), 1.5);
    (this.rune.material as THREE.MeshBasicMaterial).opacity = 0.9 * fadeIn * fadeOut;
    this.rune.rotation.y = this.t * 0.9;
    const rs = 0.6 + Math.min(1, s / GATHER) * 0.5 + Math.max(0, s - GATHER) * 0.5;
    this.rune.scale.setScalar(rs);
    const near = s < GATHER ? Math.pow(s / GATHER, 3) : Math.max(0, 1 - (s - GATHER) / 0.35);
    (this.pillar.material as THREE.MeshBasicMaterial).opacity = 0.85 * near;
    this.pillar.scale.set(0.5 + near * 0.7, 1, 0.5 + near * 0.7);
    this.pillar.rotation.y = this.t * 1.4;
    const f = s < GATHER ? 0.15 * Math.pow(s / GATHER, 3) : Math.max(0, 1 - (s - GATHER) / 0.16);
    (this.flash.material as THREE.SpriteMaterial).opacity = Math.min(1, f * (s < GATHER ? 1 : 1.2));
    this.flash.scale.setScalar(2 + f * (s < GATHER ? 6 : 22));
  }

  dispose(): void {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
    [this.rune, this.pillar].forEach(m => {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
    (this.flash.material as THREE.Material).dispose();
    this.textures.forEach(t => t.dispose());
  }
}
