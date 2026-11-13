import { useEffect, useRef, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { BUILDING_INFO } from '../data/buildings.ts';
import type { IntroBuildingId } from '../data/projectIntro.ts';
import type { BuildingId } from '../three/buildings/index.ts';
import EmbedView from './EmbedView.tsx';
import ProjectIntro from './ProjectIntro.tsx';
import ResumeView from './ResumeView.tsx';

const PANEL_TABS = [
  { id: 'experience', label: '体验' },
  { id: 'intro', label: '项目介绍' },
];

interface BuildingPanelProps {
  buildingId: BuildingId | null;
  onClose: () => void;
}

export default function BuildingPanel({ buildingId, onClose }: BuildingPanelProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [tab, setTab] = useState('experience');

  useEffect(() => {
    setTab('experience');
  }, [buildingId]);

  useEffect(() => {
    if (!buildingId) {
      return undefined;
    }
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.code === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [buildingId, onClose]);

  if (!buildingId) {
    return null;
  }
  const info = BUILDING_INFO[buildingId];
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-foreground/30 p-0 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={info.name}
        className={`relative flex h-full max-h-none w-full sm:max-h-[900px] ${info.embed?.phone ? 'sm:max-w-[500px]' : 'sm:max-w-5xl'} flex-col overflow-hidden rounded-none border-0 border-border bg-card text-card-foreground shadow-lg animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 sm:rounded-lg sm:border`}
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-start gap-3 border-b border-border px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{info.subtitle}</p>
            <h2 className="mt-0.5 text-xl font-semibold">{info.name}</h2>
            <p className="mt-1 hidden text-sm leading-relaxed text-muted-foreground sm:block">{info.summary}</p>
          </div>
          {info.embed && (
            <a
              href={info.embed.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-sm text-secondary-foreground transition-colors hover:bg-muted"
            >
              <ExternalLink size={14} aria-hidden="true" />
              <span className="hidden sm:inline">新窗口打开</span>
              <span className="sr-only sm:hidden">新窗口打开</span>
            </a>
          )}
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        {info.embed ? (
          <>
            <div role="tablist" aria-label="场馆内容" className="flex gap-2 border-b border-border px-4 py-2 sm:px-6">
              {PANEL_TABS.map(t => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                    tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className={tab === 'experience' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}>
              <EmbedView key={info.id} title={info.name} source={info.embed} />
            </div>
            {tab === 'intro' && <ProjectIntro buildingId={info.id as IntroBuildingId} />}
          </>
        ) : (
          <ResumeView />
        )}
      </section>
    </div>
  );
}
