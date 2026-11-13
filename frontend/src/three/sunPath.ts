import type * as THREE from 'three';

/** East is +x, west is -x. The sun rises in the east, crosses a little north of the zenith and sets in the west. */
const DAY_START = 6;
const DAY_LENGTH = 12.2;
const ELEVATION = 0.6;
const NORTH_TILT = -0.38;

/** Direction (in the x-z plane, as atan2(z, x)) in which the sun touches the sea at sunset. */
export const SUNSET_THETA = Math.atan2(NORTH_TILT, -1);

export function sunDirection(hour: number, out: THREE.Vector3): THREE.Vector3 {
  const a = ((hour - DAY_START) / DAY_LENGTH) * Math.PI;
  return out.set(Math.cos(a), Math.sin(a) * ELEVATION, NORTH_TILT).normalize();
}
