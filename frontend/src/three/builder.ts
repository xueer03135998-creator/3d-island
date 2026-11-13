import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

let standardMaterial: THREE.MeshStandardMaterial | null = null;
let swayMaterial: THREE.MeshStandardMaterial | null = null;
export const swayUniforms = { uTime: { value: 0 } };

/** PBR 标准材质：全局唯一实例，配合 ACES 色调映射呈现真实光影。 */
export function getToonMaterial(): THREE.MeshStandardMaterial {
  if (!standardMaterial) {
    standardMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.02,
    });
  }
  return standardMaterial;
}

export function getSwayMaterial(): THREE.MeshStandardMaterial {
  if (!swayMaterial) {
    swayMaterial = getToonMaterial().clone();
    swayMaterial.onBeforeCompile = shader => {
      shader.uniforms.uTime = swayUniforms.uTime;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          float sw = max(transformed.y, 0.0) * 0.012;
          transformed.x += sin(uTime * 1.4 + transformed.z * 0.6 + transformed.x * 0.4) * sw;
          transformed.z += cos(uTime * 1.1 + transformed.x * 0.5) * sw * 0.7;`
        );
    };
  }
  return swayMaterial;
}

export interface PlaceOptions {
  rx?: number;
  ry?: number;
  rz?: number;
  sx?: number;
  sy?: number;
  sz?: number;
}

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpP = new THREE.Vector3();
const tmpS = new THREE.Vector3();

export class Builder {
  private parts: THREE.BufferGeometry[] = [];

  add(geo: THREE.BufferGeometry, color: number, x = 0, y = 0, z = 0, o: PlaceOptions = {}): this {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    geo.dispose();
    g.deleteAttribute('uv');
    tmpE.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
    tmpQ.setFromEuler(tmpE);
    tmpP.set(x, y, z);
    tmpS.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1);
    g.applyMatrix4(tmpM.compose(tmpP, tmpQ, tmpS));
    g.computeVertexNormals();
    // 烘焙垂直环境光遮蔽：越靠近地面（y≈0）越暗，让建筑/树木/陈设更有立体感
    g.computeBoundingBox();
    const bb = g.boundingBox;
    const ao = bb ? 0.9 + 0.1 * THREE.MathUtils.clamp((bb.min.y - 0) / 2.2, 0, 1) : 1;
    const c = new THREE.Color(color).multiplyScalar(ao);
    const count = g.getAttribute('position').count;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    this.parts.push(g);
    return this;
  }

  box(w: number, h: number, d: number, color: number, x = 0, y = 0, z = 0, o: PlaceOptions = {}): this {
    return this.add(new THREE.BoxGeometry(w, h, d), color, x, y + h / 2, z, o);
  }

  cyl(rt: number, rb: number, h: number, seg: number, color: number, x = 0, y = 0, z = 0, o: PlaceOptions = {}): this {
    return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), color, x, y + h / 2, z, o);
  }

  cone(r: number, h: number, seg: number, color: number, x = 0, y = 0, z = 0, o: PlaceOptions = {}): this {
    return this.add(new THREE.ConeGeometry(r, h, seg), color, x, y + h / 2, z, o);
  }

  sph(r: number, color: number, x = 0, y = 0, z = 0, o: PlaceOptions = {}, detail = 1): this {
    return this.add(new THREE.IcosahedronGeometry(r, detail), color, x, y, z, o);
  }

  geometry(): THREE.BufferGeometry | null {
    if (this.parts.length === 0) {
      return null;
    }
    const merged = mergeGeometries(this.parts, false);
    this.parts.forEach(p => p.dispose());
    this.parts = [];
    merged.computeBoundingSphere();
    return merged;
  }

  mesh(material: THREE.Material = getToonMaterial(), shadow = true): THREE.Mesh {
    const geo = this.geometry();
    const mesh = new THREE.Mesh(geo ?? new THREE.BufferGeometry(), material);
    mesh.castShadow = shadow;
    mesh.receiveShadow = shadow;
    return mesh;
  }
}
