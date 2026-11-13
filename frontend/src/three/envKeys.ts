import * as THREE from 'three';

export type Weather = 'clear' | 'cloudy' | 'rain';

export interface EnvState {
  hour: number;
  auto: boolean;
  weather: Weather;
  night: number;
}

interface KeyDef {
  h: number;
  top: number;
  mid: number;
  horizon: number;
  fog: number;
  hemiSky: number;
  hemiGround: number;
  sun: number;
  sunI: number;
  hemiI: number;
  sea: number;
}

export interface Frame {
  top: THREE.Color;
  mid: THREE.Color;
  horizon: THREE.Color;
  fog: THREE.Color;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  sun: THREE.Color;
  sea: THREE.Color;
  sunI: number;
  hemiI: number;
}

const DEFS: KeyDef[] = [
  { h: 0, top: 0x0f1530, mid: 0x1b2748, horizon: 0x35406a, fog: 0x242f52, hemiSky: 0x6a7fb8, hemiGround: 0x2f3658, sun: 0x8fa8ff, sunI: 0, hemiI: 0.9, sea: 0x5a6a9c },
  { h: 5, top: 0x2a3566, mid: 0x6a6fa6, horizon: 0xf0a8a0, fog: 0x9a8fb4, hemiSky: 0x8f93c4, hemiGround: 0x6a6a80, sun: 0xffb48a, sunI: 0.4, hemiI: 1.0, sea: 0x9a8cb8 },
  { h: 6.5, top: 0x8fb0e0, mid: 0xe8c4c8, horizon: 0xffd6a8, fog: 0xeed2c4, hemiSky: 0xf0e0e8, hemiGround: 0xd4cc9c, sun: 0xffc78a, sunI: 1.6, hemiI: 1.3, sea: 0xffe0d8 },
  { h: 9, top: 0x9fc4ea, mid: 0xcbdcf0, horizon: 0xe8eaf2, fog: 0xdde6ef, hemiSky: 0xf2eadc, hemiGround: 0xcdc794, sun: 0xffddaa, sunI: 2.2, hemiI: 1.6, sea: 0xffffff },
  { h: 12, top: 0x3b8ff0, mid: 0x7cc0f8, horizon: 0xd8efff, fog: 0xc6e4fa, hemiSky: 0xe6f0f8, hemiGround: 0xc4cf8c, sun: 0xffe2b0, sunI: 2.9, hemiI: 1.85, sea: 0xffffff },
  { h: 16.5, top: 0x3b8ff0, mid: 0x7cc0f8, horizon: 0xd8efff, fog: 0xc6e4fa, hemiSky: 0xe6f0f8, hemiGround: 0xc4cf8c, sun: 0xffe2b0, sunI: 2.9, hemiI: 1.85, sea: 0xffffff },
  { h: 18.5, top: 0x5a62a8, mid: 0xd9a0b8, horizon: 0xffa878, fog: 0xe0a8a0, hemiSky: 0xd8b0c8, hemiGround: 0x9a8a90, sun: 0xff9050, sunI: 1.5, hemiI: 1.0, sea: 0xffb8a8 },
  { h: 20, top: 0x232c5c, mid: 0x4a4f8a, horizon: 0xb87ca0, fog: 0x6a6490, hemiSky: 0x7078b0, hemiGround: 0x403f66, sun: 0xff8f80, sunI: 0.15, hemiI: 0.85, sea: 0x7a78a8 },
  { h: 24, top: 0x0f1530, mid: 0x1b2748, horizon: 0x35406a, fog: 0x242f52, hemiSky: 0x6a7fb8, hemiGround: 0x2f3658, sun: 0x8fa8ff, sunI: 0, hemiI: 0.9, sea: 0x5a6a9c },
];

function toFrame(d: KeyDef): Frame {
  return {
    top: new THREE.Color(d.top),
    mid: new THREE.Color(d.mid),
    horizon: new THREE.Color(d.horizon),
    fog: new THREE.Color(d.fog),
    hemiSky: new THREE.Color(d.hemiSky),
    hemiGround: new THREE.Color(d.hemiGround),
    sun: new THREE.Color(d.sun),
    sea: new THREE.Color(d.sea),
    sunI: d.sunI,
    hemiI: d.hemiI,
  };
}

const KEYS = DEFS.map(d => ({ h: d.h, f: toFrame(d) }));

export function createFrame(): Frame {
  return toFrame(DEFS[3]);
}

const COLOR_FIELDS = ['top', 'mid', 'horizon', 'fog', 'hemiSky', 'hemiGround', 'sun', 'sea'] as const;

export function sampleFrame(hour: number, out: Frame): void {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < KEYS.length - 2 && h >= KEYS[i + 1].h) {
    i++;
  }
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = THREE.MathUtils.clamp((h - a.h) / (b.h - a.h), 0, 1);
  const k = t * t * (3 - 2 * t);
  COLOR_FIELDS.forEach(field => {
    out[field].copy(a.f[field]).lerp(b.f[field], k);
  });
  out.sunI = a.f.sunI + (b.f.sunI - a.f.sunI) * k;
  out.hemiI = a.f.hemiI + (b.f.hemiI - a.f.hemiI) * k;
}

export const WEATHER_TARGET: Record<Weather, { cloud: number; rain: number }> = {
  clear: { cloud: 0.3, rain: 0 },
  cloudy: { cloud: 1, rain: 0 },
  rain: { cloud: 1, rain: 1 },
};

export function desaturate(c: THREE.Color, amount: number, dark: number): void {
  const l = c.r * 0.3 + c.g * 0.59 + c.b * 0.11;
  c.r += (l - c.r) * amount;
  c.g += (l - c.g) * amount;
  c.b += (l - c.b) * amount;
  c.multiplyScalar(dark);
}
