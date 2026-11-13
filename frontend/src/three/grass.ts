import * as THREE from 'three';
import { getSwayMaterial, swayUniforms } from './builder.ts';
import { BUILDING_SITES, coastRadius, groundHeight, mulberry32 } from './palette.ts';
import { PLAZA_RADIUS } from './paths.ts';

/**
 * 草丛（扇形）：每丛由一圈扇形排列的草叶构成。
 * - 根部收紧：叶基宽极窄，中段最宽，叶尖收拢成尖
 * - 外侧草叶更高、向外倾斜更多，整丛呈倒三角扇形
 * - 实例化渲染，草叶层置于 layer 1，避开 SSAO 的半透明误伤（避免上一版"黑色草棍"）
 * - 颜色用深绿渐变（根部深、叶尖略亮）
 */

const BLADE_COUNT = 8;
const ROOT_W = 0.014;
const MID_W = 0.085;
const TIP_W = 0.0;
const ROWS = 4;
const COLORS: Array<[number, number, number]> = [
  [0x2f5228, 0x4a7036, 0x5d8a44], // 深→中→亮
];

function isCoarse(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
}

function nearPad(x: number, z: number): boolean {
  if (Math.hypot(x, z) < PLAZA_RADIUS + 2.4) {
    return true;
  }
  for (const s of BUILDING_SITES) {
    if (Math.abs(x - s.x) < 10.5 && Math.abs(z - s.z) < 14.5) {
      return true;
    }
  }
  return false;
}

/** 生成一丛扇形草叶的几何体（含顶点颜色）。 */
function clumpGeometry(): THREE.BufferGeometry {
  const widths = [ROOT_W, MID_W, MID_W * 0.55, TIP_W];
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const grad = COLORS[0];
  let v = 0;
  for (let k = 0; k < BLADE_COUNT; k++) {
    // 高度与倾斜围绕圆心对称起伏（有机但平衡），叶尖统一向外弯成扇形
    const h = 0.58 + 0.26 * (0.5 + 0.5 * Math.sin(k * 2.1 + 1.3));
    const lean = 0.24 + 0.14 * (0.5 + 0.5 * Math.sin(k * 1.7 + 2.7));
    const a = (k / BLADE_COUNT) * Math.PI * 2;
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    // 叶面切向（与倾斜方向垂直的水平向量）
    const px = -dz;
    const pz = dx;
    for (let r = 0; r < ROWS; r++) {
      const t = r / (ROWS - 1);
      // 下段竖直、上段向外弯（曲线外倾）
      const bend = Math.pow(t, 1.65) * lean * h;
      const y = t * h;
      const w = widths[r];
      const cx = dx * bend;
      const cz = dz * bend;
      // 颜色渐变：根部深绿 → 叶尖略亮
      const c = grad[t < 0.34 ? 0 : t < 0.7 ? 1 : 2];
      const cr = ((c >> 16) & 0xff) / 255;
      const cg = ((c >> 8) & 0xff) / 255;
      const cb = (c & 0xff) / 255;
      pos.push(cx + px * w, y, cz + pz * w);
      col.push(cr, cg, cb);
      pos.push(cx - px * w, y, cz - pz * w);
      col.push(cr, cg, cb);
    }
    for (let r = 0; r < ROWS - 1; r++) {
      const a0 = v + r * 2;
      const a1 = v + r * 2 + 1;
      const b0 = v + (r + 1) * 2;
      const b1 = v + (r + 1) * 2 + 1;
      idx.push(a0, b0, a1, a1, b0, b1);
    }
    v += ROWS * 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

export function createGrassClumps(): THREE.InstancedMesh {
  const rand = mulberry32(20261113);
  const coarse = isCoarse();
  const count = coarse ? 480 : 900;
  const geo = clumpGeometry();
  const mat = getSwayMaterial().clone();
  // 关键：关闭顶点色，只靠 instanceColor 着色。
  // 否则几何自带深绿顶点色 × 实例色相乘 ≈ 全黑。
  mat.vertexColors = false;
  mat.side = THREE.DoubleSide;
  mat.roughness = 0.88;
  mat.onBeforeCompile = shader => {
    shader.uniforms.uTime = swayUniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform float uTime;\n#if defined( USE_INSTANCING )\nattribute float aPhase;\n#endif'
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
#if defined( USE_INSTANCING )
        float bend = clamp(transformed.y / 0.85, 0.0, 1.0);
        float sw = sin(uTime * 1.6 + aPhase + position.z * 0.8);
        float sw2 = cos(uTime * 1.2 + aPhase * 1.4 + position.x * 0.6);
        transformed.x += sw * bend * bend * 0.16;
        transformed.z += sw2 * bend * bend * 0.11;
#endif`
      );
  };
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  // 放入 layer 1：主渲染包含，SSAO 法线/深度 pass 忽略，避免细叶被误判变黑
  mesh.layers.set(1);

  const phase = new Float32Array(count);
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const scale = new THREE.Vector3();
  const color = new THREE.Color();
  let placed = 0;
  let guard = 0;
  // 与场景旧草（nature GRASS / 地形草地）同色系，避免过深突兀
  const grassGreens = [0x8fc07a, 0xa6d084, 0x7db56d, 0xbddb8f, 0x9fc783, 0x8fb56f];
  while (placed < count && guard < count * 20) {
    guard++;
    const a = rand() * Math.PI * 2;
    const t = 0.34 + rand() * 0.52;
    const r = t * coastRadius(a);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = groundHeight(x, z);
    if (y < 0.3 || nearPad(x, z)) {
      continue;
    }
    const s = 0.8 + rand() * 0.5;
    euler.set(0, rand() * Math.PI * 2, 0);
    quat.setFromEuler(euler);
    scale.set(s, s, s);
    matrix.compose(new THREE.Vector3(x, y - 0.015, z), quat, scale);
    mesh.setMatrixAt(placed, matrix);
    color.setHex(grassGreens[Math.floor(rand() * grassGreens.length)]);
    color.offsetHSL(0, 0, (rand() - 0.5) * 0.05);
    mesh.setColorAt(placed, color);
    phase[placed] = rand() * Math.PI * 2;
    placed++;
  }
  mesh.count = placed;
  geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase.subarray(0, placed), 1));
  return mesh;
}
