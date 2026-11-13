import { LoaderCircle, TriangleAlert } from 'lucide-react';
import { ISLAND_NAME } from '../data/site.ts';
import type { WorldStatus } from '../hooks/useWorld.ts';

interface LoadingOverlayProps {
  status: WorldStatus;
  onRetry: () => void;
}

export default function LoadingOverlay({ status, onRetry }: LoadingOverlayProps) {
  if (status === 'ready') {
    return null;
  }
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-background text-foreground">
      {status === 'loading' ? (
        <>
          <LoaderCircle size={32} className="animate-spin text-primary" aria-hidden="true" />
          <p className="text-muted-foreground">{ISLAND_NAME}正在靠近……</p>
        </>
      ) : (
        <>
          <TriangleAlert size={32} className="text-destructive" aria-hidden="true" />
          <p className="max-w-xs text-center text-muted-foreground">
            当前浏览器无法显示 3D 场景，请确认已开启硬件加速，或换用最新版 Chrome / Edge / Safari 后重试。
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground transition-opacity hover:opacity-90"
          >
            重试
          </button>
        </>
      )}
    </div>
  );
}
