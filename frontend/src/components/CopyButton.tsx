import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

type CopyState = 'idle' | 'done' | 'failed';

async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(area);
  return ok;
}

interface CopyButtonProps {
  text: string;
  label: string;
}

export default function CopyButton({ text, label }: CopyButtonProps) {
  const [state, setState] = useState<CopyState>('idle');
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onCopy = async (): Promise<void> => {
    const ok = await writeClipboard(text);
    setState(ok ? 'done' : 'failed');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState('idle'), 1600);
  };

  const text2 = state === 'done' ? '已复制' : state === 'failed' ? '复制失败' : '复制';

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={`复制${label}`}
      className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
        state === 'failed'
          ? 'bg-destructive text-destructive-foreground'
          : 'bg-primary text-primary-foreground hover:opacity-90'
      }`}
    >
      {state === 'done' ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
      <span aria-live="polite">{text2}</span>
    </button>
  );
}
