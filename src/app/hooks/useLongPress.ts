import { useRef, useCallback } from 'react';

interface UseLongPressOptions {
  onStart?: () => void;
  onEnd?: () => void;
  threshold?: number;
}

export function useLongPress({ onStart, onEnd, threshold = 0 }: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPressingRef = useRef(false);

  const start = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      if (isPressingRef.current) return;
      isPressingRef.current = true;
      if (threshold > 0) {
        timerRef.current = setTimeout(() => {
          onStart?.();
        }, threshold);
      } else {
        onStart?.();
      }
    },
    [onStart, threshold]
  );

  const end = useCallback(() => {
    if (!isPressingRef.current) return;
    isPressingRef.current = false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onEnd?.();
  }, [onEnd]);

  return { onPointerDown: start, onPointerUp: end, onPointerLeave: end };
}
