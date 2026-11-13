import * as THREE from 'three';
import { coastRadius, mulberry32 } from './palette.ts';
import type { Fx, FxEnv } from './particles.ts';

const RAIN_COUNT = 2400;
const RAIN_HALF = 36;

const RAIN_VERT = `
uniform float uTime;
uniform vec2 uWind;
attribute float aSeed;
attribute float aEnd;
varying float vA;
void main() {
  float fall = fract(aSeed * 7.13 + uTime * (1.4 + aSeed * 0.5));
  vec3 p = position;
  p.y = (1.0 - fall) * 30.0;
  p.xz += uWind * (1.0 - fall) * 5.0;
  p += aEnd * vec3(uWind.x * 0.35, 1.2, uWind.y * 0.35);
  vA = 1.0 - aEnd * 0.8;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const RAIN_FRAG = `
uniform float uOpacity;
varying float vA;
void main() {
  gl_FragColor = vec4(0.86, 0.91, 1.0, 0.42 * uOpacity * vA);
}`;

export interface RainFx extends Fx {
  follow: (camera: THREE.Camera) => void;
}

export function createRain(env: FxEnv): RainFx {
  const rand = mulberry32(77);
  const pos = new Float32Array(RAIN_COUNT * 6);
  const seed = new Float32Array(RAIN_COUNT * 2);
  const end = new Float32Array(RAIN_COUNT * 2);
  for (let i = 0; i < RAIN_COUNT; i++) {
    const x = (rand() - 0.5) * RAIN_HALF * 2;
    const z = (rand() - 0.5) * RAIN_HALF * 2;
    const s = rand();
    for (let k = 0; k < 2; k++) {
      pos.set([x, 0, z], (i * 2 + k) * 3);
      seed[i * 2 + k] = s;
      end[i * 2 + k] = k;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geo.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
  const mat = new THREE.ShaderMaterial({
    vertexShader: RAIN_VERT,
    fragmentShader: RAIN_FRAG,
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uWind: { value: new THREE.Vector2() }, uOpacity: { value: 0 } },
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  lines.renderOrder = 30;
  return {
    object: lines,
    follow: camera => {
      lines.position.set(camera.position.x, 0, camera.position.z);
    },
    update: (_dt, time) => {
      lines.visible = env.rain > 0.02;
      mat.uniforms.uTime.value = time;
      (mat.uniforms.uWind.value as THREE.Vector2).copy(env.wind).multiplyScalar(0.6);
      mat.uniforms.uOpacity.value = env.rain;
    },
  };
}

const FLY_COUNT = 160;
const FLY_VERT = `
uniform float uTime;
uniform float uScale;
uniform float uNight;
attribute float aSeed;
varying float vA;
void main() {
  vec3 p = position;
  p.x += sin(uTime * (0.4 + aSeed * 0.5) + aSeed * 40.0) * 1.4;
  p.y += sin(uTime * (0.6 + aSeed * 0.4) + aSeed * 20.0) * 0.6;
  p.z += cos(uTime * (0.35 + aSeed * 0.5) + aSeed * 30.0) * 1.4;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float tw = 0.55 + 0.45 * sin(uTime * (1.5 + aSeed * 2.0) + aSeed * 90.0);
  vA = uNight * tw;
  gl_PointSize = 0.44 * uScale / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const FLY_FRAG = `
varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = smoothstep(1.0, 0.0, d);
  gl_FragColor = vec4(0.92, 1.0, 0.5, a * a * vA);
}`;

export interface FireflyFx extends Fx {
  setScale: (px: number) => void;
}

export function createFireflies(env: FxEnv, spots: THREE.Vector3[]): FireflyFx {
  const rand = mulberry32(5150);
  // 锚点：树冠 + 全岛随机散布（草甸、广场周边），让萤火虫成群出没
  const anchors: THREE.Vector3[] = [...spots];
  const ar = mulberry32(9001);
  for (let i = 0; i < 46; i++) {
    const a = ar() * Math.PI * 2;
    const t = 0.34 + ar() * 0.5;
    const r = t * coastRadius(a);
    anchors.push(new THREE.Vector3(Math.cos(a) * r, 0.8 + ar() * 1.4, Math.sin(a) * r));
  }
  const pos = new Float32Array(FLY_COUNT * 3);
  const seed = new Float32Array(FLY_COUNT);
  for (let i = 0; i < FLY_COUNT; i++) {
    const s = anchors[Math.floor(rand() * anchors.length)];
    pos.set([s.x + (rand() - 0.5) * 6, 0.7 + rand() * 2.8, s.z + (rand() - 0.5) * 6], i * 3);
    seed[i] = rand();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    vertexShader: FLY_VERT,
    fragmentShader: FLY_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uScale: { value: 900 }, uNight: { value: 0 } },
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 25;
  return {
    object: points,
    setScale: px => {
      mat.uniforms.uScale.value = px;
    },
    update: (_dt, time) => {
      const k = Math.max(0, env.night - 0.2) * (1 - env.rain);
      points.visible = k > 0.02;
      mat.uniforms.uTime.value = time;
      mat.uniforms.uNight.value = k;
    },
  };
}
