import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePttTransmit } from './usePttTransmit';

const setState = vi.fn();
const mockStore = vi.hoisted(() => ({
  isPowerOn: true,
  togglePtt: false,
  toneOnStartEnd: true,
  pttVolume: 0.5,
  vibrateOnStart: true,
}));

vi.mock('../store/usePTTStore', () => ({
  usePTTStore: Object.assign(
    (selector?: (s: any) => any) => {
      const s = mockStore;
      return selector ? selector(s) : s;
    },
    {
      getState: () => mockStore,
      setState: (...args: any[]) => setState(...args),
    }
  ),
}));

const playPressSound = vi.hoisted(() => vi.fn());
const playReleaseSound = vi.hoisted(() => vi.fn());
vi.mock('../utils/radioSound', () => ({ playPressSound, playReleaseSound }));

const initGlobalAudioContext = vi.hoisted(() => vi.fn(() => ({} as AudioContext)));
vi.mock('../utils/audioContext', () => ({ initGlobalAudioContext }));

// stub navigator.vibrate
beforeEach(() => {
  Object.defineProperty(window.navigator, 'vibrate', {
    configurable: true,
    value: vi.fn(),
  });
});

describe('usePttTransmit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setState.mockClear();
    playPressSound.mockClear();
    playReleaseSound.mockClear();
    initGlobalAudioContext.mockClear();
    mockStore.isPowerOn = true;
    mockStore.togglePtt = false;
    mockStore.toneOnStartEnd = true;
    mockStore.pttVolume = 0.5;
    mockStore.vibrateOnStart = true;
  });

  const render = (props: Partial<Parameters<typeof usePttTransmit>[0]> = {}) =>
    renderHook(() =>
      usePttTransmit({
        onPressStart: vi.fn(),
        onPressEnd: vi.fn(),
        isActive: false,
        isBusy: false,
        ...props,
      })
    );

  it('returns handlers + isDepressed', () => {
    const { result } = render();
    expect(typeof result.current.handleMouseDown).toBe('function');
    expect(typeof result.current.handleMouseUp).toBe('function');
    expect(typeof result.current.handleMouseLeave).toBe('function');
    expect(result.current.isDepressed).toBe(false);
  });

  it('mouse down (toggle OFF) triggers onPressStart + press sound', () => {
    const onPressStart = vi.fn();
    const { result } = render({ onPressStart });
    act(() => {
      result.current.handleMouseDown({ type: 'mousedown', preventDefault: vi.fn() } as any);
    });
    expect(onPressStart).toHaveBeenCalled();
    expect(playPressSound).toHaveBeenCalledWith(0.5);
    expect(result.current.isDepressed).toBe(true);
    expect(window.navigator.vibrate).toHaveBeenCalledWith(15);
  });

  it('mouse down does nothing when busy', () => {
    const onPressStart = vi.fn();
    const { result } = render({ onPressStart, isBusy: true });
    act(() => {
      result.current.handleMouseDown({ type: 'mousedown', preventDefault: vi.fn() } as any);
    });
    expect(onPressStart).not.toHaveBeenCalled();
    expect(result.current.isDepressed).toBe(false);
  });

  it('mouse up (toggle OFF) triggers onPressEnd + release sound', () => {
    const onPressStart = vi.fn();
    const onPressEnd = vi.fn();
    const { result } = render({ onPressStart, onPressEnd });
    act(() => {
      result.current.handleMouseDown({ type: 'mousedown', preventDefault: vi.fn() } as any);
    });
    act(() => {
      result.current.handleMouseUp({ type: 'mouseup', preventDefault: vi.fn() } as any);
    });
    expect(onPressEnd).toHaveBeenCalled();
    expect(playReleaseSound).toHaveBeenCalledWith(0.5);
    expect(result.current.isDepressed).toBe(false);
  });

  it('toggle ON: mouse up with isActive=false starts TX (press)', () => {
    const onPressStart = vi.fn();
    const onPressEnd = vi.fn();
    mockStore.togglePtt = true;
    const { result } = render({ onPressStart, onPressEnd, isActive: false });
    act(() => {
      result.current.handleMouseDown({ type: 'mousedown', preventDefault: vi.fn() } as any);
    });
    act(() => {
      result.current.handleMouseUp({ type: 'mouseup', preventDefault: vi.fn() } as any);
    });
    expect(onPressStart).toHaveBeenCalled();
    expect(onPressEnd).not.toHaveBeenCalled();
  });

  it('toggle ON: mouse up with isActive=true ends TX (release)', () => {
    const onPressStart = vi.fn();
    const onPressEnd = vi.fn();
    mockStore.togglePtt = true;
    const { result } = render({ onPressStart, onPressEnd, isActive: true });
    act(() => {
      result.current.handleMouseDown({ type: 'mousedown', preventDefault: vi.fn() } as any);
    });
    act(() => {
      result.current.handleMouseUp({ type: 'mouseup', preventDefault: vi.fn() } as any);
    });
    expect(onPressEnd).toHaveBeenCalled();
    expect(onPressStart).not.toHaveBeenCalled();
  });

  it('mouse leave ends TX when depressed + toggle OFF', () => {
    const onPressEnd = vi.fn();
    const { result } = render({ onPressEnd });
    act(() => {
      result.current.handleMouseDown({ type: 'mousedown', preventDefault: vi.fn() } as any);
    });
    act(() => {
      result.current.handleMouseLeave();
    });
    expect(onPressEnd).toHaveBeenCalled();
    expect(result.current.isDepressed).toBe(false);
  });

  it('spacebar keydown starts TX (toggle OFF)', () => {
    const onPressStart = vi.fn();
    render({ onPressStart });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    });
    expect(onPressStart).toHaveBeenCalled();
  });

  it('spacebar ignored when power off', () => {
    const onPressStart = vi.fn();
    mockStore.isPowerOn = false;
    const { result } = render({ onPressStart });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    });
    expect(onPressStart).not.toHaveBeenCalled();
    expect(result.current.isDepressed).toBe(false);
  });

  it('does not play sound when toneOnStartEnd is false', () => {
    const onPressStart = vi.fn();
    mockStore.toneOnStartEnd = false;
    const { result } = render({ onPressStart });
    act(() => {
      result.current.handleMouseDown({ type: 'mousedown', preventDefault: vi.fn() } as any);
    });
    expect(playPressSound).not.toHaveBeenCalled();
  });
});
