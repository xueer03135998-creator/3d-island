import { useEffect, useState } from 'react';

const QUERY = '(pointer: coarse), (max-width: 639px)';

export function useTouchLayout(): boolean {
  const [touch, setTouch] = useState(() => typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return undefined;
    }
    const mq = window.matchMedia(QUERY);
    const onChange = (): void => setTouch(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return touch;
}
