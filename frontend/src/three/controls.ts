import * as THREE from 'three';
import type { BuildingEntry, BuildingId, Collider } from './buildings/index.ts';
import type { Character } from './character.ts';
import { SEA_LEVEL, groundHeight } from './palette.ts';
import { createNavGrid, type NavGrid } from './pathfind.ts';
import { PIER_TOP, isOnPier, withinSwimArea } from './walk.ts';
import type { EggKind } from './interactions.ts';
import type { Ride } from './ride.ts';

export interface ControlsOptions {
  dom: HTMLElement;
  camera: THREE.PerspectiveCamera;
  character: Character;
  buildings: BuildingEntry[];
  pickTargets: THREE.Object3D[];
  eggTargets: THREE.Object3D[];
  seatTargets: THREE.Object3D[];
  petTargets: THREE.Object3D[];
  boatTarget: THREE.Object3D;
  npcTarget: THREE.Object3D;
  npcPos: { x: number; z: number };
  sea: THREE.Object3D;
  terrain: THREE.Object3D;
  colliders: Collider[];
  ride: Ride;
  onSelect: (id: BuildingId) => void;
  onNear: (id: BuildingId | null) => void;
  onNpc: () => void;
  onNpcNear: (near: boolean) => void;
  onEgg: (kind: EggKind, point: THREE.Vector3) => boolean;
  onPet: (index: number, point: THREE.Vector3) => void;
  onGuide: (v: boolean) => void;
  onJump: () => void;
}

interface Arrive {
  reach: number;
  fn: () => void;
}

const MOVE_KEYS: Record<string, 'f' | 'b' | 'l' | 'r'> = {
  KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r',
};
const ZOOM_IN_KEYS = ['Equal', 'NumpadAdd'];
const ZOOM_OUT_KEYS = ['Minus', 'NumpadSubtract'];
const SPIN_KEYS: Record<string, 1 | -1> = { KeyQ: -1, KeyR: 1 };
const ROTATE_STEP = Math.PI / 4;
const SPIN_SPEED = 1.8;
const DRAG_THRESHOLD = 5;
const NEAR_DISTANCE = 3.6;
const NPC_NEAR = 3.8;
const DOOR_TRIGGER = 1.6;
const DOOR_REARM = 5;
const ZOOM_MIN = 4;
const ZOOM_MAX = 120;
const PITCH_MIN = -0.32;
const PITCH_MAX = 1.25;
const PITCH_BASE = 0.1;
/** 拉远到此距离后自动进入俯瞰视角 */
const OVERVIEW_DIST = 75;
const EGG_KINDS: EggKind[] = ['nature', 'boat', 'hero', 'plaza', 'sea'];

function clampZoom(v: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v));
}

function findUserNumber(obj: THREE.Object3D | null, key: string): number | null {
  for (let o = obj; o; o = o.parent) {
    const v = o.userData[key] as unknown;
    if (typeof v === 'number') {
      return v;
    }
  }
  return null;
}

function findEgg(obj: THREE.Object3D | null): EggKind | null {
  for (let o = obj; o; o = o.parent) {
    const v = o.userData.egg as string | undefined;
    if (v && (EGG_KINDS as string[]).includes(v)) {
      return v as EggKind;
    }
  }
  return null;
}

function findBuildingId(obj: THREE.Object3D | null): BuildingId | null {
  for (let o = obj; o; o = o.parent) {
    if (typeof o.userData.buildingId === 'string') {
      return o.userData.buildingId as BuildingId;
    }
  }
  return null;
}

export class Controls {
  hoveredId: BuildingId | null = null;
  private readonly o: ControlsOptions;
  private readonly keys = new Set<string>();
  private readonly ray = new THREE.Raycaster();
  private readonly ndc = new THREE.Vector2();
  private readonly marker: THREE.Mesh;
  private yaw = 0.6;
  private yawGoal = 0.6;
  private pitch = 0.62;
  private dist = 60;
  private distGoal = 20;
  private intro = 0;
  private enabled = true;
  private target: THREE.Vector3 | null = null;
  private arrive: Arrive | null = null;
  private doorLocked = false;
  private scripted = false;
  private stuck = 0;
  private near: BuildingId | null = null;
  private nearNpc = false;
  private down: { x: number; y: number; dragging: boolean } | null = null;
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private pinchDist = 0;
  private pinched = false;
  /** 双指中心点（用于双指拖动平移视野） */
  private pinchMid = { x: 0, y: 0 };
  /** 手动平移/俯瞰时相机不再跟随角色；重新移动角色后恢复跟随 */
  private manualView = false;
  private stick = new THREE.Vector2();
  private runHeld = false;
  private readonly look = new THREE.Vector3();
  private readonly aim = new THREE.Vector3();
  private readonly cleanups: Array<() => void> = [];
  /** 新手引导：镜头自动切到兔子导游面前，引导点击对话 */
  private guide = false;
  private guideStarted = false;
  /** 岛屿导航网格（A* 寻路）与当前路径 */
  private readonly nav: NavGrid;
  private path: Array<[number, number]> | null = null;
  private pathIdx = 0;
  private pathRetried = false;

  constructor(options: ControlsOptions) {
    this.o = options;
    this.nav = createNavGrid(options.colliders);
    this.marker = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.5, 20),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, fog: false })
    );
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.visible = false;
    this.marker.renderOrder = 5;
    this.look.set(options.character.x, 1.4, options.character.z);
    this.bind();
  }

  get markerObject(): THREE.Object3D {
    return this.marker;
  }

  setEnabled(v: boolean): void {
    this.enabled = v;
    if (!v) {
      this.keys.clear();
      this.down = null;
      this.clearTarget();
      this.pointers.clear();
      this.stick.set(0, 0);
    }
  }

  setScripted(v: boolean): void {
    this.scripted = v;
    if (v) {
      this.clearTarget();
    }
  }

  lockDoors(): void {
    this.doorLocked = true;
  }

  zoomBy(dir: 1 | -1): void {
    this.distGoal = clampZoom(this.distGoal * (dir > 0 ? 0.78 : 1.28));
  }

  rotateBy(dir: 1 | -1): void {
    this.yawGoal = this.yaw + dir * ROTATE_STEP;
  }

  setStick(x: number, y: number): void {
    this.stick.set(x, y);
    if (x !== 0 || y !== 0) {
      this.clearTarget();
    }
  }

  setRun(v: boolean): void {
    this.runHeld = v;
  }

  enter(): void {
    if (!this.enabled) {
      return;
    }
    if (this.near) {
      this.o.onSelect(this.near);
    } else if (this.nearNpc) {
      this.o.onNpc();
    }
  }

  talkToNpc(): void {
    if (this.enabled && this.nearNpc) {
      this.o.onNpc();
    }
  }

  get isGuide(): boolean {
    return this.guide;
  }

  /** 进入引导：锁定操作，镜头移向兔子导游。 */
  beginGuide(): void {
    if (this.guide) {
      return;
    }
    this.guide = true;
    this.setEnabled(false);
    this.o.onGuide(true);
  }

  /** 结束引导：恢复操作。 */
  endGuide(): void {
    if (!this.guide) {
      return;
    }
    this.guide = false;
    this.setEnabled(true);
    this.o.onGuide(false);
  }

  /** 引导中的对话：无需走近也能与兔子对话，对话后结束引导。 */
  guideTalk(): boolean {
    if (!this.guide) {
      return false;
    }
    this.endGuide();
    this.o.onNpc();
    return true;
  }

  jump(): void {
    if (this.enabled) {
      this.o.character.jump();
    }
  }

  private listen<K extends keyof HTMLElementEventMap>(el: HTMLElement, type: K, fn: (e: HTMLElementEventMap[K]) => void, opt?: AddEventListenerOptions): void {
    el.addEventListener(type, fn, opt);
    this.cleanups.push(() => el.removeEventListener(type, fn));
  }

  private bind(): void {
    const { dom } = this.o;
    this.listen(dom, 'pointerdown', e => this.onDown(e));
    this.listen(dom, 'pointermove', e => this.onMove(e));
    this.listen(dom, 'pointerup', e => this.onUp(e));
    this.listen(dom, 'pointercancel', e => {
      this.pointers.delete(e.pointerId);
      this.down = null;
    });
    this.listen(dom, 'wheel', e => {
      e.preventDefault();
      if (this.enabled) {
        this.distGoal = clampZoom(this.distGoal * Math.exp(e.deltaY * 0.0012));
      }
    }, { passive: false });
    const kd = (e: KeyboardEvent): void => this.onKey(e, true);
    const ku = (e: KeyboardEvent): void => this.onKey(e, false);
    const blur = (): void => this.keys.clear();
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    window.addEventListener('blur', blur);
    this.cleanups.push(() => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      window.removeEventListener('blur', blur);
    });
  }

  private onKey(e: KeyboardEvent, isDown: boolean): void {
    if (!this.enabled) {
      return;
    }
    if (MOVE_KEYS[e.code] || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      e.preventDefault();
      if (isDown) {
        this.keys.add(e.code);
        this.clearTarget();
      } else {
        this.keys.delete(e.code);
      }
    } else if (SPIN_KEYS[e.code]) {
      e.preventDefault();
      if (isDown) {
        this.keys.add(e.code);
      } else {
        this.keys.delete(e.code);
      }
    } else if (isDown && ZOOM_IN_KEYS.includes(e.code)) {
      this.zoomBy(1);
    } else if (isDown && ZOOM_OUT_KEYS.includes(e.code)) {
      this.zoomBy(-1);
    } else if (isDown && e.code === 'KeyE' && !e.repeat) {
      this.enter();
    } else if (isDown && e.code === 'Space' && !e.repeat) {
      e.preventDefault();
      this.o.onJump();
    }
  }

  private setNdc(e: PointerEvent): void {
    const r = this.o.dom.getBoundingClientRect();
    this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.o.camera);
  }

  private onDown(e: PointerEvent): void {
    if (!this.enabled) {
      return;
    }
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.o.dom.setPointerCapture(e.pointerId);
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      this.pinchMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      this.pinched = true;
      this.down = null;
      return;
    }
    if (this.pointers.size === 1) {
      this.pinched = false;
      this.down = { x: e.clientX, y: e.clientY, dragging: false };
    }
  }

  private onPinch(e: PointerEvent): void {
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const [a, b] = [...this.pointers.values()];
    const cur = Math.hypot(a.x - b.x, a.y - b.y);
    if (this.pinchDist > 8 && cur > 8) {
      this.distGoal = clampZoom((this.distGoal * this.pinchDist) / cur);
    }
    this.pinchDist = cur;
    // 双指中心点位移 = 平移视野（画面跟随手指）
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const dx = mid.x - this.pinchMid.x;
    const dy = mid.y - this.pinchMid.y;
    this.pinchMid = mid;
    if (Math.hypot(dx, dy) > 0.5) {
      this.panBy(dx, dy);
    }
  }

  /** 双指拖动平移相机视野中心，并暂停对角色的跟随。 */
  private panBy(dx: number, dy: number): void {
    const h = Math.max(1, this.o.dom.clientHeight);
    const scale = (2 * this.dist * Math.tan(THREE.MathUtils.degToRad(this.o.camera.fov / 2))) / h;
    const sy = Math.sin(this.yaw);
    const cy = Math.cos(this.yaw);
    const rx = cy;
    const rz = -sy;
    const fx = -sy;
    const fz = -cy;
    this.look.x += (-dx * rx + dy * fx) * scale;
    this.look.z += (-dx * rz + dy * fz) * scale;
    this.look.y = Math.max(0.6, groundHeight(this.look.x, this.look.z) + 1.2);
    this.manualView = true;
    this.clearTarget();
  }

  private onMove(e: PointerEvent): void {
    if (!this.enabled) {
      return;
    }
    if (this.pointers.size >= 2) {
      if (this.pointers.has(e.pointerId)) {
        this.onPinch(e);
      }
      return;
    }
    if (this.pointers.has(e.pointerId)) {
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    const d = this.down;
    if (d) {
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (!d.dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        d.dragging = true;
        this.o.dom.style.cursor = 'grabbing';
      }
      if (d.dragging) {
        this.yaw -= (e.clientX - d.x) * 0.006;
        this.yawGoal = this.yaw;
        this.pitch = Math.min(PITCH_MAX, Math.max(PITCH_MIN, this.pitch + (e.clientY - d.y) * 0.005));
        d.x = e.clientX;
        d.y = e.clientY;
      }
      return;
    }
    if (e.pointerType === 'mouse') {
      this.setNdc(e);
      this.hoveredId = this.pickBuilding();
      this.o.dom.style.cursor = this.hoveredId ? 'pointer' : 'grab';
    }
  }

  private onUp(e: PointerEvent): void {
    const d = this.down;
    this.down = null;
    this.pointers.delete(e.pointerId);
    if (this.o.dom.hasPointerCapture(e.pointerId)) {
      this.o.dom.releasePointerCapture(e.pointerId);
    }
    if (this.pinched) {
      if (this.pointers.size === 0) {
        this.pinched = false;
      }
      return;
    }
    if (!this.enabled || !d) {
      return;
    }
    this.o.dom.style.cursor = this.hoveredId ? 'pointer' : 'grab';
    if (d.dragging) {
      return;
    }
    this.setNdc(e);
    const id = this.pickBuilding();
    if (id) {
      this.o.onSelect(id);
      return;
    }
    const seat = this.pickSeat();
    if (seat !== null) {
      this.useSeat(seat);
      return;
    }
    if (this.ray.intersectObject(this.o.npcTarget, true).length > 0) {
      this.useNpc();
      return;
    }
    if (this.pickBoat()) {
      this.useBoat();
      return;
    }
    const pet = this.pickPet();
    if (pet) {
      this.o.onPet(pet.index, pet.point);
      return;
    }
    const egg = this.pickEgg();
    if (egg) {
      if (this.o.onEgg(egg.kind, egg.point)) {
        return;
      }
      this.pickGround(true);
      return;
    }
    this.pickGround(false);
  }

  private pickEgg(): { kind: EggKind; point: THREE.Vector3 } | null {
    const hits = this.ray.intersectObjects(this.o.eggTargets, true);
    const sea = this.ray.intersectObject(this.o.sea, false)[0];
    for (const h of hits) {
      const kind = findEgg(h.object);
      if (!kind) {
        continue;
      }
      if (sea && sea.distance < h.distance - 0.01 && kind !== 'boat') {
        continue;
      }
      return { kind, point: h.point.clone() };
    }
    return null;
  }

  private setTarget(x: number, z: number, y: number, arrive: Arrive | null = null, usePath = true): void {
    this.target = new THREE.Vector3(x, 0, z);
    this.arrive = arrive;
    this.stuck = 0;
    this.pathRetried = false;
    this.path = usePath ? this.nav.findPath(this.o.character.x, this.o.character.z, x, z) : null;
    this.pathIdx = 0;
    this.marker.position.set(x, y, z);
    this.marker.visible = true;
  }

  private clearTarget(): void {
    this.target = null;
    this.arrive = null;
    this.path = null;
    this.pathIdx = 0;
    this.marker.visible = false;
  }

  private pickSeat(): number | null {
    const hit = this.ray.intersectObjects(this.o.seatTargets, false)[0];
    return hit ? findUserNumber(hit.object, 'seatId') : null;
  }

  private pickBoat(): boolean {
    return this.ray.intersectObject(this.o.boatTarget, true).length > 0;
  }

  private pickPet(): { index: number; point: THREE.Vector3 } | null {
    const hit = this.ray.intersectObjects(this.o.petTargets, true)[0];
    const index = hit ? findUserNumber(hit.object, 'petId') : null;
    return hit && index !== null ? { index, point: hit.point.clone() } : null;
  }

  private useSeat(id: number): void {
    const { ride, character: ch } = this.o;
    const seat = ride.seats[id];
    if (!seat || ride.mode === 'boat') {
      return;
    }
    if (ride.mode === 'sit' && ride.seatId === id) {
      ride.poke();
      return;
    }
    if (Math.hypot(seat.x - ch.x, seat.z - ch.z) < seat.reach) {
      this.clearTarget();
      ride.sit(id);
      return;
    }
    this.setTarget(seat.x, seat.z, groundHeight(seat.x, seat.z) + 0.08, { reach: seat.reach, fn: () => ride.sit(id) });
  }

  private useNpc(): void {
    const { ride, character: ch, npcPos } = this.o;
    if (ride.mode === 'boat') {
      return;
    }
    if (Math.hypot(npcPos.x - ch.x, npcPos.z - ch.z) < NPC_NEAR) {
      this.clearTarget();
      this.o.onNpc();
      return;
    }
    this.setTarget(npcPos.x, npcPos.z, groundHeight(npcPos.x, npcPos.z) + 0.08, { reach: 3.0, fn: () => this.o.onNpc() });
  }

  private useBoat(): void {
    const { ride } = this.o;
    if (ride.mode === 'boat') {
      return;
    }
    if (ride.mode === 'sit') {
      ride.stand();
    }
    if (ride.boatDistance() < ride.boardReach) {
      this.clearTarget();
      ride.board();
      return;
    }
    const spot = ride.boardSpot();
    this.setTarget(spot.x, spot.z, PIER_TOP + 0.08, { reach: 0.9, fn: () => ride.board() });
  }

  private pickPier(terrainDist: number): boolean {
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -PIER_TOP);
    const p = this.ray.ray.intersectPlane(plane, new THREE.Vector3());
    if (!p || !isOnPier(p.x, p.z)) {
      return false;
    }
    if (p.distanceTo(this.ray.ray.origin) > terrainDist + 0.01) {
      return false;
    }
    this.setTarget(p.x, p.z, PIER_TOP + 0.08);
    return true;
  }

  private pickGround(skipSeaEgg: boolean): void {
    const hit = this.ray.intersectObject(this.o.terrain, false)[0];
    const sea = this.ray.intersectObject(this.o.sea, false)[0];
    const landFloor = SEA_LEVEL + 0.1;
    const solid = hit && groundHeight(hit.point.x, hit.point.z) > landFloor ? hit.distance : Infinity;
    if (this.pickPier(solid)) {
      return;
    }
    if (sea && (!hit || sea.distance < hit.distance - 0.01 || groundHeight(hit.point.x, hit.point.z) <= landFloor)) {
      const p = sea.point.clone();
      p.y = SEA_LEVEL + 0.15;
      if (!skipSeaEgg && Math.hypot(p.x, p.z) < 160) {
        this.o.onEgg('sea', p);
      }
      if (withinSwimArea(p.x, p.z)) {
        this.setTarget(p.x, p.z, SEA_LEVEL + 0.12, null, false);
      }
      return;
    }
    if (hit && solid < Infinity) {
      this.setTarget(hit.point.x, hit.point.z, groundHeight(hit.point.x, hit.point.z) + 0.08);
    }
  }

  private pickBuilding(): BuildingId | null {
    const hit = this.ray.intersectObjects(this.o.pickTargets, true)[0];
    return hit ? findBuildingId(hit.object) : null;
  }

  private inputDir(out: THREE.Vector2): void {
    let f = 0;
    let r = 0;
    this.keys.forEach(k => {
      const m = MOVE_KEYS[k];
      f += m === 'f' ? 1 : m === 'b' ? -1 : 0;
      r += m === 'r' ? 1 : m === 'l' ? -1 : 0;
    });
    const sy = Math.sin(this.yaw);
    const cy = Math.cos(this.yaw);
    if (f === 0 && r === 0) {
      const sf = -this.stick.y;
      const sr = this.stick.x;
      const m = Math.min(1, Math.hypot(sf, sr));
      if (m < 0.05) {
        out.set(0, 0);
        return;
      }
      out.set(-sy * sf + cy * sr, -cy * sf - sy * sr).normalize().multiplyScalar(m);
      return;
    }
    out.set(-sy * f + cy * r, -cy * f - sy * r).normalize();
  }

  update(dt: number, time: number): void {
    const { camera, ride } = this.o;
    // 开场镜头拉近完成后，自动切入兔子导游引导
    if (!this.guideStarted && this.intro >= 1) {
      this.guideStarted = true;
      this.beginGuide();
    }
    if (!this.scripted) {
      this.drive(dt);
    }
    if (this.marker.visible) {
      const s = 1 + Math.sin(time * 5) * 0.12;
      this.marker.scale.set(s, s, s);
    }
    this.updateNear();
    ride.tick(dt, time);
    this.updateCamera(dt);
    camera.updateMatrixWorld();
  }

  private drive(dt: number): void {
    const { character: ch, ride } = this.o;
    const dir = new THREE.Vector2();
    this.inputDir(dir);
    let isRun = this.runHeld || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    if (dir.lengthSq() === 0 && this.target) {
      if (this.stuck > 0.6) {
        if (this.path && !this.pathRetried) {
          // 卡住：按当前位置重算路径
          this.pathRetried = true;
          this.path = this.nav.findPath(ch.x, ch.z, this.target.x, this.target.z);
          this.pathIdx = 0;
          this.stuck = 0;
        } else {
          const arrive = this.arrive;
          const fd = Math.hypot(ch.x - this.target.x, ch.z - this.target.z);
          const reach = this.arrive?.reach ?? 0.35;
          this.clearTarget();
          if (arrive && fd < Math.max(reach * 2, 2.6)) {
            arrive.fn();
          }
        }
      } else {
        let goalX = this.target.x;
        let goalZ = this.target.z;
        const reach = this.arrive?.reach ?? 0.35;
        if (this.path && this.pathIdx < this.path.length) {
          const p = this.path[this.pathIdx];
          if (Math.hypot(ch.x - p[0], ch.z - p[1]) < 0.55) {
            this.pathIdx++;
          }
        }
        if (this.path && this.pathIdx < this.path.length) {
          const p = this.path[this.pathIdx];
          goalX = p[0];
          goalZ = p[1];
        }
        const dx = goalX - ch.x;
        const dz = goalZ - ch.z;
        const d = Math.hypot(dx, dz);
        const isFinal = !this.path || this.pathIdx >= this.path.length;
        if (isFinal && d < reach) {
          const arrive = this.arrive;
          this.clearTarget();
          if (arrive && d < Math.max(reach * 2, 2.6)) {
            arrive.fn();
          }
        } else {
          dir.set(dx / d, dz / d).multiplyScalar(Math.min(1, d / 1.6 + 0.5));
          isRun = d > 14;
        }
      }
    }
    const bx = ch.x;
    const bz = ch.z;
    if (ride.mode === 'boat') {
      ride.drive(dt, dir, isRun);
    } else {
      if (ride.mode === 'sit' && dir.lengthSq() > 0) {
        ride.stand();
      }
      ch.update(dt, dir.x, dir.y, isRun, this.o.colliders);
    }
    if (this.target && dir.lengthSq() > 0) {
      this.stuck = Math.hypot(ch.x - bx, ch.z - bz) < dt * 0.8 ? this.stuck + dt : 0;
    }
    // 自动行走途中不触发进门/交互，到达后再恢复
    if (ride.mode === 'none' && this.target === null) {
      this.checkDoor(dir);
    }
  }

  private checkDoor(dir: THREE.Vector2): void {
    if (this.doorLocked || !this.enabled || dir.lengthSq() === 0) {
      return;
    }
    const { character: ch } = this.o;
    const len = dir.length();
    for (const b of this.o.buildings) {
      const tx = b.doorPoint.x - ch.x;
      const tz = b.doorPoint.z - ch.z;
      const d = Math.hypot(tx, tz);
      if (d < DOOR_TRIGGER && (d < 0.05 || (tx * dir.x + tz * dir.y) / (d * len) > 0.3)) {
        this.doorLocked = true;
        this.o.onSelect(b.id);
        return;
      }
    }
  }

  private updateNear(): void {
    let best: BuildingId | null = null;
    let bestD = NEAR_DISTANCE;
    let minD = Infinity;
    const { character: ch } = this.o;
    this.o.buildings.forEach(b => {
      const d = Math.hypot(b.doorPoint.x - ch.x, b.doorPoint.z - ch.z);
      minD = Math.min(minD, d);
      if (d < bestD) {
        bestD = d;
        best = b.id;
      }
    });
    if (minD > DOOR_REARM) {
      this.doorLocked = false;
    }
    if (best !== this.near) {
      this.near = best;
      this.o.onNear(best);
    }
    const nearNpc =
      this.o.ride.mode === 'none' && Math.hypot(this.o.npcPos.x - ch.x, this.o.npcPos.z - ch.z) < NPC_NEAR;
    if (nearNpc !== this.nearNpc) {
      this.nearNpc = nearNpc;
      this.o.onNpcNear(nearNpc);
    }
  }

  private updateCamera(dt: number): void {
    const { character: ch, camera } = this.o;
    if (this.intro < 1) {
      this.intro = Math.min(1, this.intro + dt / 3.4);
    }
    const e = 1 - Math.pow(1 - this.intro, 3);
    const goal = this.dist + (this.distGoal - this.dist) * Math.min(1, dt * 6);
    this.dist = this.intro < 1 ? 60 + (this.distGoal - 60) * e : goal;
    const k = 1 - Math.exp(-dt * 7);
    const spin = (this.keys.has('KeyR') ? 1 : 0) - (this.keys.has('KeyQ') ? 1 : 0);
    if (spin !== 0) {
      this.yaw += spin * SPIN_SPEED * dt;
      this.yawGoal = this.yaw;
    } else {
      this.yaw += (this.yawGoal - this.yaw) * Math.min(1, dt * 8);
    }
    if (this.guide) {
      // 镜头缓移到兔子导游面前（兔子面向 +z 出生点方向）
      this.look.x += (this.o.npcPos.x - this.look.x) * k;
      this.look.z += (this.o.npcPos.z - this.look.z) * k;
      this.look.y += (1.35 - this.look.y) * k;
      this.distGoal = 4.6;
      this.yawGoal = 0;
      this.pitch += (0.45 - this.pitch) * Math.min(1, dt * 3);
    } else if (this.manualView) {
      // 手动平移/俯瞰：保持当前视野中心；重新移动角色时恢复跟随
      const reFollow = this.target !== null || this.keys.size > 0 || this.stick.lengthSq() > 0.02;
      if (reFollow && this.distGoal < OVERVIEW_DIST - 10) {
        this.manualView = false;
      }
    } else {
      this.look.x += (ch.x - this.look.x) * k;
      this.look.z += (ch.z - this.look.z) * k;
      this.look.y += (ch.group.position.y + 1.4 - this.look.y) * k;
    }
    // 俯瞰：拉远到一定距离后镜头抬升俯角并回到岛屿中心，可俯瞰全岛
    const overview = THREE.MathUtils.smoothstep(OVERVIEW_DIST, OVERVIEW_DIST + 32, this.distGoal);
    if (overview > 0) {
      this.manualView = true;
      this.look.x += (0 - this.look.x) * k * overview;
      this.look.z += (0 - this.look.z) * k * overview;
      this.look.y += (0.9 - this.look.y) * k * overview;
      this.pitch += (1.12 - this.pitch) * Math.min(1, dt * 2.5 * overview);
    }
    const yaw = this.yaw + (1 - e) * 0.9;
    const base = Math.max(this.pitch, PITCH_BASE);
    const cb = Math.cos(base);
    camera.position.set(
      this.look.x + Math.sin(yaw) * cb * this.dist,
      this.look.y + Math.sin(base) * this.dist,
      this.look.z + Math.cos(yaw) * cb * this.dist
    );
    const floor = Math.max(0, groundHeight(camera.position.x, camera.position.z)) + 0.8;
    if (camera.position.y < floor) {
      camera.position.y = floor;
    }
    if (this.pitch >= PITCH_BASE) {
      camera.lookAt(this.look);
      return;
    }
    const cp = Math.cos(this.pitch);
    this.aim.set(
      camera.position.x - Math.sin(yaw) * cp * this.dist,
      camera.position.y - Math.sin(this.pitch) * this.dist,
      camera.position.z - Math.cos(yaw) * cp * this.dist
    );
    camera.lookAt(this.aim);
  }

  dispose(): void {
    this.cleanups.forEach(fn => fn());
    this.cleanups.length = 0;
    this.marker.geometry.dispose();
    (this.marker.material as THREE.Material).dispose();
  }
}
