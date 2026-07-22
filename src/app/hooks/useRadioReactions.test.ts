import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRadioReactions } from './useRadioReactions';

const setState = vi.fn();
const storeRef = vi.hoisted(() => ({
  broadcastReaction: vi.fn(),
  setOnReactionReceived: vi.fn(),
  userId: 'me',
  callSign: '2DYUA',
}));

vi.mock('../store/usePTTStore', () => ({
  usePTTStore: Object.assign(
    (selector?: (s: any) => any) => {
      const s = storeRef;
      return selector ? selector(s) : s;
    },
    {
      getState: () => storeRef,
      setState: (...args: any[]) => setState(...args),
    }
  ),
}));

const playReactionSound = vi.hoisted(() => vi.fn());
vi.mock('./useReactionSounds', () => ({ useReactionSounds: () => ({ playReactionSound }) }));

// deterministic Math.random
vi.spyOn(Math, 'random').mockReturnValue(0.5);

describe('useRadioReactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeRef.broadcastReaction.mockClear();
    storeRef.setOnReactionReceived.mockClear();
    playReactionSound.mockClear();
  });

  it('returns floatingReactions + handleSendReaction', () => {
    const { result } = renderHook(() => useRadioReactions(true, 'Budi', 1));
    expect(Array.isArray(result.current.floatingReactions)).toBe(true);
    expect(typeof result.current.handleSendReaction).toBe('function');
  });

  it('handleSendReaction: no-op when power off', () => {
    const { result } = renderHook(() => useRadioReactions(false, 'Budi', 1));
    act(() => result.current.handleSendReaction('sound', 'clap'));
    expect(storeRef.broadcastReaction).not.toHaveBeenCalled();
    expect(result.current.floatingReactions.length).toBe(0);
  });

  it('handleSendReaction: no-op on echo channel (100)', () => {
    const { result } = renderHook(() => useRadioReactions(true, 'Budi', 100));
    act(() => result.current.handleSendReaction('sound', 'clap'));
    expect(storeRef.broadcastReaction).not.toHaveBeenCalled();
  });

  it('handleSendReaction: broadcasts + adds floating (sound plays)', () => {
    const { result } = renderHook(() => useRadioReactions(true, 'Budi', 1));
    act(() => result.current.handleSendReaction('sound', 'clap'));
    expect(storeRef.broadcastReaction).toHaveBeenCalledWith('sound', 'clap');
    expect(playReactionSound).toHaveBeenCalledWith('clap');
    expect(result.current.floatingReactions.length).toBe(1);
    expect(result.current.floatingReactions[0].senderName).toBe('Budi');
  });

  it('handleSendReaction: animation category does not play sound', () => {
    const { result } = renderHook(() => useRadioReactions(true, '', 1));
    act(() => result.current.handleSendReaction('animation', 'love'));
    expect(playReactionSound).not.toHaveBeenCalled();
    expect(storeRef.broadcastReaction).toHaveBeenCalledWith('animation', 'love');
  });

  it('received handler drops self reaction (isSelf)', () => {
    let registered: ((p: any) => void) | null = null;
    storeRef.setOnReactionReceived.mockImplementation((cb: any) => {
      registered = cb;
    });
    const { result } = renderHook(() => useRadioReactions(true, 'Budi', 1));
    act(() => {
      registered!({
        senderId: 'me',
        senderCallSign: '2DYUA',
        category: 'sound',
        reaction: 'clap',
        id: 'x1',
      });
    });
    // self -> dropped, no floating added
    expect(result.current.floatingReactions.length).toBe(0);
    expect(playReactionSound).not.toHaveBeenCalled();
  });

  it('received handler adds other reaction + plays sound', () => {
    let registered: ((p: any) => void) | null = null;
    storeRef.setOnReactionReceived.mockImplementation((cb: any) => {
      registered = cb;
    });
    const { result } = renderHook(() => useRadioReactions(true, 'Budi', 1));
    act(() => {
      registered!({
        senderId: 'other',
        senderCallSign: '9ZZZ',
        category: 'sound',
        reaction: 'laugh',
        id: 'x2',
        senderName: 'Ani',
      });
    });
    expect(result.current.floatingReactions.length).toBe(1);
    expect(result.current.floatingReactions[0].senderName).toBe('Ani');
    expect(playReactionSound).toHaveBeenCalledWith('laugh');
  });

  it('received handler no-op when power off', () => {
    let registered: ((p: any) => void) | null = null;
    storeRef.setOnReactionReceived.mockImplementation((cb: any) => {
      registered = cb;
    });
    const { result } = renderHook(() => useRadioReactions(false, 'Budi', 1));
    act(() => {
      registered!({
        senderId: 'other',
        senderCallSign: '9ZZZ',
        category: 'sound',
        reaction: 'laugh',
        id: 'x3',
      });
    });
    expect(result.current.floatingReactions.length).toBe(0);
  });
});
