import * as THREE from 'three';
import { Builder } from './builder.ts';
import { PALETTE, mulberry32 } from './palette.ts';

const SKY_VERT = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const SKY_FRAG = `
uniform vec3 uTop;
uniform vec3 uMid;
uniform vec3 uHorizon;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
uniform vec3 uMoonDir;
uniform float uNight;
uniform float uCloud;
uniform float uTime;
uniform vec3 uDipper[7];
varying vec3 vDir;

float hash3(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash3(vec3(i, 0.0));
  float b = hash3(vec3(i + vec2(1.0, 0.0), 0.0));
  float c = hash3(vec3(i + vec2(0.0, 1.0), 0.0));
  float d = hash3(vec3(i + vec2(1.0, 1.0), 0.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.55;
  for (int i = 0; i < 4; i++) {
    v += a * vnoise(p);
    p = p * 2.1 + vec2(3.7, 9.2);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y, 0.0, 1.0);
  vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.22, h));
  col = mix(col, uTop, smoothstep(0.2, 0.85, h));

  float glowK = 1.0 - uCloud * 0.7;
  vec3 sd = normalize(uSunDir);
  float s = max(dot(d, sd), 0.0);
  float ang = acos(clamp(dot(d, sd), -1.0, 1.0));
  float sunUp = smoothstep(-0.12, 0.02, uSunDir.y);
  float below = smoothstep(-0.012, 0.012, d.y);
  col += uSunColor * (pow(s, 6.0) * 0.16 + pow(s, 48.0) * 0.3) * glowK * sunUp;
  col += uSunColor * (exp(-ang * 9.0) * 0.5 + exp(-ang * 3.0) * 0.18) * (1.0 - uCloud * 0.5) * sunUp * below;
  float low = 1.0 - clamp(uSunDir.y * 2.6, 0.0, 1.0);
  float rad = 0.05 * (1.0 + low * 0.5);
  float disc = 1.0 - smoothstep(rad - 0.0022, rad, ang);
  float rim = smoothstep(rad - 0.012, rad - 0.002, ang) * disc;
  float halo = smoothstep(rad, rad + 0.004, ang) * (1.0 - smoothstep(rad + 0.004, rad + 0.05, ang));
  vec3 coreCol = mix(vec3(1.0, 0.98, 0.9), vec3(1.0, 0.82, 0.5), low);
  vec3 edgeCol = mix(vec3(1.0, 0.86, 0.6), vec3(1.0, 0.42, 0.14), low);
  vec3 discCol = mix(coreCol, edgeCol, rim);
  float vis = (1.0 - uCloud * 0.4) * sunUp * below;
  col = mix(col, vec3(1.0, 0.58, 0.28), halo * low * 0.5 * vis);
  col = mix(col, discCol, disc * vis);

  vec3 sp = d * 150.0;
  vec3 cell = floor(sp);
  float r = hash3(cell);
  vec3 jitter = vec3(hash3(cell + 3.1), hash3(cell + 7.7), hash3(cell + 11.3)) * 0.5 + 0.25;
  float dist = length(fract(sp) - jitter);
  float star = step(0.975, r) * smoothstep(0.2, 0.0, dist) * smoothstep(0.02, 0.2, d.y);
  float tw = 0.65 + 0.35 * sin(uTime * 2.2 + r * 80.0);
  col += vec3(0.92, 0.94, 1.0) * star * tw * uNight * (1.0 - uCloud * 0.95);

  // —— 极光：夜空中北方地平线上的光幕（绿→紫，帘幕流动） ——
  vec3 north = normalize(vec3(0.0, 0.0, -1.0));
  vec3 east = normalize(vec3(1.0, 0.0, 0.0));
  float northness = smoothstep(-0.3, 0.4, dot(d, north));
  float aUp = max(d.y, 0.0);
  float aSide = dot(d, east);
  vec2 ap = vec2(aSide * 4.0 + uTime * 0.3, aUp * 12.0 - uTime * 0.08);
  float c1 = fbm(ap);
  float c2 = vnoise(vec2(aSide * 26.0 + uTime * 0.6, aUp * 8.0));
  float curtain = c1 * 0.65 + c2 * 0.35;
  float stripes = 0.5 + 0.5 * sin(aSide * 22.0 + c1 * 8.0 + uTime * 0.4);
  curtain *= 0.6 + 0.4 * stripes;
  float aurVis = uNight * (1.0 - uCloud * 0.85) * northness * smoothstep(0.02, 0.12, aUp) * (1.0 - smoothstep(0.25, 0.55, aUp));
  vec3 aurCol = mix(vec3(0.2, 1.0, 0.5), vec3(0.45, 0.3, 1.0), smoothstep(0.05, 0.35, aUp));
  aurCol += vec3(0.0, 0.7, 0.8) * smoothstep(-0.1, 0.2, aSide) * 0.25;
  float glow = 0.25 + 0.75 * clamp(curtain, 0.0, 1.0);
  col += aurCol * aurVis * glow * 0.55;

  // —— 北斗七星：七颗亮星 + 柔和光晕 ——
  float gK = uNight * (1.0 - uCloud * 0.85) * smoothstep(0.02, 0.1, d.y);
  for (int i = 0; i < 7; i++) {
    float ang = acos(clamp(dot(d, normalize(uDipper[i])), -1.0, 1.0));
    float twi = 0.75 + 0.25 * sin(uTime * (1.1 + float(i) * 0.4) + float(i) * 3.1);
    col += vec3(0.85, 0.88, 1.0) * (smoothstep(0.018, 0.0, ang) * 0.55 + smoothstep(0.05, 0.02, ang) * 0.3) * twi * gK * 1.4;
  }

  float m = dot(d, normalize(uMoonDir));
  float moonUp = smoothstep(-0.06, 0.04, uMoonDir.y);
  float moonK = uNight * moonUp * (1.0 - uCloud * 0.8);
  col += vec3(0.55, 0.62, 0.9) * pow(max(m, 0.0), 60.0) * 0.35 * moonK;
  col = mix(col, vec3(0.97, 0.95, 0.86), smoothstep(0.99935, 0.99955, m) * moonK);

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

/** 北斗七星方向（碗 4 星 + 柄 3 星），上传前归一化。 */
const DIPPER: Array<[number, number, number]> = [
  [0.08, 0.66, 0.74],
  [0.2, 0.57, 0.79],
  [0.12, 0.46, 0.88],
  [-0.02, 0.4, 0.92],
  [-0.12, 0.32, 0.94],
  [-0.24, 0.23, 0.95],
  [-0.34, 0.14, 0.93],
];

export function createSky(): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Color(PALETTE.skyTop) },
      uMid: { value: new THREE.Color(PALETTE.skyMid) },
      uHorizon: { value: new THREE.Color(PALETTE.skyHorizon) },
      uSunColor: { value: new THREE.Color(PALETTE.sunGlow) },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uMoonDir: { value: new THREE.Vector3(0, -1, 0) },
      uNight: { value: 0 },
      uCloud: { value: 0 },
      uTime: { value: 0 },
      uDipper: { value: DIPPER.map(([x, y, z]) => new THREE.Vector3(x, y, z).normalize()) },
    },
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(480, 32, 16), material);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return mesh;
}

export interface Clouds {
  group: THREE.Group;
  material: THREE.MeshBasicMaterial;
  update: (dt: number, wind: THREE.Vector2) => void;
  setCover: (cover: number) => void;
}

const CLOUD_TOP = 0xffffff;
const CLOUD_BELLY = 0xc9c7e0;
const CLOUD_MID = 0xf1f0fa;
const CLOUD_COUNT = 36;
const CLOUD_SPAN = 320;

interface CloudItem {
  mesh: THREE.Mesh;
  threshold: number;
  speed: number;
}

function makeCloud(rand: () => number, material: THREE.Material): THREE.Mesh {
  const b = new Builder();
  const spot = (rx: number, rz: number): [number, number] => {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand());
    return [Math.cos(a) * rx * r, Math.sin(a) * rz * r];
  };
  const base = 6 + Math.floor(rand() * 3);
  for (let k = 0; k < base; k++) {
    const [x, z] = spot(18, 11);
    const s = 7 + rand() * 4;
    b.sph(s, CLOUD_BELLY, x, -1.8, z, { sy: 0.26 }, 1);
    b.sph(s * 0.95, CLOUD_MID, x, 0.8, z, { sy: 0.5 }, 1);
  }
  const mid = 3 + Math.floor(rand() * 2);
  for (let k = 0; k < mid; k++) {
    const [x, z] = spot(10, 6.5);
    b.sph(5.5 + rand() * 2.5, CLOUD_TOP, x, 4 + rand() * 1.5, z, { sy: 0.72 }, 1);
  }
  const top = 1 + Math.floor(rand() * 2);
  for (let k = 0; k < top; k++) {
    const [x, z] = spot(4.5, 3);
    b.sph(4 + rand() * 1.6, CLOUD_TOP, x, 8 + rand() * 1.5, z, { sy: 0.85 }, 1);
  }
  return b.mesh(material, false);
}

export function createClouds(): Clouds {
  const rand = mulberry32(55);
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.88,
    fog: false,
    depthWrite: false,
  });
  const items: CloudItem[] = [];
  for (let i = 0; i < CLOUD_COUNT; i++) {
    const mesh = makeCloud(rand, material);
    const th = rand() * Math.PI * 2;
    const rad = 140 + rand() * 170;
    mesh.position.set(Math.cos(th) * rad, rad * (0.46 + rand() * 0.4) + 20, Math.sin(th) * rad);
    mesh.rotation.y = rand() * 0.6 - 0.3;
    mesh.scale.setScalar(0.9 + rand() * 1.1);
    mesh.renderOrder = -5;
    mesh.frustumCulled = false;
    group.add(mesh);
    items.push({ mesh, threshold: (i / CLOUD_COUNT) * 0.95, speed: 1.6 + rand() * 1.8 });
  }
  let cover = 0.3;
  const baseScale = items.map(it => it.mesh.scale.x);
  const applyScale = (): void => {
    items.forEach((it, i) => {
      const t = THREE.MathUtils.clamp((cover - it.threshold) / 0.18 + 0.02, 0, 1);
      it.mesh.scale.setScalar(Math.max(0.001, baseScale[i] * t * t * (3 - 2 * t)));
      it.mesh.visible = t > 0.01;
    });
  };
  applyScale();
  return {
    group,
    material,
    setCover: c => {
      cover = c;
      applyScale();
    },
    update: (dt, wind) => {
      items.forEach(it => {
        const p = it.mesh.position;
        p.x += wind.x * it.speed * dt * 2.2;
        p.z += wind.y * it.speed * dt * 2.2;
        if (p.x > CLOUD_SPAN) {
          p.x -= CLOUD_SPAN * 2;
        }
        if (p.z > CLOUD_SPAN) {
          p.z -= CLOUD_SPAN * 2;
        }
      });
    },
  };
}
