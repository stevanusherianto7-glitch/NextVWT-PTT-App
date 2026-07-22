import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudioVisualizer } from './useAudioVisualizer';

function makeStream(trackEnabled: boolean) {
  const track = { enabled: trackEnabled };
  return {
    getAudioTracks: () => [track],
  } as unknown as MediaStream;
}

describe('useAudioVisualizer', () => {
  let rafCb: ((t: number) => void) | null = null;
  let rafId = 1;

  beforeEach(() => {
    rafCb = null;
    rafId = 1;
    (globalThis as any).requestAnimationFrame = (cb: (t: number) => void) => {
      rafCb = cb;
      return rafId++;
    };
    (globalThis as any).cancelAnimationFrame = vi.fn();
    const analyser = {
      fftSize: 0,
      smoothingTimeConstant: 0,
      frequencyBinCount: 4,
      getByteFrequencyData: (arr: Uint8Array) => {
        arr[0] = 200;
        arr[1] = 100;
        arr[2] = 50;
        arr[3] = 0;
      },
    };
    const audioCtx = {
      createAnalyser: () => analyser,
      createMediaStreamSource: () => ({ connect: () => {}, disconnect: () => {} }),
      state: 'running',
      close: vi.fn().mockResolvedValue(undefined),
    };
    (globalThis as any).AudioContext = class {
      createAnalyser() {
        return analyser;
      }
      createMediaStreamSource() {
        return { connect: () => {}, disconnect: () => {} };
      }
      state = 'running';
      close() {
        return Promise.resolve();
      }
    };
    (window as any).AudioContext = (globalThis as any).AudioContext;
    void audioCtx;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns default levels when stream is null', () => {
    const { result } = renderHook(() => useAudioVisualizer(null));
    expect(result.current.isSpeaking).toBe(false);
    expect(result.current.volume).toBe(0);
  });

  it('returns default levels when audio track disabled', () => {
    const { result } = renderHook(() => useAudioVisualizer(makeStream(false)));
    expect(result.current.isSpeaking).toBe(false);
    expect(result.current.volume).toBe(0);
  });

  it('updates levels when stream active and rAF fires', () => {
    const { result } = renderHook(() => useAudioVisualizer(makeStream(true)));
    act(() => {
      if (rafCb) rafCb(16);
    });
    // average of [200,100,50,0] = 87.5 -> normalized ~52 -> >threshold 12 => speaking
    expect(result.current.isSpeaking).toBe(true);
    expect(result.current.volume).toBeGreaterThan(0);
  });
});
