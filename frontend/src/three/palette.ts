export const PALETTE = {
  fog: 0xdde6ef,
  skyTop: 0xb7cfe8,
  skyMid: 0xcfdcee,
  skyHorizon: 0xe4e6f0,
  sunGlow: 0xffdca0,
  seaShallow: 0x86f0dc,
  seaMid: 0x34c0e0,
  seaDeep: 0x1f84cc,
  seaLilac: 0x5fb0ee,
  grassA: 0x9fc783,
  grassB: 0x8fb56f,
  grassC: 0xb3d493,
  sand: 0xe6dbb8,
  sandWet: 0xd2c9a6,
  stone: 0xd9d4dd,
  stoneWarm: 0xe9dfcf,
  stoneLilac: 0xc9c3d6,
  woodDark: 0x6a4b3b,
  woodMid: 0xa98163,
  woodLight: 0xcfa87c,
  cream: 0xf4eee0,
  warmYellow: 0xf3d58a,
  roofMauve: 0xc9a3b7,
  roofSlate: 0x5a5670,
  roofTeal: 0x7d93a0,
  roofCharcoal: 0x5e4f4c,
  glass: 0xbcd8ea,
  glassDark: 0x4c5270,
  leaf: 0x86bf86,
  leafDark: 0x6aa07a,
  cypress: 0x6f9d7c,
  cypressLight: 0x86b08a,
  bamboo: 0xa6cc86,
  bambooLeaf: 0x8cc487,
  rock: 0xbab5c6,
  rockLight: 0xcfcad8,
  mountainNear: 0xa9a6c6,
  mountainFar: 0xc3c4dc,
  cloud: 0xffffff,
  gold: 0xe2bd68,
} as const;

export const SEA_LEVEL = -0.35;
export const ISLAND_TOP = 0.55;
export const SHORE_T = 0.93;

const HARMONICS: ReadonlyArray<readonly [number, number, number]> = [
  [2, 2.6, 0.7],
  [3, 1.8, 2.1],
  [5, 0.9, 4.2],
];
export const COAST_BASE = 34;

export function coastRadius(theta: number): number {
  let r = COAST_BASE;
  for (const [k, a, p] of HARMONICS) {
    r += a * Math.sin(k * theta + p);
  }
  return r;
}

export function coastGlsl(): string {
  const terms = HARMONICS.map(
    ([k, a, p]) => `r += ${a.toFixed(3)} * sin(${k.toFixed(1)} * th + ${p.toFixed(3)});`
  ).join('\n  ');
  return `float coastR(float th) {\n  float r = ${COAST_BASE.toFixed(1)};\n  ${terms}\n  return r;\n}`;
}

function rawHeight(x: number, z: number): number {
  const d = Math.hypot(x, z);
  const t = d / coastRadius(Math.atan2(z, x));
  const roll = 0.18 * Math.sin(x * 0.17 + 1.3) * Math.cos(z * 0.14) + 0.1 * Math.sin(x * 0.31 + z * 0.27);
  const plateau = ISLAND_TOP + roll;
  if (t < 0.78) {
    return plateau;
  }
  if (t < 1) {
    const s = (t - 0.78) / 0.22;
    const e = s * s * (3 - 2 * s);
    return plateau * (1 - e) - 0.9 * e;
  }
  return -0.9 - (t - 1) * 6;
}

export interface BuildingSite {
  id: 'divination' | 'canteen' | 'archive' | 'heritage';
  x: number;
  z: number;
}

export const BUILDING_SITES: ReadonlyArray<BuildingSite> = [
  { id: 'divination', x: -14, z: -9 },
  { id: 'canteen', x: 14, z: -9 },
  { id: 'archive', x: 15, z: 10 },
  { id: 'heritage', x: -14, z: 11 },
];

const PADS: ReadonlyArray<readonly [number, number, number, number]> = [
  ...BUILDING_SITES.map(s => [s.x, s.z, 8, 13] as const),
  [0, 0, 5, 9],
];

export function groundHeight(x: number, z: number): number {
  let h = rawHeight(x, z);
  for (const [px, pz, inner, outer] of PADS) {
    const d = Math.hypot(x - px, z - pz);
    if (d < outer) {
      const s = Math.min(1, Math.max(0, (outer - d) / (outer - inner)));
      const e = s * s * (3 - 2 * s);
      h = h * (1 - e) + ISLAND_TOP * e;
    }
  }
  return h;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function smoothNoise(x: number, z: number): number {
  const v = Math.sin(x * 0.21 + 1.7) * Math.cos(z * 0.19 - 0.6)
    + 0.6 * Math.sin(x * 0.083 - z * 0.071 + 2.2)
    + 0.35 * Math.sin(x * 0.47 + z * 0.39);
  return v / 1.95 * 0.5 + 0.5;
}
