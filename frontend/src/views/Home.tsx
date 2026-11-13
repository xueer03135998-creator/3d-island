import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import BuildingPanel from '../components/BuildingPanel.tsx';
import Hud from '../components/Hud.tsx';
import Joystick from '../components/Joystick.tsx';
import LoadingOverlay from '../components/LoadingOverlay.tsx';
import NpcDialog from '../components/NpcDialog.tsx';
import PaintOverlay from '../components/PaintOverlay.tsx';
import ResumeAsk from '../components/ResumeAsk.tsx';
import { ISLAND_NAME } from '../data/site.ts';
import { sound } from '../three/audio.ts';
import { useTouchLayout } from '../hooks/useTouchLayout.ts';
import { useWorld } from '../hooks/useWorld.ts';

const GUIDE_BTN =
  'mt-3 min-h-10 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-md transition-colors hover:bg-primary/90';
const GHOST_BTN =
  'min-h-10 rounded-md border border-border bg-background px-4 text-sm text-foreground transition-colors hover:bg-secondary';

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const w = useWorld(containerRef);
  const touch = useTouchLayout();
  const ready = w.status === 'ready';
  const [soundOn, setSoundOn] = useState(!sound.muted);
  const toggleSound = (): void => {
    sound.unlock();
    setSoundOn(!sound.toggle());
  };
  const showGuide = ready && w.guideOpen && !w.npcOpen && !w.selectedId;
  const showRecommend = ready && w.guideNext && !w.npcOpen && !w.selectedId && !w.guideOpen;

  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-background">
      <div ref={containerRef} className="absolute inset-0" />
      <PaintOverlay />
      <Hud
        nearId={w.nearId}
        hidden={!ready}
        touch={touch}
        dialogOpen={w.npcOpen}
        ride={w.ride}
        npcNear={w.npcNear}
        notice={w.notice}
        soundOn={soundOn}
        onToggleSound={toggleSound}
        onAsk={w.openAsk}
        onEnter={w.enter}
        onZoom={w.zoom}
        onRotate={w.rotate}
        onBoat={w.toggleBoat}
        onStand={w.standUp}
        onTalk={w.talk}
      />
      {ready && touch && !w.selectedId && !w.npcOpen && <Joystick onMove={w.setStick} onRun={w.setRun} onJump={w.jump} />}
      {showGuide && (
        <div className="pointer-events-none absolute inset-x-0 bottom-40 z-20 flex justify-center px-4">
          <div className="pointer-events-auto max-w-md rounded-lg border border-border bg-card/95 px-4 py-3 text-center shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
            <p className="text-sm leading-relaxed text-foreground">
              欢迎来到「{ISLAND_NAME}」！我是导游乌空兔，点击下方按钮听我介绍吧～
            </p>
            <button type="button" onClick={w.guideTalk} className={GUIDE_BTN}>
              与乌空兔对话
            </button>
          </div>
        </div>
      )}
      {showRecommend && (
        <div className="pointer-events-none absolute inset-x-0 bottom-40 z-20 flex justify-center px-4">
          <div className="pointer-events-auto max-w-md rounded-lg border border-border bg-card/95 px-4 py-3 text-center shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
            <p className="text-sm leading-relaxed text-foreground">
              建议先逛「个人档案馆」了解岛主信息，再自由选择感兴趣的展馆，或在岛内探索～
            </p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <button type="button" onClick={w.goArchive} className={GUIDE_BTN.replace('mt-3 ', '')}>
                前往个人档案馆
              </button>
              <button type="button" onClick={w.skipGuide} className={GHOST_BTN}>
                知道了
              </button>
            </div>
          </div>
        </div>
      )}
      <BuildingPanel buildingId={w.selectedId} onClose={w.closePanel} />
      <NpcDialog open={w.npcOpen} onClose={w.closeNpc} onOpenBuilding={w.openBuilding} />
      {w.askOpen && (
        <div className="absolute inset-0 z-30 flex items-end justify-center bg-black/40 p-2 sm:items-center sm:p-4">
          <div className="flex max-h-[86dvh] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
            <header className="flex items-center gap-2 border-b border-border px-4 py-2">
              <h2 className="flex-1 text-sm font-semibold">向我提问 · 岛主杨博驿</h2>
              <button
                type="button"
                onClick={w.closeAsk}
                aria-label="关闭提问"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <ResumeAsk />
            </div>
          </div>
        </div>
      )}
      <LoadingOverlay status={w.status} onRetry={w.retry} />
    </main>
  );
}
