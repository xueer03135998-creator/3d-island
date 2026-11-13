import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ChevronDown, GripVertical, X } from 'lucide-react';
import ResumeAsk from './ResumeAsk.tsx';

interface AskPanelProps {
  onClose: () => void;
}

/** 可拖动、可收起/展开的浮动「向我提问」面板。 */
export default function AskPanel({ onClose }: AskPanelProps) {
  const [pos, setPos] = useState<{ x: number; y: number }>(() => ({
    // 初始位置：右上角功能键下方，留足空间
    x: Math.max(10, window.innerWidth - 334),
    y: 150,
  }));
  const [collapsed, setCollapsed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  const onDown = (e: ReactPointerEvent<HTMLElement>): void => {
    drag.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onMove = (e: ReactPointerEvent<HTMLElement>): void => {
    const d = drag.current;
    if (!d) {
      return;
    }
    const w = panelRef.current?.offsetWidth ?? 320;
    const h = (panelRef.current?.querySelector('header') as HTMLElement | null)?.offsetHeight ?? 44;
    setPos({
      x: Math.max(8, Math.min(window.innerWidth - w - 8, d.ox + (e.clientX - d.sx))),
      y: Math.max(8, Math.min(window.innerHeight - h - 8, d.oy + (e.clientY - d.sy))),
    });
  };

  const onUp = (e: ReactPointerEvent<HTMLElement>): void => {
    drag.current = null;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="向我提问"
      className={`fixed z-40 flex w-[min(330px,calc(100vw-20px))] select-none flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xl ${
        dragging ? 'cursor-grabbing' : ''
      }`}
      style={{ left: pos.x, top: pos.y }}
    >
      <header
        className="flex cursor-grab touch-none items-center gap-2 border-b border-border bg-secondary/60 px-3 py-2"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <GripVertical size={14} className="text-muted-foreground" aria-hidden="true" />
        <h2 className="flex-1 truncate text-sm font-semibold">
          {collapsed ? '向我提问' : '向我提问 · 岛主杨博驿'}
        </h2>
        <button
          type="button"
          onClick={() => setCollapsed(v => !v)}
          aria-label={collapsed ? '展开' : '收起'}
          title={collapsed ? '展开' : '收起'}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
        >
          <ChevronDown size={16} aria-hidden="true" className={collapsed ? 'rotate-180' : ''} />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭提问"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </header>
      {!collapsed && (
        <div className="min-h-0 max-h-[58vh] overflow-y-auto p-3">
          <ResumeAsk />
        </div>
      )}
    </div>
  );
}
