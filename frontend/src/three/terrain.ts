import * as THREE from 'three';
import { getToonMaterial } from './builder.ts';
import { PALETTE, coastRadius, groundHeight, mulberry32, smoothNoise } from './palette.ts';

const SEGMENTS = 110;
const RINGS = 42;
const OUTER = 1.18;

function ringRho(i: number): number {
  const u = i / RINGS;
  return OUTER * (0.55 * u + 0.45 * u * u * u);
}

function vertexAt(i: number, j: number): THREE.Vector3 {
  const th = (j / SEGMENTS) * Math.PI * 2;
  const rho = ringRho(i) * coastRadius(th);
  const x = Math.cos(th) * rho;
  const z = Math.sin(th) * rho;
  return new THREE.Vector3(x, groundHeight(x, z), z);
}

/**
 * 按"到海岸的归一化距离 t"取色（各方向到海岸线距离一致）：
 * 植被区(t<0.8) → 植被消隐·绿变浅(0.8~0.86) → 黄沙(0.84~0.9) → 近岸浅干沙(0.92~0.97)；
 * 水下统一为湿沙，随深度转暗蓝灰。
 */
function pickColor(cx: number, cy: number, cz: number, t: number, rand: () => number): THREE.Color {
  const c = new THREE.Color();
  if (cy < 0) {
    const deep = THREE.MathUtils.clamp(-cy / 2, 0, 1);
    return c.set(PALETTE.sandWet).lerp(new THREE.Color(0x8d97a8), deep * 0.55);
  }
  const g = THREE.MathUtils.smoothstep(0.78, 0.86, t); // 过渡带：更浅的绿
  const s = THREE.MathUtils.smoothstep(0.83, 0.9, t); // 变沙
  const w = THREE.MathUtils.smoothstep(0.89, 0.94, t); // 湿沙
  const baseGrass = new THREE.Color(PALETTE.grassA).lerp(new THREE.Color(PALETTE.grassB), smoothNoise(cx, cz));
  c.copy(baseGrass);
  c.lerp(new THREE.Color(0xdbe0a3), g); // 浅绿过渡带（植被变少变浅）
  // 过渡带内散落沙斑：浅绿中透出零星黄沙
  if (t > 0.78 && t < 0.88 && rand() > 0.4) {
    c.lerp(new THREE.Color(PALETTE.sand), 0.3 + rand() * 0.5);
  }
  c.lerp(new THREE.Color(PALETTE.sand), s); // 黄沙
  c.lerp(new THREE.Color(PALETTE.sandWet), w); // 近岸湿沙（水线处）
  if (t < 0.8) {
    if (rand() > 0.82) {
      c.lerp(new THREE.Color(PALETTE.grassC), 0.55);
    }
    if (rand() > 0.9) {
      c.lerp(new THREE.Color(0xb0b86f), 0.4);
    }
  }
  return c.offsetHSL(0, 0, (rand() - 0.5) * 0.02);
}

export function createTerrain(): THREE.Mesh {
  const pos: number[] = [];
  const col: number[] = [];
  const rand = mulberry32(7);
  const grid: THREE.Vector3[][] = [];
  for (let i = 0; i <= RINGS; i++) {
    const row: THREE.Vector3[] = [];
    for (let j = 0; j <= SEGMENTS; j++) {
      row.push(vertexAt(i, j % SEGMENTS));
    }
    grid.push(row);
  }
  const pushTri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): void => {
    const cx = (a.x + b.x + c.x) / 3;
    const cy = (a.y + b.y + c.y) / 3;
    const cz = (a.z + b.z + c.z) / 3;
    const t = Math.hypot(cx, cz) / coastRadius(Math.atan2(cz, cx));
    const color = pickColor(cx, cy, cz, t, rand);
    [a, b, c].forEach(v => {
      pos.push(v.x, v.y, v.z);
      col.push(color.r, color.g, color.b);
    });
  };
  for (let i = 0; i < RINGS; i++) {
    for (let j = 0; j < SEGMENTS; j++) {
      const a = grid[i][j];
      const b = grid[i][j + 1];
      const c = grid[i + 1][j];
      const d = grid[i + 1][j + 1];
      if (i > 0) {
        pushTri(a, b, c);
      }
      pushTri(b, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, getToonMaterial());
  mesh.receiveShadow = true;
  mesh.userData.isGround = true;
  return mesh;
}
