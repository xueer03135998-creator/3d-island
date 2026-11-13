import * as THREE from 'three';

const MAX_PARTICLES = 720;
const MAX_RINGS = 6;

export interface BurstOptions {
  count: number;
  colors: number[];
  speed: number;
  up: number;
  gravity: number;
  life: number;
  spread?: number;
  shell?: boolean;
}

interface Particle {
  life: number;
  max: number;
  vx: number;
  vy: number;
  vz: number;
  g: number;
}

interface Ring {
  mesh: THREE.Mesh;
  t: number;
  dur: number;
  radius: number;
}

interface Tween {
  t: number;
  dur: number;
  fn: (k: number) => void;
  done?: () => void;
}

function dotTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  const ctx = c.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const tmpColor = new THREE.Color();

export class Effects {
  readonly group = new THREE.Group();
  private readonly points: THREE.Points;
  private readonly posAttr: THREE.BufferAttribute;
  private readonly colAttr: THREE.BufferAttribute;
  private readonly ps: Particle[] = [];
  private readonly rings: Ring[] = [];
  private readonly tweens: Tween[] = [];
  private readonly tex = dotTexture();
  private cursor = 0;
  private alive = 0;
  constructor() {
    const pos = new Float32Array(MAX_PARTICLES * 3);
    const col = new Float32Array(MAX_PARTICLES * 4);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.ps.push({ life: 0, max: 1, vx: 0, vy: 0, vz: 0, g: 0 });
    }
    this.posAttr = new THREE.BufferAttribute(pos, 3);
    this.colAttr = new THREE.BufferAttribute(col, 4);
    this.posAttr.setUsage(THREE.DynamicDrawUsage);
    this.colAttr.setUsage(THREE.DynamicDrawUsage);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', this.posAttr);
    geo.setAttribute('color', this.colAttr);
    const mat = new THREE.PointsMaterial({
      size: 0.55,
      map: this.tex,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 30;
    this.group.add(this.points);
    const ringGeo = new THREE.RingGeometry(0.82, 1, 48);
    ringGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < MAX_RINGS; i++) {
      const m = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: false })
      );
      m.visible = false;
      m.renderOrder = 29;
      this.group.add(m);
      this.rings.push({ mesh: m, t: 1, dur: 1, radius: 1 });
    }
  }

  burst(origin: THREE.Vector3, o: BurstOptions): void {
    const spread = o.spread ?? 0.2;
    for (let n = 0; n < o.count; n++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % MAX_PARTICLES;
      const p = this.ps[i];
      const a = Math.random() * Math.PI * 2;
      if (o.shell) {
        const u = Math.random() * 2 - 1;
        const s = Math.sqrt(1 - u * u);
        const sp = o.speed * (0.8 + Math.random() * 0.4);
        p.vx = Math.cos(a) * s * sp;
        p.vy = u * sp + o.up;
        p.vz = Math.sin(a) * s * sp;
      } else {
        const s = Math.random();
        p.vx = Math.cos(a) * s * o.speed;
        p.vz = Math.sin(a) * s * o.speed;
        p.vy = o.up * (0.5 + Math.random() * 0.8);
      }
      p.g = o.gravity;
      p.max = o.life * (0.7 + Math.random() * 0.5);
      p.life = p.max;
      this.posAttr.setXYZ(
        i,
        origin.x + (Math.random() - 0.5) * spread,
        origin.y + (Math.random() - 0.5) * spread,
        origin.z + (Math.random() - 0.5) * spread
      );
      tmpColor.setHex(o.colors[Math.floor(Math.random() * o.colors.length)]);
      this.colAttr.setXYZW(i, tmpColor.r, tmpColor.g, tmpColor.b, 1);
    }
    this.alive = MAX_PARTICLES;
  }

  ring(origin: THREE.Vector3, color: number, radius: number, dur = 0.9): void {
    const r = this.rings.find(x => x.t >= x.dur) ?? this.rings[0];
    r.t = 0;
    r.dur = dur;
    r.radius = radius;
    r.mesh.position.copy(origin);
    (r.mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
    r.mesh.visible = true;
  }

  tween(dur: number, fn: (k: number) => void, done?: () => void): void {
    this.tweens.push({ t: 0, dur: Math.max(0.001, dur), fn, done });
  }

  after(sec: number, fn: () => void): void {
    this.tween(sec, () => undefined, fn);
  }
  update(dt: number): void {
    if (this.alive > 0) {
      let any = false;
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = this.ps[i];
        if (p.life <= 0) {
          continue;
        }
        p.life -= dt;
        if (p.life <= 0) {
          this.colAttr.setW(i, 0);
          continue;
        }
        any = true;
        p.vy -= p.g * dt;
        const damp = Math.max(0, 1 - dt * 0.9);
        p.vx *= damp;
        p.vz *= damp;
        this.posAttr.setXYZ(i, this.posAttr.getX(i) + p.vx * dt, this.posAttr.getY(i) + p.vy * dt, this.posAttr.getZ(i) + p.vz * dt);
        this.colAttr.setW(i, Math.min(1, (p.life / p.max) * 2.2));
      }
      this.posAttr.needsUpdate = true;
      this.colAttr.needsUpdate = true;
      if (!any) {
        this.alive = 0;
      }
    }
    this.rings.forEach(r => {
      if (r.t >= r.dur) {
        return;
      }
      r.t += dt;
      const k = Math.min(1, r.t / r.dur);
      const e = 1 - (1 - k) * (1 - k);
      r.mesh.scale.setScalar(Math.max(0.01, r.radius * e));
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.85;
      r.mesh.visible = k < 1;
    });
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      tw.fn(k);
      if (k >= 1) {
        this.tweens.splice(i, 1);
        tw.done?.();
      }
    }
  }

  dispose(): void {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
    this.tex.dispose();
    this.rings[0].mesh.geometry.dispose();
    this.rings.forEach(r => (r.mesh.material as THREE.Material).dispose());
    this.tweens.length = 0;
  }
}
