import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRadioModeration } from './useRadioModeration';

// ── Hoisted mocks (vitest hoists vi.mock + vi.hoisted above imports) ──────────
const setPower = vi.hoisted(() => vi.fn());
vi.mock('../store/usePTTStore', () => ({
  usePTTStore: Object.assign(
    (selector?: (s: any) => any) => (selector ? selector({ setPower }) : { setPower }),
    { getState: () => ({}), setState: () => {} }
  ),
}));

const toastError = vi.hoisted(() => vi.fn());
vi.mock('sonner', () => ({ toast: { error: toastError } }));

const channelInstance = vi.hoisted(() => ({
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn(),
}));
const removeChannel = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const supabaseMock = vi.hoisted(() => ({
  channel: vi.fn(() => channelInstance),
  removeChannel,
  from: vi.fn(() => ({
    select: () => ({
      eq: () => ({
        eq: () => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
  })),
}));
vi.mock('../utils/supabase', () => ({
  getSupabase: vi.fn().mockResolvedValue(supabaseMock),
}));

describe('useRadioModeration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    channelInstance.on.mockClear();
    channelInstance.subscribe.mockClear();
    removeChannel.mockClear();
    setPower.mockClear();
    toastError.mockClear();
  });

  it('returns waitTimer state (null by default)', () => {
    const { result } = renderHook(() => useRadioModeration('ptt-room-1', 'me', true, 'active'));
    expect(result.current.waitTimer).toBeNull();
  });

  it('wait status starts 30s countdown', () => {
    const { result } = renderHook(() => useRadioModeration('ptt-room-1', 'me', true, 'wait'));
    expect(result.current.waitTimer).toBe(30);
  });

  it('non-wait status keeps waitTimer null', () => {
    const { result } = renderHook(() => useRadioModeration('ptt-room-1', 'me', true, 'controlled'));
    expect(result.current.waitTimer).toBeNull();
  });

  it('registers supabase moderation channel when powered on', async () => {
    renderHook(() => useRadioModeration('ptt-room-1', 'me', true, 'active'));
    // getSupabase() resolves in a microtask (async IIFE)
    await new Promise((r) => setTimeout(r, 0));
    expect(supabaseMock.channel).toHaveBeenCalledWith('room:ptt-room-1:moderation');
    expect(channelInstance.on).toHaveBeenCalledWith(
      'broadcast',
      { event: 'kick' },
      expect.any(Function)
    );
    expect(channelInstance.subscribe).toHaveBeenCalled();
  });

  it('does NOT register kick listener when power off', () => {
    renderHook(() => useRadioModeration('ptt-room-1', 'me', false, 'active'));
    expect(channelInstance.on).not.toHaveBeenCalled();
  });
});
