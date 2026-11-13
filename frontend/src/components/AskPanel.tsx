import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ChevronDown, MessageCircle, X } from 'lucide-react';
import ResumeAsk from './ResumeAsk.tsx';

interface AskPanelProps {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}

/**
 * 「向我提问」：
 * - 引导组件 = 半透明、可拖动的悬浮圆条，默认靠下位置（与上下组件留空）
 * - 功能栏 = 点击后以底部半窗固定位置展开的问答面板
 */
export default function AskPanel({ open, onOpen, onClose }: AskPanelProps) {
  const [pos, setPos] = useState<{ x: number; y: number }>(() => ({
    x: Math.max(12, window.innerWidth - 176),
    y: Math.max(130, Math.round(window.innerHeight * 0.5)),
  }));
  const [dragging, setDragging] = useState(false);
  const pillRef = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  const onDown = (e: ReactPointerEvent<HTMLButtonElement>): void => {
    drag.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onMove = (e: ReactPointerEvent<HTMLButtonElement>): void => {
    const d = drag.current;
    if (!d) {
      return;
    }
    const w = pillRef.current?.offsetWidth ?? 150;
    const h = pillRef.current?.offsetHeight ?? 40;
    setPos({
      x: Math.max(8, Math.min(window.innerWidth - w - 8, d.ox + (e.clientX - d.sx))),
      y: Math.max(8, Math.min(window.innerHeight - h - 8, d.oy + (e.clientY - d.sy))),
    });
  };

  const onUp = (e: ReactPointerEvent<HTMLButtonElement>): void => {
    const d = drag.current;
    const moved = d ? Math.hypot(e.clientX - d.sx, e.clientY - d.sy) >= 6 : true;
    drag.current = null;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    // 轻点（未拖动）才触发开合
    if (!moved) {
      if (open) {
        onClose();
      } else {
        onOpen();
      }
    }
  };

  return (
    <>
      {/* 引导圆条：半透明、可拖动 */}
      <button
        ref={pillRef}
        type="button"
        aria-label="向我提问"
        title="向我提问（拖动可换位置，轻点开合）"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className={`fixed z-40 flex touch-none select-none items-center gap-1.5 rounded-full border border-white/25 bg-black/35 px-4 py-2.5 text-sm font-medium text-white shadow-lg backdrop-blur-sm transition-opacity ${
          dragging ? 'cursor-grabbing opacity-80' : 'cursor-grab opacity-90 hover:opacity-100'
        }`}
        style={{ left: pos.x, top: pos.y }}
      >
        <MessageCircle size={15} aria-hidden="true" />
        向我提问
      </button>

      {/* 功能栏：底部半窗固定位置 */}
      {open && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center p-2 pb-4">
          <div className="flex max-h-[52vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <header className="flex items-center gap-2 border-b border-border px-4 py-2">
              <h2 className="flex-1 truncate text-sm font-semibold">向我提问 · 岛主杨博驿</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="收起"
                title="收起"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
              >
                <ChevronDown size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="关闭"
                title="关闭"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <ResumeAsk />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
