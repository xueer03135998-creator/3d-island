import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { FALLBACK_ANSWER, PRESET_GROUPS, findAnswer, type QaGroup } from '../data/resumeQa.ts';

interface Message {
  id: number;
  role: 'user' | 'bot';
  text: string;
}

const REPLY_DELAY = 600;
const MAX_LEN = 100;

export default function ResumeAsk() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeGroup, setActiveGroup] = useState<QaGroup>(PRESET_GROUPS[0].group);
  const currentGroup = PRESET_GROUPS.find(g => g.group === activeGroup) ?? PRESET_GROUPS[0];
  const timer = useRef(0);
  const nextId = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [messages, loading]);

  const ask = (raw: string): void => {
    const question = raw.trim();
    if (!question || loading) {
      return;
    }
    const userMsg: Message = { id: nextId.current++, role: 'user', text: question };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    timer.current = window.setTimeout(() => {
      const hit = findAnswer(question);
      const botMsg: Message = { id: nextId.current++, role: 'bot', text: hit ? hit.answer : FALLBACK_ANSWER };
      setMessages(prev => [...prev, botMsg]);
      setLoading(false);
    }, REPLY_DELAY);
  };

  const onSubmit = (e: FormEvent): void => {
    e.preventDefault();
    ask(input);
  };

  return (
    <div className="space-y-3">
      <div role="log" aria-live="polite" className="space-y-2.5 rounded-lg border border-border bg-background p-3">
        {messages.length === 0 && !loading && (
          <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <MessageCircle size={16} aria-hidden="true" />
            想了解什么？选一类问题点一下，或者直接输入。
          </p>
        )}
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <p
              className={`max-w-[85%] whitespace-pre-line break-words rounded-lg px-3 py-2 text-sm leading-relaxed ${
                m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
              }`}
            >
              {m.text}
            </p>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <p className="animate-pulse rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">思考中…</p>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="space-y-2">
        <div role="tablist" aria-label="问题分类" className="flex gap-1">
          {PRESET_GROUPS.map(g => (
            <button
              key={g.group}
              type="button"
              role="tab"
              aria-selected={g.group === activeGroup}
              onClick={() => setActiveGroup(g.group)}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                g.group === activeGroup
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {currentGroup.questions.map(q => (
            <button
              key={q.id}
              type="button"
              disabled={loading}
              onClick={() => ask(q.question)}
              className="rounded-full bg-muted px-3 py-1 text-left text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              {q.question}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          maxLength={MAX_LEN}
          placeholder="问问我的经历和项目…"
          aria-label="输入你的问题"
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="发送问题"
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground transition-opacity disabled:opacity-50"
        >
          <Send size={14} aria-hidden="true" />
          发送
        </button>
      </form>
    </div>
  );
}
