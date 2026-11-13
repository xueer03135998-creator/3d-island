import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

/**
 * 出图前色彩分级：饱和度 / 对比度 / 轻微锐化。
 * 在 OutputPass（ACES 色调映射 + sRGB）之后执行，作用于显示空间。
 */

const GRADE_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2 uTexel;
uniform float uSat;
uniform float uCont;
uniform float uSharp;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(tDiffuse, vUv);
  // 3x3 拉普拉斯锐化（unsharp mask）
  vec3 blur = texture2D(tDiffuse, vUv + vec2(uTexel.x, 0.0)).rgb
            + texture2D(tDiffuse, vUv - vec2(uTexel.x, 0.0)).rgb
            + texture2D(tDiffuse, vUv + vec2(0.0, uTexel.y)).rgb
            + texture2D(tDiffuse, vUv - vec2(0.0, uTexel.y)).rgb;
  vec3 sharp = c.rgb + (c.rgb * 4.0 - blur) * uSharp * 0.25;
  // 对比度
  sharp = (sharp - 0.5) * uCont + 0.5;
  // 饱和度
  float lum = dot(sharp, vec3(0.299, 0.587, 0.114));
  sharp = mix(vec3(lum), sharp, uSat);
  gl_FragColor = vec4(clamp(sharp, 0.0, 1.0), c.a);
}
`;

const GRADE_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export interface GradePass {
  pass: ShaderPass;
  setSize: (w: number, h: number) => void;
}

export function createGradePass(): GradePass {
  const pass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uTexel: { value: new THREE.Vector2(1 / 1024, 1 / 1024) },
      uSat: { value: 1.18 },
      uCont: { value: 1.07 },
      uSharp: { value: 0.34 },
    },
    vertexShader: GRADE_VERT,
    fragmentShader: GRADE_FRAG,
  });
  return {
    pass,
    setSize: (w, h) => {
      (pass.uniforms.uTexel.value as THREE.Vector2).set(1 / Math.max(1, w), 1 / Math.max(1, h));
    },
  };
}
