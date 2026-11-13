import { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import type { EmbedSource } from '../data/buildings.ts';

interface EmbedViewProps {
  title: string;
  source: EmbedSource;
}

const SLOW_MS = 12000;

export default function EmbedView({ title, source }: EmbedViewProps) {
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const timerRef = useRef(0);

  useEffect(() => {
    setLoaded(false);
    setSlow(false);
    timerRef.current = window.setTimeout(() => setSlow(true), SLOW_MS);
    return () => window.clearTimeout(timerRef.current);
  }, [attempt, source.url]);

  const onLoad = useCallback(() => {
    window.clearTimeout(timerRef.current);
    setLoaded(true);
    setSlow(false);
  }, []);

  return (
    <div className="relative min-h-0 flex-1 bg-muted">
      <iframe
        key={attempt}
        src={source.url}
        title={title}
        onLoad={onLoad}
        allow="fullscreen; clipboard-write"
        referrerPolicy="no-referrer"
        className="h-full w-full border-0 bg-background"
      />
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card text-center">
          <Loader2 size={28} className="animate-spin text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">{slow ? '加载有点慢，可以重试或在新窗口打开' : '正在打开体验…'}</p>
          {slow && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAttempt(n => n + 1)}
                className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-sm text-secondary-foreground hover:bg-muted"
              >
                <RefreshCw size={14} aria-hidden="true" />
                重试
              </button>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
              >
                <ExternalLink size={14} aria-hidden="true" />
                新窗口打开
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
