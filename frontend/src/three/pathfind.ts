import type { Collider } from './buildings/index.ts';
import { isWater, withinSwimArea } from './walk.ts';

/**
 * 岛屿导航网格 + A* 寻路：
 * - 以 1m 网格覆盖可行走区域（陆地/码头），障碍 = 建筑/树木/座椅/陈设等碰撞体（外扩角色半径）
 * - 点击目标后计算绕过障碍的路径，人物沿路径点行走，途中不会穿模
 */

const CELL = 1;
const BODY_R = 0.45;
const MIN_X = -58;
const MAX_X = 58;
const MIN_Z = -58;
const MAX_Z = 66;
const W = Math.ceil((MAX_X - MIN_X) / CELL) + 1;
const H = Math.ceil((MAX_Z - MIN_Z) / CELL) + 1;

const INF = 1e9;
const DX = [1, -1, 0, 0, 1, 1, -1, -1];
const DZ = [0, 0, 1, -1, 1, -1, 1, -1];
const COST = [1, 1, 1, 1, 1.414, 1.414, 1.414, 1.414];

function gridOf(x: number): number {
  return Math.floor((x - MIN_X) / CELL);
}

function clampGrid(g: number): number {
  return Math.max(0, Math.min(W - 1, g));
}

function worldOf(g: number): number {
  return MIN_X + (g + 0.5) * CELL;
}

export interface NavGrid {
  findPath: (sx: number, sz: number, tx: number, tz: number) => Array<[number, number]> | null;
}

export function createNavGrid(colliders: Collider[]): NavGrid {
  const blocked = new Uint8Array(W * H);
  const at = (x: number, z: number): number => x + z * W;

  const inside = (cx: number, cz: number): boolean =>
    cx >= MIN_X + BODY_R && cx <= MAX_X - BODY_R && cz >= MIN_Z + BODY_R && cz <= MAX_Z - BODY_R && withinSwimArea(cx, cz) && !isWater(cx, cz);

  const hits = (cx: number, cz: number): boolean => {
    for (const c of colliders) {
      if (c.hx === undefined || c.hz === undefined) {
        if (Math.hypot(cx - c.x, cz - c.z) < c.r + BODY_R) {
          return true;
        }
      } else {
        const rot = c.rot ?? 0;
        const s = Math.sin(-rot);
        const co = Math.cos(-rot);
        const lx = (cx - c.x) * co - (cz - c.z) * s;
        const lz = (cx - c.x) * s + (cz - c.z) * co;
        if (Math.abs(lx) < c.hx + BODY_R && Math.abs(lz) < c.hz + BODY_R) {
          return true;
        }
      }
    }
    return false;
  };

  for (let z = 0; z < H; z++) {
    for (let x = 0; x < W; x++) {
      const cx = MIN_X + (x + 0.5) * CELL;
      const cz = MIN_Z + (z + 0.5) * CELL;
      blocked[at(x, z)] = !inside(cx, cz) || hits(cx, cz) ? 1 : 0;
    }
  }

  const freeNear = (gx: number, gz: number): Array<[number, number]> => {
    for (let r = 0; r < 8; r++) {
      for (let z = gz - r; z <= gz + r; z++) {
        for (let x = gx - r; x <= gx + r; x++) {
          if (x >= 0 && x < W && z >= 0 && z < H && !blocked[at(x, z)]) {
            return [[x, z]];
          }
        }
      }
    }
    return [];
  };

  const los = (ax: number, az: number, bx: number, bz: number): boolean => {
    const dx = bx - ax;
    const dz = bz - az;
    const len = Math.max(Math.abs(dx), Math.abs(dz), 1);
    const steps = Math.ceil(len / 0.5);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = gridOf(ax + dx * t);
      const z = gridOf(az + dz * t);
      if (blocked[at(clampGrid(x), clampGrid(z))]) {
        return false;
      }
    }
    return true;
  };

  const findPath = (sx: number, sz: number, tx: number, tz: number): Array<[number, number]> | null => {
    const s0 = clampGrid(gridOf(sx));
    const z0 = clampGrid(gridOf(sz));
    let gx = clampGrid(gridOf(tx));
    let gz = clampGrid(gridOf(tz));
    if (blocked[at(gx, gz)]) {
      const near = freeNear(gx, gz);
      if (!near.length) {
        return null;
      }
      [gx, gz] = near[0];
    }
    if (blocked[at(s0, z0)]) {
      return null;
    }
    if (s0 === gx && z0 === gz) {
      return [[tx, tz]];
    }

    const gScore = new Float32Array(W * H).fill(INF);
    const open = new Int32Array(W * H).fill(0);
    const came = new Int32Array(W * H).fill(-1);
    const hBase = (x: number, z: number): number => {
      const dx = Math.abs(x - gx);
      const dz = Math.abs(z - gz);
      return Math.max(dx, dz) + 0.414 * Math.min(dx, dz);
    };
    gScore[at(s0, z0)] = 0;
    open[at(s0, z0)] = 1;
    const pq: number[] = [s0 + z0 * W];
    const push = (n: number): void => {
      pq.push(n);
      let i = pq.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (gScore[pq[p]] + hBase(pq[p] % W, (pq[p] / W) | 0) <= gScore[pq[i]] + hBase(pq[i] % W, (pq[i] / W) | 0)) {
          break;
        }
        [pq[i], pq[p]] = [pq[p], pq[i]];
        i = p;
      }
    };
    const pop = (): number => {
      const top = pq[0];
      const last = pq.pop() as number;
      if (pq.length) {
        pq[0] = last;
        let i = 0;
        for (;;) {
          const l = i * 2 + 1;
          const r = l + 1;
          let m = i;
          const f = (n: number): number => gScore[n] + hBase(n % W, (n / W) | 0);
          if (l < pq.length && f(pq[l]) < f(pq[m])) {
            m = l;
          }
          if (r < pq.length && f(pq[r]) < f(pq[m])) {
            m = r;
          }
          if (m === i) {
            break;
          }
          [pq[i], pq[m]] = [pq[m], pq[i]];
          i = m;
        }
      }
      return top;
    };

    const goal = at(gx, gz);
    let found = -1;
    while (pq.length) {
      const cur = pop();
      open[cur] = 0;
      if (cur === goal) {
        found = cur;
        break;
      }
      const x = cur % W;
      const z = (cur / W) | 0;
      for (let k = 0; k < 8; k++) {
        const nx = x + DX[k];
        const nz = z + DZ[k];
        if (nx < 0 || nx >= W || nz < 0 || nz >= H || blocked[at(nx, nz)]) {
          continue;
        }
        if (DX[k] && DZ[k] && (blocked[at(x + DX[k], z)] || blocked[at(x, z + DZ[k])])) {
          continue;
        }
        const n = at(nx, nz);
        const ng = gScore[cur] + COST[k];
        if (ng < gScore[n] - 0.0001) {
          gScore[n] = ng;
          came[n] = cur;
          if (!open[n]) {
            open[n] = 1;
            push(n);
          }
        }
      }
    }
    if (found < 0) {
      return null;
    }

    // 回溯路径点
    const pts: Array<[number, number]> = [];
    let cur = found;
    while (cur >= 0) {
      pts.push([worldOf(cur % W), worldOf((cur / W) | 0)]);
      if (cur === at(s0, z0)) {
        break;
      }
      cur = came[cur];
    }
    pts.reverse();
    if (pts[0] && Math.hypot(pts[0][0] - sx, pts[0][1] - sz) > 1.6) {
      pts.unshift([sx, sz]);
    }

    // 拉直（string pulling）：删除可直线可达的中间点
    const out: Array<[number, number]> = [];
    let anchor = pts[0];
    out.push(anchor);
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      if (los(anchor[0], anchor[1], p[0], p[1])) {
        continue;
      }
      out.push(pts[i - 1]);
      anchor = pts[i - 1];
    }
    out.push(pts[pts.length - 1]);
    out.push([tx, tz]);
    return out;
  };

  return { findPath };
}
