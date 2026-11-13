import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

interface JoystickProps {
  onMove: (x: number, y: number) => void;
  onRun: (run: boolean) => void;
  onJump: () => void;
}

const RADIUS = 46;
const ACT_BTN =
  'h-14 w-14 touch-none select-none rounded-full border border-border/80 bg-card/60 text-sm font-semibold text-foreground shadow-md backdrop-blur-sm transition-colors active:scale-95 active:bg-card/90';

export default function Joystick({ onMove, onRun, onJump }: JoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const activeId = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [running, setRunning] = useState(false);

  const release = useCallback(() => {
    activeId.current = null;
    setKnob({ x: 0, y: 0 });
    onMove(0, 0);
  }, [onMove]);

  const runOff = useCallback(() => {
    setRunning(false);
    onRun(false);
  }, [onRun]);

  useEffect(
    () => () => {
      onMove(0, 0);
      onRun(false);
    },
    [onMove, onRun]
  );
  const track = (e: ReactPointerEvent<HTMLDivElement>): void => {
    const el = baseRef.current;
    if (!el) {
      return;
    }
    const r = el.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS;
      dy = (dy / len) * RADIUS;
    }
    setKnob({ x: dx, y: dy });
    onMove(dx / RADIUS, dy / RADIUS);
  };

  return (
    <>
      <div
        ref={baseRef}
        role="application"
        aria-label="移动摇杆"
        className="absolute bottom-6 left-5 z-10 h-[124px] w-[124px] touch-none select-none rounded-full border border-border bg-card/60 shadow-md"
        onPointerDown={e => {
          if (activeId.current !== null) {
            return;
          }
          activeId.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          track(e);
        }}
        onPointerMove={e => {
          if (activeId.current === e.pointerId) {
            track(e);
          }
        }}
        onPointerUp={e => {
          if (activeId.current === e.pointerId) {
            release();
          }
        }}
        onPointerCancel={e => {
          if (activeId.current === e.pointerId) {
            release();
          }
        }}
      >
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-14 -ml-7 -mt-7 rounded-full bg-primary shadow-md"
          style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
        />
      </div>
      <div className="absolute bottom-10 right-4 z-10 flex items-center gap-3">
        <button type="button" onPointerDown={onJump} aria-label="跳跃" className={ACT_BTN}>
          跳
        </button>
        <button
          type="button"
          aria-pressed={running}
          onPointerDown={() => {
            setRunning(true);
            onRun(true);
          }}
          onPointerUp={runOff}
          onPointerLeave={runOff}
          onPointerCancel={runOff}
          className={`${ACT_BTN} ${running ? 'bg-primary/80 text-primary-foreground' : ''}`}
        >
          奔跑
        </button>
      </div>
    </>
  );
}
