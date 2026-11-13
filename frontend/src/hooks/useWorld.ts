import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { BuildingId } from '../three/buildings/index.ts';
import type { RideState } from '../three/ride.ts';
import { sound } from '../three/audio.ts';
import { createWorld, type World } from '../three/world.ts';

export type WorldStatus = 'loading' | 'ready' | 'error';

export interface UseWorldResult {
  status: WorldStatus;
  nearId: BuildingId | null;
  selectedId: BuildingId | null;
  ride: RideState;
  npcNear: boolean;
  npcOpen: boolean;
  notice: string | null;
  /** 新手引导：镜头对准兔子导游 */
  guideOpen: boolean;
  /** 与兔子对话后，推荐先逛个人档案馆 */
  guideNext: boolean;
  closePanel: () => void;
  closeNpc: () => void;
  retry: () => void;
  enter: () => void;
  zoom: (dir: 1 | -1) => void;
  rotate: (dir: 1 | -1) => void;
  toggleBoat: () => void;
  standUp: () => void;
  talk: () => void;
  guideTalk: () => void;
  goArchive: () => void;
  skipGuide: () => void;
  jump: () => void;
  setCrouch: (v: boolean) => void;
  setStick: (x: number, y: number) => void;
  setRun: (run: boolean) => void;
}

const IDLE_RIDE: RideState = { mode: 'none', boatNear: false, canLand: false };
const NOTICE_MS = 1800;

export function useWorld(containerRef: RefObject<HTMLDivElement | null>): UseWorldResult {
  const [status, setStatus] = useState<WorldStatus>('loading');
  const [nearId, setNearId] = useState<BuildingId | null>(null);
  const [selectedId, setSelectedId] = useState<BuildingId | null>(null);
  const [ride, setRide] = useState<RideState>(IDLE_RIDE);
  const [npcNear, setNpcNear] = useState(false);
  const [npcOpen, setNpcOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideNext, setGuideNext] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const worldRef = useRef<World | null>(null);
  const noticeTimer = useRef(0);
  const recommendedRef = useRef(false);

  const flash = useCallback((text: string) => {
    window.clearTimeout(noticeTimer.current);
    setNotice(text);
    noticeTimer.current = window.setTimeout(() => setNotice(null), NOTICE_MS);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }
    setStatus('loading');
    let timer = 0;
    try {
      worldRef.current = createWorld(container, {
        onSelect: id => {
          worldRef.current?.setPaused(true);
          worldRef.current?.setStick(0, 0);
          setSelectedId(id);
        },
        onNear: setNearId,
        onRide: setRide,
        onNpc: () => {
          worldRef.current?.setPaused(true);
          worldRef.current?.setStick(0, 0);
          worldRef.current?.setNpcTalking(true);
          setNpcOpen(true);
        },
        onNpcNear: setNpcNear,
        onEdge: () => flash('您已来到世界边缘'),
        onGuide: setGuideOpen,
      });
      timer = window.setTimeout(() => setStatus('ready'), 700);
    } catch (err) {
      console.error('World init failed', err instanceof Error ? err.message : err);
      setStatus('error');
    }
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(noticeTimer.current);
      worldRef.current?.dispose();
      worldRef.current = null;
      setNearId(null);
      setNpcNear(false);
      setNpcOpen(false);
      setRide(IDLE_RIDE);
      setGuideOpen(false);
      setGuideNext(false);
      recommendedRef.current = false;
    };
  }, [containerRef, attempt, flash]);

  const closePanel = useCallback(() => {
    setSelectedId(null);
    worldRef.current?.setPaused(false);
  }, []);

  const closeNpc = useCallback(() => {
    setNpcOpen(false);
    worldRef.current?.setNpcTalking(false);
    worldRef.current?.setPaused(false);
    // 首次对话结束后，推荐先逛个人档案馆
    if (!recommendedRef.current) {
      recommendedRef.current = true;
      setGuideNext(true);
    }
  }, []);

  const toggleBoat = useCallback(() => {
    const ok = worldRef.current?.toggleBoat();
    if (ok === false) {
      flash('靠岸后再下船');
    }
  }, [flash]);

  const retry = useCallback(() => setAttempt(n => n + 1), []);
  const enter = useCallback(() => worldRef.current?.enter(), []);
  const zoom = useCallback((dir: 1 | -1) => worldRef.current?.zoom(dir), []);
  const rotate = useCallback((dir: 1 | -1) => worldRef.current?.rotate(dir), []);
  const standUp = useCallback(() => worldRef.current?.standUp(), []);
  const talk = useCallback(() => worldRef.current?.talk(), []);
  const guideTalk = useCallback(() => {
    sound.unlock();
    worldRef.current?.guideTalk();
  }, []);
  const goArchive = useCallback(() => {
    setGuideNext(false);
    worldRef.current?.setPaused(true);
    setSelectedId('archive');
  }, []);
  const skipGuide = useCallback(() => setGuideNext(false), []);
  const jump = useCallback(() => worldRef.current?.jump(), []);
  const setCrouch = useCallback((v: boolean) => worldRef.current?.setCrouch(v), []);
  const setStick = useCallback((x: number, y: number) => worldRef.current?.setStick(x, y), []);
  const setRun = useCallback((run: boolean) => worldRef.current?.setRun(run), []);

  return { status, nearId, selectedId, ride, npcNear, npcOpen, notice, guideOpen, guideNext, closePanel, closeNpc, retry, enter, zoom, rotate, toggleBoat, standUp, talk, guideTalk, goArchive, skipGuide, jump, setCrouch, setStick, setRun };
}
