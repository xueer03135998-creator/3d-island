import * as THREE from 'three';
import { PALETTE } from './palette.ts';
import { sunDirection } from './sunPath.ts';
import { WEATHER_TARGET, createFrame, desaturate, sampleFrame, type Frame, type Weather } from './envKeys.ts';

export interface EnvTargets {
  scene: THREE.Scene;
  hemi: THREE.HemisphereLight;
  sun: THREE.DirectionalLight;
  skyMaterial: THREE.ShaderMaterial;
  seaMaterial: THREE.ShaderMaterial;
  cloudMaterial: THREE.MeshBasicMaterial;
  mountainMaterial: THREE.ShaderMaterial;
  setCloudCover: (cover: number) => void;
}

const MOON_COLOR = new THREE.Color(0x9db4ff);
const SEA_BASE = {
  shallow: new THREE.Color(PALETTE.seaShallow),
  mid: new THREE.Color(PALETTE.seaMid),
  deep: new THREE.Color(PALETTE.seaDeep),
  lilac: new THREE.Color(PALETTE.seaLilac),
};
const DAY_HOUR = 13.4;
export const SUNSET_HOUR = 18.1;
export const NIGHT_HOUR = 22.6;
export const NEXT_DAY_HOUR = DAY_HOUR + 24;

function smooth(e0: number, e1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

export class Environment {
  hour = DAY_HOUR;
  phase = 0;
  readonly weather: Weather = 'clear';
  cloud = 0.3;
  rain = 0;
  night = 0;
  readonly wind = new THREE.Vector2(0.8, 0.3);
  readonly sunDir = new THREE.Vector3(0, 1, 0);
  readonly lightDir = new THREE.Vector3(0, 1, 0);
  readonly fogColor = new THREE.Color();
  private base = DAY_HOUR;
  private shift: { from: number; to: number; t: number; dur: number } | null = null;
  private readonly frame: Frame = createFrame();
  private readonly tmp = new THREE.Color();

  constructor(private readonly t: EnvTargets) {
    this.update(0, 0);
  }

  get transitioning(): boolean {
    return this.shift !== null;
  }

  /** Moves the clock to `target` (unwrapped hours, always forward) over `seconds`. */
  goTo(target: number, seconds: number): void {
    if (this.shift) {
      return;
    }
    this.shift = { from: this.base, to: target, t: 0, dur: seconds };
  }

  update(dt: number, time: number): void {
    this.phase = (this.phase + dt * 0.05) % (Math.PI * 2);
    if (this.shift) {
      const s = this.shift;
      s.t += dt;
      const k = Math.min(1, s.t / s.dur);
      const e = k * k * (3 - 2 * k);
      this.base = s.from + (s.to - s.from) * e;
      if (k >= 1) {
        this.base = ((s.to % 24) + 24) % 24;
        this.shift = null;
      }
    }
    const wobble = this.shift ? 0 : Math.sin(this.phase) * 0.25;
    this.hour = this.base + wobble;
    const target = WEATHER_TARGET[this.weather];
    const k = 1 - Math.exp(-dt * 0.7);
    this.cloud += (target.cloud - this.cloud) * k;
    this.rain += (target.rain - this.rain) * k;
    const gust = 0.75 + 0.25 * Math.sin(time * 0.31) + 0.15 * Math.sin(time * 0.9);
    const speed = (0.6 + this.cloud * 0.5 + this.rain * 0.9) * gust;
    this.wind.set(speed, speed * 0.38);

    this.updateSun();
    sampleFrame(this.hour, this.frame);
    this.applyWeather(this.frame);
    this.applyLights();
    this.applySky(time);
    this.applySea(time);
  }

  private updateSun(): void {
    sunDirection(this.hour, this.sunDir);
    this.night = 1 - smooth(-0.18, 0.1, this.sunDir.y);
  }

  private applyWeather(f: Frame): void {
    const gray = this.cloud * 0.22 + this.rain * 0.2;
    const dark = 1 - this.cloud * 0.04 - this.rain * 0.16;
    desaturate(f.top, gray, dark);
    desaturate(f.mid, gray, dark);
    desaturate(f.horizon, gray, dark);
    desaturate(f.fog, gray, dark);
    desaturate(f.hemiSky, gray * 0.7, 1);
    desaturate(f.sea, gray * 0.5, 1 - this.rain * 0.18);
    f.sunI *= 1 - this.cloud * 0.2 - this.rain * 0.2;
    f.hemiI *= 1 + this.cloud * 0.1 - this.rain * 0.12;
  }

  private applyLights(): void {
    const { hemi, sun, scene } = this.t;
    const f = this.frame;
    hemi.color.copy(f.hemiSky);
    hemi.groundColor.copy(f.hemiGround);
    hemi.intensity = f.hemiI * 0.86;
    const y = this.sunDir.y;
    if (y > -0.08) {
      this.lightDir.copy(this.sunDir);
      this.lightDir.y = Math.max(this.lightDir.y, 0.24);
      this.lightDir.normalize();
      sun.color.copy(f.sun);
      sun.intensity = f.sunI * smooth(-0.08, 0.1, y) * 0.95;
    } else {
      this.lightDir.copy(this.sunDir).negate();
      this.lightDir.y = Math.max(this.lightDir.y, 0.3);
      this.lightDir.normalize();
      sun.color.copy(MOON_COLOR);
      sun.intensity = 0.55 * this.night * (1 - this.cloud * 0.6) * smooth(-0.08, -0.22, y);
    }
    sun.position.copy(this.lightDir).multiplyScalar(90);
    this.fogColor.copy(f.fog);
    const fog = scene.fog as THREE.Fog;
    fog.color.copy(f.fog);
    fog.near = 90 - this.cloud * 10 - this.rain * 18;
    fog.far = 430 - this.cloud * 70 - this.rain * 130;
    (scene.background as THREE.Color).copy(f.fog);
  }

  private applySky(time: number): void {
    const u = this.t.skyMaterial.uniforms;
    const f = this.frame;
    (u.uTop.value as THREE.Color).copy(f.top);
    (u.uMid.value as THREE.Color).copy(f.mid);
    (u.uHorizon.value as THREE.Color).copy(f.horizon);
    (u.uSunColor.value as THREE.Color).copy(f.sun);
    (u.uSunDir.value as THREE.Vector3).copy(this.sunDir);
    (u.uMoonDir.value as THREE.Vector3).copy(this.sunDir).negate();
    u.uNight.value = this.night;
    u.uCloud.value = Math.min(1, this.cloud + this.rain * 0.3);
    u.uTime.value = time;
    this.t.setCloudCover(this.cloud);
    const mu = this.t.mountainMaterial.uniforms;
    (mu.uFog.value as THREE.Color).copy(f.fog);
    (mu.uSun.value as THREE.Vector3).copy(this.lightDir);
    mu.uLight.value = 1 - this.night * 0.62;
    const lit = 0.55 + 0.45 * (1 - this.night);
    this.t.cloudMaterial.color.copy(f.horizon).lerp(this.tmp.set(0xffffff), 0.55 - this.night * 0.35).multiplyScalar(lit);
    this.t.cloudMaterial.opacity = 0.7 + this.cloud * 0.2;
  }

  private applySea(time: number): void {
    const u = this.t.seaMaterial.uniforms;
    const f = this.frame;
    (u.uShallow.value as THREE.Color).copy(SEA_BASE.shallow).multiply(f.sea);
    (u.uMid.value as THREE.Color).copy(SEA_BASE.mid).multiply(f.sea);
    (u.uDeep.value as THREE.Color).copy(SEA_BASE.deep).multiply(f.sea);
    (u.uLilac.value as THREE.Color).copy(SEA_BASE.lilac).multiply(f.sea);
    (u.uFog.value as THREE.Color).copy(f.fog);
    (u.uGlint.value as THREE.Color).copy(this.sunDir.y > -0.08 ? f.sun : MOON_COLOR);
    (u.uSun.value as THREE.Vector3).copy(this.sunDir.y > -0.08 ? this.sunDir : this.lightDir);
    const fog = this.t.scene.fog as THREE.Fog;
    (u.uFogRange.value as THREE.Vector2).set(fog.near, fog.far);
    u.uWave.value = 1 + this.cloud * 0.35 + this.rain * 0.9;
    u.uGlintK.value = (1 - this.cloud * 0.35) * (this.sunDir.y > -0.08 ? 1 : 0.6);
    u.uTime.value = time;
  }
}
