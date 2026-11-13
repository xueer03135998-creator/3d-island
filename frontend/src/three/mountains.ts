import * as THREE from 'three';
import { mulberry32 } from './palette.ts';
import { SUNSET_THETA } from './sunPath.ts';

const COLUMNS = 120;
const ROWS = [0, 0.32, 0.66, 1];

interface Layer {
  radius: number;
  base: number;
  amp: number;
  spread: number;
  foot: number;
  top: number;
  haze: number;
  seed: number;
}

const LAYERS: Layer[] = [
  { radius: 252, base: 34, amp: 46, spread: 60, foot: 0x4f8a55, top: 0x86b08a, haze: 0.2, seed: 7 },
  { radius: 288, base: 48, amp: 52, spread: 70, foot: 0x6f9f86, top: 0xa0bfb4, haze: 0.42, seed: 19 },
  { radius: 324, base: 62, amp: 58, spread: 80, foot: 0x9fb4cc, top: 0xc6d4e6, haze: 0.66, seed: 31 },
];
const FREQ = [3, 5, 9, 17];
const WEIGHT = [1, 0.8, 0.55, 0.35];

const VERT = `
attribute vec3 color;
attribute float aHaze;
varying vec3 vColor;
varying float vHaze;
varying vec3 vWorld;
void main() {
  vColor = color;
  vHaze = aHaze;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FRAG = `
uniform vec3 uFog;
uniform vec3 uSun;
uniform float uLight;
varying vec3 vColor;
varying float vHaze;
varying vec3 vWorld;
void main() {
  vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  if (dot(n, normalize(cameraPosition - vWorld)) < 0.0) n = -n;
  float facet = 0.78 + 0.22 * clamp(dot(n, normalize(uSun)) * 0.5 + 0.5, 0.0, 1.0) * 1.4;
  vec3 lit = vColor * facet * uLight;
  gl_FragColor = vec4(mix(lit, uFog, vHaze), 1.0);
  #include <colorspace_fragment>
}`;

function ridge(theta: number, phases: number[]): number {
  let sum = 0;
  let wsum = 0;
  FREQ.forEach((f, i) => {
    sum += WEIGHT[i] * (1 - Math.abs(Math.sin(f * theta * 0.5 + phases[i])));
    wsum += WEIGHT[i];
  });
  return Math.pow(sum / wsum, 1.5);
}

function buildLayer(layer: Layer, out: { pos: number[]; col: number[]; haze: number[]; idx: number[] }): void {
  const rand = mulberry32(layer.seed);
  const phases = FREQ.map(() => rand() * Math.PI * 2);
  const jitter: number[] = [];
  for (let i = 0; i < COLUMNS; i++) {
    jitter.push(rand());
  }
  jitter.push(jitter[0]);
  const foot = new THREE.Color(layer.foot);
  const top = new THREE.Color(layer.top);
  const c = new THREE.Color();
  const start = out.pos.length / 3;
  for (let i = 0; i <= COLUMNS; i++) {
    const theta = (i / COLUMNS) * Math.PI * 2;
    const raw = layer.base * (0.7 + 0.3 * jitter[i]) + layer.amp * ridge(theta, phases) * (0.85 + 0.3 * jitter[i]);
    const dTheta = Math.abs(Math.atan2(Math.sin(theta - SUNSET_THETA), Math.cos(theta - SUNSET_THETA)));
    const keep = THREE.MathUtils.smoothstep(dTheta, 0.3, 0.8);
    const h = raw * keep - 12 * (1 - keep);
    ROWS.forEach((t, r) => {
      const rad = layer.radius + (1 - t) * layer.spread * (0.75 + 0.5 * jitter[(i * 7 + r) % COLUMNS]);
      const y = -8 + (h + 8) * Math.pow(t, 0.9);
      out.pos.push(Math.cos(theta) * rad, y, Math.sin(theta) * rad);
      c.copy(foot).lerp(top, Math.min(1, t * 1.15)).offsetHSL(0, 0, (jitter[(i * 3 + r) % COLUMNS] - 0.5) * 0.05);
      out.col.push(c.r, c.g, c.b);
      out.haze.push(Math.min(0.95, layer.haze + (1 - t) * 0.22));
    });
  }
  const rows = ROWS.length;
  for (let i = 0; i < COLUMNS; i++) {
    for (let r = 0; r < rows - 1; r++) {
      const a = start + i * rows + r;
      const b = a + 1;
      const d = start + (i + 1) * rows + r;
      const e = d + 1;
      out.idx.push(a, d, b, b, d, e);
    }
  }
}

export function createMountains(): THREE.Mesh {
  const data = { pos: [] as number[], col: [] as number[], haze: [] as number[], idx: [] as number[] };
  LAYERS.slice().reverse().forEach(layer => buildLayer(layer, data));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(data.pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(data.col, 3));
  geo.setAttribute('aHaze', new THREE.Float32BufferAttribute(data.haze, 1));
  geo.setIndex(data.idx);
  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: THREE.DoubleSide,
    fog: false,
    uniforms: {
      uFog: { value: new THREE.Color(0xdde6ef) },
      uSun: { value: new THREE.Vector3(0, 1, 0) },
      uLight: { value: 1 },
    },
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -4;
  return mesh;
}
