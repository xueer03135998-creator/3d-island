import * as THREE from 'three';

export function gableGeometry(w: number, d: number, h: number, ox = 0.5, oz = 0.5): THREE.BufferGeometry {
  const W = w / 2 + ox;
  const D = d / 2 + oz;
  const FL = [-W, 0, D];
  const FR = [W, 0, D];
  const BL = [-W, 0, -D];
  const BR = [W, 0, -D];
  const RL = [-W, h, 0];
  const RR = [W, h, 0];
  const tris = [
    FL, FR, RR, FL, RR, RL,
    BR, BL, RL, BR, RL, RR,
    FL, RL, BL,
    FR, BR, RR,
    FL, BL, BR, FL, BR, FR,
  ];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3));
  geo.computeVertexNormals();
  return geo;
}

export function hipGeometry(halfW: number, halfD: number, h: number): THREE.BufferGeometry {
  const geo = new THREE.ConeGeometry(Math.SQRT1_2, h, 4, 1, false);
  geo.rotateY(Math.PI / 4);
  geo.scale(halfW * 2, 1, halfD * 2);
  return geo;
}

export function slabGeometry(w: number, d: number, h: number): THREE.BufferGeometry {
  return new THREE.BoxGeometry(w, h, d);
}

export function trigramBars(code: number): boolean[] {
  return [(code >> 2) & 1, (code >> 1) & 1, code & 1].map(v => v === 1);
}
