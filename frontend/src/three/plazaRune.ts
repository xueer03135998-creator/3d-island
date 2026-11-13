import * as THREE from 'three';
import { groundHeight } from './palette.ts';
import type { Environment } from './environment.ts';

/**
 * 广场中环（暖黄圆环）魔法阵纹路：
 * - Canvas 绘制符文环（内外圆、齿轮刻度、符文小方块、六芒星、小圆点）贴到圆环上
 * - 平时缓慢旋转、半透明；换时间（env.transitioning）时加速旋转并增亮，呼应时光魔法特效
 */

const INNER = 1.25;
const OUTER = 2.95;

function runeTexture(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (ctx) {
    const mid = size / 2;
    const R = size / 2;
    ctx.clearRect(0, 0, size, size);
    const line = 'rgba(252, 218, 134, 1)';
    ctx.strokeStyle = line;
    ctx.fillStyle = line;
    const arc = (r: number, w: number): void => {
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.arc(mid, mid, R * r, 0, Math.PI * 2);
      ctx.stroke();
    };
    // 内外主圆
    arc(0.97, 6);
    arc(0.9, 3.5);
    arc(0.46, 4);
    // 齿轮刻度（半径纹）
    ctx.lineWidth = 3.5;
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const r0 = R * (i % 3 === 0 ? 0.9 : 0.925);
      ctx.beginPath();
      ctx.moveTo(mid + Math.cos(a) * r0, mid + Math.sin(a) * r0);
      ctx.lineTo(mid + Math.cos(a) * R * 0.97, mid + Math.sin(a) * R * 0.97);
      ctx.stroke();
    }
    // 环形小符文（12 组竖纹方块）
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.05;
      const rr = R * 0.7;
      const x = mid + Math.cos(a) * rr;
      const y = mid + Math.sin(a) * rr;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a + Math.PI / 2);
      ctx.lineWidth = 3;
      ctx.strokeRect(-4.5, -9.5, 9, 19);
      ctx.beginPath();
      ctx.moveTo(-3, -18);
      ctx.lineTo(-3, 18);
      ctx.stroke();
      ctx.restore();
    }
    // 六芒星底（双三角）
    for (let k = 0; k < 2; k++) {
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + k * Math.PI;
        const x = mid + Math.cos(a) * R * 0.56;
        const y = mid + Math.sin(a) * R * 0.56;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
    // 外圈小圆点
    ctx.fillStyle = 'rgba(255, 222, 140, 1)';
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + 0.1;
      const rr = R * 0.8;
      ctx.beginPath();
      ctx.arc(mid + Math.cos(a) * rr, mid + Math.sin(a) * rr, 3.6, 0, Math.PI * 2);
      ctx.fill();
    }
    // 中心点
    ctx.beginPath();
    ctx.arc(mid, mid, R * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createPlazaRune(env: Environment): { object: THREE.Object3D; update: (dt: number) => void } {
  const tex = runeTexture();
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -1,
  });
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.RingGeometry(INNER, OUTER, 64), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 4;
  group.add(mesh);
  // 广场暖黄圆环顶面实际位于 groundHeight + 0.22（plaza 原点 groundHeight-0.04，h=0.26 的圆台顶面）
  group.position.set(0, groundHeight(0, 0) + 0.225, 0);
  let rot = 0;
  return {
    object: group,
    update: (dt: number) => {
      const boosting = env.transitioning;
      const target = boosting ? 0.98 : 0.78;
      mat.opacity += (target - mat.opacity) * Math.min(1, dt * (boosting ? 6 : 2));
      rot += dt * (boosting ? 1.4 : 0.05);
      group.rotation.y = rot;
    },
  };
}
