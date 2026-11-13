import { Armchair, MessageCircle, Plus, Minus, RotateCcw, RotateCw, Ship, Volume2, VolumeX } from 'lucide-react';
import { BUILDING_INFO } from '../data/buildings.ts';
import { ISLAND_NAME } from '../data/site.ts';
import type { BuildingId } from '../three/buildings/index.ts';
import type { RideState } from '../three/ride.ts';

interface HudProps {
  nearId: BuildingId | null;
  hidden: boolean;
  touch: boolean;
  dialogOpen: boolean;
  ride: RideState;
  npcNear: boolean;
  notice: string | null;
  soundOn: boolean;
  onToggleSound: () => void;
  onEnter: () => void;
  onZoom: (dir: 1 | -1) => void;
  onRotate: (dir: 1 | -1) => void;
  onBoat: () => void;
  onStand: () => void;
  onTalk: () => void;
}

const HINTS = [
  'WASD / 方向键 移动',
  'Shift 奔跑 · 空格 跳跃',
  '拖拽 或 Q / R 旋转视角',
  '滚轮 或 + / - 缩放',
  '点击地面 自动走过去',
  '点击建筑 查看介绍',
  '点点树、小船、小猫小狗、广场圆盘，有彩蛋；点小球和小狗一起玩',
];
const TOUCH_HINT = '摇杆移动 · 按住奔跑 · 右下跳跃 · 双指拖移缩放 · 点点看';

const ACTION =
  'inline-flex min-h-10 items-center gap-2 rounded-md bg-card px-4 py-2 text-foreground shadow-md animate-in fade-in slide-in-from-bottom-2 duration-200 hover:bg-secondary';
const ROUND = 'inline-flex h-10 w-10 items-center justify-center rounded-md bg-card/90 text-foreground shadow-md hover:bg-secondary';

export default function Hud({ nearId, hidden, touch, dialogOpen, ride, npcNear, notice, soundOn, onToggleSound, onEnter, onZoom, onRotate, onBoat, onStand, onTalk }: HudProps) {
  if (hidden) {
    return null;
  }
  const boating = ride.mode === 'boat';
  const sitting = ride.mode === 'sit';
  return (
    <>
      <header className="pointer-events-none absolute left-3 top-3 z-10 rounded-md bg-card/80 px-3 py-1.5 shadow-sm sm:left-4 sm:top-4 sm:px-4 sm:py-2">
        <h1 className="text-sm font-semibold text-foreground sm:text-base">{ISLAND_NAME} · 作品集</h1>
        <p className="text-xs text-muted-foreground">{touch ? TOUCH_HINT : '走一走，逛逛四座展馆'}</p>
      </header>
      {!dialogOpen && (
        <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-2 sm:right-4 sm:top-4">
          <button type="button" className={ROUND} onClick={onToggleSound} aria-label={soundOn ? '静音' : '开启声音'} title={soundOn ? '静音' : '开启声音'}>
            {soundOn ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}
          </button>
          {!touch && (
            <>
              <button type="button" className={ROUND} onClick={() => onZoom(1)} aria-label="拉近视角">
                <Plus size={18} aria-hidden="true" />
              </button>
              <button type="button" className={ROUND} onClick={() => onZoom(-1)} aria-label="拉远视角">
                <Minus size={18} aria-hidden="true" />
              </button>
              <button type="button" className={ROUND} onClick={() => onRotate(-1)} aria-label="向左转动视角">
                <RotateCcw size={18} aria-hidden="true" />
              </button>
              <button type="button" className={ROUND} onClick={() => onRotate(1)} aria-label="向右转动视角">
                <RotateCw size={18} aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      )}
      {notice && (
        <p className="pointer-events-none absolute left-1/2 top-20 z-20 -translate-x-1/2 rounded-md bg-foreground px-3 py-1.5 text-sm text-background shadow-md animate-in fade-in duration-200">
          {notice}
        </p>
      )}
      {!touch && (
        <ul className="pointer-events-none absolute bottom-4 left-4 z-10 hidden gap-x-3 gap-y-1 rounded-md bg-card/80 px-3 py-2 text-xs text-muted-foreground shadow-sm sm:flex sm:max-w-xl sm:flex-wrap">
          {HINTS.map(h => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      )}
      {!dialogOpen && (
        <div className={`absolute left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 ${touch ? 'bottom-44' : 'bottom-16'}`}>
          {nearId && (
            <button type="button" onClick={onEnter} className={ACTION}>
              {touch ? (
                <>点此进入「{BUILDING_INFO[nearId].name}」</>
              ) : (
                <>
                  按 <kbd className="rounded-sm border border-border bg-muted px-1.5 py-0.5 text-xs">E</kbd> 或点击进入「{BUILDING_INFO[nearId].name}」
                </>
              )}
            </button>
          )}
          {npcNear && !nearId && !boating && (
            <button type="button" onClick={onTalk} className={ACTION}>
              <MessageCircle size={16} aria-hidden="true" />
              {touch ? '和乌空兔聊聊' : <>按 <kbd className="rounded-sm border border-border bg-muted px-1.5 py-0.5 text-xs">E</kbd> 和乌空兔聊聊</>}
            </button>
          )}
          {(ride.boatNear || sitting) && !boating && (
            <button type="button" onClick={sitting ? onStand : onBoat} className={ACTION}>
              {sitting ? <Armchair size={16} aria-hidden="true" /> : <Ship size={16} aria-hidden="true" />}
              {sitting ? '起身' : '上船划一划'}
            </button>
          )}
          {boating && (
            <button type="button" onClick={onBoat} className={`${ACTION} ${ride.canLand ? '' : 'text-muted-foreground'}`}>
              <Ship size={16} aria-hidden="true" />
              {ride.canLand ? '下船' : '靠岸后再下船'}
            </button>
          )}
        </div>
      )}
    </>
  );
}
