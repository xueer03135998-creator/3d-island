import type { BuildingId } from './index.ts';

/** A glowing window pane in building-local space. `ry` turns the pane to face +x (PI/2) or -x (-PI/2). */
export interface PaneSpec {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  ry?: number;
  round?: boolean;
}

export interface LightSpec {
  panes: PaneSpec[];
  /** Hanging lamps under the eaves and by the door. */
  lamps: Array<[number, number, number]>;
  /** One warm spill light per building; throws color onto walls and ground. */
  spill: Array<[number, number, number]>;
}

const R = Math.PI / 2;

function sidePanes(x: number, zs: number[], ys: number[], w: number, h: number): PaneSpec[] {
  const ry = x > 0 ? R : -R;
  return zs.flatMap(z => ys.map(y => ({ x, y, z, w, h, ry })));
}

export const LIGHT_SPECS: Record<BuildingId, LightSpec> = {
  archive: {
    panes: [
      ...[-2.2, 2.2].map(x => ({ x, y: 2.35, z: 3.2, w: 1.2, h: 1.5 })),
      ...[-2.2, 0, 2.2].map(x => ({ x, y: 5.35, z: 3.2, w: 1.2, h: 1.5 })),
      ...sidePanes(3.58, [-1.3, 1.3], [2.35, 5.35], 1.2, 1.5),
      ...sidePanes(-3.58, [-1.3, 1.3], [2.35, 5.35], 1.2, 1.5),
    ],
    lamps: [
      [-3.2, 3.2, 3.45],
      [3.2, 3.2, 3.45],
      [-3.2, 6.25, 3.4],
      [3.2, 6.25, 3.4],
      [-1.1, 2.85, 3.5],
      [1.1, 2.85, 3.5],
    ],
    spill: [[0, 3.2, 4.4]],
  },
  canteen: {
    panes: [
      ...[-2.15, 2.15].map(x => ({ x, y: 1.65, z: 2.87, w: 1.2, h: 1.0 })),
      ...sidePanes(3.58, [-0.9, 0.9], [1.65], 1.2, 1.0),
      ...sidePanes(-3.58, [-0.9, 0.9], [1.65], 1.2, 1.0),
    ],
    lamps: [
      [-3.5, 3.0, 3.4],
      [3.5, 3.0, 3.4],
      [-1.0, 2.4, 3.1],
      [1.0, 2.4, 3.1],
    ],
    spill: [[0, 2.4, 4.2]],
  },
  heritage: {
    panes: [
      ...[-2.2, 2.2].map(x => ({ x, y: 1.75, z: 2.62, w: 1.1, h: 0.9 })),
      { x: 3.6, y: 1.9, z: 0, w: 1.2, h: 1.2, ry: R, round: true },
      { x: -3.6, y: 1.9, z: 0, w: 1.2, h: 1.2, ry: -R, round: true },
    ],
    lamps: [
      [-1.5, 1.85, 2.95],
      [1.5, 1.85, 2.95],
      [-4.0, 3.05, 3.2],
      [4.0, 3.05, 3.2],
    ],
    spill: [[0, 2.2, 3.8]],
  },
  divination: {
    panes: [],
    lamps: [
      [-2.7, 3.2, 3.0],
      [2.7, 3.2, 3.0],
      [-2.7, 3.2, -3.0],
      [2.7, 3.2, -3.0],
      [0, 3.1, 0.6],
      [-1.55, 1.55, 9.0],
      [1.55, 1.55, 9.0],
      [0, 1.15, -1.2],
    ],
    spill: [[0, 2.4, 2.2]],
  },
};
