import * as THREE from 'three';
import { PALETTE, SEA_LEVEL, SHORE_T, coastGlsl } from './palette.ts';

const COMMON = `
uniform float uTime;
uniform float uWave;
varying vec3 vWorld;
${coastGlsl()}
float waveH(vec2 p) {
  float h = sin(dot(p, vec2(0.22, 0.14)) + uTime * 0.9) * 0.2;
  h += sin(dot(p, vec2(-0.12, 0.27)) + uTime * 1.1) * 0.13;
  h += sin(dot(p, vec2(0.46, -0.38)) + uTime * 1.7) * 0.05;
  h += sin(dot(p, vec2(0.7, 0.62)) - uTime * 2.1) * 0.025;
  return h * uWave;
}
float shoreDist(vec2 p) {
  return length(p) - ${SHORE_T.toFixed(3)} * coastR(atan(p.y, p.x));
}`;

const VERT = `
${COMMON}
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  w.y += waveH(w.xz) * smoothstep(1.0, 9.0, shoreDist(w.xz));
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FRAG = `
uniform vec3 uShallow;
uniform vec3 uMid;
uniform vec3 uDeep;
uniform vec3 uLilac;
uniform vec3 uFog;
uniform vec3 uSun;
uniform vec3 uGlint;
uniform float uGlintK;
uniform vec2 uFogRange;
${COMMON}

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 p = vWorld.xz;
  float th = atan(p.y, p.x);
  float sd = shoreDist(p);

  vec3 col = mix(uShallow, uMid, smoothstep(0.0, 7.0, sd));
  col = mix(col, uDeep, smoothstep(8.0, 55.0, sd));

  // 大尺度波动纹理
  vec2 q = p * vec2(0.16, 0.5) + vec2(uTime * 0.03, uTime * 0.012);
  float s1 = fbm(q + fbm(p * 0.05) * 2.0);
  col *= 1.0 + 0.1 * smoothstep(0.5, 0.58, s1);
  float s2 = fbm(p * vec2(0.3, 0.8) + vec2(-uTime * 0.035, 7.0));
  col = mix(col, mix(col, uLilac, 0.55), smoothstep(0.56, 0.64, s2) * 0.14);

  // 精细浪面法线（原版）
  float e = 0.35;
  float h0 = waveH(p);
  vec3 N = normalize(vec3(-(waveH(p + vec2(e, 0.0)) - h0) / e, 1.0, -(waveH(p + vec2(0.0, e)) - h0) / e));
  N = normalize(N + vec3((noise(p * 0.9 + uTime * 0.25) - 0.5) * 0.25, 0.0, (noise(p * 0.9 - uTime * 0.2 + 9.0) - 0.5) * 0.25));
  vec3 L = normalize(uSun);
  vec3 V = normalize(cameraPosition - vWorld);
  float lit = dot(N, L);
  col *= 0.9 + 0.2 * smoothstep(0.3, 0.95, lit);
  float crest = smoothstep(0.17, 0.3, h0 / max(uWave, 0.3));
  col *= 1.0 + crest * 0.12;
  float g = pow(max(dot(reflect(-V, N), L), 0.0), 70.0);
  col = mix(col, uGlint, smoothstep(0.2, 0.75, g) * 0.6 * uGlintK);

  // 阳光闪烁亮点（波光粼粼）
  vec2 gp = p * 2.4;
  vec2 gc = floor(gp);
  float gr = hash(gc);
  vec2 jit = (vec2(hash(gc + 7.1), hash(gc + 3.7)) - 0.5) * 0.45;
  float dotm = smoothstep(0.3, 0.0, length(fract(gp) - 0.5 - jit));
  float tw = pow(0.5 + 0.5 * sin(uTime * (2.0 + gr * 3.0) + gr * 40.0), 6.0);
  float sunLobe = 0.25 + 0.75 * pow(max(dot(N, normalize(L + V)), 0.0), 20.0);
  float gfade = 1.0 - smoothstep(30.0, 170.0, length(vWorld - cameraPosition));
  col += vec3(1.0, 0.97, 0.88) * step(0.5, gr) * tw * dotm * sunLobe * gfade * 1.5 * uGlintK;

  // 岸边泡沫纹
  float cA = sin(p.x * 1.3 + sin(p.y * 1.1 + uTime * 0.8) * 1.6 + uTime * 0.6);
  float cB = sin(p.y * 1.5 + sin(p.x * 1.2 - uTime * 0.7) * 1.6 - uTime * 0.5);
  float caus = pow(1.0 - abs(cA * cB), 6.0);
  col += vec3(0.5, 0.95, 0.88) * caus * 0.2 * uGlintK * (1.0 - smoothstep(2.0, 18.0, sd));

  float wob = 0.5 * sin(uTime * 0.7 + th * 9.0) + 0.3 * sin(uTime * 0.5 + th * 17.0);
  float foam = 1.0 - smoothstep(0.0, 1.1, abs(sd + 0.9 - wob * 0.7));
  float f = fract(sd * 0.2 + uTime * 0.1);
  float band = smoothstep(0.0, 0.1, f) * (1.0 - smoothstep(0.1, 0.24, f));
  float bandMask = smoothstep(0.35, 0.7, fbm(p * 0.35 + vec2(uTime * 0.04, 0.0)));
  foam = max(foam, band * bandMask * 0.7);
  float day = clamp(dot(uFog, vec3(0.33)) * 1.6, 0.25, 1.0);
  col = mix(col, vec3(day), foam * 0.55 * (1.0 - smoothstep(0.0, 16.0, sd)));

  // —— 浪拍沙滩：泡沫水线随潮汐进退，后方留湿沙暗痕 ——
  float wash = 0.5 + 0.5 * sin(uTime * 0.85 + th * 3.5);
  float washEdge = wash * 0.18;
  float shoreK = smoothstep(-0.5, -0.05, sd);
  float wdist = abs(sd + washEdge);
  float washFoam = (1.0 - smoothstep(0.02, 0.13, wdist)) * shoreK;
  washFoam *= 0.72 + 0.28 * fbm(p * 0.9 + vec2(uTime * 0.6, 0.0));
  float wetK = smoothstep(0.05, 0.32, sd + washEdge) * (1.0 - smoothstep(0.05, 0.5, sd + washEdge)) * shoreK;
  col = mix(col, vec3(0.96, 0.94, 0.86), washFoam * 0.6);
  col = mix(col, col * 0.7, wetK * 0.5);

  // 距离雾
  float dist = length(vWorld - cameraPosition);
  col = mix(col, uFog, smoothstep(uFogRange.x * 1.5, uFogRange.y * 1.1, dist));
  float alpha = mix(0.34, 0.92, smoothstep(-1.0, 16.0, sd));

  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
}`;

export interface Sea {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
}

function polarGrid(inner: number, outer: number, rings: number, segs: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= rings; i++) {
    const r = inner + (outer - inner) * (i / rings) ** 2;
    for (let j = 0; j <= segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      pos.push(Math.cos(a) * r, 0, Math.sin(a) * r);
    }
  }
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segs; j++) {
      const a = i * (segs + 1) + j;
      const b = a + segs + 1;
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  return geo;
}

export function createSea(fogNear: number, fogFar: number): Sea {
  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uWave: { value: 1 },
      uShallow: { value: new THREE.Color(PALETTE.seaShallow) },
      uMid: { value: new THREE.Color(PALETTE.seaMid) },
      uDeep: { value: new THREE.Color(PALETTE.seaDeep) },
      uLilac: { value: new THREE.Color(PALETTE.seaLilac) },
      uFog: { value: new THREE.Color(PALETTE.fog) },
      uGlint: { value: new THREE.Color(PALETTE.sunGlow) },
      uGlintK: { value: 1 },
      uSun: { value: new THREE.Vector3(0, 1, 0) },
      uFogRange: { value: new THREE.Vector2(fogNear, fogFar) },
    },
  });
  const mesh = new THREE.Mesh(polarGrid(10, 520, 72, 144), material);
  mesh.position.y = SEA_LEVEL;
  mesh.renderOrder = 1;
  mesh.frustumCulled = false;
  return { mesh, material };
}
