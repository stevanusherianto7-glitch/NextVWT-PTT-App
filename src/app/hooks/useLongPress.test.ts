import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLongPress } from './useLongPress';

describe('useLongPress', () => {
  it('calls onStart immediately when threshold is 0', () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();
    const { result } = renderHook(() => useLongPress({ onStart, onEnd }));
    act(() => {
      result.current.onPointerDown({ preventDefault: () => {} } as React.PointerEvent);
    });
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('calls onEnd on pointer up', () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();
    const { result } = renderHook(() => useLongPress({ onStart, onEnd }));
    act(() => {
      result.current.onPointerDown({ preventDefault: () => {} } as React.PointerEvent);
    });
    act(() => {
      result.current.onPointerUp();
    });
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('does not double-fire onStart on repeated pointer down', () => {
    const onStart = vi.fn();
    const { result } = renderHook(() => useLongPress({ onStart }));
    act(() => {
      result.current.onPointerDown({ preventDefault: () => {} } as React.PointerEvent);
    });
    act(() => {
      result.current.onPointerDown({ preventDefault: () => {} } as React.PointerEvent);
    });
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('fires onStart after threshold delay', () => {
    vi.useFakeTimers();
    const onStart = vi.fn();
    const { result } = renderHook(() => useLongPress({ onStart, threshold: 500 }));
    act(() => {
      result.current.onPointerDown({ preventDefault: () => {} } as React.PointerEvent);
    });
    expect(onStart).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(501);
    });
    expect(onStart).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
