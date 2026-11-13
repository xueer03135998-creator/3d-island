import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { NPC_GREETING, NPC_MENU, NPC_NAME, findTopic } from '../data/npcScript.ts';
import { BUILDING_INFO, type BuildingId } from '../data/buildings.ts';

interface NpcDialogProps {
  open: boolean;
  onClose: () => void;
  /** 点击场馆卡片时打开对应场馆界面 */
  onOpenBuilding: (id: BuildingId) => void;
}

interface Message {
  from: 'npc' | 'me';
  text: string;
  building?: BuildingId;
}

const greeting = (): Message[] => NPC_GREETING.map(text => ({ from: 'npc', text }));

export default function NpcDialog({ open, onClose, onOpenBuilding }: NpcDialogProps) {
  const [messages, setMessages] = useState<Message[]>(greeting);
  const [options, setOptions] = useState<string[]>(NPC_MENU);
  const logRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const byeTimer = useRef(0);

  useEffect(() => () => window.clearTimeout(byeTimer.current), []);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    window.clearTimeout(byeTimer.current);
    setMessages(greeting());
    setOptions(NPC_MENU);
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.code === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    const el = logRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  if (!open) {
    return null;
  }

  const choose = (id: string): void => {
    const topic = findTopic(id);
    if (!topic) {
      return;
    }
    const nextMessages: Message[] = [{ from: 'me', text: topic.label }];
    if (topic.halls) {
      nextMessages.push({ from: 'npc', text: '点击下方展馆名可直接进入该场馆 👇' });
      topic.halls.forEach(h => {
        const info = BUILDING_INFO[h];
        nextMessages.push({ from: 'npc', text: `${info.name} · ${info.subtitle}：${info.summary}`, building: h });
      });
    } else {
      topic.lines.forEach(text => nextMessages.push({ from: 'npc', text }));
    }
    setMessages(prev => [...prev, ...nextMessages]);
    setOptions(topic.next);
    if (id === 'bye') {
      byeTimer.current = window.setTimeout(onClose, 900);
    }
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center p-2 sm:p-4">
      <section
        role="dialog"
        aria-label={`与${NPC_NAME}对话`}
        className="pointer-events-auto flex max-h-[62dvh] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300"
      >
        <header className="flex items-center gap-2 border-b border-border px-4 py-2">
          <h2 className="flex-1 text-sm font-semibold">{NPC_NAME} · 岛上向导</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="结束对话"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div ref={logRef} className="min-h-[96px] flex-1 space-y-2 overflow-y-auto px-4 py-3 text-sm leading-relaxed">
          {messages.map((m, i) =>
            m.building ? (
              <button
                key={`${i}-${m.text}`}
                type="button"
                onClick={() => onOpenBuilding(m.building as BuildingId)}
                className="block w-full max-w-[92%] rounded-lg border border-border bg-background px-3 py-2 text-left shadow-sm transition-colors hover:bg-secondary active:scale-[.99]"
              >
                <b className="text-foreground">{BUILDING_INFO[m.building as BuildingId].name}</b>
                <span className="ml-1 text-xs text-muted-foreground">{BUILDING_INFO[m.building as BuildingId].subtitle}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{BUILDING_INFO[m.building as BuildingId].summary}</span>
              </button>
            ) : (
              <p
                key={`${i}-${m.text}`}
                className={`max-w-[88%] rounded-lg px-3 py-2 ${m.from === 'npc' ? 'bg-secondary text-secondary-foreground' : 'ml-auto bg-primary text-primary-foreground'}`}
              >
                {m.text}
              </p>
            )
          )}
        </div>
        {options.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
            {options.map(id => (
              <button
                key={id}
                type="button"
                onClick={() => choose(id)}
                className="min-h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground transition-colors hover:bg-secondary"
              >
                {findTopic(id)?.label}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
